/**
 * Authentication utilities for Better Auth OAuth
 */
import * as WebBrowser from 'expo-web-browser'
import { config } from '../config'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Complete the web auth session when done
WebBrowser.maybeCompleteAuthSession()

const SESSION_KEY = '@session'

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle() {
  try {
    // Open the OAuth URL in a browser
    const authUrl = `${config.API_URL}/api/auth/login/google`

    const result = await WebBrowser.openAuthSessionAsync(
      authUrl,
      `${config.REDIRECT_SCHEME}://`
    )

    if (result.type === 'success') {
      // Session cookie is automatically set by Better Auth
      // Mark as authenticated
      await AsyncStorage.setItem(SESSION_KEY, 'true')
      return { success: true }
    }

    return { success: false, error: 'Login cancelled' }
  } catch (error) {
    console.error('Google sign in error:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Sign in with GitHub OAuth
 */
export async function signInWithGitHub() {
  try {
    const authUrl = `${config.API_URL}/api/auth/login/github`

    const result = await WebBrowser.openAuthSessionAsync(
      authUrl,
      `${config.REDIRECT_SCHEME}://`
    )

    if (result.type === 'success') {
      await AsyncStorage.setItem(SESSION_KEY, 'true')
      return { success: true }
    }

    return { success: false, error: 'Login cancelled' }
  } catch (error) {
    console.error('GitHub sign in error:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Sign out
 */
export async function signOut() {
  try {
    // Call the logout endpoint
    await fetch(`${config.API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })

    // Clear local session
    await AsyncStorage.removeItem(SESSION_KEY)
    return { success: true }
  } catch (error) {
    console.error('Sign out error:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await AsyncStorage.getItem(SESSION_KEY)
  return session === 'true'
}

/**
 * Fetch transactions from API
 */
export async function fetchTransactions(limit = 100) {
  try {
    const response = await fetch(
      `${config.API_URL}/api/transactions?limit=${limit}`,
      {
        credentials: 'include', // Include cookies
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    return { success: true, data: data.transactions }
  } catch (error) {
    console.error('Fetch transactions error:', error)
    return { success: false, error: String(error) }
  }
}
