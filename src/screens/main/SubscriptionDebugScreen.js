/**
 * SubscriptionDebugScreen.js
 *
 * Debug screen for testing and monitoring subscription system
 * Only available in __DEV__ mode
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, FONTS, SPACING } from '../../constants/theme';

export default function SubscriptionDebugScreen({ navigation }) {
  const {
    isPremium,
    loading,
    error,
    offerings,
    subscriptionInfo,
    isOffline,
    lastSyncTime,
    refresh,
    restore,
    debugMode,
  } = useSubscription();

  const { userDetails } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [cacheData, setCacheData] = useState(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
      Alert.alert('Success', 'Subscription status refreshed');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const result = await restore();
      Alert.alert(
        'Restore Complete',
        result.isPremium ? 'Premium subscription found!' : 'No previous purchases found.'
      );
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setRestoring(false);
    }
  };

  const handleClearCache = async () => {
    try {
      await AsyncStorage.removeItem('@dividela:subscription_cache');
      Alert.alert('Success', 'Cache cleared! Pull to refresh to resync.');
    } catch (err) {
      Alert.alert('Error', 'Failed to clear cache');
    }
  };

  const loadCacheData = async () => {
    try {
      const cached = await AsyncStorage.getItem('@dividela:subscription_cache');
      if (cached) {
        const data = JSON.parse(cached);
        setCacheData(data);
      } else {
        setCacheData(null);
      }
    } catch (err) {
      console.error('Failed to load cache', err);
    }
  };

  React.useEffect(() => {
    loadCacheData();
  }, []);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!__DEV__) {
    return (
      <View style={styles.container}>
        <Text style={styles.warningText}>Debug screen only available in development mode</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription Debug</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Badge */}
        <View style={[styles.statusBadge, isPremium ? styles.statusPremium : styles.statusFree]}>
          <Ionicons
            name={isPremium ? 'checkmark-circle' : 'close-circle'}
            size={32}
            color="#FFFFFF"
          />
          <Text style={styles.statusBadgeText}>
            {isPremium ? 'PREMIUM ACTIVE' : 'FREE TIER'}
          </Text>
        </View>

        {/* Connection Status */}
        {isOffline && (
          <View style={styles.warningBanner}>
            <Ionicons name="cloud-offline" size={20} color="#FFFFFF" />
            <Text style={styles.warningText}>Offline Mode - Using Cached Data</Text>
          </View>
        )}

        {/* Error Display */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color="#FFFFFF" />
            <Text style={styles.errorText}>Error: {error}</Text>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <Ionicons name="refresh" size={20} color={COLORS.primary} />
            )}
            <Text style={styles.actionButtonText}>Force Refresh</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleRestore}
            disabled={restoring}
          >
            {restoring ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <Ionicons name="download" size={20} color={COLORS.primary} />
            )}
            <Text style={styles.actionButtonText}>Restore Purchases</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleClearCache}>
            <Ionicons name="trash" size={20} color={COLORS.error} />
            <Text style={[styles.actionButtonText, { color: COLORS.error }]}>Clear Cache</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={loadCacheData}>
            <Ionicons name="eye" size={20} color={COLORS.primary} />
            <Text style={styles.actionButtonText}>View Cache</Text>
          </TouchableOpacity>
        </View>

        {/* Subscription Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription Details</Text>

          <InfoRow label="Status" value={isPremium ? 'Premium' : 'Free'} />
          <InfoRow label="Platform" value={userDetails?.subscriptionPlatform || 'N/A'} />
          <InfoRow
            label="Product ID"
            value={userDetails?.subscriptionProductId || 'N/A'}
            small
          />
          <InfoRow
            label="Expires At"
            value={formatDate(subscriptionInfo?.expirationDate)}
          />
          <InfoRow
            label="Last Sync"
            value={formatTimestamp(lastSyncTime)}
          />
          <InfoRow label="Loading" value={loading ? 'Yes' : 'No'} />
          <InfoRow label="Offline Mode" value={isOffline ? 'Yes' : 'No'} />
          <InfoRow label="Debug Mode" value={debugMode ? 'Enabled' : 'Disabled'} />
        </View>

        {/* Firebase User Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Firebase User Data</Text>

          <InfoRow label="User ID" value={userDetails?.uid?.substring(0, 20) + '...' || 'N/A'} small />
          <InfoRow label="Email" value={userDetails?.email || 'N/A'} small />
          <InfoRow label="Couple ID" value={userDetails?.coupleId?.substring(0, 20) + '...' || 'N/A'} small />
          <InfoRow label="Partner ID" value={userDetails?.partnerId?.substring(0, 20) + '...' || 'None'} small />
          <InfoRow
            label="Subscription Status (Firebase)"
            value={userDetails?.subscriptionStatus || 'unknown'}
          />
        </View>

        {/* Offerings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Offerings</Text>

          {offerings && offerings.availablePackages && offerings.availablePackages.length > 0 ? (
            offerings.availablePackages.map((pkg, index) => (
              <View key={index} style={styles.offeringCard}>
                <Text style={styles.offeringTitle}>{pkg.identifier}</Text>
                <Text style={styles.offeringPrice}>
                  ${pkg.product.price} / {pkg.packageType}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No offerings available</Text>
          )}
        </View>

        {/* Cache Data */}
        {cacheData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cache Data</Text>

            <InfoRow label="Cached At" value={formatTimestamp(cacheData.cachedAt)} />
            <InfoRow
              label="Cache Age"
              value={`${Math.round((Date.now() - cacheData.cachedAt) / 1000)}s ago`}
            />
            <InfoRow label="Cached Premium" value={cacheData.isPremium ? 'Yes' : 'No'} />

            <View style={styles.jsonContainer}>
              <Text style={styles.jsonLabel}>Raw Cache:</Text>
              <Text style={styles.jsonText}>{JSON.stringify(cacheData, null, 2)}</Text>
            </View>
          </View>
        )}

        {/* Platform Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Platform Info</Text>

          <InfoRow label="OS" value={Platform.OS} />
          <InfoRow label="Version" value={Platform.Version.toString()} />
          <InfoRow label="__DEV__" value={__DEV__ ? 'true' : 'false'} />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, small }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, small && { fontSize: 12 }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.medium,
    paddingTop: SPACING.large,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.small,
  },
  headerTitle: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.large,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.large,
    borderRadius: 12,
    marginTop: SPACING.large,
    gap: SPACING.small,
  },
  statusPremium: {
    backgroundColor: '#10B981',
  },
  statusFree: {
    backgroundColor: COLORS.textSecondary,
  },
  statusBadgeText: {
    fontSize: 18,
    fontWeight: FONTS.weights.bold,
    color: '#FFFFFF',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    padding: SPACING.medium,
    borderRadius: 8,
    marginTop: SPACING.medium,
    gap: SPACING.small,
  },
  warningText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: FONTS.weights.semibold,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error,
    padding: SPACING.medium,
    borderRadius: 8,
    marginTop: SPACING.medium,
    gap: SPACING.small,
  },
  errorText: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
  },
  section: {
    marginTop: SPACING.xLarge,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.medium,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    padding: SPACING.medium,
    borderRadius: 8,
    marginBottom: SPACING.small,
    gap: SPACING.small,
  },
  actionButtonText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.primary,
    fontWeight: FONTS.weights.semibold,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.small,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
    fontWeight: FONTS.weights.semibold,
    flex: 1,
    textAlign: 'right',
  },
  offeringCard: {
    backgroundColor: COLORS.cardBackground,
    padding: SPACING.medium,
    borderRadius: 8,
    marginBottom: SPACING.small,
  },
  offeringTitle: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    marginBottom: 4,
  },
  offeringPrice: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
  },
  noDataText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  jsonContainer: {
    backgroundColor: '#1E1E1E',
    padding: SPACING.medium,
    borderRadius: 8,
    marginTop: SPACING.small,
  },
  jsonLabel: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: FONTS.weights.semibold,
    marginBottom: SPACING.small,
  },
  jsonText: {
    fontSize: 11,
    color: '#D4D4D4',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
