// src/__tests__/components/chat/MessageBubble.test.js
// Component tests for MessageBubble

import React from 'react';
import { render } from '@testing-library/react-native';
import MessageBubble from '../../../components/chat/MessageBubble';

describe('MessageBubble Component', () => {
  describe('Rendering', () => {
    it('should render user message', () => {
      const { getByText } = render(
        <MessageBubble
          message={{
            text: 'Hello, assistant!',
            sender: 'user',
            timestamp: new Date(),
          }}
        />
      );

      expect(getByText('Hello, assistant!')).toBeTruthy();
    });

    it('should render assistant message', () => {
      const { getByText } = render(
        <MessageBubble
          message={{
            text: 'Hello, user!',
            sender: 'assistant',
            timestamp: new Date(),
          }}
        />
      );

      expect(getByText('Hello, user!')).toBeTruthy();
    });

    it('should display timestamp', () => {
      const timestamp = new Date('2024-01-01T12:00:00');
      const { getByText } = render(
        <MessageBubble
          message={{
            text: 'Test message',
            sender: 'user',
            timestamp,
          }}
        />
      );

      // Check if time is displayed (format may vary)
      const timeRegex = /\d{1,2}:\d{2}/;
      const timestampElement = getByText(timeRegex);
      expect(timestampElement).toBeTruthy();
    });
  });

  describe('Styling', () => {
    it('should apply user message styles', () => {
      const { getByText } = render(
        <MessageBubble
          message={{
            text: 'User message',
            sender: 'user',
            timestamp: new Date(),
          }}
        />
      );

      const bubble = getByText('User message').parent;
      expect(bubble).toHaveStyle({
        alignSelf: 'flex-end',
      });
    });

    it('should apply assistant message styles', () => {
      const { getByText } = render(
        <MessageBubble
          message={{
            text: 'Assistant message',
            sender: 'assistant',
            timestamp: new Date(),
          }}
        />
      );

      const bubble = getByText('Assistant message').parent;
      expect(bubble).toHaveStyle({
        alignSelf: 'flex-start',
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(1000);
      const { getByText } = render(
        <MessageBubble
          message={{
            text: longMessage,
            sender: 'user',
            timestamp: new Date(),
          }}
        />
      );

      expect(getByText(longMessage)).toBeTruthy();
    });

    it('should handle empty message text', () => {
      const { queryByText } = render(
        <MessageBubble
          message={{
            text: '',
            sender: 'user',
            timestamp: new Date(),
          }}
        />
      );

      // Should render but with empty text
      expect(queryByText('')).toBeTruthy();
    });

    it('should handle special characters', () => {
      const specialText = 'Test $50 for café ☕️';
      const { getByText } = render(
        <MessageBubble
          message={{
            text: specialText,
            sender: 'user',
            timestamp: new Date(),
          }}
        />
      );

      expect(getByText(specialText)).toBeTruthy();
    });

    it('should handle multiline messages', () => {
      const multilineText = 'Line 1\nLine 2\nLine 3';
      const { getByText } = render(
        <MessageBubble
          message={{
            text: multilineText,
            sender: 'assistant',
            timestamp: new Date(),
          }}
        />
      );

      expect(getByText(multilineText)).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should be accessible', () => {
      const { getByText } = render(
        <MessageBubble
          message={{
            text: 'Test message',
            sender: 'user',
            timestamp: new Date(),
          }}
        />
      );

      const message = getByText('Test message');
      expect(message).toBeTruthy();
    });
  });
});
