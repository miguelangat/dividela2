// src/__tests__/helpers/referralMocks.js
// Mock data and utilities for referral system tests

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// MOCK USER DATA
// ============================================================================

export const mockUserWithReferral = {
  id: 'user123',
  email: 'test@example.com',
  displayName: 'Test User',
  referralCode: 'ABC123',
  referredBy: null,
  referredByUserId: null,
  premiumStatus: 'free',
  premiumSource: null,
  premiumUnlockedAt: null,
  premiumExpiresAt: null,
  referralCount: 0,
  referralsPending: [],
  referralsCompleted: [],
  createdAt: Timestamp.now(),
};

export const mockPremiumUser = {
  ...mockUserWithReferral,
  id: 'premium123',
  referralCode: 'XYZ789',
  premiumStatus: 'premium',
  premiumSource: 'referral',
  premiumUnlockedAt: Timestamp.now(),
  premiumExpiresAt: null, // Forever
  referralCount: 1,
  referralsCompleted: ['ref123'],
};

export const mockReferredUser = {
  ...mockUserWithReferral,
  id: 'referred456',
  referralCode: 'DEF456',
  referredBy: 'ABC123',
  referredByUserId: 'user123',
  premiumStatus: 'premium',
  premiumSource: 'referral_bonus',
  premiumExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
};

// ============================================================================
// MOCK REFERRAL DATA
// ============================================================================

export const mockPendingReferral = {
  id: 'ref123',
  referrerUserId: 'user123',
  referredUserId: 'referred456',
  referredCoupleId: null,
  status: 'pending',
  createdAt: Timestamp.now(),
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  completedAt: null,
};

export const mockCompletedReferral = {
  ...mockPendingReferral,
  id: 'ref789',
  referredCoupleId: 'couple789',
  status: 'completed',
  completedAt: Timestamp.now(),
};

export const mockExpiredReferral = {
  ...mockPendingReferral,
  id: 'ref_expired',
  status: 'expired',
  createdAt: Timestamp.fromDate(new Date(Date.now() - 25 * 60 * 60 * 1000)), // 25 hours ago
  expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago (expired)
};

// ============================================================================
// MOCK COUPLE DATA
// ============================================================================

export const mockCouple = {
  id: 'couple123',
  user1Id: 'user123',
  user2Id: 'referred456',
  createdAt: Timestamp.now(),
};

// ============================================================================
// TIME HELPERS
// ============================================================================

/**
 * Create a referral that's about to expire (< 1 hour remaining)
 */
export const createExpiringReferral = () => ({
  ...mockPendingReferral,
  id: 'ref_expiring',
  createdAt: Timestamp.fromDate(new Date(Date.now() - 23.5 * 60 * 60 * 1000)), // 23.5 hours ago
  expiresAt: new Date(Date.now() + 0.5 * 60 * 60 * 1000), // 30 minutes remaining
});

/**
 * Create a referral from a specific time ago
 * @param {number} hoursAgo - Hours before now
 */
export const createReferralFromHoursAgo = (hoursAgo) => ({
  ...mockPendingReferral,
  id: `ref_${hoursAgo}h`,
  createdAt: Timestamp.fromDate(new Date(Date.now() - hoursAgo * 60 * 60 * 1000)),
  expiresAt: new Date(Date.now() + (24 - hoursAgo) * 60 * 60 * 1000),
});

/**
 * Create an expired referral from specific time ago
 * @param {number} hoursAgo - Hours before now (should be > 24)
 */
export const createExpiredReferralFromHoursAgo = (hoursAgo) => ({
  ...mockPendingReferral,
  id: `ref_expired_${hoursAgo}h`,
  status: 'pending', // Still pending but should be expired
  createdAt: Timestamp.fromDate(new Date(Date.now() - hoursAgo * 60 * 60 * 1000)),
  expiresAt: new Date(Date.now() - (hoursAgo - 24) * 60 * 60 * 1000),
});

// ============================================================================
// FIRESTORE MOCK HELPERS
// ============================================================================

/**
 * Reset all Firestore mocks
 */
export const resetFirestoreMocks = () => {
  const {
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    writeBatch,
    collection,
    doc,
    query,
    where,
    orderBy,
    serverTimestamp,
  } = require('firebase/firestore');

  jest.clearAllMocks();

  // Reset all mocks
  if (getDocs.mockReset) getDocs.mockReset();
  if (getDoc.mockReset) getDoc.mockReset();
  if (setDoc.mockReset) setDoc.mockReset();
  if (updateDoc.mockReset) updateDoc.mockReset();
  if (deleteDoc.mockReset) deleteDoc.mockReset();
  if (writeBatch.mockReset) writeBatch.mockReset();
};

/**
 * Mock getDocs to return specific documents
 * @param {Array} documents - Array of document data
 */
export const mockGetDocsResponse = (documents) => {
  const { getDocs } = require('firebase/firestore');

  const mockSnapshot = {
    empty: documents.length === 0,
    size: documents.length,
    docs: documents.map((doc) => ({
      id: doc.id,
      data: () => {
        const { id, ...rest } = doc;
        return rest;
      },
      exists: () => true,
    })),
    forEach: (callback) => {
      documents.forEach((doc) => {
        callback({
          id: doc.id,
          data: () => {
            const { id, ...rest } = doc;
            return rest;
          },
          exists: () => true,
        });
      });
    },
  };

  getDocs.mockResolvedValue(mockSnapshot);
  return mockSnapshot;
};

