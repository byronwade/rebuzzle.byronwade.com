/**
 * Leaderboard Screen
 * Shows rankings with timeframe and sort filters
 */

import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { LeaderboardItem } from '../../src/components/LeaderboardItem';
import { api } from '../../src/lib/api';
import { hexToRgba } from '../../src/lib/theme';
import type { LeaderboardEntry } from '../../src/types';

type Timeframe = 'today' | 'week' | 'month' | 'allTime';
type SortBy = 'points' | 'streak';

const TIMEFRAME_OPTIONS: { value: Timeframe; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'allTime', label: 'All Time' },
];

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const colors = theme.colors;

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('allTime');
  const [sortBy, setSortBy] = useState<SortBy>('points');

  const fetchLeaderboard = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await api.getLeaderboard({
        limit: 50,
        timeframe,
        sortBy,
      });
      setLeaderboard(data);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [timeframe, sortBy]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchLeaderboard(true);
  };

  const handleTimeframeChange = (value: Timeframe) => {
    Haptics.selectionAsync();
    setTimeframe(value);
  };

  const handleSortChange = (value: SortBy) => {
    Haptics.selectionAsync();
    setSortBy(value);
  };

  const renderItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => (
    <LeaderboardItem
      entry={item}
      rank={index + 1}
      isCurrentUser={user?.id === item.user.id}
      sortBy={sortBy}
      style={styles.listItem}
    />
  );

  const renderEmpty = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🏆</Text>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Rankings Yet</Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Be the first to play and claim the top spot!
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Filters */}
      <View
        style={[
          styles.filters,
          {
            borderBottomColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
      >
        {/* Segmented Control for Timeframe */}
        <View
          style={[
            styles.segmentedControl,
            {
              backgroundColor: colors.muted,
              ...Platform.select({
                ios: {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.2 : 0.05,
                  shadowRadius: 2,
                },
                android: {
                  elevation: 1,
                },
              }),
            },
          ]}
        >
          {TIMEFRAME_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.segmentButton,
                timeframe === option.value && [
                  styles.segmentButtonActive,
                  {
                    backgroundColor: colors.card,
                    ...Platform.select({
                      ios: {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                      },
                      android: {
                        elevation: 2,
                      },
                    }),
                  },
                ],
              ]}
              onPress={() => handleTimeframeChange(option.value)}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: colors.mutedForeground },
                  timeframe === option.value && { color: colors.foreground, fontWeight: '600' },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Sort Toggle */}
        <View style={styles.sortToggle}>
          <Text style={[styles.sortLabel, { color: colors.mutedForeground }]}>Sort by:</Text>
          <View style={[styles.sortButtons, { backgroundColor: colors.muted }]}>
            <Pressable
              style={[
                styles.sortButton,
                sortBy === 'points' && [
                  styles.sortButtonActive,
                  { backgroundColor: hexToRgba(colors.accent, 0.2) },
                ],
              ]}
              onPress={() => handleSortChange('points')}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  { color: colors.mutedForeground },
                  sortBy === 'points' && { color: colors.accent, fontWeight: '600' },
                ]}
              >
                Points
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.sortButton,
                sortBy === 'streak' && [
                  styles.sortButtonActive,
                  { backgroundColor: hexToRgba(colors.accent, 0.2) },
                ],
              ]}
              onPress={() => handleSortChange('streak')}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  { color: colors.mutedForeground },
                  sortBy === 'streak' && { color: colors.accent, fontWeight: '600' },
                ]}
              >
                Streak
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Error State */}
      {error && !isLoading && (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          <Pressable
            style={[
              styles.retryButton,
              {
                backgroundColor: hexToRgba(colors.accent, 0.15),
                borderColor: hexToRgba(colors.accent, 0.3),
              },
            ]}
            onPress={() => fetchLeaderboard()}
          >
            <Text style={[styles.retryButtonText, { color: colors.accent }]}>Try Again</Text>
          </Pressable>
        </View>
      )}

      {/* Loading State */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      )}

      {/* Leaderboard List */}
      {!isLoading && !error && (
        <FlatList
          data={leaderboard}
          renderItem={renderItem}
          keyExtractor={(item) => item.user.id}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* User's Position (if not in visible list) */}
      {user && !isLoading && leaderboard.length > 0 && !leaderboard.find(e => e.user.id === user.id) && (
        <View
          style={[
            styles.userPositionBanner,
            {
              backgroundColor: hexToRgba(colors.accent, 0.1),
              borderTopColor: hexToRgba(colors.accent, 0.2),
            },
          ]}
        >
          <Text style={[styles.userPositionText, { color: colors.accent }]}>
            You're not ranked yet in this timeframe
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filters: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 2,
    marginBottom: 12,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentButtonActive: {
    borderRadius: 8,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sortToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sortLabel: {
    fontSize: 13,
  },
  sortButtons: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
  },
  sortButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  sortButtonActive: {},
  sortButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  listItem: {
    marginBottom: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  userPositionBanner: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  userPositionText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
