/**
 * Demonstration of Category Predictor
 * Shows sample predictions with confidence scores
 */

const { predictCategory } = require('./src/ml/categoryPredictor');
const { genericCategoryMatcher } = require('./src/ml/genericCategoryMatcher');
const { experiencedUser, repeatedMerchantsUser } = require('./__tests__/fixtures/userExpenseHistory');

console.log('='.repeat(80));
console.log('ML-BASED CATEGORY PREDICTOR DEMONSTRATION');
console.log('='.repeat(80));

// Test cases
const testCases = [
  {
    title: 'Exact Merchant Match (High Confidence)',
    merchant: 'Starbucks',
    amount: 5.67,
    description: 'morning coffee',
    user: repeatedMerchantsUser
  },
  {
    title: 'Fuzzy Merchant Match',
    merchant: 'Whole Foods',
    amount: 67.00,
    description: '',
    user: experiencedUser
  },
  {
    title: 'Keyword-Based Prediction',
    merchant: 'Local Cafe',
    amount: 12.50,
    description: 'breakfast coffee and bagel',
    user: experiencedUser
  },
  {
    title: 'Generic Matcher (No History)',
    merchant: 'Shell Gas Station',
    amount: 45.00,
    description: '',
    user: { expenses: [] }
  },
  {
    title: 'Below Threshold (Unknown Merchant)',
    merchant: 'Random Store XYZ 123',
    amount: 999.99,
    description: '',
    user: { expenses: [] }
  },
  {
    title: 'Multiple Signals Agree',
    merchant: 'Home Depot',
    amount: 87.45,
    description: 'hardware and paint supplies',
    user: repeatedMerchantsUser
  }
];

testCases.forEach((test, index) => {
  console.log(`\n${index + 1}. ${test.title}`);
  console.log('-'.repeat(80));
  console.log(`   Merchant: "${test.merchant}"`);
  console.log(`   Amount: $${test.amount}`);
  console.log(`   Description: "${test.description || 'none'}"`);
  console.log(`   User History: ${test.user.expenses.length} expenses`);

  const result = predictCategory(
    test.merchant,
    test.amount,
    test.description,
    test.user.expenses
  );

  console.log('\n   PREDICTION:');
  console.log(`   Category: ${result.category || 'null (below threshold)'}`);
  console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
  console.log(`   Source: ${result.source}`);
  console.log(`   Below Threshold: ${result.belowThreshold}`);

  if (result.alternatives && result.alternatives.length > 0) {
    console.log('\n   ALTERNATIVES:');
    result.alternatives.forEach((alt, i) => {
      console.log(`   ${i + 1}. ${alt.category} (${(alt.confidence * 100).toFixed(1)}%)`);
    });
  }
});

console.log('\n' + '='.repeat(80));
console.log('GENERIC MATCHER EXAMPLES');
console.log('='.repeat(80));

const genericTests = [
  { merchant: 'Whole Foods Market', amount: 67.32 },
  { merchant: 'Starbucks', amount: 5.67 },
  { merchant: 'Shell Gas Station', amount: 45.00 },
  { merchant: 'Home Depot', amount: 87.45 },
  { merchant: 'AMC Theater', amount: 28.50 },
  { merchant: 'Unknown Store', amount: 50.00 }
];

genericTests.forEach((test, index) => {
  const result = genericCategoryMatcher(test.merchant, test.amount);
  console.log(`\n${index + 1}. ${test.merchant} ($${test.amount})`);
  console.log(`   → ${result.category} (${(result.confidence * 100).toFixed(1)}%)`);
});

console.log('\n' + '='.repeat(80));
console.log('CONFIDENCE SCORING ALGORITHM');
console.log('='.repeat(80));
console.log(`
The predictor uses a multi-layered approach:

1. EXACT MERCHANT MATCH (Confidence: 90-99%)
   - Searches user history for exact merchant name
   - Confidence based on frequency and consistency
   - Example: "Starbucks" visited 20x as "food" → 95%+ confidence

2. FUZZY MERCHANT MATCH (Confidence: 60-85%)
   - Uses string-similarity algorithm (threshold: 60%)
   - Adjusts confidence based on similarity score
   - Example: "Whole Foods" matches "Whole Foods Market" → ~80%

3. KEYWORD ANALYSIS (Confidence: 50-80%)
   - Analyzes description text for category keywords
   - Multiple keywords increase confidence
   - Example: "breakfast coffee bagel" → "food" ~70%

4. GENERIC MATCHER (Confidence: 40-90%)
   - Fallback using predefined keyword rules
   - Combines keyword matching (75%) + amount patterns (25%)
   - Example: "Starbucks" $5.67 → "food" ~75%

5. AGGREGATION
   - Combines multiple sources with weighted voting
   - Exact merchant > Fuzzy > Keyword > Generic
   - Agreement bonus: +10% when multiple sources agree

6. THRESHOLD: 55%
   - Predictions below 55% return null category
   - belowThreshold flag indicates low confidence
   - Ensures quality predictions
`);

console.log('='.repeat(80));
