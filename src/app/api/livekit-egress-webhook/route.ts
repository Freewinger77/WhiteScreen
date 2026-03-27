import { NextResponse } from "next/server";
import { ResponseService } from "@/services/responses.service";
import { logger } from "@/lib/logger";
import { WebhookReceiver } from "livekit-server-sdk";
import { createClient } from "@supabase/supabase-js";

const receiver = new WebhookReceiver(
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
);

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const authHeader = req.headers.get("Authorization");
    
    // Verify webhook signature for security
    const event = receiver.receive(body, authHeader || "");
    
    logger.info(`📥 LiveKit webhook received: ${event.event}`);
    
    // Handle egress ended event (recording completed)
    if (event.event === "egress_ended") {
      const egressInfo = event.egressInfo;
      
      if (!egressInfo) {
        logger.warn("⚠️ No egress info in webhook");
        return NextResponse.json({ success: true }, { status: 200 });
      }
      
      const roomName = egressInfo.roomName;
      const file = egressInfo.fileResults?.[0];
      
      if (!file || !roomName) {
        logger.warn("⚠️ Missing file or room name in egress webhook");
        return NextResponse.json({ success: true }, { status: 200 });
      }
      
      const livekitDownloadUrl = file.downloadUrl || file.location;
      const durationNs = file.duration || 0;
      
      logger.info(`🎬 Recording ready for room ${roomName}`);
      logger.info(`📥 Downloading from LiveKit: ${livekitDownloadUrl}`);
      
      try {
        // Download audio from LiveKit
        const response = await fetch(livekitDownloadUrl);
        if (!response.ok) {
          throw new Error(`Failed to download: ${response.statusText}`);
        }
        const audioBlob = await response.blob();
        
        logger.info(`✅ Downloaded audio, size: ${audioBlob.size} bytes`);
        
        // Upload to Supabase Storage
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        
        const fileName = `${roomName}.mp3`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('recordings')
          .upload(fileName, audioBlob, {
            contentType: 'audio/mpeg',
            upsert: true
          });
        
        if (uploadError) {
          throw new Error(`Supabase upload failed: ${uploadError.message}`);
        }
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('recordings')
          .getPublicUrl(fileName);
        
        const publicUrl = urlData.publicUrl;
        logger.info(`✅ Uploaded to Supabase: ${publicUrl}`);
        
        // Save to database (merge with existing data)
        const durationSeconds = Math.round(durationNs / 1000000000); // Convert nanoseconds to seconds
        
        await ResponseService.saveResponse({
          duration: durationSeconds,
          details: {
            recording_url: publicUrl,
            egress_id: egressInfo.egressId,
            file_size: file.size,
          }
        }, roomName);
        
        logger.info(`✅ Saved recording URL for ${roomName}, duration: ${durationSeconds}s`);
        
      } catch (error) {
        logger.error(`❌ Error processing recording for ${roomName}:`, error);
        // Don't fail the webhook - LiveKit will retry
      }
    }
    
    return NextResponse.json({ success: true }, { status: 200 });
    
  } catch (error) {
    logger.error("❌ Egress webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed" }, 
      { status: 500 }
    );
  }
}

