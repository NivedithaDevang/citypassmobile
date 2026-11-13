import React, { useState, useEffect, useCallback, useContext } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useUser } from '../../context/UserContext';
import { AuthContext } from '../../context/AuthContext';
import { COLORS } from '../../constants/Color';
import { formatDateToDisplay, parseDobToDate } from '../../utils/dateUtils';
import { ProfileHeaderCard } from '../../components/profile/ProfileHeaderCard';
import { PersonalDetailsCard } from '../../components/profile/PersonalDetailsCard';
import { ProfileMenuCard } from '../../components/profile/ProfileMenuCard';
import { EditProfileModal, CityItem } from '../../components/profile/EditProfileModal';
import { UpdatePasswordModal } from '../../components/profile/UpdatePasswordModal';
import { OrganiserRequestModal } from '../../components/profile/OrganiserRequestModal';

export default function ProfileScreen({ navigation }: any) {
  const { user, setUser, clearUser } = useUser();
  const { logout } = useContext(AuthContext);

  const [loading, setLoading] = useState<boolean>(!user);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [cities, setCities] = useState<CityItem[]>([]);
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState<boolean>(false);
  const [organiserModalVisible, setOrganiserModalVisible] = useState<boolean>(false);

  const fetchCities = useCallback(
    () =>
      api
        .get('/v1/cities')
        .then((response) => {
          const list = response.data?.cities || response.data?.data || response.data || [];
          setCities(Array.isArray(list) ? list : []);
        })
        .catch((error) => console.log('Failed to fetch cities:', error)),
    []
  );

  const fetchProfile = useCallback(async () => {
    try {
      const response = await api.get('/v1/users/userdetails', {
        withCredentials: true,
        headers: { 'x-client-type': 'mobile' },
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

        const parsedDate = rawDob ? parseDobToDate(rawDob) : null;

        setUser({
          id: String(userData.id || user?.id || ''),
          name: userData.name || user?.name || '',
          email: userData.email || user?.email || '',
          role: userData.role || user?.role,
          phone: userData.phone ?? (user as any)?.phone ?? '',
          dob: parsedDate ? formatDateToDisplay(parsedDate) : '',
          rawDob,
          city_id: userData.city_id ?? (user as any)?.city_id ?? '',
          city_name: userData.city_name || userData.city?.name || (user as any)?.city_name || '',
          gender: userData.gender ?? (user as any)?.gender ?? '',
          profile_image: userData.profile_image || (user as any)?.profile_image || null,
          status: userData.status || user?.status || 'ACTIVE',
        } as any);
      }
    } catch (error) {
      console.error('Failed to load profile details:', error);
    } finally {
      setLoading(false);
    }
  }, [setUser, user]);

  useEffect(() => {
    fetchProfile();
    fetchCities();
  }, [fetchProfile, fetchCities]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchProfile(), fetchCities()]);
    setRefreshing(false);
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
            console.log('Server logout failed; clearing session locally:', error);
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
              await api.patch('/v1/users/deactivate', {
                reason: 'User requested account deletion via mobile app.',
              });
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

  const userObj = user as any;
  const resolvedCityName =
    userObj?.city_name || cities.find((c) => String(c.id) === String(userObj?.city_id))?.name;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />

      <View style={styles.topHeader}>
        <Text style={styles.headerTitle}>Account & Profile</Text>
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
        <ProfileHeaderCard
          name={user?.name}
          email={user?.email}
          status={user?.status}
          profileImage={userObj?.profile_image}
          onEditPress={() => setEditModalVisible(true)}
        />

        <PersonalDetailsCard
          email={user?.email}
          phone={userObj?.phone}
          cityName={resolvedCityName}
          dob={userObj?.dob}
          gender={userObj?.gender}
        />

        <ProfileMenuCard
          onNavigateBookings={() => navigation.navigate('MyBookings')}
          onOpenPasswordModal={() => setPasswordModalVisible(true)}
          onOpenOrganiserModal={() => setOrganiserModalVisible(true)}
          onOpenSavedEvents={() => Alert.alert('Saved Events', 'Saved events wishlist coming soon.')}
          onLogout={handleLogout}
        />

        <TouchableOpacity
          style={styles.deleteCard}
          onPress={handleDeleteAccount}
          activeOpacity={0.85}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.red} />
          <View style={{ flex: 1 }}>
            <Text style={styles.deleteTitle}>Deactivate CityPass Account</Text>
            <Text style={styles.deleteSubtitle}>Temporarily remove profile & active passes</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      <EditProfileModal
        visible={editModalVisible}
        user={userObj}
        cities={cities}
        onClose={() => setEditModalVisible(false)}
        onSuccess={(updatedUser) => setUser(updatedUser)}
      />

      <UpdatePasswordModal
        visible={passwordModalVisible}
        onClose={() => setPasswordModalVisible(false)}
      />

      <OrganiserRequestModal
        visible={organiserModalVisible}
        onClose={() => setOrganiserModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingBottom: 70,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.grey,
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
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
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
    color: COLORS.grey,
    fontSize: 11,
    marginTop: 2,
  },
});