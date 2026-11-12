import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { COLORS } from '../../constants/Color';

interface Props {
  email?: string;
  phone?: string;
  cityName?: string;
  dob?: string;
  gender?: string;
}

export const PersonalDetailsCard = ({
  email,
  phone,
  cityName,
  dob,
  gender,
}: Props) => {
  const rows = [
    { icon: 'mail-outline', label: 'Email Address', value: email || 'Not configured' },
    { icon: 'call-outline', label: 'Phone Number', value: phone || 'Not added' },
    { icon: 'location-outline', label: 'City', value: cityName || 'Not selected' },
    { icon: 'calendar-clear-outline', label: 'Date of Birth', value: dob || 'Not provided' },
    { icon: 'male-female-outline', label: 'Gender', value: gender || 'Not specified' },
  ] as const;

  return (
    <>
      <Text style={styles.sectionHeading}>Personal Details</Text>
      <View style={styles.card}>
        {rows.map((item, idx) => (
          <React.Fragment key={item.label}>
            <View style={styles.infoRow}>
              <Ionicons name={item.icon} size={18} color={COLORS.primaryLight} />
              <View style={styles.infoMeta}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue}>{item.value}</Text>
              </View>
            </View>
            {idx < rows.length - 1 && <View style={styles.divider} />}
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
    marginBottom: 20,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 4 },
  infoMeta: { flex: 1 },
  infoLabel: { color: COLORS.grey, fontSize: 11, fontWeight: '600' },
  infoValue: { color: COLORS.white, fontSize: 14, fontWeight: '600', marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
});