/**
 * AddExpenseScreen.js
 *
 * Screen for adding new shared expenses with:
 * - Amount input
 * - Description field
 * - Category selection
 * - "Paid by" selector
 * - Split options (50/50 or custom)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useBudget } from '../../contexts/BudgetContext';
import { COLORS, FONTS, SPACING, COMMON_STYLES } from '../../constants/theme';
import { calculateEqualSplit, calculateSplit, roundCurrency } from '../../utils/calculations';
import * as expenseService from '../../services/expenseService';
import { scanReceiptInBackground, subscribeToOCRResults, recordOCRFeedback } from '../../services/ocrService';
import { createMerchantAlias } from '../../services/merchantAliasService';
import { parseReceiptPDF, isPDF } from '../../utils/receiptPdfParser';
import { convertPDFPageToImage, validatePDFSize } from '../../utils/pdfToImage';
import OCRSuggestionCard from '../../components/OCRSuggestionCard';
import OCRProcessingBanner from '../../components/OCRProcessingBanner';

export default function AddExpenseScreen({ navigation, route }) {
  const { user, userDetails } = useAuth();
  const { categories: budgetCategories, budgetProgress, isBudgetEnabled } = useBudget();

  // Check if we're editing an existing expense
  const editingExpense = route.params?.expense;
  const isEditMode = !!editingExpense;

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('food');
  const [paidBy, setPaidBy] = useState(user.uid); // Who paid
  const [splitType, setSplitType] = useState('equal'); // 'equal' or 'custom'
  const [userSplitPercentage, setUserSplitPercentage] = useState('50');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // OCR state
  const [ocrState, setOcrState] = useState({
    status: 'idle', // idle | uploading | processing | ready | failed
    expenseId: null,
    receiptUrl: null,
    suggestions: null,
    error: null,
  });

  // Pre-populate form when editing
  useEffect(() => {
    if (editingExpense) {
      setAmount(editingExpense.amount.toString());
      setDescription(editingExpense.description);
      setSelectedCategory(editingExpense.categoryKey || editingExpense.category || 'food');
      setPaidBy(editingExpense.paidBy);

      // Determine split type from split details
      const userPercentage = editingExpense.splitDetails?.user1Percentage || 50;
      if (userPercentage === 50) {
        setSplitType('equal');
      } else {
        setSplitType('custom');
        setUserSplitPercentage(userPercentage.toString());
      }
    }
  }, [editingExpense]);

  const handleAmountChange = (text) => {
    // Only allow numbers and one decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setAmount(cleaned);
    setError('');
  };

  const handleSplitPercentageChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned === '') {
      setUserSplitPercentage('');
      return;
    }
    const num = parseInt(cleaned);
    if (num > 100) return;
    setUserSplitPercentage(String(num));
  };

  // OCR Handlers
  const handleScanReceipt = async () => {
    try {
      console.log('=== SCAN RECEIPT BUTTON TAPPED ===');
      console.log('Current OCR state:', ocrState.status);

      // Show option: Camera or File
      Alert.alert(
        'Scan Receipt',
        'How would you like to add your receipt?',
        [
          {
            text: 'Take Photo',
            onPress: handleCameraCapture,
          },
          {
            text: 'Choose File',
            onPress: handleFileSelection,
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('ERROR in handleScanReceipt:', error);
      Alert.alert('Error', `Failed to show receipt options: ${error.message}`);
    }
  };

  const handleCameraCapture = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera permission is required to scan receipts. Please enable it in your device settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled) {
        return;
      }

      const imageUri = result.assets[0].uri;
      await processImageReceipt(imageUri);
    } catch (err) {
      console.error('Error capturing photo:', err);
      setOcrState({
        status: 'failed',
        expenseId: null,
        receiptUrl: null,
        suggestions: null,
        error: err.message || 'Failed to capture photo',
      });
    }
  };

  const handleFileSelection = async () => {
    try {
      // Use DocumentPicker to allow PDF and image files
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || result.type === 'cancel') {
        return;
      }

      const fileUri = result.assets?.[0]?.uri || result.uri;
      const fileName = result.assets?.[0]?.name || result.name || '';
      const mimeType = result.assets?.[0]?.mimeType || result.mimeType || '';

      // Detect file type
      const isPdfFile = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');

      if (isPdfFile) {
        await processPDFReceipt(fileUri);
      } else {
        await processImageReceipt(fileUri);
      }
    } catch (err) {
      console.error('Error selecting file:', err);
      setOcrState({
        status: 'failed',
        expenseId: null,
        receiptUrl: null,
        suggestions: null,
        error: err.message || 'Failed to select file',
      });
    }
  };

  const processImageReceipt = async (imageUri) => {
    try {
      // Start background processing
      setOcrState({
        status: 'uploading',
        expenseId: null,
        receiptUrl: null,
        suggestions: null,
        error: null,
      });
      setError('');

      // Upload and create pending expense
      const { expenseId, receiptUrl } = await scanReceiptInBackground(
        imageUri,
        userDetails.coupleId,
        user.uid,
        (progress) => {
          console.log('Upload progress:', progress);
        }
      );

      // Update state to processing
      setOcrState({
        status: 'processing',
        expenseId,
        receiptUrl,
        suggestions: null,
        error: null,
      });
    } catch (err) {
      console.error('Error processing image receipt:', err);
      throw err;
    }
  };

  const processPDFReceipt = async (pdfUri) => {
    try {
      setOcrState({
        status: 'processing',
        expenseId: null,
        receiptUrl: null,
        suggestions: null,
        error: null,
      });
      setError('');

      // Read PDF file
      const pdfData = await FileSystem.readAsStringAsync(pdfUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const pdfBuffer = Buffer.from(pdfData, 'base64');

      // Validate file size
      try {
        validatePDFSize(pdfBuffer);
      } catch (sizeError) {
        throw new Error(sizeError.message);
      }

      // Try text extraction first
      const parseResult = await parseReceiptPDF(pdfBuffer);

      if (parseResult.requiresOCR) {
        // PDF is scanned or low confidence - convert to image and use OCR
        try {
          if (Platform.OS !== 'web') {
            throw new Error(
              'PDF receipt scanning is currently only supported on the web app. ' +
              'Please use the web app or take a photo of the receipt instead.'
            );
          }

          // Convert PDF to image
          const imageData = await convertPDFPageToImage(pdfBuffer, 1);

          // Process as image
          await processImageReceipt(imageData.uri);
        } catch (conversionError) {
          throw new Error(
            `Could not process PDF: ${conversionError.message}. ` +
            'Try taking a photo of the receipt instead.'
          );
        }
      } else {
        // Text-based PDF - use extracted data directly
        const { receipt } = parseResult;

        // Use extracted text directly
        setOcrState({
          status: 'ready',
          expenseId: null,
          receiptUrl: null,
          suggestions: {
            merchant: receipt.merchant,
            amount: receipt.amount,
            date: receipt.date,
            category: receipt.vendorType ? { category: receipt.vendorType } : null,
            confidence: receipt.confidence,
            source: 'pdf-text-extraction',
          },
          error: null,
        });

        // Show success message
        Alert.alert(
          'PDF Processed',
          'Receipt information extracted from PDF. Please review and edit as needed.',
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      console.error('Error processing PDF receipt:', err);
      setOcrState({
        status: 'failed',
        expenseId: null,
        receiptUrl: null,
        suggestions: null,
        error: err.message || 'Failed to process PDF receipt',
      });
    }
  };

  const handleAcceptSuggestions = (suggestions) => {
    // Pre-fill form fields
    if (suggestions.amount) {
      setAmount(suggestions.amount.toString());
    }
    if (suggestions.merchant) {
      setDescription(suggestions.merchant);
    }
    if (suggestions.category?.category) {
      setSelectedCategory(suggestions.category.category.toLowerCase());
    }

    // Clear OCR state
    setOcrState({
      status: 'idle',
      expenseId: null,
      receiptUrl: null,
      suggestions: null,
      error: null,
    });
  };

  const handleDismissSuggestions = () => {
    setOcrState({
      status: 'idle',
      expenseId: null,
      receiptUrl: null,
      suggestions: null,
      error: null,
    });
  };

  const handleCreateAlias = async (ocrMerchant, userAlias) => {
    try {
      await createMerchantAlias(ocrMerchant, userAlias, userDetails.coupleId);
      Alert.alert('Success', 'Merchant alias created successfully');
    } catch (err) {
      console.error('Error creating alias:', err);
      Alert.alert('Error', err.message || 'Failed to create merchant alias');
    }
  };

  // Subscribe to OCR results with proper cleanup
  useEffect(() => {
    if (!ocrState.expenseId || ocrState.status !== 'processing') {
      return;
    }

    let isActive = true;

    const unsubscribe = subscribeToOCRResults(ocrState.expenseId, (result) => {
      if (!isActive) return; // Don't update if unmounted

      if (result.status === 'completed') {
        setOcrState((prev) => ({
          ...prev,
          status: 'ready',
          suggestions: result.data,
          error: null,
        }));
      } else if (result.status === 'failed') {
        setOcrState((prev) => ({
          ...prev,
          status: 'failed',
          error: result.error || 'OCR processing failed',
        }));
      }
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [ocrState.expenseId, ocrState.status]);

  const handleSubmit = async () => {
    // Validation
    if (!amount || parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) {
      setError('Please enter a valid amount');
      return;
    }

    if (!description.trim()) {
      setError('Please enter a description');
      return;
    }

    // Critical null checks
    if (!user || !user.uid) {
      setError('Authentication error. Please sign in again.');
      return;
    }

    if (!userDetails || !userDetails.coupleId) {
      setError('You must be paired with a partner to add expenses.');
      return;
    }

    if (!userDetails.partnerId) {
      setError('Partner information missing. Please reconnect with your partner.');
      return;
    }

    if (!paidBy) {
      setError('Please select who paid for this expense.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const expenseAmount = parseFloat(amount);

      // Additional validation: ensure amount is reasonable
      if (expenseAmount > 1000000) {
        setError('Amount seems too large. Please check and try again.');
        setLoading(false);
        return;
      }

      // Calculate split
      let splitDetails;
      if (splitType === 'equal') {
        splitDetails = calculateEqualSplit(expenseAmount);
      } else {
        const parsedPercentage = parseInt(userSplitPercentage);
        const userPercentage = !isNaN(parsedPercentage) ? parsedPercentage : 50;
        const partnerPercentage = 100 - userPercentage;
        splitDetails = calculateSplit(expenseAmount, userPercentage, partnerPercentage);
      }

      if (isEditMode) {
        // Update existing expense
        const updates = {
          amount: expenseAmount,
          description: description.trim(),
          category: selectedCategory,
          categoryKey: selectedCategory,
          paidBy: paidBy,
          splitDetails: {
            user1Amount: roundCurrency(paidBy === user.uid ? splitDetails.user1Amount : splitDetails.user2Amount),
            user2Amount: roundCurrency(paidBy === user.uid ? splitDetails.user2Amount : splitDetails.user1Amount),
            user1Percentage: paidBy === user.uid ? splitDetails.user1Percentage : splitDetails.user2Percentage,
            user2Percentage: paidBy === user.uid ? splitDetails.user2Percentage : splitDetails.user1Percentage,
          },
        };

        console.log('Updating expense:', editingExpense.id, updates);
        await expenseService.updateExpense(editingExpense.id, updates);

        console.log('✓ Expense updated successfully');
      } else {
        // Create new expense
        const expenseData = {
          amount: expenseAmount,
          description: description.trim(),
          category: selectedCategory, // Legacy field for backward compatibility
          categoryKey: selectedCategory, // New field for budget tracking
          paidBy: paidBy,
          coupleId: userDetails.coupleId,
          date: new Date().toISOString(),
          splitDetails: {
            user1Amount: roundCurrency(paidBy === user.uid ? splitDetails.user1Amount : splitDetails.user2Amount),
            user2Amount: roundCurrency(paidBy === user.uid ? splitDetails.user2Amount : splitDetails.user1Amount),
            user1Percentage: paidBy === user.uid ? splitDetails.user1Percentage : splitDetails.user2Percentage,
            user2Percentage: paidBy === user.uid ? splitDetails.user2Percentage : splitDetails.user1Percentage,
          },
        };

        console.log('Creating expense:', expenseData);
        await expenseService.addExpense(expenseData);

        console.log('✓ Expense created successfully');
      }

      // Record OCR feedback if suggestions were used
      if (ocrState.suggestions && !isEditMode) {
        try {
          await recordOCRFeedback(
            ocrState.suggestions,
            {
              amount: expenseAmount,
              description: description.trim(),
              category: selectedCategory,
            },
            userDetails.coupleId
          );
          console.log('✓ OCR feedback recorded');
        } catch (feedbackErr) {
          console.error('Error recording OCR feedback:', feedbackErr);
          // Don't fail the expense creation if feedback recording fails
        }
      }

      // Update couple's lastActivity
      await updateDoc(doc(db, 'couples', userDetails.coupleId), {
        lastActivity: serverTimestamp(),
      });

      // Navigate back to home
      navigation.goBack();
    } catch (err) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} expense:`, err);
      setError(err.message || `Failed to ${isEditMode ? 'update' : 'create'} expense. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const parsedUserPercentage = parseInt(userSplitPercentage);
  const partnerPercentage = splitType === 'custom'
    ? (100 - (!isNaN(parsedUserPercentage) ? parsedUserPercentage : 0))
    : 50;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'web' ? undefined : Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditMode ? 'Edit Expense' : 'Add Expense'}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* OCR Section - Only show in add mode */}
        {!isEditMode && (
          <>
            {/* Scan Receipt Button */}
            <TouchableOpacity
              style={styles.scanButton}
              onPress={handleScanReceipt}
              testID="scan-receipt-button"
              disabled={ocrState.status === 'uploading' || ocrState.status === 'processing'}
            >
              <Ionicons name="camera" size={24} color={COLORS.primary} />
              <Text style={styles.scanButtonText}>Scan Receipt</Text>
            </TouchableOpacity>

            {/* OCR Processing Banner */}
            {(ocrState.status === 'uploading' || ocrState.status === 'processing') && (
              <OCRProcessingBanner
                receiptUrl={ocrState.receiptUrl}
                status={ocrState.status}
                style={styles.ocrBanner}
              />
            )}

            {/* OCR Suggestion Card */}
            {ocrState.status === 'ready' && ocrState.suggestions && (
              <OCRSuggestionCard
                receiptUrl={ocrState.receiptUrl}
                suggestions={ocrState.suggestions}
                onAccept={handleAcceptSuggestions}
                onDismiss={handleDismissSuggestions}
                onCreateAlias={handleCreateAlias}
                style={styles.ocrSuggestion}
              />
            )}

            {/* OCR Error Banner */}
            {ocrState.status === 'failed' && ocrState.error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={COLORS.error} />
                <Text style={styles.errorText}>{ocrState.error}</Text>
              </View>
            )}

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
          </>
        )}

        {/* Amount Input */}
        <View style={styles.amountSection}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={handleAmountChange}
            placeholder="0.00"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="decimal-pad"
            autoFocus
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Description</Text>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            placeholder="What did you pay for?"
            placeholderTextColor={COLORS.textSecondary}
            maxLength={100}
          />
        </View>

        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.categoriesGrid}>
            {Object.entries(budgetCategories).map(([key, category]) => {
              const progress = budgetProgress?.categoryProgress[key];
              const nearBudget = progress && progress.percentage >= 80;
              const overBudget = progress && progress.percentage >= 100;

              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.categoryButton,
                    selectedCategory === key && styles.categoryButtonSelected,
                    selectedCategory === key && { backgroundColor: COLORS.primary + '20' },
                  ]}
                  onPress={() => setSelectedCategory(key)}
                  testID={`category-button-${key}`}
                >
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  {isBudgetEnabled && nearBudget && (
                    <Text style={[styles.budgetWarning, overBudget && styles.budgetWarningOver]}>
                      {overBudget ? '!' : '⚠'}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Paid By */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Paid by</Text>
          <View style={styles.paidByContainer}>
            <TouchableOpacity
              style={[
                styles.paidByButton,
                paidBy === user.uid && styles.paidByButtonSelected,
              ]}
              onPress={() => setPaidBy(user.uid)}
            >
              <Text style={[
                styles.paidByText,
                paidBy === user.uid && styles.paidByTextSelected,
              ]}>
                You
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.paidByButton,
                paidBy === userDetails.partnerId && styles.paidByButtonSelected,
              ]}
              onPress={() => setPaidBy(userDetails.partnerId)}
            >
              <Text style={[
                styles.paidByText,
                paidBy === userDetails.partnerId && styles.paidByTextSelected,
              ]}>
                Partner
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Split Options */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Split</Text>
          <View style={styles.splitTypeContainer}>
            <TouchableOpacity
              style={[
                styles.splitTypeButton,
                splitType === 'equal' && styles.splitTypeButtonSelected,
              ]}
              onPress={() => setSplitType('equal')}
            >
              <Text style={[
                styles.splitTypeText,
                splitType === 'equal' && styles.splitTypeTextSelected,
              ]}>
                50/50
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.splitTypeButton,
                splitType === 'custom' && styles.splitTypeButtonSelected,
              ]}
              onPress={() => setSplitType('custom')}
            >
              <Text style={[
                styles.splitTypeText,
                splitType === 'custom' && styles.splitTypeTextSelected,
              ]}>
                Custom
              </Text>
            </TouchableOpacity>
          </View>

          {splitType === 'custom' && (
            <View style={styles.customSplitContainer}>
              <View style={styles.splitInputRow}>
                <Text style={styles.splitLabel}>Your share:</Text>
                <View style={styles.splitInputContainer}>
                  <TextInput
                    style={styles.splitInput}
                    value={userSplitPercentage}
                    onChangeText={handleSplitPercentageChange}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                  <Text style={styles.splitPercentSymbol}>%</Text>
                </View>
              </View>
              <View style={styles.splitInputRow}>
                <Text style={styles.splitLabel}>Partner's share:</Text>
                <Text style={styles.splitValue}>{partnerPercentage}%</Text>
              </View>
            </View>
          )}
        </View>

        {/* Error Message */}
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            COMMON_STYLES.primaryButton,
            loading && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <Text style={COMMON_STYLES.primaryButtonText}>
              {isEditMode ? 'Save Changes' : 'Add Expense'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.screenPadding,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40,
    marginBottom: SPACING.large,
  },
  backButton: {
    padding: SPACING.small,
  },
  headerTitle: {
    ...FONTS.heading,
    fontSize: 20,
    color: COLORS.text,
  },
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  currencySymbol: {
    ...FONTS.heading,
    fontSize: 48,
    color: COLORS.textSecondary,
    marginRight: SPACING.small,
  },
  amountInput: {
    ...FONTS.heading,
    fontSize: 48,
    color: COLORS.text,
    fontWeight: 'bold',
    minWidth: 120,
    textAlign: 'left',
  },
  section: {
    marginBottom: SPACING.large,
  },
  sectionLabel: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.base,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  descriptionInput: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: SPACING.base,
    ...FONTS.body,
    color: COLORS.text,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.base,
  },
  categoryButton: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.small,
  },
  categoryButtonSelected: {
    borderWidth: 2,
  },
  categoryIcon: {
    fontSize: 32,
    marginBottom: SPACING.small,
  },
  categoryName: {
    ...FONTS.small,
    color: COLORS.text,
    textAlign: 'center',
  },
  budgetWarning: {
    position: 'absolute',
    top: 4,
    right: 4,
    fontSize: 16,
  },
  budgetWarningOver: {
    fontSize: 18,
  },
  paidByContainer: {
    flexDirection: 'row',
    gap: SPACING.base,
  },
  paidByButton: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: SPACING.base,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paidByButtonSelected: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  paidByText: {
    ...FONTS.body,
    color: COLORS.text,
  },
  paidByTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  splitTypeContainer: {
    flexDirection: 'row',
    gap: SPACING.base,
    marginBottom: SPACING.base,
  },
  splitTypeButton: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: SPACING.base,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  splitTypeButtonSelected: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  splitTypeText: {
    ...FONTS.body,
    color: COLORS.text,
  },
  splitTypeTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  customSplitContainer: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: SPACING.base,
    gap: SPACING.base,
  },
  splitInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  splitLabel: {
    ...FONTS.body,
    color: COLORS.text,
  },
  splitInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: SPACING.base,
  },
  splitInput: {
    ...FONTS.body,
    color: COLORS.text,
    padding: SPACING.small,
    width: 60,
    textAlign: 'right',
  },
  splitPercentSymbol: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginLeft: SPACING.tiny,
  },
  splitValue: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorLight,
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.base,
    borderRadius: 8,
    marginBottom: SPACING.base,
    gap: SPACING.small,
  },
  errorText: {
    ...FONTS.body,
    color: COLORS.error,
    flex: 1,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  // OCR Styles
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '15',
    borderRadius: 12,
    padding: SPACING.base,
    marginBottom: SPACING.base,
    borderWidth: 2,
    borderColor: COLORS.primary + '30',
    gap: SPACING.small,
  },
  scanButtonText: {
    ...FONTS.body,
    color: COLORS.primary,
    fontWeight: '600',
  },
  ocrBanner: {
    marginBottom: SPACING.base,
  },
  ocrSuggestion: {
    marginBottom: SPACING.base,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.large,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginHorizontal: SPACING.base,
    textTransform: 'uppercase',
    fontSize: 12,
  },
});
