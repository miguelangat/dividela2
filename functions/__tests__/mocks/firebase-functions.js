/**
 * Firebase Functions Mock
 * Provides mock implementations of Firebase Functions SDK for testing
 */

// Mock HTTPS callable function
const mockHttpsOnCall = (handler) => {
  const wrappedHandler = async (data, context) => {
    return handler(data, context);
  };

  // Attach test helper to invoke the function
  wrappedHandler._call = (data, auth = null) => {
    const context = {
      auth: auth || {
        uid: 'test-user-id',
        token: {
          email: 'test@example.com',
          email_verified: true,
        },
      },
      rawRequest: {},
    };
    return handler(data, context);
  };

  return wrappedHandler;
};

// Mock HTTPS onRequest function
const mockHttpsOnRequest = (handler) => {
  const wrappedHandler = (req, res) => {
    return handler(req, res);
  };

  // Attach test helper
  wrappedHandler._createMockRequest = (data = {}, options = {}) => ({
    body: data,
    query: options.query || {},
    headers: options.headers || {},
    method: options.method || 'POST',
    ...options,
  });

  wrappedHandler._createMockResponse = () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };
    return res;
  };

  return wrappedHandler;
};

// Mock Firestore triggers
const mockFirestoreDocument = (path) => ({
  onCreate: (handler) => handler,
  onUpdate: (handler) => handler,
  onDelete: (handler) => handler,
  onWrite: (handler) => handler,
});

// Mock Storage triggers
const mockStorageObject = () => ({
  onFinalize: (handler) => handler,
  onDelete: (handler) => handler,
  onArchive: (handler) => handler,
  onMetadataUpdate: (handler) => handler,
});

// Mock PubSub triggers
const mockPubSubTopic = (topic) => ({
  onPublish: (handler) => handler,
});

// Mock Scheduled functions
const mockPubSubSchedule = (schedule) => ({
  onRun: (handler) => handler,
});

// Mock event context for testing
const createMockEventContext = (options = {}) => ({
  eventId: options.eventId || 'mock-event-id-' + Date.now(),
  timestamp: options.timestamp || new Date().toISOString(),
  eventType: options.eventType || 'providers/cloud.firestore/eventTypes/document.write',
  resource: options.resource || 'projects/test/databases/(default)/documents/test/doc',
  params: options.params || {},
});

// Mock Change object for Firestore triggers
class MockChange {
  constructor(before, after) {
    this.before = before;
    this.after = after;
  }
}

// Mock DocumentSnapshot
class MockDocumentSnapshot {
  constructor(ref, data) {
    this.ref = ref;
    this._data = data;
    this.exists = data !== null && data !== undefined;
    this.id = ref.split('/').pop();
  }

  data() {
    return this._data;
  }

  get(field) {
    return this._data ? this._data[field] : undefined;
  }
}

// Create test helpers
const testHelpers = {
  createMockChange: (beforeData, afterData, ref = 'projects/test/databases/(default)/documents/test/doc') => {
    return new MockChange(
      new MockDocumentSnapshot(ref, beforeData),
      new MockDocumentSnapshot(ref, afterData)
    );
  },

  createMockDocumentSnapshot: (data, ref = 'projects/test/databases/(default)/documents/test/doc') => {
    return new MockDocumentSnapshot(ref, data);
  },

  createMockEventContext,
};

// Mock Firebase Functions module
const mockFunctions = {
  https: {
    onCall: mockHttpsOnCall,
    onRequest: mockHttpsOnRequest,
  },

  firestore: {
    document: mockFirestoreDocument,
  },

  storage: {
    object: mockStorageObject,
  },

  pubsub: {
    topic: mockPubSubTopic,
    schedule: mockPubSubSchedule,
  },

  // Test helpers
  _testHelpers: testHelpers,
};

module.exports = mockFunctions;
