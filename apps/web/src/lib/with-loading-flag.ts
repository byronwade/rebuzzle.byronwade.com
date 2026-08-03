/**
 * Run an async operation while toggling a boolean loading flag.
 * Kept at module scope so React Compiler does not see try/finally inside components.
 */
export async function withLoadingFlag(
  setLoading: (value: boolean) => void,
  operation: () => Promise<void>
): Promise<void> {
  setLoading(true);
  try {
    await operation();
  } finally {
    setLoading(false);
  }
}

/**
 * Run an async operation, always running cleanup afterward (no try/finally in callers).
 */
export async function withCleanup(
  cleanup: () => void,
  operation: () => Promise<void>
): Promise<void> {
  try {
    await operation();
  } finally {
    cleanup();
  }
}
