import React from 'react';
import { StyleSheet, Platform, Alert } from 'react-native';
import { Button } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import * as DocumentPicker from 'expo-document-picker';

/**
 * File picker button for selecting CSV or PDF bank statements
 */
export default function FilePickerButton({ onFileSelected, loading, style }) {
  const { t } = useTranslation();
  const [picking, setPicking] = React.useState(false);

  const pickFile = async () => {
    try {
      setPicking(true);

      // On web, only allow CSV files (PDF parsing not supported in browser)
      const allowedTypes = Platform.OS === 'web'
        ? ['text/csv', 'text/comma-separated-values', 'text/plain']
        : ['text/csv', 'text/comma-separated-values', 'application/pdf', 'text/plain'];

      const result = await DocumentPicker.getDocumentAsync({
        type: allowedTypes,
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setPicking(false);
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];

        // Validate file type
        const fileName = file.name.toLowerCase();
        const isCSV = fileName.endsWith('.csv') || fileName.endsWith('.txt');
        const isPDF = fileName.endsWith('.pdf');

        if (!isCSV && !isPDF) {
          Alert.alert(
            t('import.errors.invalidFileType') || 'Invalid File Type',
            t('import.errors.invalidFileTypeMessage') || 'Please select a CSV or PDF file.'
          );
          setPicking(false);
          return;
        }

        // Check if PDF on web
        if (isPDF && Platform.OS === 'web') {
          Alert.alert(
            'PDF Not Supported on Web',
            'PDF import is only available on mobile apps. Please convert your bank statement to CSV format and try again.\n\nTip: Most banks allow you to download statements as CSV files.'
          );
          setPicking(false);
          return;
        }

        // Call callback with file info
        onFileSelected({
          uri: file.uri,
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
          type: isPDF ? 'pdf' : 'csv',
        });
      }

      setPicking(false);
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert(
        t('import.errors.fileSelectError') || 'File Selection Error',
        t('import.errors.fileSelectErrorMessage') || 'Could not select file. Please try again.'
      );
      setPicking(false);
    }
  };

  return (
    <Button
      mode="contained"
      onPress={pickFile}
      loading={loading || picking}
      disabled={loading || picking}
      icon="file-upload"
      style={[styles.button, style]}
    >
      {picking ? t('import.selectingFile') : t('import.selectFile')}
    </Button>
  );
}

const styles = StyleSheet.create({
  button: {
    marginVertical: 10,
  },
});
