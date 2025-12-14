import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

/**
 * User-friendly error messages for import issues
 */
export default function ErrorMessageCard({ error, onRetry, onCancel }) {
  const getErrorDetails = (errorMessage) => {
    // Parse error and provide helpful suggestions
    if (!errorMessage) {
      return {
        title: 'Unknown Error',
        message: 'An unexpected error occurred',
        suggestions: ['Please try again'],
      };
    }

    const lowerError = errorMessage.toLowerCase();

    // File parsing errors
    if (lowerError.includes('empty') || lowerError.includes('no data')) {
      return {
        title: 'Empty File',
        message: 'The file appears to be empty or contains no readable data.',
        suggestions: [
          'Make sure the file contains transaction data',
          'Check that the file is not corrupted',
          'Try exporting a new statement from your bank',
        ],
      };
    }

    if (lowerError.includes('date column') || lowerError.includes('could not find date')) {
      return {
        title: 'Missing Date Column',
        message: 'Could not find a date column in your file.',
        suggestions: [
          'Ensure your CSV has a "Date" or "Transaction Date" column',
          'Check that your file has headers in the first row',
          'Try using a different export format from your bank',
        ],
      };
    }

    if (lowerError.includes('amount column') || lowerError.includes('could not find amount')) {
      return {
        title: 'Missing Amount Column',
        message: 'Could not find an amount column in your file.',
        suggestions: [
          'Ensure your CSV has an "Amount", "Debit", or "Credit" column',
          'Check that numeric values are not formatted as text',
          'Try using a different export format',
        ],
      };
    }

    if (lowerError.includes('pdf') && lowerError.includes('extract')) {
      return {
        title: 'PDF Parsing Failed',
        message: 'Could not extract transactions from this PDF.',
        suggestions: [
          'This might be a scanned document - try using a CSV export instead',
          'Some bank PDFs use complex formats that are hard to parse',
          'Download a CSV version of your statement if available',
          'Contact support if this is a digital PDF and should work',
        ],
      };
    }

    if (lowerError.includes('too many')) {
      return {
        title: 'Too Many Transactions',
        message: 'This file contains more than 1,000 transactions.',
        suggestions: [
          'Split your statement into smaller date ranges',
          'Import one month at a time',
          'Filter transactions before exporting from your bank',
        ],
      };
    }

    if (lowerError.includes('network') || lowerError.includes('connection')) {
      return {
        title: 'Network Error',
        message: 'Could not complete the import due to a network issue.',
        suggestions: [
          'Check your internet connection',
          'Try again in a few moments',
          'Make sure you have a stable connection',
        ],
      };
    }

    // Generic error
    return {
      title: 'Import Failed',
      message: errorMessage,
      suggestions: [
        'Check that your file is a valid CSV or PDF',
        'Make sure your file is not password-protected',
        'Try exporting a new statement from your bank',
      ],
    };
  };

  const errorDetails = getErrorDetails(error);

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <Ionicons name="alert-circle" size={40} color={theme.colors.error} />
          <View style={styles.headerText}>
            <Text style={styles.title}>{errorDetails.title}</Text>
            <Text style={styles.message}>{errorDetails.message}</Text>
          </View>
        </View>

        {errorDetails.suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>Suggestions:</Text>
            {errorDetails.suggestions.map((suggestion, index) => (
              <View key={index} style={styles.suggestionRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.suggestion}>{suggestion}</Text>
              </View>
            ))}
          </View>
        )}
      </Card.Content>

      <Card.Actions>
        {onCancel && (
          <Button onPress={onCancel}>Cancel</Button>
        )}
        {onRetry && (
          <Button mode="contained" onPress={onRetry}>
            Try Again
          </Button>
        )}
      </Card.Actions>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
    backgroundColor: theme.colors.error + '10',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.error,
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  suggestionsContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: theme.colors.text,
  },
  suggestionRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  bullet: {
    marginRight: 8,
    color: theme.colors.textSecondary,
  },
  suggestion: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
});
