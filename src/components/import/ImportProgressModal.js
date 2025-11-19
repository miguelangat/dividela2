import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Modal, Portal, Text, ProgressBar, ActivityIndicator } from 'react-native-paper';
import { theme } from '../../constants/theme';

/**
 * Modal showing import progress
 */
export default function ImportProgressModal({ visible, progress, onDismiss }) {
  const getStepText = (step) => {
    switch (step) {
      case 'parsing':
        return 'Parsing bank statement...';
      case 'checking_duplicates':
        return 'Checking for duplicates...';
      case 'processing':
        return 'Processing transactions...';
      case 'importing':
        return 'Importing expenses...';
      default:
        return 'Processing...';
    }
  };

  const stepText = progress?.step ? getStepText(progress.step) : 'Processing...';
  const progressValue = progress?.progress ? progress.progress / 100 : 0;
  const showProgress = progress?.step === 'importing' && progress?.total > 0;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
        dismissable={false}
      >
        <View style={styles.content}>
          <ActivityIndicator size="large" color={theme.colors.primary} />

          <Text style={styles.title}>{stepText}</Text>

          {showProgress ? (
            <View style={styles.progressContainer}>
              <ProgressBar
                progress={progressValue}
                color={theme.colors.primary}
                style={styles.progressBar}
              />
              <Text style={styles.progressText}>
                {progress.current} / {progress.total} expenses
              </Text>
            </View>
          ) : (
            <ProgressBar
              indeterminate
              color={theme.colors.primary}
              style={styles.progressBar}
            />
          )}

          <Text style={styles.subtitle}>Please wait...</Text>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: '#fff',
    padding: 24,
    margin: 20,
    borderRadius: 12,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
});
