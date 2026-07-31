/**
 * Leaderboard Screen
 * Redesigned rankings with timeframe filters and user position
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
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { RefreshCw, Trophy, TrendingUp, Flame } from 'lucide-react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Button } from '../../src/components/ui/Button';
import { api } from '../../src/lib/api';
import { hexToRgba } from '../../src/lib/theme';
import type { LeaderboardEntry as LeaderboardEntryType } from '../../src/types';

// New leaderboard components
import {
  TimeframeTabs,
  LeaderboardEntry,
  UserPosition,
  type Timeframe,
} from '../../src/components/leaderboard';

type SortBy = 'points' | 'streak';

export default function LeaderboardScreen() {
  const { user, stats } = useAuth();
  const { theme, isDark } = useTheme();
  const colors = theme.colors;

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntryType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('all');
  const [sortBy, setSortBy] = useState<SortBy>('points');
  const [userRank, setUserRank] = useState<number | null>(null);

  const fetchLeaderboard = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      // Map timeframe to API format
      const apiTimeframe = timeframe === 'all' ? 'allTime' : timeframe;
      const data = await api.getLeaderboard({
        limit: 50,
        timeframe: apiTimeframe,
        sortBy,
      });
      setLeaderboard(data);

      // Find user's rank if they're in the list
      if (user) {
        const userIndex = data.findIndex((e: LeaderboardEntryType) => e.user.id === user.id);
        setUserRank(userIndex >= 0 ? userIndex + 1 : null);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [timeframe, sortBy, user]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchLeaderboard(true);
  };

  const handleTimeframeChange = (value: Timeframe) => {
    setTimeframe(value);
  };

  const handleSortChange = (value: SortBy) => {
    Haptics.selectionAsync();
    setSortBy(value);
  };

  const renderItem = ({ item, index }: { item: LeaderboardEntryType; index: number }) => (
    <LeaderboardEntry
      rank={index + 1}
      username={item.user.username}
      level={item.level || 1}
      wins={item.wins || 0}
      points={item.points}
      streak={item.streak || 0}
      avatarColorIndex={item.user.avatarColorIndex}
      avatarInitials={item.user.avatarCustomInitials}
      isCurrentUser={user?.id === item.user.id}
      animationDelay={index * 30}
    />
  );

  const renderEmpty = () => {
    if (isLoading) return null;

    return (
      <Animated.View entering={FadeIn.duration(300)} style={styles.emptyContainer}>
        <Trophy size={64} color={colors.mutedForeground} strokeWidth={1.5} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Rankings Yet</Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Be the first to play and claim the top spot!
        </Text>
      </Animated.View>
    );
  };

  const userInList = user && leaderboard.find(e => e.user.id === user.id);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Filters Header */}
      <View style={[styles.filtersContainer, { borderBottomColor: colors.border }]}>
        {/* Timeframe Tabs */}
        <TimeframeTabs selected={timeframe} onSelect={handleTimeframeChange} />

        {/* Sort Toggle */}
        <View style={styles.sortContainer}>
          <Text style={[styles.sortLabel, { color: colors.mutedForeground }]}>Sort by:</Text>
          <View style={[styles.sortButtons, { backgroundColor: hexToRgba(colors.foreground, 0.05) }]}>
            <Pressable
              style={[
                styles.sortButton,
                sortBy === 'points' && [
                  styles.sortButtonActive,
                  { backgroundColor: colors.primary },
                ],
              ]}
              onPress={() => handleSortChange('points')}
            >
              <TrendingUp
                size={14}
                color={sortBy === 'points' ? colors.primaryForeground : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.sortButtonText,
                  {
                    color: sortBy === 'points' ? colors.primaryForeground : colors.mutedForeground,
                  },
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
                  { backgroundColor: colors.primary },
                ],
              ]}
              onPress={() => handleSortChange('streak')}
            >
              <Flame
                size={14}
                color={sortBy === 'streak' ? colors.primaryForeground : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.sortButtonText,
                  {
                    color: sortBy === 'streak' ? colors.primaryForeground : colors.mutedForeground,
                  },
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
        <Animated.View entering={FadeIn.duration(300)} style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          <Button
            variant="outline"
            size="sm"
            onPress={() => fetchLeaderboard()}
            icon={<RefreshCw size={14} color={colors.foreground} />}
          >
            Try Again
          </Button>
        </Animated.View>
      )}

      {/* Loading State */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading rankings...
          </Text>
        </View>
      )}

      {/* Leaderboard List */}
      {!isLoading && !error && (
        <FlatList
          data={leaderboard}
          renderItem={renderItem}
          keyExtractor={(item) => item.user.id}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            leaderboard.length === 0 && styles.listContentEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* User Position - Sticky at bottom if user is in list */}
      {user && !isLoading && leaderboard.length > 0 && userInList && userRank && (
        <UserPosition
          rank={userRank}
          username={user.username}
          points={stats?.points || 0}
          streak={stats?.streak || 0}
          avatarColorIndex={user.avatarColorIndex}
          avatarInitials={user.avatarCustomInitials}
        />
      )}

      {/* Not Ranked Banner */}
      {user && !isLoading && leaderboard.length > 0 && !userInList && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={[
            styles.notRankedBanner,
            {
              backgroundColor: hexToRgba(colors.warning, 0.1),
              borderTopColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.notRankedText, { color: colors.warning }]}>
            You're not ranked yet in this timeframe. Play more to appear!
          </Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sortLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  sortButtons: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  sortButtonActive: {},
  sortButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  listContentEmpty: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  notRankedBanner: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  notRankedText: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
});
