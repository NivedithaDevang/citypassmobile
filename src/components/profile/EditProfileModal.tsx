import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { api } from '../../services/api';
import { COLORS } from '../../constants/Color';
import {
  getMaxSelectableDob,
  formatDateToDisplay,
  formatDateToIso,
  parseDobToDate,
} from '../../utils/dateUtils';

export interface CityItem {
  id: string | number;
  name: string;
}

interface Props {
  visible: boolean;
  user: any;
  cities: CityItem[];
  onClose: () => void;
  onSuccess: (updatedUser: any) => void;
}

export const EditProfileModal = ({
  visible,
  user,
  cities,
  onClose,
  onSuccess,
}: Props) => {
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCityId, setEditCityId] = useState<string | number | ''>('');
  const [editDobDate, setEditDobDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editGender, setEditGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | null>(null);
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const maxSelectableDate = getMaxSelectableDob();

  useEffect(() => {
    if (visible && user) {
      setEditName(user.name || '');
      setEditPhone(user.phone || '');
      setEditCityId(user.city_id || '');
      const initialDate = user.rawDob || user.dob;
      setEditDobDate(initialDate ? parseDobToDate(initialDate) : null);

      const currentGender = user.gender?.toUpperCase();
      setEditGender(
        currentGender === 'MALE' || currentGender === 'FEMALE' || currentGender === 'OTHER'
          ? currentGender
          : null
      );
    }
  }, [visible, user]);

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (event.type === 'set' && date) {
      setEditDobDate(date);
    }
  };

  const handleUpdateProfile = async () => {
    const trimmedName = editName.trim();

    if (!trimmedName) {
      Alert.alert('Required', 'Name cannot be empty.');
      return;
    }
    if (!/^[A-Za-z\s]+$/.test(trimmedName)) {
      Alert.alert('Invalid Name', 'Name can only contain alphabets and spaces.');
      return;
    }
    if (editPhone.trim() && !/^\+?[0-9]{10,13}$/.test(editPhone.trim().replace(/\s/g, ''))) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!editDobDate) {
      Alert.alert('Required', 'Date of birth is required.');
      return;
    }

    const today = new Date();
    let calculatedAge = today.getFullYear() - editDobDate.getFullYear();
    const monthDiff = today.getMonth() - editDobDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < editDobDate.getDate())) {
      calculatedAge--;
    }

    if (calculatedAge < 16) {
      Alert.alert('Eligibility Requirement', 'You must be at least 16 years old to use CityPass.');
      return;
    }

    try {
      setIsUpdating(true);
      const formattedIso = formatDateToIso(editDobDate);
      const displayDob = formatDateToDisplay(editDobDate);

      const payload = {
        name: trimmedName,
        phone: editPhone.trim() || null,
        city_id: editCityId ? Number(editCityId) : null,
        dob: formattedIso,
        gender: editGender,
      };

      const res = await api.patch('/v1/users/userdetails', payload);
      const apiUser = res.data?.user || res.data?.data;
      const selectedCity = cities.find((c) => String(c.id) === String(editCityId));

      onSuccess({
        ...user,
        ...(apiUser || payload),
        dob: displayDob,
        rawDob: formattedIso,
        city_name: selectedCity?.name || user?.city_name || '',
      });

      onClose();
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsUpdating(false);
    }
  };

  const currentSelectedCityName =
    cities.find((c) => String(c.id) === String(editCityId))?.name || 'Select City';

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeading}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.grey} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput
              style={styles.textInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter your full name"
              placeholderTextColor={COLORS.grey}
            />

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.textInput}
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="e.g. 9876543210"
              placeholderTextColor={COLORS.grey}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>City</Text>
            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={() => setCityPickerVisible(true)}
              activeOpacity={0.75}
            >
              <Text style={[styles.dropdownBtnText, !editCityId && { color: COLORS.grey }]}>
                {currentSelectedCityName}
              </Text>
              <Ionicons name="chevron-down" size={18} color={COLORS.grey} />
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Date of Birth [DD-MM-YYYY] *</Text>
            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.75}
            >
              <Text style={[styles.dropdownBtnText, !editDobDate && { color: COLORS.grey }]}>
                {editDobDate ? formatDateToDisplay(editDobDate) : 'Select Date of Birth'}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={COLORS.grey} />
            </TouchableOpacity>
            <Text style={styles.inputHint}>Minimum age requirement is 16 years.</Text>

            {showDatePicker && (
              <View style={Platform.OS === 'ios' ? styles.iosPickerContainer : undefined}>
                <DateTimePicker
                  value={editDobDate || maxSelectableDate}
                  mode="date"
                  display="spinner"
                  maximumDate={maxSelectableDate}
                  onChange={handleDateChange}
                  themeVariant="dark"
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.iosDoneBtn}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.iosDoneBtnText}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

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
                    <Text style={[styles.genderChipText, selected && styles.genderChipTextActive]}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isUpdating}>
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

      {/* Nested City Picker Modal */}
      <Modal visible={cityPickerVisible} transparent animationType="fade">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Your City</Text>
              <TouchableOpacity onPress={() => setCityPickerVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.grey} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 280 }}>
              {cities.length === 0 ? (
                <Text style={styles.emptyText}>No cities available.</Text>
              ) : (
                cities.map((city) => {
                  const isSelected = String(editCityId) === String(city.id);
                  return (
                    <TouchableOpacity
                      key={city.id}
                      style={[styles.cityItem, isSelected && styles.cityItemActive]}
                      onPress={() => {
                        setEditCityId(city.id);
                        setCityPickerVisible(false);
                      }}
                    >
                      <Text style={[styles.cityName, isSelected && styles.cityNameActive]}>
                        {city.name}
                      </Text>
                      {isSelected && <Ionicons name="checkmark" size={18} color={COLORS.purple} />}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeading: { color: COLORS.white, fontSize: 18, fontWeight: '800' },
  inputLabel: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 10,
  },
  inputHint: { color: COLORS.grey, fontSize: 11, marginTop: 4 },
  textInput: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    color: COLORS.white,
    fontSize: 14,
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
  },
  dropdownBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '500' },
  iosPickerContainer: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    marginTop: 8,
    paddingBottom: 8,
  },
  iosDoneBtn: { alignSelf: 'flex-end', paddingHorizontal: 16, paddingVertical: 8 },
  iosDoneBtnText: { color: COLORS.purple, fontWeight: '700', fontSize: 14 },
  genderRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  genderChip: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    alignItems: 'center',
  },
  genderChipActive: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  genderChipText: { color: COLORS.grey, fontSize: 12, fontWeight: '700' },
  genderChipTextActive: { color: '#FFFFFF' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 20 },
  cancelBtn: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: { color: COLORS.grey, fontSize: 14, fontWeight: '700' },
  saveBtn: {
    flex: 1,
    backgroundColor: COLORS.purple,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  pickerCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  emptyText: { color: COLORS.grey, textAlign: 'center', paddingVertical: 16, fontSize: 13 },
  cityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cityItemActive: { backgroundColor: COLORS.surfaceLight, borderRadius: 8 },
  cityName: { color: COLORS.white, fontSize: 14 },
  cityNameActive: { color: COLORS.purple, fontWeight: '700' },
});