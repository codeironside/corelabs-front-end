import apiClient from "@/lib/axios";
import type { PublicStoryCard, PublicStoryDetail } from "@/pages/marketing/publicStories";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export async function listPublicStories(): Promise<PublicStoryCard[]> {
  const { data } = await apiClient.get<ApiResponse<{ stories: PublicStoryCard[] }>>("/public/stories");
  return data.data.stories;
}

export async function getPublicStory(slug: string): Promise<PublicStoryDetail> {
  const { data } = await apiClient.get<ApiResponse<{ story: PublicStoryDetail }>>(`/public/stories/${slug}`, {
    params: { trackView: "true" },
  });
  return data.data.story;
}
