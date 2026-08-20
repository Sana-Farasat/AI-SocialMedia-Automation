export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  is_active: boolean;
  is_verified: boolean;
  avatar_url?: string | null;
  ai_provider: string;
  default_timezone: string;
  default_language: string;
  default_tone: string;
  created_at: string;
  updated_at: string;
}

export interface SocialAccount {
  id: string;
  platform: string;
  provider_account_id: string;
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  page_type?: string | null;
  is_connected: boolean;
  last_synced_at?: string | null;
}

export interface PlatformStatus {
  platform: string;
  configurable: boolean;
  supports_oauth: boolean;
  connected_accounts: number;
}

export interface PostPlatform {
  id: string;
  platform: string;
  social_account_id?: string | null;
  status: string;
  platform_post_id?: string | null;
  platform_url?: string | null;
  error_message?: string | null;
}

export interface Post {
  id: string;
  user_id: string;
  text?: string | null;
  status: string;
  is_ai_generated: boolean;
  created_at: string;
  updated_at: string;
  platforms: PostPlatform[];
  media: Media[];
}

export interface Media {
  id: string;
  file_type: string;
  mime_type?: string | null;
  storage_key?: string | null;
  public_url?: string | null;
  size_bytes?: number | null;
  width?: number | null;
  height?: number | null;
}

export interface Overview {
  connected_accounts: number;
  scheduled_posts: number;
  published_posts: number;
  failed_posts: number;
  drafts: number;
  recent_activity: {
    id: string;
    status: string;
    text: string;
    created_at: string;
  }[];
}

export interface AnalyticsRecord {
  id: string;
  user_id: string;
  social_account_id: string;
  platform: string;
  period?: string | null;
  metric_name: string;
  metric_value?: number | null;
  post_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GenerateResponse {
  content: string;
  platform?: string | null;
  provider: string;
  model?: string | null;
}
