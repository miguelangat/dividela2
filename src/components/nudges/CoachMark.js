// src/components/nudges/CoachMark.js
// Floating tooltip/coach mark component that points to a target element

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS } from '../../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Arrow size
const ARROW_SIZE = 10;

/**
 * CoachMark - Floating tooltip that points to a target element
 *
 * @param {Object} props
 * @param {React.RefObject} props.targetRef - Ref to the target element to point to
 * @param {'top' | 'bottom' | 'left' | 'right'} props.position - Position relative to target
 * @param {string} props.title - Tooltip title
 * @param {string} props.description - Tooltip description
 * @param {string} props.ctaText - Dismiss button text (default: "Got it!")
 * @param {Function} props.onDismiss - Dismiss callback
 * @param {boolean} props.showBackdrop - Show semi-transparent backdrop (default: true)
 * @param {Object} props.style - Additional tooltip styles
 */
export default function CoachMark({
  targetRef,
  position = 'left',
  title,
  description,
  ctaText = 'Got it!',
  onDismiss,
  showBackdrop = true,
  style,
}) {
  const [targetLayout, setTargetLayout] = useState(null);
  const [tooltipLayout, setTooltipLayout] = useState({ width: 200, height: 100 });

  // Measure target element position
  useEffect(() => {
    if (targetRef?.current) {
      // Small delay to ensure layout is complete
      const measureTimeout = setTimeout(() => {
        targetRef.current.measureInWindow((x, y, width, height) => {
          setTargetLayout({ x, y, width, height });
        });
      }, 100);

      return () => clearTimeout(measureTimeout);
    }
  }, [targetRef]);

  // Calculate tooltip position based on target and preferred position
  const calculatePosition = () => {
    if (!targetLayout) {
      return { top: SCREEN_HEIGHT / 2, left: SCREEN_WIDTH / 2 - 100 };
    }

    const { x, y, width, height } = targetLayout;
    const tooltipWidth = tooltipLayout.width;
    const tooltipHeight = tooltipLayout.height;
    const padding = SPACING.base;

    switch (position) {
      case 'left':
        return {
          top: y + height / 2 - tooltipHeight / 2,
          left: Math.max(padding, x - tooltipWidth - ARROW_SIZE - padding),
        };
      case 'right':
        return {
          top: y + height / 2 - tooltipHeight / 2,
          left: Math.min(SCREEN_WIDTH - tooltipWidth - padding, x + width + ARROW_SIZE + padding),
        };
      case 'top':
        return {
          top: Math.max(padding, y - tooltipHeight - ARROW_SIZE - padding),
          left: Math.max(padding, Math.min(SCREEN_WIDTH - tooltipWidth - padding, x + width / 2 - tooltipWidth / 2)),
        };
      case 'bottom':
        return {
          top: Math.min(SCREEN_HEIGHT - tooltipHeight - padding, y + height + ARROW_SIZE + padding),
          left: Math.max(padding, Math.min(SCREEN_WIDTH - tooltipWidth - padding, x + width / 2 - tooltipWidth / 2)),
        };
      default:
        return { top: y, left: x - tooltipWidth - ARROW_SIZE - padding };
    }
  };

  // Calculate arrow position
  const getArrowStyle = () => {
    if (!targetLayout) return {};

    switch (position) {
      case 'left':
        return {
          right: -ARROW_SIZE,
          top: tooltipLayout.height / 2 - ARROW_SIZE,
          borderLeftWidth: ARROW_SIZE,
          borderLeftColor: COLORS.background,
          borderTopWidth: ARROW_SIZE,
          borderTopColor: 'transparent',
          borderBottomWidth: ARROW_SIZE,
          borderBottomColor: 'transparent',
        };
      case 'right':
        return {
          left: -ARROW_SIZE,
          top: tooltipLayout.height / 2 - ARROW_SIZE,
          borderRightWidth: ARROW_SIZE,
          borderRightColor: COLORS.background,
          borderTopWidth: ARROW_SIZE,
          borderTopColor: 'transparent',
          borderBottomWidth: ARROW_SIZE,
          borderBottomColor: 'transparent',
        };
      case 'top':
        return {
          bottom: -ARROW_SIZE,
          left: tooltipLayout.width / 2 - ARROW_SIZE,
          borderTopWidth: ARROW_SIZE,
          borderTopColor: COLORS.background,
          borderLeftWidth: ARROW_SIZE,
          borderLeftColor: 'transparent',
          borderRightWidth: ARROW_SIZE,
          borderRightColor: 'transparent',
        };
      case 'bottom':
        return {
          top: -ARROW_SIZE,
          left: tooltipLayout.width / 2 - ARROW_SIZE,
          borderBottomWidth: ARROW_SIZE,
          borderBottomColor: COLORS.background,
          borderLeftWidth: ARROW_SIZE,
          borderLeftColor: 'transparent',
          borderRightWidth: ARROW_SIZE,
          borderRightColor: 'transparent',
        };
      default:
        return {};
    }
  };

  const tooltipPosition = calculatePosition();

  const content = (
    <>
      {/* Backdrop */}
      {showBackdrop && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onDismiss}
        />
      )}

      {/* Tooltip */}
      <View
        style={[
          styles.tooltip,
          {
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            maxWidth: SCREEN_WIDTH - SPACING.screenPadding * 2,
          },
          style,
        ]}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width !== tooltipLayout.width || height !== tooltipLayout.height) {
            setTooltipLayout({ width, height });
          }
        }}
      >
        {/* Arrow */}
        <View style={[styles.arrow, getArrowStyle()]} />

        {/* Content */}
        <View style={styles.content}>
          {title && <Text style={styles.title}>{title}</Text>}
          {description && <Text style={styles.description}>{description}</Text>}

          {/* Dismiss button */}
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={onDismiss}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaButtonText}>{ctaText}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Highlight ring around target (optional visual feedback) */}
      {targetLayout && (
        <View
          style={[
            styles.highlightRing,
            {
              top: targetLayout.y - 4,
              left: targetLayout.x - 4,
              width: targetLayout.width + 8,
              height: targetLayout.height + 8,
              borderRadius: (targetLayout.width + 8) / 2,
            },
          ]}
          pointerEvents="none"
        />
      )}
    </>
  );

  // Use Modal for proper z-index handling
  return (
    <Modal
      visible={true}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.medium,
    padding: SPACING.base,
    minWidth: 200,
    ...SHADOWS.large,
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
  },
  content: {
    alignItems: 'flex-start',
  },
  title: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.tiny,
  },
  description: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: SPACING.medium,
  },
  ctaButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.base,
    borderRadius: SIZES.borderRadius.small,
    alignSelf: 'flex-end',
  },
  ctaButtonText: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textWhite,
  },
  highlightRing: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
  },
});
