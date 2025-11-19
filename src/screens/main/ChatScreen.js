// src/screens/main/ChatScreen.js
// Main chat interface screen

import React, { useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Text,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useChat } from '../../contexts/ChatContext';
import MessageBubble from '../../components/chat/MessageBubble';
import ChatInput from '../../components/chat/ChatInput';
import QuickActionChips from '../../components/chat/QuickActionChips';
import TypingIndicator from '../../components/chat/TypingIndicator';
import { COLORS, FONTS, SPACING, COMMON_STYLES } from '../../constants/theme';

export default function ChatScreen() {
  const { t } = useTranslation();
  const { messages, isTyping, sendMessage, clearMessages } = useChat();
  const flatListRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isTyping]);

  const handleSend = (text) => {
    sendMessage(text);
  };

  const handleQuickAction = (command) => {
    sendMessage(command);
  };

  const renderMessage = ({ item }) => (
    <MessageBubble message={item} />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="chatbubbles-outline" size={64} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>{t('chat.emptyStateTitle')}</Text>
      <Text style={styles.emptySubtitle}>
        {t('chat.emptyStateSubtitle')}
      </Text>
      <Text style={styles.emptyHint}>
        {t('chat.emptyStateHint')}
      </Text>
      <View style={styles.examplesList}>
        <Text style={styles.exampleItem}>• {t('chat.emptyStateExample1')}</Text>
        <Text style={styles.exampleItem}>• {t('chat.emptyStateExample2')}</Text>
        <Text style={styles.exampleItem}>• {t('chat.emptyStateExample3')}</Text>
        <Text style={styles.exampleItem}>• {t('chat.emptyStateExample4')}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarContainer}>
            <Ionicons name="chatbot" size={24} color={COLORS.textWhite} />
          </View>
          <View>
            <Text style={styles.headerTitle}>{t('chat.title')}</Text>
            <Text style={styles.headerSubtitle}>
              {isTyping ? t('chat.subtitleTyping') : t('chat.subtitle')}
            </Text>
          </View>
        </View>
        {messages.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearMessages}
          >
            <Ionicons name="trash-outline" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.messagesList,
          messages.length === 0 && styles.messagesListEmpty,
        ]}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={isTyping ? <TypingIndicator /> : null}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Quick Actions */}
      <QuickActionChips
        onSelectAction={handleQuickAction}
        visible={messages.length === 0}
      />

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isTyping} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.medium,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.medium,
  },
  headerTitle: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  clearButton: {
    padding: SPACING.small,
  },
  messagesList: {
    flexGrow: 1,
    paddingVertical: SPACING.base,
  },
  messagesListEmpty: {
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xxlarge,
  },
  emptyIcon: {
    marginBottom: SPACING.large,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.heading,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.small,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.large,
    lineHeight: FONTS.sizes.body * 1.5,
  },
  emptyHint: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.medium,
    color: COLORS.text,
    marginBottom: SPACING.medium,
  },
  examplesList: {
    alignSelf: 'stretch',
  },
  exampleItem: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.small,
    paddingLeft: SPACING.base,
  },
});
