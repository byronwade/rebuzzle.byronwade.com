/**
 * Toast Context
 * Global toast notification system matching Sonner styling
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Check, X, AlertTriangle, Info } from 'lucide-react-native';
import { useTheme } from './ThemeContext';
import { hexToRgba } from '../lib/theme';

type ToastType = 'success' | 'error' | 'info' | 'warning';
type ToastPosition = 'top' | 'bottom';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastContextType {
  toast: (options: Omit<Toast, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
  position?: ToastPosition;
  maxToasts?: number;
}

export function ToastProvider({
  children,
  position = 'top',
  maxToasts = 3,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const addToast = useCallback((options: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const duration = options.duration ?? 4000;

    // Haptic feedback based on type
    switch (options.type) {
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'error':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      default:
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setToasts((prev) => {
      const newToasts = [...prev, { ...options, id }];
      return newToasts.slice(-maxToasts);
    });

    if (duration > 0) {
      setTimeout(() => {
        dismiss(id);
      }, duration);
    }
  }, [maxToasts]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const toast = useCallback((options: Omit<Toast, 'id'>) => {
    addToast(options);
  }, [addToast]);

  const success = useCallback((title: string, description?: string) => {
    addToast({ type: 'success', title, description });
  }, [addToast]);

  const error = useCallback((title: string, description?: string) => {
    addToast({ type: 'error', title, description });
  }, [addToast]);

  const info = useCallback((title: string, description?: string) => {
    addToast({ type: 'info', title, description });
  }, [addToast]);

  const warning = useCallback((title: string, description?: string) => {
    addToast({ type: 'warning', title, description });
  }, [addToast]);

  const value = {
    toast,
    success,
    error,
    info,
    warning,
    dismiss,
    dismissAll,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View
        style={[
          styles.container,
          position === 'top'
            ? { top: insets.top + 8 }
            : { bottom: insets.bottom + 80 }, // Account for tab bar
        ]}
        pointerEvents="box-none"
      >
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            toast={t}
            onDismiss={() => dismiss(t.id)}
            position={position}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: () => void;
  position: ToastPosition;
}

function ToastItem({ toast, onDismiss, position }: ToastItemProps) {
  const { theme, isDark } = useTheme();
  const colors = theme.colors;
  const translateY = useRef(new Animated.Value(position === 'top' ? -100 : 100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 15,
        stiffness: 200,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: position === 'top' ? -100 : 100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  };

  const getTypeStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          borderColor: hexToRgba(colors.success, 0.3),
          iconColor: colors.success,
          Icon: Check,
        };
      case 'error':
        return {
          borderColor: hexToRgba(colors.destructive, 0.3),
          iconColor: colors.destructive,
          Icon: X,
        };
      case 'warning':
        return {
          borderColor: hexToRgba(colors.warning, 0.3),
          iconColor: colors.warning,
          Icon: AlertTriangle,
        };
      case 'info':
      default:
        return {
          borderColor: hexToRgba(colors.foreground, 0.2),
          iconColor: colors.foreground,
          Icon: Info,
        };
    }
  };

  const typeStyles = getTypeStyles();
  const IconComponent = typeStyles.Icon;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: colors.card,
          borderColor: typeStyles.borderColor,
          transform: [{ translateY }],
          opacity,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDark ? 0.3 : 0.1,
              shadowRadius: 12,
            },
            android: {
              elevation: 8,
            },
          }),
        },
      ]}
    >
      <TouchableOpacity
        style={styles.toastContent}
        onPress={handleDismiss}
        activeOpacity={0.8}
      >
        <View style={[styles.iconContainer, { backgroundColor: hexToRgba(typeStyles.iconColor, 0.15) }]}>
          <IconComponent size={16} color={typeStyles.iconColor} strokeWidth={2.5} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.foreground }]}>{toast.title}</Text>
          {toast.description && (
            <Text style={[styles.description, { color: colors.mutedForeground }]}>
              {toast.description}
            </Text>
          )}
        </View>
        {toast.action && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: hexToRgba(colors.primary, 0.1) }]}
            onPress={() => {
              toast.action?.onPress();
              handleDismiss();
            }}
          >
            <Text style={[styles.actionText, { color: colors.primary }]}>{toast.action.label}</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    marginTop: 2,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default ToastProvider;
