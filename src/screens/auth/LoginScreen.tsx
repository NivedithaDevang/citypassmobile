import React, { useContext, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { COLORS } from '../../constants/Color';

const colors = COLORS;

function getTokenExpiresAt(data: unknown): number | undefined {
  if (!data || typeof data !== 'object') return undefined;

  const fields = data as Record<string, unknown>;
  const expiresAt = fields.expiresAt ?? fields.expires_at;

  if (typeof expiresAt === 'number' && Number.isFinite(expiresAt)) {
    return expiresAt < 1_000_000_000_000 ? expiresAt * 1000 : expiresAt;
  }
  if (typeof expiresAt === 'string') {
    const numericExpiry = Number(expiresAt);
    if (expiresAt.trim() && Number.isFinite(numericExpiry)) {
      return numericExpiry < 1_000_000_000_000
        ? numericExpiry * 1000
        : numericExpiry;
    }

    const parsedExpiry = Date.parse(expiresAt);
    if (Number.isFinite(parsedExpiry)) return parsedExpiry;
  }

  const expiresIn = fields.expiresIn ?? fields.expires_in;
  const expiresInSeconds =
    typeof expiresIn === 'number' ? expiresIn : Number(expiresIn);
  return Number.isFinite(expiresInSeconds) && expiresInSeconds >= 0
    ? Date.now() + expiresInSeconds * 1000
    : undefined;
}

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useContext(AuthContext);

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert('Missing Fields', 'Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        email: trimmedEmail.toLowerCase(),
        password: trimmedPassword,
      };

      const response = await api.post('/v1/auth/login', payload, {
        headers: {
          'x-client-type': 'mobile',
        },
      });
      const token =
        response.data?.token ||
        response.data?.accessToken ||
        response.data?.data?.token ||
        response.data?.data?.accessToken;
      const tokenData = response.data?.data ?? response.data;

      if (!token || typeof token !== 'string') {
        throw new Error('Authentication token was not returned by the server.');
      }

      await login(token, getTokenExpiresAt(tokenData));

    } catch (err: any) {

      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Something went wrong. Please check your connection and try again.';
      console.log(err)
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Brand Header */}
          <View style={styles.header}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to access your passes and events
            </Text>
          </View>

          {/* Login Form */}
          <View style={styles.formCard}>
            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={colors.grey}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor={colors.grey}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <View style={styles.passwordLabelRow}>
                <Text style={styles.label}>Password</Text>
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={colors.grey}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.grey}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.grey}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Switch to Sign Up */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don&apos;t have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.replace('SignUpScreen')}
            >
              <Text style={styles.signupLink}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    marginBottom: 16,
  },
  title: {
    color: colors.white,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    color: colors.grey,
    fontSize: 13,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: colors.white,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: colors.purple,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    color: colors.grey,
    fontSize: 13,
  },
  signupLink: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: '700',
  },
});