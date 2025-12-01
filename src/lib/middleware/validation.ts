/**
 * Input Validation Middleware
 *
 * Provides Zod-based validation for API routes
 */

import { NextResponse } from "next/server";
import type { z } from "zod";

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate request body with Zod schema
 */
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return async (
    request: Request
  ): Promise<
    | { success: true; data: T }
    | { success: false; errors: ValidationError[]; response: NextResponse }
  > => {
    try {
      const body = await request.json();
      const result = schema.safeParse(body);

      if (!result.success) {
        const errors: ValidationError[] = result.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));

        return {
          success: false,
          errors,
          response: NextResponse.json(
            {
              success: false,
              error: "Validation failed",
              errors,
            },
            { status: 400 }
          ),
        };
      }

      return { success: true, data: result.data };
    } catch (error) {
      return {
        success: false,
        errors: [
          {
            field: "body",
            message: "Invalid JSON",
          },
        ],
        response: NextResponse.json(
          {
            success: false,
            error: "Invalid request body",
          },
          { status: 400 }
        ),
      };
    }
  };
}

/**
 * Validate query parameters with Zod schema
 */
export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (
    request: Request
  ): {
    success: boolean;
    data?: T;
    errors?: ValidationError[];
    response?: NextResponse;
  } => {
    try {
      const url = new URL(request.url);
      const params: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        params[key] = value;
      });

      const result = schema.safeParse(params);

      if (!result.success) {
        const errors: ValidationError[] = result.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));

        return {
          success: false,
          errors,
          response: NextResponse.json(
            {
              success: false,
              error: "Validation failed",
              errors,
            },
            { status: 400 }
          ),
        };
      }

      return { success: true, data: result.data };
    } catch (error) {
      return {
        success: false,
        errors: [
          {
            field: "query",
            message: "Invalid query parameters",
          },
        ],
        response: NextResponse.json(
          {
            success: false,
            error: "Invalid query parameters",
          },
          { status: 400 }
        ),
      };
    }
  };
}

/**
 * Sanitize string input (remove dangerous characters)
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, ""); // Remove event handlers
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

