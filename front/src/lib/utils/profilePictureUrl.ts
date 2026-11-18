/**
 * Constructs a proper profile picture URL
 * Handles base64 data URLs, relative paths, and absolute URLs
 */
export function getProfilePictureUrl(picture: string | null | undefined): string | undefined {
  if (!picture) {
    return undefined;
  }

  // If it's already a data URL (base64), return as is
  if (picture.startsWith('data:')) {
    return picture;
  }

  // If it's already an absolute URL (http/https), return as is
  if (picture.startsWith('http://') || picture.startsWith('https://')) {
    return picture;
  }

  // If it's a relative path, prepend the API base URL
  if (picture.startsWith('/')) {
    // Remove leading slash and construct full URL
    const apiBase = process.env.REACT_APP_API_URL || 'https://localhost:3001';
    return `${apiBase}${picture}`;
  }

  // Otherwise, assume it's a relative path without leading slash
  const apiBase = process.env.REACT_APP_API_URL || 'https://localhost:3001';
  return `${apiBase}/${picture}`;
}
