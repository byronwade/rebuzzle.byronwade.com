# Notification System

Rebuzzle uses a simple, reliable notification system that replaces VAPID push notifications with **email notifications** and **in-app notifications**.

## Features

### 1. Email Notifications (Primary)
- **Reliable**: Works everywhere, no browser permissions needed
- **Simple setup**: Just configure an email service
- **Daily reminders**: Users receive emails at 8 AM when new puzzles are ready

### 2. In-App Notifications (Secondary)
- **No permissions**: Works automatically for authenticated users
- **Badge counter**: Shows unread notification count in header
- **Notification center**: Click badge to see all notifications

## Setup

### Email Service Configuration

Choose one of these options:

#### Option 1: Resend (Recommended - Easiest)

1. Sign up at [resend.com](https://resend.com) (free tier: 3,000 emails/month)
2. Get your API key
3. Add to `.env.local`:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
# Or use:
FROM_EMAIL=noreply@yourdomain.com
```

#### Option 2: SMTP (Any email provider)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**Note**: SMTP support requires implementing with nodemailer (not yet implemented).

### Development Mode

If no email service is configured, the system will:
- Log email sends to console in development
- Return success (so you can test the flow)
- Not actually send emails

## API Endpoints

### Email Subscriptions

- `POST /api/notifications/email/subscribe` - Enable email notifications
- `POST /api/notifications/email/unsubscribe` - Disable email notifications
- `GET /api/notifications/email/status` - Check subscription status

### In-App Notifications

- `GET /api/notifications/in-app?userId=xxx` - Get unread notifications
- `PATCH /api/notifications/in-app` - Mark notification as read
- `POST /api/notifications/in-app` - Create notification (admin/internal)

### Cron Job

- `POST /api/cron/send-notifications` - Send daily puzzle notifications
  - Requires: `Authorization: Bearer ${CRON_SECRET}` header
  - Sends emails to all active subscribers
  - Creates in-app notifications for authenticated users

## Usage in Components

### Email Notifications Hook

```tsx
import { useEmailNotifications } from "@/lib/hooks/useEmailNotifications";

function MyComponent() {
  const { enabled, isLoading, toggle, subscribe } = useEmailNotifications();
  
  return (
    <Button onClick={() => toggle()}>
      {enabled ? "Disable" : "Enable"} Email Notifications
    </Button>
  );
}
```

### Notification Badge Component

```tsx
import { NotificationBadge } from "@/components/NotificationBadge";

// Shows badge with unread count for authenticated users
<NotificationBadge />
```

## Database Collections

### `emailSubscriptions`
- Stores user email preferences
- Fields: `id`, `userId`, `email`, `enabled`, `lastSentAt`, `createdAt`, `updatedAt`

### `inAppNotifications`
- Stores in-app notifications
- Fields: `id`, `userId`, `type`, `title`, `message`, `link`, `read`, `createdAt`, `readAt`

## Migration from VAPID

The old VAPID push notification system is still in the codebase but disabled. To fully remove:

1. Remove `web-push` dependency: `npm uninstall web-push @types/web-push`
2. Delete VAPID-related API routes (optional - can keep for reference)
3. Remove VAPID environment variables from `.env`

## Advantages Over VAPID

✅ **No browser permissions** - Email works everywhere  
✅ **No complex setup** - Just add API key  
✅ **More reliable** - Email delivery is 99%+ reliable  
✅ **Better UX** - Users understand email notifications  
✅ **Easier debugging** - Check email logs instead of browser console  
✅ **Works offline** - Users see notifications when they return  

## Future Enhancements

- [ ] SMS notifications (via Twilio)
- [ ] WhatsApp notifications (via Twilio)
- [ ] Push notifications via OneSignal (if needed)
- [ ] Notification preferences (frequency, types)



