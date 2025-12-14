# Add Expense - Complete Field Reference
## Quick Implementation Guide for Dividela

---

## 📋 **All Required Fields**

| Field | Type | Status | Implementation |
|-------|------|--------|----------------|
| **Amount** | Number | Required | Large 48px input with real-time formatting |
| **Currency** | Dropdown | Required | 10 currencies with symbol display |
| **Who Paid** | Selection | Required | Visual cards for Partner 1 / Partner 2 |
| **Split Method** | Selection | Required | Equal (50/50), Full, or Custom split |
| **Category** | Selection | Required | Visual card grid with icons |
| **Date** | Date | Required | Date picker (default: today) |
| **Description/Note** | Text | Optional | Textarea with dashed border + hints |

---

## 💰 **1. Amount Field**

### **Features:**
- ✅ Large 48px font size (hero element)
- ✅ Real-time thousand separator formatting
- ✅ Automatic decimal point handling
- ✅ Currency symbol display
- ✅ Formatted preview below input

### **Example:**
```
User Input: 1234.56
Display: 1,234.56
Preview: $1,234.56 USD
```

### **Code:**
```html
<input 
  type="text" 
  id="amount"
  placeholder="0.00"
  inputmode="decimal"
  required
>
```

### **Validation:**
- Min: 0.01
- Max: 999,999.99
- Format: Numbers and decimal point only
- Auto-format with commas

---

## 💱 **2. Currency Field**

### **Features:**
- ✅ Dropdown with 10 major currencies
- ✅ Dynamic symbol display
- ✅ Updates formatted amount display
- ✅ Default: USD

### **Supported Currencies:**
```
USD - $ (United States Dollar)
EUR - € (Euro)
GBP - £ (British Pound)
CAD - C$ (Canadian Dollar)
AUD - A$ (Australian Dollar)
JPY - ¥ (Japanese Yen)
CNY - ¥ (Chinese Yuan)
INR - ₹ (Indian Rupee)
MXN - $ (Mexican Peso)
BRL - R$ (Brazilian Real)
```

### **Code:**
```html
<select id="currency" required>
  <option value="USD">USD</option>
  <option value="EUR">EUR</option>
  <!-- ... more currencies -->
</select>
```

### **Symbol Mapping:**
```javascript
const currencySymbols = {
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  // etc...
};
```

---

## 👤 **3. Who Paid Field**

### **Features:**
- ✅ Visual card-based selection
- ✅ Partner avatars/icons
- ✅ Partner names displayed
- ✅ Clear selected state
- ✅ 2-option grid layout

### **Options:**
```
👤 Partner 1 (e.g., "Alex")
👤 Partner 2 (e.g., "Jordan")
```

### **Code:**
```html
<div class="who-paid-options">
  <div class="paid-option" data-paidby="partner1">
    <div class="paid-icon">👤</div>
    <div class="paid-name">Alex</div>
  </div>
  <div class="paid-option" data-paidby="partner2">
    <div class="paid-icon">👤</div>
    <div class="paid-name">Jordan</div>
  </div>
</div>
<input type="hidden" id="paidBy" required>
```

