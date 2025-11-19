# Dividela - Couples Expense Tracker

A simple, privacy-focused expense tracking app designed specifically for couples who want to manage shared expenses effortlessly.

---

## 🎯 Core Philosophy

**Dividela** is built on three principles:
1. **Simplicity** - Add an expense in under 10 seconds
2. **Privacy** - Cash-only settlements, no linking to bank accounts
3. **Trust** - Designed for couples who want transparency without complexity

---

## 📱 Key Features

### ✅ MVP Features
- **Quick Expense Entry** - Large buttons, smart defaults, one-handed operation
- **Real-time Balance** - Always know who owes what at a glance
- **Simple Pairing** - 6-digit invite codes for instant connection
- **Category Tracking** - Automatic categorization with 6 preset categories
- **Cash Settlements** - Track in-person payments, no digital wallet integration
- **Expense History** - See all shared expenses with filtering
- **Basic Statistics** - Monthly spending breakdown by category

### 📊 Analytics & Monitoring (NEW!)
- **User Analytics** - Amplitude integration for feature usage tracking
- **Error Tracking** - Sentry for real-time error monitoring
- **Rage Click Detection** - Identify UX frustration points
- **Onboarding Funnel** - Track time-to-value metrics
- **Privacy-First** - All PII hashed, amounts anonymized
- **Free Tier** - 10M events/month (Amplitude) + 5K errors/month (Sentry)

See [ANALYTICS_SETUP.md](./ANALYTICS_SETUP.md) for quick setup guide.

### 🔮 Planned Features (Phase 2+)
- Receipt photo capture with OCR
- Voice input for hands-free expense entry
- Recurring expenses (rent, utilities, subscriptions)
- Custom categories and split rules
- Export to CSV/PDF
- Budget tracking and spending alerts

---

## 📂 Project Files

This repository contains all the design and development materials for Dividela:

### 📋 [Technical Specification](technical-spec.md)
Complete technical documentation including:
- Product requirements (MVP + future phases)
- Technology stack (React Native + Firebase)
- Database schema and API design
- Security and privacy considerations
- Development roadmap and timeline
- Success metrics and KPIs

### 🎨 [Wireframes](wireframes.html)
Interactive wireframes showing all key screens:
- **Onboarding Flow** (6 screens)
  - Welcome screen
  - Sign up
  - Partner connection choice
  - Invite code generation
  - Invite code entry
  - Success celebration
- **Main App** (5 screens)
  - Home with balance
  - Add expense
  - Settle up
  - Expense details
  - Statistics

### 🚀 [Working Prototype](prototype.html)
Fully functional React prototype that you can test immediately:
- Complete onboarding flow with form validation
- Add/view/categorize expenses
- Real-time balance calculation
- Interactive settle up flow
- Statistics with category breakdowns
- **To test:** Open `prototype.html` in any modern browser

### 📖 [Onboarding Guide](ONBOARDING-GUIDE.md)
Comprehensive documentation of the account creation and pairing system:
- Detailed flow diagrams
- Invite code system specifications
- Database schema reference
- API endpoint documentation
- Testing scenarios and edge cases
- Analytics and monitoring guidelines

---

## 🎯 User Flow Overview

```
New User Journey:
1. Welcome Screen → 2. Sign Up → 3. Choose: Invite or Join
                                    ↓                ↓
                                4a. Generate      4b. Enter
                                    Code             Code
                                    ↓                ↓
                                    └────→ 5. ←─────┘
                                       Success!
                                          ↓
                                    6. Main App

Daily Use:
Open App → View Balance → Add Expense (3 taps) → Done
                       ↓
                   Need to settle? → Tap "Settle Up" → Mark as paid in cash
```

---

## 🛠 Tech Stack

### Frontend
- **Framework:** React Native (Expo)
- **UI Library:** React Native Paper
- **State Management:** React Context + Hooks
- **Navigation:** React Navigation

### Backend
- **Platform:** Firebase
  - Authentication (Email + Social)
  - Firestore (Real-time database)
  - Cloud Functions (Business logic)
  - Cloud Storage (Future: receipts)
  - Cloud Messaging (Notifications)

### Development Tools
- **Version Control:** Git + GitHub
- **CI/CD:** GitHub Actions + Expo EAS
- **Testing:** Jest + React Native Testing Library
- **Analytics:** Mixpanel or Amplitude
- **Error Tracking:** Sentry

---

## 🔐 Privacy & Security

Dividela takes privacy seriously:

- ✅ **No Financial Data** - We never store bank account or credit card information
- ✅ **Minimal Data Collection** - Only what's needed for the app to function
- ✅ **Cash-Only Settlements** - No linking to digital payment apps
- ✅ **End-to-End Security** - All data encrypted in transit and at rest
- ✅ **User Control** - Easy data export and account deletion
- ✅ **Couple Privacy** - Only paired partners can see shared expenses

### Data We Store
- Account info: Name, email, avatar
- Expenses: Amount, description, date, category, who paid
- Couple pairing: User IDs and invite codes
- Settings: Preferences and notification settings

### Data We DON'T Store
- Bank accounts, credit cards, or payment credentials
- Social security numbers or government IDs
- Physical addresses (unless user manually enters in expense)
- Location data beyond what's necessary for the app to function

---

## 📊 Key Metrics

### Success Metrics
- **Onboarding completion:** >80% who start finish pairing
- **Daily active couples:** 60%+ use app daily
- **Time to add expense:** <10 seconds average
- **User retention:** 70%+ still active after 30 days
- **App rating:** 4.5+ stars

