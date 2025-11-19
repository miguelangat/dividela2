# Test Coverage Summary: Multi-Account Feature

## Quick Reference

### Test Distribution (Target: 150-200 tests)

```
┌─────────────────────────────────────────────┐
│         TESTING PYRAMID                     │
├─────────────────────────────────────────────┤
│                                             │
│           E2E Tests (10%)                   │
│         5-8 critical journeys               │
│         ══════════                          │
│                                             │
│      Integration Tests (20%)                │
│       15-20 cross-feature flows             │
│    ══════════════════                       │
│                                             │
│        Unit Tests (70%)                     │
│     100+ individual test cases              │
│ ══════════════════════════════              │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Test Files & Counts

### ✅ Already Implemented (Existing)
- `budgetService.test.js` - ✓ 30+ tests
- `expenseService.test.js` - ✓ 25+ tests  
- `settlementService.test.js` - ✓ 20+ tests
- `AuthContext.test.js` - ✓ 15+ tests
- `calculations.test.js` - ✓ 10+ tests
- `validators.test.js` - ✓ 8+ tests
- Onboarding tests - ✓ 20+ tests
- Component tests - ✓ 5+ tests

**Subtotal**: ~133 existing tests ✅

---

### 🔴 HIGH Priority (Must Implement Before Launch)

| Test File | Est. Tests | Time | Status |
|-----------|------------|------|--------|
| `accountService.test.js` | 35-40 | 2-3 days | ❌ TODO |
| `AuthContext.test.js` (updates) | 10-12 | 1 day | ❌ TODO |
| `AccountContext.test.js` | 25-30 | 2 days | ❌ TODO |
| `multiAccount.rules.test.js` | 30-40 | 3-4 days | ❌ TODO |
| Integration: Account Flows | 8-10 | 2 days | ❌ TODO |

**Subtotal**: ~110-130 critical tests (9-12 days)

---

### 🟡 MEDIUM Priority (Post-Launch)

| Test File | Est. Tests | Time | Status |
|-----------|------------|------|--------|
| `accountDefaults.test.js` | 15-20 | 1 day | ❌ TODO |
| `BudgetContext.test.js` (updates) | 8-10 | 1 day | ❌ TODO |
| `AccountSwitcher.test.js` | 12-15 | 1 day | ❌ TODO |
| `CreateSoloAccountScreen.test.js` | 10-12 | 1 day | ❌ TODO |
| `AccountsScreen.test.js` | 12-15 | 1 day | ❌ TODO |
| `JoinScreen.test.js` (updates) | 5-7 | 0.5 days | ❌ TODO |
| Integration: Multi-User | 6-8 | 1.5 days | ❌ TODO |

**Subtotal**: ~68-87 tests (7-8 days)

---

### 🟢 LOW Priority (Future Enhancement)

| Test File | Est. Tests | Time | Status |
|-----------|------------|------|--------|
| E2E: User Journeys | 5-8 | 3-4 days | ⏳ Later |
| Performance Tests | TBD | 2 days | ⏳ Later |
| Accessibility Tests | TBD | 1 day | ⏳ Later |

---

## Coverage Targets

### Overall Goals
- **Unit Test Coverage**: 85%+ ✅
- **Integration Test Coverage**: 75%+ ✅
- **Firestore Rules Coverage**: 100% ✅
- **Critical Path E2E**: All covered ✅

### Per-File Targets

| File | Target | Priority |
|------|--------|----------|
| `accountService.js` | 90%+ | 🔴 |
| `AccountContext.js` | 90%+ | 🔴 |
| `AuthContext.js` (new) | 85%+ | 🔴 |
| Firestore Rules | 100% | 🔴 |
| `accountDefaults.js` | 95%+ | 🟡 |
| `BudgetContext.js` (changes) | 85%+ | 🟡 |
| Components | 80%+ | 🟡 |

---

## Implementation Phases

### Phase 1: Foundation (Week 1) - CRITICAL ✅
**Focus**: Core service layer & context updates

- ✅ `accountService.test.js` (35-40 tests)
- ✅ `accountDefaults.test.js` (15-20 tests)
- ✅ `AuthContext.test.js` updates (10-12 tests)

**Deliverable**: 60-70 tests, 80% service coverage

---

### Phase 2: Context & Components (Week 2)
**Focus**: State management & UI components

- ⏳ `AccountContext.test.js` (25-30 tests)
- ⏳ `BudgetContext.test.js` updates (8-10 tests)
- ⏳ Component tests (30-35 tests)

**Deliverable**: 60-75 tests, component/context coverage

---

### Phase 3: Integration & Security (Week 3) - CRITICAL 🔐
**Focus**: Cross-feature flows & security validation

- ⏳ Integration tests (15-20 tests)
- ⏳ Firestore rules tests (30-40 tests)
- ⏳ Firestore emulator setup

**Deliverable**: 45-60 tests, security validated

---

### Phase 4: E2E & Polish (Week 4) - Optional
**Focus**: End-to-end user journeys

- ⏳ E2E setup (Detox/Maestro)
- ⏳ E2E tests (5-8 tests)
- ⏳ CI/CD integration

**Deliverable**: Complete test suite, production-ready

---

## Critical Test Scenarios

### 1. Account Service ✅ MUST TEST
```
✓ Create solo account
✓ Create couple account
✓ Switch active account
✓ Add account to user
✓ Remove account from user
✓ Update account name
✓ Get user accounts
✓ Get active account
✓ Ensure active account
✓ Error handling for all operations
```

### 2. Firestore Security 🔐 MUST TEST
```
✓ User can create own user document with accounts[]
✓ User can update own accounts array
✓ User can update own activeAccountId
✓ User CANNOT update other user's accounts
✓ User can create solo account (user2Id = null)
✓ User can create couple account
✓ Only account members can read account data
✓ User can list expenses only if has activeAccountId
✓ User can create budget/expense for active account only
✓ User CANNOT create budget/expense for inactive account
```

### 3. Integration Flows ✅ MUST TEST
```
✓ Sign up → Create solo account → Set active → Load data
✓ Create invite → Join couple → Both get account → Data syncs
✓ Switch between accounts → Data clears → Reloads correctly
✓ Add expense in account A → Switch to B → Expense not visible
✓ Switch back to A → Expense still there
```

### 4. E2E Journeys (Optional but Recommended)
```
⏳ Complete solo user journey
⏳ Complete couple user journey
⏳ Mixed accounts journey
⏳ Account management journey
⏳ Error recovery journey
```

---

## CI/CD Integration

### Required GitHub Actions
```yaml
✓ Run unit tests on every push
✓ Run integration tests on PR
✓ Run Firestore rules tests
✓ Generate coverage report
✓ Enforce 80% minimum coverage
✓ Block merge if tests fail
```

### Test Scripts Needed
```json
{
  "test": "jest",
  "test:unit": "jest --testPathPattern=services|utils|constants",
  "test:integration": "jest --testPathPattern=integration",
  "test:rules": "jest --testPathPattern=firestore-rules",
  "test:coverage": "jest --coverage",
  "test:all": "npm run test:unit && test:integration && test:rules"
}
```

---

## Success Criteria

### Before Launch ✅
- [x] Phase 1 complete (Data Layer) - Code done
- [ ] `accountService.test.js` - 90%+ coverage
- [ ] `AuthContext.test.js` updated
- [ ] `AccountContext.test.js` - 90%+ coverage
- [ ] Firestore rules tests - 100% coverage
- [ ] Integration tests for account flows
- [ ] All critical scenarios tested
- [ ] CI/CD pipeline configured
- [ ] Coverage ≥ 80%

### Post-Launch (Within 2 weeks)
- [ ] Component tests complete
- [ ] Screen tests complete
- [ ] Multi-user collaboration tests
- [ ] Coverage ≥ 85%

### Future Enhancements
- [ ] E2E tests for critical journeys
- [ ] Performance benchmarks
- [ ] Accessibility audit
- [ ] Visual regression tests

---

## Quick Start Guide

### 1. Set Up Firestore Rules Testing
```bash
npm install --save-dev @firebase/rules-unit-testing
```

### 2. Create Test File Structure
```bash
mkdir -p src/__tests__/services
mkdir -p src/__tests__/contexts
mkdir -p src/__tests__/integration
mkdir -p src/__tests__/firestore-rules
```

### 3. Start with Highest Priority
```bash
# 1. Account Service Tests (Day 1-2)
touch src/__tests__/services/accountService.test.js