### **Selected State:**
- Purple background (#667eea)
- White text
- Box shadow
- aria-checked="true"

### **Why This Matters:**
In a couples expense-sharing app, knowing who paid is essential for calculating who owes whom. This field determines the initial balance before the split is applied.

---

## ⚖️ **4. Split Method Field**

### **Features:**
- ✅ Three split options
- ✅ Clear descriptions for each
- ✅ Custom percentage input
- ✅ Auto-complementary calculation
- ✅ Real-time split preview

### **Split Options:**

**1. Equal Split (50/50)**
```
⚖️ Split Equally (50/50)
Each person pays half
```
- Default option for most couples
- Simple and fair
- Partner 1: 50% | Partner 2: 50%

**2. Paid in Full**
```
💯 Paid in Full
Only the payer covers this expense
```
- One person covers 100%
- Other person pays 0%
- Common for: gifts, personal items, solo activities
- Percentages determined by "Who Paid"

**3. Custom Split**
```
🎯 Custom Split
Choose your own percentages
```
- User defines custom percentages
- Must add up to 100%
- Common for: unequal income splits (70/30, 60/40, etc.)
- Auto-complementary inputs (if P1 = 70%, then P2 = 30%)

### **Code:**
```html
<div class="split-options">
  <div class="split-option" data-split="equal">
    <div class="split-header">
      <span class="split-icon">⚖️</span>
      <span class="split-title">Split Equally (50/50)</span>
    </div>
    <div class="split-description">Each person pays half</div>
  </div>
  
  <div class="split-option" data-split="full">
    <div class="split-header">
      <span class="split-icon">💯</span>
      <span class="split-title">Paid in Full</span>
    </div>
    <div class="split-description">Only the payer covers this expense</div>
  </div>
  
  <div class="split-option" data-split="custom">
    <div class="split-header">
      <span class="split-icon">🎯</span>
      <span class="split-title">Custom Split</span>
    </div>
    <div class="split-description">Choose your own percentages</div>
  </div>
</div>

<!-- Custom Split Inputs (shown only when custom is selected) -->
<div class="custom-split-wrapper">
  <div class="split-inputs">
    <div class="split-input-group">
      <div class="split-input-label">Alex</div>
      <input type="number" id="partner1Split" min="0" max="100" value="50">
      <div>%</div>
    </div>
    <div class="split-divider">/</div>
    <div class="split-input-group">
      <div class="split-input-label">Jordan</div>
      <input type="number" id="partner2Split" min="0" max="100" value="50">
      <div>%</div>
    </div>
  </div>
</div>
```

### **Custom Split Logic:**
```javascript
// Auto-complementary calculation
partner1SplitInput.addEventListener('input', function() {
  const value = parseInt(this.value) || 0;
  if (value >= 0 && value <= 100) {
    partner2SplitInput.value = 100 - value;
  }
});

// Validation: must add up to 100%
function validateCustomSplit() {
  const p1 = parseInt(partner1Split.value) || 0;
  const p2 = parseInt(partner2Split.value) || 0;
  return (p1 + p2 === 100);
}
```

### **Split Preview:**
Real-time calculation showing each person's share:
```
💡 Split Preview
─────────────────
Alex:    $62.50
Jordan:  $37.50
```

---

## 🏷️ **5. Category Field**

### **Features:**
- ✅ Visual card-based selection
- ✅ Emoji icons for quick recognition
- ✅ 6 default categories (+ custom)
- ✅ One-tap selection
- ✅ Clear selected state

### **Default Categories:**
```
🍕 Food & Dining
🛒 Groceries
🚗 Transport
🏠 Home & Utilities
🎬 Entertainment
📦 Other
```

### **Code:**
```html
<div class="category-grid">
  <div class="category-card" data-category="food">
    <div class="category-icon">🍕</div>
    <div class="category-name">Food</div>
  </div>
  <!-- More categories -->
</div>
<input type="hidden" id="category" required>
```

### **Selected State:**
- Purple background (#667eea)
- White text
- Box shadow
- aria-checked="true"

---

## 📅 **6. Date Field**

### **Features:**
- ✅ Native date picker
- ✅ Pre-filled with today's date
- ✅ Can change to past dates
- ✅ Cannot select future dates

### **Code:**
```html
<input 
  type="date" 
  id="date"
  required
>

<script>
// Set today as default
document.getElementById('date').valueAsDate = new Date();
</script>
```

### **Validation:**
- Required: Yes
- Format: YYYY-MM-DD
- Max: Today
- Default: Today

---

## 📝 **7. Description/Note Field (OPTIONAL)**

### **Features:**
- ✅ Clearly marked "OPTIONAL"
- ✅ Dashed border (visual cue)
- ✅ Light purple background
- ✅ Helpful hint with example
- ✅ Icon for additional clarity
- ✅ Expandable textarea

### **Label:**
```
Add a note [OPTIONAL badge]
```

### **Hint Text:**
```
ℹ️ Help remember what this was for (e.g., "Dinner at Luigi's")
```

### **Code:**
```html
<label class="input-label">
  Add a note
  <span class="optional-badge">Optional</span>
</label>

<div class="description-wrapper">
  <div class="description-hint">
    <svg>...</svg>
    Help remember what this was for (e.g., "Dinner at Luigi's")
  </div>
  <textarea 
    id="description"
    placeholder="Add details here..."
  ></textarea>
</div>
```

### **Styling:**
```css
.description-wrapper {
  background: #f8f9ff;
  border: 2px dashed #cbd5e0;
  border-radius: 12px;
  padding: 16px;
}
```

### **Validation:**
- Required: No
- MaxLength: 500 characters
- Can be null/empty

---

## 🎨 **Visual Hierarchy Summary**

```
┌─────────────────────────────────────┐
│         Add Expense                  │ ← Header
├─────────────────────────────────────┤
│                                      │
│   How much did you spend?            │ ← Label
│   [USD ▼]  $ 1,234.56               │ ← Currency + Amount (48px)
│   $1,234.56 USD                      │ ← Formatted display
│                                      │
├─────────────────────────────────────┤
│   Who paid for this? [REQUIRED]      │
│   ┌──────────┐ ┌──────────┐         │
│   │   👤     │ │   👤     │         │ ← Partner cards
│   │  Alex    │ │ Jordan   │         │
│   └──────────┘ └──────────┘         │
│                                      │
├─────────────────────────────────────┤
│   How to split this? [REQUIRED]      │
│   ┌─────────────────────────────┐   │
│   │ ⚖️ Split Equally (50/50)    │   │ ← Split options
│   │ Each person pays half        │   │
│   └─────────────────────────────┘   │
│   ┌─────────────────────────────┐   │
│   │ 💯 Paid in Full              │   │
│   │ Only the payer covers this   │   │
│   └─────────────────────────────┘   │
│   ┌─────────────────────────────┐   │
│   │ 🎯 Custom Split              │   │
│   │ Choose your own percentages  │   │
│   └─────────────────────────────┘   │
│                                      │
│   💡 Split Preview                   │ ← Real-time preview
│   Alex:    $62.50                    │
│   Jordan:  $37.50                    │
│                                      │
├─────────────────────────────────────┤
│   What's this for? [REQUIRED]        │
│   ┌─────┐ ┌─────┐ ┌─────┐          │
│   │ 🍕  │ │ 🛒  │ │ 🚗  │          │ ← Category cards
│   │Food │ │Groc.│ │Trans│          │
│   └─────┘ └─────┘ └─────┘          │
│                                      │
├─────────────────────────────────────┤
│   When was this? [REQUIRED]          │
│   [2025-11-30        ▼]             │ ← Date picker
│                                      │
├─────────────────────────────────────┤
│   Add a note [OPTIONAL]              │
│   ┌···························┐      │
│   │ ℹ️ e.g., "Dinner at..."  │      │ ← Description
│   │                           │      │   (dashed border)
│   │                           │      │
│   └···························┘      │
│                                      │
├─────────────────────────────────────┤
│   [Cancel]  [Add Expense]            │ ← Actions
└─────────────────────────────────────┘
```

---

## 🔢 **Number Formatting Examples**

### **Input → Display:**

```
Input: 5          → Display: 5
Input: 50         → Display: 50
Input: 500        → Display: 500
Input: 1234       → Display: 1,234
Input: 12345      → Display: 12,345
Input: 123456     → Display: 123,456
Input: 1234567    → Display: 1,234,567
Input: 1234.5     → Display: 1,234.5
Input: 1234.56    → Display: 1,234.56
Input: 1234.567   → Display: 1,234.56 (auto-limit)
```

### **Currency Formatting:**

```javascript
formatCurrency(1234.56, 'USD') → "$1,234.56"
formatCurrency(1234.56, 'EUR') → "€1,234.56"
formatCurrency(1234.56, 'GBP') → "£1,234.56"
formatCurrency(1234.56, 'JPY') → "¥1,235" (no decimals)
formatCurrency(1234.56, 'INR') → "₹1,234.56"
```

---

## 📱 **Responsive Behavior**

### **Desktop (>480px):**
- Currency + Amount side-by-side
- 3-column category grid
- 48px amount font

### **Mobile (≤480px):**
- Currency + Amount stacked
- 2-column category grid
- 40px amount font
- Full-screen takeover

---

## ✅ **Validation Rules**

```javascript
const validationRules = {
  amount: {
    required: true,
    type: 'number',
    min: 0.01,
    max: 999999.99,
    errorMessage: 'Please enter a valid amount'
  },
  
  currency: {
    required: true,
    type: 'string',
    allowed: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'MXN', 'BRL'],
    default: 'USD',
    errorMessage: 'Please select a currency'
  },
  
  paidBy: {
    required: true,
    type: 'string',
    allowed: ['partner1', 'partner2'],
    errorMessage: 'Please select who paid'
  },
  
  splitMethod: {
    required: true,
    type: 'string',
    allowed: ['equal', 'full', 'custom'],
    default: 'equal',
    errorMessage: 'Please select how to split'
  },
  
  splitPercentage1: {
    required: true,
    type: 'integer',
    min: 0,
    max: 100,
    customValidation: (value, splitPercentage2) => {
      return value + splitPercentage2 === 100;
    },
    errorMessage: 'Percentages must add up to 100%'
  },
  
  splitPercentage2: {
    required: true,
    type: 'integer',
    min: 0,
    max: 100,
    errorMessage: 'Percentages must add up to 100%'
  },
  
  category: {
    required: true,
    type: 'string',
    allowed: ['food', 'groceries', 'transport', 'home', 'entertainment', 'other'],
    errorMessage: 'Please select a category'
  },
  
  date: {
    required: true,
    type: 'date',
    format: 'YYYY-MM-DD',
    max: 'today',
    default: 'today',
    errorMessage: 'Please select a date'
  },
  
  description: {
    required: false,
    type: 'string',
    maxLength: 500,
    default: null,
    errorMessage: null
  }
};
```

---

## 🎯 **Data Structure**

### **Complete Expense Object:**

```javascript
{
  // Auto-generated
  id: "exp_1234567890",
  createdAt: "2025-11-30T20:15:30Z",
  createdBy: "user_abc123",
  coupleId: "couple_xyz789",
  
  // User input - REQUIRED
  amount: 125.50,              // Float
  currency: "USD",             // String (ISO code)
  paidBy: "partner1",          // String (partner1 or partner2)
  splitMethod: "equal",        // String (equal, full, custom)
  splitPercentage1: 50,        // Integer (0-100)
  splitPercentage2: 50,        // Integer (0-100)
  category: "food",            // String
  date: "2025-11-30",          // String (ISO date)
  
  // User input - OPTIONAL
  description: "Dinner at Luigi's", // String or null
  
  // Computed/metadata
  monthYear: "2025-11",        // For budget tracking
  categoryIcon: "🍕",          // For display
  formattedAmount: "$125.50",  // For display
  
  // Settlement calculations (computed on backend)
  partner1Owes: 62.75,         // Amount partner1 should pay
  partner2Owes: 62.75,         // Amount partner2 should pay
  settlementImpact: {          // Who owes whom
    partner1ToPay: 0,          // If partner1 paid, they're owed
    partner2ToPay: 0           // If partner2 paid, they're owed
  }
}
```

### **Split Method Logic Examples:**

**Example 1: Equal Split, Partner 1 Paid**
```javascript
{
  amount: 100.00,
  paidBy: "partner1",
  splitMethod: "equal",
  splitPercentage1: 50,
  splitPercentage2: 50,
  
  // Calculated:
  partner1Owes: 50.00,  // Partner1's share
  partner2Owes: 50.00,  // Partner2's share
  // Settlement: Partner2 owes Partner1 $50.00
}
```

**Example 2: Paid in Full, Partner 2 Paid**
```javascript
{
  amount: 100.00,
  paidBy: "partner2",
  splitMethod: "full",
  splitPercentage1: 0,
  splitPercentage2: 100,
  
  // Calculated:
  partner1Owes: 0,      // Partner1 pays nothing
  partner2Owes: 100.00, // Partner2 pays everything
  // Settlement: No debt (Partner2 paid for themselves)
}
```

**Example 3: Custom Split (70/30), Partner 1 Paid**
```javascript
{
  amount: 100.00,
  paidBy: "partner1",
  splitMethod: "custom",
  splitPercentage1: 70,
  splitPercentage2: 30,
  
  // Calculated:
  partner1Owes: 70.00,  // Partner1's share
  partner2Owes: 30.00,  // Partner2's share
  // Settlement: Partner2 owes Partner1 $30.00
}
```

### **Firestore Structure:**

```
expenses/
  └── exp_1234567890/
      ├── amount: 125.50
      ├── currency: "USD"
      ├── paidBy: "partner1"
      ├── splitMethod: "equal"
      ├── splitPercentage1: 50
      ├── splitPercentage2: 50
      ├── category: "food"
      ├── date: "2025-11-30"
      ├── description: "Dinner at Luigi's"
      ├── createdAt: Timestamp
      ├── createdBy: "user_abc123"
      └── coupleId: "couple_xyz789"
```

---

## 🚀 **Implementation Checklist**

### **Phase 1: Core Fields**
- [ ] Amount input with formatting
- [ ] Currency dropdown with symbols
- [ ] Category visual cards
- [ ] Date picker with default
- [ ] Description textarea

### **Phase 2: Styling**
- [ ] Visual hierarchy established
- [ ] Required/Optional badges
- [ ] Dashed border for optional fields
- [ ] Color system implemented
- [ ] Responsive breakpoints

### **Phase 3: Functionality**
- [ ] Real-time number formatting
- [ ] Currency symbol updates
- [ ] Category selection logic
- [ ] Form validation
- [ ] Error handling

### **Phase 4: Polish**
- [ ] Animations and transitions
- [ ] Success messages
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] Mobile optimization

### **Phase 5: Integration**
- [ ] Firestore connection
- [ ] Budget tracking update
- [ ] Settlement calculation
- [ ] Category customization
- [ ] Error logging

---

## 📚 **Key Files**

1. **add-expense-complete.html** - Working prototype with all fields
2. **ux-analysis-complete.md** - Full UX analysis document
3. **field-reference.md** - This quick reference guide

---

## 🎓 **Quick Tips**

### **For Developers:**
- Use `inputmode="decimal"` for amount field on mobile
- Store amounts as floats, display with formatting
- Validate currency against allowed list
- Use hidden input for category selection
- Pre-fill date with `valueAsDate = new Date()`

### **For Designers:**
- Amount field is the hero - make it big (48px)
- Use dashed borders for optional fields
- Add helpful hints, not just labels
- Category icons improve recognition 3x
- Purple (#667eea) for primary actions

### **For Product Managers:**
- Test with 5+ real couples before launch
- A/B test completion rates
- Monitor currency usage by region
- Track description field adoption
- Measure time-to-complete metric

---

**Last Updated:** November 30, 2025  
**Version:** 2.0 - Complete  
**All Fields Included:** ✅ Amount, Currency, Category, Date, Description