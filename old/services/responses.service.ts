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

const createResponse = async (payload: any) => {
  // Use server-side client for API routes
  const supabase = getServerSupabase();
  
  console.log("Creating response with payload:", JSON.stringify(payload, null, 2).substring(0, 500));
  
  const { error, data } = await supabase
    .from("response")
    .insert({ ...payload })
    .select("id");

  if (error) {
    console.error("Error creating response:", error);
    throw new Error(`Failed to create response: ${error.message}`);
  }

  console.log("Response created successfully, id:", data[0]?.id);
  return data[0]?.id;
};

const saveResponse = async (payload: any, call_id: string) => {
  const supabase = getClientSupabase();
  
  // Try to update existing row first
  const { error: updateError, data: updateData } = await supabase
    .from("response")
    .update({ ...payload })
    .eq("call_id", call_id)
    .select("id");
  if (updateError) {
    console.log(updateError);
    return [] as Array<{ id: number }>;
  }
  if (Array.isArray(updateData) && updateData.length > 0) {
    return updateData as Array<{ id: number }>;
  }

  // If no row was updated, insert a new one with the provided call_id + payload
  const { error: insertError, data: insertData } = await supabase
    .from("response")
    .insert({ call_id, ...payload })
    .select("id");
  if (insertError) {
    console.log(insertError);
    return [] as Array<{ id: number }>;
  }
  return (insertData as Array<{ id: number }>) || [];
};

const getAllResponses = async (interviewId: string) => {
  const supabase = getClientSupabase();
  
  try {
    // Fetch all responses for this interview that are ended
    // Include both interview responses (with call_analysis) and CV uploads (with source = cv_upload)
    const { data, error } = await supabase
      .from("response")
      .select(`*`)
      .eq("interview_id", interviewId)
      .eq("is_ended", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching responses:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.log(error);
    return [];
  }
};

const getAllEmailAddressesForInterview = async (interviewId: string) => {
  const supabase = getClientSupabase();
  
  try {
    const { data, error } = await supabase
      .from("response")
      .select(`email`)
      .eq("interview_id", interviewId);

    return data || [];
  } catch (error) {
    console.log(error);

    return [];
  }
};

const getResponseByCallId = async (id: string) => {
  const supabase = getClientSupabase();
  
  try {
    const { data, error } = await supabase
      .from("response")
      .select(`*`)
      .filter("call_id", "eq", id);

    return data ? data[0] : null;
  } catch (error) {
    console.log(error);

    return [];
  }
};

const deleteResponse = async (id: string) => {
  const supabase = getClientSupabase();
  
  const { error, data } = await supabase
    .from("response")
    .delete()
    .eq("call_id", id);
  if (error) {
    console.log(error);

    return [];
  }

  return data;
};

const updateResponse = async (payload: any, call_id: string) => {
  const supabase = getClientSupabase();
  
  const { error, data } = await supabase
    .from("response")
    .update({ ...payload })
    .eq("call_id", call_id)
    .select("id");
  if (error) {
    console.log(error);

    return [] as Array<{ id: number }>;
  }

  return (data as Array<{ id: number }>) || [];
};

export const ResponseService = {
  createResponse,
  saveResponse,
  updateResponse,
  getAllResponses,
  getResponseByCallId,
  deleteResponse,
  getAllEmails: getAllEmailAddressesForInterview,
};
