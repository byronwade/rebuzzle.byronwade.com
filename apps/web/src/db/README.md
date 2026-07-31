# Database Layer

This directory contains the entire database layer for Rebuzzle, built with **Drizzle ORM** for maximum performance and type safety.

## 📁 Structure

```
/db
├── schema.ts                    # Database schema definitions
├── client.ts                    # Database client & connection
├── errors.ts                    # Error handling system
├── utils.ts                     # Database utilities
├── index.ts                     # Central exports
├── migrations/                  # Migration files (generated)
└── repositories/                # Data access layer
    ├── push-subscriptions.ts    # Push notification operations
    └── puzzles.ts               # Puzzle operations
```

## 🚀 Quick Start

### Import the Database

```typescript
import { db, PushSubscriptionsRepo, PuzzlesRepo } from "@/db"
```

### Use Repositories

```typescript
// Find today's puzzle
const result = await PuzzlesRepo.findTodaysPuzzle()

if (result.success) {
  const puzzle = result.data
  console.log(puzzle)
}
```

### Handle Errors

```typescript
const result = await PushSubscriptionsRepo.findPushSubscriptionById(id)

if (!result.success) {
  // result.error is a typed DatabaseError
  console.error(result.error.code, result.error.message)

  if (result.error.code === "NOT_FOUND") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}
```

## 📚 Core Concepts

### 1. Result Pattern

All repository functions return a `DbResult<T>`:

```typescript
type DbResult<T> =
  | { success: true; data: T }
  | { success: false; error: DatabaseError }
```

**Why?**
- Explicit error handling
- No uncaught exceptions
- Type-safe results
- Clear success/failure states

### 2. Repository Layer

Repositories provide clean, reusable database operations:

```typescript
// ✅ Use repositories
const result = await PushSubscriptionsRepo.upsertPushSubscription(data)

// ❌ Don't write raw queries in routes
const subscription = await db.insert(pushSubscriptions).values(data)
```

### 3. Connection Singleton

The database client is a singleton with connection pooling:

```typescript
// Automatically reuses connections across requests
export const db = drizzle(getConnection(), { schema })
```

**Benefits:**
- No connection exhaustion
- Better performance
- Automatic cleanup
- Serverless-friendly

## 🎯 Available Repositories

### PushSubscriptionsRepo

| Function | Description |
|----------|-------------|
| `upsertPushSubscription(data)` | Create or update subscription |
| `findPushSubscriptionById(id)` | Find by ID |
| `findPushSubscriptionByUserAndEndpoint(userId, endpoint)` | Find specific subscription |
| `findPushSubscriptionsByUser(userId)` | Get all user subscriptions |
| `findActivePushSubscriptions(days)` | Get active subscriptions |
| `deletePushSubscriptionById(id)` | Delete by ID |
| `deletePushSubscriptionsByUser(userId)` | Delete all user subscriptions |
| `cleanupOldPushSubscriptions(days)` | Clean up old subscriptions |

### PuzzlesRepo

| Function | Description |
|----------|-------------|
| `createPuzzle(data)` | Create new puzzle |
| `findPuzzleById(id)` | Find by ID |
| `findTodaysPuzzle()` | Get today's puzzle (optimized) |
| `findPuzzleByDate(date)` | Find puzzle by date |
| `findUpcomingPuzzles(limit)` | Get upcoming puzzles |
| `findPuzzlesByDifficulty(difficulty, limit)` | Find by difficulty |
| `updatePuzzle(id, data)` | Update puzzle |
| `deletePuzzle(id)` | Delete puzzle |
| `getPuzzleStats()` | Get puzzle statistics |

## 🔧 Utility Functions

### Date Utilities

```typescript
import { getTodayRange, createDateRange, formatDateOnly } from "@/db"

const { start, end } = getTodayRange()
const dateOnly = formatDateOnly(new Date()) // "2025-01-18"
```

### Pagination

```typescript
import { calculatePagination, createPaginatedResult } from "@/db"

const { limit, offset } = calculatePagination(page, pageSize)

const result = createPaginatedResult(data, totalItems, { page, pageSize })
// Returns: { data, pagination: { page, pageSize, totalPages, hasNext, hasPrev } }
```

### Batch Operations

```typescript
import { batchOperation } from "@/db"

const results = await batchOperation(
  items,
  100, // batch size
  async (batch) => {
    // Process batch
    return await db.insert(table).values(batch)
  }
)
```

