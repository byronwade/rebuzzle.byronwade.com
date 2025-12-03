/**
 * OfflineIndicator Component
 * Banner shown when device is offline with pending sync count
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useOffline } from '../contexts/OfflineContext';

interface OfflineIndicatorProps {
  /** Whether to show in compact mode */
  compact?: boolean;
}

export function OfflineIndicator({ compact = false }: OfflineIndicatorProps) {
  const { isOnline, isSyncing, pendingCount, syncPendingData } = useOffline();

  // Don't show if online and no pending items
  if (isOnline && pendingCount === 0) {
    return null;
  }

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {!isOnline && (
          <View style={styles.compactBadge}>
            <Text style={styles.compactIcon}>📴</Text>
            <Text style={styles.compactText}>Offline</Text>
          </View>
        )}
        {pendingCount > 0 && (
          <View style={[styles.compactBadge, styles.pendingBadge]}>
            <Text style={styles.compactText}>{pendingCount} pending</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, isOnline && styles.onlineWithPending]}>
      <View style={styles.content}>
        <Text style={styles.icon}>{isOnline ? '🔄' : '📴'}</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {isOnline ? 'Syncing...' : 'You\'re Offline'}
          </Text>
          {!isOnline && (
            <Text style={styles.subtitle}>
              {pendingCount > 0
                ? `${pendingCount} item${pendingCount > 1 ? 's' : ''} will sync when online`
                : 'Playing in offline mode'}
            </Text>
          )}
          {isOnline && pendingCount > 0 && (
            <Text style={styles.subtitle}>
              Syncing {pendingCount} item{pendingCount > 1 ? 's' : ''}...
            </Text>
          )}
        </View>
      </View>

      {isSyncing && (
        <ActivityIndicator color="#facc15" size="small" />
      )}

      {isOnline && pendingCount > 0 && !isSyncing && (
        <Pressable style={styles.syncButton} onPress={syncPendingData}>
          <Text style={styles.syncButtonText}>Sync Now</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  onlineWithPending: {
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
    borderBottomColor: 'rgba(250, 204, 21, 0.3)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 18,
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  syncButton: {
    backgroundColor: 'rgba(250, 204, 21, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.4)',
  },
  syncButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#facc15',
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  pendingBadge: {
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
  },
  compactIcon: {
    fontSize: 12,
  },
  compactText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
});
