import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { theme } from '../../constants/theme';

/**
 * Display category suggestion with confidence indicator
 */
export default function CategorySuggestion({ suggestion, onPress, selected }) {
  const { t } = useTranslation();

  if (!suggestion) return null;

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.7) return theme.colors.success;
    if (confidence >= 0.4) return theme.colors.warning;
    return theme.colors.error;
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.7) return t('import.preview.confidenceHigh');
    if (confidence >= 0.4) return t('import.preview.confidenceMedium');
    return t('import.preview.confidenceLow');
  };

  const confidenceColor = getConfidenceColor(suggestion.confidence);
  const confidenceLabel = getConfidenceLabel(suggestion.confidence);

  return (
    <View style={styles.container}>
      <Chip
        selected={selected}
        onPress={onPress}
        style={[
          styles.chip,
          selected && { backgroundColor: theme.colors.primary },
        ]}
        textStyle={selected && { color: '#fff' }}
      >
        {suggestion.categoryKey}
      </Chip>
      {suggestion.confidence > 0 && (
        <View style={styles.confidenceContainer}>
          <View style={[styles.confidenceDot, { backgroundColor: confidenceColor }]} />
          <Text style={[styles.confidenceText, { color: confidenceColor }]}>
            {confidenceLabel}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  chip: {
    marginRight: 4,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
