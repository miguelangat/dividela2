/**
 * Tests for FilePickerButton Component
 * Example component test demonstrating the testing pattern
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import FilePickerButton from '../FilePickerButton';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

// Mock expo modules
jest.mock('expo-document-picker');
jest.mock('expo-file-system');

describe('FilePickerButton', () => {
  const mockOnFileSelected = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with default props', () => {
    const { getByText } = render(
      <FilePickerButton onFileSelected={mockOnFileSelected} />
    );

    expect(getByText('import.selectFile')).toBeTruthy();
  });

  it('should show loading state during file selection', async () => {
    DocumentPicker.getDocumentAsync.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    const { getByText } = render(
      <FilePickerButton onFileSelected={mockOnFileSelected} />
    );

    const button = getByText('import.selectFile');
    fireEvent.press(button);

    // Should show "Selecting..." state
    await waitFor(() => {
      expect(getByText('import.selectingFile')).toBeTruthy();
    });
  });

  it('should call onFileSelected with valid CSV file', async () => {
    const mockFile = {
      type: 'success',
      uri: 'file:///path/to/statement.csv',
      name: 'statement.csv',
      mimeType: 'text/csv',
      size: 5000,
    };

    DocumentPicker.getDocumentAsync.mockResolvedValue(mockFile);
    FileSystem.getInfoAsync.mockResolvedValue({
      exists: true,
      size: 5000,
    });

    const { getByText } = render(
      <FilePickerButton onFileSelected={mockOnFileSelected} />
    );

    const button = getByText('import.selectFile');
    fireEvent.press(button);

    await waitFor(() => {
      expect(mockOnFileSelected).toHaveBeenCalledWith({
        uri: mockFile.uri,
        name: mockFile.name,
        type: mockFile.mimeType,
        size: 5000,
      });
    });
  });

  it('should call onFileSelected with valid PDF file', async () => {
    const mockFile = {
      type: 'success',
      uri: 'file:///path/to/statement.pdf',
      name: 'statement.pdf',
      mimeType: 'application/pdf',
      size: 15000,
    };

    DocumentPicker.getDocumentAsync.mockResolvedValue(mockFile);
    FileSystem.getInfoAsync.mockResolvedValue({
      exists: true,
      size: 15000,
    });

    const { getByText } = render(
      <FilePickerButton onFileSelected={mockOnFileSelected} />
    );

    const button = getByText('import.selectFile');
    fireEvent.press(button);

    await waitFor(() => {
      expect(mockOnFileSelected).toHaveBeenCalled();
    });
  });

  it('should not call onFileSelected if user cancels', async () => {
    DocumentPicker.getDocumentAsync.mockResolvedValue({
      type: 'cancel',
    });

    const { getByText } = render(
      <FilePickerButton onFileSelected={mockOnFileSelected} />
    );

    const button = getByText('import.selectFile');
    fireEvent.press(button);

    await waitFor(() => {
      expect(mockOnFileSelected).not.toHaveBeenCalled();
    });
  });

  it('should show error for invalid file type', async () => {
    // Mock global alert
    global.alert = jest.fn();

    const mockFile = {
      type: 'success',
      uri: 'file:///path/to/file.txt',
      name: 'file.txt',
      mimeType: 'text/plain',
      size: 1000,
    };

    DocumentPicker.getDocumentAsync.mockResolvedValue(mockFile);

    const { getByText } = render(
      <FilePickerButton onFileSelected={mockOnFileSelected} />
    );

    const button = getByText('import.selectFile');
    fireEvent.press(button);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining('invalidFileType')
      );
      expect(mockOnFileSelected).not.toHaveBeenCalled();
    });
  });

  it('should handle file selection errors gracefully', async () => {
    global.alert = jest.fn();

    DocumentPicker.getDocumentAsync.mockRejectedValue(
      new Error('Failed to open file picker')
    );

    const { getByText } = render(
      <FilePickerButton onFileSelected={mockOnFileSelected} />
    );

    const button = getByText('import.selectFile');
    fireEvent.press(button);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalled();
      expect(mockOnFileSelected).not.toHaveBeenCalled();
    });
  });

  it('should disable button when loading prop is true', () => {
    const { getByText } = render(
      <FilePickerButton onFileSelected={mockOnFileSelected} loading={true} />
    );

    const button = getByText('import.selectFile');

    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('should support i18n for all text', () => {
    const { getByText } = render(
      <FilePickerButton onFileSelected={mockOnFileSelected} />
    );

    // All text should use translation keys
    expect(getByText('import.selectFile')).toBeTruthy();
  });
});
