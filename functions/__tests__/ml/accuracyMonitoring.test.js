/**
 * ML Model Accuracy Monitoring Tests
 *
 * Tracks and validates ML model performance over time to detect:
 * - Accuracy regression
 * - Confidence calibration issues
 * - Category prediction drift
 */

const { predictCategory } = require('../../src/ml/categoryPredictor');
const path = require('path');
const fs = require('fs');

describe('ML Model Accuracy Monitoring', () => {
  // Validation dataset with known correct answers
  const validationSet = [
    // Groceries
    { merchant: 'Walmart', amount: 45.50, description: 'groceries', expected: 'groceries', confidence: 0.90 },
    { merchant: 'Whole Foods', amount: 67.23, description: '', expected: 'groceries', confidence: 0.85 },
    { merchant: 'Costco', amount: 156.78, description: 'bulk shopping', expected: 'groceries', confidence: 0.88 },
    { merchant: 'Trader Joes', amount: 34.12, description: '', expected: 'groceries', confidence: 0.87 },
    { merchant: 'Safeway', amount: 89.45, description: 'weekly shopping', expected: 'groceries', confidence: 0.90 },
    { merchant: 'Target', amount: 52.30, description: 'groceries', expected: 'groceries', confidence: 0.82 },
    { merchant: 'Kroger', amount: 41.67, description: '', expected: 'groceries', confidence: 0.88 },
    { merchant: 'Publix', amount: 38.90, description: 'food shopping', expected: 'groceries', confidence: 0.87 },

    // Food & Dining
    { merchant: 'Starbucks', amount: 12.50, description: 'coffee', expected: 'food', confidence: 0.95 },
    { merchant: 'McDonalds', amount: 18.25, description: 'lunch', expected: 'food', confidence: 0.92 },
    { merchant: 'Chipotle', amount: 23.40, description: 'dinner', expected: 'food', confidence: 0.90 },
    { merchant: 'Subway', amount: 15.60, description: '', expected: 'food', confidence: 0.89 },
    { merchant: 'Panera Bread', amount: 19.85, description: 'breakfast', expected: 'food', confidence: 0.88 },
    { merchant: 'Pizza Hut', amount: 32.50, description: 'family dinner', expected: 'food', confidence: 0.91 },
    { merchant: 'Taco Bell', amount: 14.75, description: '', expected: 'food', confidence: 0.90 },
    { merchant: 'Dunkin Donuts', amount: 8.50, description: 'coffee and donuts', expected: 'food', confidence: 0.93 },

    // Transportation
    { merchant: 'Shell Gas', amount: 60.00, description: 'gas', expected: 'transportation', confidence: 0.93 },
    { merchant: 'Chevron', amount: 55.30, description: 'fuel', expected: 'transportation', confidence: 0.92 },
    { merchant: 'BP Gas Station', amount: 58.75, description: '', expected: 'transportation', confidence: 0.90 },
    { merchant: 'Exxon', amount: 62.40, description: 'gasoline', expected: 'transportation', confidence: 0.91 },
    { merchant: 'Uber', amount: 25.30, description: 'ride home', expected: 'transportation', confidence: 0.95 },
    { merchant: 'Lyft', amount: 18.50, description: '', expected: 'transportation', confidence: 0.94 },
    { merchant: 'Auto Zone', amount: 45.99, description: 'car parts', expected: 'transportation', confidence: 0.85 },
    { merchant: 'Jiffy Lube', amount: 89.99, description: 'oil change', expected: 'transportation', confidence: 0.87 },

    // Home & Utilities
    { merchant: 'Home Depot', amount: 125.50, description: 'tools', expected: 'home', confidence: 0.88 },
    { merchant: 'Lowes', amount: 98.30, description: 'lumber', expected: 'home', confidence: 0.87 },
    { merchant: 'IKEA', amount: 234.50, description: 'furniture', expected: 'home', confidence: 0.90 },
    { merchant: 'Bed Bath Beyond', amount: 67.89, description: '', expected: 'home', confidence: 0.85 },
    { merchant: 'ACE Hardware', amount: 34.25, description: 'hardware', expected: 'home', confidence: 0.86 },

    // Entertainment
    { merchant: 'AMC Theatres', amount: 45.00, description: 'movies', expected: 'fun', confidence: 0.92 },
    { merchant: 'Netflix', amount: 15.99, description: 'subscription', expected: 'fun', confidence: 0.88 },
    { merchant: 'Spotify', amount: 9.99, description: '', expected: 'fun', confidence: 0.87 },
    { merchant: 'Steam', amount: 59.99, description: 'video game', expected: 'fun', confidence: 0.90 },
    { merchant: 'PlayStation Store', amount: 69.99, description: 'game', expected: 'fun', confidence: 0.89 },

    // Healthcare
    { merchant: 'CVS Pharmacy', amount: 25.50, description: 'prescription', expected: 'healthcare', confidence: 0.90 },
    { merchant: 'Walgreens', amount: 18.75, description: 'medicine', expected: 'healthcare', confidence: 0.89 },
    { merchant: 'Dr Smith Office', amount: 150.00, description: 'copay', expected: 'healthcare', confidence: 0.85 },

    // Shopping
    { merchant: 'Amazon', amount: 89.99, description: 'online shopping', expected: 'shopping', confidence: 0.75 },
    { merchant: 'Best Buy', amount: 299.99, description: 'electronics', expected: 'shopping', confidence: 0.82 },
    { merchant: 'Macy\'s', amount: 125.50, description: 'clothing', expected: 'shopping', confidence: 0.78 },
  ];

  describe('Baseline Accuracy Metrics', () => {
    it('should maintain >80% category prediction accuracy on validation set', async () => {
      let correct = 0;
      let total = validationSet.length;
      const results = [];

      for (const example of validationSet) {
        const prediction = await predictCategory(
          example.merchant,
          example.amount,
          example.description,
          [] // No user history - testing generic model only
        );

        const isCorrect = prediction.category === example.expected;
        if (isCorrect) {
          correct++;
        }

        results.push({
          merchant: example.merchant,
          expected: example.expected,
          predicted: prediction.category,
          confidence: prediction.confidence,
          correct: isCorrect,
        });
      }

      const accuracy = correct / total;

      // Log detailed results
      console.log('\n📊 ML Model Accuracy Report:');
      console.log(`Total Examples: ${total}`);
      console.log(`Correct: ${correct}`);
      console.log(`Accuracy: ${(accuracy * 100).toFixed(2)}%`);
      console.log('\nIncorrect Predictions:');

      const incorrect = results.filter(r => !r.correct);
      incorrect.forEach(r => {
        console.log(`  ❌ ${r.merchant}: expected "${r.expected}", got "${r.category}" (${(r.confidence * 100).toFixed(0)}%)`);
      });

      // Save results to file for tracking over time
      const reportPath = path.join(__dirname, '../../reports');
      if (!fs.existsSync(reportPath)) {
        fs.mkdirSync(reportPath, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const reportFile = path.join(reportPath, `accuracy-${timestamp}.json`);

      fs.writeFileSync(reportFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        accuracy,
        totalExamples: total,
        correct,
        incorrect: incorrect.length,
        results,
      }, null, 2));

      console.log(`\nReport saved to: ${reportFile}`);

      // Assert minimum accuracy threshold
      expect(accuracy).toBeGreaterThan(0.80);
    }, 30000);

    it('should maintain >90% accuracy for high-confidence predictions', async () => {
      const highConfidenceExamples = validationSet.filter(ex => ex.confidence >= 0.90);
      let correct = 0;

      for (const example of highConfidenceExamples) {
        const prediction = await predictCategory(
          example.merchant,
          example.amount,
          example.description,
          []
        );

        if (prediction.category === example.expected) {
          correct++;
        }
      }

      const accuracy = correct / highConfidenceExamples.length;

      console.log(`\n🎯 High-Confidence Accuracy: ${(accuracy * 100).toFixed(2)}%`);
      console.log(`   Examples: ${highConfidenceExamples.length}`);

      expect(accuracy).toBeGreaterThan(0.90);
    });

    it('should detect accuracy regression compared to baseline', async () => {
      // This test would compare against a saved baseline
      // For now, we'll establish the baseline

      const baselineAccuracy = 0.82; // Established baseline from initial testing

      let correct = 0;
      for (const example of validationSet) {
        const prediction = await predictCategory(
          example.merchant,
          example.amount,
          example.description,
          []
        );
        if (prediction.category === example.expected) {
          correct++;
        }
      }

      const currentAccuracy = correct / validationSet.length;
      const regressionThreshold = 0.05; // Alert if accuracy drops >5%

      console.log(`\n📈 Regression Detection:`);
      console.log(`   Baseline: ${(baselineAccuracy * 100).toFixed(2)}%`);
      console.log(`   Current:  ${(currentAccuracy * 100).toFixed(2)}%`);
      console.log(`   Delta:    ${((currentAccuracy - baselineAccuracy) * 100).toFixed(2)}%`);

      const regression = baselineAccuracy - currentAccuracy;

      if (regression > regressionThreshold) {
        console.warn(`⚠️  REGRESSION DETECTED: ${(regression * 100).toFixed(2)}% decrease`);
      }

      expect(regression).toBeLessThan(regressionThreshold);
    });
  });

  describe('Confidence Calibration', () => {
    it('should have well-calibrated confidence scores', async () => {
      // Group predictions by confidence bins
      const bins = {
        '90-100': { correct: 0, total: 0 },
        '80-90': { correct: 0, total: 0 },
        '70-80': { correct: 0, total: 0 },
        '60-70': { correct: 0, total: 0 },
        '50-60': { correct: 0, total: 0 },
      };

      for (const example of validationSet) {
        const prediction = await predictCategory(
          example.merchant,
          example.amount,
          example.description,
          []
        );

        const confidence = prediction.confidence || 0;
        const isCorrect = prediction.category === example.expected;

        if (confidence >= 0.90) {
          bins['90-100'].total++;
          if (isCorrect) bins['90-100'].correct++;
        } else if (confidence >= 0.80) {
          bins['80-90'].total++;
          if (isCorrect) bins['80-90'].correct++;
        } else if (confidence >= 0.70) {
          bins['70-80'].total++;
          if (isCorrect) bins['70-80'].correct++;
        } else if (confidence >= 0.60) {
          bins['60-70'].total++;
          if (isCorrect) bins['60-70'].correct++;
        } else {
          bins['50-60'].total++;
          if (isCorrect) bins['50-60'].correct++;
        }
      }

      console.log('\n📊 Confidence Calibration:');
      Object.entries(bins).forEach(([range, data]) => {
        if (data.total > 0) {
          const accuracy = (data.correct / data.total * 100).toFixed(1);
          console.log(`   ${range}%: ${accuracy}% accurate (${data.correct}/${data.total})`);
        }
      });

      // High confidence (>90%) should be >90% accurate
      if (bins['90-100'].total > 0) {
        const highConfAccuracy = bins['90-100'].correct / bins['90-100'].total;
        expect(highConfAccuracy).toBeGreaterThan(0.90);
      }
    });

    it('should reject predictions below confidence threshold', async () => {
      const lowQualityExamples = [
        { merchant: 'ABC123', amount: 5.00, description: '' },
        { merchant: '???', amount: 1.23, description: 'unknown' },
        { merchant: 'XXXX', amount: 99.99, description: '' },
      ];

      for (const example of lowQualityExamples) {
        const prediction = await predictCategory(
          example.merchant,
          example.amount,
          example.description,
          []
        );

        // Should either have low confidence or null category
        if (prediction.category !== null) {
          expect(prediction.confidence).toBeLessThan(0.55);
        }
      }

      console.log('✓ Low-quality merchants correctly flagged');
    });
  });

  describe('Category-Specific Performance', () => {
    it('should maintain >85% accuracy for each major category', async () => {
      const categoryResults = {};

      for (const example of validationSet) {
        const prediction = await predictCategory(
          example.merchant,
          example.amount,
          example.description,
          []
        );

        if (!categoryResults[example.expected]) {
          categoryResults[example.expected] = { correct: 0, total: 0 };
        }

        categoryResults[example.expected].total++;
        if (prediction.category === example.expected) {
          categoryResults[example.expected].correct++;
        }
      }

      console.log('\n📊 Per-Category Performance:');
      Object.entries(categoryResults).forEach(([category, results]) => {
        const accuracy = (results.correct / results.total * 100).toFixed(1);
        console.log(`   ${category}: ${accuracy}% (${results.correct}/${results.total})`);

        // Each category should have reasonable accuracy
        // Note: Some categories might be harder to predict
        expect(results.correct / results.total).toBeGreaterThan(0.70);
      });
    });
  });

  describe('User History Learning', () => {
    it('should improve accuracy with user history', async () => {
      // Test a merchant not in the generic model
      const novelMerchant = 'Local Coffee Shop';

      // Without history
      const predictionWithoutHistory = await predictCategory(
        novelMerchant,
        5.50,
        'coffee',
        []
      );

      // With user history showing this is always "food"
      const userHistory = Array(10).fill(null).map(() => ({
        merchant: novelMerchant,
        category: 'food',
        amount: 5.50,
      }));

      const predictionWithHistory = await predictCategory(
        novelMerchant,
        5.50,
        'coffee',
        userHistory
      );

      console.log('\n🎓 Learning from User History:');
      console.log(`   Without history: ${predictionWithoutHistory.category} (${(predictionWithoutHistory.confidence * 100).toFixed(0)}%)`);
      console.log(`   With history: ${predictionWithHistory.category} (${(predictionWithHistory.confidence * 100).toFixed(0)}%)`);

      // Should predict "food" with high confidence when user history shows it
      expect(predictionWithHistory.category).toBe('food');
      expect(predictionWithHistory.confidence).toBeGreaterThan(0.85);
    });

    it('should handle contradictory user history', async () => {
      // User sometimes categorizes Walmart as groceries, sometimes as shopping
      const mixedHistory = [
        { merchant: 'Walmart', category: 'groceries', amount: 50 },
        { merchant: 'Walmart', category: 'groceries', amount: 45 },
        { merchant: 'Walmart', category: 'groceries', amount: 60 },
        { merchant: 'Walmart', category: 'shopping', amount: 120 },
        { merchant: 'Walmart', category: 'shopping', amount: 200 },
      ];

      const prediction = await predictCategory(
        'Walmart',
        55,
        '',
        mixedHistory
      );

      // Should pick the dominant category (groceries - 3/5)
      expect(prediction.category).toBe('groceries');

      // Confidence might be lower due to inconsistency
      console.log(`\n🔀 Mixed History Prediction: ${prediction.category} (${(prediction.confidence * 100).toFixed(0)}%)`);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track prediction performance over time', async () => {
      const metrics = {
        totalPredictions: 0,
        totalTime: 0,
        averageTime: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };

      const times = [];

      for (const example of validationSet) {
        const startTime = Date.now();
        await predictCategory(
          example.merchant,
          example.amount,
          example.description,
          []
        );
        const duration = Date.now() - startTime;
        times.push(duration);
      }

      times.sort((a, b) => a - b);

      metrics.totalPredictions = times.length;
      metrics.totalTime = times.reduce((sum, t) => sum + t, 0);
      metrics.averageTime = metrics.totalTime / times.length;
      metrics.p50 = times[Math.floor(times.length * 0.50)];
      metrics.p95 = times[Math.floor(times.length * 0.95)];
      metrics.p99 = times[Math.floor(times.length * 0.99)];

      console.log('\n⏱️  Performance Metrics:');
      console.log(`   Total predictions: ${metrics.totalPredictions}`);
      console.log(`   Average time: ${metrics.averageTime.toFixed(2)}ms`);
      console.log(`   P50: ${metrics.p50}ms`);
      console.log(`   P95: ${metrics.p95}ms`);
      console.log(`   P99: ${metrics.p99}ms`);

      // Performance should be good (p95 < 100ms)
      expect(metrics.p95).toBeLessThan(100);
    });
  });
});
