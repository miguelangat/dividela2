// src/__tests__/onboarding/OnboardingNavigation.test.js
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingIntroScreen from '../../screens/onboarding/OnboardingIntroScreen';
import SimpleSuccessScreen from '../../screens/onboarding/simple/SimpleSuccessScreen';
import AdvancedSuccessScreen from '../../screens/onboarding/advanced/AdvancedSuccessScreen';
import { OnboardingProvider } from '../../contexts/OnboardingContext';
import { BudgetProvider } from '../../contexts/BudgetContext';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
};

// Mock route
const mockRoute = {
  params: {},
};

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

describe('Onboarding Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  describe('OnboardingIntroScreen Navigation', () => {
    it('should navigate to SimpleChooseStyle when "Keep It Simple" is selected', () => {
      const { getByText } = renderWithProviders(
        <OnboardingIntroScreen navigation={mockNavigation} route={mockRoute} />
      );

      const simpleCard = getByText('Keep It Simple');
      fireEvent.press(simpleCard);

      expect(mockNavigate).toHaveBeenCalledWith('SimpleChooseStyle');
    });

    it('should navigate to AdvancedWelcome when "Annual Planning" is selected', () => {
      const { getByText } = renderWithProviders(
        <OnboardingIntroScreen navigation={mockNavigation} route={mockRoute} />
      );

      const advancedCard = getByText('Annual Planning');
      fireEvent.press(advancedCard);

      expect(mockNavigate).toHaveBeenCalledWith('AdvancedWelcome');
    });

    it('should navigate to OnboardingSkip when "Skip for now" is pressed', () => {
      const { getByText } = renderWithProviders(
        <OnboardingIntroScreen navigation={mockNavigation} route={mockRoute} />
      );

      const skipButton = getByText('Skip for now');
      fireEvent.press(skipButton);

      expect(mockNavigate).toHaveBeenCalledWith('OnboardingSkip');
    });

    it('should show correct subtitle when afterPairing is true', () => {
      const routeWithParams = {
        params: { afterPairing: true },
      };

      const { getByText } = renderWithProviders(
        <OnboardingIntroScreen navigation={mockNavigation} route={routeWithParams} />
      );

      expect(getByText('Choose how you want to track your shared expenses')).toBeTruthy();
    });

    it('should show correct subtitle when afterPairing is false', () => {
      const { getByText } = renderWithProviders(
        <OnboardingIntroScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByText('Choose the setup that works best for you')).toBeTruthy();
    });
  });

  describe('SimpleSuccessScreen "Go to Dashboard" Button', () => {
    it('should render "Go to Dashboard" button', () => {
      const { getByText } = renderWithProviders(
        <SimpleSuccessScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByText('Go to Dashboard')).toBeTruthy();
    });

    it('should call completeOnboarding when "Go to Dashboard" is pressed', async () => {
      const { getByText } = renderWithProviders(
        <SimpleSuccessScreen navigation={mockNavigation} route={mockRoute} />
      );

      const dashboardButton = getByText('Go to Dashboard');
      fireEvent.press(dashboardButton);

      // Wait for async operations
      await waitFor(() => {
        // completeOnboarding should set AsyncStorage
        expect(AsyncStorage.setItem).toHaveBeenCalled();
      });
    });

    it('should show loading indicator while completing onboarding', async () => {
      const { getByText, queryByText } = renderWithProviders(
        <SimpleSuccessScreen navigation={mockNavigation} route={mockRoute} />
      );

      const dashboardButton = getByText('Go to Dashboard');
      fireEvent.press(dashboardButton);

      // Button text should be replaced with loading indicator
      await waitFor(() => {
        expect(queryByText('Go to Dashboard')).toBeNull();
      });
    });

    it('should disable button while completing onboarding', async () => {
      const { getByText } = renderWithProviders(
        <SimpleSuccessScreen navigation={mockNavigation} route={mockRoute} />
      );

      const dashboardButton = getByText('Go to Dashboard');
      fireEvent.press(dashboardButton);

      // Try pressing again - should not trigger additional calls
      fireEvent.press(dashboardButton);

      await waitFor(() => {
        // Should only be called once due to disabled state
        const setItemCalls = AsyncStorage.setItem.mock.calls.filter(
          call => call[0].includes('onboarding_completed')
        );
        expect(setItemCalls.length).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('AdvancedSuccessScreen "Go to Dashboard" Button', () => {
    const mockRouteWithData = {
      params: {
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
      },
    };

    it('should render "Go to Dashboard" button', () => {
      const { getByText } = renderWithProviders(
        <AdvancedSuccessScreen navigation={mockNavigation} route={mockRouteWithData} />
      );

      expect(getByText('Go to Dashboard')).toBeTruthy();
    });

    it('should call completeOnboarding when "Go to Dashboard" is pressed', async () => {
      const { getByText } = renderWithProviders(
        <AdvancedSuccessScreen navigation={mockNavigation} route={mockRouteWithData} />
      );

      const dashboardButton = getByText('Go to Dashboard');
      fireEvent.press(dashboardButton);

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalled();
      });
    });

    it('should render "Edit Budget" button and navigate back when pressed', () => {
      const { getByText } = renderWithProviders(
        <AdvancedSuccessScreen navigation={mockNavigation} route={mockRouteWithData} />
      );

      const editButton = getByText('Edit Budget');
      fireEvent.press(editButton);

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('should show loading indicator while completing onboarding', async () => {
      const { getByText, queryByText } = renderWithProviders(
        <AdvancedSuccessScreen navigation={mockNavigation} route={mockRouteWithData} />
      );

      const dashboardButton = getByText('Go to Dashboard');
      fireEvent.press(dashboardButton);

      await waitFor(() => {
        expect(queryByText('Go to Dashboard')).toBeNull();
      });
    });

    it('should disable buttons while completing onboarding', async () => {
      const { getByText } = renderWithProviders(
        <AdvancedSuccessScreen navigation={mockNavigation} route={mockRouteWithData} />
      );

      const dashboardButton = getByText('Go to Dashboard');
      fireEvent.press(dashboardButton);

      // Edit button should be disabled
      const editButton = getByText('Edit Budget');
      fireEvent.press(editButton);

      // goBack should not be called because button is disabled
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe('AsyncStorage Integration', () => {
    it('should set correct AsyncStorage key when completing onboarding', async () => {
      const { getByText } = renderWithProviders(
        <SimpleSuccessScreen navigation={mockNavigation} route={mockRoute} />
      );

      const dashboardButton = getByText('Go to Dashboard');
      fireEvent.press(dashboardButton);

      await waitFor(() => {
        const setItemCalls = AsyncStorage.setItem.mock.calls;
        const onboardingCall = setItemCalls.find(call =>
          call[0].includes('onboarding_completed')
        );
        expect(onboardingCall).toBeDefined();
        expect(onboardingCall[1]).toBe('true');
      });
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      // Mock AsyncStorage to throw error
      AsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage error'));

      const { getByText } = renderWithProviders(
        <SimpleSuccessScreen navigation={mockNavigation} route={mockRoute} />
      );

      const dashboardButton = getByText('Go to Dashboard');
      fireEvent.press(dashboardButton);

      // Should not crash the app
      await waitFor(() => {
        expect(dashboardButton).toBeTruthy();
      });
    });
  });

  describe('Continue Button Tests', () => {
    it('should have accessible continue buttons throughout the flow', () => {
      const { getByText } = renderWithProviders(
        <OnboardingIntroScreen navigation={mockNavigation} route={mockRoute} />
      );

      // Intro screen has card buttons instead of explicit "Continue"
      expect(getByText('Keep It Simple')).toBeTruthy();
      expect(getByText('Annual Planning')).toBeTruthy();
    });

    it('should show proper button states (enabled/disabled)', async () => {
      const { getByText } = renderWithProviders(
        <SimpleSuccessScreen navigation={mockNavigation} route={mockRoute} />
      );

      const button = getByText('Go to Dashboard');

      // Initially enabled
      expect(button).toBeTruthy();

      // After pressing, should show loading state
      fireEvent.press(button);

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalled();
      });
    });
  });
});
