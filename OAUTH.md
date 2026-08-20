# SocialPilot AI — OAuth Setup Guide

How to connect each social platform to SocialPilot AI using official developer
APIs. Follow the platform's steps, then put the credentials in `backend/.env`.

---

## How OAuth works in this app

1. User clicks **Connect** on the dashboard
   → frontend calls `POST /api/social-accounts/connect?platform=X&redirect_uri=<CALLBACK>`
2. Backend creates a signed `state`, builds the provider's authorization URL and returns it.
3. Browser is redirected to the provider's login page.
4. Provider redirects back to `<CALLBACK>?code=...&state=...`.
5. Frontend calls `GET /api/social-accounts/callback?platform=X&code=...&state=...`.
6. Backend exchanges the code for tokens, fetches the account profile,
   and stores it in the `social_accounts` + `social_tokens` tables.
7. The background worker uses the stored token at publish time.

### The callback (redirect) URL — must be whitelisted everywhere

The frontend computes it as `window.location.origin + "/social-accounts/callback"`:

| Environment | Callback URL |
|---|---|
| Local dev | `http://localhost:3000/social-accounts/callback` |
| Production | `https://<your-frontend-domain>/social-accounts/callback` |

> **Important:** The callback is hosted on the **frontend**, not the backend.
> Add the exact same URL to every platform's "redirect / callback URI" list below.

---

## 1. Meta — Facebook Pages, Instagram, Threads

All three share **one** Meta app and the same env vars:
`META_CLIENT_ID`, `META_CLIENT_SECRET`.

### Step 1 — Meta app
- Create a **Facebook account** (required even for Instagram/Threads).
- Go to `developers.facebook.com` → login → register as a developer.
- **Create App** → type **Business**.

### Step 2 — Client ID / Secret
- App → **App Settings → Basic**
- **App ID** → `META_CLIENT_ID`
- **App Secret** (click *Show*) → `META_CLIENT_SECRET`

### Step 3 — Add products
- **Facebook Pages** → add product **Facebook Login**
- **Instagram** → add product **Instagram Graph API**
- **Threads** → add product **Threads API**

### Step 4 — Redirect URI
- App → **App Settings → Advanced** → **Valid OAuth Redirect URIs**
- Add the callback URL (see table above).

### Step 5 — Facebook Page (required for all three)
- Facebook → **Create a Page** (any name).
- Make sure your account is an **Admin** of that Page.

### Step 6 — Instagram professional account
- Instagram → Settings → **Account type → Switch to Professional** (Business/Creator).
- Instagram → Settings → **Business → Link your Facebook Page**.
  (The adapter finds your Instagram business account *through* a linked Page,
  so this step is mandatory.)

### Step 7 — Publishing approval (App Review)
- Permissions to submit for review:
  - Facebook: `pages_manage_posts`
  - Instagram: `instagram_content_publish`, `business_management`
  - Threads: `threads_content_publish`
- Set App Mode **Development → Live** and submit.
- Until approval, the app connects fine but publishing shows
  **"requires approval"** (by design — never bypassed).

---

## 2. LinkedIn

Env vars: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`.

### Steps
1. `linkedin.com/developers` → login → **Create app** (needs a LinkedIn account; a free/creator account works).
2. Add the products:
   - **Sign In with LinkedIn using OpenID Connect** (`r_liteprofile`, `r_emailaddress`)
   - **Share on LinkedIn** (`w_member_social`)
3. App → **Auth** → **Authorized redirect URLs** → add the callback URL.
4. **Client ID** → `LINKEDIN_CLIENT_ID`, **Client Secret** → `LINKEDIN_CLIENT_SECRET`.
5. Publishing uses **Member UGC posts** (`urn:li:person:ME`); approval for
   `w_member_social` is typically quick/automatic.
6. Verified URL / organization verification may be requested by LinkedIn later.

---

## 3. X / Twitter

Env vars: `X_CLIENT_ID`, `X_CLIENT_SECRET`.

### Steps
1. `console.x.com/onboarding` (Twitter Developer Portal) → create a developer account (Free tier has write access).
2. Create a **Project** → create an **App**.
3. App → **User authentication settings**:
   - App permissions: **Read and write**
   - Type of app: **Web App, Automated App, or Bot**
   - **Callback / Redirect URL**: the callback URL (see table above)
   - **Website URL**: `http://localhost:3000` (or your domain)
4. **OAuth 2.0 Client ID** → `X_CLIENT_ID`, **Client Secret** → `X_CLIENT_SECRET`.
5. Note: X restricts third-party posting apps. This app uses OAuth 2.0
   **Authorization Code + PKCE** with `tweet.read tweet.write users.read offline.access`.

---

## 4. Pinterest

Env vars: `PINTEREST_CLIENT_ID`, `PINTEREST_CLIENT_SECRET`.

### Steps
1. `developers.pinterest.com` → login with your Pinterest account → **Create app**.
2. App → **Settings** → add the callback URL to **Redirect URIs**.
3. **App ID** → `PINTEREST_CLIENT_ID`, **App Secret** → `PINTEREST_CLIENT_SECRET`.
4. Scopes used: `boards:read, boards:write, pins:read, pins:write, user_accounts:read`.
5. Note: Pinterest **pins require an image URL** (no text-only posts).
   Publishing needs the app to have **write access** (Standard access).

---

## 5. TikTok

Env vars: `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`.

### Steps
1. `developers.tiktok.com` → log in with your TikTok account → **Create app**.
2. Choose the **Content Posting API** product.
3. App → **Client Key** → `TIKTOK_CLIENT_KEY`, **Client Secret** → `TIKTOK_CLIENT_SECRET`.
4. Add the callback URL to **Redirect URI**.
5. Scopes used: `user.info.basic`, `video.publish`.
6. Note: `video.publish` requires **TikTok app approval**; TikTok posts are
   **video-only** and are initialized as private (`SELF_ONLY`) in the adapter.

