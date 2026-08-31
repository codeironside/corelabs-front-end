export function studioStreamMediaUrl(cloudinaryUrl?: string, fallbackUrl?: string): string | undefined {
  const primary = cloudinaryUrl?.trim() || fallbackUrl?.trim();
  if (!primary) return undefined;

  // Legacy TTS uploads used Cloudinary "raw" delivery, which browsers treat as a download.
  if (primary.includes("res.cloudinary.com") && primary.includes("/raw/upload/")) {
    return primary.replace("/raw/upload/", "/video/upload/");
  }

  return primary;
}
