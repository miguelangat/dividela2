// src/contexts/ChatContext.js
// Context for managing chat interface state

import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useBudget } from './BudgetContext';
import { parseCommand } from '../services/nlpPatterns';
import { executeCommand, handleConfirmedDeletion } from '../services/commandExecutor';
import * as expenseService from '../services/expenseService';
import {
  processConversationalInput,
  createConversationContext,
  CONFIRMATION_ACTIONS,
} from '../services/conversationManager';

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
  const [conversationContext, setConversationContext] = useState(createConversationContext());
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
      // First, check if this is part of an ongoing conversation
      const conversationalResponse = processConversationalInput(text, conversationContext);

      // Handle conversational responses (confirmations, selections, etc.)
      if (!conversationalResponse.newCommand) {
        // This is a response to an ongoing conversation

        if (!conversationalResponse.understood) {
          // User input not understood in conversation context
          setIsTyping(false);
          addMessage('assistant', conversationalResponse.message);
          return;
        }

        if (conversationalResponse.cancelled) {
          // User cancelled the operation
          setIsTyping(false);
          setConversationContext(createConversationContext()); // Reset
          addMessage('assistant', conversationalResponse.message);
          return;
        }

        // Handle confirmed actions
        if (conversationalResponse.confirmed !== undefined) {
          const { confirmed, action, data } = conversationalResponse;

          if (!confirmed) {
            // User declined
            setIsTyping(false);
            setConversationContext(createConversationContext()); // Reset
            addMessage('assistant', '✅ Cancelled.');
            return;
          }

          // User confirmed - execute the action
          let result;

          if (action === CONFIRMATION_ACTIONS.DELETE_EXPENSE) {
            result = await handleConfirmedDeletion(data.expenseId);
          } else {
            result = {
              success: false,
              message: 'Unknown confirmation action.',
            };
          }

          // Add small delay for better UX
          await new Promise(resolve => setTimeout(resolve, 400));

          setIsTyping(false);
          setConversationContext(createConversationContext()); // Reset
          addMessage('assistant', result.message);
          return;
        }

        // Handle category disambiguation
        if (conversationalResponse.selectedCategory) {
          const { selectedCategory, originalIntent, originalEntities } = conversationalResponse;

          // Update entities with selected category
          originalEntities.categoryText = selectedCategory.category.name;
          originalEntities.selectedCategoryKey = selectedCategory.key;

          // Build context for command execution
          const context = {
            categories,
            currentBudget,
            budgetProgress,
            expenses,
            userDetails,
          };

          // Execute the original command with the selected category
          const result = await executeCommand(originalIntent, originalEntities, context);

          // Add small delay for better UX
          await new Promise(resolve => setTimeout(resolve, 400));

          setIsTyping(false);
          setConversationContext(createConversationContext()); // Reset
          addMessage('assistant', result.message, {
            intent: originalIntent,
            success: result.success,
            data: result.data,
          });
          return;
        }
      }

      // This is a new command - parse and execute normally
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

      // Check if command needs confirmation or follow-up
      if (result.needsConfirmation && result.confirmationContext) {
        // Store the confirmation context for next message
        setConversationContext(result.confirmationContext);
      } else if (result.categoryDisambiguation) {
        // Store the disambiguation context for next message
        setConversationContext(result.categoryDisambiguation);
      } else {
        // Reset conversation context
        setConversationContext(createConversationContext());
      }

      // Add assistant response
      addMessage('assistant', result.message, {
        intent: parsed.intent,
        success: result.success,
        data: result.data,
      });

    } catch (error) {
      console.error('Error processing message:', error);
      setIsTyping(false);
      setConversationContext(createConversationContext()); // Reset on error
      addMessage('assistant', '❌ Sorry, something went wrong. Please try again.', {
        error: error.message,
      });
    }
  }, [addMessage, categories, currentBudget, budgetProgress, expenses, userDetails, conversationContext]);

  // Clear all messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationContext(createConversationContext());
  }, []);

  // Update conversation context (for multi-turn conversations)
  const updateConversationContext = useCallback((updates) => {
    setConversationContext(prev => ({ ...prev, ...updates }));
  }, []);

  const value = {
    messages,
    isTyping,
    conversationContext,
    sendMessage,
    addMessage,
    clearMessages,
    updateConversationContext,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