/**
 * Mock getDoc to return a specific document
 * @param {Object} document - Document data (or null for not found)
 */
export const mockGetDocResponse = (document) => {
  const { getDoc } = require('firebase/firestore');

  if (!document) {
    getDoc.mockResolvedValue({
      exists: () => false,
    });
    return;
  }

  const mockDoc = {
    id: document.id,
    exists: () => true,
    data: () => {
      const { id, ...rest } = document;
      return rest;
    },
  };

  getDoc.mockResolvedValue(mockDoc);
  return mockDoc;
};

/**
 * Mock setDoc success
 */
export const mockSetDocSuccess = () => {
  const { setDoc } = require('firebase/firestore');
  setDoc.mockResolvedValue();
};

/**
 * Mock updateDoc success
 */
export const mockUpdateDocSuccess = () => {
  const { updateDoc } = require('firebase/firestore');
  updateDoc.mockResolvedValue();
};

/**
 * Mock writeBatch for atomic operations
 */
export const mockWriteBatchSuccess = () => {
  const { writeBatch } = require('firebase/firestore');

  const mockBatch = {
    update: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn().mockResolvedValue(),
  };

  writeBatch.mockReturnValue(mockBatch);
  return mockBatch;
};

/**
 * Mock serverTimestamp
 */
export const mockServerTimestamp = () => {
  const { serverTimestamp } = require('firebase/firestore');
  serverTimestamp.mockReturnValue('mock-server-timestamp');
};

// ============================================================================
// SCENARIO HELPERS
// ============================================================================

/**
 * Setup mocks for a successful referral code lookup
 * @param {string} code - Referral code to lookup
 * @param {Object} referrerUser - User who owns the code
 */
export const setupReferralCodeLookup = (code, referrerUser) => {
  mockGetDocsResponse([referrerUser]);
};

/**
 * Setup mocks for a referral code that doesn't exist
 */
export const setupReferralCodeNotFound = () => {
  mockGetDocsResponse([]);
};

/**
 * Setup mocks for a successful referral completion scenario
 */
export const setupSuccessfulReferralCompletion = () => {
  const { getDocs, getDoc, writeBatch } = require('firebase/firestore');

  // Mock finding pending referral
  mockGetDocsResponse([mockPendingReferral]);

  // Mock fetching referrer user
  mockGetDocResponse(mockUserWithReferral);

  // Mock batch write
  mockWriteBatchSuccess();
};

/**
 * Setup mocks for a user with multiple referrals
 * @param {number} pendingCount - Number of pending referrals
 * @param {number} completedCount - Number of completed referrals
 * @param {number} expiredCount - Number of expired referrals
 */
export const setupUserWithMultipleReferrals = (
  pendingCount = 1,
  completedCount = 2,
  expiredCount = 1
) => {
  const { getDocs } = require('firebase/firestore');

  let callCount = 0;

  getDocs.mockImplementation(() => {
    callCount++;

    // First call: pending referrals
    if (callCount === 1) {
      const pending = Array.from({ length: pendingCount }, (_, i) => ({
        ...mockPendingReferral,
        id: `ref_pending_${i}`,
      }));
      return Promise.resolve(mockGetDocsResponse(pending));
    }

    // Second call: completed referrals
    if (callCount === 2) {
      const completed = Array.from({ length: completedCount }, (_, i) => ({
        ...mockCompletedReferral,
        id: `ref_completed_${i}`,
      }));
      return Promise.resolve(mockGetDocsResponse(completed));
    }

    // Third call: expired referrals
    if (callCount === 3) {
      const expired = Array.from({ length: expiredCount }, (_, i) => ({
        ...mockExpiredReferral,
        id: `ref_expired_${i}`,
      }));
      return Promise.resolve(mockGetDocsResponse(expired));
    }

    // Default: empty
    return Promise.resolve(mockGetDocsResponse([]));
  });
};

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Verify that a referral code is valid format
 * @param {string} code - Code to validate
 */
export const assertValidReferralCode = (code) => {
  expect(code).toBeDefined();
  expect(code).toHaveLength(6);
  expect(code).toMatch(/^[A-Z2-9]+$/);
  expect(code).not.toMatch(/[01OI]/); // No ambiguous characters
};

/**
 * Verify that premium was awarded correctly
 * @param {Object} updateCall - The updateDoc call arguments
 * @param {string} expectedSource - Expected premium source
 */
export const assertPremiumAwarded = (updateCall, expectedSource) => {
  expect(updateCall).toMatchObject({
    premiumStatus: 'premium',
    premiumSource: expectedSource,
  });
  expect(updateCall.premiumUnlockedAt).toBeDefined();
};

/**
 * Verify that a referral was completed correctly
 * @param {Object} referralUpdate - The referral update data
 * @param {string} coupleId - Expected couple ID
 */
export const assertReferralCompleted = (referralUpdate, coupleId) => {
  expect(referralUpdate).toMatchObject({
    status: 'completed',
    referredCoupleId: coupleId,
  });
  expect(referralUpdate.completedAt).toBeDefined();
};
