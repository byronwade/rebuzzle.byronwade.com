# Fresh Neon Database Setup Guide

## 🆕 Creating a Brand New Database

Since you're getting quota errors on what should be a new database, let's set up a completely fresh one:

### Step 1: Create New Neon Project
1. Go to [console.neon.tech](https://console.neon.tech)
2. Click "Create Project"
3. Choose a new project name (e.g., "rebuzzle-fresh")
4. Select a region close to you
5. Click "Create Project"

### Step 2: Get New Connection String
1. In your new project dashboard
2. Go to "Connection Details" or "Connect"
3. Copy the **Connection String** (not the individual parameters)
4. It should look like: `postgresql://username:password@host/database?sslmode=require`

### Step 3: Update Environment Variables
Replace your current `.env.local` with the new connection string:

```bash
# Replace with your NEW connection string
DATABASE_URL=postgresql://NEW_USER:NEW_PASSWORD@NEW_HOST/NEW_DATABASE?sslmode=require
POSTGRES_URL=postgresql://NEW_USER:NEW_PASSWORD@NEW_HOST/NEW_DATABASE?sslmode=require
POSTGRES_URL_NON_POOLING=postgresql://NEW_USER:NEW_PASSWORD@NEW_HOST/NEW_DATABASE?sslmode=require
```

### Step 4: Test the New Connection
```bash
# Test with the new credentials
node test-connection.js
```

### Step 5: Run Migrations
```bash
# Generate migrations
npm run db:generate

# Apply migrations
npm run db:migrate

# Test everything
npm run db:test
```

## 🔍 Troubleshooting

### If you still get quota errors:
1. **Check Project Status**: Make sure it's "Active" not "Paused"
2. **Verify Region**: Make sure you're in the right region
3. **Check Account**: Make sure you're using the right Neon account
4. **Clear Cache**: Try a different browser or incognito mode

### If connection works but migrations fail:
1. **Check Permissions**: Make sure the user has CREATE privileges
2. **Try Different Connection**: Use the non-pooling connection string
3. **Check SSL**: Make sure `sslmode=require` is included

## 🚀 Alternative: Use Neon CLI

If the web interface isn't working, try the Neon CLI:

```bash
# Install Neon CLI
npm install -g @neondatabase/cli

# Login to Neon
neon auth

# Create new project
neon projects create --name rebuzzle-fresh

# Get connection string
neon connection-string --project rebuzzle-fresh
```

## 📞 Need Help?

If you're still having issues:
1. Check [Neon Status Page](https://status.neon.tech)
2. Contact [Neon Support](https://neon.tech/support)
3. Try creating the project in a different region
4. Consider using a different email/account for Neon

---

**Next Steps**: Once you have a working connection, we can proceed with the database setup and migrations.
