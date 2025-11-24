/**
 * Sample Receipt OCR Responses
 * Mock data representing responses from Google Cloud Vision API
 */

module.exports = {
  // Sample receipt with clear structure
  grocery_receipt: {
    textAnnotations: [
      {
        description: `WHOLE FOODS MARKET
123 Main Street
San Francisco, CA 94102
(415) 555-1234

Date: 11/15/2025
Time: 14:23

ITEMS:
Organic Bananas        $3.99
Almond Milk           $4.50
Whole Wheat Bread     $3.25
Free Range Eggs       $6.99
Fresh Spinach         $2.89

SUBTOTAL:            $21.62
TAX:                  $1.52
TOTAL:              $23.14

Card ending in 4567
Auth: 123456

Thank you for shopping!`,
        locale: 'en',
      },
    ],
  },

  // Restaurant receipt
  restaurant_receipt: {
    textAnnotations: [
      {
        description: `The Garden Bistro
456 Oak Avenue
Austin, TX 78701

Server: Sarah
Table: 12
Date: 11/18/2025 19:45

2 x Caesar Salad     $18.00
1 x Grilled Salmon   $28.00
1 x Pasta Primavera  $22.00
2 x House Wine       $16.00

Subtotal:            $84.00
Tax:                  $6.72
Tip:                 $15.12
TOTAL:             $105.84

***PAID BY CREDIT CARD***
Thank you!`,
        locale: 'en',
      },
    ],
  },

  // Gas station receipt
  gas_station_receipt: {
    textAnnotations: [
      {
        description: `SHELL
Station #1234
789 Highway Blvd

11/19/2025  08:15 AM

PUMP: 05
UNLEADED PLUS

Gallons:    12.543
Price/Gal:   $3.45
TOTAL:      $43.27

Payment: VISA ****5678

Thank you!`,
        locale: 'en',
      },
    ],
  },

  // Pharmacy receipt with multiple items
  pharmacy_receipt: {
    textAnnotations: [
      {
        description: `CVS PHARMACY
Store #9876
321 Elm Street

Date: 11/16/2025

Prescription #: 123456
Ibuprofen 200mg       $12.99

Vitamin D3            $14.50
Hand Sanitizer         $3.99
Face Masks             $8.50

SUBTOTAL:            $39.98
TAX:                  $3.20
TOTAL:              $43.18

Paid by Debit Card`,
        locale: 'en',
      },
    ],
  },

  // Receipt with poor OCR quality (missing/messy data)
  poor_quality_receipt: {
    textAnnotations: [
      {
        description: `ST0RE
123 Str##t

Dat*: 11/1$/2025

Items: $12.3#
T@x: $0.9*

T0TAL: $13.29`,
        locale: 'en',
      },
    ],
  },

  // Receipt with non-standard format
  coffee_shop_receipt: {
    textAnnotations: [
      {
        description: `☕ BLUE BOTTLE COFFEE ☕

Large Latte           $5.50
Croissant             $4.00
-----------------------
Total                 $9.50

11/17/2025 @ 7:30 AM
Thanks for visiting!`,
        locale: 'en',
      },
    ],
  },

  // International receipt (different currency)
  international_receipt: {
    textAnnotations: [
      {
        description: `TESCO
London, UK

Date: 15/11/2025

Milk                  £2.50
Bread                 £1.20
Eggs                  £3.00

TOTAL:               £6.70

Card Payment`,
        locale: 'en',
      },
    ],
  },

  // Empty/minimal OCR response
  empty_receipt: {
    textAnnotations: [],
  },

  // Receipt with only total visible
  total_only_receipt: {
    textAnnotations: [
      {
        description: `STORE RECEIPT

TOTAL: $45.67

Thank you!`,
        locale: 'en',
      },
    ],
  },
};
