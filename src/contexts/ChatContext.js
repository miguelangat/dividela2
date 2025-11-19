// src/contexts/ChatContext.js
// Context for managing chat interface state

import React, { createContext, useState, useContext, useCallback } from 'react';
import { useAuth } from './AuthContext';

const ChatContext = createContext({});

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { userDetails } = useAuth();
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationState, setConversationState] = useState({});

  // Add a new message to the chat
  const addMessage = useCallback((role, content, metadata = {}) => {
    const newMessage = {
      id: Date.now().toString() + Math.random(),
      role, // 'user' or 'assistant'
      content,
      timestamp: new Date(),
      metadata,
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  // Send a user message and get a response
  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;

    // Add user message
    addMessage('user', text.trim());

    // Show typing indicator
    setIsTyping(true);

    // Simulate processing delay for prototype
    await new Promise(resolve => setTimeout(resolve, 800));

    // Generate mock response (will be replaced with real NLP)
    const response = generateMockResponse(text);

    setIsTyping(false);
    addMessage('assistant', response.content, response.metadata);
  }, [addMessage]);

  // Clear all messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationState({});
  }, []);

  // Update conversation state (for multi-turn conversations)
  const updateConversationState = useCallback((updates) => {
    setConversationState(prev => ({ ...prev, ...updates }));
  }, []);

  const value = {
    messages,
    isTyping,
    conversationState,
    sendMessage,
    addMessage,
    clearMessages,
    updateConversationState,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

// Mock response generator for prototype (will be replaced with real NLP)
function generateMockResponse(userInput) {
  const input = userInput.toLowerCase();

  // Expense patterns
  if (input.includes('add') || input.includes('spent') || input.includes('paid')) {
    const amountMatch = input.match(/\$?(\d+(?:\.\d{2})?)/);
    const amount = amountMatch ? amountMatch[1] : '0';

    return {
      content: `I'll help you add a $${amount} expense. This will be connected to the expense service soon!`,
      metadata: { type: 'expense_add', amount }
    };
  }

  // Budget queries
  if (input.includes('budget') || input.includes('spending')) {
    return {
      content: `Here's your budget overview:\n\n💰 Total Budget: $2,500\n✅ Spent: $1,840 (74%)\n📊 Remaining: $660\n\nYou're on track this month!`,
      metadata: { type: 'budget_query' }
    };
  }

  // Balance queries
  if (input.includes('balance') || input.includes('owe') || input.includes('settle')) {
    return {
      content: `Current balance:\n\n💵 Your partner owes you $127.50\n\nWould you like to settle up?`,
      metadata: { type: 'balance_query' }
    };
  }

  // Default response
  return {
    content: `I understand you want to: "${userInput}"\n\nI'm currently a prototype. Soon I'll be able to help you with:\n\n• Adding expenses\n• Checking budgets\n• Viewing balances\n• Managing categories\n• And more!`,
    metadata: { type: 'default' }
  };
}
