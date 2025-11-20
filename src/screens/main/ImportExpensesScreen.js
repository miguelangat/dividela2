import React, { useState, useContext, useLayoutEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../../contexts/AuthContext';
import { theme } from '../../constants/theme';
import FilePickerButton from '../../components/import/FilePickerButton';
import ImportConfigPanel from '../../components/import/ImportConfigPanel';
import TransactionPreviewList from '../../components/import/TransactionPreviewList';
import ImportProgressModal from '../../components/import/ImportProgressModal';
import ImportSummary from '../../components/import/ImportSummary';
import DebugPanel from '../../components/import/DebugPanel';
import { previewImport, importFromFile } from '../../services/importService';
import { markDuplicatesForReview } from '../../utils/duplicateDetector';

/**
 * Screen for importing expenses from bank statements
 */
export default function ImportExpensesScreen({ navigation }) {
  const { t } = useTranslation();
  const { user, partnerId, coupleId, partnerName } = useContext(AuthContext);

  // Add console log to verify screen loads
  console.log('ImportExpensesScreen loaded', { user: user?.uid, partnerId, coupleId });

  // File state
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Config state
  const [config, setConfig] = useState({
    coupleId,
    paidBy: user?.uid,
    partnerId,
    splitConfig: { type: '50/50' },
    defaultCategoryKey: 'other',
    availableCategories: ['food', 'groceries', 'transport', 'home', 'fun', 'other'],
    detectDuplicates: true,
  });

  // Preview state
  const [previewData, setPreviewData] = useState(null);
  const [selectedTransactions, setSelectedTransactions] = useState({});
  const [categoryOverrides, setCategoryOverrides] = useState({});

  // Import state
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [showSummary, setShowSummary] = useState(false);

  // Debug state
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // Add debug button to header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setShowDebugPanel(true)}
          style={{ marginRight: 16 }}
        >
          <Ionicons name="settings-outline" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // Handle file selection
  const handleFileSelected = async (file) => {
    try {
      setSelectedFile(file);
      setIsLoading(true);
      setPreviewData(null);

      // Preview the import
      const result = await previewImport(file.uri, config);

      if (!result.success) {
        Alert.alert(
          t('import.errors.parseError'),
          result.error || t('import.errors.parseErrorMessage')
        );
        setSelectedFile(null);
        return;
      }

      // Mark duplicates for review
      const markedTransactions = result.duplicateResults
        ? markDuplicatesForReview(result.duplicateResults)
        : result.transactions;

      // Initialize selection state (select all except auto-skip duplicates)
      const initialSelection = {};
      markedTransactions.forEach((transaction, index) => {
        initialSelection[index] = !transaction.duplicateStatus?.autoSkip;
      });

      setSelectedTransactions(initialSelection);
      setPreviewData({
        ...result,
        transactions: markedTransactions,
      });
    } catch (error) {
      console.error('Error previewing file:', error);
      Alert.alert(
        t('import.errors.previewError'),
        t('import.errors.previewErrorMessage')
      );
      setSelectedFile(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle transaction selection
  const handleToggleTransaction = (index, value) => {
    setSelectedTransactions(prev => ({
      ...prev,
      [index]: value,
    }));
  };

  // Handle category change
  const handleCategoryChange = (index, categoryKey) => {
    setCategoryOverrides(prev => ({
      ...prev,
      [index]: categoryKey,
    }));
  };

  // Select/Deselect all
  const handleSelectAll = () => {
    const allSelected = {};
    previewData.transactions.forEach((transaction, index) => {
      // Don't select auto-skip duplicates
      allSelected[index] = !transaction.duplicateStatus?.autoSkip;
    });
    setSelectedTransactions(allSelected);
  };

  const handleDeselectAll = () => {
    const noneSelected = {};
    previewData.transactions.forEach((_, index) => {
      noneSelected[index] = false;
    });
    setSelectedTransactions(noneSelected);
  };

  // Perform import
  const handleImport = async () => {
    console.log('handleImport called', { hasFile: !!selectedFile, hasPreview: !!previewData });

    try {
      if (!selectedFile || !previewData) {
        console.warn('Missing required data:', { selectedFile: !!selectedFile, previewData: !!previewData });
        return;
      }

      // Get selected transactions with category overrides applied
      const selectedIndices = Object.keys(selectedTransactions)
        .filter(index => selectedTransactions[index])
        .map(index => parseInt(index));

      if (selectedIndices.length === 0) {
        Alert.alert(
          t('import.errors.noTransactions'),
          t('import.errors.noTransactionsMessage')
        );
        return;
      }

      // Confirm import
      Alert.alert(
        t('import.confirmImport'),
        t('import.confirmImportMessage', { count: selectedIndices.length }),
        [
          { text: t('import.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            onPress: async () => {
              setImporting(true);
              setImportProgress({ step: 'parsing', progress: 0 });

              // Filter transactions to only selected ones
              const transactionsToImport = previewData.transactions.filter(
                (_, index) => selectedTransactions[index]
              );

              // Apply category overrides
              const processedTransactions = transactionsToImport.map((transaction, originalIndex) => {
                const actualIndex = previewData.transactions.indexOf(transaction);
                const overrideCategory = categoryOverrides[actualIndex];

                if (overrideCategory) {
                  // Need to update the suggestion to use the override
                  const suggestion = previewData.categorySuggestions?.find(
                    s => s.transaction === transaction
                  );
                  if (suggestion) {
                    suggestion.suggestion.categoryKey = overrideCategory;
                  }
                }

                return transaction;
              });

              // Update config with processed data
              const importConfig = {
                ...config,
                // Override the preview data with our filtered set
                transactions: transactionsToImport,
              };

              try {
                const result = await importFromFile(
                  selectedFile.uri,
                  importConfig,
                  (progress) => setImportProgress(progress)
                );

                setImportResult(result);
                setShowSummary(true);
                setImporting(false);

                if (result.success) {
                  // Reset state
                  setTimeout(() => {
                    setSelectedFile(null);
                    setPreviewData(null);
                    setSelectedTransactions({});
                    setCategoryOverrides({});
                  }, 500);
                }
              } catch (error) {
                console.error('Import error:', error);
                Alert.alert(t('import.errors.importFailed'), error.message);
                setImporting(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error during import:', error);
      Alert.alert(
        t('import.errors.importError'),
        t('import.errors.importErrorMessage')
      );
      setImporting(false);
    }
  };

  // Handle summary close
  const handleCloseSummary = () => {
    setShowSummary(false);
    setImportResult(null);
  };

  // Handle view expenses
  const handleViewExpenses = () => {
    setShowSummary(false);
    navigation.navigate('Home');
  };

  // Render different states
  if (showSummary && importResult) {
    return (
      <ScrollView style={styles.container}>
        <ImportSummary
          result={importResult}
          onClose={handleCloseSummary}
          onViewExpenses={handleViewExpenses}
        />
      </ScrollView>
    );
  }

  const selectedCount = Object.values(selectedTransactions).filter(Boolean).length;

  return (
    <View style={styles.container}>
      {!previewData ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <Card style={styles.headerCard}>
            <Card.Content>
              <Text style={styles.title}>{t('import.title')}</Text>
              <Text style={styles.subtitle}>
                {t('import.subtitle')}
              </Text>
            </Card.Content>
          </Card>

          {/* File picker */}
          <View style={styles.section}>
            <FilePickerButton
              onFileSelected={handleFileSelected}
              loading={isLoading}
            />

            {selectedFile && !isLoading && (
              <Card style={styles.fileInfoCard}>
                <Card.Content>
                  <Text style={styles.fileName}>{t('import.fileInfo', { fileName: selectedFile.name })}</Text>
                  <Text style={styles.fileDetails}>
                    {t('import.fileDetails', {
                      type: selectedFile.type.toUpperCase(),
                      size: Math.round(selectedFile.size / 1024)
                    })}
                  </Text>
                </Card.Content>
              </Card>
            )}
          </View>

          {/* Config panel */}
          {selectedFile && !isLoading && (
            <ImportConfigPanel
              config={config}
              onConfigChange={setConfig}
              currentUser={user}
              partner={{ partnerId, partnerName }}
            />
          )}

          {/* Instructions */}
          <Card style={styles.instructionsCard}>
            <Card.Content>
              <Text style={styles.instructionsTitle}>{t('import.howItWorks')}</Text>
              <Text style={styles.instruction}>{t('import.step1')}</Text>
              <Text style={styles.instruction}>{t('import.step2')}</Text>
              <Text style={styles.instruction}>{t('import.step3')}</Text>
              <Text style={styles.instruction}>{t('import.step4')}</Text>
            </Card.Content>
          </Card>
        </ScrollView>
      ) : (
        <View style={styles.previewContainer}>
          {/* Transaction preview list */}
          <TransactionPreviewList
            transactions={previewData.transactions}
            suggestions={previewData.categorySuggestions}
            duplicateResults={previewData.duplicateResults}
            selectedTransactions={selectedTransactions}
            categoryOverrides={categoryOverrides}
            onToggleTransaction={handleToggleTransaction}
            onCategoryChange={handleCategoryChange}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
          />

          {/* Action buttons */}
          <View style={styles.actionBar}>
            <Button
              mode="outlined"
              onPress={() => {
                setPreviewData(null);
                setSelectedFile(null);
                setSelectedTransactions({});
                setCategoryOverrides({});
              }}
              style={styles.cancelButton}
            >
              {t('import.cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={() => {
                console.log('Import button pressed', { selectedCount });
                handleImport();
              }}
              disabled={selectedCount === 0}
              style={styles.importButton}
              loading={importing}
            >
              {t('import.importButton', { count: selectedCount })}
            </Button>
          </View>
        </View>
      )}

      {/* Import progress modal */}
      <ImportProgressModal
        visible={importing}
        progress={importProgress}
        onDismiss={() => {}}
      />

      {/* Debug panel */}
      <DebugPanel
        visible={showDebugPanel}
        onDismiss={() => setShowDebugPanel(false)}
        userId={user?.uid}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  section: {
    margin: 16,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  fileInfoCard: {
    marginTop: 12,
    backgroundColor: theme.colors.primary + '10',
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  fileDetails: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  instructionsCard: {
    margin: 16,
    backgroundColor: '#F5F5F5',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  instruction: {
    fontSize: 14,
    marginBottom: 8,
    color: theme.colors.text,
  },
  previewContainer: {
    flex: 1,
  },
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    elevation: 4,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  importButton: {
    flex: 2,
    marginLeft: 8,
  },
});
