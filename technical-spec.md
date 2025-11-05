# Dividela - Couples Expense Tracker
## Technical Specification v1.0

---

## 1. Executive Summary

**Product Name:** Dividela  
**Target Users:** Couples managing shared expenses  
**Core Value Prop:** Add an expense in under 10 seconds, always know the balance, settle up effortlessly

**Key Metrics:**
- Time to add expense: <10 seconds
- Daily active usage: 60%+ of couples
- Settlement frequency: Weekly average

---

## 2. Product Requirements

### 2.1 Core Features (MVP)

#### User Management
- [ ] Couple pairing system (invite link/code)
- [ ] Biometric authentication (Face ID/Touch ID)
- [ ] Profile setup (name, avatar)

#### Expense Management
- [ ] Quick add expense form
- [ ] Split options: 50/50, custom percentage (with slider or input)
- [ ] Paid by selector: You or Partner
- [ ] Expense categories (auto-suggested)
- [ ] Edit/delete expenses
- [ ] Add notes to expenses

#### Balance & Settlement
- [ ] Real-time balance calculation
- [ ] Settlement history
- [ ] Cash settlement tracking
- [ ] Mark as settled functionality

#### Notifications
- [ ] Partner adds expense
- [ ] Balance threshold alerts
- [ ] Weekly summary

### 2.2 Future Features (Post-MVP)

#### Phase 2
- [ ] Receipt photo capture + OCR
- [ ] Voice input for expenses
- [ ] Recurring expenses
- [ ] Category-based split rules
- [ ] Export to CSV/PDF

#### Phase 3
- [ ] Budget tracking
- [ ] Spending insights/analytics
- [ ] Multiple expense groups (roommates, trips)
- [ ] Bill splitting from photos
- [ ] Integration with bank accounts

---

## 3. Technical Architecture

### 3.1 Technology Stack

**Frontend:**
- **Framework:** React Native (Expo)
  - Rationale: Single codebase for iOS/Android, fast development, good ecosystem
- **UI Library:** React Native Paper or NativeBase
- **State Management:** React Context + Hooks (MVP), Redux Toolkit (if needed)
- **Navigation:** React Navigation
- **Forms:** React Hook Form
- **Icons:** Expo Vector Icons

**Backend:**
- **Platform:** Firebase
  - Authentication: Firebase Auth
  - Database: Firestore (real-time sync)
  - Storage: Firebase Storage (for receipts)
  - Hosting: Firebase Hosting (web version)
  - Functions: Cloud Functions (serverless logic)
- **Alternative:** Supabase (open-source Firebase alternative)

**Payment Integration:**
- Manual settlement tracking (cash in person)
- Optional: Future integration with digital payment apps if needed

**Additional Services:**
- **OCR:** Google Cloud Vision API (Phase 2)
- **Analytics:** Mixpanel or Amplitude
- **Error Tracking:** Sentry
- **Push Notifications:** Firebase Cloud Messaging

### 3.2 Database Schema

```javascript
// Firestore Collections

// Users Collection
users: {
  userId: {
    email: string,
    displayName: string,
    avatarUrl: string,
    partnerId: string | null,
    createdAt: timestamp,
    settings: {
      notifications: boolean,
      defaultSplit: number,
      currency: string
    }
  }
}

// Couples Collection
couples: {
  coupleId: {
    user1Id: string,
    user2Id: string,
    inviteCode: string,
    createdAt: timestamp,
    currentBalance: number, // positive = user1 owes user2
    totalExpenses: number,
    lastActivity: timestamp
  }
}

// InviteCodes Collection
inviteCodes: {
  code: string, // 6-digit alphanumeric (primary key)
  createdBy: string (userId),
  createdAt: timestamp,
  expiresAt: timestamp, // 7 days from creation
  isUsed: boolean,
  usedBy: string | null (userId),
  usedAt: timestamp | null
}

// Expenses Collection
expenses: {
  expenseId: {
    coupleId: string,
    paidBy: string (userId), // User who paid the expense
    amount: number,
    description: string,
    category: string,
    splitType: string, // '50-50', 'custom'
    splitDetails: {
      user1Percentage: number, // 0-100
      user2Percentage: number, // 0-100
      user1Amount: number,     // Calculated from percentage
      user2Amount: number      // Calculated from percentage
    },
    date: timestamp,
    createdAt: timestamp,
    isSettled: boolean,
    notes: string,
    receiptUrl: string | null
  }
}

// Settlements Collection
settlements: {
  settlementId: {
    coupleId: string,
    amount: number,
    paidBy: string (userId),
    paidTo: string (userId),
    method: string,
    date: timestamp,
    notes: string,
    relatedExpenseIds: array<string>
  }
}
```