# 2. Auth Context Updates (Day 3)
# Edit existing: src/__tests__/contexts/AuthContext.test.js

# 3. Account Context Tests (Day 4-5)
touch src/__tests__/contexts/AccountContext.test.js
```

### 4. Run Tests
```bash
npm test                  # All tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage
```

---

## Risk Mitigation

| Risk | Impact | Test Coverage | Status |
|------|--------|---------------|--------|
| Firestore data leakage | 🔴 CRITICAL | Rules tests (100%) | ✅ Planned |
| Account switching bugs | 🔴 HIGH | Unit + Integration | ✅ Planned |
| Data isolation failure | 🔴 HIGH | Integration tests | ✅ Planned |
| Auth context errors | 🟡 MEDIUM | Context unit tests | ✅ Planned |
| UI component bugs | 🟢 LOW | Component tests | ⏳ Post-launch |

---

## Summary

### By the Numbers
- **Total Tests Planned**: 150-200+
- **Existing Tests**: 133 ✅
- **New Tests Needed**: 110-130 (critical) + 68-87 (optional)
- **Implementation Time**: 3-4 weeks
- **Coverage Target**: 85%+
- **Critical Security Tests**: 30-40 (Firestore rules)

### Immediate Next Steps
1. ✅ Phase 1 code complete
2. ❌ Implement `accountService.test.js` (START HERE)
3. ❌ Update `AuthContext.test.js`
4. ❌ Implement Firestore rules tests (CRITICAL FOR SECURITY)
5. ❌ Set up CI/CD pipeline

**Status**: Ready to begin testing Phase 1 implementation! 🚀
