// useRageClickTracker.js
// Custom React hook for tracking rage clicks on any component

import { useCallback } from 'react';
import { trackRageClick } from '../services/analyticsService';

/**
 * Hook to track rage clicks on buttons/touchables
 * Usage:
 * const handlePress = useRageClickTracker('submit_button', actualSubmitHandler);
 * <TouchableOpacity onPress={handlePress}>
 */
export const useRageClickTracker = (elementId, onPress, metadata = {}) => {
  const handlePress = useCallback(
    async (...args) => {
      // Track potential rage click
      await trackRageClick(elementId, metadata);

      // Execute actual onPress handler
      if (onPress) {
        return onPress(...args);
      }
    },
    [elementId, onPress, metadata]
  );

  return handlePress;
};

export default useRageClickTracker;
