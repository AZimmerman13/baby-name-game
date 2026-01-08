import axios from 'axios';
import type {
  PoolCreatedResponse,
  PoolResponse,
  ResultsResponse,
} from '../types/api';

// Get API URL from environment variable or use default
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Pool APIs
export const createPool = async (creatorName: string): Promise<PoolCreatedResponse> => {
  const response = await api.post<PoolCreatedResponse>('/pool', { creator_name: creatorName });
  return response.data;
};

export const getPool = async (poolId: string): Promise<PoolResponse> => {
  const response = await api.get<PoolResponse>(`/pool/${poolId}`);
  return response.data;
};

export const submitGuess = async (
  poolId: string,
  playerName: string,
  guessedNames: string[]
): Promise<{ message: string; player_name: string }> => {
  const response = await api.post<{ message: string; player_name: string }>(
    `/pool/${poolId}/guess`,
    {
      player_name: playerName,
      guessed_names: guessedNames,
    }
  );
  return response.data;
};

export const revealName = async (
  poolId: string,
  babyName: string,
  adminToken: string
): Promise<ResultsResponse> => {
  const response = await api.post<ResultsResponse>(`/pool/${poolId}/reveal`, {
    baby_name: babyName,
    admin_token: adminToken,
  });
  return response.data;
};

export const getResults = async (poolId: string): Promise<ResultsResponse> => {
  const response = await api.get<ResultsResponse>(`/pool/${poolId}/results`);
  return response.data;
};

export default api;
