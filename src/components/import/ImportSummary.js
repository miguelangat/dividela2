import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS } from '../../constants/theme';

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
        {/* Success/Error Header */}
        <View style={[styles.header, success ? styles.successHeader : styles.errorHeader]}>
          <View style={[
            styles.iconContainer,
            { backgroundColor: success ? COLORS.success : COLORS.error }
          ]}>
            <MaterialCommunityIcons
              name={success ? 'check-circle' : 'alert-circle'}
              size={48}
              color={COLORS.textWhite}
            />
          </View>
          <Text style={styles.title}>
            {success ? t('import.summary.success') : t('import.summary.failed')}
          </Text>
          <Text style={styles.subtitle}>
            {success
              ? t('import.summary.successMessage', 'Transactions imported successfully')
              : t('import.summary.failedMessage', 'Import could not be completed')}
          </Text>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.statsContainer}>
          <StatRow
            icon="file-document-outline"
            label={t('import.summary.fileName')}
            value={summary.fileName || 'Unknown'}
          />
          <StatRow
            icon="file-code"
            label={t('import.summary.fileType')}
            value={(summary.fileType || 'unknown').toUpperCase()}
          />
          <StatRow
            icon="format-list-numbered"
            label={t('import.summary.totalTransactions')}
            value={summary.totalTransactions}
          />
          <StatRow
            icon="check-circle"
            label={t('import.summary.imported')}
            value={summary.imported}
            valueColor={COLORS.success}
          />
          {summary.duplicates > 0 && (
            <StatRow
              icon="alert"
              label={t('import.summary.duplicates')}
              value={summary.duplicates}
              valueColor={COLORS.warning}
            />
          )}
          {summary.errors > 0 && (
            <StatRow
              icon="close-circle"
              label={t('import.summary.errors')}
              value={summary.errors}
              valueColor={COLORS.error}
            />
          )}
        </View>

        {!success && result.error && (
          <View style={styles.errorContainer}>
            <View style={styles.errorHeader}>
              <MaterialCommunityIcons name="alert-circle" size={20} color={COLORS.error} />
              <Text style={styles.errorTitle}>Error Details</Text>
            </View>
            <Text style={styles.errorText}>
              {typeof result.error === 'string'
                ? result.error
                : result.error.userMessage || result.error.message || 'An error occurred during import'}
            </Text>
            {result.error.suggestions && result.error.suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsTitle}>💡 Suggestions:</Text>
                {result.error.suggestions.map((suggestion, index) => (
                  <Text key={index} style={styles.suggestionText}>• {suggestion}</Text>
                ))}
              </View>
            )}
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

function StatRow({ icon, label, value, valueColor }) {
  return (
    <View style={styles.statRow}>
      <View style={styles.statLabelContainer}>
        {icon && (
          <MaterialCommunityIcons
            name={icon}
            size={18}
            color={COLORS.textSecondary}
            style={styles.statIcon}
          />
        )}
        <Text style={styles.statLabel}>{label}:</Text>
      </View>
      <Text style={[styles.statValue, valueColor && { color: valueColor }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: SPACING.base,
    ...SHADOWS.large,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.xlarge,
  },
  header: {
    alignItems: 'center',
    paddingVertical: SPACING.xlarge,
    paddingHorizontal: SPACING.base,
    borderRadius: SIZES.borderRadius.large,
    marginBottom: SPACING.base,
  },
  successHeader: {
    backgroundColor: COLORS.success + '15',
  },
  errorHeader: {
    backgroundColor: COLORS.error + '15',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.medium,
    ...SHADOWS.medium,
  },
  title: {
    fontSize: FONTS.sizes.heading,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.tiny,
  },
  subtitle: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  divider: {
    marginVertical: SPACING.medium,
    backgroundColor: COLORS.border,
  },
  statsContainer: {
    marginBottom: SPACING.base,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.medium,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '50',
  },
  statLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    marginRight: SPACING.small,
  },
  statLabel: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.medium,
    color: COLORS.text,
  },
  statValue: {
    fontSize: FONTS.sizes.subtitle,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  errorContainer: {
    backgroundColor: COLORS.error + '10',
    padding: SPACING.base,
    borderRadius: SIZES.borderRadius.medium,
    marginBottom: SPACING.base,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.small,
  },
  errorTitle: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.bold,
    color: COLORS.error,
    marginLeft: SPACING.small,
  },
  errorText: {
    color: COLORS.text,
    fontSize: FONTS.sizes.body,
    marginBottom: SPACING.small,
    lineHeight: FONTS.sizes.body * 1.5,
  },
  suggestionsContainer: {
    marginTop: SPACING.medium,
    paddingTop: SPACING.medium,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  suggestionsTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    marginBottom: SPACING.small,
  },
  suggestionText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.body,
    marginLeft: SPACING.medium,
    marginTop: SPACING.tiny,
    lineHeight: FONTS.sizes.body * 1.4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginTop: SPACING.medium,
    gap: SPACING.small,
  },
  button: {
    flex: 1,
    marginHorizontal: SPACING.tiny,
  },
});
