/**
 * Environment Variable Validation Tests
 *
 * Basic tests for environment variable validation
 * Run with: npm test
 */

import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { getAppUrl, getDatabaseUrl, validateEnv } from "../env";

describe("Environment Validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getDatabaseUrl", () => {
    it("should return MONGODB_URI if set", () => {
      process.env.MONGODB_URI = "mongodb://localhost:27017/test";
      expect(getDatabaseUrl()).toBe("mongodb://localhost:27017/test");
    });

    it("should return DATABASE_URL if MONGODB_URI not set", () => {
      delete process.env.MONGODB_URI;
      process.env.DATABASE_URL = "mongodb://localhost:27017/test2";
      expect(getDatabaseUrl()).toBe("mongodb://localhost:27017/test2");
    });

    it("should throw if neither is set", () => {
      delete process.env.MONGODB_URI;
      delete process.env.DATABASE_URL;
      expect(() => getDatabaseUrl()).toThrow();
    });
  });

  describe("getAppUrl", () => {
    it("should return NEXT_PUBLIC_APP_URL if set", () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
      expect(getAppUrl()).toBe("https://example.com");
    });

    it("should return localhost in development if not set", () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      process.env.NODE_ENV = "development";
      expect(getAppUrl()).toBe("http://localhost:3000");
    });

    it("should throw in production if not set", () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      process.env.NODE_ENV = "production";
      expect(() => getAppUrl()).toThrow();
    });
  });

  describe("validateEnv", () => {
    it("should pass with valid configuration", () => {
      process.env.MONGODB_URI = "mongodb://localhost:27017/test";
      process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
      process.env.AI_PROVIDER = "gateway";
      process.env.AI_GATEWAY_API_KEY = "test-key";
      process.env.NODE_ENV = "production";
      process.env.CRON_SECRET = "test-secret";

      const result = validateEnv();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail without database URL", () => {
      delete process.env.MONGODB_URI;
      delete process.env.DATABASE_URL;
      process.env.NEXT_PUBLIC_APP_URL = "https://example.com";

      const result = validateEnv();
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should warn about missing email configuration", () => {
      process.env.MONGODB_URI = "mongodb://localhost:27017/test";
      process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
      delete process.env.RESEND_API_KEY;

      const result = validateEnv();
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes("RESEND"))).toBe(true);
    });
  });
});

