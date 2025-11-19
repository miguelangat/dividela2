import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button, Divider } from 'react-native-paper';
import { theme } from '../../constants/theme';

/**
 * Display import summary after completion
 */
export default function ImportSummary({ result, onClose, onViewExpenses }) {
  if (!result) return null;

  const { success, summary } = result;

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <Text style={styles.title}>
            {success ? '✅ Import Complete' : '❌ Import Failed'}
          </Text>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.statsContainer}>
          <StatRow label="File" value={summary.fileName || 'Unknown'} />
          <StatRow label="File Type" value={(summary.fileType || 'unknown').toUpperCase()} />
          <StatRow label="Total Transactions" value={summary.totalTransactions} />
          <StatRow
            label="Successfully Imported"
            value={summary.imported}
            valueColor={theme.colors.success}
          />
          {summary.duplicates > 0 && (
            <StatRow
              label="Duplicates Skipped"
              value={summary.duplicates}
              valueColor={theme.colors.warning}
            />
          )}
          {summary.errors > 0 && (
            <StatRow
              label="Errors"
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
              View Expenses
            </Button>
          )}
          <Button
            mode={success ? 'outlined' : 'contained'}
            onPress={onClose}
            style={styles.button}
          >
            {success ? 'Done' : 'Close'}
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
