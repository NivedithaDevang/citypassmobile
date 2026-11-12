import axios from 'axios';
import { tokenStorage } from './tokenStorage';

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto-inject token into headers
api.interceptors.request.use(async (config) => {
  const token = await tokenStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout if token is rejected by backend (401)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await tokenStorage.removeToken();
    }
    return Promise.reject(error);
  }
);