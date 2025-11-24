import { extractAmount } from './src/ocr/receiptParser.js';

console.log('Test 1: "Amount: 23.50"');
const result1 = extractAmount('Amount: 23.50');
console.log('Result:', result1);
console.log('Expected: 23.50');
console.log();

console.log('Test 2: Multi-line receipt');
const text2 = `
  SUBTOTAL: 100.00
  TAX: 8.50
  TOTAL: 108.50
`;
const result2 = extractAmount(text2);
console.log('Result:', result2);
console.log('Expected: 108.50');
console.log();

console.log('Test 3: Grocery receipt');
const text3 = `
  WALMART SUPERCENTER
  MILK           $3.99
  BREAD          $2.49
  SUBTOTAL      $11.47
  TAX            $0.92
  TOTAL         $12.39
`;
const result3 = extractAmount(text3);
console.log('Result:', result3);
console.log('Expected: 12.39');
