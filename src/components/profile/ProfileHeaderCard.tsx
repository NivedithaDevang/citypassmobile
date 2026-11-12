import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { COLORS } from '../../constants/Color';

interface Props {
  name?: string;
  email?: string;
  status?: string;
  profileImage?: string | null;
  onEditPress: () => void;
}

export const ProfileHeaderCard = ({
  name,
  email,
  status,
  profileImage,
  onEditPress,
}: Props) => (
  <View style={styles.card}>
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
        <Text style={styles.statusText}>{status || 'ACTIVE'}</Text>
      </View>
    </View>

    <Text style={styles.profileName}>{name || 'CityPass Member'}</Text>
    <Text style={styles.profileEmail}>{email || 'user@citypass.com'}</Text>

    <TouchableOpacity style={styles.editBtn} onPress={onEditPress} activeOpacity={0.8}>
      <Ionicons name="pencil-sharp" size={14} color="#FFFFFF" />
      <Text style={styles.editBtnText}>Edit Profile</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  avatarContainer: { position: 'relative', marginBottom: 12 },
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
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.green },
  statusText: { color: COLORS.green, fontSize: 9, fontWeight: '800' },
  profileName: { color: COLORS.white, fontSize: 20, fontWeight: '800', marginBottom: 4 },
  profileEmail: { color: COLORS.grey, fontSize: 13, marginBottom: 14 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.purple,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});