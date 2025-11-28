// App.js
// Main entry point for Dividela app

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider } from './src/contexts/AuthContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import { BudgetProvider } from './src/contexts/BudgetContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
import './src/i18n/i18n.config'; // Initialize i18n

export default function App() {
  try {
    return (
      <SafeAreaProvider>
        <PaperProvider>
          <LanguageProvider>
            <AuthProvider>
              <SubscriptionProvider>
                <BudgetProvider>
                  <AppNavigator />
                </BudgetProvider>
              </SubscriptionProvider>
            </AuthProvider>
          </LanguageProvider>
        </PaperProvider>
      </SafeAreaProvider>
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
