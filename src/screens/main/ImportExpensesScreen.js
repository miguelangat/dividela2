import React, { useState, useLayoutEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Platform, Modal, ActivityIndicator } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS } from '../../constants/theme';
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
  const { user, userDetails } = useAuth();

  // Extract partner info from userDetails
  const partnerId = userDetails?.partnerId;
  const coupleId = userDetails?.coupleId;
  const partnerName = userDetails?.partnerName;

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
          style={{ marginRight: SPACING.base }}
        >
          <Ionicons name="settings-outline" size={24} color={COLORS.primary} />
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

      // Preview the import - pass file object so previewImport can access fileType
      const result = await previewImport(file.uri, config, file);

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

      console.log('Selected indices:', selectedIndices.length);

      if (selectedIndices.length === 0) {
        Alert.alert(
          t('import.errors.noTransactions'),
          t('import.errors.noTransactionsMessage')
        );
        return;
      }

      // Confirm import
      console.log('Showing confirmation dialog for', selectedIndices.length, 'transactions');

      // Use window.confirm on web for better compatibility
      const confirmMessage = `${t('import.confirmImport')}\n\n${t('import.confirmImportMessage', { count: selectedIndices.length })}`;

      const confirmed = Platform.OS === 'web'
        ? window.confirm(confirmMessage)
        : await new Promise(resolve => {
            Alert.alert(
              t('import.confirmImport'),
              t('import.confirmImportMessage', { count: selectedIndices.length }),
              [
                { text: t('import.cancel'), style: 'cancel', onPress: () => resolve(false) },
                { text: t('common.confirm'), onPress: () => resolve(true) },
              ]
            );
          });

      if (!confirmed) {
        console.log('Import cancelled by user');
        return;
      }

      console.log('Import confirmed, starting import process...');
      setImporting(true);
      setImportProgress({ step: 'parsing', progress: 0 });

      // Filter transactions to only selected ones
      const transactionsToImport = previewData.transactions.filter(
        (_, index) => selectedTransactions[index]
      );

      console.log('Transactions to import:', transactionsToImport.length);

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

      console.log('Calling importFromFile with config:', { ...importConfig, transactions: `${transactionsToImport.length} transactions` });

      try {
        const result = await importFromFile(
          selectedFile.uri,
          importConfig,
          (progress) => {
            console.log('Import progress:', progress);
            setImportProgress(progress);
          },
          selectedFile  // Pass file info for type detection on blob URLs
        );

        console.log('Import completed:', result);
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
    // Navigate to the HomeTab within MainTabs
    navigation.navigate('MainTabs', { screen: 'HomeTab' });
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
          {/* Gradient Header */}
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientHeader}
          >
            <View style={styles.headerIconContainer}>
              <MaterialCommunityIcons name="file-import" size={60} color={COLORS.textWhite} />
            </View>
            <Text style={styles.headerTitle}>{t('import.title')}</Text>
            <Text style={styles.headerSubtitle}>
              {t('import.subtitle')}
            </Text>
          </LinearGradient>

          {/* Main Content Card */}
          <View style={styles.contentCard}>
            {/* File picker */}
            <View style={styles.section}>
              <FilePickerButton
                onFileSelected={handleFileSelected}
                loading={isLoading}
              />

              {selectedFile && !isLoading && (
                <Card style={styles.fileInfoCard}>
                  <Card.Content>
                    <View style={styles.fileInfoContent}>
                      <MaterialCommunityIcons
                        name={selectedFile.type === 'csv' ? 'file-table' : 'file-pdf-box'}
                        size={24}
                        color={COLORS.primary}
                      />
                      <View style={styles.fileTextContainer}>
                        <Text style={styles.fileName}>{selectedFile.name}</Text>
                        <Text style={styles.fileDetails}>
                          {selectedFile.type.toUpperCase()} • {Math.round(selectedFile.size / 1024)} KB
                        </Text>
                      </View>
                    </View>
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
                <View style={styles.instructionsHeader}>
                  <MaterialCommunityIcons name="information" size={24} color={COLORS.primary} />
                  <Text style={styles.instructionsTitle}>{t('import.howItWorks')}</Text>
                </View>
                <View style={styles.instructionItem}>
                  <MaterialCommunityIcons name="numeric-1-circle" size={20} color={COLORS.primary} />
                  <Text style={styles.instruction}>{t('import.step1')}</Text>
                </View>
                <View style={styles.instructionItem}>
                  <MaterialCommunityIcons name="numeric-2-circle" size={20} color={COLORS.primary} />
                  <Text style={styles.instruction}>{t('import.step2')}</Text>
                </View>
                <View style={styles.instructionItem}>
                  <MaterialCommunityIcons name="numeric-3-circle" size={20} color={COLORS.primary} />
                  <Text style={styles.instruction}>{t('import.step3')}</Text>
                </View>
                <View style={styles.instructionItem}>
                  <MaterialCommunityIcons name="numeric-4-circle" size={20} color={COLORS.primary} />
                  <Text style={styles.instruction}>{t('import.step4')}</Text>
                </View>
              </Card.Content>
            </Card>
          </View>
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
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setPreviewData(null);
                setSelectedFile(null);
                setSelectedTransactions({});
                setCategoryOverrides({});
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>{t('import.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.importButtonContainer, selectedCount === 0 && styles.importButtonDisabled]}
              onPress={() => {
                if (selectedCount > 0 && !importing) {
                  console.log('Import button pressed', { selectedCount });
                  handleImport();
                }
              }}
              activeOpacity={0.8}
              disabled={selectedCount === 0 || importing}
            >
              <LinearGradient
                colors={selectedCount === 0 ? [COLORS.textTertiary, COLORS.textTertiary] : [COLORS.gradientStart, COLORS.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.importButtonGradient}
              >
                {importing ? (
                  <Text style={styles.importButtonText}>{t('import.importing')}</Text>
                ) : (
                  <View style={styles.importButtonContent}>
                    <MaterialCommunityIcons name="upload" size={20} color={COLORS.textWhite} />
                    <Text style={styles.importButtonText}>
                      {t('import.importButton', { count: selectedCount })}
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* File reading loading modal */}
      <Modal
        visible={isLoading}
        transparent
        animationType="fade"
      >
        <View style={styles.loadingModalOverlay}>
          <View style={styles.loadingModalContent}>
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.loadingModalGradient}
            >
              <View style={styles.loadingIconContainer}>
                <MaterialCommunityIcons name="file-document-outline" size={60} color={COLORS.textWhite} />
              </View>
              <ActivityIndicator size="large" color={COLORS.textWhite} style={styles.loadingSpinner} />
              <Text style={styles.loadingTitle}>{t('import.readingFile', 'Reading File')}</Text>
              <Text style={styles.loadingSubtitle}>
                {t('import.analyzingTransactions', 'Analyzing transactions...')}
              </Text>
            </LinearGradient>
          </View>
        </View>
      </Modal>

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
    backgroundColor: COLORS.backgroundSecondary,
  },
  scrollContent: {
    paddingBottom: SPACING.xxlarge,
  },
  // Gradient Header Styles
  gradientHeader: {
    paddingTop: SPACING.xlarge,
    paddingBottom: SPACING.xxlarge * 2,
    paddingHorizontal: SPACING.screenPadding,
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: SPACING.base,
    ...SHADOWS.large,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xlarge,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textWhite,
    marginBottom: SPACING.small,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textWhite,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 22,
    opacity: 0.95,
  },
  // Content Card
  contentCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.xlarge,
    marginHorizontal: SPACING.screenPadding,
    marginTop: -SPACING.xxlarge,
    padding: SPACING.base,
    ...SHADOWS.large,
  },
  section: {
    marginBottom: SPACING.base,
  },
  // File Info Card
  fileInfoCard: {
    marginTop: SPACING.medium,
    backgroundColor: COLORS.primary + '08',
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
    ...SHADOWS.small,
  },
  fileInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileTextContainer: {
    flex: 1,
    marginLeft: SPACING.medium,
  },
  fileName: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    marginBottom: SPACING.tiny,
  },
  fileDetails: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
  },
  // Instructions Card
  instructionsCard: {
    marginTop: SPACING.base,
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.base,
  },
  instructionsTitle: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginLeft: SPACING.small,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.small,
  },
  instruction: {
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
    marginLeft: SPACING.small,
    flex: 1,
    lineHeight: 20,
  },
  // Preview Container
  previewContainer: {
    flex: 1,
  },
  // Action Bar
  actionBar: {
    flexDirection: 'row',
    padding: SPACING.base,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOWS.medium,
  },
  cancelButton: {
    flex: 1,
    marginRight: SPACING.small,
    paddingVertical: SPACING.buttonPadding,
    paddingHorizontal: SPACING.base,
    borderRadius: SIZES.borderRadius.medium,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: SIZES.button.height,
  },
  cancelButtonText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
  },
  importButtonContainer: {
    flex: 2,
    marginLeft: SPACING.small,
    borderRadius: SIZES.borderRadius.medium,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  importButtonDisabled: {
    opacity: 0.6,
  },
  importButtonGradient: {
    paddingVertical: SPACING.buttonPadding,
    paddingHorizontal: SPACING.base,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: SIZES.button.height,
  },
  importButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
  },
  importButtonText: {
    color: COLORS.textWhite,
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.bold,
    marginLeft: SPACING.small,
  },
  // Loading Modal Styles
  loadingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingModalContent: {
    width: 300,
    borderRadius: SIZES.borderRadius.xlarge,
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  loadingModalGradient: {
    padding: SPACING.xxlarge,
    alignItems: 'center',
  },
  loadingIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: SPACING.large,
  },
  loadingSpinner: {
    marginVertical: SPACING.base,
  },
  loadingTitle: {
    fontSize: FONTS.sizes.heading,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textWhite,
    textAlign: 'center',
    marginBottom: SPACING.small,
  },
  loadingSubtitle: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textWhite,
    textAlign: 'center',
    opacity: 0.9,
  },
});
