/**
 * Offline Context
 * Manages network state and offline sync queue
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { api } from '../lib/api';
import {
  getPendingAttempts,
  markAttemptSynced,
  updateLastSyncTime,
  getLastSyncTime,
  cachePuzzle,
  getCachedPuzzle,
} from '../lib/offline-storage';
import type { PendingAttempt, CachedPuzzle } from '../types';

interface OfflineContextType {
  /** Whether device is currently online */
  isOnline: boolean;
  /** Whether sync is in progress */
  isSyncing: boolean;
  /** Number of items waiting to sync */
  pendingCount: number;
  /** Last successful sync timestamp */
  lastSyncTime: string | null;
  /** Manually trigger sync of pending data */
  syncPendingData: () => Promise<void>;
  /** Get cached puzzle for offline play */
  getCachedPuzzleData: () => Promise<CachedPuzzle | null>;
  /** Cache a puzzle for offline play */
  cachePuzzleData: (puzzle: CachedPuzzle) => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

interface OfflineProviderProps {
  children: ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  /**
   * Sync all pending attempts to server
   */
  const syncPendingData = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      const pending = await getPendingAttempts();

      if (pending.length === 0) {
        setIsSyncing(false);
        return;
      }

      let syncedCount = 0;
      for (const attempt of pending) {
        try {
          // Remove the local-specific fields before sending
          const { localId, createdAt, syncedToServer, ...attemptData } = attempt;
          const result = await api.recordAttempt(attemptData);

          if (result.success) {
            await markAttemptSynced(localId);
            syncedCount++;
          }
        } catch (err) {
          console.error('Failed to sync attempt:', attempt.localId, err);
          // Continue with other attempts even if one fails
        }
      }

      if (syncedCount > 0) {
        await updateLastSyncTime();
        setLastSyncTime(new Date().toISOString());
      }

      // Update pending count
      const remaining = await getPendingAttempts();
      setPendingCount(remaining.length);
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing]);

  /**
   * Get cached puzzle
   */
  const getCachedPuzzleData = useCallback(async (): Promise<CachedPuzzle | null> => {
    return getCachedPuzzle();
  }, []);

  /**
   * Cache puzzle for offline
   */
  const cachePuzzleData = useCallback(async (puzzle: CachedPuzzle): Promise<void> => {
    await cachePuzzle(puzzle);
  }, []);

  /**
   * Handle network state changes
   */
  const handleNetworkChange = useCallback(
    (state: NetInfoState) => {
      const wasOffline = !isOnline;
      const nowOnline = state.isConnected ?? true;

      setIsOnline(nowOnline);

      // If we just came online and have pending data, sync it
      if (wasOffline && nowOnline) {
        syncPendingData();
      }
    },
    [isOnline, syncPendingData]
  );

  // Monitor network state
  useEffect(() => {
    // Get initial state
    NetInfo.fetch().then((state) => {
      setIsOnline(state.isConnected ?? true);
    });

    // Subscribe to changes
    const unsubscribe = NetInfo.addEventListener(handleNetworkChange);

    // Load initial pending count and last sync time
    getLastSyncTime().then(setLastSyncTime);
    getPendingAttempts().then((attempts) => setPendingCount(attempts.length));

    return () => {
      unsubscribe();
    };
  }, [handleNetworkChange]);

  // Auto-sync when coming online with pending items
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncing) {
      syncPendingData();
    }
  }, [isOnline, pendingCount, isSyncing, syncPendingData]);

  const value: OfflineContextType = {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    syncPendingData,
    getCachedPuzzleData,
    cachePuzzleData,
  };

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

/**
 * Hook to use offline context
 */
export function useOffline(): OfflineContextType {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}
