import React, { useState } from 'react';
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
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { api } from '../../services/api';
import { PASSWORD_RULES } from '../../config/PasswordRules';
import { COLORS } from '../../constants/Color';
const colors = COLORS;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[A-Za-z\s.'-]+$/;

export default function SignUpScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const allRulesPassed = PASSWORD_RULES.every((rule: any) => rule.check(password));
  const isConfirmValid = confirmPassword.length > 0 && confirmPassword === password;

  const calculateAge = (dobString: string): number => {
    if (!dobString) return 0;
    const birthDate = new Date(dobString);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--;
    }

    return age;
  };

  const getMaxSelectableDate = (): Date => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 16);
    return d;
  };

  const onDateChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (event.type === 'set' && date) {
      setSelectedDate(date);
      const formatted = date.toISOString().split('T')[0];
      setDob(formatted);
      setError(null);
    }
  };

  // Fixed signature for React Native TextInput
  const handleNameChange = (val: string) => {
    setName(val);
    setError(null);

    if (!val) {
      setNameError(null);
      return;
    }

    if (!NAME_REGEX.test(val)) {
      setNameError('Name can only contain letters and spaces.');
    } else {
      setNameError(null);
    }
  };

  const handleSignUp = async () => {
    setError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError('Please enter your full name.');
      return;
    }

    if (!NAME_REGEX.test(trimmedName)) {
      setError('Name can only contain letters and spaces.');
      return;
    }

    if (trimmedName.length < 2) {
      setError('Name must be at least 2 characters long.');
      return;
    }

    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!dob) {
      setError('Please select your date of birth.');
      return;
    }

    const age = calculateAge(dob);
    if (age < 16) {
      setError('You are not eligible to register for CityPass. You must be at least 16 years old.');
      return;
    }

    if (!allRulesPassed) {
      setError('Please fulfill all password requirements.');
      return;
    }

    if (!isConfirmValid) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: trimmedName,
        email: trimmedEmail.toLowerCase(),
        dob,
        password,
        confirmpassword: confirmPassword,
        role: 'USER',
      };

      await api.post('/v1/auth/register', payload);

      Alert.alert('Account Created!', 'Please sign in with your credentials.', [
        {
          text: 'Go to Sign In',
          onPress: () => navigation.navigate('LoginScreen'),
        },
      ]);
    } catch (err: any) {
      console.log('Error: ', err);
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Unable to register. Please try again.'
      );
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
        >
          {/* Header */}
          <View style={styles.header}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join CityPass to book tickets & experiences</Text>
          </View>

          {/* Visible Error Banner */}
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#EF4444" />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          {/* Registration Form */}
          <View style={styles.formCard}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <View style={[styles.inputWrapper, nameError ? styles.inputBorderError : null]}>
                <Ionicons name="person-outline" size={18} color={colors.grey} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your name"
                  placeholderTextColor={colors.grey}
                  value={name}
                  onChangeText={handleNameChange}
                  autoCapitalize="words"
                />
              </View>
              {nameError && (
                <View style={styles.fieldErrorRow}>
                  <Ionicons name="close-circle" size={14} color={colors.red} />
                  <Text style={styles.fieldErrorText}>{nameError}</Text>
                </View>
              )}
            </View>

            {/* Email Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color={colors.grey} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor={colors.grey}
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    setError(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Date of Birth Picker */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date of Birth (16+ years) *</Text>
              <TouchableOpacity
                style={styles.inputWrapper}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.grey} style={styles.inputIcon} />
                <Text style={[styles.input, !dob && styles.placeholderText]}>
                  {dob || 'Select your date of birth'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.grey} />
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={getMaxSelectableDate()} // Restricts selection to 16+ years
                onChange={onDateChange}
                themeVariant="dark"
              />
            )}

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.grey} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Create a password"
                  placeholderTextColor={colors.grey}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    setError(null);
                  }}
                  onFocus={() => setPasswordFocused(true)}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.grey}
                  />
                </TouchableOpacity>
              </View>

              {/* Password Rule Badges */}
              {(passwordFocused || password.length > 0) && (
                <View style={styles.ruleTray}>
                  {PASSWORD_RULES.map((rule: any) => {
                    const passed = rule.check(password);
                    return (
                      <View
                        key={rule.id}
                        style={[styles.ruleBadge, passed ? styles.ruleValid : styles.ruleInvalid]}
                      >
                        <Ionicons
                          name={passed ? 'checkmark-circle' : 'ellipse-outline'}
                          size={12}
                          color={passed ? colors.green : colors.grey}
                        />
                        <Text style={[styles.ruleText, passed && styles.ruleTextValid]}>
                          {rule.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  confirmPassword.length > 0
                    ? isConfirmValid
                      ? styles.inputBorderSuccess
                      : styles.inputBorderError
                    : null,
                ]}
              >
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.grey} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter password"
                  placeholderTextColor={colors.grey}
                  value={confirmPassword}
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    setError(null);
                  }}
                  onFocus={() => setConfirmFocused(true)}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword((prev) => !prev)}>
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.grey}
                  />
                </TouchableOpacity>
              </View>

              {/* Password Match Hint */}
              {(confirmFocused || confirmPassword.length > 0) && confirmPassword.length > 0 && (
                <View style={styles.matchHintRow}>
                  <Ionicons
                    name={isConfirmValid ? 'checkmark-circle' : 'close-circle'}
                    size={14}
                    color={isConfirmValid ? COLORS.green : COLORS.red}
                  />
                  <Text style={[styles.matchHintText, { color: isConfirmValid ? COLORS.green : COLORS.red }]}>
                    {isConfirmValid ? 'Passwords match' : 'Passwords do not match'}
                  </Text>
                </View>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (loading || Boolean(nameError) || !allRulesPassed || !isConfirmValid) &&
                  styles.submitButtonDisabled,
              ]}
              onPress={handleSignUp}
              disabled={loading || Boolean(nameError) || !allRulesPassed || !isConfirmValid}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Sign Up</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer - Switch to Login */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.replace('LoginScreen')}>
              <Text style={styles.loginLink}>LogIn</Text>
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 10,
  },
  title: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    color: colors.grey,
    fontSize: 13,
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  errorBannerText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  formCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
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
  inputBorderError: {
    borderColor: colors.red,
  },
  inputBorderSuccess: {
    borderColor: colors.green,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: colors.white,
    fontSize: 14,
  },
  placeholderText: {
    color: colors.grey,
  },
  fieldErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
    paddingLeft: 4,
  },
  fieldErrorText: {
    color: colors.red,
    fontSize: 11,
    fontWeight: '600',
  },
  ruleTray: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  ruleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  ruleValid: {
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  ruleInvalid: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  ruleText: {
    color: colors.grey,
    fontSize: 10,
    fontWeight: '600',
  },
  ruleTextValid: {
    color: colors.green,
  },
  matchHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingLeft: 4,
  },
  matchHintText: {
    fontSize: 11,
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: colors.purple,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.45,
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
  loginLink: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: '700',
  },
});