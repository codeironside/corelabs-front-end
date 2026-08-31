/**
 * Unique marketing video assets — each URL is used once on the public site.
 * Do not reuse keys across hero / sections / panels.
 */
export const STUDIO_VIDEOS = {
  hero: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_063509_7d167302-4fd4-480b-8260-18ab572333d4.mp4',
  worlds:
    'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260802_081931_d0adfc37-7ace-4c83-939e-4a6e0e9d9763.mp4',
  technology:
    'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260323_071151_38c3924f-c312-48af-a196-3fbb80e4226f.mp4',
  platform:
    'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260815_034306_b4af8200-cdba-4dc8-b46d-ba7eb9c68c44.mp4',
  creators: 'https://videos.pexels.com/video-files/7777758/7777758-uhd_2732_1440_25fps.mp4',
  craft: 'https://videos.pexels.com/video-files/26100245/11931602_1080_1920_30fps.mp4',
  character: 'https://videos.pexels.com/video-files/34773580/14742439_1080_1920_30fps.mp4',
  atmosphere: 'https://videos.pexels.com/video-files/36061450/15293277_2560_1440_50fps.mp4',
  motion: 'https://videos.pexels.com/video-files/7106567/7106567-uhd_2560_1440_30fps.mp4',
  tall: 'https://videos.pexels.com/video-files/36247767/15372291_1440_2560_30fps.mp4',
  cinema: 'https://videos.pexels.com/video-files/36337737/15412153_1920_1080_25fps.mp4',
} as const;

export type StudioVideoKey = keyof typeof STUDIO_VIDEOS;
