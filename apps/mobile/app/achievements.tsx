/**
 * Achievements Screen
 * Shows all achievements with progress, categories, and filtering
 */

import { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAchievements } from '../src/contexts/AchievementsContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { AchievementBadge } from '../src/components/AchievementBadge';
import { hexToRgba } from '../src/lib/theme';
import type { Achievement, AchievementCategory } from '../src/types';

const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  beginner: 'Beginner',
  solving: 'Solving',
  speed: 'Speed',
  streaks: 'Streaks',
  mastery: 'Mastery',
  social: 'Social',
  explorer: 'Explorer',
  collector: 'Collector',
  elite: 'Elite',
  legendary: 'Legendary',
};

const CATEGORY_ORDER: AchievementCategory[] = [
  'beginner',
  'solving',
  'speed',
  'streaks',
  'mastery',
  'social',
  'explorer',
  'collector',
  'elite',
  'legendary',
];

export default function AchievementsScreen() {
  const {
    achievements,
    progress,
    categories,
    isLoading,
    error,
    loadAchievements,
  } = useAchievements();

  const { theme } = useTheme();
  const colors = theme.colors;

  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter achievements by category
  const filteredAchievements = useMemo(() => {
    if (selectedCategory === 'all') {
      return achievements;
    }
    return achievements.filter((a) => a.category === selectedCategory);
  }, [achievements, selectedCategory]);

  // Group achievements: unlocked first, then by rarity
  const sortedAchievements = useMemo(() => {
    return [...filteredAchievements].sort((a, b) => {
      // Unlocked first
      if (a.unlocked !== b.unlocked) {
        return a.unlocked ? -1 : 1;
      }
      // Then by order
      return a.order - b.order;
    });
  }, [filteredAchievements]);

  // Get category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, { total: number; unlocked: number }> = {
      all: { total: achievements.length, unlocked: achievements.filter((a) => a.unlocked).length },
    };

    CATEGORY_ORDER.forEach((cat) => {
      const catAchievements = achievements.filter((a) => a.category === cat);
      counts[cat] = {
        total: catAchievements.length,
        unlocked: catAchievements.filter((a) => a.unlocked).length,
      };
    });

    return counts;
  }, [achievements]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAchievements();
    setIsRefreshing(false);
  };

  const getRarityColor = (rarity: string): string => {
    switch (rarity) {
      case 'common':
        return colors.mutedForeground;
      case 'uncommon':
        return colors.success;
      case 'rare':
        return '#3b82f6';
      case 'epic':
        return '#8b5cf6';
      case 'legendary':
        return colors.accent;
      default:
        return colors.mutedForeground;
    }
  };

  const renderAchievementItem = ({ item }: { item: Achievement }) => (
    <Pressable style={[styles.achievementCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.achievementLeft}>
        <AchievementBadge
          icon={item.icon}
          name={item.name}
          rarity={item.rarity}
          unlocked={item.unlocked}
          secret={item.secret}
          size="medium"
        />
      </View>
      <View style={styles.achievementInfo}>
        <Text
          style={[
            styles.achievementName,
            { color: item.unlocked ? colors.cardForeground : colors.mutedForeground },
          ]}
        >
          {item.unlocked || !item.secret ? item.name : '???'}
        </Text>
        <Text
          style={[
            styles.achievementDescription,
            { color: item.unlocked ? colors.mutedForeground : colors.mutedForeground },
          ]}
        >
          {item.unlocked || !item.secret ? item.description : 'Complete to reveal'}
        </Text>
        {!item.unlocked && !item.secret && item.hint && (
          <Text style={[styles.achievementHint, { color: colors.mutedForeground }]}>
            Hint: {item.hint}
          </Text>
        )}
        <View style={styles.achievementMeta}>
          <Text style={[styles.rarityLabel, { color: getRarityColor(item.rarity) }]}>
            {item.rarity.toUpperCase()}
          </Text>
          <Text style={[styles.pointsLabel, { color: colors.mutedForeground }]}>{item.points} pts</Text>
        </View>
      </View>
      {item.unlocked && item.unlockedAt && (
        <View style={[styles.unlockedBadge, { backgroundColor: hexToRgba(colors.success, 0.2) }]}>
          <Text style={[styles.unlockedText, { color: colors.success }]}>✓</Text>
        </View>
      )}
    </Pressable>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Progress Bar */}
      {progress && (
        <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: colors.accent }]}>Your Progress</Text>
            <Text style={[styles.progressPercentage, { color: colors.foreground }]}>
              {Math.round((progress.unlocked / progress.total) * 100)}%
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${(progress.unlocked / progress.total) * 100}%`, backgroundColor: colors.accent },
              ]}
            />
          </View>
          <View style={styles.progressStats}>
            <Text style={[styles.progressStat, { color: colors.mutedForeground }]}>
              {progress.unlocked}/{progress.total} Unlocked
            </Text>
            <Text style={[styles.progressStat, { color: colors.mutedForeground }]}>
              {progress.earnedPoints}/{progress.totalPoints} Points
            </Text>
          </View>
        </View>
      )}

      {/* Category Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContent}
      >
        <Pressable
          style={[
            styles.categoryTab,
            { backgroundColor: colors.secondary },
            selectedCategory === 'all' && { backgroundColor: colors.accent },
          ]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text
            style={[
              styles.categoryTabText,
              { color: colors.mutedForeground },
              selectedCategory === 'all' && { color: colors.accentForeground },
            ]}
          >
            All ({categoryCounts.all.unlocked}/{categoryCounts.all.total})
          </Text>
        </Pressable>

        {CATEGORY_ORDER.map((cat) => {
          if (!categoryCounts[cat] || categoryCounts[cat].total === 0) return null;

          return (
            <Pressable
              key={cat}
              style={[
                styles.categoryTab,
                { backgroundColor: colors.secondary },
                selectedCategory === cat && { backgroundColor: colors.accent },
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryTabText,
                  { color: colors.mutedForeground },
                  selectedCategory === cat && { color: colors.accentForeground },
                ]}
              >
                {CATEGORY_LABELS[cat]} ({categoryCounts[cat].unlocked}/{categoryCounts[cat].total})
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  if (isLoading && achievements.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading achievements...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && achievements.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>😕</Text>
          <Text style={[styles.errorTitle, { color: colors.foreground }]}>Couldn't Load Achievements</Text>
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>{error}</Text>
          <Pressable
            style={[
              styles.retryButton,
              {
                backgroundColor: hexToRgba(colors.accent, 0.15),
                borderColor: hexToRgba(colors.accent, 0.3),
              },
            ]}
            onPress={() => loadAchievements()}
          >
            <Text style={[styles.retryButtonText, { color: colors.accent }]}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <FlatList
        data={sortedAchievements}
        renderItem={renderAchievementItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
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
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No achievements in this category
            </Text>
          </View>
        }
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
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 24,
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
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 16,
  },
  progressCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressPercentage: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStat: {
    fontSize: 12,
  },
  categoryScroll: {
    marginBottom: 16,
  },
  categoryContent: {
    gap: 8,
    paddingVertical: 4,
  },
  categoryTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  achievementCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  achievementLeft: {
    marginRight: 14,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 13,
    marginBottom: 6,
    lineHeight: 18,
  },
  achievementHint: {
    fontSize: 11,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  achievementMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rarityLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  pointsLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  unlockedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unlockedText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
