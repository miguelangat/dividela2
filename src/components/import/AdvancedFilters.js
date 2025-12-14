import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Modal, Portal, Card, Text, TextInput, Button, Chip, IconButton } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../../constants/theme';

/**
 * Advanced filters for import transactions
 */
export default function AdvancedFilters({ visible, filters, onApply, onDismiss }) {
  const [localFilters, setLocalFilters] = useState(filters || {});
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const handleApply = () => {
    onApply(localFilters);
  };

  const handleReset = () => {
    setLocalFilters({});
  };

  const handleDateChange = (type, event, selectedDate) => {
    if (type === 'start') {
      setShowStartDatePicker(false);
      if (selectedDate) {
        setLocalFilters({ ...localFilters, startDate: selectedDate });
      }
    } else {
      setShowEndDatePicker(false);
      if (selectedDate) {
        setLocalFilters({ ...localFilters, endDate: selectedDate });
      }
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString();
  };

  const activeFilterCount = Object.keys(localFilters).filter(key => localFilters[key]).length;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <Card style={styles.card}>
          <Card.Title
            title="Advanced Filters"
            subtitle={`${activeFilterCount} filter${activeFilterCount !== 1 ? 's' : ''} active`}
            right={(props) => (
              <IconButton {...props} icon="close" onPress={onDismiss} />
            )}
          />
          <Card.Content>
            <ScrollView style={styles.scrollView}>
              {/* Date Range */}
              <Text style={styles.sectionTitle}>Date Range</Text>
              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <Text style={styles.label}>Start Date</Text>
                  <Button
                    mode="outlined"
                    onPress={() => setShowStartDatePicker(true)}
                    style={styles.dateButton}
                  >
                    {formatDate(localFilters.startDate)}
                  </Button>
                </View>
                <View style={styles.dateField}>
                  <Text style={styles.label}>End Date</Text>
                  <Button
                    mode="outlined"
                    onPress={() => setShowEndDatePicker(true)}
                    style={styles.dateButton}
                  >
                    {formatDate(localFilters.endDate)}
                  </Button>
                </View>
              </View>

              {showStartDatePicker && (
                <DateTimePicker
                  value={localFilters.startDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, date) => handleDateChange('start', event, date)}
                />
              )}

              {showEndDatePicker && (
                <DateTimePicker
                  value={localFilters.endDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, date) => handleDateChange('end', event, date)}
                />
              )}

              {/* Amount Range */}
              <Text style={styles.sectionTitle}>Amount Range</Text>
              <View style={styles.amountRow}>
                <TextInput
                  label="Minimum ($)"
                  mode="outlined"
                  keyboardType="decimal-pad"
                  value={localFilters.minAmount?.toString() || ''}
                  onChangeText={(text) =>
                    setLocalFilters({ ...localFilters, minAmount: parseFloat(text) || 0 })
                  }
                  style={styles.amountInput}
                />
                <TextInput
                  label="Maximum ($)"
                  mode="outlined"
                  keyboardType="decimal-pad"
                  value={localFilters.maxAmount?.toString() || ''}
                  onChangeText={(text) =>
                    setLocalFilters({ ...localFilters, maxAmount: parseFloat(text) || 0 })
                  }
                  style={styles.amountInput}
                />
              </View>

              {/* Transaction Type */}
              <Text style={styles.sectionTitle}>Transaction Type</Text>
              <View style={styles.chipRow}>
                <Chip
                  selected={!localFilters.excludeCredits}
                  onPress={() =>
                    setLocalFilters({ ...localFilters, excludeCredits: false })
                  }
                  style={styles.chip}
                >
                  All Transactions
                </Chip>
                <Chip
                  selected={localFilters.excludeCredits}
                  onPress={() =>
                    setLocalFilters({ ...localFilters, excludeCredits: true })
                  }
                  style={styles.chip}
                >
                  Debits Only
                </Chip>
              </View>

              {/* Exclude Descriptions */}
              <Text style={styles.sectionTitle}>Exclude Keywords</Text>
              <Text style={styles.helpText}>
                Transactions containing these words will be excluded
              </Text>
              <TextInput
                label="Keywords (comma-separated)"
                mode="outlined"
                value={(localFilters.excludeDescriptions || []).join(', ')}
                onChangeText={(text) =>
                  setLocalFilters({
                    ...localFilters,
                    excludeDescriptions: text.split(',').map(s => s.trim()).filter(Boolean),
                  })
                }
                multiline
                style={styles.keywordsInput}
              />
            </ScrollView>
          </Card.Content>
          <Card.Actions>
            <Button onPress={handleReset}>Reset</Button>
            <Button mode="contained" onPress={handleApply}>
              Apply Filters
            </Button>
          </Card.Actions>
        </Card>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    marginHorizontal: 20,
    maxHeight: '80%',
  },
  card: {
    maxHeight: '100%',
  },
  scrollView: {
    maxHeight: 400,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  helpText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateField: {
    flex: 1,
  },
  dateButton: {
    marginTop: 4,
  },
  amountRow: {
    flexDirection: 'row',
    gap: 12,
  },
  amountInput: {
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    flex: 1,
  },
  keywordsInput: {
    marginTop: 8,
  },
});
