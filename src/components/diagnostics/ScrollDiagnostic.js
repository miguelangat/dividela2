// src/components/diagnostics/ScrollDiagnostic.js
// Diagnostic tool to debug web scrolling issues

import React, { useEffect, useRef } from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';

export default function ScrollDiagnostic({ label = 'Scroll Diagnostic' }) {
  const containerRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      console.log(`[${label}] Diagnostic only runs on web`);
      return;
    }

    const logDimensions = () => {
      console.log(`\n=== ${label} - Scroll Diagnostics ===`);
      console.log('Window:', {
        innerHeight: window.innerHeight,
        innerWidth: window.innerWidth,
        scrollY: window.scrollY,
        documentHeight: document.documentElement.scrollHeight,
      });

      if (containerRef.current) {
        const container = containerRef.current;
        console.log('Container:', {
          offsetHeight: container.offsetHeight,
          scrollHeight: container.scrollHeight,
          clientHeight: container.clientHeight,
          overflow: window.getComputedStyle(container).overflow,
          overflowY: window.getComputedStyle(container).overflowY,
          height: window.getComputedStyle(container).height,
          flex: window.getComputedStyle(container).flex,
        });
      }

      if (contentRef.current) {
        const content = contentRef.current;
        console.log('Content:', {
          offsetHeight: content.offsetHeight,
          scrollHeight: content.scrollHeight,
          clientHeight: content.clientHeight,
        });
      }

      console.log('Scroll Available:', {
        canScroll: containerRef.current
          ? containerRef.current.scrollHeight > containerRef.current.clientHeight
          : false,
      });
      console.log('=== End Diagnostics ===\n');
    };

    // Log on mount
    setTimeout(logDimensions, 100);
    setTimeout(logDimensions, 500);
    setTimeout(logDimensions, 1000);

    // Log on resize
    window.addEventListener('resize', logDimensions);
    return () => window.removeEventListener('resize', logDimensions);
  }, [label]);

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <>
      <View ref={containerRef} style={styles.diagnostic}>
        <Text style={styles.diagnosticText}>{label}</Text>
      </View>
      <View ref={contentRef} style={styles.hidden} />
    </>
  );
}

const styles = StyleSheet.create({
  diagnostic: {
    position: 'absolute',
    bottom: 60,
    right: 10,
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 4,
    zIndex: 9999,
  },
  diagnosticText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  hidden: {
    position: 'absolute',
    opacity: 0,
    pointerEvents: 'none',
  },
});
