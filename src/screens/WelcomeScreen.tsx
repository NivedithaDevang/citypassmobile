import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { COLORS } from '../constants/Color';

const { width } = Dimensions.get('window');
const colors = COLORS;

const HIGHLIGHTS = [
  { icon: 'ticket-outline', label: 'Instant bookings & passes' },
  { icon: 'compass-outline', label: 'Curated experiences near you' },
  { icon: 'shield-checkmark-outline', label: 'Fast, secure entry' },
];

export default function WelcomeScreen({ navigation }: any) {
  const handleLogin = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'LoginScreen' }],
    });
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <View style={styles.topGlow} />

      <SafeAreaView style={styles.container}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.badgeGlowRing}>
            <View style={styles.badgeInner}>
              <Ionicons
                name="sparkles"
                size={40}
                color={colors.purple}
              />
            </View>
          </View>

          <Text style={styles.tagline}>EXPLORE YOUR CITY</Text>
          <Text style={styles.appName}>CITYPASS</Text>
          <Text style={styles.description}>
            Your all-in-one pass for live shows, concerts, and exclusive city
            events.
          </Text>
        </View>

        {/* Value Highlights */}
        <View style={styles.highlightsContainer}>
          {HIGHLIGHTS.map((item, index) => (
            <View key={index} style={styles.highlightRow}>
              <View style={styles.iconCircle}>
                <Ionicons
                  name={item.icon as any}
                  size={18}
                  color={colors.purple ?? '#A78BFA'}
                />
              </View>
              <Text style={styles.highlightText}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Action Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={handleLogin}
          >
            <Text style={styles.buttonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingVertical: 16,
  },
  topGlow: {
    position: 'absolute',
    top: -width * 0.3,
    alignSelf: 'center',
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: (width * 0.9) / 2,
    backgroundColor: colors.purple,
    opacity: 0.18,
  },

  /* Hero Section */
  heroSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  badgeGlowRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  badgeInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagline: {
    color: colors.purple,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 6,
  },
  appName: {
    color: colors.white,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  description: {
    color: colors.grey,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 290,
  },

  highlightsContainer: {
    gap: 16,
    marginVertical: 20,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 14,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightText: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '500',
  },

  /* Footer */
  footer: {
    marginBottom: 12,
  },
  primaryButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.purple,
    paddingVertical: 17,
    borderRadius: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});