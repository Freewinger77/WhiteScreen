import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const supabase = createClientComponentClient();

const updateOrganization = async (payload: any, id: string) => {
  const { error, data } = await supabase
    .from("organization")
    .update({ ...payload })
    .eq("id", id);
  if (error) {
    console.log(error);

    return [];
  }

  return data;
};

const getClientById = async (
  id: string,
  email?: string | null,
  organization_id?: string | null,
) => {
  try {
    const { data, error } = await supabase
      .from("user")
      .select(`*`)
      .filter("id", "eq", id);

    if (!data || (data.length === 0 && email)) {
      const { error, data } = await supabase
        .from("user")
        .insert({ id: id, email: email, organization_id: organization_id });

      if (error) {
        console.log(error);

        return [];
      }

      return data ? data[0] : null;
    }

    if (data[0].organization_id !== organization_id) {
      const { error, data } = await supabase
        .from("user")
        .update({ organization_id: organization_id })
        .eq("id", id);

      if (error) {
        console.log(error);

        return [];
      }

      return data ? data[0] : null;
    }

    return data ? data[0] : null;
  } catch (error) {
    console.log(error);

    return [];
  }
};

const getOrganizationById = async (
  organization_id?: string,
  organization_name?: string,
  organization_image_url?: string,
) => {
  try {
    const { data, error } = await supabase
      .from("organization")
      .select(`*`)
      .filter("id", "eq", organization_id);

    if (!data || data.length === 0) {
      const { error, data } = await supabase
        .from("organization")
        .insert({ 
          id: organization_id, 
          name: organization_name,
          image_url: organization_image_url 
        });

      if (error) {
        console.log(error);

        return [];
      }

      return data ? data[0] : null;
    }

    // Update if name or image_url changed
    const needsUpdate = 
      (organization_name && data[0].name !== organization_name) ||
      (organization_image_url && data[0].image_url !== organization_image_url);

    if (needsUpdate) {
      const updatePayload: any = {};
      if (organization_name && data[0].name !== organization_name) {
        updatePayload.name = organization_name;
      }
      if (organization_image_url && data[0].image_url !== organization_image_url) {
        updatePayload.image_url = organization_image_url;
      }

      const { error: updateError, data: updateData } = await supabase
        .from("organization")
        .update(updatePayload)
        .eq("id", organization_id)
        .select();

      if (updateError) {
        console.log(updateError);
        return data[0]; // Return old data if update fails
      }

      return updateData ? updateData[0] : data[0];
    }

    return data ? data[0] : null;
  } catch (error) {
    console.log(error);

    return [];
  }
};

const getOrganizationLogoById = async (organization_id: string) => {
  try {
    const { data, error } = await supabase
      .from("organization")
      .select(`image_url`)
      .eq("id", organization_id)
      .single();

    if (error || !data) {
      console.log(error);
      return null;
    }

    return data.image_url;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const ClientService = {
  updateOrganization,
  getClientById,
  getOrganizationById,
  getOrganizationLogoById,
};
