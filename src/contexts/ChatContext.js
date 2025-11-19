// src/contexts/ChatContext.js
// Context for managing chat interface state

import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useBudget } from './BudgetContext';
import { parseCommand } from '../services/nlpPatterns';
import { executeCommand } from '../services/commandExecutor';
import * as expenseService from '../services/expenseService';

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
  const { categories, currentBudget, budgetProgress } = useBudget();
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationState, setConversationState] = useState({});
  const [expenses, setExpenses] = useState([]);

  // Subscribe to expenses for real-time data
  useEffect(() => {
    if (!userDetails?.coupleId) {
      setExpenses([]);
      return;
    }

    const unsubscribe = expenseService.subscribeToExpenses(
      userDetails.coupleId,
      (newExpenses) => {
        setExpenses(newExpenses);
      }
    );

    return () => unsubscribe && unsubscribe();
  }, [userDetails?.coupleId]);

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

    try {
      // Parse the command using NLP
      const parsed = parseCommand(text);

      // Build context for command execution
      const context = {
        categories,
        currentBudget,
        budgetProgress,
        expenses,
        userDetails,
      };

      // Execute the command
      const result = await executeCommand(parsed.intent, parsed.entities, context);

      // Add small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 400));

      setIsTyping(false);

      // Add assistant response
      addMessage('assistant', result.message, {
        intent: parsed.intent,
        success: result.success,
        data: result.data,
      });

    } catch (error) {
      console.error('Error processing message:', error);
      setIsTyping(false);
      addMessage('assistant', '❌ Sorry, something went wrong. Please try again.', {
        error: error.message,
      });
    }
  }, [addMessage, categories, currentBudget, budgetProgress, expenses, userDetails]);

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
