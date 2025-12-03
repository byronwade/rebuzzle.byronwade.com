/**
 * Achievements Screen
 * Redesigned achievements view with filtering and progress display
 */

import { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Trophy, Star, RefreshCw, Award } from 'lucide-react-native';
import { useAchievements } from '../src/contexts/AchievementsContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { Button } from '../src/components/ui/Button';
import { hexToRgba } from '../src/lib/theme';
import type { Achievement, AchievementCategory as AchievementCategoryType } from '../src/types';

// Achievement components
import {
  AchievementCard,
  CategoryTabs,
  RarityFilter,
  type AchievementCategory,
  type AchievementRarity,
} from '../src/components/achievements';

// Map existing category types to new simplified categories
function mapCategory(category: AchievementCategoryType): AchievementCategory {
  switch (category) {
    case 'beginner':
    case 'solving':
    case 'mastery':
      return 'mastery';
    case 'speed':
      return 'speed';
    case 'streaks':
      return 'streak';
    case 'social':
      return 'social';
    case 'explorer':
    case 'collector':
    case 'elite':
    case 'legendary':
      return 'special';
    default:
      return 'all';
  }
}

export default function AchievementsScreen() {
  const {
    achievements,
    progress,
    isLoading,
    error,
    loadAchievements,
  } = useAchievements();

  const { theme, isDark } = useTheme();
  const colors = theme.colors;

  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory>('all');
  const [selectedRarity, setSelectedRarity] = useState<AchievementRarity | 'all'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calculate category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<AchievementCategory, number> = {
      all: achievements.length,
      mastery: 0,
      speed: 0,
      streak: 0,
      social: 0,
      special: 0,
    };

    achievements.forEach((a) => {
      const cat = mapCategory(a.category);
      if (cat !== 'all') {
        counts[cat]++;
      }
    });

    return counts;
  }, [achievements]);

  // Filter achievements
  const filteredAchievements = useMemo(() => {
    let filtered = achievements;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((a) => mapCategory(a.category) === selectedCategory);
    }

    // Filter by rarity
    if (selectedRarity !== 'all') {
      filtered = filtered.filter((a) => a.rarity === selectedRarity);
    }

    // Sort: unlocked first, then by order
    return [...filtered].sort((a, b) => {
      if (a.unlocked !== b.unlocked) {
        return a.unlocked ? -1 : 1;
      }
      return a.order - b.order;
    });
  }, [achievements, selectedCategory, selectedRarity]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAchievements();
    setIsRefreshing(false);
  };

  const renderAchievementItem = ({ item, index }: { item: Achievement; index: number }) => (
    <AchievementCard
      id={item.id}
      name={item.name}
      description={item.description}
      icon={item.icon}
      points={item.points}
      rarity={item.rarity as AchievementRarity}
      isUnlocked={item.unlocked}
      unlockedAt={item.unlockedAt ? new Date(item.unlockedAt) : undefined}
      animationDelay={index * 30}
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Progress Card */}
      {progress && (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={[
            styles.progressCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.progressHeader}>
            <View style={styles.progressTitleRow}>
              <Award size={20} color={colors.primary} strokeWidth={2} />
              <Text style={[styles.progressTitle, { color: colors.foreground }]}>
                Your Progress
              </Text>
            </View>
            <Text style={[styles.progressPercentage, { color: colors.primary }]}>
              {Math.round((progress.unlocked / progress.total) * 100)}%
            </Text>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: hexToRgba(colors.foreground, 0.1) }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(progress.unlocked / progress.total) * 100}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>

          <View style={styles.progressStats}>
            <View style={styles.progressStatItem}>
              <Trophy size={14} color={colors.mutedForeground} />
              <Text style={[styles.progressStatValue, { color: colors.foreground }]}>
                {progress.unlocked}/{progress.total}
              </Text>
              <Text style={[styles.progressStatLabel, { color: colors.mutedForeground }]}>
                Unlocked
              </Text>
            </View>
            <View style={[styles.progressDivider, { backgroundColor: colors.border }]} />
            <View style={styles.progressStatItem}>
              <Star size={14} color={colors.mutedForeground} />
              <Text style={[styles.progressStatValue, { color: colors.foreground }]}>
                {progress.earnedPoints.toLocaleString()}
              </Text>
              <Text style={[styles.progressStatLabel, { color: colors.mutedForeground }]}>
                Points
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Category Tabs */}
      <CategoryTabs
        selected={selectedCategory}
        onSelect={setSelectedCategory}
        counts={categoryCounts}
      />

      {/* Rarity Filter */}
      <RarityFilter selected={selectedRarity} onSelect={setSelectedRarity} />
    </View>
  );

  const renderEmpty = () => (
    <Animated.View entering={FadeIn.duration(300)} style={styles.emptyContainer}>
      <Trophy size={56} color={colors.mutedForeground} strokeWidth={1.5} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Achievements</Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
        No achievements match your current filters
      </Text>
    </Animated.View>
  );

  if (isLoading && achievements.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <Stack.Screen
          options={{
            title: 'Achievements',
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.foreground,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading achievements...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && achievements.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <Stack.Screen
          options={{
            title: 'Achievements',
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.foreground,
          }}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>😕</Text>
          <Text style={[styles.errorTitle, { color: colors.foreground }]}>
            Couldn't Load Achievements
          </Text>
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>{error}</Text>
          <Button
            variant="outline"
            onPress={() => loadAchievements()}
            icon={<RefreshCw size={16} color={colors.foreground} />}
          >
            Try Again
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Achievements',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.foreground,
        }}
      />
      <FlatList
        data={filteredAchievements}
        renderItem={renderAchievementItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          filteredAchievements.length === 0 && styles.listContentEmpty,
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  errorEmoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  listContentEmpty: {
    flex: 1,
  },
  header: {
    marginBottom: 8,
  },
  progressCard: {
    borderRadius: 16,
    padding: 18,
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  progressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: '800',
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  progressStatValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressStatLabel: {
    fontSize: 12,
  },
  progressDivider: {
    width: 1,
    height: 24,
    marginHorizontal: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
