import * as SecureStore from 'expo-secure-store';

// Save Token
export const saveToken = async (key: string, value: string) => {
  await SecureStore.setItemAsync(key, value);
};

// Retrieve Token
export const getToken = async (key: string) => {
  return await SecureStore.getItemAsync(key);
};

// Delete Token (Logout)
export const removeToken = async (key: string) => {
  await SecureStore.deleteItemAsync(key);
};
