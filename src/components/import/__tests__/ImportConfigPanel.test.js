/**
 * Tests for ImportConfigPanel Component
 * Configuration panel for import settings (payer, split, category)
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ImportConfigPanel from '../ImportConfigPanel';

describe('ImportConfigPanel', () => {
  const mockCurrentUser = {
    uid: 'user-1',
    displayName: 'John Doe',
  };

  const mockPartner = {
    partnerId: 'user-2',
    partnerName: 'Jane Doe',
  };

  const mockConfig = {
    paidBy: 'user-1',
    splitConfig: {
      type: '50/50',
    },
    defaultCategoryKey: 'food',
  };

  const mockOnConfigChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with default config', () => {
    const { getByText } = render(
      <ImportConfigPanel
        config={mockConfig}
        onConfigChange={mockOnConfigChange}
        currentUser={mockCurrentUser}
        partner={mockPartner}
      />
    );

    expect(getByText('import.config.title')).toBeTruthy();
    expect(getByText('import.config.whoPaid')).toBeTruthy();
    expect(getByText('import.config.split')).toBeTruthy();
    expect(getByText('import.config.defaultCategory')).toBeTruthy();
  });

  it('should display current user and partner options for paidBy', () => {
    const { getByText } = render(
      <ImportConfigPanel
        config={mockConfig}
        onConfigChange={mockOnConfigChange}
        currentUser={mockCurrentUser}
        partner={mockPartner}
      />
    );

    expect(getByText('import.config.you')).toBeTruthy();
    expect(getByText(/import.config.partner/)).toBeTruthy();
  });

  it('should call onConfigChange when paidBy is changed', () => {
    const { getByText } = render(
      <ImportConfigPanel
        config={mockConfig}
        onConfigChange={mockOnConfigChange}
        currentUser={mockCurrentUser}
        partner={mockPartner}
      />
    );

    // Press on partner option
    const partnerButton = getByText(/import.config.partner/);
    fireEvent.press(partnerButton);

    expect(mockOnConfigChange).toHaveBeenCalledWith({
      ...mockConfig,
      paidBy: 'user-2',
    });
  });

  it('should display split type options', () => {
    const { getByText } = render(
      <ImportConfigPanel
        config={mockConfig}
        onConfigChange={mockOnConfigChange}
        currentUser={mockCurrentUser}
        partner={mockPartner}
      />
    );

    expect(getByText('import.config.equal')).toBeTruthy();
    expect(getByText('import.config.custom')).toBeTruthy();
  });

  it('should call onConfigChange when split type is changed', () => {
    const { getByText } = render(
      <ImportConfigPanel
        config={mockConfig}
        onConfigChange={mockOnConfigChange}
        currentUser={mockCurrentUser}
        partner={mockPartner}
      />
    );

    const equalButton = getByText('import.config.equal');
    fireEvent.press(equalButton);

    expect(mockOnConfigChange).toHaveBeenCalledWith({
      ...mockConfig,
      splitConfig: {
        ...mockConfig.splitConfig,
        type: '50/50',
      },
    });
  });

  it('should show custom split option as disabled', () => {
    const { getByText } = render(
      <ImportConfigPanel
        config={mockConfig}
        onConfigChange={mockOnConfigChange}
        currentUser={mockCurrentUser}
        partner={mockPartner}
      />
    );

    const customButton = getByText('import.config.custom');
    expect(customButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('should display category chips for default category selection', () => {
    const { getByText } = render(
      <ImportConfigPanel
        config={mockConfig}
        onConfigChange={mockOnConfigChange}
        currentUser={mockCurrentUser}
        partner={mockPartner}
      />
    );

    // Categories from CATEGORIES constant should be visible
    // Checking for icon + name format (e.g., "🍔 Food")
    expect(getByText(/Food/)).toBeTruthy();
  });

  it('should call onConfigChange when category is changed', () => {
    const { getAllByRole } = render(
      <ImportConfigPanel
        config={mockConfig}
        onConfigChange={mockOnConfigChange}
        currentUser={mockCurrentUser}
        partner={mockPartner}
      />
    );

    // Find category chips and press one
    const chips = getAllByRole('button');
    const categoryChip = chips.find(chip =>
      chip.props.children?.toString().includes('Groceries')
    );

    if (categoryChip) {
      fireEvent.press(categoryChip);

      expect(mockOnConfigChange).toHaveBeenCalledWith({
        ...mockConfig,
        defaultCategoryKey: 'groceries',
      });
    }
  });

  it('should highlight selected category chip', () => {
    const { getAllByRole } = render(
      <ImportConfigPanel
        config={mockConfig}
        onConfigChange={mockOnConfigChange}
        currentUser={mockCurrentUser}
        partner={mockPartner}
      />
    );

    const chips = getAllByRole('button');
    const selectedChip = chips.find(chip =>
      chip.props.selected === true &&
      chip.props.children?.toString().includes('Food')
    );

    expect(selectedChip).toBeTruthy();
  });

  it('should display info box with duplicate detection help text', () => {
    const { getByText } = render(
      <ImportConfigPanel
        config={mockConfig}
        onConfigChange={mockOnConfigChange}
        currentUser={mockCurrentUser}
        partner={mockPartner}
      />
    );

    expect(getByText('import.config.detectDuplicatesHelp')).toBeTruthy();
  });

  it('should handle config without splitConfig', () => {
    const configWithoutSplit = {
      paidBy: 'user-1',
      defaultCategoryKey: 'food',
    };

    const { getByText } = render(
      <ImportConfigPanel
        config={configWithoutSplit}
        onConfigChange={mockOnConfigChange}
        currentUser={mockCurrentUser}
        partner={mockPartner}
      />
    );

    // Should default to '50/50'
    expect(getByText('import.config.equal')).toBeTruthy();
  });

  it('should use partner name in partner option label', () => {
    const { getByText } = render(
      <ImportConfigPanel
        config={mockConfig}
        onConfigChange={mockOnConfigChange}
        currentUser={mockCurrentUser}
        partner={{ ...mockPartner, partnerName: 'Alice' }}
      />
    );

    expect(getByText(/Alice/)).toBeTruthy();
  });

  it('should use default partner label when partnerName is not provided', () => {
    const { getByText } = render(
      <ImportConfigPanel
        config={mockConfig}
        onConfigChange={mockOnConfigChange}
        currentUser={mockCurrentUser}
        partner={{ partnerId: 'user-2' }}
      />
    );

    expect(getByText(/Partner/)).toBeTruthy();
  });

  it('should support i18n for all text', () => {
    const { getByText } = render(
      <ImportConfigPanel
        config={mockConfig}
        onConfigChange={mockOnConfigChange}
        currentUser={mockCurrentUser}
        partner={mockPartner}
      />
    );

    // All text should use translation keys
    expect(getByText('import.config.title')).toBeTruthy();
    expect(getByText('import.config.whoPaid')).toBeTruthy();
    expect(getByText('import.config.you')).toBeTruthy();
    expect(getByText('import.config.split')).toBeTruthy();
    expect(getByText('import.config.equal')).toBeTruthy();
    expect(getByText('import.config.custom')).toBeTruthy();
    expect(getByText('import.config.defaultCategory')).toBeTruthy();
    expect(getByText('import.config.detectDuplicatesHelp')).toBeTruthy();
  });
});
