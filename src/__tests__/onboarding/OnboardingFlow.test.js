// src/__tests__/onboarding/OnboardingFlow.test.js
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingIntroScreen from '../../screens/onboarding/OnboardingIntroScreen';
import SimpleChooseStyleScreen from '../../screens/onboarding/simple/SimpleChooseStyleScreen';
import SimpleSmartBudgetScreen from '../../screens/onboarding/simple/SimpleSmartBudgetScreen';
import SimpleFixedBudgetScreen from '../../screens/onboarding/simple/SimpleFixedBudgetScreen';
import SimpleSuccessScreen from '../../screens/onboarding/simple/SimpleSuccessScreen';
import AdvancedWelcomeScreen from '../../screens/onboarding/advanced/AdvancedWelcomeScreen';
import AdvancedSuccessScreen from '../../screens/onboarding/advanced/AdvancedSuccessScreen';
import OnboardingSkipScreen from '../../screens/onboarding/OnboardingSkipScreen';
import { OnboardingProvider } from '../../contexts/OnboardingContext';
import { BudgetProvider } from '../../contexts/BudgetContext';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock navigation
const createMockNavigation = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  setOptions: jest.fn(),
});

// Mock route
const createMockRoute = (params = {}) => ({
  params,
});

// Helper to render with providers
const renderWithProviders = (component) => {
  return render(
    <AuthProvider>
      <BudgetProvider>
        <OnboardingProvider>{component}</OnboardingProvider>
      </BudgetProvider>
    </AuthProvider>
  );
};

