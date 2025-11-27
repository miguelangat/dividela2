/**
 * Import session management
 * Tracks import sessions with unique IDs, state persistence, and recovery
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { info, warn, error as logError, logImportSession } from './importDebug';

const SESSION_STORAGE_KEY = 'dividela_import_sessions';
const ACTIVE_SESSION_KEY = 'dividela_active_import_session';

/**
 * Session states
 */
export const SESSION_STATES = {
  CREATED: 'created',
  PARSING: 'parsing',
  PROCESSING: 'processing',
  IMPORTING: 'importing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

/**
 * Generate unique session ID
 */
function generateSessionId() {
  return `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new import session
 */
export async function createSession(userId, fileInfo) {
  const sessionId = generateSessionId();

  const session = {
    id: sessionId,
    userId,
    state: SESSION_STATES.CREATED,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fileInfo: {
      name: fileInfo.name,
      type: fileInfo.type,
      size: fileInfo.size,
      uri: fileInfo.uri,
    },
    progress: {
      phase: 'created',
      percentage: 0,
      current: 0,
      total: 0,
    },
    result: null,
    error: null,
  };

  // Save session
  await saveSession(session);

  // Set as active session
  await AsyncStorage.setItem(ACTIVE_SESSION_KEY, sessionId);

  logImportSession(sessionId, 'CREATED', { fileInfo });

  return session;
}

/**
 * Update session state
 */
export async function updateSession(sessionId, updates) {
  try {
    const session = await getSession(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const updatedSession = {
      ...session,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await saveSession(updatedSession);

    logImportSession(sessionId, 'UPDATED', updates);

    return updatedSession;
  } catch (error) {
    logError('SESSION', `Failed to update session ${sessionId}`, { error: error.message });
    throw error;
  }
}

/**
 * Update session progress
 */
export async function updateProgress(sessionId, progress) {
  return await updateSession(sessionId, { progress });
}

/**
 * Mark session as completed
 */
export async function completeSession(sessionId, result) {
  return await updateSession(sessionId, {
    state: SESSION_STATES.COMPLETED,
    result,
    progress: {
      phase: 'completed',
      percentage: 100,
      current: result.importedCount || 0,
      total: result.totalExpenses || 0,
    },
  });
}

/**
 * Mark session as failed
 */
export async function failSession(sessionId, error) {
  return await updateSession(sessionId, {
    state: SESSION_STATES.FAILED,
    error: {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Mark session as cancelled
 */
export async function cancelSession(sessionId) {
  return await updateSession(sessionId, {
    state: SESSION_STATES.CANCELLED,
  });
}

/**
 * Get session by ID
 */
export async function getSession(sessionId) {
  try {
    const allSessions = await getAllSessions();
    return allSessions.find(s => s.id === sessionId) || null;
  } catch (error) {
    logError('SESSION', `Failed to get session ${sessionId}`, { error: error.message });
    return null;
  }
}

/**
 * Get active session
 */
export async function getActiveSession() {
  try {
    const sessionId = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
    if (!sessionId) return null;

    return await getSession(sessionId);
  } catch (error) {
    logError('SESSION', 'Failed to get active session', { error: error.message });
    return null;
  }
}

/**
 * Clear active session
 */
export async function clearActiveSession() {
  try {
    await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch (error) {
    logError('SESSION', 'Failed to clear active session', { error: error.message });
  }
}

/**
 * Get all sessions
 */
export async function getAllSessions() {
  try {
    const data = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    logError('SESSION', 'Failed to get all sessions', { error: error.message });
    return [];
  }
}

/**
 * Save session
 */
async function saveSession(session) {
  try {
    const sessions = await getAllSessions();

    // Update or add session
    const index = sessions.findIndex(s => s.id === session.id);
    if (index !== -1) {
      sessions[index] = session;
    } else {
      sessions.push(session);
    }

    // Keep only last 50 sessions
    const trimmed = sessions.slice(-50);

    await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    logError('SESSION', 'Failed to save session', { error: error.message });
    throw error;
  }
}

/**
 * Get sessions by user
 */
export async function getUserSessions(userId) {
  try {
    const sessions = await getAllSessions();
    return sessions.filter(s => s.userId === userId);
  } catch (error) {
    logError('SESSION', `Failed to get sessions for user ${userId}`, { error: error.message });
    return [];
  }
}

/**
 * Get failed sessions that can be retried
 */
export async function getRetryableSessions(userId) {
  try {
    const sessions = await getUserSessions(userId);
    return sessions.filter(
      s =>
        s.state === SESSION_STATES.FAILED &&
        s.fileInfo &&
        // Only retry sessions from last 24 hours
        Date.now() - new Date(s.createdAt).getTime() < 24 * 60 * 60 * 1000
    );
  } catch (error) {
    logError('SESSION', 'Failed to get retryable sessions', { error: error.message });
    return [];
  }
}

/**
 * Clean up old sessions
 */
export async function cleanupOldSessions(maxAgeDays = 30) {
  try {
    const sessions = await getAllSessions();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

    const activeSessions = sessions.filter(s => {
      const sessionDate = new Date(s.createdAt);
      return sessionDate >= cutoffDate;
    });

    await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(activeSessions));

    info('SESSION', `Cleaned up old sessions`, {
      removed: sessions.length - activeSessions.length,
      remaining: activeSessions.length,
    });

    return activeSessions.length;
  } catch (error) {
    logError('SESSION', 'Failed to cleanup old sessions', { error: error.message });
    return 0;
  }
}

/**
 * Get session statistics
 */
export async function getSessionStats(userId) {
  try {
    const sessions = await getUserSessions(userId);

    const stats = {
      total: sessions.length,
      completed: sessions.filter(s => s.state === SESSION_STATES.COMPLETED).length,
      failed: sessions.filter(s => s.state === SESSION_STATES.FAILED).length,
      cancelled: sessions.filter(s => s.state === SESSION_STATES.CANCELLED).length,
      totalImported: sessions
        .filter(s => s.state === SESSION_STATES.COMPLETED)
        .reduce((sum, s) => sum + (s.result?.importedCount || 0), 0),
      averageImportSize:
        sessions.filter(s => s.state === SESSION_STATES.COMPLETED).length > 0
          ? Math.round(
              sessions
                .filter(s => s.state === SESSION_STATES.COMPLETED)
                .reduce((sum, s) => sum + (s.result?.importedCount || 0), 0) /
                sessions.filter(s => s.state === SESSION_STATES.COMPLETED).length
            )
          : 0,
      recentSession: sessions[sessions.length - 1] || null,
    };

    return stats;
  } catch (error) {
    logError('SESSION', 'Failed to get session stats', { error: error.message });
    return {
      total: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      totalImported: 0,
      averageImportSize: 0,
      recentSession: null,
    };
  }
}

export default {
  createSession,
  updateSession,
  updateProgress,
  completeSession,
  failSession,
  cancelSession,
  getSession,
  getActiveSession,
  clearActiveSession,
  getAllSessions,
  getUserSessions,
  getRetryableSessions,
  cleanupOldSessions,
  getSessionStats,
  SESSION_STATES,
};
