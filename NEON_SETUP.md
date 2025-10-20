# Neon Database Setup Guide

This guide will help you set up the Neon PostgreSQL database for Rebuzzle.

## Environment Variables

Add these environment variables to your `.env.local` file:

```bash
# Neon Database URLs
DATABASE_URL=postgresql://neondb_owner:npg_wTeiUQ8DlKE0@ep-plain-bush-adadbdw9-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://neondb_owner:npg_wTeiUQ8DlKE0@ep-plain-bush-adadbdw9.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require

# Vercel Postgres Template URLs
POSTGRES_URL=postgresql://neondb_owner:npg_wTeiUQ8DlKE0@ep-plain-bush-adadbdw9-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
POSTGRES_URL_NON_POOLING=postgresql://neondb_owner:npg_wTeiUQ8DlKE0@ep-plain-bush-adadbdw9.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require

# Individual connection parameters
PGHOST=ep-plain-bush-adadbdw9-pooler.c-2.us-east-1.aws.neon.tech
PGHOST_UNPOOLED=ep-plain-bush-adadbdw9.c-2.us-east-1.aws.neon.tech
PGUSER=neondb_owner
PGDATABASE=neondb
PGPASSWORD=npg_wTeiUQ8DlKE0

# Vercel Postgres Template parameters
POSTGRES_USER=neondb_owner
POSTGRES_HOST=ep-plain-bush-adadbdw9-pooler.c-2.us-east-1.aws.neon.tech
POSTGRES_PASSWORD=npg_wTeiUQ8DlKE0
POSTGRES_DATABASE=neondb
POSTGRES_URL_NO_SSL=postgresql://neondb_owner:npg_wTeiUQ8DlKE0@ep-plain-bush-adadbdw9-pooler.c-2.us-east-1.aws.neon.tech/neondb
POSTGRES_PRISMA_URL=postgresql://neondb_owner:npg_wTeiUQ8DlKE0@ep-plain-bush-adadbdw9-pooler.c-2.us-east-1.aws.neon.tech/neondb?connect_timeout=15&sslmode=require

# Neon Auth (if using Neon Auth)
NEXT_PUBLIC_STACK_PROJECT_ID=8a782230-4881-4b16-b5ee-6bb59f180c7d
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=pck_fk7j3xm2sx6zkqxdr7hejrxdwjdk8amq475rgbhq2g9s0
STACK_SECRET_SERVER_KEY=ssk_twkwcwgng500jmb3vz86nmf21kz3204c17wa0sjjx2mpr

# Vercel Cron Jobs
CRON_SECRET=your-secret-key-here

# VAPID Keys for Push Notifications
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_EMAIL=your-email@example.com
```

## Database Setup Commands

### 1. Generate Migrations
```bash
npm run db:generate
```

### 2. Apply Migrations
```bash
npm run db:migrate
```

### 3. Setup Database (includes health check)
```bash
npm run db:setup
```

### 4. Open Database Studio
```bash
npm run db:studio
```

### 5. Reset Database (if needed)
```bash
npm run db:reset
```

## Vercel Deployment

### 1. Add Environment Variables to Vercel
- Go to your Vercel project dashboard
- Navigate to Settings > Environment Variables
- Add all the environment variables listed above

### 2. Deploy with Cron Jobs
The `vercel.json` file is already configured with:
- **Puzzle Generation**: Runs daily at midnight (0 0 * * *)
- **Notifications**: Runs daily at 8 AM (0 8 * * *)

### 3. Verify Cron Jobs
After deployment, you can test the cron jobs:
- Puzzle generation: `https://your-domain.vercel.app/api/cron/generate-puzzles`
- Notifications: `https://your-domain.vercel.app/api/cron/send-notifications`

## Database Schema

The database includes these main tables:
- `users` - User accounts and authentication
- `user_stats` - User statistics and progress
- `puzzles` - Daily puzzles with metadata
- `puzzle_attempts` - User puzzle attempts
- `game_sessions` - Game session tracking
- `achievements` - Achievement definitions
- `user_achievements` - User achievement unlocks
- `blog_posts` - Blog post content
- `push_subscriptions` - Push notification subscriptions

## Troubleshooting

### Connection Issues
1. Verify environment variables are set correctly
2. Check if the Neon database is active (not paused)
3. Ensure SSL mode is set to `require`

### Migration Issues
1. Run `npm run db:generate` to create new migrations
2. Run `npm run db:migrate` to apply migrations
3. Use `npm run db:push` for development (bypasses migrations)

### Cron Job Issues
1. Verify `CRON_SECRET` is set in Vercel environment variables
2. Check Vercel function logs for errors
3. Ensure database connection is working in production

## Development vs Production

### Development
- Uses `POSTGRES_URL_NON_POOLING` for direct connections
- Database studio available at `npm run db:studio`
- Hot reloading with connection pooling

### Production
- Uses `POSTGRES_URL` for pooled connections
- Optimized for serverless functions
- Automatic connection management

## Security Notes

- Never commit database credentials to version control
- Use environment variables for all sensitive data
- Enable SSL connections (`sslmode=require`)
- Rotate database passwords regularly
- Use connection pooling in production
