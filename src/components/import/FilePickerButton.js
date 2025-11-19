import React from 'react';
import { StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';

/**
 * File picker button for selecting CSV or PDF bank statements
 */
export default function FilePickerButton({ onFileSelected, loading, style }) {
  const [picking, setPicking] = React.useState(false);

  const pickFile = async () => {
    try {
      setPicking(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/pdf', 'text/plain'],
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
          alert('Please select a CSV or PDF file');
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
      alert('Error selecting file. Please try again.');
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
      {picking ? 'Selecting File...' : 'Select Bank Statement'}
    </Button>
  );
}

const styles = StyleSheet.create({
  button: {
    marginVertical: 10,
  },
});
