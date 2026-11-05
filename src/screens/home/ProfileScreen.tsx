import React, { useState, useEffect, useCallback, useContext } from 'react';
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
import { api } from '../../services/api';
import { type User, type Bookings } from '../../types/auth';
import { useUser } from '../../context/UserContext';
import { AuthContext } from '../../context/AuthContext';
import {COLORS} from '../../constants/Color';

const formatDobForInput = (value: unknown): string => {
  if (!value) return '';

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];

    const dmyMatch = value.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
    if (dmyMatch) {
      return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
    }

    const parsedDate = new Date(value);
    if (!Number.isNaN(parsedDate.getTime())) {
      const year = parsedDate.getFullYear();
      const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const day = String(parsedDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  return '';
};

const colors = COLORS;

export default function ProfileScreen({ navigation }: any) {
  const { user, setUser, clearUser } = useUser();
  const { logout } = useContext(AuthContext);
  const [bookings, setBookings] = useState<Bookings[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'bookings'>('profile');
  const [loading, setLoading] = useState<boolean>(!user);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Edit Profile Modal States
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editGender, setEditGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Fetch logged in profile details
  const fetchProfile = useCallback(async () => {
      try {
        const response = await api.get('/v1/users/userdetails', {
          withCredentials: true,
          headers: { 'x-client-type': 'mobile' }
        });


      const userData = response.data?.user || response.data?.data || response.data;

      if (userData) {
        const rawDob =
          userData.dob ||
          userData.date_of_birth ||
          userData.birthDate ||
          userData.birth_date ||
          (user as any)?.dob ||
          '';

        const updatedProfile = {
          id: String(userData.id || user?.id || ''),
          name: userData.name || user?.name || '',
          email: userData.email || user?.email || '',
          role: userData.role || user?.role,
          phone: userData.phone ?? (user as any)?.phone ?? '',
          dob: formatDobForInput(rawDob),
          city_id: userData.city_id ?? (user as any)?.city_id ?? '',
          gender: userData.gender ?? (user as any)?.gender ?? '',
          profile_image: userData.profile_image || (user as any)?.profile_image || null,
          status: userData.status || user?.status || 'ACTIVE',
        };

        setUser(updatedProfile as any);
      }
    } catch (error) {
      console.error('Failed to load profile details:', error);
    } finally {
      setLoading(false);
    }
  }, [setUser, user]);

  // Fetch bookings for the logged-in user
  const fetchBookings = useCallback(async () => {
    try {
      const res = await api.get('/v1/bookings/my-bookings');
      const list = Array.isArray(res.data)
        ? res.data
        : res.data?.bookings || res.data?.data || [];
      setBookings(list);
    } catch (err) {
      console.log('Bookings fetch skipped or empty:', err);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchProfile(), fetchBookings()]);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchProfile(), fetchBookings()]);
    setRefreshing(false);
  };

  const openEditModal = () => {
    setEditName(user?.name || '');
    setEditPhone((user as any)?.phone || '');
    const currentGender = (user as any)?.gender;
    setEditGender(
      currentGender === 'MALE' || currentGender === 'FEMALE' || currentGender === 'OTHER'
        ? currentGender
        : null
    );
    setEditModalVisible(true);
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
          } catch (error) {
            console.log('Server logout failed; clearing local session:', error);
          } finally {
            clearUser();
            await logout();
          }
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
              clearUser();
              await logout();
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

  const profileImage = (user as any)?.profile_image;
  const phoneNumber = (user as any)?.phone;
  const dobValue = (user as any)?.dob;
  const genderValue = (user as any)?.gender;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />

      {/* Screen Header */}
      <View style={styles.topHeader}>
        <Text style={styles.headerTitle}>Account & Profile</Text>
        <TouchableOpacity
          style={styles.settingsIcon}
          onPress={openEditModal}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primaryLight}
          />
        }
      >
        {/* 1. User Profile Header Card */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
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
            onPress={openEditModal}
            activeOpacity={0.8}
          >
            <Ionicons name="pencil-sharp" size={14} color="#FFFFFF" />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* 2. Navigation Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'profile' && styles.tabButtonActive]}
            onPress={() => setActiveTab('profile')}
            activeOpacity={0.85}
          >
            <Ionicons
              name="person-circle-outline"
              size={18}
              color={activeTab === 'profile' ? '#FFFFFF' : colors.grey}
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
              color={activeTab === 'bookings' ? '#FFFFFF' : colors.grey}
            />
            <Text style={[styles.tabText, activeTab === 'bookings' && styles.tabTextActive]}>
              My Bookings ({bookings.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. Conditional Content */}
        {activeTab === 'profile' ? (
          <>
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
                  <Text style={styles.infoValue}>{phoneNumber || 'Not added'}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Ionicons name="calendar-clear-outline" size={18} color={COLORS.primaryLight} />
                <View style={styles.infoMeta}>
                  <Text style={styles.infoLabel}>Date of Birth</Text>
                  <Text style={styles.infoValue}>{dobValue || 'Not provided'}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Ionicons name="male-female-outline" size={18} color={COLORS.primaryLight} />
                <View style={styles.infoMeta}>
                  <Text style={styles.infoLabel}>Gender</Text>
                  <Text style={styles.infoValue}>{genderValue || 'Not specified'}</Text>
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
                  <Ionicons name="receipt-outline" size={20} color={colors.primaryLight} />
                  <Text style={styles.menuTitle}>Booking Receipts</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.grey} />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity style={styles.menuRow} activeOpacity={0.8}>
                <View style={styles.menuLeft}>
                  <Ionicons name="heart-outline" size={20} color="#F472B6" />
                  <Text style={styles.menuTitle}>Saved Events & Wishlist</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.grey} />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity style={styles.menuRow} onPress={handleLogout} activeOpacity={0.8}>
                <View style={styles.menuLeft}>
                  <Ionicons name="log-out-outline" size={20} color={colors.primaryLight} />
                  <Text style={styles.menuTitle}>Sign Out</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.grey} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.deleteCard}
              onPress={handleDeleteAccount}
              activeOpacity={0.85}
            >
              <Ionicons name="trash-outline" size={20} color={colors.red} />
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
                <Ionicons name="ticket-outline" size={48} color={colors.grey} />
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
              bookings.map((booking: any) => {
                const isConfirmed = booking.status === 'CONFIRMED';
                return (
                  <View key={booking.id} style={styles.bookingCard}>
                    <View style={styles.bookingHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.bookingEventTitle} numberOfLines={1}>
                          {booking.event_title || booking.event?.title || booking.name || 'CityPass Event'}
                        </Text>
                        <Text style={styles.bookingDate}>
                          Booked on: {booking.booking_date || booking.created_at || 'Recent'}
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
                        <Ionicons name="location-outline" size={15} color={colors.primaryLight} />
                        <Text style={styles.bookingMetaText} numberOfLines={1}>
                          {booking.location || booking.venue || booking.event?.location || 'Venue specified on ticket'}
                        </Text>
                      </View>

                      <View style={styles.bookingFooterRow}>
                        <View style={styles.ticketsCountBox}>
                          <Ionicons name="people-outline" size={15} color={colors.grey} />
                          <Text style={styles.ticketsCountText}>
                            {booking.number_of_tickets || booking.quantity || 1} Pass
                            {(booking.number_of_tickets || booking.quantity || 1) > 1 ? 'es' : ''}
                          </Text>
                        </View>

                        <Text style={styles.bookingPrice}>
                          ₹{Number(booking.total_amount || booking.price || 0).toLocaleString('en-IN')}
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
                <Ionicons name="close" size={24} color={colors.grey} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter your full name"
                placeholderTextColor={colors.grey}
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.textInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="e.g. +91 9876543210"
                placeholderTextColor={colors.grey}
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
    color: colors.grey,
    fontSize: 14,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  profileHeaderCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.surfaceLight,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
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
    borderColor: colors.border,
    alignSelf: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
  },
  statusText: {
    color: colors.green,
    fontSize: 9,
    fontWeight: '800',
  },
  profileName: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  profileEmail: {
    color: colors.grey,
    fontSize: 13,
    marginBottom: 14,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.purple,
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
    backgroundColor: colors.surface,
    padding: 4,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.surfaceLight,
  },
  tabText: {
    color: colors.grey,
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sectionHeading: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.grey,
    fontSize: 11,
    fontWeight: '600',
  },
  infoValue: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.white,
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
    color: colors.red,
    fontSize: 14,
    fontWeight: '700',
  },
  deleteSubtitle: {
    color: colors.grey,
    fontSize: 11,
    marginTop: 2,
  },
  bookingsContainer: {
    gap: 12,
  },
  emptyBookingsBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 32,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyBookingsTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyBookingsSub: {
    color: colors.grey,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  browseBtn: {
    backgroundColor: colors.purple,
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
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
    marginBottom: 10,
  },
  bookingEventTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  bookingDate: {
    color: colors.grey,
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
    color: colors.green,
  },
  textCancelled: {
    color: colors.red,
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
    color: colors.primaryLight,
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
    color: colors.grey,
    fontSize: 12,
    fontWeight: '600',
  },
  bookingPrice: {
    color: colors.green,
    fontSize: 15,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeading: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  inputLabel: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    color: colors.white,
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
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    alignItems: 'center',
  },
  genderChipActive: {
    backgroundColor: colors.purple,
    borderColor: colors.purple,
  },
  genderChipText: {
    color: colors.grey,
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
    backgroundColor: colors.surfaceLight,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: colors.grey,
    fontSize: 14,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.purple,
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