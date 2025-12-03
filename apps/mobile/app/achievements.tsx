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
import { AchievementBadge } from '../src/components/AchievementBadge';
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

  const renderAchievementItem = ({ item }: { item: Achievement }) => (
    <Pressable style={styles.achievementCard}>
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
        <Text style={[styles.achievementName, !item.unlocked && styles.lockedText]}>
          {item.unlocked || !item.secret ? item.name : '???'}
        </Text>
        <Text style={[styles.achievementDescription, !item.unlocked && styles.lockedText]}>
          {item.unlocked || !item.secret ? item.description : 'Complete to reveal'}
        </Text>
        {!item.unlocked && !item.secret && item.hint && (
          <Text style={styles.achievementHint}>Hint: {item.hint}</Text>
        )}
        <View style={styles.achievementMeta}>
          <Text style={[styles.rarityLabel, { color: getRarityColor(item.rarity) }]}>
            {item.rarity.toUpperCase()}
          </Text>
          <Text style={styles.pointsLabel}>{item.points} pts</Text>
        </View>
      </View>
      {item.unlocked && item.unlockedAt && (
        <View style={styles.unlockedBadge}>
          <Text style={styles.unlockedText}>✓</Text>
        </View>
      )}
    </Pressable>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Progress Bar */}
      {progress && (
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Your Progress</Text>
            <Text style={styles.progressPercentage}>
              {Math.round((progress.unlocked / progress.total) * 100)}%
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(progress.unlocked / progress.total) * 100}%` },
              ]}
            />
          </View>
          <View style={styles.progressStats}>
            <Text style={styles.progressStat}>
              {progress.unlocked}/{progress.total} Unlocked
            </Text>
            <Text style={styles.progressStat}>
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
            selectedCategory === 'all' && styles.categoryTabActive,
          ]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text
            style={[
              styles.categoryTabText,
              selectedCategory === 'all' && styles.categoryTabTextActive,
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
                selectedCategory === cat && styles.categoryTabActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryTabText,
                  selectedCategory === cat && styles.categoryTabTextActive,
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
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#facc15" />
          <Text style={styles.loadingText}>Loading achievements...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && achievements.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>😕</Text>
          <Text style={styles.errorTitle}>Couldn't Load Achievements</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => loadAchievements()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
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
            tintColor="#facc15"
            colors={['#facc15']}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No achievements in this category
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'common':
      return '#9ca3af';
    case 'uncommon':
      return '#22c55e';
    case 'rare':
      return '#3b82f6';
    case 'epic':
      return '#8b5cf6';
    case 'legendary':
      return '#facc15';
    default:
      return '#9ca3af';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#94a3b8',
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
    color: '#fff',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.3)',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#facc15',
  },
  listContent: {
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 16,
  },
  progressCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
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
    color: '#facc15',
  },
  progressPercentage: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#facc15',
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStat: {
    fontSize: 12,
    color: '#94a3b8',
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
  },
  categoryTabActive: {
    backgroundColor: '#facc15',
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94a3b8',
  },
  categoryTabTextActive: {
    color: '#1a1a2e',
  },
  achievementCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
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
    color: '#fff',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 6,
    lineHeight: 18,
  },
  achievementHint: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  lockedText: {
    color: '#64748b',
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
    color: '#64748b',
    fontWeight: '500',
  },
  unlockedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unlockedText: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
  },
});
