# Production Deployment Guide

This guide covers deploying Rebuzzle to production on Vercel (recommended) or other platforms.

## Prerequisites

- Node.js 18+ installed
- Git repository set up
- MongoDB database (MongoDB Atlas recommended)
- Email service account (Resend recommended)
- AI provider API keys (Vercel AI Gateway recommended)

## Pre-Deployment Checklist

### 1. Environment Variables

Set all required environment variables in your deployment platform:

#### Required Variables

```bash
# Application
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rebuzzle

# AI Configuration
AI_PROVIDER=gateway
AI_GATEWAY_API_KEY=your_vercel_ai_gateway_key

# Email
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Security
CRON_SECRET=your_strong_random_secret_here
```

#### Optional Variables

```bash
# Alternative AI providers (if not using gateway)
GOOGLE_AI_API_KEY=...
GROQ_API_KEY=...
XAI_API_KEY=...
OPENAI_API_KEY=...

# Feature flags
AI_PUZZLE_GENERATION=true
AI_SMART_VALIDATION=true
AI_DYNAMIC_HINTS=true
AI_DIFFICULTY_ADJUSTMENT=true
```

### 2. Database Setup

1. **Create MongoDB Database**
   - Sign up for MongoDB Atlas (free tier available)
   - Create a new cluster
   - Create a database user
   - Whitelist your deployment IPs (or use 0.0.0.0/0 for serverless)
   - Get connection string

2. **Run Database Setup**
   ```bash
   npm run db:setup
   ```

3. **Generate Initial Puzzles**
   ```bash
   npm run db:generate-puzzles
   ```

### 3. Email Service Setup

1. **Resend (Recommended)**
   - Sign up at [resend.com](https://resend.com)
   - Verify your domain
   - Create API key
   - Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL`

### 4. AI Gateway Setup

1. **Vercel AI Gateway (Recommended)**
   - Go to Vercel Dashboard > AI Gateway
   - Create gateway
   - Add provider integrations (Google, Groq, etc.)
   - Get API key
   - Set `AI_GATEWAY_API_KEY`

## Deployment Steps

### Vercel Deployment

1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Import your Git repository
   - Vercel will auto-detect Next.js

2. **Configure Project**
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

3. **Set Environment Variables**
   - Go to Project Settings > Environment Variables
   - Add all required variables from checklist above
   - Set for Production, Preview, and Development environments

4. **Configure Cron Jobs**
   - Vercel automatically reads `vercel.json` for cron configuration
   - Ensure `CRON_SECRET` or `VERCEL_CRON_SECRET` is set
   - Vercel will automatically set `VERCEL_CRON_SECRET` for cron requests

5. **Deploy**
   - Push to main branch (auto-deploys)
   - Or deploy manually from Vercel dashboard

### Other Platforms

#### Railway

1. Connect repository
2. Set environment variables
3. Configure build command: `npm run build`
4. Configure start command: `npm start`

#### Render

1. Create Web Service
2. Connect repository
3. Set environment variables
4. Build command: `npm run build`
5. Start command: `npm start`

#### Self-Hosted

1. **Build Application**
   ```bash
   npm install
   npm run build
   ```

2. **Start Production Server**
   ```bash
   npm start
   ```

3. **Set Up Process Manager**
   - Use PM2: `pm2 start npm --name "rebuzzle" -- start`
   - Or systemd service

4. **Set Up Reverse Proxy**
   - Configure Nginx or Caddy
   - Set up SSL with Let's Encrypt

## Post-Deployment

### 1. Verify Deployment

1. **Check Health Endpoint**
   ```bash
   curl https://yourdomain.com/api/health
   ```
   Should return `{"status":"healthy",...}`

2. **Test Application**
   - Visit your domain
   - Test puzzle generation
   - Test user authentication
   - Test email notifications

### 2. Monitor Logs

- **Vercel**: Dashboard > Logs
- **Other platforms**: Check platform-specific logging
- Watch for errors, especially:
  - Database connection issues
  - AI API errors
  - Email sending failures

### 3. Set Up Monitoring

1. **Health Checks**
   - Use monitoring service (UptimeRobot, Pingdom)
   - Monitor `/api/health` endpoint
   - Set up alerts for downtime

2. **Error Tracking** (Optional)
   - Integrate Sentry for error tracking
   - Set up alerts for critical errors

3. **Analytics**
   - Vercel Analytics is automatically enabled
   - Check Vercel Dashboard > Analytics

### 4. Test Cron Jobs

1. **Manual Trigger** (for testing)
   ```bash
   curl -X GET https://yourdomain.com/api/cron/generate-puzzles \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

2. **Verify Execution**
   - Check Vercel Dashboard > Cron Jobs
   - Verify jobs run at scheduled times
   - Check logs for errors

## Troubleshooting

### Database Connection Issues

- Verify `MONGODB_URI` is correct
- Check MongoDB Atlas IP whitelist
- Verify database user permissions
- Check connection string format

### AI Generation Failing

- Verify `AI_GATEWAY_API_KEY` is set
- Check AI Gateway dashboard for errors
- Verify provider integrations are configured
- Check quota limits

### Email Not Sending

- Verify `RESEND_API_KEY` is set
- Check Resend dashboard for errors
- Verify domain is verified in Resend
- Check `RESEND_FROM_EMAIL` matches verified domain

### Cron Jobs Not Running

- Verify `vercel.json` cron configuration
- Check `CRON_SECRET` or `VERCEL_CRON_SECRET` is set
- Verify cron schedule syntax
- Check Vercel Dashboard > Cron Jobs

### Build Failures

- Check build logs for errors
- Verify all dependencies are in `package.json`
- Check Node.js version compatibility
- Verify environment variables are set

## Rollback Procedures

### Vercel

1. Go to Deployments
2. Find previous successful deployment
3. Click "..." menu > Promote to Production

### Other Platforms

1. Revert Git commit
2. Push to trigger new deployment
3. Or restore from backup

## Backup Strategy

### Database Backups

- MongoDB Atlas: Automatic backups (paid plans)
- Manual backups: Use `mongodump`
- Schedule regular backups

### Application Backups

- Git repository is the source of truth
- Keep deployment configurations in version control
- Document environment variable values (securely)

## Security Checklist

- [ ] All environment variables set
- [ ] `CRON_SECRET` is strong and unique
- [ ] Database connection uses SSL
- [ ] HTTPS enabled (automatic on Vercel)
- [ ] Security headers configured (in `next.config.mjs`)
- [ ] Rate limiting enabled
- [ ] Input validation in place
- [ ] Error messages don't expose sensitive data
- [ ] API keys are not exposed in client code

## Performance Optimization

- [ ] Enable Next.js caching
- [ ] Configure CDN (automatic on Vercel)
- [ ] Optimize images
- [ ] Enable compression
- [ ] Monitor bundle size
- [ ] Use production build (`NODE_ENV=production`)

## Maintenance

### Regular Tasks

- Monitor error logs weekly
- Check database size monthly
- Review AI usage/quota monthly
- Update dependencies quarterly
- Review security headers annually

### Updates

1. Test updates in preview environment
2. Check for breaking changes
3. Update environment variables if needed
4. Run database migrations if needed
5. Deploy to production
6. Monitor for issues

## Support

For issues or questions:
- Check logs in deployment platform
- Review error messages
- Check this documentation
- Open GitHub issue if needed


