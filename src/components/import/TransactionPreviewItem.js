import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Checkbox, IconButton, Menu, Chip } from 'react-native-paper';
import { theme } from '../../constants/theme';
import { CATEGORIES, getCategoryById } from '../../constants/categories';
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
            <Text style={styles.amount}>${transaction.amount.toFixed(2)}</Text>
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
    marginHorizontal: 16,
    marginVertical: 4,
    elevation: 1,
  },
  excludedCard: {
    opacity: 0.5,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    paddingRight: 12,
  },
  content: {
    flex: 1,
    paddingRight: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  description: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginRight: 8,
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  date: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  categoryChip: {
    height: 28,
    marginRight: 8,
  },
});
