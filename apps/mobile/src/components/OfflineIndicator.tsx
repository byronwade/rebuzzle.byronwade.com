/**
 * OfflineIndicator Component
 * Banner shown when device is offline with pending sync count
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useOffline } from '../contexts/OfflineContext';
import { useTheme } from '../contexts/ThemeContext';
import { hexToRgba } from '../lib/theme';

interface OfflineIndicatorProps {
  /** Whether to show in compact mode */
  compact?: boolean;
}

export function OfflineIndicator({ compact = false }: OfflineIndicatorProps) {
  const { isOnline, isSyncing, pendingCount, syncPendingData } = useOffline();
  const { theme } = useTheme();
  const colors = theme.colors;

  // Don't show if online and no pending items
  if (isOnline && pendingCount === 0) {
    return null;
  }

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {!isOnline && (
          <View style={[styles.compactBadge, { backgroundColor: hexToRgba(colors.destructive, 0.15) }]}>
            <Text style={styles.compactIcon}>📴</Text>
            <Text style={[styles.compactText, { color: colors.mutedForeground }]}>Offline</Text>
          </View>
        )}
        {pendingCount > 0 && (
          <View style={[styles.compactBadge, { backgroundColor: hexToRgba(colors.accent, 0.15) }]}>
            <Text style={[styles.compactText, { color: colors.mutedForeground }]}>{pendingCount} pending</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isOnline
            ? hexToRgba(colors.accent, 0.1)
            : hexToRgba(colors.destructive, 0.15),
          borderBottomColor: isOnline
            ? hexToRgba(colors.accent, 0.3)
            : hexToRgba(colors.destructive, 0.3),
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.icon}>{isOnline ? '🔄' : '📴'}</Text>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {isOnline ? 'Syncing...' : 'You\'re Offline'}
          </Text>
          {!isOnline && (
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {pendingCount > 0
                ? `${pendingCount} item${pendingCount > 1 ? 's' : ''} will sync when online`
                : 'Playing in offline mode'}
            </Text>
          )}
          {isOnline && pendingCount > 0 && (
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Syncing {pendingCount} item{pendingCount > 1 ? 's' : ''}...
            </Text>
          )}
        </View>
      </View>

      {isSyncing && (
        <ActivityIndicator color={colors.accent} size="small" />
      )}

      {isOnline && pendingCount > 0 && !isSyncing && (
        <Pressable
          style={[
            styles.syncButton,
            {
              backgroundColor: hexToRgba(colors.accent, 0.2),
              borderColor: hexToRgba(colors.accent, 0.4),
            },
          ]}
          onPress={syncPendingData}
        >
          <Text style={[styles.syncButtonText, { color: colors.accent }]}>Sync Now</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  syncButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  syncButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  compactIcon: {
    fontSize: 12,
  },
  compactText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
