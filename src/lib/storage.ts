export const SUPABASE_PUBLIC_SEGMENT = "/storage/v1/object/public/";

export const getSupabaseStoragePathFromUrl = (url?: string | null): string | null => {
  if (!url) {
    return null;
  }

  const segmentIndex = url.indexOf(SUPABASE_PUBLIC_SEGMENT);
  if (segmentIndex === -1) {
    return null;
  }

  const pathWithBucket = url.slice(segmentIndex + SUPABASE_PUBLIC_SEGMENT.length);
  const slashIndex = pathWithBucket.indexOf("/");
  if (slashIndex === -1) {
    return null;
  }

  const objectPath = pathWithBucket.slice(slashIndex + 1);

  try {
    return decodeURIComponent(objectPath);
  } catch (_error) {
    return objectPath;
  }
};

/**
 * Checks if a logo URL is a custom upload (stored in Supabase)
 * vs an external URL (like Clerk organization logo)
 */
export const isCustomLogoUpload = (url?: string | null): boolean => {
  if (!url) {
    return false;
  }
  
  // Check if it's a Supabase storage URL
  return url.includes(SUPABASE_PUBLIC_SEGMENT);
};
