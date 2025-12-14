/**
 * ExpenseDetailModal.js
 *
 * Modal component for displaying detailed expense information
 * Shows full expense details, split breakdown, and settlement status
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { useBudget } from '../contexts/BudgetContext';
import { formatCurrency, formatDate } from '../utils/calculations';
import * as expenseService from '../services/expenseService';

export default function ExpenseDetailModal({
  visible,
  expense,
  userDetails,
  partnerDetails,
  onClose,
  onEdit,
  onDelete,
}) {
  const { t } = useTranslation();
  const { categories } = useBudget();
  const [deleting, setDeleting] = useState(false);

  if (!expense) return null;

  const categoryKey = expense.category || expense.categoryKey || 'other';
  const categoryIcon = categories[categoryKey]?.icon || '💡';
  const categoryColor = COLORS.primary;
  const categoryName = categories[categoryKey]?.name || 'Other';

  const isPaidByUser = expense.paidBy === userDetails?.uid;
  const paidByName = isPaidByUser
    ? userDetails?.displayName || 'You'
    : partnerDetails?.displayName || 'Partner';

  const isSettled = !!expense.settledAt;
  const settledDate = isSettled && expense.settledAt?.toDate
    ? expense.settledAt.toDate()
    : null;

  const user1Share = expense.splitDetails?.user1Amount || expense.amount / 2;
  const user2Share = expense.splitDetails?.user2Amount || expense.amount / 2;
  const userShare = isPaidByUser ? user1Share : user2Share;
  const partnerShare = isPaidByUser ? user2Share : user1Share;

  const user1Percentage = expense.splitDetails?.user1Percentage || 50;
  const user2Percentage = expense.splitDetails?.user2Percentage || 50;
  const userPercentage = isPaidByUser ? user1Percentage : user2Percentage;
  const partnerPercentage = isPaidByUser ? user2Percentage : user1Percentage;

  // Check permissions
  const canEdit = expenseService.canEditExpense(expense, userDetails?.uid);
  const deleteCheck = expenseService.canDeleteExpense(expense, userDetails?.uid, userDetails?.coupleId);
  const canDelete = deleteCheck.canDelete;

  const handleEdit = () => {
    if (onEdit) {
      onEdit(expense);
      onClose();
    }
  };

  const handleDelete = async () => {
    const warningMessage = deleteCheck.isSettled
      ? t('components.expenseDetail.deleteWarningSettled')
      : t('components.expenseDetail.deleteWarning');

    // Use window.confirm on web for better compatibility
    const confirmed = Platform.OS === 'web'
      ? window.confirm(`${t('components.expenseDetail.deleteTitle')}\n\n${warningMessage}`)
      : await new Promise(resolve => {
          Alert.alert(
            t('components.expenseDetail.deleteTitle'),
            warningMessage,
            [
              { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
              { text: t('common.delete'), style: 'destructive', onPress: () => resolve(true) },
            ],
            { cancelable: true }
          );
        });

    if (!confirmed) return;

    try {
      setDeleting(true);
      await expenseService.deleteExpense(expense.id);
      if (onDelete) {
        onDelete(expense.id);
      }
      onClose();
    } catch (error) {
      Alert.alert(t('common.error'), error.message || t('components.expenseDetail.deleteError'));
      setDeleting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('components.expenseDetail.title')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            {/* Category Icon */}
            <View style={styles.categorySection}>
              <View
                style={[
                  styles.categoryIconLarge,
                  { backgroundColor: categoryColor + '20' },
                ]}
              >
                <Text style={styles.categoryEmojiLarge}>{categoryIcon}</Text>
              </View>
              <Text style={styles.categoryName}>{categoryName}</Text>
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('components.expenseDetail.description')}</Text>
              <Text style={styles.value}>{expense.description || t('components.expenseDetail.noDescription')}</Text>
            </View>

            {/* Amount */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('components.expenseDetail.totalAmount')}</Text>
              <Text style={styles.amountValue}>{formatCurrency(expense.amount)}</Text>
            </View>

            {/* Date */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('components.expenseDetail.date')}</Text>
              <Text style={styles.value}>
                {expense.date ? formatDate(expense.date) : t('components.expenseDetail.unknown')}
              </Text>
            </View>

            {/* Paid By */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('components.expenseDetail.paidBy')}</Text>
              <View style={styles.paidByContainer}>
                <Ionicons
                  name="person"
                  size={20}
                  color={isPaidByUser ? COLORS.primary : COLORS.success}
                />
                <Text style={styles.value}>{paidByName}</Text>
              </View>
            </View>

            {/* Split Breakdown */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('components.expenseDetail.splitBreakdown')}</Text>

              <View style={styles.splitRow}>
                <Text style={styles.splitLabel}>{t('components.expenseDetail.yourShare')}</Text>
                <View style={styles.splitValueContainer}>
                  <Text style={styles.splitValue}>{formatCurrency(userShare)}</Text>
                  <Text style={styles.splitPercentage}>({userPercentage}%)</Text>
                </View>
              </View>

              <View style={styles.splitRow}>
                <Text style={styles.splitLabel}>{t('components.expenseDetail.partnerShare', { partner: partnerDetails?.displayName || 'Partner' })}</Text>
                <View style={styles.splitValueContainer}>
                  <Text style={styles.splitValue}>{formatCurrency(partnerShare)}</Text>
                  <Text style={styles.splitPercentage}>({partnerPercentage}%)</Text>
                </View>
              </View>
            </View>

            {/* Settlement Status */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('components.expenseDetail.settlementStatus')}</Text>

              <View
                style={[
                  styles.statusBadge,
                  isSettled ? styles.statusBadgeSettled : styles.statusBadgePending,
                ]}
              >
                <Ionicons
                  name={isSettled ? 'checkmark-circle' : 'time-outline'}
                  size={20}
                  color={isSettled ? COLORS.success : COLORS.warning}
                />
                <Text
                  style={[
                    styles.statusText,
                    isSettled ? styles.statusTextSettled : styles.statusTextPending,
                  ]}
                >
                  {isSettled ? t('components.expenseDetail.settled') : t('components.expenseDetail.pending')}
                </Text>
              </View>

              {isSettled && settledDate && (
                <Text style={styles.settledDate}>
                  {t('components.expenseDetail.settledOn', { date: settledDate.toLocaleDateString() })}
                </Text>
              )}

              {isSettled && expense.settledBySettlementId && (
                <Text style={styles.settlementId}>
                  {t('components.expenseDetail.settlementId', { id: expense.settledBySettlementId.substring(0, 8) })}
                </Text>
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            {!isSettled && (canEdit || canDelete) && (
              <View style={styles.actionButtons}>
                {canEdit && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={handleEdit}
                    disabled={deleting}
                  >
                    <Ionicons name="pencil" size={20} color={COLORS.primary} />
                    <Text style={[styles.actionButtonText, styles.editButtonText]}>{t('components.expenseDetail.edit')}</Text>
                  </TouchableOpacity>
                )}
                {canDelete && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <ActivityIndicator size="small" color={COLORS.error} />
                    ) : (
                      <>
                        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                        <Text style={[styles.actionButtonText, styles.deleteButtonText]}>{t('components.expenseDetail.delete')}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
            {isSettled && (
              <View style={styles.settledWarning}>
                <Ionicons name="lock-closed" size={16} color={COLORS.textSecondary} />
                <Text style={styles.settledWarningText}>
                  {t('components.expenseDetail.settledWarning')}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.closeFooterButton} onPress={onClose}>
              <Text style={styles.closeFooterButtonText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.large,
    paddingVertical: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border || '#E5E5E5',
  },
  headerTitle: {
    ...FONTS.title,
    fontSize: 20,
    color: COLORS.text,
  },
  closeButton: {
    padding: SPACING.tiny,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.large,
  },
  categorySection: {
    alignItems: 'center',
    marginBottom: SPACING.large,
  },
  categoryIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.base,
  },
  categoryEmojiLarge: {
    fontSize: 40,
  },
  categoryName: {
    ...FONTS.title,
    color: COLORS.text,
  },
  section: {
    marginBottom: SPACING.large,
  },
  sectionTitle: {
    ...FONTS.title,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: SPACING.base,
  },
  label: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.tiny,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  value: {
    ...FONTS.body,
    fontSize: 18,
    color: COLORS.text,
  },
  amountValue: {
    ...FONTS.heading,
    fontSize: 32,
    color: COLORS.primary,
  },
  paidByContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.small,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border || '#E5E5E5',
  },
  splitLabel: {
    ...FONTS.body,
    color: COLORS.text,
  },
  splitValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
  },
  splitValue: {
    ...FONTS.body,
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  splitPercentage: {
    ...FONTS.small,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.base,
    borderRadius: 8,
    gap: SPACING.small,
    alignSelf: 'flex-start',
  },
  statusBadgeSettled: {
    backgroundColor: COLORS.successLight || COLORS.success + '20',
  },
  statusBadgePending: {
    backgroundColor: COLORS.warningLight || COLORS.warning + '20',
  },
  statusText: {
    ...FONTS.body,
    fontWeight: '600',
  },
  statusTextSettled: {
    color: COLORS.success,
  },
  statusTextPending: {
    color: COLORS.warning || '#FFA500',
  },
  settledDate: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginTop: SPACING.small,
  },
  settlementId: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginTop: SPACING.tiny,
  },
  footer: {
    padding: SPACING.large,
    borderTopWidth: 1,
    borderTopColor: COLORS.border || '#E5E5E5',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.base,
    marginBottom: SPACING.base,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.base,
    borderRadius: 12,
    gap: SPACING.small,
    borderWidth: 2,
  },
  editButton: {
    backgroundColor: COLORS.primary + '10',
    borderColor: COLORS.primary,
  },
  deleteButton: {
    backgroundColor: COLORS.error + '10',
    borderColor: COLORS.error,
  },
  actionButtonText: {
    ...FONTS.body,
    fontWeight: '600',
  },
  editButtonText: {
    color: COLORS.primary,
  },
  deleteButtonText: {
    color: COLORS.error,
  },
  settledWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
    backgroundColor: COLORS.backgroundSecondary,
    padding: SPACING.base,
    borderRadius: 8,
    marginBottom: SPACING.base,
  },
  settledWarningText: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    flex: 1,
  },
  closeFooterButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.base,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeFooterButtonText: {
    ...FONTS.body,
    color: COLORS.background,
    fontWeight: '600',
  },
});
