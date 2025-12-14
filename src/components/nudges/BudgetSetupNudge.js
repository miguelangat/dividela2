// src/components/nudges/BudgetSetupNudge.js
// Nudge banner encouraging users to complete core setup (currency + fiscal year)

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import NudgeBanner from './NudgeBanner';
import { useNudges, NUDGE_TYPES } from '../../contexts/NudgeContext';

/**
 * BudgetSetupNudge - Dismissible banner prompting core setup completion
 *
 * Despite the name, this nudge is shown when core setup (currency + fiscal year)
 * is not complete. Budget setup is optional and can be skipped.
 *
 * @param {Object} props
 * @param {Function} props.onSetup - Optional callback when user taps "Get Started"
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
      navigation.navigate('CoreSetup');
    }
  };

  const handleDismiss = () => {
    dismissNudge(NUDGE_TYPES.BUDGET_SETUP);
  };

  return (
    <NudgeBanner
      icon="clipboard-check-outline"
      title={t('nudges.setup.title', 'Complete Your Setup')}
      description={t('nudges.setup.description', 'Set your currency and fiscal year preferences')}
      ctaText={t('nudges.setup.cta', 'Get Started')}
      ctaAction={handleSetup}
      onDismiss={handleDismiss}
      variant="primary"
      style={style}
      testID="budget-setup-nudge"
    />
  );
}
