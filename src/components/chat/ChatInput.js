// src/components/chat/ChatInput.js
// Text input with send button for chat

import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, SIZES } from '../../constants/theme';

export default function ChatInput({ onSend, disabled = false }) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim() && !disabled) {
      onSend(text);
      setText('');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type your message..."
            placeholderTextColor={COLORS.textTertiary}
            multiline
            maxLength={500}
            editable={!disabled}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!text.trim() || disabled) && styles.sendButtonDisabled
            ]}
            onPress={handleSend}
            disabled={!text.trim() || disabled}
          >
            <Ionicons
              name="send"
              size={20}
              color={text.trim() && !disabled ? COLORS.textWhite : COLORS.textTertiary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.medium,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.cardBackground,
    borderRadius: SIZES.borderRadius.large,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.small,
  },
  input: {
    flex: 1,
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
    maxHeight: 100,
    paddingVertical: SPACING.small,
    paddingRight: SPACING.small,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.small,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.borderLight,
  },
});
