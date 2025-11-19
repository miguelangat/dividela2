// App.js
// Main entry point for Dividela app

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Sentry from '@sentry/react-native';
import { AuthProvider } from './src/contexts/AuthContext';
import { BudgetProvider } from './src/contexts/BudgetContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { initAnalytics } from './src/services/analyticsService';
import './src/i18n/i18n.config'; // Initialize i18n

// Wrap AppNavigator with Sentry for performance monitoring
const SentryAppNavigator = Sentry.wrap(AppNavigator);

function App() {
  useEffect(() => {
    // Initialize analytics on app startup
    initAnalytics().catch((error) => {
      console.error('[App] Analytics initialization failed:', error);
    });
  }, []);

  try {
    return (
      <ErrorBoundary name="AppRoot">
        <SafeAreaProvider>
          <LanguageProvider>
            <ErrorBoundary name="Auth">
              <AuthProvider>
                <ErrorBoundary name="Budget">
                  <BudgetProvider>
                    <ErrorBoundary name="Navigation">
                      <SentryAppNavigator />
                    </ErrorBoundary>
                  </BudgetProvider>
                </ErrorBoundary>
              </AuthProvider>
            </ErrorBoundary>
          </LanguageProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('App Error:', error);
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error loading app:</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
      </View>
    );
  }
}

// Wrap the entire app with Sentry for global error handling
export default Sentry.wrap(App);

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f44336',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
