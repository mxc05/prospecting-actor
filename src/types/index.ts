export type TargetPlatform = 'instagram';

export interface ActorInput {
  platform: TargetPlatform;
  profile_type: string;
  location?: string;
  min_followers?: number;
  max_followers?: number;
  keywords?: string[];
  max_results?: number;
  profile_urls?: string[];
  llm_provider?: 'gemini' | 'openai' | 'openrouter' | 'none';
  gemini_api_key?: string;
  openai_api_key?: string;
}

export interface DiscoveredProfile {
  profileUrl: string;
  username?: string;
}

export interface RawProfileData {
  platform: TargetPlatform;
  name: string;
  username: string;
  profile_url: string;
  bio: string;
  location: string;
  followers: number;
  website: string;
  public_email: string;
  verified: boolean;
  profession?: string;
  services?: string[];
  niche?: string;
}

export interface NormalizedProfileData {
  platform: TargetPlatform;
  name: string;
  username: string;
  profile_url: string;
  bio: string;
  location: string;
  followers: number;
  website: string;
  public_email: string;
  verified: boolean;
}

export interface RuleSignals {
  freelancer_score: number; // 0-100
  business_score: number;    // 0-100
  matched_signals: string[];
  profession_signal_found: boolean;
}

export interface AIClassificationResult {
  profession: string;
  niche: string;
  employment_type: 'Freelancer' | 'Agency' | 'In-House' | 'Business' | 'Unknown';
  profession_match: boolean | null;
  freelancer_confidence: number;
  business_confidence: number;
  confidence: number;
  reason: string;
}

export interface LeadScoreResult {
  profession_match_score: number;
  freelancer_score: number;
  business_score: number;
  contactability_score: number;
  lead_score: number; // 0-100
  qualification: 'High' | 'Medium' | 'Low' | 'Unclassified';
  qualification_reason: string;
}

export interface FinalQualifiedLead extends NormalizedProfileData, RuleSignals, AIClassificationResult {
  lead_score: number | null;
  qualification: 'High' | 'Medium' | 'Low' | 'Unclassified';
  qualification_reason: string;
  scraped_at: string;
}
