/**
 * Run an async operation while toggling a boolean loading flag.
 * Kept at module scope so React Compiler does not see try/finally inside components.
 */
export async function withLoadingFlag<T = void>(
  setLoading: (value: boolean) => void,
  operation: () => Promise<T>
): Promise<T> {
  setLoading(true);
  try {
    return await operation();
  } finally {
    setLoading(false);
  }
}
