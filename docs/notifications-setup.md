# Daily Notification System Setup Guide

This guide will help you set up the free daily notification system for Rebuzzle using Web Push Notifications.

## Overview

The notification system sends daily push notifications to users at 8am (configurable) to remind them to play the new puzzle. It's completely free and doesn't require email.

## Features

- 🆓 **100% Free** - No email service required
- 🌐 **Web Push Notifications** - Works on all modern browsers
- ⏰ **Scheduled Daily Notifications** - Automated via cron jobs
- 📱 **Cross-Platform** - Works on desktop and mobile
- 🔄 **Automatic Cleanup** - Removes expired subscriptions
- 📊 **Analytics Tracking** - Track notification performance
- 🎯 **Action Buttons** - "Play Now" and "Remind Later" options

## Setup Steps

### 1. Generate VAPID Keys

VAPID keys are required for web push notifications:

```bash
bun run generate:vapid
```

This will output your VAPID keys. Copy them to your `.env` file.

### 2. Environment Variables

Add these to your `.env` file:

```env
# VAPID Keys for Web Push Notifications
VAPID_PUBLIC_KEY="your-generated-public-key"
VAPID_PRIVATE_KEY="your-generated-private-key"
VAPID_EMAIL="your-email@example.com"

# Cron Job Security
CRON_SECRET="your-secure-random-string"

# Database (if not already set)
POSTGRES_URL_NON_POOLING="your-database-url"
```

**Important:**
- Replace `your-email@example.com` with your actual email
- Use a strong random string for `CRON_SECRET`
- Keep these keys secure and never commit them to version control

### 3. Database Setup

The system uses the existing `PushSubscription` table in your Prisma schema. If you haven't run migrations yet:

```bash
npx prisma db push
```

### 4. Deploy Your Application

Deploy your application to Vercel or your preferred platform with the environment variables.

### 5. Set Up Cron Job

#### Option A: Vercel Cron (Recommended)

Create `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/send-notifications",
      "schedule": "0 8 * * *"
    }
  ]
}
```

This runs daily at 8:00 AM UTC. Adjust the schedule as needed:
- `0 8 * * *` - 8:00 AM UTC daily
- `0 12 * * *` - 12:00 PM UTC daily
- `0 16 * * *` - 4:00 PM UTC daily

#### Option B: External Cron Service

Use services like:
- **Cron-job.org** (free)
- **EasyCron** (free tier)
- **Uptime Robot** (monitoring + cron)

Configure them to make a POST request to:
```
https://your-domain.com/api/cron/send-notifications
```

With header:
```
Authorization: Bearer your-cron-secret
```

### 6. Test the System

#### Test Notifications Manually

1. Visit your app and enable notifications
2. Test the notification endpoint:

```bash
curl -X POST https://your-domain.com/api/cron/send-notifications \
  -H "Authorization: Bearer your-cron-secret"
```

#### Test User Flow

1. Visit your app
2. Click the notification bell icon
3. Allow notifications when prompted
4. You should receive a test notification

## How It Works

### User Subscription Flow

1. User visits the app
2. Service worker registers automatically
3. User clicks notification button in header
4. Browser requests permission
5. If granted, creates push subscription
6. Subscription saved to database

### Daily Notification Flow

1. Cron job triggers at 8 AM daily
2. System fetches today's puzzle
3. Retrieves all active push subscriptions
4. Sends notifications in batches (100 at a time)
5. Handles expired subscriptions automatically
6. Logs results for monitoring

### Notification Actions

Users can interact with notifications:
- **Play Now** - Opens the app directly
- **Remind Later** - Dismisses notification (could trigger local reminder)

## Customization

### Change Notification Time

Modify the cron schedule in `vercel.json`:
```json
"schedule": "0 15 * * *"  // 3 PM UTC
```

### Customize Notification Content

Edit the notification payload in `/app/api/cron/send-notifications/route.ts`:

```javascript
const notificationPayload = {
  title: "🧩 Your Custom Title!",
  body: "Your custom message here",
  // ... other options
};
```

### Add Time Zone Support

To send notifications at 8 AM in user's local time, you'd need to:
1. Store user time zones in the database
2. Calculate send times for each time zone
3. Run multiple cron jobs or use a more sophisticated scheduler

## Monitoring

### Check Notification Logs

Monitor your application logs for:
- `[Notifications] Starting daily notification send...`
- `[Notifications] Found X active subscriptions`
- `[Notifications] Daily notification send completed`

### Monitor Success Rates

The cron endpoint returns detailed statistics:
```json
{
  "success": true,
  "results": {
    "pushNotificationsSent": 150,
    "errors": 2,
    "expiredSubscriptions": 5,
    "totalSubscriptions": 157
  }
}
```

## Troubleshooting

### Common Issues

1. **Notifications not sending**
   - Check VAPID keys are correct
   - Verify cron job is running
   - Check database has active subscriptions

2. **VAPID errors**
   - Regenerate VAPID keys
   - Ensure email is valid
   - Check environment variables are set

3. **Permission denied**
   - User must grant notification permission
   - HTTPS is required for notifications
   - Some browsers block notifications by default

4. **Expired subscriptions**
   - Normal - system automatically cleans these up
   - Users need to re-enable notifications

### Debug Mode

For development, you can test notifications locally:

```bash
# Test the cron endpoint
curl -X POST http://localhost:3000/api/cron/send-notifications
```

## Browser Support

Web Push Notifications are supported by:
- ✅ Chrome 42+
- ✅ Firefox 44+
- ✅ Safari 16+ (macOS 13+, iOS 16.4+)
- ✅ Edge 17+
- ✅ Opera 39+

## Security Considerations

1. **VAPID Keys**: Keep private keys secure
2. **Cron Secret**: Use a strong random string
3. **HTTPS**: Required for push notifications
4. **Rate Limiting**: Built-in batching prevents spam
5. **User Consent**: Always respect user notification preferences

## Cost Analysis

This notification system is **100% free**:
- ✅ Web Push API - Free
- ✅ Browser notifications - Free
- ✅ Vercel cron jobs - Free (hobby plan)
- ✅ No email service needed - Free
- ✅ No third-party notification service - Free

Compare to paid alternatives:
- OneSignal: $9/month for 10k subscribers
- Pusher: $49/month for 100k messages
- Firebase: $0.60 per million messages

## Performance

- Sends notifications in batches of 100
- Handles up to 10,000+ subscribers efficiently
- Automatic cleanup of expired subscriptions
- Minimal server resource usage

## Next Steps

1. **Analytics**: Track notification click-through rates
2. **Personalization**: Send personalized puzzle hints
3. **Time Zones**: Support user-specific notification times
4. **A/B Testing**: Test different notification messages
5. **Reminder System**: Implement "remind later" functionality

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify environment variables are set
3. Test with a simple notification first
4. Check your application logs
5. Ensure HTTPS is enabled

---

**Happy puzzling! 🧩** 