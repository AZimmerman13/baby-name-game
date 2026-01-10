import axios from 'axios';
import type {
  PoolCreatedResponse,
  PoolResponse,
  ResultsResponse,
  PoolCreate,
  GuessCreate,
  PoolReveal,
  UserRegister,
  UserLogin,
  UserResponse,
  PoolLinkRequest,
  PoolUpdateRequest,
} from '../types/api';

// Get API URL from environment variable or use default
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,  // Include cookies in requests
});

// Pool APIs
export const createPool = async (poolData: PoolCreate): Promise<PoolCreatedResponse> => {
  const response = await api.post<PoolCreatedResponse>('/pool', poolData);
  return response.data;
};

export const getPool = async (poolId: string): Promise<PoolResponse> => {
  const response = await api.get<PoolResponse>(`/pool/${poolId}`);
  return response.data;
};

export const submitGuess = async (
  poolId: string,
  guessData: GuessCreate
): Promise<{ message: string; player_name: string }> => {
  const response = await api.post<{ message: string; player_name: string }>(
    `/pool/${poolId}/guess`,
    guessData
  );
  return response.data;
};

export const revealName = async (
  poolId: string,
  revealData: PoolReveal
): Promise<ResultsResponse> => {
  const response = await api.post<ResultsResponse>(`/pool/${poolId}/reveal`, revealData);
  return response.data;
};

export const getResults = async (poolId: string): Promise<ResultsResponse> => {
  const response = await api.get<ResultsResponse>(`/pool/${poolId}/results`);
  return response.data;
};

// Authentication APIs
export const register = async (userData: UserRegister): Promise<UserResponse> => {
  const response = await api.post<UserResponse>('/auth/register', userData);
  return response.data;
};

export const login = async (credentials: UserLogin): Promise<UserResponse> => {
  const response = await api.post<UserResponse>('/auth/login', credentials);
  return response.data;
};

export const logout = async (): Promise<void> => {
  await api.post('/auth/logout');
};

export const getCurrentUser = async (): Promise<UserResponse | null> => {
  try {
    const response = await api.get<UserResponse>('/auth/me');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return null;  // Not authenticated
    }
    throw error;
  }
};

// User Pool Management APIs
export const getUserPools = async (): Promise<PoolResponse[]> => {
  const response = await api.get<PoolResponse[]>('/user/pools');
  return response.data;
};

export const linkPoolToAccount = async (
  poolId: string,
  linkData: PoolLinkRequest
): Promise<PoolResponse> => {
  const response = await api.post<PoolResponse>(`/user/pools/${poolId}/link`, linkData);
  return response.data;
};

export const updatePool = async (
  poolId: string,
  updateData: PoolUpdateRequest
): Promise<PoolResponse> => {
  const response = await api.patch<PoolResponse>(`/user/pools/${poolId}`, updateData);
  return response.data;
};

export const deletePool = async (poolId: string): Promise<void> => {
  await api.delete(`/user/pools/${poolId}`);
};

export default api;
