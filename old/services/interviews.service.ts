import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

// Client-side Supabase client (for React components)
const getClientSupabase = () => createClientComponentClient();

// Server-side Supabase client (for API routes)
const getServerSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseKey);
};

const getAllInterviews = async (userId: string, organizationId: string) => {
  try {
    const supabase = getClientSupabase();
    // Only show interviews that belong to the current organization
    const { data: clientData, error: clientError } = await supabase
      .from("interview")
      .select(`*`)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (clientError) {
      console.error("Error fetching interviews:", clientError);
      return [];
    }

    return [...(clientData || [])];
  } catch (error) {
    console.log(error);

    return [];
  }
};

const getInterviewById = async (id: string) => {
  try {
    // Can be called from both client and server, use server client for safety
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from("interview")
      .select(`*`)
      .or(`id.eq.${id},readable_slug.eq.${id}`);

    if (error) {
      console.error("Error fetching interview:", error);
      return null;
    }

    return data ? data[0] : null;
  } catch (error) {
    console.log(error);
    return null;
  }
};

const updateInterview = async (payload: any, id: string) => {
  // Use server-side client for API routes
  const supabase = getServerSupabase();
  
  const { error, data } = await supabase
    .from("interview")
    .update({ ...payload })
    .eq("id", id)
    .select();
    
  if (error) {
    console.error("Error updating interview:", error);
    throw new Error(`Failed to update interview: ${error.message}`);
  }

  return data;
};

const deleteInterview = async (id: string) => {
  const supabase = getClientSupabase();
  const { error, data } = await supabase
    .from("interview")
    .delete()
    .eq("id", id);
  if (error) {
    console.log(error);
    return [];
  }

  return data;
};

const getAllRespondents = async (interviewId: string) => {
  try {
    const supabase = getClientSupabase();
    const { data, error } = await supabase
      .from("interview")
      .select(`respondents`)
      .eq("interview_id", interviewId);

    return data || [];
  } catch (error) {
    console.log(error);

    return [];
  }
};

const createInterview = async (payload: any) => {
  // Use server-side client for API routes
  const supabase = getServerSupabase();
  
  console.log("Creating interview with payload:", JSON.stringify(payload, null, 2));
  
  const { error, data } = await supabase
    .from("interview")
    .insert({ ...payload })
    .select(); // Add .select() to return the inserted data
    
  if (error) {
    console.error("Error creating interview:", error);
    throw new Error(`Failed to create interview: ${error.message}`);
  }

  console.log("Interview created successfully:", data);
  return data;
};

export const InterviewService = {
  getAllInterviews,
  getInterviewById,
  updateInterview,
  deleteInterview,
  getAllRespondents,
  createInterview,
};