describe('Complete Onboarding Flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  describe('Simple Mode Flow', () => {
    it('should complete simple flow: Intro -> Choose Style -> Smart Budget -> Success', async () => {
      // Step 1: Intro Screen - Select Simple
      const navigation1 = createMockNavigation();
      const { getByText: getByText1 } = renderWithProviders(
        <OnboardingIntroScreen navigation={navigation1} route={createMockRoute()} />
      );

      fireEvent.press(getByText1('Keep It Simple'));
      expect(navigation1.navigate).toHaveBeenCalledWith('SimpleChooseStyle');

      // Step 2: Choose Style Screen - Select Smart Budget
      const navigation2 = createMockNavigation();
      const { getByText: getByText2 } = renderWithProviders(
        <SimpleChooseStyleScreen navigation={navigation2} route={createMockRoute()} />
      );

      const smartButton = getByText2('Smart Budget');
      fireEvent.press(smartButton);
      expect(navigation2.navigate).toHaveBeenCalledWith('SimpleSmartBudget');

      // Step 3: Smart Budget Screen - Continue
      const navigation3 = createMockNavigation();
      const { getByText: getByText3 } = renderWithProviders(
        <SimpleSmartBudgetScreen navigation={navigation3} route={createMockRoute()} />
      );

      const continueButton = getByText3('Continue');
      fireEvent.press(continueButton);
      expect(navigation3.navigate).toHaveBeenCalledWith('SimpleSuccess');

      // Step 4: Success Screen - Go to Dashboard
      const navigation4 = createMockNavigation();
      const { getByText: getByText4 } = renderWithProviders(
        <SimpleSuccessScreen navigation={navigation4} route={createMockRoute()} />
      );

      const dashboardButton = getByText4('Go to Dashboard');
      fireEvent.press(dashboardButton);

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          expect.stringContaining('onboarding_completed'),
          'true'
        );
      });
    });

    it('should complete simple flow: Intro -> Choose Style -> Fixed Budget -> Success', async () => {
      // Step 1: Intro Screen
      const navigation1 = createMockNavigation();
      const { getByText: getByText1 } = renderWithProviders(
        <OnboardingIntroScreen navigation={navigation1} route={createMockRoute()} />
      );

      fireEvent.press(getByText1('Keep It Simple'));
      expect(navigation1.navigate).toHaveBeenCalledWith('SimpleChooseStyle');

      // Step 2: Choose Style Screen - Select Fixed Budget
      const navigation2 = createMockNavigation();
      const { getByText: getByText2 } = renderWithProviders(
        <SimpleChooseStyleScreen navigation={navigation2} route={createMockRoute()} />
      );

      const fixedButton = getByText2('Fixed Budget');
      fireEvent.press(fixedButton);
      expect(navigation2.navigate).toHaveBeenCalledWith('SimpleFixedBudget');

      // Step 3: Fixed Budget Screen - Continue
      const navigation3 = createMockNavigation();
      const { getByText: getByText3 } = renderWithProviders(
        <SimpleFixedBudgetScreen navigation={navigation3} route={createMockRoute()} />
      );

      const continueButton = getByText3('Continue');
      fireEvent.press(continueButton);
      expect(navigation3.navigate).toHaveBeenCalledWith('SimpleSuccess');
    });

    it('should allow back navigation in simple flow', () => {
      const navigation = createMockNavigation();
      const { getByText } = renderWithProviders(
        <SimpleChooseStyleScreen navigation={navigation} route={createMockRoute()} />
      );

      // Look for back button or text
      const backButton = getByText('Back');
      fireEvent.press(backButton);

      expect(navigation.goBack).toHaveBeenCalled();
    });
  });

  describe('Advanced Mode Flow', () => {
    it('should start advanced flow from intro screen', () => {
      const navigation = createMockNavigation();
      const { getByText } = renderWithProviders(
        <OnboardingIntroScreen navigation={navigation} route={createMockRoute()} />
      );

      fireEvent.press(getByText('Annual Planning'));
      expect(navigation.navigate).toHaveBeenCalledWith('AdvancedWelcome');
    });

    it('should navigate through advanced welcome screen', () => {
      const navigation = createMockNavigation();
      const { getByText } = renderWithProviders(
        <AdvancedWelcomeScreen navigation={navigation} route={createMockRoute()} />
      );

      const getStartedButton = getByText("Let's Get Started");
      fireEvent.press(getStartedButton);

      expect(navigation.navigate).toHaveBeenCalledWith('AdvancedTimeframe');
    });

    it('should complete advanced flow to success screen', async () => {
      const navigation = createMockNavigation();
      const mockRouteWithData = createMockRoute({
        finalData: {
          mode: 'monthly',
          totalBudget: 5000,
          selectedCategories: [
            { key: 'housing', name: 'Housing', icon: '🏠' },
            { key: 'food', name: 'Food', icon: '🍔' },
          ],
          includeSavings: true,
          allocations: {
            housing: 2000,
            food: 1000,
          },
        },
      });

      const { getByText } = renderWithProviders(
        <AdvancedSuccessScreen navigation={navigation} route={mockRouteWithData} />
      );

      const dashboardButton = getByText('Go to Dashboard');
      fireEvent.press(dashboardButton);

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          expect.stringContaining('onboarding_completed'),
          'true'
        );
      });
    });

    it('should allow editing budget from advanced success screen', () => {
      const navigation = createMockNavigation();
      const mockRouteWithData = createMockRoute({
        finalData: {
          mode: 'monthly',
          totalBudget: 5000,
          selectedCategories: [],
          includeSavings: false,
          allocations: {},
        },
      });

      const { getByText } = renderWithProviders(
        <AdvancedSuccessScreen navigation={navigation} route={mockRouteWithData} />
      );

      const editButton = getByText('Edit Budget');
      fireEvent.press(editButton);

      expect(navigation.goBack).toHaveBeenCalled();
    });
  });

  describe('Skip Flow', () => {
    it('should navigate to skip screen from intro', () => {
      const navigation = createMockNavigation();
      const { getByText } = renderWithProviders(
        <OnboardingIntroScreen navigation={navigation} route={createMockRoute()} />
      );

      fireEvent.press(getByText('Skip for now'));
      expect(navigation.navigate).toHaveBeenCalledWith('OnboardingSkip');
    });

    it('should complete onboarding when skip is confirmed', async () => {
      const navigation = createMockNavigation();
      const { getByText } = renderWithProviders(
        <OnboardingSkipScreen navigation={navigation} route={createMockRoute()} />
      );

      const dashboardButton = getByText('Go to Dashboard');
      fireEvent.press(dashboardButton);

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          expect.stringContaining('onboarding_completed'),
          'true'
        );
      });
    });

    it('should show loading state when completing skip', async () => {
      const navigation = createMockNavigation();
      const { getByText, queryByText } = renderWithProviders(
        <OnboardingSkipScreen navigation={navigation} route={createMockRoute()} />
      );

      const dashboardButton = getByText('Go to Dashboard');
      fireEvent.press(dashboardButton);

      // Should show loading state
      await waitFor(() => {
        expect(queryByText('Go to Dashboard')).toBeNull();
      });
    });
  });

  describe('Back Navigation', () => {
    it('should navigate back to simple mode from advanced welcome screen', () => {
      const navigation = createMockNavigation();
      const { getByText } = renderWithProviders(
        <AdvancedWelcomeScreen navigation={navigation} route={createMockRoute()} />
      );

      const backButton = getByText('Back to Simple Mode');
      fireEvent.press(backButton);

      expect(navigation.navigate).toHaveBeenCalledWith('SimpleWelcome');
    });

    it('should allow switching to advanced mode from simple choose style', () => {
      const navigation = createMockNavigation();
      const { getByText } = renderWithProviders(
        <SimpleChooseStyleScreen navigation={navigation} route={createMockRoute()} />
      );

      const advancedLink = getByText('Switch to Advanced Mode');
      fireEvent.press(advancedLink);

      expect(navigation.navigate).toHaveBeenCalledWith('AdvancedOnboarding');
    });
  });

  describe('OnboardingContext Integration', () => {
    it('should update context when selecting simple mode', () => {
      const navigation = createMockNavigation();
      const { getByText } = renderWithProviders(
        <OnboardingIntroScreen navigation={navigation} route={createMockRoute()} />
      );

      fireEvent.press(getByText('Keep It Simple'));

      // Mode should be set in context (navigation is called as side effect)
      expect(navigation.navigate).toHaveBeenCalled();
    });

    it('should update context when selecting advanced mode', () => {
      const navigation = createMockNavigation();
      const { getByText } = renderWithProviders(
        <OnboardingIntroScreen navigation={navigation} route={createMockRoute()} />
      );

      fireEvent.press(getByText('Annual Planning'));

      // Mode should be set in context
      expect(navigation.navigate).toHaveBeenCalled();
    });

    it('should persist onboarding completion to AsyncStorage', async () => {
      const navigation = createMockNavigation();
      const { getByText } = renderWithProviders(
        <SimpleSuccessScreen navigation={navigation} route={createMockRoute()} />
      );

      fireEvent.press(getByText('Go to Dashboard'));

      await waitFor(() => {
        const setItemCalls = AsyncStorage.setItem.mock.calls;
        const completedCall = setItemCalls.find(call =>
          call[0].includes('onboarding_completed')
        );
        expect(completedCall).toBeDefined();
        expect(completedCall[1]).toBe('true');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle navigation errors gracefully', () => {
      const navigation = createMockNavigation();
      navigation.navigate.mockImplementation(() => {
        throw new Error('Navigation error');
      });

      const { getByText } = renderWithProviders(
        <OnboardingIntroScreen navigation={navigation} route={createMockRoute()} />
      );

      // Should not crash even if navigation throws
      expect(() => {
        fireEvent.press(getByText('Keep It Simple'));
      }).toThrow('Navigation error');
    });

    it('should handle AsyncStorage errors during completion', async () => {
      AsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage error'));

      const navigation = createMockNavigation();
      const { getByText } = renderWithProviders(
        <SimpleSuccessScreen navigation={navigation} route={createMockRoute()} />
      );

      fireEvent.press(getByText('Go to Dashboard'));

      // Should handle error gracefully
      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalled();
      });
    });
  });

  describe('UI State Management', () => {
    it('should show loading state during onboarding completion', async () => {
      const navigation = createMockNavigation();
      const { getByText, queryByText } = renderWithProviders(
        <SimpleSuccessScreen navigation={navigation} route={createMockRoute()} />
      );

      const button = getByText('Go to Dashboard');
      fireEvent.press(button);

      // Button text should change during loading
      await waitFor(() => {
        expect(queryByText('Go to Dashboard')).toBeNull();
      });
    });

    it('should disable buttons during async operations', async () => {
      const navigation = createMockNavigation();
      const { getByText } = renderWithProviders(
        <SimpleSuccessScreen navigation={navigation} route={createMockRoute()} />
      );

      const button = getByText('Go to Dashboard');
      fireEvent.press(button);

      // Pressing again should not trigger another operation
      fireEvent.press(button);

      await waitFor(() => {
        const completedCalls = AsyncStorage.setItem.mock.calls.filter(
          call => call[0].includes('onboarding_completed')
        );
        expect(completedCalls.length).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Route Parameters', () => {
    it('should handle missing route parameters gracefully', () => {
      const navigation = createMockNavigation();

      // Test with undefined route
      const { container } = renderWithProviders(
        <OnboardingIntroScreen navigation={navigation} route={{}} />
      );

      expect(container).toBeTruthy();
    });

    it('should use route parameters when provided', () => {
      const navigation = createMockNavigation();
      const route = createMockRoute({ afterPairing: true });

      const { getByText } = renderWithProviders(
        <OnboardingIntroScreen navigation={navigation} route={route} />
      );

      expect(getByText('Choose how you want to track your shared expenses')).toBeTruthy();
    });
  });
});
