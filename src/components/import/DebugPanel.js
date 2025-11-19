import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Share, Alert } from 'react-native';
import { Modal, Portal, Card, Text, Button, Chip, List, IconButton, Switch, Divider } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { theme } from '../../constants/theme';
import {
  isDebugMode,
  setDebugMode,
  getLogs,
  clearLogs,
  exportLogsAsText,
  getDebugSummary,
  LOG_LEVELS,
} from '../../utils/importDebug';
import { getSessionStats } from '../../utils/importSession';

/**
 * Debug panel for troubleshooting import issues
 * Shows logs, statistics, and diagnostic information
 */
export default function DebugPanel({ visible, onDismiss, userId }) {
  const { t } = useTranslation();
  const [debugEnabled, setDebugEnabled] = useState(isDebugMode());
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [sessionStats, setSessionStats] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadDebugData();
    }
  }, [visible]);

  const loadDebugData = async () => {
    setLoading(true);
    try {
      const [logsData, summaryData, statsData] = await Promise.all([
        getLogs({ level: selectedLevel }),
        getDebugSummary(),
        userId ? getSessionStats(userId) : Promise.resolve(null),
      ]);

      setLogs(logsData.slice(0, 100)); // Show last 100 logs
      setSummary(summaryData);
      setSessionStats(statsData);
    } catch (error) {
      console.error('Failed to load debug data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDebug = () => {
    const newValue = !debugEnabled;
    setDebugMode(newValue);
    setDebugEnabled(newValue);
  };

  const handleClearLogs = () => {
    Alert.alert(
      t('import.debug.clearLogsTitle'),
      t('import.debug.clearLogsMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('import.debug.clear'),
          style: 'destructive',
          onPress: async () => {
            await clearLogs();
            await loadDebugData();
          },
        },
      ]
    );
  };

  const handleExportLogs = async () => {
    try {
      const text = await exportLogsAsText();

      await Share.share({
        message: text,
        title: t('import.debug.exportLogsTitle'),
      });
    } catch (error) {
      Alert.alert(t('common.error'), t('import.debug.exportError', { error: error.message }));
    }
  };

  const handleFilterLevel = (level) => {
    setSelectedLevel(selectedLevel === level ? null : level);
    loadDebugData();
  };

  const getLevelColor = (level) => {
    switch (level) {
      case LOG_LEVELS.ERROR:
        return theme.colors.error;
      case LOG_LEVELS.WARN:
        return theme.colors.warning;
      case LOG_LEVELS.INFO:
        return theme.colors.info;
      case LOG_LEVELS.PERF:
        return theme.colors.success;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getLevelIcon = (level) => {
    switch (level) {
      case LOG_LEVELS.ERROR:
        return 'alert-circle';
      case LOG_LEVELS.WARN:
        return 'alert';
      case LOG_LEVELS.INFO:
        return 'information';
      case LOG_LEVELS.PERF:
        return 'speedometer';
      default:
        return 'bug';
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <Card style={styles.card}>
          <Card.Title
            title={t('import.debug.title')}
            subtitle={t('import.debug.subtitle')}
            right={(props) => (
              <IconButton {...props} icon="close" onPress={onDismiss} />
            )}
          />

          <Card.Content>
            {/* Debug Mode Toggle */}
            <View style={styles.debugToggle}>
              <View>
                <Text style={styles.toggleLabel}>{t('import.debug.debugMode')}</Text>
                <Text style={styles.toggleSubtitle}>
                  {t('import.debug.debugModeDescription')}
                </Text>
              </View>
              <Switch value={debugEnabled} onValueChange={handleToggleDebug} />
            </View>

            <Divider style={styles.divider} />

            {/* Summary Statistics */}
            {summary && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('import.debug.summary')}</Text>
                <View style={styles.statsGrid}>
                  <StatCard label={t('import.debug.totalLogs')} value={summary.totalLogs} />
                  <StatCard label={t('import.debug.errors')} value={summary.errors} color={theme.colors.error} />
                  <StatCard label={t('import.debug.warnings')} value={summary.warnings} color={theme.colors.warning} />
                </View>
              </View>
            )}

            {/* Session Statistics */}
            {sessionStats && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('import.debug.importStatistics')}</Text>
                <View style={styles.statsGrid}>
                  <StatCard label={t('import.debug.totalImports')} value={sessionStats.total} />
                  <StatCard label={t('import.debug.completed')} value={sessionStats.completed} color={theme.colors.success} />
                  <StatCard label={t('import.debug.failed')} value={sessionStats.failed} color={theme.colors.error} />
                </View>
                <View style={styles.statsGrid}>
                  <StatCard label={t('import.debug.totalImported')} value={sessionStats.totalImported} />
                  <StatCard label={t('import.debug.avgSize')} value={sessionStats.averageImportSize} />
                </View>
              </View>
            )}

            <Divider style={styles.divider} />

            {/* Level Filters */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('import.debug.filterByLevel')}</Text>
              <View style={styles.filterChips}>
                {Object.values(LOG_LEVELS).map(level => (
                  <Chip
                    key={level}
                    selected={selectedLevel === level}
                    onPress={() => handleFilterLevel(level)}
                    style={styles.filterChip}
                    icon={getLevelIcon(level)}
                  >
                    {level}
                  </Chip>
                ))}
              </View>
            </View>

            {/* Logs List */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('import.debug.recentLogs', { count: logs.length })}</Text>
              <ScrollView style={styles.logsList}>
                {logs.length === 0 ? (
                  <Text style={styles.emptyText}>{t('import.debug.noLogs')}</Text>
                ) : (
                  logs.map((log, index) => (
                    <View key={index} style={styles.logItem}>
                      <View style={styles.logHeader}>
                        <Chip
                          icon={getLevelIcon(log.level)}
                          textStyle={{ color: getLevelColor(log.level), fontSize: 10 }}
                          style={[styles.logLevelChip, { backgroundColor: getLevelColor(log.level) + '20' }]}
                        >
                          {log.level}
                        </Chip>
                        <Text style={styles.logCategory}>{log.category}</Text>
                        <Text style={styles.logTime}>
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </Text>
                      </View>
                      <Text style={styles.logMessage}>{log.message}</Text>
                      {log.data && (
                        <Text style={styles.logData}>
                          {JSON.stringify(log.data, null, 2)}
                        </Text>
                      )}
                    </View>
                  ))
                )}
              </ScrollView>
            </View>

            {/* Recent Errors */}
            {summary && summary.recentErrors.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('import.debug.recentErrors')}</Text>
                {summary.recentErrors.map((error, index) => (
                  <View key={index} style={styles.errorItem}>
                    <Text style={styles.errorCategory}>{error.category}</Text>
                    <Text style={styles.errorMessage}>{error.message}</Text>
                    <Text style={styles.errorTime}>
                      {new Date(error.timestamp).toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Card.Content>

          <Card.Actions>
            <Button onPress={handleClearLogs} icon="delete">
              {t('import.debug.clearLogs')}
            </Button>
            <Button onPress={handleExportLogs} icon="export">
              {t('import.debug.export')}
            </Button>
            <Button onPress={loadDebugData} icon="refresh" loading={loading}>
              {t('import.debug.refresh')}
            </Button>
          </Card.Actions>
        </Card>
      </Modal>
    </Portal>
  );
}

function StatCard({ label, value, color }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, color && { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  modal: {
    marginHorizontal: 20,
    maxHeight: '90%',
  },
  card: {
    maxHeight: '100%',
  },
  debugToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  toggleSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  divider: {
    marginVertical: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    marginRight: 4,
    marginBottom: 4,
  },
  logsList: {
    maxHeight: 300,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 8,
  },
  logItem: {
    backgroundColor: '#FFF',
    padding: 8,
    marginBottom: 8,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  logLevelChip: {
    height: 20,
    marginRight: 8,
  },
  logCategory: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  logTime: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  logMessage: {
    fontSize: 12,
    color: theme.colors.text,
    marginTop: 4,
  },
  logData: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontFamily: 'monospace',
    marginTop: 4,
    backgroundColor: '#F5F5F5',
    padding: 4,
    borderRadius: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    padding: 20,
  },
  errorItem: {
    backgroundColor: theme.colors.error + '10',
    padding: 8,
    marginBottom: 8,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.error,
  },
  errorCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.error,
  },
  errorMessage: {
    fontSize: 12,
    marginTop: 2,
  },
  errorTime: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
