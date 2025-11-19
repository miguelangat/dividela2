// Manual mock for react-native
// This provides minimal mocks for the parts we need in tests

const React = require('react');

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

// Create mock React Native components
const mockComponent = (name) => {
  const Component = React.forwardRef((props, ref) =>
    React.createElement(name, { ...props, ref })
  );
  Component.displayName = name;
  return Component;
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
  // Mock components
  View: mockComponent('View'),
  Text: mockComponent('Text'),
  TouchableOpacity: mockComponent('TouchableOpacity'),
  ScrollView: mockComponent('ScrollView'),
  FlatList: mockComponent('FlatList'),
  Image: mockComponent('Image'),
  TextInput: mockComponent('TextInput'),
  Alert: {
    alert: jest.fn(),
  },
};
