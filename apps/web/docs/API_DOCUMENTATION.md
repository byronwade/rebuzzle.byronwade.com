# API Documentation

Complete API reference for Rebuzzle.

## Base URL

- Production: `https://yourdomain.com`
- Development: `http://localhost:3000`

## Authentication

Most endpoints require authentication via:
- **Header**: `Authorization: Bearer <user-id>` (current implementation)
- **Future**: JWT tokens in HTTP-only cookies

## Rate Limits

- **Auth endpoints**: 5 requests per 15 minutes
- **API endpoints**: 60 requests per minute
- **Public endpoints**: 100 requests per minute
- **AI endpoints**: 10 requests per minute

Rate limit headers:
- `X-RateLimit-Limit`: Maximum requests
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp
- `Retry-After`: Seconds to wait (when rate limited)

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional details (development only)"
}
```

Status codes:
- `400`: Bad Request (validation error)
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error
- `503`: Service Unavailable

## Endpoints

### Health Check

#### `GET /api/health`

Check application health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-18T12:00:00.000Z",
  "responseTime": 45,
  "checks": {
    "environment": {
      "status": "healthy"
    },
    "database": {
      "status": "healthy",
      "latency": 12
    }
  },
  "version": "0.1.0",
  "environment": "production"
}
```

**Status Codes:**
- `200`: All checks passed
- `503`: One or more checks failed

---

### Authentication

#### `POST /api/auth/signup`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "username": "username"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "username": "username"
  }
}
```

**Rate Limit:** 5 requests per 15 minutes

---

#### `POST /api/auth/login`

Authenticate user and get session.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "username": "username"
  }
}
```

**Rate Limit:** 5 requests per 15 minutes

---

#### `GET /api/auth/session`

Get current user session.

**Headers:**
- `Authorization: Bearer <user-id>`

**Response:**
```json
{
  "authenticated": true,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "username": "username",
    "createdAt": "2025-01-18T12:00:00.000Z",
    "lastLogin": "2025-01-18T12:00:00.000Z"
  }
}
```

---

#### `POST /api/auth/logout`

Log out current user.

**Response:**
```json
{
  "success": true
}
```

---

#### `POST /api/auth/forgot-password`

Request password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

---

#### `POST /api/auth/reset-password`

Reset password with token.

**Request Body:**
```json
{
  "token": "reset_token",
  "password": "newpassword"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

#### `POST /api/auth/change-password`

Change password (authenticated).

**Headers:**
- `Authorization: Bearer <user-id>`

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

### Puzzles

#### `GET /api/puzzle/today`

Get today's puzzle.

**Response:**
```json
{
  "success": true,
  "puzzle": {
    "id": "puzzle_id",
    "answer": "answer",
    "hints": ["hint1", "hint2", "hint3"],
    "difficulty": 3,
    "category": "compound_words"
  }
}
```

---

#### `GET /api/puzzle/preview`

Get preview of upcoming puzzles.

**Query Parameters:**
- `days` (optional): Number of days to preview (default: 7)

**Response:**
```json
{
  "success": true,
  "puzzles": [
    {
      "id": "puzzle_id",
      "date": "2025-01-19",
      "difficulty": 3,
      "category": "compound_words"
    }
  ]
}
```

---

#### `GET /api/puzzle/stats`

Get puzzle statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 100,
    "byDifficulty": {
      "1": 20,
      "2": 30,
      "3": 25,
      "4": 15,
      "5": 10
    }
  }
}
```

---

### AI Endpoints

#### `POST /api/ai/generate-puzzle`

Generate a new puzzle using AI.

**Request Body:**
```json
{
  "difficulty": 3,
  "category": "compound_words",
  "theme": "nature"
}
```

**Response:**
```json
{
  "success": true,
  "puzzle": {
    "id": "puzzle_id",
    "answer": "answer",
    "hints": ["hint1", "hint2", "hint3"],
    "difficulty": 3
  }
}
```

**Rate Limit:** 10 requests per minute

---

#### `POST /api/ai/validate-answer`

Validate an answer using AI.

**Request Body:**
```json
{
  "answer": "user_answer",
  "correctAnswer": "correct_answer",
  "puzzleId": "puzzle_id"
}
```

