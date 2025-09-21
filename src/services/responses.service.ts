import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const supabase = createClientComponentClient();

const createResponse = async (payload: any) => {
  const { error, data } = await supabase
    .from("response")
    .insert({ ...payload })
    .select("id");

  if (error) {
    console.log(error);

    return [];
  }

  return data[0]?.id;
};

const saveResponse = async (payload: any, call_id: string) => {
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
  try {
    const { data, error } = await supabase
      .from("response")
      .select(`*`)
      .eq("interview_id", interviewId)
      .or(`details.is.null, details->call_analysis.not.is.null`)
      .eq("is_ended", true)
      .order("created_at", { ascending: false });

    return data || [];
  } catch (error) {
    console.log(error);

    return [];
  }
};

const getAllEmailAddressesForInterview = async (interviewId: string) => {
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
