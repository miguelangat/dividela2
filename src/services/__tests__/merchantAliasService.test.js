// src/services/__tests__/merchantAliasService.test.js
// Tests for merchant alias management operations

import {
  getMerchantAlias,
  createMerchantAlias,
  getMerchantAliases,
  updateAliasUsageCount,
} from '../merchantAliasService';

import {
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
} from 'firebase/firestore';

// Mock Firebase modules
jest.mock('firebase/firestore');
jest.mock('../../config/firebase', () => ({
  db: {},
}));

describe('merchantAliasService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      updateDoc.mockResolvedValue();
      increment.mockReturnValue('increment-1');
      serverTimestamp.mockReturnValue('mock-timestamp');

      await getMerchantAlias(ocrMerchant, coupleId);

      expect(doc).toHaveBeenCalled();
      const updateDocCalls = updateDoc.mock.calls[0];
      expect(updateDocCalls[1]).toMatchObject({
        usageCount: 'increment-1',
        lastUsed: 'mock-timestamp',
      });
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

      const mockDocRef = { id: 'alias123' };
      addDoc.mockResolvedValue(mockDocRef);
      serverTimestamp.mockReturnValue('mock-timestamp');

      const result = await createMerchantAlias(ocrMerchant, userAlias, coupleId);

      expect(collection).toHaveBeenCalled();
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ocrMerchant,
          ocrMerchantLower: ocrMerchant.toLowerCase(),
          userAlias,
          coupleId,
          usageCount: 1,
          createdAt: 'mock-timestamp',
        })
      );

      expect(result.id).toBe('alias123');
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

      await expect(
        createMerchantAlias(ocrMerchant, userAlias, coupleId)
      ).rejects.toThrow('Alias already exists for this merchant');
    });

    it('should handle Firestore errors', async () => {
      const ocrMerchant = 'WHOLE FOODS MKT';
      const userAlias = 'Whole Foods Market';
      const coupleId = 'couple123';

      // Mock empty snapshot for duplicate check
      getDocs.mockResolvedValue({ empty: true, docs: [] });

      addDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(
        createMerchantAlias(ocrMerchant, userAlias, coupleId)
      ).rejects.toThrow('Firestore error');
    });

    it('should trim whitespace from inputs', async () => {
      const ocrMerchant = '  WHOLE FOODS MKT  ';
      const userAlias = '  Whole Foods Market  ';
      const coupleId = 'couple123';

      const mockDocRef = { id: 'alias123' };
      addDoc.mockResolvedValue(mockDocRef);
      serverTimestamp.mockReturnValue('mock-timestamp');

      // Mock empty snapshot for duplicate check
      getDocs.mockResolvedValue({ empty: true, docs: [] });

      await createMerchantAlias(ocrMerchant, userAlias, coupleId);

      const callArgs = addDoc.mock.calls[0][1];
      expect(callArgs.ocrMerchant).toBe('WHOLE FOODS MKT');
      expect(callArgs.userAlias).toBe('Whole Foods Market');
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

      updateDoc.mockResolvedValue();
      increment.mockReturnValue('increment-1');
      serverTimestamp.mockReturnValue('mock-timestamp');

      await updateAliasUsageCount(aliasId);

      expect(doc).toHaveBeenCalled();
      const updateDocCalls = updateDoc.mock.calls[0];
      expect(updateDocCalls[1]).toMatchObject({
        usageCount: 'increment-1',
        lastUsed: 'mock-timestamp',
      });
    });

    it('should validate alias ID', async () => {
      await expect(updateAliasUsageCount(null)).rejects.toThrow('Alias ID is required');
      await expect(updateAliasUsageCount('')).rejects.toThrow('Alias ID is required');
    });

    it('should handle Firestore errors', async () => {
      const aliasId = 'alias123';

      updateDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(updateAliasUsageCount(aliasId)).rejects.toThrow('Firestore error');
    });
  });

  describe('Integration - Full Alias Workflow', () => {
    it('should handle create, retrieve, and update cycle', async () => {
      const ocrMerchant = 'WHOLE FOODS MKT';
      const userAlias = 'Whole Foods Market';
      const coupleId = 'couple123';

      // Create alias
      const mockDocRef = { id: 'alias123' };
      addDoc.mockResolvedValue(mockDocRef);
      serverTimestamp.mockReturnValue('mock-timestamp');

      // Mock empty snapshot for duplicate check
      getDocs.mockResolvedValueOnce({ empty: true, docs: [] });

      const created = await createMerchantAlias(ocrMerchant, userAlias, coupleId);
      expect(created.id).toBe('alias123');

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
      updateDoc.mockResolvedValue();
      increment.mockReturnValue('increment-1');

      const alias = await getMerchantAlias(ocrMerchant, coupleId);
      expect(alias).toBe(userAlias);

      // Verify usage count was updated
      expect(updateDoc).toHaveBeenCalled();
    });

    it('should handle multiple aliases for same couple', async () => {
      const coupleId = 'couple123';

      const aliases = [
        { ocrMerchant: 'WHOLE FOODS MKT', userAlias: 'Whole Foods Market' },
        { ocrMerchant: 'STARBUCKS', userAlias: 'Starbucks Coffee' },
        { ocrMerchant: 'SHELL', userAlias: 'Shell Gas Station' },
      ];

      // Create multiple aliases
      addDoc.mockResolvedValue({ id: 'alias123' });
      serverTimestamp.mockReturnValue('mock-timestamp');

      // Mock empty snapshots for duplicate checks
      getDocs.mockResolvedValue({ empty: true, docs: [] });

      for (const alias of aliases) {
        await createMerchantAlias(alias.ocrMerchant, alias.userAlias, coupleId);
      }

      expect(addDoc).toHaveBeenCalledTimes(3);

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
      addDoc.mockResolvedValue(mockDocRef);
      serverTimestamp.mockReturnValue('mock-timestamp');

      // Mock empty snapshot for duplicate check
      getDocs.mockResolvedValue({ empty: true, docs: [] });

      const result = await createMerchantAlias(ocrMerchant, userAlias, coupleId);

      expect(result.id).toBe('alias123');
      const callArgs = addDoc.mock.calls[0][1];
      expect(callArgs.ocrMerchantLower).toBe("mcdonald's #1234");
    });

    it('should handle very long merchant names', async () => {
      const ocrMerchant = 'A'.repeat(200);
      const userAlias = 'Short Name';
      const coupleId = 'couple123';

      const mockDocRef = { id: 'alias123' };
      addDoc.mockResolvedValue(mockDocRef);
      serverTimestamp.mockReturnValue('mock-timestamp');

      // Mock empty snapshot for duplicate check
      getDocs.mockResolvedValue({ empty: true, docs: [] });

      const result = await createMerchantAlias(ocrMerchant, userAlias, coupleId);

      expect(result.id).toBe('alias123');
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
      updateDoc.mockResolvedValue();
      increment.mockReturnValue('increment-1');

      for (const variation of variations) {
        const result = await getMerchantAlias(variation, coupleId);
        expect(result).toBe('Whole Foods Market');
      }
    });
  });
});
