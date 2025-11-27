// src/components/OCRProcessingBanner.js
// Banner component to display OCR processing status with receipt thumbnail

import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS } from '../constants/theme';

export default function OCRProcessingBanner({
  receiptUrl,
  status,
  message,
  error,
  onDismiss,
  dismissible = false,
}) {
  // Don't render if status is invalid or not provided
  if (!status || !['processing', 'completed', 'failed'].includes(status)) {
    return null;
  }

  // Determine status color
  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return '#2196F3'; // Blue
      case 'completed':
        return '#4CAF50'; // Green
      case 'failed':
        return '#F44336'; // Red
      default:
        return COLORS.info;
    }
  };

  // Get message based on status
  const getMessage = () => {
    if (message) {
      return message;
    }

    switch (status) {
      case 'processing':
        return 'AI is analyzing your receipt...';
      case 'completed':
        return 'Receipt analyzed successfully!';
      case 'failed':
        return error || 'Failed to analyze receipt';
      default:
        return '';
    }
  };

  // Get accessibility label
  const getAccessibilityLabel = () => {
    switch (status) {
      case 'processing':
        return 'Processing receipt with AI';
      case 'completed':
        return 'Receipt processed successfully';
      case 'failed':
        return 'Failed to process receipt';
      default:
        return '';
    }
  };

  // Render status icon
  const renderStatusIcon = () => {
    switch (status) {
      case 'processing':
        return (
          <ActivityIndicator
            testID="ocr-banner-spinner"
            size="small"
            color={getStatusColor()}
            style={styles.statusIcon}
          />
        );
      case 'completed':
        return (
          <Ionicons
            testID="ocr-banner-checkmark"
            name="checkmark-circle"
            size={24}
            color={getStatusColor()}
            style={styles.statusIcon}
          />
        );
      case 'failed':
        return (
          <Ionicons
            testID="ocr-banner-error-icon"
            name="alert-circle"
            size={24}
            color={getStatusColor()}
            style={styles.statusIcon}
          />
        );
      default:
        return null;
    }
  };

  const statusColor = getStatusColor();
  const showDismissButton = onDismiss && (dismissible || onDismiss);

  return (
    <View
      testID="ocr-banner"
      style={[
        styles.banner,
        { borderLeftColor: statusColor },
      ]}
      accessibilityLabel={getAccessibilityLabel()}
      accessibilityRole="alert"
    >
      {/* Receipt Thumbnail */}
      {receiptUrl && (
        <Image
          testID="ocr-banner-thumbnail"
          source={{ uri: receiptUrl }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      )}

      {/* Content */}
      <View testID="ocr-banner-content" style={styles.content}>
        <View style={styles.messageContainer}>
          {renderStatusIcon()}
          <Text style={styles.message} numberOfLines={3}>
            {getMessage()}
          </Text>
        </View>
      </View>

      {/* Dismiss Button */}
      {showDismissButton && (
        <TouchableOpacity
          testID="ocr-banner-dismiss"
          onPress={onDismiss}
          style={styles.dismissButton}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="close"
            size={20}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: SIZES.borderRadius.medium,
    padding: SPACING.medium,
    borderLeftWidth: 4,
    ...SHADOWS.small,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundLight,
    marginRight: SPACING.medium,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: SPACING.small,
  },
  message: {
    flex: 1,
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.medium,
    color: COLORS.text,
    lineHeight: 20,
  },
  dismissButton: {
    padding: SPACING.small,
    marginLeft: SPACING.small,
  },
});
