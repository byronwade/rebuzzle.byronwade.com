# Migration from VAPID to Email + In-App Notifications

## What Changed

✅ **Replaced VAPID push notifications** with a simpler, more reliable system:
- **Email notifications** (primary) - Works everywhere, no browser permissions
- **In-app notifications** (secondary) - Badge counter for authenticated users

## Quick Start

### 1. Set up Email Service (Choose One)

#### Option A: Resend (Recommended)
```bash
npm install resend
```

Add to `.env.local`:
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

Get free API key at: https://resend.com (3,000 emails/month free)

#### Option B: Development Mode
No setup needed! The system will log emails to console in development.

### 2. Update Your Cron Job

The cron job at `/api/cron/send-notifications` now:
- Sends emails to all subscribers
- Creates in-app notifications for authenticated users
- No VAPID keys needed!

### 3. Test It

1. Enable notifications in the app (click bell icon)
2. Enter your email
3. Check your inbox for the welcome email
4. For authenticated users, check the notification badge in header

## What's Different

### Before (VAPID)
- ❌ Required browser permissions
- ❌ Complex VAPID key setup
- ❌ Only worked in supported browsers
- ❌ Users had to allow notifications
- ❌ Hard to debug

### After (Email + In-App)
- ✅ No browser permissions needed
- ✅ Simple API key setup (or none for dev)
- ✅ Works everywhere
- ✅ Users just enter email
- ✅ Easy to debug (check email logs)

## Files Changed

### New Files
- `src/lib/notifications/email-service.ts` - Email sending service
- `src/lib/hooks/useEmailNotifications.ts` - Email notification hook
- `src/components/NotificationBadge.tsx` - In-app notification badge
- `src/app/api/notifications/email/*` - Email subscription APIs
- `src/app/api/notifications/in-app/route.ts` - In-app notification API

### Updated Files
- `src/components/InfoButton.tsx` - Now uses email notifications
- `src/components/Header.tsx` - Now uses email notifications + badge
- `src/app/api/cron/send-notifications/route.ts` - Sends emails instead of push
- `src/db/models.ts` - Added EmailSubscription and InAppNotification types

### Old Files (Can be removed later)
- `src/lib/hooks/useNotifications.ts` - Old VAPID hook (still exists for reference)
- `src/app/api/notifications/vapid-public-key/route.ts` - No longer needed
- `src/app/api/notifications/subscribe/route.ts` - Old push subscription
- `src/app/api/notifications/unsubscribe/route.ts` - Old push unsubscribe

## Database Collections

### New Collections
- `emailSubscriptions` - Stores email notification preferences
- `inAppNotifications` - Stores in-app notifications

### Old Collection (Can migrate data)
- `pushSubscriptions` - Old VAPID subscriptions (can be deleted after migration)

## Benefits

1. **More Reliable**: Email delivery is 99%+ reliable vs ~70% for push
2. **Better UX**: Users understand email, don't need to grant permissions
3. **Easier Setup**: Just add API key vs complex VAPID setup
4. **Works Everywhere**: Email works on all devices/browsers
5. **Better Analytics**: Can track email opens, clicks, etc.
6. **No Browser Issues**: No permission dialogs, no browser compatibility issues

## Next Steps

1. ✅ Set up Resend API key (or use dev mode)
2. ✅ Test email notifications
3. ✅ Test in-app notifications (for authenticated users)
4. ⏳ Update cron job schedule (if needed)
5. ⏳ Remove old VAPID code (optional cleanup)

## Support

If you need help:
- Check `NOTIFICATIONS.md` for detailed documentation
- Email service logs errors to console
- In-app notifications are stored in database for debugging



