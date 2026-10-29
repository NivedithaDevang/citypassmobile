import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../services/api';
import { type User, type Bookings } from '../types/auth';

const COLORS = {
  background: '#0F0214',
  surface: '#1E0528',
  surfaceLight: '#2E0B3B',
  primary: '#8B5CF6',
  primaryLight: '#D8B4E2',
  accent: '#A855F7',
  text: '#FFFFFF',
  muted: '#93829B',
  border: 'rgba(255, 255, 255, 0.1)',
  green: '#34D399',
  red: '#F87171',
};

export default function ProfileScreen({ navigation }: any) {
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Bookings[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'bookings'>('profile');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Edit Profile Modal States
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editGender, setEditGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Fetch User & Bookings
  const loadProfileData = useCallback(async () => {
    try {
      const [userRes, bookingsRes] = await Promise.allSettled([
        api.get('/v1/auth/me'),
        api.get('/v1/bookings/my-bookings'),
      ]);

      if (userRes.status === 'fulfilled') {
        const userData = userRes.value.data?.user || userRes.value.data?.data || userRes.value.data;
        setUser(userData);
        setEditName(userData?.name || '');
        setEditPhone(userData?.phone || '');
        setEditGender(userData?.gender || null);
      }

      if (bookingsRes.status === 'fulfilled') {
        const rawBookings = bookingsRes.value.data;
        const list: Bookings[] = Array.isArray(rawBookings)
          ? rawBookings
          : rawBookings?.bookings || rawBookings?.data || [];
        setBookings(list);
      }
    } catch (err) {
      console.error('Failed to load profile details:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProfileData();
  };

  const handleUpdateProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Required', 'Name cannot be empty.');
      return;
    }

    try {
      setIsUpdating(true);
      const payload = {
        name: editName.trim(),
        phone: editPhone.trim() || null,
        gender: editGender,
      };

      const res = await api.put('/v1/auth/profile', payload);
      const updatedUser = res.data?.user || { ...user, ...payload };
      setUser(updatedUser);
      setEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of CityPass?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post('/v1/auth/logout');
          } catch {}
          navigation?.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is irreversible. All your ticket reservations and pass history will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/v1/auth/account');
              navigation?.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Could not delete account.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primaryLight} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />

      {/* Screen Header */}
      <View style={styles.topHeader}>
        <Text style={styles.headerTitle}>Account & Profile</Text>
        <TouchableOpacity
          style={styles.settingsIcon}
          onPress={() => setEditModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryLight} />
        }
      >
        {/* 1. User Profile Header Card */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarContainer}>
            {user?.profile_image ? (
              <Image source={{ uri: user.profile_image }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color={COLORS.primaryLight} />
              </View>
            )}
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>{user?.status || 'ACTIVE'}</Text>
            </View>
          </View>

          <Text style={styles.profileName}>{user?.name || 'CityPass Member'}</Text>
          <Text style={styles.profileEmail}>{user?.email || 'user@citypass.com'}</Text>

          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => setEditModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="pencil-sharp" size={14} color="#FFFFFF" />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* 2. Navigation Tabs (Overview vs My Bookings) */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'profile' && styles.tabButtonActive]}
            onPress={() => setActiveTab('profile')}
            activeOpacity={0.85}
          >
            <Ionicons
              name="person-circle-outline"
              size={18}
              color={activeTab === 'profile' ? '#FFFFFF' : COLORS.muted}
            />
            <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>
              Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'bookings' && styles.tabButtonActive]}
            onPress={() => setActiveTab('bookings')}
            activeOpacity={0.85}
          >
            <Ionicons
              name="ticket-outline"
              size={18}
              color={activeTab === 'bookings' ? '#FFFFFF' : COLORS.muted}
            />
            <Text style={[styles.tabText, activeTab === 'bookings' && styles.tabTextActive]}>
              My Bookings ({bookings.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. Conditional Content */}
        {activeTab === 'profile' ? (
          <>
            {/* User Details Details Section */}
            <Text style={styles.sectionHeading}>Personal Details</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={18} color={COLORS.primaryLight} />
                <View style={styles.infoMeta}>
                  <Text style={styles.infoLabel}>Email Address</Text>
                  <Text style={styles.infoValue}>{user?.email || 'Not configured'}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={18} color={COLORS.primaryLight} />
                <View style={styles.infoMeta}>
                  <Text style={styles.infoLabel}>Phone Number</Text>
                  <Text style={styles.infoValue}>{user?.phone || 'Not added'}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Ionicons name="calendar-clear-outline" size={18} color={COLORS.primaryLight} />
                <View style={styles.infoMeta}>
                  <Text style={styles.infoLabel}>Date of Birth</Text>
                  <Text style={styles.infoValue}>{user?.dob || 'Not provided'}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Ionicons name="male-female-outline" size={18} color={COLORS.primaryLight} />
                <View style={styles.infoMeta}>
                  <Text style={styles.infoLabel}>Gender</Text>
                  <Text style={styles.infoValue}>{user?.gender || 'Not specified'}</Text>
                </View>
              </View>
            </View>

            {/* General Preferences */}
            <Text style={styles.sectionHeading}>Settings & Actions</Text>
            <View style={styles.menuCard}>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => setActiveTab('bookings')}
                activeOpacity={0.8}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="receipt-outline" size={20} color={COLORS.primaryLight} />
                  <Text style={styles.menuTitle}>Booking Receipts</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity style={styles.menuRow} activeOpacity={0.8}>
                <View style={styles.menuLeft}>
                  <Ionicons name="heart-outline" size={20} color="#F472B6" />
                  <Text style={styles.menuTitle}>Saved Events & Wishlist</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity style={styles.menuRow} onPress={handleLogout} activeOpacity={0.8}>
                <View style={styles.menuLeft}>
                  <Ionicons name="log-out-outline" size={20} color={COLORS.primaryLight} />
                  <Text style={styles.menuTitle}>Sign Out</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            {/* Danger Zone */}
            <TouchableOpacity
              style={styles.deleteCard}
              onPress={handleDeleteAccount}
              activeOpacity={0.85}
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.red} />
              <View style={{ flex: 1 }}>
                <Text style={styles.deleteTitle}>Delete CityPass Account</Text>
                <Text style={styles.deleteSubtitle}>Permanently remove profile & active passes</Text>
              </View>
            </TouchableOpacity>
          </>
        ) : (
          /* Bookings Tab */
          <View style={styles.bookingsContainer}>
            {bookings.length === 0 ? (
              <View style={styles.emptyBookingsBox}>
                <Ionicons name="ticket-outline" size={48} color={COLORS.muted} />
                <Text style={styles.emptyBookingsTitle}>No Passes Booked Yet</Text>
                <Text style={styles.emptyBookingsSub}>
                  Browse upcoming concerts, exhibitions, and events on CityPass.
                </Text>
                <TouchableOpacity
                  style={styles.browseBtn}
                  onPress={() => navigation.navigate('Events')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.browseBtnText}>Explore Events</Text>
                </TouchableOpacity>
              </View>
            ) : (
              bookings.map((booking) => {
                const isConfirmed = booking.status === 'CONFIRMED';
                return (
                  <View key={booking.id} style={styles.bookingCard}>
                    <View style={styles.bookingHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.bookingEventTitle} numberOfLines={1}>
                          {booking.event_title || booking.name || 'CityPass Event'}
                        </Text>
                        <Text style={styles.bookingDate}>
                          Booked on: {booking.booking_date}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.bookingStatusBadge,
                          isConfirmed ? styles.statusConfirmed : styles.statusCancelled,
                        ]}
                      >
                        <Text
                          style={[
                            styles.bookingStatusText,
                            isConfirmed ? styles.textConfirmed : styles.textCancelled,
                          ]}
                        >
                          {booking.status || 'CONFIRMED'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.bookingBody}>
                      <View style={styles.bookingMetaRow}>
                        <Ionicons name="location-outline" size={15} color={COLORS.primaryLight} />
                        <Text style={styles.bookingMetaText} numberOfLines={1}>
                          {booking.location || booking.venue || 'Venue specified on ticket'}
                        </Text>
                      </View>

                      <View style={styles.bookingFooterRow}>
                        <View style={styles.ticketsCountBox}>
                          <Ionicons name="people-outline" size={15} color={COLORS.muted} />
                          <Text style={styles.ticketsCountText}>
                            {booking.number_of_tickets || 1} Pass
                            {(booking.number_of_tickets || 1) > 1 ? 'es' : ''}
                          </Text>
                        </View>

                        <Text style={styles.bookingPrice}>
                          ₹{Number(booking.total_amount || 0).toLocaleString('en-IN')}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeading}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter your full name"
                placeholderTextColor={COLORS.muted}
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.textInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="e.g. +91 9876543210"
                placeholderTextColor={COLORS.muted}
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.genderRow}>
                {(['MALE', 'FEMALE', 'OTHER'] as const).map((g) => {
                  const selected = editGender === g;
                  return (
                    <TouchableOpacity
                      key={g}
                      style={[styles.genderChip, selected && styles.genderChipActive]}
                      onPress={() => setEditGender(g)}
                    >
                      <Text
                        style={[styles.genderChipText, selected && styles.genderChipTextActive]}
                      >
                        {g}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setEditModalVisible(false)}
                  disabled={isUpdating}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleUpdateProfile}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.muted,
    fontSize: 14,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  profileHeaderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surfaceLight,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  statusBadge: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: '#110217',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignSelf: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.green,
  },
  statusText: {
    color: COLORS.green,
    fontSize: 9,
    fontWeight: '800',
  },
  profileName: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  profileEmail: {
    color: COLORS.muted,
    fontSize: 13,
    marginBottom: 14,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: 4,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: COLORS.surfaceLight,
  },
  tabText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sectionHeading: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 4,
  },
  infoMeta: {
    flex: 1,
  },
  infoLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  infoValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 10,
  },
  menuCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.25)',
    padding: 14,
    borderRadius: 14,
  },
  deleteTitle: {
    color: COLORS.red,
    fontSize: 14,
    fontWeight: '700',
  },
  deleteSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  bookingsContainer: {
    gap: 12,
  },
  emptyBookingsBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 32,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyBookingsTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyBookingsSub: {
    color: COLORS.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  browseBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  browseBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  bookingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 10,
    marginBottom: 10,
  },
  bookingEventTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  bookingDate: {
    color: COLORS.muted,
    fontSize: 11,
  },
  bookingStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusConfirmed: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
  },
  statusCancelled: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
  },
  bookingStatusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  textConfirmed: {
    color: COLORS.green,
  },
  textCancelled: {
    color: COLORS.red,
  },
  bookingBody: {
    gap: 8,
  },
  bookingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bookingMetaText: {
    color: COLORS.primaryLight,
    fontSize: 12,
  },
  bookingFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  ticketsCountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ticketsCountText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  bookingPrice: {
    color: COLORS.green,
    fontSize: 15,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeading: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  inputLabel: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    color: COLORS.text,
    fontSize: 14,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  genderChip: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    alignItems: 'center',
  },
  genderChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genderChipText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  genderChipTextActive: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 20,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});