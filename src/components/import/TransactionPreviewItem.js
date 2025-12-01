import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Checkbox, IconButton, Menu, Chip } from 'react-native-paper';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS } from '../../constants/theme';
import { CATEGORIES, getCategoryById } from '../../constants/categories';
import { formatCurrency } from '../../utils/currencyUtils';
import CategorySuggestion from './CategorySuggestion';
import DuplicateWarning from './DuplicateWarning';

/**
 * Preview item for a single transaction
 * Allows editing category and excluding from import
 */
export default function TransactionPreviewItem({
  transaction,
  suggestion,
  duplicateStatus,
  selected = true,
  selectedCategory,
  primaryCurrency = 'USD',
  onToggleSelect,
  onCategoryChange,
}) {
  const [menuVisible, setMenuVisible] = React.useState(false);

  const category = getCategoryById(selectedCategory || suggestion?.categoryKey || 'other');
  const formattedDate = new Date(transaction.date).toLocaleDateString();
  const isExcluded = !selected;
  const isDuplicate = duplicateStatus?.autoSkip;

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const handleCategorySelect = (categoryId) => {
    onCategoryChange(categoryId);
    closeMenu();
  };

  return (
    <Card style={[styles.card, (isExcluded || isDuplicate) && styles.excludedCard]}>
      <View style={styles.container}>
        {/* Checkbox for selection */}
        <Checkbox
          status={selected ? 'checked' : 'unchecked'}
          onPress={() => onToggleSelect(!selected)}
          disabled={isDuplicate}
        />

        {/* Transaction details */}
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.description} numberOfLines={2}>
              {transaction.description}
            </Text>
            <Text style={styles.amount}>
              {formatCurrency(transaction.amount, transaction.currency || primaryCurrency)}
            </Text>
          </View>

          <Text style={styles.date}>{formattedDate}</Text>

          {/* Category selector */}
          <View style={styles.categoryRow}>
            <Menu
              visible={menuVisible}
              onDismiss={closeMenu}
              anchor={
                <Chip
                  icon={category.icon}
                  onPress={openMenu}
                  style={[styles.categoryChip, { backgroundColor: category.color + '20' }]}
                  textStyle={{ color: category.color }}
                >
                  {category.name}
                </Chip>
              }
            >
              {CATEGORIES.map((cat) => (
                <Menu.Item
                  key={cat.id}
                  onPress={() => handleCategorySelect(cat.id)}
                  title={`${cat.icon} ${cat.name}`}
                  leadingIcon={selectedCategory === cat.id ? 'check' : undefined}
                />
              ))}
            </Menu>

            {/* Show suggestion confidence */}
            {suggestion && suggestion.confidence > 0 && !selectedCategory && (
              <CategorySuggestion suggestion={suggestion} selected={false} />
            )}
          </View>

          {/* Duplicate warning */}
          <DuplicateWarning duplicateStatus={duplicateStatus} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.base,
    marginVertical: SPACING.tiny,
    ...SHADOWS.small,
    backgroundColor: COLORS.background,
  },
  excludedCard: {
    opacity: 0.5,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SPACING.small,
    paddingRight: SPACING.medium,
  },
  content: {
    flex: 1,
    paddingRight: SPACING.small,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.tiny,
  },
  description: {
    flex: 1,
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    marginRight: SPACING.small,
    lineHeight: FONTS.sizes.body * 1.4,
  },
  amount: {
    fontSize: FONTS.sizes.subtitle,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
  },
  date: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.small,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: SPACING.tiny,
  },
  categoryChip: {
    height: 28,
    marginRight: SPACING.small,
  },
});
