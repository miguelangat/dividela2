/**
 * Jest polyfills for React 19 compatibility
 * This file runs BEFORE jest-expo setup to provide necessary polyfills
 */

// React 19 compatibility
global.IS_REACT_ACT_ENVIRONMENT = true;

// Polyfill for structuredClone if not available
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
  };
}

// Polyfill for requestAnimationFrame
if (typeof global.requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (callback) => {
    return setTimeout(callback, 0);
  };
}

// Polyfill for cancelAnimationFrame
if (typeof global.cancelAnimationFrame === 'undefined') {
  global.cancelAnimationFrame = (id) => {
    clearTimeout(id);
  };
}

// Suppress specific console warnings during tests
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args) => {
  const msg = args[0];
  // Suppress known React 19 warnings that are not relevant to tests
  if (
    typeof msg === 'string' &&
    (msg.includes('ReactDOM.render') ||
     msg.includes('Warning: useLayoutEffect') ||
     msg.includes('Warning: An update to') ||
     msg.includes('act(...)'))
  ) {
    return;
  }
  originalWarn.apply(console, args);
};

console.error = (...args) => {
  const msg = args[0];
  // Suppress known React 19 errors that are not relevant to tests
  if (
    typeof msg === 'string' &&
    (msg.includes('Warning: ReactDOM.render') ||
     msg.includes('Not implemented: HTMLFormElement'))
  ) {
    return;
  }
  originalError.apply(console, args);
};
