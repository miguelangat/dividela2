// Manual mock for react-native
// This provides minimal mocks for the parts we need in tests

const mockAppState = {
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
  currentState: 'active',
};

const mockPlatform = {
  OS: 'ios',
  Version: '14.0',
  select: jest.fn((obj) => obj.ios || obj.default),
};

module.exports = {
  AppState: mockAppState,
  Platform: mockPlatform,
  StyleSheet: {
    create: (styles) => styles,
    flatten: (style) => style,
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  // Add other commonly used exports as needed
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  FlatList: 'FlatList',
  Image: 'Image',
  TextInput: 'TextInput',
  Alert: {
    alert: jest.fn(),
  },
};
