/**
 * Pre-setup file that runs BEFORE jest-expo's setup
 * This patches React 19 to work with jest-expo's setup.js
 */

// Patch React to prevent jest-expo from breaking
const React = require('react');

// jest-expo tries to access React.PropTypes which doesn't exist in React 19
if (!React.PropTypes) {
  React.PropTypes = {
    number: () => {},
    string: () => {},
    func: () => {},
    bool: () => {},
    object: () => {},
    array: () => {},
    any: () => {},
    node: () => {},
    element: () => {},
    oneOf: () => {},
    oneOfType: () => {},
    arrayOf: () => {},
    objectOf: () => {},
    shape: () => {},
    instanceOf: () => {},
  };
}

// Patch other potentially missing properties
if (!React.createClass) {
  React.createClass = function() {
    throw new Error('React.createClass is not available in React 19');
  };
}

if (!React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
  React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {};
}
