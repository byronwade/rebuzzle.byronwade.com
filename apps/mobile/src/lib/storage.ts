/**
 * Secure Storage Helpers
 * Uses expo-secure-store for sensitive data (tokens)
 */

import * as SecureStore from 'expo-secure-store';

// Storage keys
const STORAGE_KEYS = {
  AUTH_TOKEN: 'rebuzzle_auth_token',
  USER_DATA: 'rebuzzle_user_data',
  GUEST_TOKEN: 'rebuzzle_guest_token',
} as const;

/**
 * Save auth token securely
 */
export async function saveAuthToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token);
  } catch (error) {
    console.error('Failed to save auth token:', error);
    throw error;
  }
}

/**
 * Get auth token
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
}

/**
 * Remove auth token (logout)
 */
export async function removeAuthToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
  } catch (error) {
    console.error('Failed to remove auth token:', error);
  }
}

/**
 * Save user data
 */
export async function saveUserData(user: { id: string; username: string; email: string }): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  } catch (error) {
    console.error('Failed to save user data:', error);
  }
}

/**
 * Get cached user data
 */
export async function getUserData(): Promise<{ id: string; username: string; email: string } | null> {
  try {
    const data = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to get user data:', error);
    return null;
  }
}

/**
 * Remove user data
 */
export async function removeUserData(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
  } catch (error) {
    console.error('Failed to remove user data:', error);
  }
}

/**
 * Save guest token
 */
export async function saveGuestToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.GUEST_TOKEN, token);
  } catch (error) {
    console.error('Failed to save guest token:', error);
  }
}

/**
 * Get guest token
 */
export async function getGuestToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(STORAGE_KEYS.GUEST_TOKEN);
  } catch (error) {
    console.error('Failed to get guest token:', error);
    return null;
  }
}

/**
 * Clear all stored data (full logout)
 */
export async function clearAllStorage(): Promise<void> {
  await Promise.all([
    removeAuthToken(),
    removeUserData(),
    SecureStore.deleteItemAsync(STORAGE_KEYS.GUEST_TOKEN).catch(() => {}),
  ]);
}
