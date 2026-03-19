# Accessibility Checker API

A production-ready REST API that scans any website for WCAG 2.1 accessibility violations. Built with Node.js, Puppeteer, and axe-core.

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment
```bash
cp .env.example .env
# Edit .env and set a strong ADMIN_SECRET
```

### 3. Start the server
```bash
# Development (auto-restarts on changes)
npm run dev

# Production
npm start
```

Server runs at: http://localhost:3000

---

## Create your first API key

```bash
curl -X POST http://localhost:3000/admin/keys \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: your-secret-from-env" \
  -d '{"name": "Test Key", "email": "you@example.com", "plan": "free"}'
```

Response:
```json
{
  "success": true,
  "api_key": "acc_abc123...",
  "plan": "free",
  "daily_limit": 5
}
```

---

## API Endpoints

### POST /v1/scan
Scan a URL for accessibility violations.

**Headers:**
```
X-Api-Key: acc_your_key_here
Content-Type: application/json
```

**Body:**
```json
{ "url": "https://example.com" }
```

**Response:**
```json
{
  "success": true,
  "url": "https://example.com",
  "score": 72,
  "grade": "C",
  "summary": {
    "violations": 8,
    "passes": 21,
    "incomplete": 3
  },
  "violations": [
    {
      "id": "color-contrast",
      "impact": "serious",
      "description": "Elements must have sufficient color contrast",
      "wcag_tags": ["wcag2aa", "wcag143"],
      "affected_elements": 4,
      "elements": [
        {
          "html": "<a href='/'>Home</a>",
          "fix": "Element has insufficient color contrast of 2.5:1 (expected 4.5:1)"
        }
      ]
    }
  ],
  "quota": {
    "plan": "free",
    "limit_per_day": 5,
    "used_today": 1,
    "remaining_today": 4
  }
}
```

### GET /v1/usage
Check your usage stats and recent scans.

---

## Plans & Limits

| Plan       | Scans/day | Price (RapidAPI) |
|------------|-----------|-----------------|
| Free       | 5         | $0              |
| Basic      | 100       | $9/mo           |
| Pro        | 1,000     | $29/mo          |
| Enterprise | Unlimited | $99/mo          |

---

## Admin Endpoints

All admin routes require `X-Admin-Secret` header.

| Method | Endpoint         | Action              |
|--------|-----------------|---------------------|
| POST   | /admin/keys      | Create API key      |
| GET    | /admin/keys      | List all keys       |
| PATCH  | /admin/keys/:id  | Update plan/status  |

---

## Deploy to Render.com (Free)

1. Push code to GitHub
2. Go to render.com → New → Web Service
3. Connect your repo
4. Set environment variables (PORT, ADMIN_SECRET, NODE_ENV=production)
5. Deploy — get a free HTTPS URL!
