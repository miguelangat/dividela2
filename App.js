// App.js
// Main entry point for Dividela app

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  try {
    return (
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
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