### Product Metrics
- Expenses added per day per couple: 2-3
- Settlement frequency: 1-2 times per week
- Category usage: Food (40%), Groceries (25%), Other (35%)

---

## 🚦 Development Roadmap

### Phase 1: MVP (Weeks 1-6)
- [x] Technical specification
- [x] Wireframes and design system
- [x] Interactive prototype
- [ ] Firebase setup and configuration
- [ ] Authentication implementation
- [ ] Invite code system
- [ ] Expense CRUD operations
- [ ] Balance calculation logic
- [ ] Basic UI implementation
- [ ] Testing and bug fixes
- [ ] Beta launch with 10-20 couples

### Phase 2: Enhancement (Weeks 7-10)
- [ ] Receipt photo capture + OCR
- [ ] Voice input for expenses
- [ ] Recurring expenses
- [ ] Push notifications
- [ ] Advanced statistics
- [ ] Custom categories
- [ ] Export functionality

### Phase 3: Scale (Weeks 11+)
- [ ] Performance optimization
- [ ] Advanced analytics
- [ ] Referral program
- [ ] Marketing website
- [ ] App Store optimization
- [ ] Public launch

---

## 💰 Monetization Strategy

### Free Forever Tier
Dividela's core features will always be free:
- Unlimited expenses
- One couple pairing
- Basic categories
- Cash settlement tracking
- Statistics

### Future Premium (Optional)
If needed to sustain development:
- Receipt OCR (after X free uses)
- Advanced analytics
- Multiple couple groups (e.g., trips with friends)
- Priority support
- Custom branding export

**Goal:** Keep the app free for 95%+ of users. Premium features should be nice-to-haves, not must-haves.

---

## 🎨 Design Philosophy

### Visual Design
- **Clean & Minimal** - No clutter, focus on key information
- **Bold Typography** - Important numbers are big and clear
- **Gradient Accents** - Purple gradient for brand personality
- **Soft Corners** - Friendly, approachable aesthetic
- **Emoji Icons** - Playful category representations

### Interaction Design
- **Fast by Default** - Optimistic UI updates
- **One-Handed Operation** - Primary actions at thumb reach
- **Forgiving** - Easy undo/edit, hard to make mistakes
- **Delightful Micro-interactions** - Subtle animations and haptics
- **Accessible** - High contrast, large touch targets, screen reader support

---

## 🧪 Testing the Prototype

1. **Open `prototype.html`** in your browser
2. **Experience the onboarding:**
   - Fill out sign up form
   - Choose "Invite Partner" or "Join Partner"
   - If inviting: Click "Simulate partner joined" to continue
   - If joining: Enter any 6-character code
3. **Try the main features:**
   - Add an expense using the + button
   - View balance on home screen
   - Tap "Settle Up" to mark as paid
   - Navigate to Stats to see spending breakdown
4. **Reload page** to restart onboarding flow

---

## 🤝 Target Audience

### Primary Users
- **Couples living together** (married or dating)
- **Ages 25-40** (tech-comfortable but not tech-obsessed)
- **Shared financial responsibility** (rent, groceries, bills)
- **Privacy-conscious** (prefer not linking bank accounts)
- **Simplicity-seekers** (want tracking without complexity)

### User Personas

**Persona 1: Sarah & Mike**
- Married, both working professionals
- Share rent, groceries, and utilities
- Split most things 50/50 but sometimes one treats
- Want to keep track without "feeling like roommates"
- Value: Simplicity and trust

**Persona 2: Alex & Jordan**
- Dating for 2 years, recently moved in together
- Different incomes, trying to figure out fair splits
- Privacy-conscious, don't want apps accessing bank accounts
- Value: Flexibility and privacy

---

## 🌟 What Makes Dividela Different?

### vs. Splitwise
- ✅ **Couples-focused:** Built specifically for two people in a relationship
- ✅ **Simpler:** No groups, no complex settlements, no friend requests
- ✅ **Privacy-first:** Cash-only, no payment app integration
- ✅ **Faster:** Add expense in 3 taps, not 8

### vs. Honeydue
- ✅ **No bank linking:** We don't need access to your accounts
- ✅ **Lighter:** Just expense tracking, no budgeting complexity
- ✅ **Trust-based:** Assumes mutual trust, not financial surveillance

### vs. Spreadsheets
- ✅ **Mobile-first:** Designed for on-the-go use
- ✅ **Automatic calculations:** No formulas to write
- ✅ **Visual:** See spending patterns at a glance
- ✅ **Real-time sync:** Both partners see updates instantly

---

## 📞 Next Steps

### For Designers
1. Review wireframes for UX improvements
2. Create high-fidelity mockups with brand colors
3. Design app icon and splash screen
4. Create marketing assets

### For Developers
1. Review technical spec and provide feedback
2. Set up development environment
3. Initialize Firebase project
4. Start implementing authentication flow
5. Build invite code system
6. Implement expense CRUD operations

### For Product Managers
1. Validate MVP feature set with target users
2. Create user testing plan
3. Set up analytics and tracking
4. Plan beta launch strategy
5. Define success metrics and OKRs

---

## 📄 License

[To be determined - likely MIT or Apache 2.0 for open source version]

---

## 🙏 Credits

**Concept & Design:** Collaborative effort  
**Technical Specification:** AI-assisted documentation  
**Wireframes:** Interactive HTML prototypes  
**Working Prototype:** React-based functional demo

---

## 📧 Contact

For questions, feedback, or collaboration:
- [Your contact info here]

---

**Built with ❤️ for couples who want to manage money without the hassle**
