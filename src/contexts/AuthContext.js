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
import { initializeUserReferral } from '../services/referralService';

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
            // User document doesn't exist - create a minimal one
            console.warn('User document not found, creating minimal user details');
            const minimalUserDetails = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              partnerId: null,
              coupleId: null,
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
  const signUp = async (email, password, displayName, referralCode = null) => {
    try {
      setError(null);
      setLoading(true);

      // Create user in Firebase Auth
      console.log('Creating Firebase Auth user...');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const { user: firebaseUser } = userCredential;
      console.log('✓ Firebase Auth user created:', firebaseUser.uid);

      // Initialize referral data
      console.log('Initializing referral data...');
      const referralData = await initializeUserReferral(firebaseUser.uid, referralCode);
      console.log('✓ Referral data initialized:', referralData);

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
        ...referralData,
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
  const signInWithGoogle = async (referralCode = null) => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();

      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      // Check if user document exists, create if not
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

      if (!userDoc.exists()) {
        // Initialize referral data for new OAuth user
        console.log('Initializing referral data for new Google user...');
        const referralData = await initializeUserReferral(firebaseUser.uid, referralCode);

        // Create user document for new OAuth user
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          partnerId: null,
          coupleId: null,
          createdAt: new Date(),
          ...referralData,
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
  const signInWithApple = async (referralCode = null) => {
    try {
      setError(null);
      const provider = new OAuthProvider('apple.com');

      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      // Check if user document exists, create if not
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

      if (!userDoc.exists()) {
        // Initialize referral data for new OAuth user
        console.log('Initializing referral data for new Apple user...');
        const referralData = await initializeUserReferral(firebaseUser.uid, referralCode);

        // Create user document for new OAuth user
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          partnerId: null,
          coupleId: null,
          createdAt: new Date(),
          ...referralData,
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
    updatePartnerInfo,
    getPartnerDetails,
    hasPartner,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
