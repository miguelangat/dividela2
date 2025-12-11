// src/components/nudges/BudgetSetupNudge.js
// Nudge banner encouraging users to set up their budget

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import NudgeBanner from './NudgeBanner';
import { useNudges, NUDGE_TYPES } from '../../contexts/NudgeContext';

/**
 * BudgetSetupNudge - Dismissible banner prompting budget setup
 *
 * @param {Object} props
 * @param {Function} props.onSetup - Optional callback when user taps "Set Up Now"
 * @param {Object} props.style - Additional styles
 */
export default function BudgetSetupNudge({ onSetup, style }) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { dismissNudge } = useNudges();

  const handleSetup = () => {
    if (onSetup) {
      onSetup();
    } else {
      navigation.navigate('Onboarding');
    }
  };

  const handleDismiss = () => {
    dismissNudge(NUDGE_TYPES.BUDGET_SETUP);
  };

  return (
    <NudgeBanner
      icon="pie-chart-outline"
      title={t('nudges.budget.title', 'Set Up Your Budget')}
      description={t('nudges.budget.description', 'Track spending and stay on target together')}
      ctaText={t('nudges.budget.cta', 'Set Up Now')}
      ctaAction={handleSetup}
      onDismiss={handleDismiss}
      variant="primary"
      style={style}
      testID="budget-setup-nudge"
    />
  );
}
