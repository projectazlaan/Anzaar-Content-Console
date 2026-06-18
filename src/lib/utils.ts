
/**
 * Extracts Google Drive ID from a URL or returns the ID if already provided.
 * Ensures we always route through our proxy API for CORS and auth.
 */
export const getDisplayUrl = (url: string | null | undefined, id?: string | null, size = 400) => {
  if (!url && !id) return null;

  // Use ID if provided, but check if it's actually a URL
  const target = id || url;
  if (!target) return null;

  // Regex to find Google Drive ID (usually 25+ chars)
  const match = target.match(/[-\w]{25,}/);
  
  if (match) {
    return `/api/image?id=${match[0]}`;
  }

  // If it's a relative path or already a proxy path
  if (target.startsWith('/') || target.startsWith('blob:') || target.startsWith('data:')) {
    return target;
  }

  // Fallback to original URL
  return target;
};

/**
 * Returns a proxy download URL that forces the browser to download as a file.
 */
export const getDownloadUrl = (url: string | null | undefined, id?: string | null, name?: string) => {
  if (!url && !id) return null;

  const target = id || url;
  if (!target) return null;

  const match = target.match(/[-\w]{25,}/);

  if (match) {
    const base = `/api/download?id=${match[0]}`;
    return name ? `${base}&name=${encodeURIComponent(name)}` : base;
  }

  return target;
};
