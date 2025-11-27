import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text, Card, Button, Chip, Divider } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS } from '../../constants/theme';
import TransactionPreviewItem from './TransactionPreviewItem';

/**
 * List of transactions with preview and editing capabilities
 */
export default function TransactionPreviewList({
  transactions,
  suggestions,
  duplicateResults,
  selectedTransactions,
  categoryOverrides,
  onToggleTransaction,
  onCategoryChange,
  onSelectAll,
  onDeselectAll,
}) {
  const { t } = useTranslation();

  // Calculate summary stats
  const totalTransactions = transactions.length;
  const selectedCount = Object.values(selectedTransactions).filter(Boolean).length;
  const duplicateCount = duplicateResults?.filter(r => r.hasDuplicates).length || 0;
  const autoSkippedCount = duplicateResults?.filter(r => r.highConfidenceDuplicate?.confidence >= 0.95).length || 0;

  const totalAmount = transactions
    .filter((_, index) => selectedTransactions[index])
    .reduce((sum, t) => sum + t.amount, 0);

  const renderItem = ({ item, index }) => {
    const suggestion = suggestions?.[index]?.suggestion;
    const duplicateStatus = duplicateResults?.[index]?.transaction?.duplicateStatus;
    const selected = selectedTransactions[index];
    const selectedCategory = categoryOverrides[index];

    return (
      <TransactionPreviewItem
        transaction={item}
        suggestion={suggestion}
        duplicateStatus={duplicateStatus}
        selected={selected}
        selectedCategory={selectedCategory}
        onToggleSelect={(value) => onToggleTransaction(index, value)}
        onCategoryChange={(categoryKey) => onCategoryChange(index, categoryKey)}
      />
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Text style={styles.summaryTitle}>{t('import.preview.title')}</Text>

          <View style={styles.statsRow}>
            <StatChip label={t('import.preview.total')} value={totalTransactions} color={COLORS.primary} />
            <StatChip label={t('import.preview.selectedLabel')} value={selectedCount} color={COLORS.success} />
            {duplicateCount > 0 && (
              <StatChip label={t('import.preview.duplicates')} value={duplicateCount} color={COLORS.warning} />
            )}
          </View>

          <Divider style={styles.divider} />

          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>{t('import.preview.totalToImport')}</Text>
            <Text style={styles.amountValue}>${totalAmount.toFixed(2)}</Text>
          </View>

          {autoSkippedCount > 0 && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                {t('import.preview.autoSkipWarning', { count: autoSkippedCount })}
              </Text>
            </View>
          )}

          <View style={styles.actionButtons}>
            <Button
              mode="outlined"
              onPress={onSelectAll}
              compact
              style={styles.actionButton}
            >
              {t('import.preview.selectAll')}
            </Button>
            <Button
              mode="outlined"
              onPress={onDeselectAll}
              compact
              style={styles.actionButton}
            >
              {t('import.preview.deselectAll')}
            </Button>
          </View>
        </Card.Content>
      </Card>

      <Text style={styles.listTitle}>{t('import.preview.transactionsList', { count: selectedCount })}</Text>
    </View>
  );

  return (
    <FlatList
      data={transactions}
      renderItem={renderItem}
      keyExtractor={(item, index) => `transaction-${index}`}
      ListHeaderComponent={renderHeader}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={true}
    />
  );
}

function StatChip({ label, value, color }) {
  return (
    <Chip
      style={[styles.statChip, { backgroundColor: color + '20' }]}
      textStyle={[styles.statChipText, { color }]}
    >
      {label}: {value}
    </Chip>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: SPACING.small,
  },
  summaryCard: {
    margin: SPACING.base,
    ...SHADOWS.medium,
    backgroundColor: COLORS.background,
  },
  summaryTitle: {
    fontSize: FONTS.sizes.heading,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.medium,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.medium,
  },
  statChip: {
    marginRight: SPACING.small,
    marginBottom: SPACING.small,
  },
  statChipText: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.semibold,
  },
  divider: {
    marginVertical: SPACING.medium,
    backgroundColor: COLORS.border,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.medium,
  },
  amountLabel: {
    fontSize: FONTS.sizes.subtitle,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
  },
  amountValue: {
    fontSize: FONTS.sizes.heading,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
  },
  warningBox: {
    backgroundColor: COLORS.warning + '15',
    padding: SPACING.medium,
    borderRadius: SIZES.borderRadius.medium,
    marginBottom: SPACING.medium,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  warningText: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.medium,
    color: COLORS.text,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.small,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: SPACING.tiny,
  },
  listTitle: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    marginHorizontal: SPACING.base,
    marginBottom: SPACING.medium,
    color: COLORS.text,
  },
  listContent: {
    paddingBottom: SPACING.base,
  },
});
