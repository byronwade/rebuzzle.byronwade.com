/** Throw without placing a ThrowStatement inside React components (React Compiler). */
export function fail(message: string): never {
  throw new Error(message);
}
