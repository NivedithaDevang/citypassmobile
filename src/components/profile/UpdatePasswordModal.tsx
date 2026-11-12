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
import { PASSWORD_RULES } from '../../config/PasswordRules';
import { api } from '../../services/api';
import { COLORS } from '../../constants/Color';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const UpdatePasswordModal = ({ visible, onClose }: Props) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (visible) {
      setNewPassword('');
      setConfirmPassword('');
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setPasswordError('');
    }
  }, [visible]);

  const handleSubmit = async () => {
    setPasswordError('');

    if (!newPassword || !confirmPassword) {
      setPasswordError('Both password fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    const failedRule = PASSWORD_RULES.find((rule) => !rule.check(newPassword));
    if (failedRule) {
      setPasswordError(failedRule.label);
      return;
    }

    try {
      setIsUpdating(true);
      await api.patch(
        '/v1/users/password',
        { newPassword, confirmPassword },
        { withCredentials: true }
      );
      onClose();
      Alert.alert('Success', 'Password updated successfully.');
    } catch (error: any) {
      setPasswordError(error.response?.data?.message || 'Unable to update password.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeading}>Update Password</Text>
            <TouchableOpacity onPress={onClose} disabled={isUpdating}>
              <Ionicons name="close" size={24} color={COLORS.grey} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
            <Text style={styles.inputHint}>
              Choose a secure password meeting all requirements below.
            </Text>

            {passwordError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={COLORS.red} />
                <Text style={styles.errorBannerText}>{passwordError}</Text>
              </View>
            ) : null}

            <Text style={styles.inputLabel}>New Password *</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={styles.passwordField}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor={COLORS.grey}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword((prev) => !prev)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.grey}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Confirm Password *</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={styles.passwordField}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor={COLORS.grey}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword((prev) => !prev)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.grey}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.rulesContainer}>
              {PASSWORD_RULES.map((rule) => {
                const passed = newPassword.length > 0 && rule.check(newPassword);
                return (
                  <View key={rule.id || rule.label} style={styles.ruleRow}>
                    <Ionicons
                      name={passed ? 'checkmark-circle' : 'ellipse-outline'}
                      size={15}
                      color={passed ? COLORS.green : COLORS.grey}
                    />
                    <Text style={[styles.ruleText, passed && { color: COLORS.green }]}>
                      {rule.label}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                disabled={isUpdating}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSubmit}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
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
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  passwordField: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    color: COLORS.white,
    fontSize: 14,
  },
  eyeBtn: { paddingLeft: 8, paddingVertical: 6 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  errorBannerText: { color: COLORS.red, fontSize: 12, flex: 1 },
  rulesContainer: {
    marginTop: 14,
    gap: 6,
    backgroundColor: COLORS.surfaceLight,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleText: { color: COLORS.grey, fontSize: 12 },
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
});