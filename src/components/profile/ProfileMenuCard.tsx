import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { COLORS } from '../../constants/Color';

interface Props {
  onNavigateBookings: () => void;
  onOpenPasswordModal: () => void;
  onOpenOrganiserModal: () => void;
  onOpenSavedEvents: () => void;
  onLogout: () => void;
}

export const ProfileMenuCard = ({
  onNavigateBookings,
  onOpenPasswordModal,
  onOpenOrganiserModal,
  onOpenSavedEvents,
  onLogout,
}: Props) => {
  const items = [
    { icon: 'ticket-outline', color: COLORS.primaryLight, title: 'My Bookings', onPress: onNavigateBookings },
    { icon: 'lock-closed-outline', color: COLORS.primaryLight, title: 'Update Password', onPress: onOpenPasswordModal },
    { icon: 'megaphone-outline', color: COLORS.primaryLight, title: 'Host an Event', onPress: onOpenOrganiserModal },
    { icon: 'heart-outline', color: '#F472B6', title: 'Saved Events', onPress: onOpenSavedEvents },
    { icon: 'log-out-outline', color: COLORS.primaryLight, title: 'Sign Out', onPress: onLogout },
  ] as const;

  return (
    <>
      <Text style={styles.sectionHeading}>Manage & Settings</Text>
      <View style={styles.card}>
        {items.map((item, idx) => (
          <React.Fragment key={item.title}>
            <TouchableOpacity style={styles.menuRow} onPress={item.onPress} activeOpacity={0.8}>
              <View style={styles.menuLeft}>
                <Ionicons name={item.icon} size={20} color={item.color} />
                <Text style={styles.menuTitle}>{item.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.grey} />
            </TouchableOpacity>
            {idx < items.length - 1 && <View style={styles.divider} />}
          </React.Fragment>
        ))}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  sectionHeading: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 4,
  },
  card: {
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
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuTitle: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
});