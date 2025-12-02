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
  signInWithPopup,
  updatePassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
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
    let userDocUnsubscribe = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          console.log('AuthContext: Auth state changed, user logged in:', firebaseUser.uid);
          setUser(firebaseUser);

          // Set up real-time listener for user document
          console.log('AuthContext: Setting up real-time listener for user document...');
          const userRef = doc(db, 'users', firebaseUser.uid);

          userDocUnsubscribe = onSnapshot(
            userRef,
            (snapshot) => {
              if (snapshot.exists()) {
                const userData = snapshot.data();
                console.log('🔄 User details updated from Firestore:', {
                  subscriptionStatus: userData.subscriptionStatus,
                  manuallyGranted: userData.manuallyGranted,
                  subscriptionExpiresAt: userData.subscriptionExpiresAt,
                });
                setUserDetails(userData);
              } else {
                // User document doesn't exist - create a minimal one
                console.warn('User document not found, creating minimal user details');
                const minimalUserDetails = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                  partnerId: null,
                  coupleId: null,
                  subscriptionStatus: 'free',
                  subscriptionPlatform: null,
                  subscriptionExpiresAt: null,
                  subscriptionProductId: null,
                  revenueCatUserId: firebaseUser.uid,
                  trialUsed: false,
                  trialEndsAt: null,
                };
                setUserDetails(minimalUserDetails);
              }
              setLoading(false);
            },
            (error) => {
              console.error('Error listening to user details:', error);
              // Fallback to one-time fetch on error
              getDoc(userRef).then(doc => {
                if (doc.exists()) {
                  setUserDetails(doc.data());
                }
                setLoading(false);
              }).catch(err => {
                console.error('Fallback getDoc also failed:', err);
                setLoading(false);
              });
            }
          );
        } else {
          console.log('AuthContext: Auth state changed, user logged out');
          setUser(null);
          setUserDetails(null);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error in auth state change:', err);
        setError(err.message);
        setLoading(false);
      }
    });

    // Cleanup subscriptions
    return () => {
      authUnsubscribe();
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
      }
    };
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

      // Create user document in Firestore
      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: displayName,
        partnerId: null,
        coupleId: null,
        createdAt: new Date().toISOString(),
        settings: {
          notifications: true,
          defaultSplit: 50,
          currency: 'USD',
        },
        // Subscription fields
        subscriptionStatus: 'free', // 'free' | 'premium' | 'trial' | 'expired'
        subscriptionPlatform: null, // 'ios' | 'android' | 'web' | null
        subscriptionExpiresAt: null,
        subscriptionProductId: null,
        revenueCatUserId: firebaseUser.uid, // Links to RevenueCat
        trialUsed: false,
        trialEndsAt: null,
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

      // Map Firebase error codes to user-friendly messages
      let userMessage = 'An error occurred. Please try again.';

      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          // Generic message for security - don't reveal if email exists
          userMessage = 'Invalid email or password. Please check your credentials and try again.';
          break;
        case 'auth/invalid-email':
          userMessage = 'Invalid email address format.';
          break;
        case 'auth/user-disabled':
          userMessage = 'This account has been disabled. Please contact support.';
          break;
        case 'auth/too-many-requests':
          userMessage = 'Too many failed login attempts. Please try again later or reset your password.';
          break;
        case 'auth/network-request-failed':
          userMessage = 'Network error. Please check your internet connection and try again.';
          break;
        default:
          userMessage = err.message || 'Failed to sign in. Please try again.';
      }

      setError(userMessage);

      // Create a new error with the user-friendly message
      const userError = new Error(userMessage);
      userError.code = err.code;
      throw userError;
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

  // Update partner and couple information
  const updatePartnerInfo = async (partnerId, coupleId) => {
    try {
      if (!user) throw new Error('No user logged in');

      console.log('AuthContext: updatePartnerInfo called with partnerId:', partnerId, 'coupleId:', coupleId);
      setError(null);
      const updates = { partnerId, coupleId };

      await updateDoc(doc(db, 'users', user.uid), updates);
      console.log('AuthContext: Firestore updated, now updating local state');
      setUserDetails(prev => {
        const newState = { ...prev, ...updates };
        console.log('AuthContext: New userDetails state:', newState);
        return newState;
      });
      console.log('AuthContext: updatePartnerInfo complete');
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

  // Check if user has a partner
  const hasPartner = () => {
    return userDetails?.partnerId != null && userDetails?.coupleId != null;
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
        // Create user document for new OAuth user
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          partnerId: null,
          coupleId: null,
          createdAt: new Date(),
          settings: {
            notifications: true,
            defaultSplit: 50,
            currency: 'USD',
          },
          // Subscription fields
          subscriptionStatus: 'free',
          subscriptionPlatform: null,
          subscriptionExpiresAt: null,
          subscriptionProductId: null,
          revenueCatUserId: firebaseUser.uid,
          trialUsed: false,
          trialEndsAt: null,
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
        // Create user document for new OAuth user
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          partnerId: null,
          coupleId: null,
          createdAt: new Date(),
          settings: {
            notifications: true,
            defaultSplit: 50,
            currency: 'USD',
          },
          // Subscription fields
          subscriptionStatus: 'free',
          subscriptionPlatform: null,
          subscriptionExpiresAt: null,
          subscriptionProductId: null,
          revenueCatUserId: firebaseUser.uid,
          trialUsed: false,
          trialEndsAt: null,
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

  // Change password (requires recent authentication)
  const changePassword = async (currentPassword, newPassword) => {
    try {
      if (!user) throw new Error('No user logged in');
      setError(null);

      // Check if user signed in with email/password
      const providerData = user.providerData;
      const hasEmailProvider = providerData.some(p => p.providerId === 'password');

      if (!hasEmailProvider) {
        throw new Error('Password change is only available for email/password accounts. You signed in with a social provider.');
      }

      // Reauthenticate user with current password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);
      console.log('✓ Password updated successfully');

      return true;
    } catch (err) {
      console.error('Change password error:', err);

      // Handle specific errors
      if (err.code === 'auth/wrong-password') {
        setError('Current password is incorrect');
      } else if (err.code === 'auth/weak-password') {
        setError('New password is too weak. Please use at least 6 characters.');
      } else if (err.code === 'auth/requires-recent-login') {
        setError('For security, please sign out and sign in again before changing your password');
      } else {
        setError(err.message);
      }
      throw err;
    }
  };

  // Delete account (requires recent authentication)
  const deleteAccount = async (password = null) => {
    try {
      if (!user) throw new Error('No user logged in');
      setError(null);

      // Check provider type
      const providerData = user.providerData;
      const hasEmailProvider = providerData.some(p => p.providerId === 'password');
      const hasGoogleProvider = providerData.some(p => p.providerId === 'google.com');
      const hasAppleProvider = providerData.some(p => p.providerId === 'apple.com');

      // Reauthenticate based on provider
      if (hasEmailProvider) {
        if (!password) {
          throw new Error('Password is required to delete account');
        }
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
      } else if (hasGoogleProvider) {
        const provider = new GoogleAuthProvider();
        await reauthenticateWithPopup(user, provider);
      } else if (hasAppleProvider) {
        const provider = new OAuthProvider('apple.com');
        await reauthenticateWithPopup(user, provider);
      }

      // Delete user data from Firestore
      const userId = user.uid;

      // If user has a partner, we should handle couple data cleanup
      if (userDetails?.coupleId) {
        console.log('⚠️ User has couple data. Consider implementing cleanup logic.');
        // TODO: Implement couple data cleanup if needed
        // For now, we'll just delete the user document
      }

      // Delete user document from Firestore
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        deleted: true,
        deletedAt: new Date().toISOString(),
      });

      // Delete the Firebase Auth account
      await deleteUser(user);
      console.log('✓ Account deleted successfully');

      // Clear local state
      setUser(null);
      setUserDetails(null);

      return true;
    } catch (err) {
      console.error('Delete account error:', err);

      // Handle specific errors
      if (err.code === 'auth/wrong-password') {
        setError('Password is incorrect');
      } else if (err.code === 'auth/requires-recent-login') {
        setError('For security, please sign out and sign in again before deleting your account');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Account deletion cancelled');
      } else {
        setError(err.message);
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
    updatePartnerInfo,
    getPartnerDetails,
    hasPartner,
    changePassword,
    deleteAccount,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
