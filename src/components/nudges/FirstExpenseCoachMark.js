// src/components/nudges/FirstExpenseCoachMark.js
// Coach mark component that points to the FAB button for first expense

import React from 'react';
import { useTranslation } from 'react-i18next';
import CoachMark from './CoachMark';
import { useNudges, NUDGE_TYPES } from '../../contexts/NudgeContext';

/**
 * FirstExpenseCoachMark - Tooltip pointing to FAB for adding first expense
 *
 * @param {Object} props
 * @param {React.RefObject} props.targetRef - Ref to the FAB button
 * @param {Function} props.onDismiss - Optional callback after dismissal
 */
export default function FirstExpenseCoachMark({ targetRef, onDismiss }) {
  const { t } = useTranslation();
  const { dismissNudge } = useNudges();

  const handleDismiss = () => {
    dismissNudge(NUDGE_TYPES.FIRST_EXPENSE);
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <CoachMark
      targetRef={targetRef}
      position="left"
      title={t('nudges.firstExpense.title', 'Add Your First Expense')}
      description={t('nudges.firstExpense.description', 'Tap here to start tracking together')}
      ctaText={t('nudges.firstExpense.dismiss', 'Got it!')}
      onDismiss={handleDismiss}
      showBackdrop={true}
    />
  );
}