### Retry Logic

```typescript
import { retry } from "@/db"

const result = await retry(
  async () => await someDbOperation(),
  3, // max attempts
  1000 // delay in ms
)
```

## 🏗️ Schema

The schema is defined in `schema.ts` with:
- ✅ Proper PostgreSQL types
- ✅ Optimized indexes
- ✅ Foreign key relationships
- ✅ Default values
- ✅ Timestamps with timezone

### Example Table

```typescript
export const puzzles = pgTable("puzzles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  rebusPuzzle: text("rebus_puzzle").notNull(),
  answer: text("answer").notNull(),
  explanation: text("explanation").notNull(),
  difficulty: integer("difficulty").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull().unique(),
  metadata: jsonb("metadata").$type<PuzzleMetadata>(),
}, (table) => ({
  // Indexes for performance
  scheduledForIdx: uniqueIndex("puzzles_scheduled_for_idx").on(table.scheduledFor),
  difficultyIdx: index("puzzles_difficulty_idx").on(table.difficulty),
}))
```

## 🎨 Error Handling

### Error Types

```typescript
import {
  DatabaseError,          // Base error
  NotFoundError,          // Record not found
  ValidationError,        // Invalid data
  UniqueConstraintError,  // Duplicate key
  ForeignKeyError,        // Invalid foreign key
  ConnectionError,        // Connection failed
  TransactionError,       // Transaction failed
} from "@/db"
```

### Usage

```typescript
const result = await PushSubscriptionsRepo.findPushSubscriptionById(id)

if (!result.success) {
  const error = result.error

  switch (error.code) {
    case "NOT_FOUND":
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    case "UNIQUE_VIOLATION":
      return NextResponse.json({ error: "Already exists" }, { status: 409 })
    default:
      return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

## 🔍 Health Checks

```typescript
import { checkDatabaseHealth } from "@/db"

const health = await checkDatabaseHealth()

if (health.healthy) {
  console.log(`Database OK (${health.latency}ms)`)
} else {
  console.error(`Database Error: ${health.error}`)
}
```

## 🔄 Transactions

```typescript
import { transaction } from "@/db"

await transaction(async (tx) => {
  // All operations use same transaction
  await tx.insert(users).values({ ... })
  await tx.insert(userStats).values({ ... })

  // Automatic rollback on error
  if (someCondition) {
    throw new Error("Rollback!")
  }
})
```

## 📊 Performance Tips

1. **Use Indexes** - All frequently queried columns have indexes
2. **Batch Operations** - Use `batchOperation` for bulk inserts/updates
3. **Connection Pooling** - Automatically handled by client
4. **Pagination** - Always paginate large result sets
5. **Select Specific Fields** - Only select what you need

## 🧪 Development Commands

| Command | Description |
|---------|-------------|
| `npm run db:generate` | Generate migration from schema |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:check` | Verify schema |

## 📝 Adding New Tables

1. Define table in `schema.ts`
2. Add relations if needed
3. Export types
4. Create repository in `repositories/`
5. Export repository in `index.ts`
6. Generate migration: `npm run db:generate`
7. Push to database: `npm run db:push`

### Example

```typescript
// 1. Define table in schema.ts
export const newTable = pgTable("new_table", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  nameIdx: index("new_table_name_idx").on(table.name),
}))

// 2. Export types
export type NewTable = typeof newTable.$inferSelect
export type NewNewTable = typeof newTable.$inferInsert

// 3. Create repository/new-table.ts
export async function findNewTableById(id: string): Promise<DbResult<NewTable>> {
  return wrapDbOperation(async () => {
    const [item] = await db
      .select()
      .from(newTable)
      .where(eq(newTable.id, id))
      .limit(1)

    if (!item) {
      throw new NotFoundError("NewTable", id)
    }

    return item
  })
}

// 4. Export in index.ts
export * as NewTableRepo from "./repositories/new-table"
```

## 🤝 Best Practices

1. ✅ Always use repositories
2. ✅ Handle Result types properly
3. ✅ Use typed errors
4. ✅ Add indexes for queried fields
5. ✅ Use transactions for multi-step operations
6. ✅ Validate input data
7. ✅ Document complex queries
8. ✅ Test edge cases

## 📚 Resources

- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Migration Guide](../MIGRATION_GUIDE.md)

---

**Last Updated:** 2025-01-18
