export function AuthCheck() {
  try {
    // Authentication disabled - always return unauthenticated state
    return {
      userId: null,
      user: null,
      isAuthenticated: false,
      mode: "disabled",
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("AuthCheck error:", error);
    return {
      userId: null,
      user: null,
      isAuthenticated: false,
      mode: "disabled",
    };
  }
}
