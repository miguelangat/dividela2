// src/__tests__/components/chat/ChatInput.test.js
// Component tests for ChatInput

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ChatInput from '../../../components/chat/ChatInput';

describe('ChatInput Component', () => {
  const mockOnSend = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render input field', () => {
      const { getByPlaceholderText } = render(
        <ChatInput onSend={mockOnSend} />
      );

      expect(getByPlaceholderText('Type your message...')).toBeTruthy();
    });

    it('should render send button', () => {
      const { getByTestId } = render(
        <ChatInput onSend={mockOnSend} />
      );

      // Assuming send button has testID
      const sendButton = getByTestId('send-button');
      expect(sendButton).toBeTruthy();
    });

    it('should show custom placeholder', () => {
      const { getByPlaceholderText } = render(
        <ChatInput
          onSend={mockOnSend}
          placeholder="Custom placeholder"
        />
      );

      expect(getByPlaceholderText('Custom placeholder')).toBeTruthy();
    });
  });

  describe('User Interaction', () => {
    it('should allow text input', () => {
      const { getByPlaceholderText } = render(
        <ChatInput onSend={mockOnSend} />
      );

      const input = getByPlaceholderText('Type your message...');
      fireEvent.changeText(input, 'Hello');

      expect(input.props.value).toBe('Hello');
    });

    it('should call onSend when send button pressed', () => {
      const { getByPlaceholderText, getByTestId } = render(
        <ChatInput onSend={mockOnSend} />
      );

      const input = getByPlaceholderText('Type your message...');
      const sendButton = getByTestId('send-button');

      fireEvent.changeText(input, 'Test message');
      fireEvent.press(sendButton);

      expect(mockOnSend).toHaveBeenCalledWith('Test message');
    });

    it('should clear input after sending', () => {
      const { getByPlaceholderText, getByTestId } = render(
        <ChatInput onSend={mockOnSend} />
      );

      const input = getByPlaceholderText('Type your message...');
      const sendButton = getByTestId('send-button');

      fireEvent.changeText(input, 'Test message');
      fireEvent.press(sendButton);

      expect(input.props.value).toBe('');
    });

    it('should not send empty messages', () => {
      const { getByTestId } = render(
        <ChatInput onSend={mockOnSend} />
      );

      const sendButton = getByTestId('send-button');
      fireEvent.press(sendButton);

      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('should not send whitespace-only messages', () => {
      const { getByPlaceholderText, getByTestId } = render(
        <ChatInput onSend={mockOnSend} />
      );

      const input = getByPlaceholderText('Type your message...');
      const sendButton = getByTestId('send-button');

      fireEvent.changeText(input, '   ');
      fireEvent.press(sendButton);

      expect(mockOnSend).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('should disable input when disabled prop is true', () => {
      const { getByPlaceholderText } = render(
        <ChatInput onSend={mockOnSend} disabled={true} />
      );

      const input = getByPlaceholderText('Type your message...');
      expect(input.props.editable).toBe(false);
    });

    it('should not send messages when disabled', () => {
      const { getByPlaceholderText, getByTestId } = render(
        <ChatInput onSend={mockOnSend} disabled={true} />
      );

      const input = getByPlaceholderText('Type your message...');
      const sendButton = getByTestId('send-button');

      fireEvent.changeText(input, 'Test');
      fireEvent.press(sendButton);

      expect(mockOnSend).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(1000);
      const { getByPlaceholderText, getByTestId } = render(
        <ChatInput onSend={mockOnSend} />
      );

      const input = getByPlaceholderText('Type your message...');
      const sendButton = getByTestId('send-button');

      fireEvent.changeText(input, longMessage);
      fireEvent.press(sendButton);

      expect(mockOnSend).toHaveBeenCalledWith(longMessage);
    });

    it('should handle special characters', () => {
      const specialMessage = '$50 for café ☕️';
      const { getByPlaceholderText, getByTestId } = render(
        <ChatInput onSend={mockOnSend} />
      );

      const input = getByPlaceholderText('Type your message...');
      const sendButton = getByTestId('send-button');

      fireEvent.changeText(input, specialMessage);
      fireEvent.press(sendButton);

      expect(mockOnSend).toHaveBeenCalledWith(specialMessage);
    });

    it('should handle multiline text', () => {
      const multilineMessage = 'Line 1\nLine 2\nLine 3';
      const { getByPlaceholderText, getByTestId } = render(
        <ChatInput onSend={mockOnSend} />
      );

      const input = getByPlaceholderText('Type your message...');
      const sendButton = getByTestId('send-button');

      fireEvent.changeText(input, multilineMessage);
      fireEvent.press(sendButton);

      expect(mockOnSend).toHaveBeenCalledWith(multilineMessage);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible input', () => {
      const { getByPlaceholderText } = render(
        <ChatInput onSend={mockOnSend} />
      );

      const input = getByPlaceholderText('Type your message...');
      expect(input.props.accessible).toBe(true);
    });

    it('should have accessible send button', () => {
      const { getByTestId } = render(
        <ChatInput onSend={mockOnSend} />
      );

      const sendButton = getByTestId('send-button');
      expect(sendButton.props.accessible).toBe(true);
    });
  });
});
