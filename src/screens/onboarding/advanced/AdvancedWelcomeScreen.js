// src/screens/onboarding/advanced/AdvancedWelcomeScreen.js
// Advanced Mode Welcome Screen - Step 1/7

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES } from '../../../constants/theme';

export default function AdvancedWelcomeScreen({ navigation }) {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const checklistAnim = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    // Animate icon
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate checklist items with stagger
    const checklistAnimations = checklistAnim.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: 200 + index * 150,
        useNativeDriver: true,
      })
    );

    Animated.stagger(150, checklistAnimations).start();
  }, []);

  const handleGetStarted = () => {
    navigation.navigate('AdvancedTimeframe');
  };

  const handleBackToSimple = () => {
    navigation.navigate('SimpleWelcome'); // or wherever simple mode starts
  };

  const checklistItems = [
    'Track monthly spending',
    'Stay under budget',
    'Split savings fairly',
    'Achieve financial goals',
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>Step 1 of 7</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '14.3%' }]} />
            </View>
          </View>

          {/* Animated Icon */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Text style={styles.iconEmoji}>📊</Text>
          </Animated.View>

          {/* Title */}
          <Text style={styles.title}>Plan Your Year Together</Text>

          {/* Value Proposition */}
          <View style={styles.valueProposition}>
            {checklistItems.map((item, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.checklistItem,
                  {
                    opacity: checklistAnim[index],
                    transform: [
                      {
                        translateY: checklistAnim[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
                <Text style={styles.checklistText}>{item}</Text>
              </Animated.View>
            ))}
          </View>
        </ScrollView>

        {/* Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Let's Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={handleBackToSimple}
            activeOpacity={0.6}
          >
            <Text style={styles.linkButtonText}>Back to Simple Mode</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.screenPadding,
    paddingTop: SPACING.huge,
    paddingBottom: SPACING.xxlarge,
  },
  progressContainer: {
    marginBottom: SPACING.xlarge,
  },
  progressText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textWhite,
    opacity: 0.8,
    marginBottom: SPACING.small,
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.textWhite,
    borderRadius: 2,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xlarge,
  },
  iconEmoji: {
    fontSize: 100,
  },
  title: {
    fontSize: FONTS.sizes.xlarge,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textWhite,
    textAlign: 'center',
    marginBottom: SPACING.xxlarge,
  },
  valueProposition: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: SIZES.borderRadius.large,
    padding: SPACING.xlarge,
    marginBottom: SPACING.xxlarge,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.base,
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.textWhite,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.medium,
  },
  checkmarkText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.primary,
    fontWeight: FONTS.weights.bold,
  },
  checklistText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textWhite,
    flex: 1,
  },
  footer: {
    padding: SPACING.screenPadding,
    paddingTop: SPACING.xlarge,
  },
  primaryButton: {
    backgroundColor: COLORS.textWhite,
    borderRadius: SIZES.borderRadius.medium,
    paddingVertical: SPACING.buttonPadding,
    paddingHorizontal: SPACING.large,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: SIZES.button.height,
    marginBottom: SPACING.base,
  },
  primaryButtonText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
  },
  linkButton: {
    paddingVertical: SPACING.medium,
    alignItems: 'center',
  },
  linkButtonText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textWhite,
    opacity: 0.9,
  },
});