### 3.3 API Design

**REST-like Firebase Functions:**

```javascript
// Expense Operations
POST   /expenses/create
PUT    /expenses/{id}/update
DELETE /expenses/{id}/delete
GET    /expenses/list?coupleId={id}&limit=50

// Couple Operations
POST   /couples/create
POST   /couples/join (via invite code)
GET    /couples/{id}/balance
GET    /couples/{id}/summary?period=week

// Settlement Operations
POST   /settlements/create
GET    /settlements/list?coupleId={id}

// User Operations
PUT    /users/{id}/update
GET    /users/{id}/partner

// Invite & Pairing Operations
POST   /invites/generate (creates new 6-digit code)
POST   /invites/validate (checks if code is valid)
POST   /invites/accept (pairs users, creates couple)
GET    /invites/{code}/status (check if used/expired)
```

### 3.4 Real-time Sync Strategy

**Firestore Real-time Listeners:**
- Listen to couple's expenses collection
- Listen to balance changes
- Auto-update UI on changes from partner
- Optimistic updates with rollback on error

---

## 4. User Experience Flow

### 4.1 Onboarding Flow

**New User Journey:**
1. **Welcome Screen**
   - App logo and tagline
   - "Get Started" button
   - "Already have an account?" sign in link

2. **Sign Up Screen**
   - Email + password (or Google/Apple sign in)
   - Name input
   - Optional avatar upload
   - Terms & Privacy acceptance
   - "Create Account" button

3. **Partner Connection Screen**
   - Two options presented:
     a) "Invite Partner" - generates unique 6-digit code
     b) "Join Partner" - enter partner's invite code
   
4. **Invite Partner Flow:**
   - System generates unique 6-digit code (e.g., "A7K9M2")
   - Display code prominently with copy button
   - Share options (SMS, WhatsApp, copy link)
   - "Waiting for partner..." status
   - Notification when partner joins

5. **Join Partner Flow:**
   - Input field for 6-digit code
   - Real-time validation
   - On success: "Connected to [Partner Name]!"
   - Both users notified of successful pairing

6. **Quick Tutorial (Optional)**
   - Swipeable 3-screen intro
   - Skip button available
   - Highlights: Add expenses, View balance, Settle up

7. **Ready to Use**
   - Lands on home screen
   - Welcome message with partner name
   - Prompt to add first expense

**Returning User Journey:**
1. Open app → Biometric auth → Home screen
2. If session valid, skip auth

**Invite Code System:**
- Format: 6 alphanumeric characters (e.g., "A7K9M2")
- Valid for: 7 days from generation
- One-time use
- Expires after successful pairing
- Can generate new code if expired
- Case-insensitive input

### 4.2 Core User Flows

**Add Expense (Primary Flow):**
1. Tap floating "+" button
2. Enter amount (large number pad)
3. Enter description (with smart suggestions)
4. Select category (auto-suggested, optional)
5. Select who paid (You / Partner)
6. Confirm split (default to 50/50, or choose custom)
7. Tap "Add" → Done (4-5 taps total)

**View Balance:**
1. Home screen shows: "Alex owes you $47.50"
2. Tap to see expense breakdown
3. Filter by date/category
4. Tap "Settle Up" to pay

**Settle Up:**
1. Tap "Settle Up" on home screen
2. Confirm amount
3. Choose settlement method (cash in person)
4. Mark as settled when payment is complete
5. Balance resets to $0

---

## 5. Security & Privacy

### 5.1 Security Measures
- Firebase Authentication with 2FA option
- Firestore security rules (couples can only access their data)
- HTTPS only
- No sensitive financial data stored (just payment usernames)
- Regular security audits

### 5.2 Privacy Policy
- Minimal data collection
- No selling user data
- Option to delete all data
- GDPR compliant

