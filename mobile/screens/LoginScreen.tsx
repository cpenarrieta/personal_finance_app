/**
 * Login screen with OAuth providers
 */
import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { signInWithGoogle, signInWithGitHub } from '../lib/auth'

interface LoginScreenProps {
  onLoginSuccess: () => void
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [loading, setLoading] = useState(false)
  const [provider, setProvider] = useState<'google' | 'github' | null>(null)

  const handleGoogleLogin = async () => {
    setLoading(true)
    setProvider('google')

    const result = await signInWithGoogle()

    setLoading(false)
    setProvider(null)

    if (result.success) {
      onLoginSuccess()
    } else {
      Alert.alert('Login Failed', result.error || 'Failed to sign in with Google')
    }
  }

  const handleGitHubLogin = async () => {
    setLoading(true)
    setProvider('github')

    const result = await signInWithGitHub()

    setLoading(false)
    setProvider(null)

    if (result.success) {
      onLoginSuccess()
    } else {
      Alert.alert('Login Failed', result.error || 'Failed to sign in with GitHub')
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Personal Finance</Text>
        <Text style={styles.subtitle}>Sign in to view your transactions</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.googleButton]}
            onPress={handleGoogleLogin}
            disabled={loading}
          >
            {loading && provider === 'google' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonIcon}>G</Text>
                <Text style={styles.buttonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.githubButton]}
            onPress={handleGitHubLogin}
            disabled={loading}
          >
            {loading && provider === 'github' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonIcon}>⚡</Text>
                <Text style={styles.buttonText}>Continue with GitHub</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.note}>
          Note: Only authorized email addresses can access this app
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 48,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 320,
    gap: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  googleButton: {
    backgroundColor: '#4285F4',
  },
  githubButton: {
    backgroundColor: '#24292e',
  },
  buttonIcon: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  note: {
    marginTop: 32,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
})
