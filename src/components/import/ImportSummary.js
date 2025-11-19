import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button, Divider } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { theme } from '../../constants/theme';

/**
 * Display import summary after completion
 */
export default function ImportSummary({ result, onClose, onViewExpenses }) {
  const { t } = useTranslation();

  if (!result) return null;

  const { success, summary } = result;

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <Text style={styles.title}>
            {success ? t('import.summary.success') : t('import.summary.failed')}
          </Text>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.statsContainer}>
          <StatRow label={t('import.summary.fileName')} value={summary.fileName || 'Unknown'} />
          <StatRow label={t('import.summary.fileType')} value={(summary.fileType || 'unknown').toUpperCase()} />
          <StatRow label={t('import.summary.totalTransactions')} value={summary.totalTransactions} />
          <StatRow
            label={t('import.summary.imported')}
            value={summary.imported}
            valueColor={theme.colors.success}
          />
          {summary.duplicates > 0 && (
            <StatRow
              label={t('import.summary.duplicates')}
              value={summary.duplicates}
              valueColor={theme.colors.warning}
            />
          )}
          {summary.errors > 0 && (
            <StatRow
              label={t('import.summary.errors')}
              value={summary.errors}
              valueColor={theme.colors.error}
            />
          )}
        </View>

        {!success && result.error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{result.error}</Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          {success && onViewExpenses && (
            <Button
              mode="contained"
              onPress={onViewExpenses}
              style={styles.button}
            >
              {t('import.summary.viewExpenses')}
            </Button>
          )}
          <Button
            mode={success ? 'outlined' : 'contained'}
            onPress={onClose}
            style={styles.button}
          >
            {success ? t('import.summary.done') : t('common.close')}
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
}

function StatRow({ label, value, valueColor }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}:</Text>
      <Text style={[styles.statValue, valueColor && { color: valueColor }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
    elevation: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 12,
  },
  statsContainer: {
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  errorContainer: {
    backgroundColor: theme.colors.error + '15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 13,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginTop: 8,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
});
