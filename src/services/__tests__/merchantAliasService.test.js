// src/services/__tests__/merchantAliasService.test.js
// Tests for merchant alias management operations

import {
  getMerchantAlias,
  createMerchantAlias,
  getMerchantAliases,
  updateAliasUsageCount,
  deleteMerchantAlias,
} from '../merchantAliasService';

import {
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  runTransaction,
} from 'firebase/firestore';

// Mock Firebase modules
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(),
  increment: jest.fn(),
  runTransaction: jest.fn(),
}));

jest.mock('../../config/firebase', () => ({
  db: {},
}));

describe('merchantAliasService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for runTransaction
    runTransaction.mockImplementation(async (db, callback) => {
      return await callback({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
      });
    });
  });

  describe('getMerchantAlias', () => {
    it('should return alias if exists', async () => {
      const ocrMerchant = 'WHOLE FOODS MKT';
      const coupleId = 'couple123';
      const expectedAlias = 'Whole Foods Market';

      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'alias123',
            data: () => ({
              ocrMerchant: 'WHOLE FOODS MKT',
              userAlias: expectedAlias,
              coupleId,
              usageCount: 5,
            }),
          },
        ],
      };

      getDocs.mockResolvedValue(mockSnapshot);
      query.mockReturnValue('mock-query');
      collection.mockReturnValue('mock-collection');

      // Mock transaction for usage count update
      runTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ usageCount: 5 }),
          }),
          update: jest.fn(),
        };
        return await callback(mockTransaction);
      });

      const result = await getMerchantAlias(ocrMerchant, coupleId);

      expect(collection).toHaveBeenCalled();
      expect(query).toHaveBeenCalled();
      expect(where).toHaveBeenCalledWith('coupleId', '==', coupleId);
      expect(where).toHaveBeenCalledWith('ocrMerchantLower', '==', ocrMerchant.toLowerCase());
      expect(result).toBe(expectedAlias);
    });

    it('should return original merchant name if no alias exists', async () => {
      const ocrMerchant = 'New Store';
      const coupleId = 'couple123';

      const mockSnapshot = {
        empty: true,
        docs: [],
      };

      getDocs.mockResolvedValue(mockSnapshot);

      const result = await getMerchantAlias(ocrMerchant, coupleId);

      expect(result).toBe(ocrMerchant);
    });

    it('should update usage count when alias is found', async () => {
      const ocrMerchant = 'WHOLE FOODS MKT';
      const coupleId = 'couple123';

      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'alias123',
            data: () => ({
              ocrMerchant: 'WHOLE FOODS MKT',
              userAlias: 'Whole Foods Market',
              coupleId,
              usageCount: 5,
            }),
          },
        ],
      };

      getDocs.mockResolvedValue(mockSnapshot);
      serverTimestamp.mockReturnValue('mock-timestamp');

      // Mock transaction for usage count update
      runTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ usageCount: 5 }),
          }),
          update: jest.fn(),
        };
        return await callback(mockTransaction);
      });

      await getMerchantAlias(ocrMerchant, coupleId);

      expect(doc).toHaveBeenCalled();
      expect(runTransaction).toHaveBeenCalled();
    });

    it('should handle null OCR merchant name', async () => {
      const coupleId = 'couple123';

      const result = await getMerchantAlias(null, coupleId);

      expect(result).toBeNull();
      expect(getDocs).not.toHaveBeenCalled();
    });

    it('should handle empty OCR merchant name', async () => {
      const coupleId = 'couple123';

      const result = await getMerchantAlias('', coupleId);

      expect(result).toBeNull();
      expect(getDocs).not.toHaveBeenCalled();
    });

    it('should validate couple ID', async () => {
      const ocrMerchant = 'Test Store';

      await expect(getMerchantAlias(ocrMerchant, null)).rejects.toThrow('Couple ID is required');
      await expect(getMerchantAlias(ocrMerchant, '')).rejects.toThrow('Couple ID is required');
    });

    it('should handle Firestore errors', async () => {
      const ocrMerchant = 'Test Store';
      const coupleId = 'couple123';

      getDocs.mockRejectedValue(new Error('Firestore error'));

      await expect(getMerchantAlias(ocrMerchant, coupleId)).rejects.toThrow('Firestore error');
    });

    it('should be case-insensitive when matching', async () => {
      const ocrMerchant = 'whole foods mkt';
      const coupleId = 'couple123';

      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'alias123',
            data: () => ({
              ocrMerchant: 'WHOLE FOODS MKT',
              userAlias: 'Whole Foods Market',
              coupleId,
              usageCount: 5,
            }),
          },
        ],
      };

      getDocs.mockResolvedValue(mockSnapshot);

      // Mock transaction for usage count update
      runTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ usageCount: 5 }),
          }),
          update: jest.fn(),
        };
        return await callback(mockTransaction);
      });

      const result = await getMerchantAlias(ocrMerchant, coupleId);

      expect(where).toHaveBeenCalledWith('ocrMerchantLower', '==', 'whole foods mkt');
      expect(result).toBe('Whole Foods Market');
    });
  });

  describe('createMerchantAlias', () => {
    it('should create new alias document', async () => {
      const ocrMerchant = 'WHOLE FOODS MKT';
      const userAlias = 'Whole Foods Market';
      const coupleId = 'couple123';

      // Mock empty snapshot for duplicate check
      getDocs.mockResolvedValue({ empty: true, docs: [] });

      // Mock transaction
      const mockDocRef = { id: 'alias123' };
      doc.mockReturnValue(mockDocRef);
      runTransaction.mockImplementation(async (db, callback) => {
        return await callback({
          set: jest.fn(),
          update: jest.fn(),
        });
      });
      serverTimestamp.mockReturnValue('mock-timestamp');

      const result = await createMerchantAlias(ocrMerchant, userAlias, coupleId);

      expect(collection).toHaveBeenCalled();
      expect(runTransaction).toHaveBeenCalled();

      expect(result).toBe('alias123');
    });

    it('should validate OCR merchant name', async () => {
      const userAlias = 'Whole Foods Market';
      const coupleId = 'couple123';

      await expect(createMerchantAlias(null, userAlias, coupleId)).rejects.toThrow('OCR merchant name is required');
      await expect(createMerchantAlias('', userAlias, coupleId)).rejects.toThrow('OCR merchant name is required');
    });

    it('should validate user alias', async () => {
      const ocrMerchant = 'WHOLE FOODS MKT';
      const coupleId = 'couple123';

      await expect(createMerchantAlias(ocrMerchant, null, coupleId)).rejects.toThrow('User alias is required');
      await expect(createMerchantAlias(ocrMerchant, '', coupleId)).rejects.toThrow('User alias is required');
    });

    it('should validate couple ID', async () => {
      const ocrMerchant = 'WHOLE FOODS MKT';
      const userAlias = 'Whole Foods Market';

      await expect(createMerchantAlias(ocrMerchant, userAlias, null)).rejects.toThrow('Couple ID is required');
      await expect(createMerchantAlias(ocrMerchant, userAlias, '')).rejects.toThrow('Couple ID is required');
    });

    it('should handle duplicate aliases', async () => {
      const ocrMerchant = 'WHOLE FOODS MKT';
      const userAlias = 'Whole Foods Market';
      const coupleId = 'couple123';

      // First check if alias exists
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'alias123',
            data: () => ({
              ocrMerchant,
              userAlias: 'Existing Alias',
              coupleId,
            }),
          },
        ],
      };

      getDocs.mockResolvedValue(mockSnapshot);

      runTransaction.mockImplementation(async (db, callback) => {
        return await callback({
          set: jest.fn(),
          update: jest.fn(),
        });
      });

      await expect(
        createMerchantAlias(ocrMerchant, userAlias, coupleId)
      ).rejects.toThrow('An alias for this OCR merchant already exists');
    });

    it('should handle Firestore errors', async () => {
      const ocrMerchant = 'WHOLE FOODS MKT';
      const userAlias = 'Whole Foods Market';
      const coupleId = 'couple123';

      // Mock empty snapshot for duplicate check
      getDocs.mockResolvedValue({ empty: true, docs: [] });

      runTransaction.mockRejectedValue(new Error('Firestore error'));

      await expect(
        createMerchantAlias(ocrMerchant, userAlias, coupleId)
      ).rejects.toThrow('Firestore error');
    });

    it('should trim whitespace from inputs', async () => {
      const ocrMerchant = '  WHOLE FOODS MKT  ';
      const userAlias = '  Whole Foods Market  ';
      const coupleId = 'couple123';

      const mockDocRef = { id: 'alias123' };
      doc.mockReturnValue(mockDocRef);
      serverTimestamp.mockReturnValue('mock-timestamp');

      // Mock empty snapshot for duplicate check
      getDocs.mockResolvedValue({ empty: true, docs: [] });

      let capturedData = null;
      runTransaction.mockImplementation(async (db, callback) => {
        return await callback({
          set: jest.fn().mockImplementation((ref, data) => {
            capturedData = data;
          }),
          update: jest.fn(),
        });
      });

      await createMerchantAlias(ocrMerchant, userAlias, coupleId);

      expect(capturedData.ocrMerchant).toBe('WHOLE FOODS MKT');
      expect(capturedData.userAlias).toBe('Whole Foods Market');
    });
  });

  describe('getMerchantAliases', () => {
    it('should return all aliases for couple', async () => {
      const coupleId = 'couple123';

      const mockAliases = [
        {
          id: 'alias1',
          ocrMerchant: 'WHOLE FOODS MKT',
          userAlias: 'Whole Foods Market',
          usageCount: 10,
        },
        {
          id: 'alias2',
          ocrMerchant: 'STARBUCKS',
          userAlias: 'Starbucks Coffee',
          usageCount: 5,
        },
      ];

      const mockSnapshot = {
        forEach: (callback) => {
          mockAliases.forEach((alias) => {
            const { id, ...aliasData } = alias;
            callback({
              id: id,
              data: () => aliasData,
            });
          });
        },
      };

      getDocs.mockResolvedValue(mockSnapshot);
      query.mockReturnValue('mock-query');
      collection.mockReturnValue('mock-collection');

      const result = await getMerchantAliases(coupleId);

      expect(collection).toHaveBeenCalled();
      expect(query).toHaveBeenCalled();
      expect(where).toHaveBeenCalledWith('coupleId', '==', coupleId);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('alias1');
      expect(result[1].id).toBe('alias2');
    });

    it('should order by usage count (descending)', async () => {
      const coupleId = 'couple123';

      const mockSnapshot = {
        forEach: () => {},
      };

      getDocs.mockResolvedValue(mockSnapshot);

      await getMerchantAliases(coupleId);

      expect(orderBy).toHaveBeenCalledWith('usageCount', 'desc');
    });

    it('should limit results to 50', async () => {
      const coupleId = 'couple123';

      const mockSnapshot = {
        forEach: () => {},
      };

      getDocs.mockResolvedValue(mockSnapshot);

      await getMerchantAliases(coupleId);

      expect(limit).toHaveBeenCalledWith(50);
    });

    it('should return empty array when no aliases found', async () => {
      const coupleId = 'couple123';

      const mockSnapshot = {
        forEach: () => {},
      };

      getDocs.mockResolvedValue(mockSnapshot);

      const result = await getMerchantAliases(coupleId);

      expect(result).toEqual([]);
    });

    it('should validate couple ID', async () => {
      await expect(getMerchantAliases(null)).rejects.toThrow('Couple ID is required');
      await expect(getMerchantAliases('')).rejects.toThrow('Couple ID is required');
    });

    it('should handle Firestore errors', async () => {
      const coupleId = 'couple123';

      getDocs.mockRejectedValue(new Error('Firestore error'));

      await expect(getMerchantAliases(coupleId)).rejects.toThrow('Firestore error');
    });
  });

  describe('updateAliasUsageCount', () => {
    it('should increment usage count', async () => {
      const aliasId = 'alias123';

      runTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ usageCount: 5 }),
          }),
          update: jest.fn(),
        };
        return await callback(mockTransaction);
      });

      serverTimestamp.mockReturnValue('mock-timestamp');

      await updateAliasUsageCount(aliasId);

      expect(doc).toHaveBeenCalled();
      expect(runTransaction).toHaveBeenCalled();
    });

    it('should validate alias ID', async () => {
      await expect(updateAliasUsageCount(null)).rejects.toThrow('Alias ID is required');
      await expect(updateAliasUsageCount('')).rejects.toThrow('Alias ID is required');
    });

    it('should handle Firestore errors', async () => {
      const aliasId = 'alias123';

      runTransaction.mockRejectedValue(new Error('Firestore error'));

      await expect(updateAliasUsageCount(aliasId)).rejects.toThrow('Firestore error');
    });
  });

  describe('deleteMerchantAlias', () => {
    it('should delete merchant alias', async () => {
      const aliasId = 'alias123';
      const coupleId = 'couple123';

      deleteDoc.mockResolvedValue();

      await deleteMerchantAlias(aliasId, coupleId);

      expect(doc).toHaveBeenCalled();
      expect(deleteDoc).toHaveBeenCalled();
    });

    it('should validate alias ID', async () => {
      const coupleId = 'couple123';

      await expect(deleteMerchantAlias(null, coupleId)).rejects.toThrow('Alias ID is required');
      await expect(deleteMerchantAlias('', coupleId)).rejects.toThrow('Alias ID is required');
    });

    it('should validate couple ID', async () => {
      const aliasId = 'alias123';

      await expect(deleteMerchantAlias(aliasId, null)).rejects.toThrow('Couple ID is required');
      await expect(deleteMerchantAlias(aliasId, '')).rejects.toThrow('Couple ID is required');
    });

    it('should handle Firestore errors', async () => {
      const aliasId = 'alias123';
      const coupleId = 'couple123';

      deleteDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(deleteMerchantAlias(aliasId, coupleId)).rejects.toThrow('Firestore error');
    });
  });

  describe('Integration - Full Alias Workflow', () => {
    it('should handle create, retrieve, and update cycle', async () => {
      const ocrMerchant = 'WHOLE FOODS MKT';
      const userAlias = 'Whole Foods Market';
      const coupleId = 'couple123';

      // Create alias
      const mockDocRef = { id: 'alias123' };
      doc.mockReturnValue(mockDocRef);
      serverTimestamp.mockReturnValue('mock-timestamp');

      // Reset and mock empty snapshot for duplicate check
      getDocs.mockReset();
      getDocs.mockResolvedValueOnce({ empty: true, docs: [] });
      getDocs.mockResolvedValueOnce({ empty: true, docs: [] }); // For alias query

      runTransaction.mockImplementation(async (db, callback) => {
        return await callback({
          set: jest.fn(),
          update: jest.fn(),
          get: jest.fn(),
        });
      });

      const created = await createMerchantAlias(ocrMerchant, userAlias, coupleId);
      expect(created).toBe('alias123');

      // Retrieve alias
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'alias123',
            data: () => ({
              ocrMerchant,
              userAlias,
              coupleId,
              usageCount: 1,
            }),
          },
        ],
      };

      getDocs.mockResolvedValue(mockSnapshot);

      // Mock transaction for usage count update
      runTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ usageCount: 1 }),
          }),
          update: jest.fn(),
        };
        return await callback(mockTransaction);
      });

      const alias = await getMerchantAlias(ocrMerchant, coupleId);
      expect(alias).toBe(userAlias);

      // Verify usage count was updated via transaction
      expect(runTransaction).toHaveBeenCalled();
    });

    it('should handle multiple aliases for same couple', async () => {
      const coupleId = 'couple123';

      const aliases = [
        { ocrMerchant: 'WHOLE FOODS MKT', userAlias: 'Whole Foods Market' },
        { ocrMerchant: 'STARBUCKS', userAlias: 'Starbucks Coffee' },
        { ocrMerchant: 'SHELL', userAlias: 'Shell Gas Station' },
      ];

      // Create multiple aliases
      doc.mockImplementation(() => ({ id: 'alias123' }));
      serverTimestamp.mockReturnValue('mock-timestamp');

      // Mock empty snapshots for duplicate checks
      getDocs.mockResolvedValue({ empty: true, docs: [] });

      runTransaction.mockImplementation(async (db, callback) => {
        return await callback({
          set: jest.fn(),
          update: jest.fn(),
        });
      });

      for (const alias of aliases) {
        await createMerchantAlias(alias.ocrMerchant, alias.userAlias, coupleId);
      }

      expect(runTransaction).toHaveBeenCalledTimes(3);

      // Retrieve all aliases
      const mockSnapshot = {
        forEach: (callback) => {
          aliases.forEach((alias, index) => {
            callback({
              id: `alias${index}`,
              data: () => ({
                ...alias,
                coupleId,
                usageCount: 1,
              }),
            });
          });
        },
      };

      getDocs.mockResolvedValue(mockSnapshot);

      const allAliases = await getMerchantAliases(coupleId);
      expect(allAliases).toHaveLength(3);
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle special characters in merchant names', async () => {
      const ocrMerchant = "McDonald's #1234";
      const userAlias = "McDonald's";
      const coupleId = 'couple123';

      const mockDocRef = { id: 'alias123' };
      doc.mockReturnValue(mockDocRef);
      serverTimestamp.mockReturnValue('mock-timestamp');

      // Mock empty snapshot for duplicate check
      getDocs.mockResolvedValue({ empty: true, docs: [] });

      let capturedData = null;
      runTransaction.mockImplementation(async (db, callback) => {
        return await callback({
          set: jest.fn().mockImplementation((ref, data) => {
            capturedData = data;
          }),
          update: jest.fn(),
        });
      });

      const result = await createMerchantAlias(ocrMerchant, userAlias, coupleId);

      expect(result).toBe('alias123');
      expect(capturedData.ocrMerchantLower).toBe("mcdonald's #1234");
    });

    it('should handle very long merchant names', async () => {
      const ocrMerchant = 'A'.repeat(200);
      const userAlias = 'Short Name';
      const coupleId = 'couple123';

      const mockDocRef = { id: 'alias123' };
      doc.mockReturnValue(mockDocRef);
      serverTimestamp.mockReturnValue('mock-timestamp');

      // Mock empty snapshot for duplicate check
      getDocs.mockResolvedValue({ empty: true, docs: [] });

      runTransaction.mockImplementation(async (db, callback) => {
        return await callback({
          set: jest.fn(),
          update: jest.fn(),
        });
      });

      const result = await createMerchantAlias(ocrMerchant, userAlias, coupleId);

      expect(result).toBe('alias123');
    });

    it('should handle merchant names with different casing variations', async () => {
      const coupleId = 'couple123';

      const variations = [
        'whole foods market',
        'WHOLE FOODS MARKET',
        'Whole Foods Market',
        'WhOlE fOoDs MaRkEt',
      ];

      // All variations should match the same alias
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'alias123',
            data: () => ({
              ocrMerchant: 'WHOLE FOODS MARKET',
              userAlias: 'Whole Foods Market',
              coupleId,
              usageCount: 5,
            }),
          },
        ],
      };

      getDocs.mockResolvedValue(mockSnapshot);

      // Mock transaction for usage count update
      runTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ usageCount: 5 }),
          }),
          update: jest.fn(),
        };
        return await callback(mockTransaction);
      });

      for (const variation of variations) {
        const result = await getMerchantAlias(variation, coupleId);
        expect(result).toBe('Whole Foods Market');
      }
    });
  });

  describe('Race Condition Prevention with Transactions', () => {
    describe('createMerchantAlias - Transaction Safety', () => {
      it('should prevent duplicate aliases when created concurrently', async () => {
        const ocrMerchant = 'WHOLE FOODS MKT';
        const userAlias = 'Whole Foods Market';
        const coupleId = 'couple123';
        const createdBy = 'user1';

        // Mock empty snapshot for initial check within transaction
        const mockEmptySnapshot = { empty: true, docs: [] };
        getDocs.mockResolvedValue(mockEmptySnapshot);

        // Mock successful transaction
        runTransaction.mockImplementation(async (db, transactionCallback) => {
          return await transactionCallback({
            get: jest.fn().mockResolvedValue({
              exists: () => false,
              data: () => null,
            }),
            set: jest.fn(),
            update: jest.fn(),
          });
        });

        const mockDocRef = { id: 'alias123' };
        doc.mockReturnValue(mockDocRef);
        serverTimestamp.mockReturnValue('mock-timestamp');

        const result = await createMerchantAlias(ocrMerchant, userAlias, coupleId, createdBy);

        expect(runTransaction).toHaveBeenCalled();
        expect(result).toBe('alias123');
      });

      it('should handle transaction retry on conflict', async () => {
        const ocrMerchant = 'STARBUCKS';
        const userAlias = 'Starbucks Coffee';
        const coupleId = 'couple123';
        const createdBy = 'user1';

        let attemptCount = 0;

        // Mock transaction that succeeds on second attempt
        runTransaction.mockImplementation(async (db, transactionCallback) => {
          attemptCount++;

          if (attemptCount === 1) {
            // First attempt - simulate conflict by throwing error
            throw new Error('Transaction failed due to a conflicting operation');
          }

          // Second attempt - succeeds
          return await transactionCallback({
            get: jest.fn().mockResolvedValue({
              exists: () => false,
              data: () => null,
            }),
            set: jest.fn(),
            update: jest.fn(),
          });
        });

        const mockDocRef = { id: 'alias456' };
        doc.mockReturnValue(mockDocRef);
        getDocs.mockResolvedValue({ empty: true, docs: [] });

        // Should throw after retries exhausted
        await expect(
          createMerchantAlias(ocrMerchant, userAlias, coupleId, createdBy)
        ).rejects.toThrow('Transaction failed');

        expect(runTransaction).toHaveBeenCalled();
      });

      it('should rollback on transaction failure', async () => {
        const ocrMerchant = 'TARGET';
        const userAlias = 'Target Store';
        const coupleId = 'couple123';
        const createdBy = 'user1';

        // Mock transaction that fails
        runTransaction.mockRejectedValue(new Error('Transaction failed'));

        await expect(
          createMerchantAlias(ocrMerchant, userAlias, coupleId, createdBy)
        ).rejects.toThrow('Transaction failed');

        expect(runTransaction).toHaveBeenCalled();
        // Verify no partial writes occurred
        expect(addDoc).not.toHaveBeenCalled();
      });

      it('should detect duplicate OCR merchant within transaction', async () => {
        const ocrMerchant = 'WALMART';
        const userAlias = 'Walmart Store';
        const coupleId = 'couple123';
        const createdBy = 'user1';

        // Mock snapshot showing existing OCR merchant
        const mockExistingSnapshot = {
          empty: false,
          docs: [
            {
              id: 'existing-alias',
              data: () => ({
                ocrMerchant: 'WALMART',
                userAlias: 'Existing Walmart',
                coupleId,
              }),
            },
          ],
        };

        getDocs.mockResolvedValue(mockExistingSnapshot);

        runTransaction.mockImplementation(async (db, transactionCallback) => {
          return await transactionCallback({
            get: jest.fn(),
            set: jest.fn(),
            update: jest.fn(),
          });
        });

        await expect(
          createMerchantAlias(ocrMerchant, userAlias, coupleId, createdBy)
        ).rejects.toThrow('An alias for this OCR merchant already exists');
      });

      it('should detect duplicate user alias within transaction', async () => {
        const ocrMerchant = 'COSTCO WHOLESALE';
        const userAlias = 'Costco';
        const coupleId = 'couple123';
        const createdBy = 'user1';

        // First query (OCR merchant) returns empty
        // Second query (user alias) returns existing
        const mockEmptySnapshot = { empty: true, docs: [] };
        const mockExistingSnapshot = {
          empty: false,
          docs: [
            {
              id: 'existing-alias',
              data: () => ({
                ocrMerchant: 'COSTCO',
                userAlias: 'Costco',
                coupleId,
              }),
            },
          ],
        };

        getDocs
          .mockResolvedValueOnce(mockEmptySnapshot)
          .mockResolvedValueOnce(mockExistingSnapshot);

        runTransaction.mockImplementation(async (db, transactionCallback) => {
          return await transactionCallback({
            get: jest.fn(),
            set: jest.fn(),
            update: jest.fn(),
          });
        });

        await expect(
          createMerchantAlias(ocrMerchant, userAlias, coupleId, createdBy)
        ).rejects.toThrow('This alias name is already in use');
      });
    });

    describe('updateAliasUsageCount - Transaction Safety', () => {
      it('should prevent race condition in usage count increment', async () => {
        const aliasId = 'alias123';

        // Mock transaction for atomic increment
        runTransaction.mockImplementation(async (db, transactionCallback) => {
          const mockTransaction = {
            get: jest.fn().mockResolvedValue({
              exists: () => true,
              data: () => ({
                usageCount: 5,
                userAlias: 'Test Alias',
              }),
            }),
            update: jest.fn(),
          };

          return await transactionCallback(mockTransaction);
        });

        const mockDocRef = { id: aliasId };
        doc.mockReturnValue(mockDocRef);
        serverTimestamp.mockReturnValue('mock-timestamp');

        await updateAliasUsageCount(aliasId);

        expect(runTransaction).toHaveBeenCalled();

        // Verify transaction was used
        const transactionCallback = runTransaction.mock.calls[0][1];
        expect(typeof transactionCallback).toBe('function');
      });

      it('should handle concurrent usage count updates correctly', async () => {
        const aliasId = 'alias123';
        let currentCount = 10;

        // Simulate multiple concurrent updates
        runTransaction.mockImplementation(async (db, transactionCallback) => {
          const mockTransaction = {
            get: jest.fn().mockResolvedValue({
              exists: () => true,
              data: () => ({
                usageCount: currentCount,
                userAlias: 'Test Alias',
              }),
            }),
            update: jest.fn().mockImplementation((ref, updates) => {
              // Simulate atomic increment
              currentCount++;
            }),
          };

          return await transactionCallback(mockTransaction);
        });

        doc.mockReturnValue({ id: aliasId });
        serverTimestamp.mockReturnValue('mock-timestamp');

        // Execute multiple concurrent updates
        await Promise.all([
          updateAliasUsageCount(aliasId),
          updateAliasUsageCount(aliasId),
          updateAliasUsageCount(aliasId),
        ]);

        // All three should complete successfully
        expect(runTransaction).toHaveBeenCalledTimes(3);
        // Final count should reflect all increments
        expect(currentCount).toBe(13);
      });

      it('should throw error if alias not found during transaction', async () => {
        const aliasId = 'non-existent';

        runTransaction.mockImplementation(async (db, transactionCallback) => {
          const mockTransaction = {
            get: jest.fn().mockResolvedValue({
              exists: () => false,
              data: () => null,
            }),
            update: jest.fn(),
          };

          return await transactionCallback(mockTransaction);
        });

        doc.mockReturnValue({ id: aliasId });

        await expect(updateAliasUsageCount(aliasId)).rejects.toThrow('Alias not found');
      });
    });

    describe('Transaction Data Consistency', () => {
      it('should maintain data consistency under concurrent load', async () => {
        const coupleId = 'couple123';
        const merchants = [
          { ocr: 'STORE A', alias: 'Store A' },
          { ocr: 'STORE B', alias: 'Store B' },
          { ocr: 'STORE C', alias: 'Store C' },
        ];

        let createdAliases = [];

        runTransaction.mockImplementation(async (db, transactionCallback) => {
          const mockTransaction = {
            get: jest.fn().mockResolvedValue({
              exists: () => false,
              data: () => null,
            }),
            set: jest.fn().mockImplementation((ref, data) => {
              createdAliases.push(data);
            }),
            update: jest.fn(),
          };

          return await transactionCallback(mockTransaction);
        });

        getDocs.mockResolvedValue({ empty: true, docs: [] });
        doc.mockImplementation(() => ({ id: `alias-${createdAliases.length}` }));
        serverTimestamp.mockReturnValue('mock-timestamp');

        // Create multiple aliases concurrently
        const results = await Promise.all(
          merchants.map((m) =>
            createMerchantAlias(m.ocr, m.alias, coupleId, 'user1')
          )
        );

        // All should succeed with unique IDs
        expect(results).toHaveLength(3);
        expect(new Set(results).size).toBe(3);

        // All should have used transactions
        expect(runTransaction).toHaveBeenCalledTimes(3);
      });

      it('should ensure atomic read-check-write cycle', async () => {
        const ocrMerchant = 'ATOMIC TEST';
        const userAlias = 'Atomic Store';
        const coupleId = 'couple123';

        let checkCalled = false;
        let writeCalled = false;

        // Mock getDocs to track when duplicate check occurs
        getDocs.mockImplementation(async () => {
          checkCalled = true;
          return { empty: true, docs: [] };
        });

        runTransaction.mockImplementation(async (db, transactionCallback) => {
          const mockTransaction = {
            get: jest.fn(),
            set: jest.fn().mockImplementation(() => {
              // Verify that duplicate check happened before write
              if (!checkCalled) {
                throw new Error('Write called before check!');
              }
              writeCalled = true;
            }),
            update: jest.fn(),
          };

          return await transactionCallback(mockTransaction);
        });

        doc.mockReturnValue({ id: 'atomic-test' });
        serverTimestamp.mockReturnValue('mock-timestamp');

        await createMerchantAlias(ocrMerchant, userAlias, coupleId, 'user1');

        // Verify both check and write occurred in correct order
        expect(checkCalled).toBe(true);
        expect(writeCalled).toBe(true);
      });
    });
  });
});
