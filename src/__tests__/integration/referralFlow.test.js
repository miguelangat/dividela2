// src/__tests__/integration/referralFlow.test.js
// End-to-end tests for complete referral flows

import {
  generateReferralCode,
  initializeUserReferral,
  checkAndCompleteReferral,
  getReferralStats,
  hasActivePremium,
} from '../../services/referralService';

import {
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';

import {
  resetFirestoreMocks,
  mockGetDocsResponse,
  mockGetDocResponse,
  mockSetDocSuccess,
  mockWriteBatchSuccess,
  mockServerTimestamp,
} from '../helpers/referralMocks';

import {
  UserBuilder,
  ReferralBuilder,
  ReferralScenarioBuilder,
  createFreeUser,
  createPremiumUser,
} from '../helpers/referralBuilders';

// Mock Firebase
jest.mock('../../config/firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore');

describe('Referral Flow - End-to-End Tests', () => {
  beforeEach(() => {
    resetFirestoreMocks();
    mockServerTimestamp();
  });

  // ==========================================================================
  // Happy Path Flow
  // ==========================================================================

  describe('Happy Path: Complete Referral Flow', () => {
    it('E2E: User A signs up → gets referral code → shares with User B', async () => {
      // User A signs up
      mockGetDocsResponse([]); // No collision

      const userAData = await initializeUserReferral('userA');

      expect(userAData.referralCode).toBeDefined();
      expect(userAData.referralCode).toHaveLength(6);
      expect(userAData.premiumStatus).toBe('free');
      expect(userAData.referralCount).toBe(0);

      // User A can share their code
      const shareableCode = userAData.referralCode;
      expect(shareableCode).toMatch(/^[A-Z2-9]+$/);
    });

    it('E2E: User B signs up with User A code → creates account', async () => {
      // Setup: User A exists with code ABC123
      const userA = new UserBuilder()
        .withId('userA')
        .withReferralCode('ABC123')
        .asFreeUser()
        .build();

      // User B signs up with User A's code
      mockGetDocsResponse([userA]); // Find User A by code
      mockSetDocSuccess(); // Create pending referral
      mockGetDocsResponse([]); // No collision for User B's code

      const userBData = await initializeUserReferral('userB', 'ABC123');

      expect(userBData.referredBy).toBe('ABC123');
      expect(userBData.referredByUserId).toBe('userA');
      expect(userBData.referralCode).toBeDefined();
      expect(setDoc).toHaveBeenCalled(); // Pending referral created

      // Verify pending referral was created with 24h window
      const pendingReferralCall = setDoc.mock.calls.find(
        (call) => call[1].status === 'pending'
      );
      expect(pendingReferralCall).toBeDefined();
      expect(pendingReferralCall[1]).toMatchObject({
        referrerUserId: 'userA',
        referredUserId: 'userB',
        status: 'pending',
      });
    });

    it('E2E: User B joins couple within 24h → referral completes', async () => {
      // Setup: Pending referral exists
      const pendingReferral = new ReferralBuilder()
        .withId('ref123')
        .withReferrer('userA')
        .withReferred('userB')
        .createdHoursAgo(2) // 2 hours ago - within window
        .pending()
        .build();

      const userA = createFreeUser('userA', 'ABC123');

      mockGetDocsResponse([pendingReferral]);
      mockGetDocResponse(userA);
      mockWriteBatchSuccess();

      // User B creates couple with partner
      const result = await checkAndCompleteReferral('couple123', 'userB', 'partnerC');

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);

      // Verify batch operations
      const mockBatch = writeBatch();
      expect(mockBatch.update).toHaveBeenCalled();
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('E2E: User A gets premium forever', async () => {
      const pendingReferral = new ReferralBuilder()
        .withId('ref123')
        .withReferrer('userA')
        .withReferred('userB')
        .createdHoursAgo(1)
        .build();

      const userA = createFreeUser('userA', 'ABC123');

      mockGetDocsResponse([pendingReferral]);
      mockGetDocResponse(userA);
      const mockBatch = mockWriteBatchSuccess();

      await checkAndCompleteReferral('couple123', 'userB', 'partnerC');

      // Find the referrer update
      const referrerUpdate = mockBatch.update.mock.calls.find(
        (call) => call[1].premiumSource === 'referral' && call[1].premiumExpiresAt === null
      );

      expect(referrerUpdate).toBeDefined();
      expect(referrerUpdate[1]).toMatchObject({
        premiumStatus: 'premium',
        premiumSource: 'referral',
        premiumExpiresAt: null, // Forever!
      });
    });

    it('E2E: User B gets 1 month premium', async () => {
      const pendingReferral = new ReferralBuilder()
        .withId('ref123')
        .withReferrer('userA')
        .withReferred('userB')
        .createdHoursAgo(1)
        .build();

      const userA = createFreeUser('userA', 'ABC123');

      mockGetDocsResponse([pendingReferral]);
      mockGetDocResponse(userA);
      const mockBatch = mockWriteBatchSuccess();

      await checkAndCompleteReferral('couple123', 'userB', 'partnerC');

      // Find the referred user update
      const referredUpdate = mockBatch.update.mock.calls.find(
        (call) => call[1].premiumSource === 'referral_bonus'
      );

      expect(referredUpdate).toBeDefined();
      expect(referredUpdate[1].premiumStatus).toBe('premium');
      expect(referredUpdate[1].premiumExpiresAt).toBeDefined();

      // Verify ~30 days
      const expiresAt = new Date(referredUpdate[1].premiumExpiresAt);
      const now = new Date();
      const daysDiff = (expiresAt - now) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeGreaterThan(29);
      expect(daysDiff).toBeLessThan(31);
    });

    it('E2E: User A can refer another person (no limit)', async () => {
      // First referral already completed
      const userA = new UserBuilder()
        .withId('userA')
        .withReferralCode('ABC123')
        .withPremium('referral')
        .withReferralCount(1)
        .build();

      // Second referral
      const secondReferral = new ReferralBuilder()
        .withId('ref456')
        .withReferrer('userA')
        .withReferred('userC')
        .createdHoursAgo(5)
        .build();

      mockGetDocsResponse([secondReferral]);
      mockGetDocResponse(userA);
      const mockBatch = mockWriteBatchSuccess();

      const result = await checkAndCompleteReferral('couple456', 'userC', 'partnerD');

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);

      // Should increment count from 1 to 2
      const referrerUpdate = mockBatch.update.mock.calls.find(
        (call) => call[1].referralCount === 2
      );
      expect(referrerUpdate).toBeDefined();
    });
  });

  // ==========================================================================
  // Attribution Window Tests
  // ==========================================================================

  describe('Attribution Window Expiry', () => {
    it('E2E: Referral expires if User B does not join couple in 24h', async () => {
      const expiredReferral = new ReferralBuilder()
        .withId('ref123')
        .withReferrer('userA')
        .withReferred('userB')
        .createdHoursAgo(25) // 25 hours ago - expired!
        .build();

      mockGetDocsResponse([expiredReferral]);

      const result = await checkAndCompleteReferral('couple123', 'userB', 'partnerC');

      expect(result.success).toBe(true);
      expect(result.count).toBe(0); // No referrals completed due to expiry
    });

    it('E2E: No premium awarded if expired', async () => {
      const expiredReferral = new ReferralBuilder()
        .withId('ref123')
        .withReferrer('userA')
        .withReferred('userB')
        .expired()
        .build();

      mockGetDocsResponse([expiredReferral]);
      const mockBatch = mockWriteBatchSuccess();

      await checkAndCompleteReferral('couple123', 'userB', 'partnerC');

      // No premium updates should occur
      const premiumUpdates = mockBatch.update.mock.calls.filter(
        (call) => call[1].premiumStatus === 'premium'
      );
      expect(premiumUpdates).toHaveLength(0);
    });

    it('E2E: Referral completes at 23h59m (edge of window)', async () => {
      const almostExpiredReferral = new ReferralBuilder()
        .withId('ref123')
        .withReferrer('userA')
        .withReferred('userB')
        .createdHoursAgo(23.98) // 23h59m ago
        .build();

      const userA = createFreeUser('userA', 'ABC123');

      mockGetDocsResponse([almostExpiredReferral]);
      mockGetDocResponse(userA);
      mockWriteBatchSuccess();

      const result = await checkAndCompleteReferral('couple123', 'userB', 'partnerC');

      expect(result.success).toBe(true);
      expect(result.count).toBe(1); // Should complete!
    });

    it('E2E: Referral expires at 24h01m (just outside window)', async () => {
      const justExpiredReferral = new ReferralBuilder()
        .withId('ref123')
        .withReferrer('userA')
        .withReferred('userB')
        .createdHoursAgo(24.02) // 24h1m ago
        .build();

      mockGetDocsResponse([justExpiredReferral]);

      const result = await checkAndCompleteReferral('couple123', 'userB', 'partnerC');

      expect(result.count).toBe(0); // Expired
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('E2E: User B tries to use own referral code (blocked)', async () => {
      const userB = createFreeUser('userB', 'DEF456');

      mockGetDocsResponse([userB]); // Finds self

      const result = await initializeUserReferral('userB', 'DEF456');

      // Self-referral should be blocked
      expect(result.referredBy).toBeNull();
      expect(result.referredByUserId).toBeNull();
      expect(setDoc).not.toHaveBeenCalled(); // No pending referral created
    });

    it('E2E: User B uses invalid code (continues signup)', async () => {
      mockGetDocsResponse([]); // Code not found

      const result = await initializeUserReferral('userB', 'INVALID');

      // Should complete signup without referral
      expect(result.referralCode).toBeDefined();
      expect(result.referredBy).toBeNull();
      expect(result.premiumStatus).toBe('free');
    });

    it('E2E: User A already has premium (still gets credit)', async () => {
      const userA = createPremiumUser('userA', 'ABC123');
      userA.referralCount = 1;

      const newReferral = new ReferralBuilder()
        .withId('ref456')
        .withReferrer('userA')
        .withReferred('userC')
        .createdHoursAgo(2)
        .build();

      mockGetDocsResponse([newReferral]);
      mockGetDocResponse(userA);
      const mockBatch = mockWriteBatchSuccess();

      const result = await checkAndCompleteReferral('couple456', 'userC', 'partnerD');

      expect(result.success).toBe(true);

      // Should still increment referral count
      const referrerUpdate = mockBatch.update.mock.calls.find(
        (call) => call[1].referralCount === 2
      );
      expect(referrerUpdate).toBeDefined();
    });
  });

  // ==========================================================================
  // Multiple Referrals
  // ==========================================================================

  describe('Multiple Referrals', () => {
    it('E2E: User A refers 3 people → all complete', async () => {
      const userA = new UserBuilder()
        .withId('userA')
        .withReferralCode('ABC123')
        .asFreeUser()
        .build();

      // Simulate 3 referrals completing sequentially
      for (let i = 1; i <= 3; i++) {
        const referral = new ReferralBuilder()
          .withId(`ref${i}`)
          .withReferrer('userA')
          .withReferred(`user${i}`)
          .createdHoursAgo(i)
          .build();

        // Update user with incremented count
        const updatedUserA = {
          ...userA,
          referralCount: i - 1,
          premiumStatus: i === 1 ? 'free' : 'premium',
        };

        mockGetDocsResponse([referral]);
        mockGetDocResponse(updatedUserA);
        mockWriteBatchSuccess();

        const result = await checkAndCompleteReferral(
          `couple${i}`,
          `user${i}`,
          `partner${i}`
        );

        expect(result.success).toBe(true);
        expect(result.count).toBe(1);

        resetFirestoreMocks();
        mockServerTimestamp();
      }
    });

    it('E2E: User A referralCount = 3 after 3 completions', async () => {
      const userA = new UserBuilder()
        .withId('userA')
        .withReferralCode('ABC123')
        .withPremium('referral')
        .withReferralCount(2)
        .build();

      const thirdReferral = new ReferralBuilder()
        .withId('ref3')
        .withReferrer('userA')
        .withReferred('user3')
        .createdHoursAgo(1)
        .build();

      mockGetDocsResponse([thirdReferral]);
      mockGetDocResponse(userA);
      const mockBatch = mockWriteBatchSuccess();

      await checkAndCompleteReferral('couple3', 'user3', 'partner3');

      const referrerUpdate = mockBatch.update.mock.calls.find(
        (call) => call[1].referralCount !== undefined
      );

      expect(referrerUpdate[1].referralCount).toBe(3);
    });

    it('E2E: User A only needs 1 for premium (others are extra)', async () => {
      // First referral - should award premium
      const userA = createFreeUser('userA', 'ABC123');
      const firstReferral = new ReferralBuilder()
        .withReferrer('userA')
        .withReferred('user1')
        .createdHoursAgo(5)
        .build();

      mockGetDocsResponse([firstReferral]);
      mockGetDocResponse(userA);
      let mockBatch = mockWriteBatchSuccess();

      await checkAndCompleteReferral('couple1', 'user1', 'partner1');

      const firstPremiumUpdate = mockBatch.update.mock.calls.find(
        (call) => call[1].premiumStatus === 'premium' && call[1].premiumSource === 'referral'
      );
      expect(firstPremiumUpdate).toBeDefined();

      // Second referral - already premium, just increment count
      resetFirestoreMocks();
      mockServerTimestamp();

      const userAWithPremium = createPremiumUser('userA', 'ABC123');
      userAWithPremium.referralCount = 1;

      const secondReferral = new ReferralBuilder()
        .withReferrer('userA')
        .withReferred('user2')
        .createdHoursAgo(3)
        .build();

      mockGetDocsResponse([secondReferral]);
      mockGetDocResponse(userAWithPremium);
      mockBatch = mockWriteBatchSuccess();

      await checkAndCompleteReferral('couple2', 'user2', 'partner2');

      const countUpdate = mockBatch.update.mock.calls.find(
        (call) => call[1].referralCount === 2
      );
      expect(countUpdate).toBeDefined();

      // Premium status stays the same (forever)
      const premiumUpdate = mockBatch.update.mock.calls.find(
        (call) => call[1].premiumStatus === 'premium'
      );
      expect(premiumUpdate[1].premiumExpiresAt).toBeNull(); // Still forever
    });
  });

  // ==========================================================================
  // Complete User Journey
  // ==========================================================================

  describe('Complete User Journey', () => {
    it('E2E: From signup to premium unlock (full journey)', async () => {
      // Step 1: User A signs up
      mockGetDocsResponse([]);
      const userAData = await initializeUserReferral('userA');
      const userACode = userAData.referralCode;

      expect(userAData.premiumStatus).toBe('free');

      // Step 2: User B signs up with User A's code
      resetFirestoreMocks();
      mockServerTimestamp();

      const userA = new UserBuilder()
        .withId('userA')
        .withReferralCode(userACode)
        .asFreeUser()
        .build();

      mockGetDocsResponse([userA]);
      mockSetDocSuccess();
      mockGetDocsResponse([]);

      const userBData = await initializeUserReferral('userB', userACode);

      expect(userBData.referredBy).toBe(userACode);
      expect(userBData.referredByUserId).toBe('userA');

      // Step 3: User B creates couple within 24h
      resetFirestoreMocks();
      mockServerTimestamp();

      const pendingReferral = new ReferralBuilder()
        .withReferrer('userA')
        .withReferred('userB')
        .createdHoursAgo(12) // 12 hours ago
        .build();

      mockGetDocsResponse([pendingReferral]);
      mockGetDocResponse(userA);
      mockWriteBatchSuccess();

      const completionResult = await checkAndCompleteReferral('couple123', 'userB', 'partnerC');

      expect(completionResult.success).toBe(true);
      expect(completionResult.count).toBe(1);

      // Step 4: Verify both users got premium
      const mockBatch = writeBatch();
      const updates = mockBatch.update.mock.calls;

      const userAPremium = updates.find(
        (call) => call[1].premiumSource === 'referral'
      );
      const userBPremium = updates.find(
        (call) => call[1].premiumSource === 'referral_bonus'
      );

      expect(userAPremium).toBeDefined(); // User A: premium forever
      expect(userBPremium).toBeDefined(); // User B: 1 month premium

      // Verify User A has forever premium
      expect(userAPremium[1].premiumExpiresAt).toBeNull();

      // Verify User B has 30-day premium
      const userBExpiry = new Date(userBPremium[1].premiumExpiresAt);
      const daysDiff = (userBExpiry - new Date()) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeGreaterThan(29);
      expect(daysDiff).toBeLessThan(31);
    });
  });
});
