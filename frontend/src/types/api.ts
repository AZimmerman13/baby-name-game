// TypeScript type definitions for API
// These match the Pydantic schemas from backend/schemas.py

export type PoolStatus = 'open' | 'revealed';

export interface PoolCreate {
  creator_name: string;
  enable_name?: boolean;
  enable_date?: boolean;
  enable_sex?: boolean;
  enable_time?: boolean;
  enable_weight?: boolean;
  enable_custom?: boolean;
  due_date?: string | null;  // Date in ISO format (YYYY-MM-DD)
  custom_category_name?: string | null;
}

export interface PoolReveal {
  baby_name: string;
  admin_token: string;
  birth_date?: string | null;  // Date in ISO format (YYYY-MM-DD)
  sex?: string | null;
  birth_time?: string | null;  // Time in ISO format (HH:MM:SS)
  weight?: number | null;  // in pounds
  custom_value?: string | null;
}

export interface PoolResponse {
  id: string;
  creator_name: string;
  status: PoolStatus;
  created_at: string;
  participant_count: number;
  enable_name: boolean;
  enable_date: boolean;
  enable_sex: boolean;
  enable_time: boolean;
  enable_weight: boolean;
  enable_custom: boolean;
  due_date: string | null;
  custom_category_name: string | null;
  is_owner: boolean;
}

export interface PoolCreatedResponse {
  id: string;
  creator_name: string;
  status: PoolStatus;
  created_at: string;
  admin_token: string;
  shareable_link: string;
}

export interface GuessCreate {
  player_name: string;
  guessed_names: string[];  // Array of 1-6 names
  guessed_birth_date?: string | null;  // Date in ISO format (YYYY-MM-DD)
  guessed_sex?: string | null;
  guessed_birth_time?: string | null;  // Time in ISO format (HH:MM:SS)
  guessed_weight?: number | null;  // in pounds
  guessed_custom_value?: string | null;
}

export interface GuessResponse {
  id: number;
  player_name: string;
  submitted_at: string;
}

export interface GuessResultResponse {
  id: number;
  player_name: string;
  guessed_names: string[];
  best_guess: string;
  submitted_at: string;
  score: number;
}

export interface LeaderboardEntry {
  rank: number;
  player_name: string;
  guessed_names: string[];
  best_guess: string;
  submitted_at: string;
  name_score: number | null;
  date_score: number | null;
  sex_score: number | null;
  time_score: number | null;
  weight_score: number | null;
  custom_score: number | null;
  total_score: number | null;
}

export interface ResultsResponse {
  pool_id: string;
  baby_name: string;
  creator_name: string;
  leaderboard: LeaderboardEntry[];
  total_participants: number;
}

export interface ApiError {
  detail: string;
}

// User Authentication Types
export interface UserRegister {
  email: string;
  password: string;
  display_name: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
}

export interface PoolLinkRequest {
  admin_token: string;
}

export interface PoolUpdateRequest {
  creator_name?: string;
  due_date?: string | null;
  custom_category_name?: string | null;
}
