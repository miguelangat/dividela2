// src/components/chat/MessageBubble.js
// Individual message bubble component

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS } from '../../constants/theme';

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const timestamp = new Date(message.timestamp);
  const timeString = timestamp.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });

  return (
    <View style={[
      styles.container,
      isUser ? styles.userContainer : styles.assistantContainer
    ]}>
      <View style={[
        styles.bubble,
        isUser ? styles.userBubble : styles.assistantBubble
      ]}>
        <Text style={[
          styles.messageText,
          isUser ? styles.userText : styles.assistantText
        ]}>
          {message.content}
        </Text>
        <Text style={[
          styles.timestamp,
          isUser ? styles.userTimestamp : styles.assistantTimestamp
        ]}>
          {timeString}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.small,
    paddingHorizontal: SPACING.base,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.base,
    borderRadius: SIZES.borderRadius.large,
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: SIZES.borderRadius.small,
    ...SHADOWS.small,
  },
  assistantBubble: {
    backgroundColor: COLORS.cardBackground,
    borderBottomLeftRadius: SIZES.borderRadius.small,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  messageText: {
    fontSize: FONTS.sizes.body,
    lineHeight: FONTS.sizes.body * 1.4,
  },
  userText: {
    color: COLORS.textWhite,
  },
  assistantText: {
    color: COLORS.text,
  },
  timestamp: {
    fontSize: FONTS.sizes.tiny,
    marginTop: SPACING.tiny,
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  assistantTimestamp: {
    color: COLORS.textTertiary,
  },
});
