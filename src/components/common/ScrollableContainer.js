// src/components/common/ScrollableContainer.js
// Cross-platform scrollable container that works on web and native

import React from 'react';
import { View, ScrollView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACING, COLORS } from '../../constants/theme';

/**
 * Cross-platform scrollable container that works on web and native
 * Handles safe areas and ensures buttons are always visible
 *
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Main content to be scrollable
 * @param {React.ReactNode} props.footer - Footer content (e.g., buttons) that stays fixed
 * @param {object} props.containerStyle - Additional styles for the container
 * @param {object} props.contentStyle - Additional styles for the scroll content
 * @param {boolean} props.showsVerticalScrollIndicator - Whether to show scroll indicator
 * @param {string} props.testID - Test identifier
 */
export default function ScrollableContainer({
  children,
  footer,
  containerStyle,
  contentStyle,
  showsVerticalScrollIndicator = false,
  testID
}) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={[styles.container, containerStyle]} edges={['top']} testID={testID}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          contentStyle,
          // Web-specific: ensure minimum height for proper scrolling
          Platform.OS === 'web' && { minHeight: '100%' }
        ]}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        // Additional web optimizations
        {...(Platform.OS === 'web' && {
          nestedScrollEnabled: true,
        })}
      >
        {children}
      </ScrollView>

      {footer && (
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, SPACING.base) }
          ]}
          testID={testID ? `${testID}-footer` : undefined}
        >
          {footer}
        </View>
      )}
    </SafeAreaView>
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
    paddingHorizontal: SPACING.screenPadding,
    paddingBottom: SPACING.xxlarge,
  },
  footer: {
    padding: SPACING.screenPadding,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});
