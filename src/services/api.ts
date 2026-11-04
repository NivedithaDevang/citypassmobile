import axios from 'axios';
import { getToken } from './tokenStorage';

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await getToken('authToken');

  if (token) {
    config.headers.Authorization = 'Bearer ' + token;
  }

  return config;
});
