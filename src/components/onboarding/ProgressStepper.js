// src/components/onboarding/ProgressStepper.js
// Visual step indicator for onboarding flow

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING, SIZES } from '../../constants/theme';

export default function ProgressStepper({
  currentStep = 1,
  totalSteps = 4,
  color = COLORS.primary,
  showLabels = false,
  labels = [],
}) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <View style={styles.container}>
      {/* Step Indicators */}
      <View style={styles.stepsContainer}>
        {steps.map((step, index) => {
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;
          const isUpcoming = step > currentStep;

          return (
            <React.Fragment key={step}>
              {/* Connector Line (before each step except first) */}
              {index > 0 && (
                <View
                  style={[
                    styles.connector,
                    isCompleted && { backgroundColor: color },
                  ]}
                />
              )}

              {/* Step Circle */}
              <View
                style={[
                  styles.stepCircle,
                  isCompleted && { backgroundColor: color, borderColor: color },
                  isCurrent && { borderColor: color, borderWidth: 3 },
                  isUpcoming && styles.stepCircleUpcoming,
                ]}
              >
                {isCompleted ? (
                  <Text style={styles.checkmark}>✓</Text>
                ) : (
                  <Text
                    style={[
                      styles.stepNumber,
                      isCurrent && { color: color, fontWeight: FONTS.weights.bold },
                      isUpcoming && styles.stepNumberUpcoming,
                    ]}
                  >
                    {step}
                  </Text>
                )}
              </View>
            </React.Fragment>
          );
        })}
      </View>

      {/* Labels */}
      {showLabels && labels.length === totalSteps && (
        <View style={styles.labelsContainer}>
          {labels.map((label, index) => {
            const step = index + 1;
            const isCompleted = step < currentStep;
            const isCurrent = step === currentStep;

            return (
              <Text
                key={index}
                style={[
                  styles.label,
                  isCurrent && { color: color, fontWeight: FONTS.weights.semibold },
                  isCompleted && { color: COLORS.textSecondary },
                ]}
              >
                {label}
              </Text>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.medium,
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: SIZES.borderRadius.round,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleUpcoming: {
    backgroundColor: COLORS.backgroundSecondary,
    borderColor: COLORS.border,
  },
  stepNumber: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.medium,
    color: COLORS.text,
  },
  stepNumberUpcoming: {
    color: COLORS.textTertiary,
  },
  checkmark: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textWhite,
    fontWeight: FONTS.weights.bold,
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.tiny,
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING.small,
  },
  label: {
    fontSize: FONTS.sizes.tiny,
    color: COLORS.textTertiary,
    textAlign: 'center',
    flex: 1,
  },
});
