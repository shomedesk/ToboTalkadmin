import { Timestamp } from "firebase/firestore";

export type PostStatus = "Post created" | "Review Pending" | "Submitted";

export interface VideoPost {
  id?: string;
  title: string;
  description: string;
  category: string;
  thumbnail_url: string;
  video_url?: string;
  youtube_url?: string;
  created_at: Timestamp | Date;
  status: PostStatus;
  author_id: string;
  author_email: string;
  author_name: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  display_name: string;
  photo_url: string;
  is_admin: boolean;
  role: "admin" | "manager" | "user";
}

export interface AppSettings {
  maintenance_mode: boolean;
  app_version: string;
  welcome_message: string;
  r2_access_key_id?: string;
  r2_secret_access_key?: string;
  r2_endpoint?: string;
  r2_bucket?: string;
  r2_directory?: string;
  r2_public_url?: string;
  quick_links?: {
    emoji: string;
    title: string;
    url: string;
  }[];
}

export interface SubscriptionOffer {
  id?: string;
  plan_name: string;
  price: number;
  duration: string;
  features: string[];
}