### 5.3 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Invite codes - user can create their own, anyone can read to validate
    match /inviteCodes/{code} {
      allow read: if request.auth != null;
      allow create: if request.auth.uid == request.resource.data.createdBy;
      allow update: if request.auth != null && !resource.data.isUsed;
    }
    
    // Couples can be read/written by either partner
    match /couples/{coupleId} {
      allow read, write: if request.auth.uid in resource.data.memberIds;
    }
    
    // Expenses can be accessed by couple members only
    match /expenses/{expenseId} {
      allow read: if request.auth.uid in get(/databases/$(database)/documents/couples/$(resource.data.coupleId)).data.memberIds;
      allow create: if request.auth.uid in get(/databases/$(database)/documents/couples/$(request.resource.data.coupleId)).data.memberIds;
      allow update, delete: if request.auth.uid in get(/databases/$(database)/documents/couples/$(resource.data.coupleId)).data.memberIds;
    }
  }
}
```

---

## 6. Development Phases

### Phase 1: MVP (4-6 weeks)
**Week 1-2:**
- Project setup (Expo + Firebase)
- Authentication flow
- Basic UI framework
- Database schema implementation

**Week 3-4:**
- Add expense functionality
- Expense list view
- Balance calculation
- Real-time sync

**Week 5-6:**
- Settlement flow
- Notifications
- Polish & testing
- Beta launch

### Phase 2: Enhancement (4 weeks)
- Receipt OCR
- Voice input
- Recurring expenses
- Analytics dashboard

### Phase 3: Scale (Ongoing)
- Performance optimization
- Advanced features
- Marketing & growth

---

## 7. Performance Requirements

### 7.1 Target Metrics
- App launch: <2 seconds
- Add expense: <1 second to save
- Load expense list: <1 second
- Sync latency: <500ms
- Offline support: Full functionality

### 7.2 Scalability
- Firestore can handle 10K+ couples easily
- Paginate expense lists (50 per page)
- Lazy load images
- Cache frequently accessed data

---

## 8. Testing Strategy

### 8.1 Unit Tests
- Utility functions (balance calculation)
- Data validation
- Split logic

### 8.2 Integration Tests
- Firebase operations
- Real-time sync
- Authentication flow

### 8.3 E2E Tests
- Complete user flows
- Cross-device sync
- Payment integrations

### 8.4 User Testing
- Beta with 10-20 couples
- A/B test add expense flow
- Usability testing sessions

---

## 9. Deployment

### 9.1 Development Environment
- Firebase project: spliteasy-dev
- Test with real data
- Debug mode enabled

### 9.2 Production Environment
- Firebase project: spliteasy-prod
- Google Play Store (Android)
- Apple App Store (iOS)
- Progressive Web App (optional)

### 9.3 CI/CD Pipeline
- GitHub Actions
- Automated testing
- Expo EAS Build
- Staged rollouts

---

## 10. Monetization (Future)

### 10.1 Free Tier
- Unlimited expenses
- One couple pairing
- Basic categories
- Cash settlement tracking

### 10.2 Premium ($2.99/month or $24.99/year)
- Receipt OCR
- Advanced analytics
- Export features
- Priority support
- Multiple groups
- Automatic categorization

### 10.3 Alternative: Free Forever
- Keep it free, build for love
- Optional tip jar
- Open source community version

---

## 11. Success Metrics

### 11.1 Product Metrics
- Daily active couples: 60%+
- Expenses added per day per couple: 2-3
- Time to add expense: <10 seconds average
- Settlement frequency: 1-2 times per week
- Retention: 70%+ after 30 days

### 11.2 Technical Metrics
- App crash rate: <1%
- API success rate: >99.9%
- Average response time: <500ms
- App rating: 4.5+ stars

---

## 12. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| User adoption | High | Focus on extreme simplicity, word-of-mouth |
| Technical complexity | Medium | Use proven stack (Firebase), start simple |
| Data sync conflicts | Medium | Firestore handles this, implement conflict resolution |
| Payment integration issues | Low | Use deep links, no direct payment handling |
| Competition | Medium | Focus on couples-specific UX, not general expense tracking |

---

## 13. Next Steps

1. ✅ Review and approve this spec
2. [ ] Set up development environment
3. [ ] Create wireframes and mockups
4. [ ] Build clickable prototype
5. [ ] Implement MVP features
6. [ ] Beta testing with real couples
7. [ ] Launch!

---

## Appendix A: Similar Apps Analysis

**Splitwise:** Most popular, but cluttered UI for couples use case  
**Honeydue:** Couples-focused but includes full banking features (too complex)  
**Settle Up:** Good for groups, less couple-focused  
**Tricount:** European focus, similar to Splitwise

**Our Advantage:** Laser-focused on couples, extreme simplicity, modern UX, cash-based settlement for privacy and simplicity
