# MongoDB Setup Guide for Rebuzzle

## 🚀 **MongoDB Setup Complete!**

I've successfully configured Drizzle ORM for MongoDB. Here's what's been set up:

### ✅ **What's Configured**

1. **Drizzle ORM for MongoDB**
   - Updated `drizzle.config.ts` for MongoDB dialect
   - Configured MongoDB connection in `src/db/client.ts`
   - Updated schema to use MongoDB collections
   - Proper indexing and relationships

2. **Database Schema**
   - **Users & Authentication**: User accounts with stats
   - **Puzzles**: Daily puzzles with metadata
   - **Game Sessions**: User game tracking
   - **Blog Posts**: Content management
   - **Achievements**: Gamification system
   - **Push Notifications**: User engagement

3. **MongoDB Collections**
   - `users` - User accounts
   - `userStats` - User statistics and progress
   - `puzzles` - Daily puzzles
   - `puzzleAttempts` - User attempts
   - `gameSessions` - Game sessions
   - `blogPosts` - Blog content
   - `achievements` - Achievement system
   - `userAchievements` - User achievements
   - `levels` - Level system
   - `pushSubscriptions` - Push notifications

## 🔧 **Setup Options**

### **Option 1: MongoDB Atlas (Cloud - Recommended)**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster
4. Get your connection string
5. Update your `.env.local`:

```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rebuzzle?retryWrites=true&w=majority
```

### **Option 2: Local MongoDB**
1. Install MongoDB locally:
   ```bash
   # macOS with Homebrew
   brew install mongodb-community
   
   # Start MongoDB
   brew services start mongodb-community
   ```

2. Update your `.env.local`:
```bash
MONGODB_URI=mongodb://localhost:27017/rebuzzle
```

### **Option 3: Docker MongoDB**
1. Run MongoDB in Docker:
   ```bash
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

2. Update your `.env.local`:
```bash
MONGODB_URI=mongodb://localhost:27017/rebuzzle
```

## 🚀 **Quick Start Commands**

### **Generate Migrations**
```bash
npm run db:generate
```

### **Apply Migrations**
```bash
npm run db:migrate
```

### **Test Connection**
```bash
npm run db:test
```

### **Open Database Studio**
```bash
npm run db:studio
```

## 📊 **Environment Variables**

Add to your `.env.local`:

```bash
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/rebuzzle
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rebuzzle?retryWrites=true&w=majority

# Fallback to DATABASE_URL
DATABASE_URL=mongodb://localhost:27017/rebuzzle

# Other existing variables...
AI_PROVIDER=google
GOOGLE_AI_API_KEY=your-key-here
# ... rest of your existing variables
```

## 🔍 **Testing the Setup**

### **1. Test MongoDB Connection**
```bash
node test-mongodb.js
```

### **2. Test Database Health**
```bash
npm run db:test
```

### **3. Generate and Apply Migrations**
```bash
npm run db:generate
npm run db:migrate
```

## 📚 **MongoDB Features**

### **Collections Structure**
- **Users**: Authentication and profiles
- **User Stats**: Points, streaks, levels
- **Puzzles**: Daily challenges with metadata
- **Game Sessions**: User progress tracking
- **Blog Posts**: Content management
- **Achievements**: Gamification system

### **Indexing**
- Optimized indexes for performance
- Unique constraints on critical fields
- Compound indexes for complex queries

### **Relationships**
- Proper foreign key relationships
- Type-safe operations
- Optimized query patterns

## 🚀 **Deployment**

### **Vercel Deployment**
1. Add environment variables to Vercel:
   - `MONGODB_URI` - Your MongoDB connection string
   - `DATABASE_URL` - Fallback connection string

2. Deploy:
   ```bash
   vercel --prod
   ```

### **Environment Variables for Production**
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rebuzzle?retryWrites=true&w=majority
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/rebuzzle?retryWrites=true&w=majority
```

## 🔧 **Development Workflow**

### **Database Operations**
```bash
# Generate migrations
npm run db:generate

# Apply migrations
npm run db:migrate

# Push schema (development)
npm run db:push

# Open database studio
npm run db:studio

# Test connection
npm run db:test
```

### **Schema Changes**
1. Update `src/db/schema.ts`
2. Run `npm run db:generate`
3. Run `npm run db:migrate`

## 📊 **MongoDB Atlas Setup (Recommended)**

### **Step 1: Create Atlas Account**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for free account
3. Create new project

### **Step 2: Create Cluster**
1. Choose "Free" tier
2. Select region close to you
3. Create cluster

### **Step 3: Get Connection String**
1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy connection string
4. Replace `<password>` with your database user password

### **Step 4: Update Environment**
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rebuzzle?retryWrites=true&w=majority
```

## 🎯 **Next Steps**

1. **Choose your MongoDB setup** (Atlas recommended)
2. **Update environment variables** with your connection string
3. **Test the connection** with `node test-mongodb.js`
4. **Generate and apply migrations** with `npm run db:generate && npm run db:migrate`
5. **Test the full setup** with `npm run db:test`
6. **Deploy to Vercel** with environment variables

## 🆘 **Troubleshooting**

### **Connection Issues**
- Verify MongoDB is running (local) or accessible (Atlas)
- Check connection string format
- Ensure network access is configured (Atlas)

### **Migration Issues**
- Check Drizzle configuration
- Verify schema syntax
- Ensure proper MongoDB driver installation

### **Performance Issues**
- Add proper indexes
- Optimize queries
- Monitor connection pooling

---

**The MongoDB setup is complete and ready to use!** 🎉
