/**
 * Firebase Admin Mock
 * Provides mock implementations of Firebase Admin SDK for testing
 */

// Mock Firestore DocumentReference
class MockDocumentReference {
  constructor(path, data = null) {
    this.path = path;
    this._data = data;
  }

  async get() {
    return {
      exists: this._data !== null,
      id: this.path.split('/').pop(),
      data: () => this._data,
      ref: this,
    };
  }

  async set(data, options = {}) {
    if (options.merge) {
      this._data = { ...this._data, ...data };
    } else {
      this._data = data;
    }
    return { writeTime: new Date() };
  }

  async update(data) {
    this._data = { ...this._data, ...data };
    return { writeTime: new Date() };
  }

  async delete() {
    this._data = null;
    return { writeTime: new Date() };
  }

  collection(collectionPath) {
    return new MockCollectionReference(`${this.path}/${collectionPath}`);
  }
}

// Mock Firestore CollectionReference
class MockCollectionReference {
  constructor(path) {
    this.path = path;
    this._docs = new Map();
  }

  doc(docId) {
    if (!docId) {
      // Generate random ID
      docId = 'mock_' + Math.random().toString(36).substr(2, 9);
    }

    if (!this._docs.has(docId)) {
      this._docs.set(docId, new MockDocumentReference(`${this.path}/${docId}`));
    }

    return this._docs.get(docId);
  }

  async add(data) {
    const docId = 'mock_' + Math.random().toString(36).substr(2, 9);
    const docRef = this.doc(docId);
    await docRef.set(data);
    return docRef;
  }

  where(field, operator, value) {
    return new MockQuery(this, [{ field, operator, value }]);
  }

  orderBy(field, direction = 'asc') {
    return new MockQuery(this, [], [{ field, direction }]);
  }

  limit(count) {
    return new MockQuery(this, [], [], count);
  }
}

// Mock Firestore Query
class MockQuery {
  constructor(collection, whereClauses = [], orderByClauses = [], limitCount = null) {
    this.collection = collection;
    this._whereClauses = whereClauses;
    this._orderByClauses = orderByClauses;
    this._limitCount = limitCount;
  }

  where(field, operator, value) {
    return new MockQuery(
      this.collection,
      [...this._whereClauses, { field, operator, value }],
      this._orderByClauses,
      this._limitCount
    );
  }

  orderBy(field, direction = 'asc') {
    return new MockQuery(
      this.collection,
      this._whereClauses,
      [...this._orderByClauses, { field, direction }],
      this._limitCount
    );
  }

  limit(count) {
    return new MockQuery(
      this.collection,
      this._whereClauses,
      this._orderByClauses,
      count
    );
  }

  async get() {
    // Simple mock implementation - returns empty query snapshot
    return {
      empty: true,
      size: 0,
      docs: [],
      forEach: (callback) => {},
    };
  }
}

// Mock Firestore
const mockFirestore = {
  collection: (collectionPath) => new MockCollectionReference(collectionPath),

  doc: (documentPath) => new MockDocumentReference(documentPath),

  batch: () => ({
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn().mockResolvedValue({ writeTime: new Date() }),
  }),

  runTransaction: jest.fn((callback) => {
    const transaction = {
      get: jest.fn().mockResolvedValue({ exists: false, data: () => null }),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    return callback(transaction);
  }),

  FieldValue: {
    serverTimestamp: () => '__SERVER_TIMESTAMP__',
    increment: (n) => `__INCREMENT_${n}__`,
    arrayUnion: (...elements) => `__ARRAY_UNION_${JSON.stringify(elements)}__`,
    arrayRemove: (...elements) => `__ARRAY_REMOVE_${JSON.stringify(elements)}__`,
    delete: () => '__DELETE__',
  },

  Timestamp: {
    now: () => ({ seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }),
    fromDate: (date) => ({
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: 0,
    }),
  },
};

// Mock Storage
const mockStorage = {
  bucket: (bucketName) => ({
    file: (filePath) => ({
      save: jest.fn().mockResolvedValue(),
      download: jest.fn().mockResolvedValue([Buffer.from('mock file data')]),
      delete: jest.fn().mockResolvedValue(),
      getSignedUrl: jest.fn().mockResolvedValue(['https://mock-url.com/file']),
      exists: jest.fn().mockResolvedValue([true]),
    }),
    upload: jest.fn().mockResolvedValue([{ name: 'uploaded-file.jpg' }]),
  }),
};

// Mock Firebase Admin
const mockAdmin = {
  firestore: jest.fn(() => mockFirestore),
  storage: jest.fn(() => mockStorage),

  initializeApp: jest.fn(() => mockAdmin),

  credential: {
    applicationDefault: jest.fn(),
    cert: jest.fn(),
  },

  // Export mocks for direct access in tests
  _mockFirestore: mockFirestore,
  _mockStorage: mockStorage,
};

module.exports = mockAdmin;
