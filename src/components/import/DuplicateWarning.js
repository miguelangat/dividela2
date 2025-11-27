import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Chip, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { theme } from '../../constants/theme';

/**
 * Display duplicate warning for a transaction
 */
export default function DuplicateWarning({ duplicateStatus, onViewDetails }) {
  const { t } = useTranslation();

  if (!duplicateStatus || !duplicateStatus.hasDuplicates) {
    return null;
  }

  const { duplicateCount, highestConfidence, needsReview, autoSkip } = duplicateStatus;

  const getWarningLevel = () => {
    if (autoSkip) return 'high'; // Definitely duplicate
    if (highestConfidence >= 0.7) return 'medium'; // Likely duplicate
    return 'low'; // Possible duplicate
  };

  const getWarningColor = () => {
    const level = getWarningLevel();
    if (level === 'high') return theme.colors.error;
    if (level === 'medium') return theme.colors.warning;
    return '#FFA726'; // Orange for low
  };

  const getWarningText = () => {
    const level = getWarningLevel();
    if (level === 'high') return t('import.preview.duplicateWillSkip');
    if (level === 'medium') return t('import.preview.duplicateLikely');
    return t('import.preview.duplicatePossible');
  };

  const warningColor = getWarningColor();

  return (
    <View style={styles.container}>
      <Chip
        icon="alert-circle"
        style={[styles.chip, { backgroundColor: warningColor + '20' }]}
        textStyle={{ color: warningColor, fontSize: 12 }}
      >
        {getWarningText()}
      </Chip>
      {duplicateCount > 1 && (
        <Text style={[styles.countText, { color: warningColor }]}>
          {t('import.preview.duplicateMatches', { count: duplicateCount })}
        </Text>
      )}
      {onViewDetails && (
        <IconButton
          icon="information"
          size={16}
          iconColor={warningColor}
          onPress={onViewDetails}
          style={styles.infoButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  chip: {
    height: 24,
    marginRight: 4,
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
    marginRight: 4,
  },
  infoButton: {
    margin: 0,
  },
});
