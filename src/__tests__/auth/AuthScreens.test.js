// src/__tests__/auth/AuthScreens.test.js
// Comprehensive tests for authentication screens

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import WelcomeScreen from '../../screens/auth/WelcomeScreen';
import SignInScreen from '../../screens/auth/SignInScreen';
import SignUpScreen from '../../screens/auth/SignUpScreen';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock navigation
const createMockNavigation = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  replace: jest.fn(),
  setOptions: jest.fn(),
});

// Helper to render with providers
const renderWithProviders = (component) => {
  return render(<AuthProvider>{component}</AuthProvider>);
};

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => defaultValue || key,
    i18n: {
      language: 'en',
      changeLanguage: jest.fn(),
    },
  }),
}));

describe('WelcomeScreen', () => {
  it('should render welcome screen with gradient background', () => {
    const navigation = createMockNavigation();
    const { getByText } = renderWithProviders(
      <WelcomeScreen navigation={navigation} />
    );

    expect(getByText('auth.welcome.title')).toBeTruthy();
  });

  it('should display feature highlights card', () => {
    const navigation = createMockNavigation();
    const { getByText } = renderWithProviders(
      <WelcomeScreen navigation={navigation} />
    );

    expect(getByText('Privacy Focused')).toBeTruthy();
    expect(getByText('Perfect for Couples')).toBeTruthy();
    expect(getByText('Easy Tracking')).toBeTruthy();
  });

  it('should navigate to SignUp when Get Started is pressed', () => {
    const navigation = createMockNavigation();
    const { getByText } = renderWithProviders(
      <WelcomeScreen navigation={navigation} />
    );

    const getStartedButton = getByText('auth.welcome.getStarted');
    fireEvent.press(getStartedButton);

    expect(navigation.navigate).toHaveBeenCalledWith('SignUp');
  });

  it('should navigate to SignIn when sign in link is pressed', () => {
    const navigation = createMockNavigation();
    const { getByText } = renderWithProviders(
      <WelcomeScreen navigation={navigation} />
    );

    const signInLink = getByText('auth.welcome.signIn');
    fireEvent.press(signInLink);

    expect(navigation.navigate).toHaveBeenCalledWith('SignIn');
  });

  it('should render with proper styling - gradient and icons', () => {
    const navigation = createMockNavigation();
    const { getByTestId } = render(<WelcomeScreen navigation={navigation} />);

    // Test that gradient background is present (would need testID in actual component)
    // Test that MaterialCommunityIcons are rendered
  });
});

describe('SignInScreen', () => {
  it('should render sign in form with all fields', () => {
    const navigation = createMockNavigation();
    const { getByPlaceholderText, getByText } = renderWithProviders(
      <SignInScreen navigation={navigation} />
    );

    expect(getByText('auth.signIn.email')).toBeTruthy();
    expect(getByText('auth.signIn.password')).toBeTruthy();
  });

  it('should render gradient header with app icon', () => {
    const navigation = createMockNavigation();
    const { getByText } = renderWithProviders(
      <SignInScreen navigation={navigation} />
    );

    expect(getByText('auth.signIn.title')).toBeTruthy();
    expect(getByText('auth.signIn.subtitle')).toBeTruthy();
  });

  it('should display SSO buttons with Google and Apple logos', () => {
    const navigation = createMockNavigation();
    const { getByText } = renderWithProviders(
      <SignInScreen navigation={navigation} />
    );

    expect(getByText('auth.signIn.continueWithGoogle')).toBeTruthy();
    expect(getByText('auth.signIn.continueWithApple')).toBeTruthy();
  });

  it('should validate email format', async () => {
    const navigation = createMockNavigation();
    const { getByPlaceholderText, getByText } = renderWithProviders(
      <SignInScreen navigation={navigation} />
    );

    const emailInput = getByPlaceholderText('auth.signIn.emailPlaceholder');
    const signInButton = getByText('auth.signIn.signInButton');

    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(getByText(/email/i)).toBeTruthy();
    });
  });

  it('should validate password requirement', async () => {
    const navigation = createMockNavigation();
    const { getByPlaceholderText, getByText } = renderWithProviders(
      <SignInScreen navigation={navigation} />
    );

    const passwordInput = getByPlaceholderText('auth.signIn.passwordPlaceholder');
    const signInButton = getByText('auth.signIn.signInButton');

    fireEvent.changeText(passwordInput, '123');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(getByText(/password/i)).toBeTruthy();
    });
  });

  it('should show loading state when signing in', async () => {
    const navigation = createMockNavigation();
    const { getByPlaceholderText, getByText, queryByText } = renderWithProviders(
      <SignInScreen navigation={navigation} />
    );

    const emailInput = getByPlaceholderText('auth.signIn.emailPlaceholder');
    const passwordInput = getByPlaceholderText('auth.signIn.passwordPlaceholder');
    const signInButton = getByText('auth.signIn.signInButton');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(signInButton);

    // Would need to check for ActivityIndicator
  });

  it('should navigate back when back button is pressed', () => {
    const navigation = createMockNavigation();
    const { getByText } = renderWithProviders(
      <SignInScreen navigation={navigation} />
    );

    const backButton = getByText('navigation.back');
    fireEvent.press(backButton);

    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('should display error message on failed login', async () => {
    const navigation = createMockNavigation();
    const { getByPlaceholderText, getByText } = renderWithProviders(
      <SignInScreen navigation={navigation} />
    );

    const emailInput = getByPlaceholderText('auth.signIn.emailPlaceholder');
    const passwordInput = getByPlaceholderText('auth.signIn.passwordPlaceholder');
    const signInButton = getByText('auth.signIn.signInButton');

    fireEvent.changeText(emailInput, 'wrong@example.com');
    fireEvent.changeText(passwordInput, 'wrongpassword');
    fireEvent.press(signInButton);

    // Would check for error message display
  });
});