---

## 6. YouTube

Env vars: `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`.

### Steps
1. `console.cloud.google.com` → create a project.
2. Enable the **YouTube Data API v3**.
3. **OAuth consent screen** → configure (External, add your email as test user).
4. **Credentials → Create Credentials → OAuth client ID → Web application**:
   - **Authorized redirect URIs** → add the callback URL.
5. **Client ID** → `YOUTUBE_CLIENT_ID`, **Client Secret** → `YOUTUBE_CLIENT_SECRET`.
6. Scopes used: `youtube.upload`, `youtube.readonly`.
7. Note: video upload needs a **direct byte-stream / resumable upload** with a
   storage-signed pull URL. The adapter is wired for OAuth but raises
   `NEEDS_SETUP` for upload until that flow is configured — it gates gracefully,
   never fakes a successful upload.

---

## Approval / capability matrix

| Platform | Connect (OAuth) | Publish | Required approval |
|---|---|---|---|
| Facebook Pages | ✅ | ✅ | `pages_manage_posts` (App Review for non-admin Pages) |
| Instagram | ✅ | ⏳ | `instagram_content_publish` + `business_management` (App Review) |
| LinkedIn | ✅ | ✅ | `w_member_social` (usually fast) |
| X / Twitter | ✅ | ✅ | Write-permission app + X developer account |
| Pinterest | ✅ | ✅ | Write access / Standard access |
| TikTok | ✅ | ⏳ | `video.publish` (TikTok review) |
| YouTube | ✅ | ⚠️ | `youtube.upload` + resumable upload flow (`NEEDS_SETUP`) |
| Threads | ✅ | ⏳ | `threads_content_publish` (Meta App Review) |

Until approval is granted, the dashboard shows a graceful **"Not configured /
requires approval"** state. The app never uses browser automation or unofficial
APIs to bypass platform restrictions.

---

## Complete `.env` reference

Everything below goes in `backend/.env` (copy from `backend/.env.example`).
**Never commit real values** — `.env` is gitignored.

### App
| Variable | Purpose |
|---|---|
| `APP_NAME` | Display name ("SocialPilot AI") |
| `APP_ENV` | `development` or `production` (controls Secure cookies, CORS) |
| `DEBUG` | FastAPI debug mode |
| `API_PREFIX` | API route prefix (`/api`) |
| `SECRET_KEY` | Signs JWTs/cookies. Generate: `python -c "import secrets; print(secrets.token_urlsafe(64))"` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Session/access token lifetime (default 1440 = 1 day) |
| `PASSWORD_RESET_TOKEN_MINUTES` | Lifetime of password-reset links (default 30; optional) |

### Database
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (e.g. Neon). Local fallback: `sqlite+aiosqlite:///./dev.db` |

### CORS
| Variable | Purpose |
|---|---|
| `FRONTEND_URLS` | JSON list of allowed frontend origins, e.g. `["http://localhost:3000"]` |
| `BACKEND_URL` | Public backend URL (used for docs/links) |

### AI
| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Free Gemini key used for AI content generation |
| `OPENAI_API_KEY` | Alternative provider key (OpenAI-compatible) |
| `DEFAULT_AI_PROVIDER` | `gemini` or `openai` |
| `DEFAULT_AI_MODEL` | e.g. `gemini-2.0-flash` |

### Redis / worker
| Variable | Purpose |
|---|---|
| `REDIS_URL` | Redis connection string (optional in simple deployments) |

### OAuth — platform credentials
| Variable | Platform | Where |
|---|---|---|
| `META_CLIENT_ID` / `META_CLIENT_SECRET` | Facebook, Instagram, Threads | developers.facebook.com → App Settings → Basic |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | LinkedIn | linkedin.com/developers → your app → Auth |
| `X_CLIENT_ID` / `X_CLIENT_SECRET` | X / Twitter | developer.x.com → app → User auth settings |
| `PINTEREST_CLIENT_ID` / `PINTEREST_CLIENT_SECRET` | Pinterest | developers.pinterest.com → app → Settings |
| `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` | TikTok | developers.tiktok.com → app |
| `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` | YouTube | Google Cloud Console → OAuth client |

### Object storage (media uploads)
| Variable | Purpose |
|---|---|
| `STORAGE_PROVIDER` | `local` \| `cloudinary` \| `s3` \| `supabase` (default `local`) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary credentials |
| `S3_BUCKET` / `S3_REGION` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` / `S3_ENDPOINT_URL` | S3-compatible storage |
| `SUPABASE_STORAGE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_STORAGE_BUCKET` | Supabase Storage |

### Email (verification / password reset)
| Variable | Purpose |
|---|---|
| `EMAIL_VERIFICATION_REQUIRED` | Require email verification on signup (`true`/`false`) |
| `SMTP_HOST` | SMTP server for sending reset/verification emails |
| `SMTP_PORT` | SMTP port (default 587) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASSWORD` | SMTP password |
| `MAIL_FROM` | Sender address (default `noreply@example.com`) |

> If SMTP is not configured, the password-reset endpoint returns the reset
> link in the API response (local dev convenience). In production, set SMTP and
> it is emailed instead.

### Rate limiting
| Variable | Purpose |
|---|---|
| `RATE_LIMIT_ENABLED` | Enable/disable rate limiting |
| `RATE_LIMIT_DEFAULT_PER_MINUTE` | Default requests per minute per client |




