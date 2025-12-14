/**
 * Test Fixtures for Google Cloud Vision API Responses
 * Used for mocking Vision API calls in tests
 */

/**
 * Successful Vision API response for a high-quality grocery receipt
 */
const groceryReceiptSuccess = [
  {
    textAnnotations: [
      {
        description: `WHOLE FOODS MARKET
123 Main Street
San Francisco, CA 94102
(415) 555-0123

Date: 11/15/2025
Time: 14:35:22
Cashier: John D.

ORGANIC BANANAS        $3.99
GREEK YOGURT          $5.49
WHOLE WHEAT BREAD     $4.29
ALMOND MILK           $6.99
SPINACH               $3.49
CHICKEN BREAST        $12.99

SUBTOTAL             $37.24
TAX (8.5%)            $3.17
TOTAL                $40.41

VISA ****1234
APPROVED

Thank you for shopping!`,
        locale: 'en',
        boundingPoly: {
          vertices: [
            { x: 50, y: 50 },
            { x: 550, y: 50 },
            { x: 550, y: 800 },
            { x: 50, y: 800 }
          ]
        }
      }
    ],
    fullTextAnnotation: {
      text: `WHOLE FOODS MARKET\n123 Main Street\nSan Francisco, CA 94102\n(415) 555-0123\n\nDate: 11/15/2025\nTime: 14:35:22\nCashier: John D.\n\nORGANIC BANANAS        $3.99\nGREEK YOGURT          $5.49\nWHOLE WHEAT BREAD     $4.29\nALMOND MILK           $6.99\nSPINACH               $3.49\nCHICKEN BREAST        $12.99\n\nSUBTOTAL             $37.24\nTAX (8.5%)            $3.17\nTOTAL                $40.41\n\nVISA ****1234\nAPPROVED\n\nThank you for shopping!`,
      pages: [
        {
          confidence: 0.98,
          width: 600,
          height: 850
        }
      ]
    }
  }
];

/**
 * Successful Vision API response for a restaurant receipt
 */
const restaurantReceiptSuccess = [
  {
    textAnnotations: [
      {
        description: `THE ITALIAN PLACE
456 Market St, SF
Tel: 415-555-9876

Server: Maria
Table: 12
Date: 11/18/2025  8:45 PM

2 Margherita Pizza    $32.00
1 Caesar Salad        $14.00
1 Tiramisu            $9.00
2 Glass Wine          $24.00

Subtotal             $79.00
Tax                   $6.72
Tip (20%)            $15.80
TOTAL               $101.52

Payment: AMEX
Thank You!`,
        locale: 'en',
        boundingPoly: {
          vertices: [
            { x: 40, y: 40 },
            { x: 520, y: 40 },
            { x: 520, y: 750 },
            { x: 40, y: 750 }
          ]
        }
      }
    ],
    fullTextAnnotation: {
      text: `THE ITALIAN PLACE\n456 Market St, SF\nTel: 415-555-9876\n\nServer: Maria\nTable: 12\nDate: 11/18/2025  8:45 PM\n\n2 Margherita Pizza    $32.00\n1 Caesar Salad        $14.00\n1 Tiramisu            $9.00\n2 Glass Wine          $24.00\n\nSubtotal             $79.00\nTax                   $6.72\nTip (20%)            $15.80\nTOTAL               $101.52\n\nPayment: AMEX\nThank You!`,
      pages: [
        {
          confidence: 0.95,
          width: 560,
          height: 790
        }
      ]
    }
  }
];

/**
 * Low confidence response for poor quality/faded thermal receipt
 */
const lowConfidenceResponse = [
  {
    textAnnotations: [
      {
        description: `CVS PHARMACY
...faded text...
Date: 11/10/2025

Item 1            $12.49
Item 2             $8.99

Total            $21.48`,
        locale: 'en',
        boundingPoly: {
          vertices: [
            { x: 30, y: 30 },
            { x: 400, y: 30 },
            { x: 400, y: 600 },
            { x: 30, y: 600 }
          ]
        }
      }
    ],
    fullTextAnnotation: {
      text: `CVS PHARMACY\n...faded text...\nDate: 11/10/2025\n\nItem 1            $12.49\nItem 2             $8.99\n\nTotal            $21.48`,
      pages: [
        {
          confidence: 0.42,
          width: 430,
          height: 630
        }
      ]
    }
  }
];

