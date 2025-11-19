// src/contexts/AuthContext.js
// Authentication context for managing user state across the app

import React, { createContext, useState, useEffect, useContext } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// Create the context
const AuthContext = createContext({});

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          console.log('AuthContext: Auth state changed, user logged in:', firebaseUser.uid);
          setUser(firebaseUser);

          // Fetch additional user details from Firestore
          console.log('AuthContext: Fetching user document from Firestore...');
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('AuthContext: User document fetched:', userData);
            setUserDetails(userData);
          } else {
            // User document doesn't exist - create a minimal one with multi-account structure
            console.warn('User document not found, creating minimal user details');
            const minimalUserDetails = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              accounts: [], // Array of accounts
              activeAccountId: null, // No active account yet
            };
            setUserDetails(minimalUserDetails);
          }
        } else {
          console.log('AuthContext: Auth state changed, user logged out');
          setUser(null);
          setUserDetails(null);
        }
      } catch (err) {
        console.error('Error in auth state change:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });

    // Cleanup subscription
    return unsubscribe;
  }, []);

  // Sign up with email and password
  const signUp = async (email, password, displayName) => {
    try {
      setError(null);
      setLoading(true);

      // Create user in Firebase Auth
      console.log('Creating Firebase Auth user...');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const { user: firebaseUser } = userCredential;
      console.log('✓ Firebase Auth user created:', firebaseUser.uid);

      // Create user document in Firestore with new multi-account structure
      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: displayName,
        accounts: [], // Array of accounts (solo and couple budgets)
        activeAccountId: null, // Currently selected account
        createdAt: new Date().toISOString(),
        settings: {
          notifications: true,
          defaultSplit: 50,
          currency: 'USD',
        },
      };

      console.log('Creating Firestore user document...');
      await setDoc(doc(db, 'users', firebaseUser.uid), userData);
      console.log('✓ Firestore user document created');
      setUserDetails(userData);

      return firebaseUser;
    } catch (err) {
      console.error('Sign up error:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign in with email and password
  const signIn = async (email, password) => {
    try {
      setError(null);
      setLoading(true);

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const { user: firebaseUser } = userCredential;

      // Fetch user details
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        setUserDetails(userDoc.data());
      }

      return firebaseUser;
    } catch (err) {
      console.error('Sign in error:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setError(null);
      await firebaseSignOut(auth);
      setUser(null);
      setUserDetails(null);
    } catch (err) {
      console.error('Sign out error:', err);
      setError(err.message);
      throw err;
    }
  };

  // Update user details in Firestore
  const updateUserDetails = async (updates) => {
    try {
      if (!user) throw new Error('No user logged in');

      setError(null);
      await updateDoc(doc(db, 'users', user.uid), updates);
      
      // Update local state
      setUserDetails(prev => ({ ...prev, ...updates }));
    } catch (err) {
      console.error('Update user details error:', err);
      setError(err.message);
      throw err;
    }
  };

  // Set active account for the user
  const setActiveAccount = async (accountId) => {
    try {
      if (!user) throw new Error('No user logged in');

      console.log('AuthContext: setActiveAccount called with accountId:', accountId);
      setError(null);

      // Verify account exists in user's accounts
      const accounts = userDetails?.accounts || [];
      const accountExists = accounts.some(acc => acc.accountId === accountId);

      if (!accountExists) {
        throw new Error('Account not found in user accounts');
      }

      await updateDoc(doc(db, 'users', user.uid), {
        activeAccountId: accountId
      });

      console.log('AuthContext: Firestore updated, now updating local state');
      setUserDetails(prev => {
        const newState = { ...prev, activeAccountId: accountId };
        console.log('AuthContext: New userDetails state:', newState);
        return newState;
      });
      console.log('AuthContext: setActiveAccount complete');
    } catch (err) {
      console.error('Set active account error:', err);
      setError(err.message);
      throw err;
    }
  };

  // Legacy function for backward compatibility during transition
  // This will be replaced by account management functions
  const updatePartnerInfo = async (partnerId, coupleId) => {
    console.warn('updatePartnerInfo is deprecated. Use account management functions instead.');
    // This function is kept for backward compatibility but should not be used
    // It will be removed once all screens are updated to use the new account system
    try {
      if (!user) throw new Error('No user logged in');
      setError(null);
      const updates = { partnerId, coupleId };
      await updateDoc(doc(db, 'users', user.uid), updates);
      setUserDetails(prev => ({ ...prev, ...updates }));
    } catch (err) {
      console.error('Update partner info error:', err);
      setError(err.message);
      throw err;
    }
  };

  // Get partner details
  const getPartnerDetails = async () => {
    try {
      if (!userDetails?.partnerId) return null;

      const partnerDoc = await getDoc(doc(db, 'users', userDetails.partnerId));
      if (partnerDoc.exists()) {
        return partnerDoc.data();
      }
      return null;
    } catch (err) {
      console.error('Get partner details error:', err);
      return null;
    }
  };

  // Check if user has any accounts (solo or couple)
  const hasPartner = () => {
    // Return true if user has at least one account
    return userDetails?.accounts && userDetails.accounts.length > 0;
  };

  // Check if user has an active account selected
  const hasActiveAccount = () => {
    return userDetails?.activeAccountId != null;
  };

  // Sign in with Google (OAuth)
  const signInWithGoogle = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();

      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      // Check if user document exists, create if not
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

      if (!userDoc.exists()) {
        // Create user document for new OAuth user with multi-account structure
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          accounts: [], // Array of accounts (solo and couple budgets)
          activeAccountId: null, // Currently selected account
          createdAt: new Date().toISOString(),
          settings: {
            notifications: true,
            defaultSplit: 50,
            currency: 'USD',
          },
        };

        await setDoc(doc(db, 'users', firebaseUser.uid), userData);
        console.log('Created user document for new Google sign-in user');
      }

      return firebaseUser;
    } catch (err) {
      console.error('Google sign-in error:', err);

      // Handle specific errors
      if (err.code === 'auth/operation-not-allowed') {
        setError('Google sign-in is not enabled. Please enable it in Firebase Console → Authentication → Sign-in method → Google');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked. Please allow popups for this site.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled');
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with the same email. Try a different sign-in method.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized. Add it in Firebase Console → Authentication → Settings → Authorized domains');
      } else {
        setError(err.message || 'Failed to sign in with Google');
      }
      throw err;
    }
  };

  // Sign in with Apple (OAuth)
  const signInWithApple = async () => {
    try {
      setError(null);
      const provider = new OAuthProvider('apple.com');

      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      // Check if user document exists, create if not
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

      if (!userDoc.exists()) {
        // Create user document for new OAuth user with multi-account structure
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          accounts: [], // Array of accounts (solo and couple budgets)
          activeAccountId: null, // Currently selected account
          createdAt: new Date().toISOString(),
          settings: {
            notifications: true,
            defaultSplit: 50,
            currency: 'USD',
          },
        };

        await setDoc(doc(db, 'users', firebaseUser.uid), userData);
        console.log('Created user document for new Apple sign-in user');
      }

      return firebaseUser;
    } catch (err) {
      console.error('Apple sign-in error:', err);

      // Handle specific errors
      if (err.code === 'auth/operation-not-allowed') {
        setError('Apple sign-in is not enabled. Please enable it in Firebase Console → Authentication → Sign-in method → Apple (requires Apple Developer account)');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked. Please allow popups for this site.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled');
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with the same email. Try a different sign-in method.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized. Add it in Firebase Console → Authentication → Settings → Authorized domains');
      } else {
        setError(err.message || 'Failed to sign in with Apple');
      }
      throw err;
    }
  };

  // Value provided to consumers
  const value = {
    user,
    userDetails,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    signInWithGoogle,
    signInWithApple,
    updateUserDetails,
    updatePartnerInfo, // Deprecated - kept for backward compatibility
    getPartnerDetails,
    hasPartner, // Now checks if user has any accounts
    hasActiveAccount, // New: Check if user has selected an active account
    setActiveAccount, // New: Set the active account
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
