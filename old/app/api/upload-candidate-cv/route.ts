import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseCV, extractCandidateInfo } from "@/lib/cv-parser";

const BUCKET_NAME = "candidate-cvs";

// Initialize Supabase only when needed (lazy init)
const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    console.error("[CV Upload] Supabase credentials missing");
    return null;
  }
  
  return createClient(url, key);
};

// Sanitize text to remove problematic Unicode characters
const sanitizeText = (text: string): string => {
  let sanitized = text.replace(/[\x00-\x1F\x7F-\x9F]/g, "");
  sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, "");
  sanitized = sanitized.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
  sanitized = sanitized.replace(/[\u2013\u2014]/g, "-");
  sanitized = sanitized.replace(/[\uFFFD]/g, "");
  return sanitized;
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const interviewId = formData.get("interviewId") as string;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }
    
    console.log(`[CV Upload] Processing file: ${file.name}, size: ${file.size}`);
    
    // Parse the CV using the exported parseCV function
    const parseResult = await parseCV(file);
    
    if (!parseResult.success || !parseResult.text) {
      return NextResponse.json(
        { success: false, error: parseResult.error || "Failed to parse CV" },
        { status: 400 }
      );
    }
    
    let parsedText = sanitizeText(parseResult.text);
    
    // Truncate if too long (keep first 8000 chars for processing)
    if (parsedText.length > 8000) {
      parsedText = parsedText.substring(0, 8000);
    }
    
    // Try to upload to storage (optional - won't fail if storage not available)
    let storageUrl: string | null = null;
    const supabase = getSupabase();
    
    if (supabase) {
      try {
        const timestamp = Date.now();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const storagePath = `${interviewId || "general"}/${timestamp}_${sanitizedFileName}`;
        
        const fileBuffer = await file.arrayBuffer();
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(storagePath, fileBuffer, {
            contentType: file.type,
            upsert: false
          });
        
        if (uploadError) {
          // Try creating bucket if it doesn't exist
          if (uploadError.message.includes("not found") || uploadError.message.includes("Bucket")) {
            console.log("[CV Upload] Creating bucket...");
            await supabase.storage.createBucket(BUCKET_NAME, {
              public: false,
              fileSizeLimit: 10 * 1024 * 1024
            });
            // Retry upload
            await supabase.storage
              .from(BUCKET_NAME)
              .upload(storagePath, fileBuffer, {
                contentType: file.type,
                upsert: false
              });
          } else {
            console.error("[CV Upload] Storage error (non-fatal):", uploadError.message);
          }
        }
        
        // Get URL
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(storagePath);
        
        storageUrl = urlData?.publicUrl || null;
      } catch (storageError: any) {
        console.error("[CV Upload] Storage error (non-fatal):", storageError.message);
        // Continue without storage - we still have the parsed text
      }
    }
    
    console.log(`[CV Upload] Successfully processed. Text length: ${parsedText.length}`);
    
    return NextResponse.json({
      success: true,
      storageUrl,
      parsedText,
      fileName: file.name
    });
    
  } catch (error: any) {
    console.error("[CV Upload] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to upload CV" },
      { status: 500 }
    );
  }
}

