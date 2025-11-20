// src/__tests__/contexts/AuthContext.test.js
// Integration tests for AuthContext user CRUD operations

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

describe('AuthContext - User CRUD Operations', () => {
  let mockUser;
  let mockUserDetails;
  let authStateChangedCallback;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock user data
    mockUser = {
      uid: 'test-user-id',
      email: 'test@example.com',
      displayName: 'Test User',
    };

    mockUserDetails = {
      uid: 'test-user-id',
      email: 'test@example.com',
      displayName: 'Test User',
      partnerId: null,
      coupleId: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      settings: {
        notifications: true,
        defaultSplit: 50,
        currency: 'USD',
      },
    };

    // Mock onAuthStateChanged to call immediately with null (no user)
    onAuthStateChanged.mockImplementation((auth, callback) => {
      authStateChangedCallback = callback;
      setTimeout(() => callback(null), 0);
      return jest.fn(); // unsubscribe function
    });

    // Mock getDoc to return user details
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockUserDetails,
    });
  });

  describe('User Creation (signUp)', () => {
    it('should create a new user with email and password', async () => {
      createUserWithEmailAndPassword.mockResolvedValue({
        user: mockUser,
      });

      setDoc.mockResolvedValue();

      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initial auth state
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let createdUser;
      await act(async () => {
        createdUser = await result.current.signUp('test@example.com', 'password123', 'Test User');
      });

      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        'password123'
      );

      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          uid: 'test-user-id',
          email: 'test@example.com',
          displayName: 'Test User',
          partnerId: null,
          coupleId: null,
          settings: {
            notifications: true,
            defaultSplit: 50,
            currency: 'USD',
          },
        })
      );

      expect(createdUser).toEqual(mockUser);
    });

    it('should handle signup errors', async () => {
      const error = new Error('Email already in use');
      createUserWithEmailAndPassword.mockRejectedValue(error);

      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.signUp('test@example.com', 'password123', 'Test User');
        } catch (e) {
          expect(e.message).toBe('Email already in use');
        }
      });

      expect(result.current.error).toBe('Email already in use');
    });

    it('should create user document with correct structure', async () => {
      createUserWithEmailAndPassword.mockResolvedValue({
        user: mockUser,
      });

      setDoc.mockResolvedValue();

      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signUp('test@example.com', 'password123', 'Test User');
      });

      const setDocCall = setDoc.mock.calls[0][1];
      expect(setDocCall).toMatchObject({
        uid: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        partnerId: null,
        coupleId: null,
        settings: {
          notifications: true,
          defaultSplit: 50,
          currency: 'USD',
        },
      });
      expect(setDocCall.createdAt).toBeDefined();
    });
  });

  describe('User Authentication (signIn)', () => {
    it('should sign in user with email and password', async () => {
      signInWithEmailAndPassword.mockResolvedValue({
        user: mockUser,
      });

      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let signedInUser;
      await act(async () => {
        signedInUser = await result.current.signIn('test@example.com', 'password123');
      });

      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        'password123'
      );

      expect(getDoc).toHaveBeenCalled();
      expect(signedInUser).toEqual(mockUser);
    });

    it('should fetch user details after sign in', async () => {
      signInWithEmailAndPassword.mockResolvedValue({
        user: mockUser,
      });

      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      await waitFor(() => {
        expect(result.current.userDetails).toEqual(mockUserDetails);
      });
    });

    it('should handle sign in errors', async () => {
      const error = new Error('Invalid credentials');
      signInWithEmailAndPassword.mockRejectedValue(error);

      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.signIn('test@example.com', 'wrongpassword');
        } catch (e) {
          expect(e.message).toBe('Invalid credentials');
        }
      });

      expect(result.current.error).toBe('Invalid credentials');
    });
  });

  describe('User Updates (updateUserDetails)', () => {
    it('should update user details in Firestore', async () => {
      signInWithEmailAndPassword.mockResolvedValue({
        user: mockUser,
      });

      updateDoc.mockResolvedValue();

      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Sign in first
      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      // Simulate auth state change
      await act(async () => {
        authStateChangedCallback(mockUser);
      });

      await waitFor(() => {
        expect(result.current.user).toBeTruthy();
      });

      // Update user details
      await act(async () => {
        await result.current.updateUserDetails({
          displayName: 'Updated Name',
        });
      });

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { displayName: 'Updated Name' }
      );

      expect(result.current.userDetails.displayName).toBe('Updated Name');
    });

    it('should throw error if no user is logged in', async () => {
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.updateUserDetails({ displayName: 'Test' });
        } catch (e) {
          expect(e.message).toBe('No user logged in');
        }
      });
    });

    it('should update partner information', async () => {
      signInWithEmailAndPassword.mockResolvedValue({
        user: mockUser,
      });

      updateDoc.mockResolvedValue();

      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Sign in first
      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      await act(async () => {
        authStateChangedCallback(mockUser);
      });

      await waitFor(() => {
        expect(result.current.user).toBeTruthy();
      });

      // Update partner info
      await act(async () => {
        await result.current.updatePartnerInfo('partner-id', 'couple-id');
      });

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { partnerId: 'partner-id', coupleId: 'couple-id' }
      );

      expect(result.current.userDetails.partnerId).toBe('partner-id');
      expect(result.current.userDetails.coupleId).toBe('couple-id');
    });
  });

  describe('User Queries (Read operations)', () => {
    it('should get partner details', async () => {
      const partnerDetails = {
        uid: 'partner-id',
        email: 'partner@example.com',
        displayName: 'Partner User',
      };

      signInWithEmailAndPassword.mockResolvedValue({
        user: mockUser,
      });

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ ...mockUserDetails, partnerId: 'partner-id' }),
      }).mockResolvedValueOnce({
        exists: () => true,
        data: () => partnerDetails,
      });

      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      await act(async () => {
        authStateChangedCallback(mockUser);
      });

      let partner;
      await act(async () => {
        partner = await result.current.getPartnerDetails();
      });

      expect(partner).toEqual(partnerDetails);
    });

    it('should return null if no partner', async () => {
      signInWithEmailAndPassword.mockResolvedValue({
        user: mockUser,
      });

      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      await act(async () => {
        authStateChangedCallback(mockUser);
      });

      let partner;
      await act(async () => {
        partner = await result.current.getPartnerDetails();
      });

      expect(partner).toBeNull();
    });

    it('should check if user has partner', async () => {
      signInWithEmailAndPassword.mockResolvedValue({
        user: mockUser,
      });

      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      await act(async () => {
        authStateChangedCallback(mockUser);
      });

      await waitFor(() => {
        expect(result.current.userDetails).toBeTruthy();
      });

      expect(result.current.hasPartner()).toBe(false);

      // Update to have partner
      await act(async () => {
        await result.current.updatePartnerInfo('partner-id', 'couple-id');
      });

      expect(result.current.hasPartner()).toBe(true);
    });
  });

  describe('User Sign Out', () => {
    it('should sign out user', async () => {
      firebaseSignOut.mockResolvedValue();

      signInWithEmailAndPassword.mockResolvedValue({
        user: mockUser,
      });

      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Sign in first
      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      await act(async () => {
        authStateChangedCallback(mockUser);
      });

      // Sign out
      await act(async () => {
        await result.current.signOut();
      });

      expect(firebaseSignOut).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.userDetails).toBeNull();
    });

    it('should handle sign out errors', async () => {
      const error = new Error('Sign out failed');
      firebaseSignOut.mockRejectedValue(error);

      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.signOut();
        } catch (e) {
          expect(e.message).toBe('Sign out failed');
        }
      });

      expect(result.current.error).toBe('Sign out failed');
    });
  });

  describe('Auth State Management', () => {
    it('should handle auth state changes', async () => {
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();

      // Simulate user login via auth state change
      await act(async () => {
        authStateChangedCallback(mockUser);
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.userDetails).toEqual(mockUserDetails);
      });
    });

    it('should create minimal user details if document not found', async () => {
      getDoc.mockResolvedValue({
        exists: () => false,
      });

      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        authStateChangedCallback(mockUser);
      });

      await waitFor(() => {
        expect(result.current.userDetails).toMatchObject({
          uid: 'test-user-id',
          email: 'test@example.com',
          partnerId: null,
          coupleId: null,
        });
      });
    });

    it('should handle errors in auth state change', async () => {
      getDoc.mockRejectedValue(new Error('Firestore error'));

      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        authStateChangedCallback(mockUser);
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Firestore error');
        expect(result.current.loading).toBe(false);
      });
    });
  });
});