/**
 * Response when no text is detected in the image
 */
const noTextDetectedResponse = [
  {
    textAnnotations: []
  }
];

/**
 * Response for completely blank image
 */
const blankImageResponse = [
  {
    textAnnotations: [],
    fullTextAnnotation: null
  }
];

/**
 * Response for handwritten receipt with notes
 */
const handwrittenReceiptResponse = [
  {
    textAnnotations: [
      {
        description: `Coffee Shop
Cash Payment

2 Coffees    $8.00
1 Muffin     $4.50

Total       $12.50

Thanks!`,
        locale: 'en',
        boundingPoly: {
          vertices: [
            { x: 60, y: 60 },
            { x: 480, y: 60 },
            { x: 480, y: 650 },
            { x: 60, y: 650 }
          ]
        }
      }
    ],
    fullTextAnnotation: {
      text: `Coffee Shop\nCash Payment\n\n2 Coffees    $8.00\n1 Muffin     $4.50\n\nTotal       $12.50\n\nThanks!`,
      pages: [
        {
          confidence: 0.73,
          width: 540,
          height: 710
        }
      ]
    }
  }
];

/**
 * Response for digital screenshot (high quality)
 */
const digitalScreenshotResponse = [
  {
    textAnnotations: [
      {
        description: `Amazon.com Order Receipt
Order #: 123-4567890-1234567
Order Date: November 15, 2025

Items Ordered:
1. USB-C Cable (3-Pack)           $19.99
2. Wireless Mouse                 $24.99

Items Subtotal:                   $44.98
Shipping & Handling:               $0.00
Total Before Tax:                 $44.98
Estimated Tax:                     $3.82
Order Total:                      $48.80

Payment Method: Visa ending in 5678`,
        locale: 'en',
        boundingPoly: {
          vertices: [
            { x: 100, y: 100 },
            { x: 900, y: 100 },
            { x: 900, y: 700 },
            { x: 100, y: 700 }
          ]
        }
      }
    ],
    fullTextAnnotation: {
      text: `Amazon.com Order Receipt\nOrder #: 123-4567890-1234567\nOrder Date: November 15, 2025\n\nItems Ordered:\n1. USB-C Cable (3-Pack)           $19.99\n2. Wireless Mouse                 $24.99\n\nItems Subtotal:                   $44.98\nShipping & Handling:               $0.00\nTotal Before Tax:                 $44.98\nEstimated Tax:                     $3.82\nOrder Total:                      $48.80\n\nPayment Method: Visa ending in 5678`,
      pages: [
        {
          confidence: 0.99,
          width: 1000,
          height: 800
        }
      ]
    }
  }
];

/**
 * Error response - Invalid image URL
 */
const invalidImageError = {
  code: 'INVALID_ARGUMENT',
  message: 'Invalid image URL or image content',
  details: 'The provided image URL is invalid or inaccessible'
};

/**
 * Error response - Network error
 */
const networkError = {
  code: 'UNAVAILABLE',
  message: 'Network error',
  details: 'Failed to connect to Vision API service'
};

/**
 * Error response - Image too large
 */
const imageTooLargeError = {
  code: 'INVALID_ARGUMENT',
  message: 'Image too large',
  details: 'Image size exceeds the maximum allowed size of 20MB'
};

/**
 * Error response - Rate limit exceeded
 */
const rateLimitError = {
  code: 'RESOURCE_EXHAUSTED',
  message: 'Rate limit exceeded',
  details: 'Too many requests. Please try again later.'
};

/**
 * Error response - Permission denied
 */
const permissionDeniedError = {
  code: 'PERMISSION_DENIED',
  message: 'Permission denied',
  details: 'The caller does not have permission to execute the specified operation'
};

module.exports = {
  groceryReceiptSuccess,
  restaurantReceiptSuccess,
  lowConfidenceResponse,
  noTextDetectedResponse,
  blankImageResponse,
  handwrittenReceiptResponse,
  digitalScreenshotResponse,
  invalidImageError,
  networkError,
  imageTooLargeError,
  rateLimitError,
  permissionDeniedError
};
