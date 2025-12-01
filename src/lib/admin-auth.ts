/**
 * Admin Authentication Utilities
 *
 * Checks if a user is authorized to access admin features
 */

import { db } from "@/db";
import type { User } from "@/db/models";

/**
 * Get admin email from environment variable
 */
export function getAdminEmail(): string | null {
  return process.env.ADMIN_EMAIL || null;
}

/**
 * Check if an email is an admin email
 */
export function isAdminEmail(email: string): boolean {
  const adminEmail = getAdminEmail();
  if (!adminEmail) return false;

  // Support multiple admin emails (comma-separated)
  const adminEmails = adminEmail.split(",").map((e) => e.trim().toLowerCase());
  return adminEmails.includes(email.toLowerCase());
}

/**
 * Check if a user is an admin
 * Checks both database isAdmin field and ADMIN_EMAIL environment variable
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const user = await db.userOps.findById(userId);
    if (!user) return false;

    // Check database isAdmin field first
    if (user.isAdmin === true) {
      return true;
    }

    // Fallback to environment variable check
    return isAdminEmail(user.email);
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

/**
 * Verify admin access from request
 * Returns user if admin, null otherwise
 * Checks both database isAdmin field and ADMIN_EMAIL environment variable
 */
export async function verifyAdminAccess(
  request: Request
): Promise<User | null> {
  try {
    // Use existing auth middleware
    const { getAuthenticatedUser } = await import("./auth-middleware");
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      return null;
    }

    const user = await db.userOps.findById(authUser.userId);

    if (!user) {
      return null;
    }

    // Check database isAdmin field first
    if (user.isAdmin === true) {
      return user;
    }

    // Fallback to environment variable check
    if (!isAdminEmail(user.email)) {
      return null;
    }

    return user;
  } catch (error) {
    console.error("Error verifying admin access:", error);
    return null;
  }
}

/**
 * Middleware to require admin access
 * Throws error if not admin
 */
export async function requireAdmin(request: Request): Promise<User> {
  const admin = await verifyAdminAccess(request);

  if (!admin) {
    throw new Error("Admin access required");
  }

  return admin;
}
