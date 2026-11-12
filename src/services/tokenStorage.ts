import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const AUTH_KEY = 'citypass_user_token';

const getStoredValue = () =>
  Platform.OS === 'web'
    ? AsyncStorage.getItem(AUTH_KEY)
    : SecureStore.getItemAsync(AUTH_KEY);

const setStoredValue = (value: string) =>
  Platform.OS === 'web'
    ? AsyncStorage.setItem(AUTH_KEY, value)
    : SecureStore.setItemAsync(AUTH_KEY, value);

const deleteStoredValue = () =>
  Platform.OS === 'web'
    ? AsyncStorage.removeItem(AUTH_KEY)
    : SecureStore.deleteItemAsync(AUTH_KEY);

interface StoredSession {
  token: string;
  expiresAt?: number;
}

function getJwtExpiry(token: string): number | undefined {
  const payload = token.split('.')[1];
  if (!payload) return undefined;

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const claims = JSON.parse(atob(paddedBase64)) as { exp?: unknown };

    return typeof claims.exp === 'number' && Number.isFinite(claims.exp)
      ? claims.exp * 1000
      : undefined;
  } catch {
    return undefined;
  }
}

export const tokenStorage = {
  // Store the server-provided expiry, or use the expiry embedded in a JWT.
  setToken: async (token: string, expiresAt?: number): Promise<void> => {
    const session: StoredSession = {
      token,
      expiresAt: getJwtExpiry(token) ?? expiresAt,
    };
    await setStoredValue(JSON.stringify(session));
  },

  // Retrieve valid token (auto-clears if expired)
  getToken: async (): Promise<string | null> => {
    const data = await getStoredValue();
    if (!data) return null;

    let session: StoredSession;
    try {
      const parsed: unknown = JSON.parse(data);
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !('token' in parsed) ||
        typeof parsed.token !== 'string'
      ) {
        throw new Error('Stored auth session has an invalid format.');
      }
      session = {
        token: parsed.token,
        expiresAt:
          'expiresAt' in parsed &&
          typeof parsed.expiresAt === 'number' &&
          Number.isFinite(parsed.expiresAt)
            ? parsed.expiresAt
            : undefined,
      };
    } catch (error) {
      console.error('Failed to parse stored token session:', error);
      await deleteStoredValue();
      return null;
    }

    const expiresAt = getJwtExpiry(session.token) ?? session.expiresAt;
    if (expiresAt !== undefined && Date.now() >= expiresAt) {
      await deleteStoredValue();
      return null;
    }

    return session.token;
  },

  // Clear token on logout
  removeToken: async (): Promise<void> => {
    await deleteStoredValue();
  },
};