// src/__tests__/helpers/referralBuilders.js
// Test data builders for referral system tests

import { Timestamp } from 'firebase/firestore';
import { mockUserWithReferral, mockPendingReferral, mockCouple } from './referralMocks';

/**
 * Builder for creating test user data with fluent API
 */
export class UserBuilder {
  constructor() {
    this.user = { ...mockUserWithReferral };
  }

  withId(id) {
    this.user.id = id;
    return this;
  }

  withEmail(email) {
    this.user.email = email;
    return this;
  }

  withReferralCode(code) {
    this.user.referralCode = code;
    return this;
  }

  withReferredBy(code, userId) {
    this.user.referredBy = code;
    this.user.referredByUserId = userId;
    return this;
  }

  withPremium(source = 'referral', expiresAt = null) {
    this.user.premiumStatus = 'premium';
    this.user.premiumSource = source;
    this.user.premiumUnlockedAt = Timestamp.now();
    this.user.premiumExpiresAt = expiresAt;
    return this;
  }

  withPremiumExpiring(daysFromNow) {
    this.user.premiumStatus = 'premium';
    this.user.premiumSource = 'referral_bonus';
    this.user.premiumUnlockedAt = Timestamp.fromDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    this.user.premiumExpiresAt = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
    return this;
  }

  withReferralCount(count) {
    this.user.referralCount = count;
    return this;
  }

  withCompletedReferrals(referralIds) {
    this.user.referralsCompleted = referralIds;
    this.user.referralCount = referralIds.length;
    return this;
  }

  withPendingReferrals(referralIds) {
    this.user.referralsPending = referralIds;
    return this;
  }

  asFreeUser() {
    this.user.premiumStatus = 'free';
    this.user.premiumSource = null;
    this.user.premiumUnlockedAt = null;
    this.user.premiumExpiresAt = null;
    return this;
  }

  build() {
    return { ...this.user };
  }
}

/**
 * Builder for creating test referral data with fluent API
 */
export class ReferralBuilder {
  constructor() {
    this.referral = { ...mockPendingReferral };
  }

  withId(id) {
    this.referral.id = id;
    return this;
  }

  withReferrer(userId) {
    this.referral.referrerUserId = userId;
    return this;
  }

  withReferred(userId) {
    this.referral.referredUserId = userId;
    return this;
  }

  withCouple(coupleId) {
    this.referral.referredCoupleId = coupleId;
    return this;
  }

  withStatus(status) {
    this.referral.status = status;
    if (status === 'completed') {
      this.referral.completedAt = Timestamp.now();
    } else if (status === 'expired') {
      this.referral.completedAt = null;
    }
    return this;
  }

  createdHoursAgo(hours) {
    this.referral.createdAt = Timestamp.fromDate(new Date(Date.now() - hours * 60 * 60 * 1000));
    this.referral.expiresAt = new Date(Date.now() + (24 - hours) * 60 * 60 * 1000);
    return this;
  }

  expiringIn(hours) {
    this.referral.createdAt = Timestamp.fromDate(
      new Date(Date.now() - (24 - hours) * 60 * 60 * 1000)
    );
    this.referral.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    return this;
  }

  expired() {
    this.referral.status = 'pending'; // Still pending but time expired
    this.referral.createdAt = Timestamp.fromDate(new Date(Date.now() - 25 * 60 * 60 * 1000));
    this.referral.expiresAt = new Date(Date.now() - 1 * 60 * 60 * 1000);
    return this;
  }

  completed(coupleId = 'couple123') {
    this.referral.status = 'completed';
    this.referral.referredCoupleId = coupleId;
    this.referral.completedAt = Timestamp.now();
    return this;
  }

  pending() {
    this.referral.status = 'pending';
    this.referral.completedAt = null;
    this.referral.referredCoupleId = null;
    return this;
  }

  build() {
    return { ...this.referral };
  }
}

/**
 * Builder for creating test couple data with fluent API
 */
export class CoupleBuilder {
  constructor() {
    this.couple = { ...mockCouple };
  }

  withId(id) {
    this.couple.id = id;
    return this;
  }

  withUsers(user1Id, user2Id) {
    this.couple.user1Id = user1Id;
    this.couple.user2Id = user2Id;
    return this;
  }

  createdAt(date) {
    this.couple.createdAt = Timestamp.fromDate(date);
    return this;
  }

  build() {
    return { ...this.couple };
  }
}

/**
 * Helper to create a complete referral scenario
 */
export class ReferralScenarioBuilder {
  constructor() {
    this.scenario = {
      referrer: new UserBuilder().withId('referrer123').withReferralCode('ABC123').build(),
      referred: new UserBuilder()
        .withId('referred456')
        .withReferralCode('DEF456')
        .withReferredBy('ABC123', 'referrer123')
        .build(),
      referral: new ReferralBuilder()
        .withId('ref123')
        .withReferrer('referrer123')
        .withReferred('referred456')
        .pending()
        .build(),
      couple: new CoupleBuilder().withId('couple789').withUsers('referrer123', 'referred456').build(),
    };
  }

  withReferrerPremium() {
    this.scenario.referrer.premiumStatus = 'premium';
    this.scenario.referrer.premiumSource = 'referral';
    this.scenario.referrer.premiumUnlockedAt = Timestamp.now();
    this.scenario.referrer.referralCount = 1;
    return this;
  }

  withExpiredReferral() {
    this.scenario.referral = new ReferralBuilder()
      .withId('ref123')
      .withReferrer('referrer123')
      .withReferred('referred456')
      .expired()
      .build();
    return this;
  }

  withCompletedReferral() {
    this.scenario.referral = new ReferralBuilder()
      .withId('ref123')
      .withReferrer('referrer123')
      .withReferred('referred456')
      .completed('couple789')
      .build();
    return this;
  }

  withExpiringReferral(hoursRemaining) {
    this.scenario.referral = new ReferralBuilder()
      .withId('ref123')
      .withReferrer('referrer123')
      .withReferred('referred456')
      .expiringIn(hoursRemaining)
      .build();
    return this;
  }

  build() {
    return this.scenario;
  }
}

/**
 * Quick helper functions for common scenarios
 */
export const createFreeUser = (id = 'user123', code = 'ABC123') =>
  new UserBuilder().withId(id).withReferralCode(code).asFreeUser().build();

export const createPremiumUser = (id = 'premium123', code = 'XYZ789') =>
  new UserBuilder().withId(id).withReferralCode(code).withPremium('referral').build();

export const createPendingReferral = (referrerId, referredId) =>
  new ReferralBuilder().withReferrer(referrerId).withReferred(referredId).pending().build();

export const createCompletedReferral = (referrerId, referredId, coupleId) =>
  new ReferralBuilder()
    .withReferrer(referrerId)
    .withReferred(referredId)
    .completed(coupleId)
    .build();

export const createExpiredReferral = (referrerId, referredId) =>
  new ReferralBuilder().withReferrer(referrerId).withReferred(referredId).expired().build();
