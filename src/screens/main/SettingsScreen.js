/**
 * SettingsScreen.js
 *
 * User preferences and settings:
 * - Profile information (editable display name)
 * - Partner information
 * - App preferences
 * - Sign out
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, FONTS, SPACING } from '../../constants/theme';
import { formatCurrency, calculateBalance } from '../../utils/calculations';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;
const isMediumScreen = screenWidth >= 375 && screenWidth < 768;
const isLargeScreen = screenWidth >= 768;

export default function SettingsScreen() {
  const { user, userDetails, signOut, getPartnerDetails } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(userDetails?.displayName || '');
  const [partnerName, setPartnerName] = useState('Partner');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);

  // Fetch partner details
  useEffect(() => {
    const fetchPartner = async () => {
      if (userDetails?.partnerId) {
        try {
          const partner = await getPartnerDetails();
          if (partner && partner.displayName) {
            setPartnerName(partner.displayName);
          }
        } catch (error) {
          console.error('Error fetching partner details:', error);
        }
      }
    };
    fetchPartner();
  }, [userDetails?.partnerId]);

  // Update display name when userDetails changes
  useEffect(() => {
    if (userDetails?.displayName) {
      setDisplayName(userDetails.displayName);
    }
  }, [userDetails?.displayName]);

  const handleSaveName = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    if (displayName === userDetails?.displayName) {
      setEditingName(false);
      return;
    }

    setSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim(),
      });

      setEditingName(false);
      Alert.alert('Success', 'Name updated successfully');
    } catch (error) {
      console.error('Error updating name:', error);
      Alert.alert('Error', 'Failed to update name. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    console.log('Sign out button pressed');
    setSignOutModalVisible(true);
  };

  const confirmSignOut = async () => {
    console.log('Signing out...');
    setLoading(true);
    setSignOutModalVisible(false);
    try {
      await signOut();
      console.log('Sign out successful');
    } catch (error) {
      console.error('Sign out error:', error);
      Alert.alert('Error', `Failed to sign out: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderProfileSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Profile</Text>

      <View style={styles.card}>
        {/* Display Name */}
        <View style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <Ionicons name="person" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Display Name</Text>
            {editingName ? (
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter your name"
                autoFocus
                maxLength={50}
              />
            ) : (
              <Text style={styles.settingValue}>{displayName}</Text>
            )}
          </View>
          {editingName ? (
            <View style={styles.editActions}>
              <TouchableOpacity
                onPress={() => {
                  setDisplayName(userDetails?.displayName || '');
                  setEditingName(false);
                }}
                style={styles.iconButton}
                disabled={saving}
              >
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveName}
                style={styles.iconButton}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={COLORS.success} />
                ) : (
                  <Ionicons name="checkmark" size={24} color={COLORS.success} />
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setEditingName(true)}
              style={styles.iconButton}
            >
              <Ionicons name="pencil" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Email (read-only) */}
        <View style={[styles.settingRow, styles.settingRowLast]}>
          <View style={styles.settingIcon}>
            <Ionicons name="mail" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Email</Text>
            <Text style={styles.settingValue}>{user?.email}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderPartnerSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Partner</Text>

      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <Ionicons name="people" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Partner Name</Text>
            <Text style={styles.settingValue}>{partnerName}</Text>
          </View>
        </View>

        {userDetails?.coupleId && (
          <View style={[styles.settingRow, styles.settingRowLast]}>
            <View style={styles.settingIcon}>
              <Ionicons name="heart" size={20} color={COLORS.error} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Couple ID</Text>
              <Text style={[styles.settingValue, styles.settingValueSmall]}>
                {userDetails.coupleId.substring(0, 20)}...
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const renderPreferencesSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Preferences</Text>

      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <Ionicons name="cash" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Currency</Text>
            <Text style={styles.settingValue}>USD ($)</Text>
          </View>
        </View>

        <View style={[styles.settingRow, styles.settingRowLast]}>
          <View style={styles.settingIcon}>
            <Ionicons name="pie-chart" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Default Split</Text>
            <Text style={styles.settingValue}>50 / 50</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderAboutSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>About</Text>

      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>App Version</Text>
            <Text style={styles.settingValue}>1.0.0</Text>
          </View>
        </View>

        <View style={[styles.settingRow, styles.settingRowLast]}>
          <View style={styles.settingIcon}>
            <Ionicons name="code-slash" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Dividela</Text>
            <Text style={[styles.settingValue, styles.settingValueSmall]}>
              Couple expense tracker
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Manage your profile and preferences</Text>
        </View>

        {/* Profile Section */}
        {renderProfileSection()}

        {/* Partner Section */}
        {renderPartnerSection()}

        {/* Preferences Section */}
        {renderPreferencesSection()}

        {/* About Section */}
        {renderAboutSection()}

        {/* Sign Out Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.signOutButton, loading && styles.signOutButtonDisabled]}
            onPress={handleSignOut}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.error} />
            ) : (
              <Ionicons name="log-out" size={20} color={COLORS.error} />
            )}
            <Text style={styles.signOutButtonText}>
              {loading ? 'Signing Out...' : 'Sign Out'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Sign Out Confirmation Modal */}
      <Modal
        visible={signOutModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSignOutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="log-out" size={32} color={COLORS.error} />
            </View>

            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to sign out? You'll need to sign in again to access your account.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  console.log('Sign out cancelled');
                  setSignOutModalVisible(false);
                }}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={confirmSignOut}
              >
                <Text style={styles.modalButtonTextPrimary}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: Platform.OS === 'web' ? SPACING.base : 10,
    paddingBottom: SPACING.base,
  },
  headerTitle: {
    ...FONTS.heading,
    fontSize: isSmallScreen ? 24 : 28,
    color: COLORS.text,
  },
  headerSubtitle: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.tiny,
  },
  section: {
    paddingHorizontal: SPACING.screenPadding,
    marginTop: SPACING.base,
  },
  sectionTitle: {
    ...FONTS.title,
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  card: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    overflow: 'hidden',
    maxWidth: isLargeScreen ? 600 : '100%',
    alignSelf: isLargeScreen ? 'center' : 'stretch',
    width: isLargeScreen ? '100%' : 'auto',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border || '#E5E5E5',
  },
  settingRowLast: {
    borderBottomWidth: 0,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.base,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.tiny,
  },
  settingValue: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '600',
  },
  settingValueSmall: {
    fontSize: 12,
  },
  input: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '600',
    padding: SPACING.small,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  editActions: {
    flexDirection: 'row',
    gap: SPACING.small,
  },
  iconButton: {
    padding: SPACING.small,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.errorLight,
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING.large,
    borderRadius: 12,
    gap: SPACING.small,
    maxWidth: isLargeScreen ? 600 : '100%',
    alignSelf: isLargeScreen ? 'center' : 'stretch',
    width: isLargeScreen ? '100%' : 'auto',
  },
  signOutButtonDisabled: {
    opacity: 0.6,
  },
  signOutButtonText: {
    ...FONTS.body,
    color: COLORS.error,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.screenPadding,
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: SPACING.large,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalHeader: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.base,
  },
  modalTitle: {
    ...FONTS.heading,
    fontSize: 24,
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  modalMessage: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.large,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.base,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING.large,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: COLORS.backgroundSecondary,
  },
  modalButtonPrimary: {
    backgroundColor: COLORS.error,
  },
  modalButtonTextSecondary: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    ...FONTS.body,
    color: COLORS.background,
    fontWeight: '600',
  },
});
