# Admin Dashboard

## Overview

The admin dashboard provides comprehensive management tools for the Rebuzzle platform, including statistics tracking, puzzle management, blog post management, and user management.

## Setup

### Granting Admin Permissions

There are two ways to grant admin permissions:

#### Method 1: Database Field (Recommended)

Use the script to set admin permissions in the database:

```bash
npx tsx scripts/set-admin.ts <email> true
```

Example:
```bash
npx tsx scripts/set-admin.ts bcw1995@gmail.com true
```

To revoke admin permissions:
```bash
npx tsx scripts/set-admin.ts <email> false
```

#### Method 2: Environment Variable

Add your admin email to `.env.local`:

```env
ADMIN_EMAIL=your-email@example.com
```

For multiple admins, use comma-separated emails:

```env
ADMIN_EMAIL=admin1@example.com,admin2@example.com
```

**Note**: The database `isAdmin` field takes precedence over the environment variable. If a user has `isAdmin: true` in the database, they will have admin access regardless of the environment variable.

## Access

Navigate to `/admin` in your browser. Only users with emails matching `ADMIN_EMAIL` can access the dashboard.

## Features

### 1. Statistics Dashboard

- **Overview Metrics**:
  - Total users and active users
  - Total puzzles and active puzzles
  - Blog posts (total and published)
  - Email subscriptions
  - Analytics events

- **Recent Activity** (Last 7 Days):
  - New users
  - New puzzles
  - New blog posts
  - Analytics events

- **Top Users**: Top 10 users by points with detailed stats

- **Puzzle Types Distribution**: Breakdown by puzzle type

- **Event Types**: Most common analytics events

- **Daily Signups**: Signup trends over last 30 days

### 2. Puzzles Management

- **List All Puzzles**: Paginated list with search and filtering
- **Create Puzzle**: Add new puzzles manually
- **Edit Puzzle**: Update existing puzzles
- **Delete Puzzle**: Remove puzzles from database
- **Fields**:
  - Puzzle text
  - Puzzle type
  - Answer
  - Difficulty (easy/medium/hard)
  - Category
  - Explanation
  - Hints (multiple)
  - Published date
  - Active status

### 3. Blog Posts Management

- **List All Blog Posts**: Paginated list with search
- **Create Blog Post**: Add new blog posts
- **Edit Blog Post**: Update existing posts
- **Delete Blog Post**: Remove posts from database
- **Fields**:
  - Title
  - Slug (URL-friendly)
  - Excerpt
  - Content (Markdown)
  - Puzzle ID (optional link to puzzle)
  - Published date
  - Author ID

### 4. Users Management

- **List All Users**: Paginated list with search
- **View User Stats**: See points, level, wins, streak for each user
- **Delete User**: Remove user and all associated data:
  - User account
  - User stats
  - Email subscriptions
  - Analytics events
  - User sessions
  - Puzzle attempts
  - Game sessions
- **Send Password Reset**: Send password reset email to any user

## API Endpoints

All admin endpoints require admin authentication:

- `GET /api/admin/stats` - Get comprehensive statistics
- `GET /api/admin/puzzles` - List puzzles (with pagination and search)
- `POST /api/admin/puzzles` - Create puzzle
- `GET /api/admin/puzzles/[id]` - Get single puzzle
- `PATCH /api/admin/puzzles/[id]` - Update puzzle
- `DELETE /api/admin/puzzles/[id]` - Delete puzzle
- `GET /api/admin/blogs` - List blog posts (with pagination and search)
- `POST /api/admin/blogs` - Create blog post
- `GET /api/admin/blogs/[id]` - Get single blog post
- `PATCH /api/admin/blogs/[id]` - Update blog post
- `DELETE /api/admin/blogs/[id]` - Delete blog post
- `GET /api/admin/users` - List users (with pagination and search)
- `GET /api/admin/users/[id]` - Get single user
- `DELETE /api/admin/users/[id]` - Delete user and all data
- `POST /api/admin/users/[id]/send-password-reset` - Send password reset email

## Security

- All admin endpoints verify admin access using `verifyAdminAccess()`
- Admin status is determined by matching user email with `ADMIN_EMAIL` environment variable
- Users cannot delete their own account
- All operations are logged for audit purposes

## MongoDB Collections Used

- `users` - User accounts
- `userStats` - User statistics and leaderboard data
- `puzzles` - Puzzle data
- `blogPosts` - Blog post content
- `analyticsEvents` - Analytics event tracking
- `emailSubscriptions` - Email notification subscriptions
- `userSessions` - User session tracking
- `puzzleAttempts` - Puzzle attempt history
- `gameSessions` - Game session data