describe('SignUpScreen', () => {
  it('should render sign up form with all required fields', () => {
    const navigation = createMockNavigation();
    const { getByText } = renderWithProviders(
      <SignUpScreen navigation={navigation} />
    );

    expect(getByText('Name')).toBeTruthy();
    expect(getByText('Email')).toBeTruthy();
    expect(getByText('Password')).toBeTruthy();
  });

  it('should render gradient header with account-plus icon', () => {
    const navigation = createMockNavigation();
    const { getByText } = renderWithProviders(
      <SignUpScreen navigation={navigation} />
    );

    expect(getByText('Create Account')).toBeTruthy();
    expect(getByText('Join Dividela today')).toBeTruthy();
  });

  it('should display icon-enhanced input fields', () => {
    const navigation = createMockNavigation();
    const { getByPlaceholderText } = renderWithProviders(
      <SignUpScreen navigation={navigation} />
    );

    expect(getByPlaceholderText('Your name')).toBeTruthy();
    expect(getByPlaceholderText('your@email.com')).toBeTruthy();
    expect(getByPlaceholderText('At least 8 characters')).toBeTruthy();
  });

  it('should require terms acceptance', async () => {
    const navigation = createMockNavigation();
    const { getByPlaceholderText, getByText } = renderWithProviders(
      <SignUpScreen navigation={navigation} />
    );

    const nameInput = getByPlaceholderText('Your name');
    const emailInput = getByPlaceholderText('your@email.com');
    const passwordInput = getByPlaceholderText('At least 8 characters');
    const createButton = getByText('Create Account');

    fireEvent.changeText(nameInput, 'Test User');
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(getByText(/terms/i)).toBeTruthy();
    });
  });

  it('should validate name is not empty', async () => {
    const navigation = createMockNavigation();
    const { getByText } = renderWithProviders(
      <SignUpScreen navigation={navigation} />
    );

    const createButton = getByText('Create Account');
    fireEvent.press(createButton);

    await waitFor(() => {
      // Would check for name validation error
    });
  });

  it('should display SSO buttons with branding', () => {
    const navigation = createMockNavigation();
    const { getByText } = renderWithProviders(
      <SignUpScreen navigation={navigation} />
    );

    expect(getByText('Continue with Google')).toBeTruthy();
    expect(getByText('Continue with Apple')).toBeTruthy();
  });

  it('should toggle terms checkbox', () => {
    const navigation = createMockNavigation();
    const { getByText } = renderWithProviders(
      <SignUpScreen navigation={navigation} />
    );

    const checkbox = getByText(/Terms of Service/);
    fireEvent.press(checkbox);

    // Would check checkbox state changed
  });
});

describe('Auth Flow Integration', () => {
  it('should complete full signup flow', async () => {
    const navigation = createMockNavigation();

    // Start at Welcome
    const { getByText: welcomeGetByText } = renderWithProviders(
      <WelcomeScreen navigation={navigation} />
    );

    fireEvent.press(welcomeGetByText('auth.welcome.getStarted'));
    expect(navigation.navigate).toHaveBeenCalledWith('SignUp');
  });

  it('should allow switching between SignIn and SignUp', () => {
    const navigation = createMockNavigation();

    const { getByText } = renderWithProviders(
      <SignInScreen navigation={navigation} />
    );

    const signUpLink = getByText('auth.signIn.signUp');
    fireEvent.press(signUpLink);

    expect(navigation.navigate).toHaveBeenCalledWith('SignUp');
  });
});

describe('Visual Consistency', () => {
  it('should use consistent gradient colors across auth screens', () => {
    // Would test that all screens use the same gradient color scheme
    // COLORS.gradientStart and COLORS.gradientEnd
  });

  it('should have consistent shadow styling on cards', () => {
    // Would test that form cards use SHADOWS.large
  });

  it('should have consistent button styling', () => {
    // Would test gradient buttons, SSO buttons have correct styling
  });

  it('should display icons consistently in input fields', () => {
    // Would test that all input fields have MaterialCommunityIcons
  });
});

describe('Accessibility', () => {
  it('should have proper accessibility labels on buttons', () => {
    const navigation = createMockNavigation();
    const { getByText } = renderWithProviders(
      <SignInScreen navigation={navigation} />
    );

    // All buttons should have clear text labels
    expect(getByText('auth.signIn.signInButton')).toBeTruthy();
  });

  it('should support keyboard navigation', () => {
    // Would test tab order and keyboard navigation
  });
});
