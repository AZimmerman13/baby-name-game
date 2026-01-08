// TypeScript type definitions for API
// These match the Pydantic schemas from backend/schemas.py

export type PoolStatus = 'open' | 'revealed';

export interface PoolCreate {
  creator_name: string;
}

export interface PoolReveal {
  baby_name: string;
  admin_token: string;
}

export interface PoolResponse {
  id: string;
  creator_name: string;
  status: PoolStatus;
  created_at: string;
  participant_count: number;
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
  guessed_names: string[];  // Array of 1-5 names
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
  score: number;
  submitted_at: string;
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