**Response:**
```json
{
  "success": true,
  "correct": true,
  "confidence": 0.95,
  "feedback": "Great job!"
}
```

**Rate Limit:** 10 requests per minute

---

#### `POST /api/ai/generate-hints`

Generate progressive hints.

**Request Body:**
```json
{
  "puzzleId": "puzzle_id",
  "level": 2
}
```

**Response:**
```json
{
  "success": true,
  "hint": "Hint text"
}
```

**Rate Limit:** 10 requests per minute

---

### Notifications

#### `POST /api/notifications/email/subscribe`

Subscribe to email notifications.

**Request Body:**
```json
{
  "email": "user@example.com",
  "userId": "user_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscribed to email notifications"
}
```

---

#### `POST /api/notifications/email/unsubscribe`

Unsubscribe from email notifications.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Unsubscribed from email notifications"
}
```

---

#### `GET /api/notifications/email/status`

Check email subscription status.

**Query Parameters:**
- `email`: Email address

**Response:**
```json
{
  "success": true,
  "subscribed": true
}
```

---

#### `GET /api/notifications/in-app`

Get in-app notifications.

**Query Parameters:**
- `userId`: User ID

**Response:**
```json
{
  "success": true,
  "notifications": [
    {
      "id": "notification_id",
      "type": "puzzle_ready",
      "title": "New Puzzle Available!",
      "message": "Today's puzzle is ready",
      "read": false,
      "createdAt": "2025-01-18T12:00:00.000Z"
    }
  ]
}
```

---

#### `PATCH /api/notifications/in-app`

Mark notification as read.

**Request Body:**
```json
{
  "notificationId": "notification_id",
  "userId": "user_id"
}
```

**Response:**
```json
{
  "success": true
}
```

---

### Leaderboard

#### `GET /api/leaderboard`

Get leaderboard data.

**Query Parameters:**
- `limit` (optional): Number of results (default: 10)
- `timeframe` (optional): `today`, `week`, `month`, `allTime` (default: `allTime`)

**Response:**
```json
{
  "success": true,
  "leaderboard": [
    {
      "rank": 1,
      "user": {
        "id": "user_id",
        "username": "username"
      },
      "stats": {
        "score": 1000,
        "streak": 5,
        "wins": 10
      }
    }
  ]
}
```

---

### Cron Jobs

#### `GET /api/cron/generate-puzzles`

Generate daily puzzles (cron job).

**Headers:**
- `Authorization: Bearer <CRON_SECRET>`
- OR `x-vercel-cron-secret: <VERCEL_CRON_SECRET>`

**Response:**
```json
{
  "success": true,
  "message": "Workflow triggered successfully",
  "triggeredAt": "2025-01-18T12:00:00.000Z"
}
```

**Note:** Only callable by Vercel cron or with valid secret.

---

#### `POST /api/cron/send-notifications`

Send daily notifications (cron job).

**Headers:**
- `Authorization: Bearer <CRON_SECRET>`
- OR `x-vercel-cron-secret: <VERCEL_CRON_SECRET>`

**Response:**
```json
{
  "success": true,
  "message": "Notifications sent",
  "results": {
    "emails": {
      "sent": 100,
      "failed": 0
    },
    "inApp": {
      "created": 50,
      "failed": 0
    }
  }
}
```

**Note:** Only callable by Vercel cron or with valid secret.

---

## Webhooks

### Vercel Cron

Vercel automatically calls cron endpoints at scheduled times:
- `/api/cron/generate-puzzles`: Daily at midnight UTC
- `/api/cron/send-notifications`: Daily at 8 AM UTC

Configure in `vercel.json`.

---

## Best Practices

1. **Always check rate limits** before making requests
2. **Handle errors gracefully** - check `success` field
3. **Use appropriate HTTP methods** - GET for reads, POST for writes
4. **Include authentication headers** for protected endpoints
5. **Validate input** on client side before sending
6. **Respect rate limits** - implement exponential backoff
7. **Cache responses** when appropriate
8. **Monitor error responses** for API changes

---

## Changelog

### v0.1.0
- Initial API release
- Authentication endpoints
- Puzzle endpoints
- AI endpoints
- Notification endpoints
- Health check endpoint


