// src/components/chat/TypingIndicator.js
// Animated typing indicator for chat

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS, FONTS, SPACING, SIZES } from '../../constants/theme';

export default function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation = Animated.parallel([
      animate(dot1, 0),
      animate(dot2, 150),
      animate(dot3, 300),
    ]);

    animation.start();

    return () => animation.stop();
  }, []);

  const animatedStyle = (dot) => ({
    opacity: dot.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        translateY: dot.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -4],
        }),
      },
    ],
  });

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <View style={styles.dotsContainer}>
          <Animated.View style={[styles.dot, animatedStyle(dot1)]} />
          <Animated.View style={[styles.dot, animatedStyle(dot2)]} />
          <Animated.View style={[styles.dot, animatedStyle(dot3)]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.small,
    paddingHorizontal: SPACING.base,
    alignItems: 'flex-start',
  },
  bubble: {
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.borderRadius.large,
    borderBottomLeftRadius: SIZES.borderRadius.small,
    paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.base,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
});
