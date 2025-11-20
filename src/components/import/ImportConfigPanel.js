import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, SegmentedButtons, Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { theme } from '../../constants/theme';
import { CATEGORIES } from '../../constants/categories';

/**
 * Configuration panel for import settings
 */
export default function ImportConfigPanel({
  config,
  onConfigChange,
  currentUser,
  partner,
}) {
  const { t } = useTranslation();
  const handlePaidByChange = (value) => {
    onConfigChange({
      ...config,
      paidBy: value,
    });
  };

  const handleSplitTypeChange = (value) => {
    onConfigChange({
      ...config,
      splitConfig: {
        ...config.splitConfig,
        type: value,
      },
    });
  };

  const handleDefaultCategoryChange = (categoryKey) => {
    onConfigChange({
      ...config,
      defaultCategoryKey: categoryKey,
    });
  };

  const paidByOptions = [
    {
      value: currentUser.uid,
      label: t('import.config.you'),
    },
    {
      value: partner.partnerId,
      label: t('import.config.partner', { partnerName: partner.partnerName || 'Partner' }),
    },
  ];

  const splitOptions = [
    {
      value: '50/50',
      label: t('import.config.equal'),
    },
    {
      value: 'custom',
      label: t('import.config.custom'),
      disabled: true, // For now, disable custom split in import
    },
  ];

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.sectionTitle}>{t('import.config.title')}</Text>

        {/* Who Paid */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('import.config.whoPaid')}</Text>
          <SegmentedButtons
            value={config.paidBy}
            onValueChange={handlePaidByChange}
            buttons={paidByOptions}
            style={styles.segmentedButtons}
          />
        </View>

        {/* Split Type */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('import.config.split')}</Text>
          <SegmentedButtons
            value={config.splitConfig?.type || '50/50'}
            onValueChange={handleSplitTypeChange}
            buttons={splitOptions}
            style={styles.segmentedButtons}
          />
        </View>

        {/* Default Category */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('import.config.defaultCategory')}</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((category) => (
              <Chip
                key={category.id}
                selected={config.defaultCategoryKey === category.id}
                onPress={() => handleDefaultCategoryChange(category.id)}
                style={styles.categoryChip}
                textStyle={styles.categoryChipText}
              >
                {category.icon} {category.name}
              </Chip>
            ))}
          </View>
        </View>

        {/* Info text */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            {t('import.config.detectDuplicatesHelp')}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: theme.colors.text,
  },
  segmentedButtons: {
    marginTop: 4,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  categoryChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  categoryChipText: {
    fontSize: 13,
  },
  infoBox: {
    backgroundColor: theme.colors.primary + '15',
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  infoText: {
    fontSize: 12,
    color: theme.colors.primary,
    lineHeight: 18,
  },
});
