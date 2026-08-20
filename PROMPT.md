Build a Production-Ready Multi-Platform AI Social Media Automation SaaS

You are a senior full-stack engineer and AI automation engineer.

Build a complete, production-ready SaaS application that allows a client to connect multiple social media accounts, create AI-assisted content, schedule posts, and publish content to supported platforms through their official APIs.

The application must be designed so that after deployment, a real client can create an account, connect their social accounts, create/schedule content, and manage publishing from one dashboard.

Do NOT build a fake/demo-only UI. Implement real backend functionality wherever official APIs and credentials are available.

1. Core Tech Stack
Frontend
Next.js latest stable version
App Router
TypeScript
Tailwind CSS
shadcn/ui
Responsive design
Dark/light theme
Professional SaaS dashboard
Framer Motion where useful
Backend
Python
FastAPI
Pydantic
SQLModel or SQLAlchemy
PostgreSQL
REST API architecture
AI

Design an AI provider abstraction so the application can support:

OpenAI
Gemini
Other compatible LLM providers

AI features should include:

Caption generation
Post rewriting
Platform-specific content adaptation
Hashtag suggestions
Content ideas
Content calendar suggestions

Never hardcode API keys.

Deployment

Frontend must be Vercel-compatible.

Backend must be deployable independently to a Python-compatible hosting provider.

Database must use PostgreSQL.

Use environment variables for all secrets and credentials.

2. Main Product

Application name:

"SocialPilot AI"

Build a SaaS dashboard where users can manage their social media publishing from one place.

Main workflow:

User signs up
→ Dashboard
→ Connect social accounts
→ Create content
→ AI generates/improves content
→ Select platforms
→ Publish now OR schedule
→ Background worker processes scheduled jobs
→ Show publishing status/history

3. Social Platforms

Create a modular social-provider architecture.

Initially support official APIs for:

Instagram
Facebook Pages
LinkedIn
X/Twitter
Pinterest
TikTok
YouTube
Threads

IMPORTANT:

Do not pretend that every platform has identical API capabilities.

Each provider must have its own adapter/service.

Example:

backend/
integrations/
instagram/
facebook/
linkedin/
twitter/
pinterest/
tiktok/
youtube/
threads/

Create a common interface such as:

SocialProvider

with methods such as:

connect()
disconnect()
refresh_token()
get_account()
create_post()
publish_post()
upload_media()
get_publish_status()

Only implement capabilities actually supported by the official API.

If a platform requires additional API approval, clearly document the requirement instead of bypassing it.

Never use browser automation, credential scraping, fake login systems, or unofficial APIs to bypass platform restrictions.

4. Authentication

Implement secure authentication.

Features:

Register
Login
Logout
Password hashing
JWT/session authentication
Protected routes
Current user endpoint
Password reset architecture
Email verification architecture

Never store plaintext passwords.

Use secure HTTP-only cookies where appropriate.

5. User Dashboard

Create a professional SaaS dashboard.

Sidebar:

Overview
Create Post
Calendar
Scheduled Posts
Published Posts
Drafts
Social Accounts
AI Content
Analytics
Settings

Dashboard overview should display:

Connected accounts
Scheduled posts
Published posts
Failed posts
Drafts
Recent activity

Use cards, charts and tables.

6. Social Accounts

Create a "Social Accounts" page.

Display:

Instagram
Facebook
LinkedIn
X
Pinterest
TikTok
YouTube
Threads

Each card should show:

Platform
Connection status
Account/page name
Profile image if available
Connect button
Disconnect button
Token status
Last synchronized time

Implement OAuth flows where supported.

Never ask the user to enter their social media password into our application.

Store OAuth tokens securely.

7. Create Post

Create a powerful post composer.

Fields:

Text/caption
Media upload
Platform selection
Publish now
Schedule
Save draft

Example:

Create Post

[ Write your content... ]

Media:
[ Upload Image ] [ Upload Video ]

Platforms:

☑ Instagram
☑ Facebook
☑ LinkedIn
☐ X
☐ Pinterest
☐ TikTok

[ Generate with AI ]

[ Publish Now ]

[ Schedule ]

8. AI Content Assistant

Create an AI assistant inside the post composer.

User can enter:

"Create a post about my new AI automation product."

AI should generate platform-specific content.

Example:

Instagram:

engaging caption
hashtags
CTA

LinkedIn:

professional post
hook
CTA

X:

concise post/thread where supported

Facebook:

engaging description

Pinterest:

title
description

Allow:

Regenerate
Shorten
Expand
Make professional
Make casual
Add CTA
Add hashtags
Adapt for platform
9. Scheduling System

Implement real scheduling.

Database should contain scheduled jobs/posts.

Example fields:

scheduled_at
timezone
status
platform
user_id
content_id

Statuses:

draft
scheduled
processing
published
failed
cancelled

IMPORTANT:

Do not rely on a normal frontend timer.

Use a backend worker/job queue/scheduler architecture.

The system must be capable of processing scheduled posts even when the user is not viewing the website.

Design the application so the worker can run independently from the frontend.

Use an appropriate technology such as:

Celery + Redis
OR
APScheduler for simpler deployments
OR
another reliable production-compatible job system.

Document the selected approach.

10. Content Calendar

Build a calendar page.

Show:

Drafts
Scheduled posts
Published posts
Failed posts

Allow:

Day view
Week view
Month view

Clicking a scheduled post should open its details.

Allow editing and rescheduling.

11. Media Management

Create media upload functionality.

Support:

Images
Videos

Validate:

file type
file size
dimensions where necessary

Do not permanently store large media files on the application server.

Design a storage abstraction.

Support an object storage provider such as:

Cloudinary
S3-compatible storage
Supabase Storage

Use environment variables.

12. Database

Design a clean PostgreSQL schema.

Suggested entities:

User
SocialAccount
SocialToken
Post
PostPlatform
Media
Schedule
PublishAttempt
AIRequest
Analytics
Subscription
AuditLog

Use relationships and indexes properly.

Add migrations.

Do not use destructive database operations in production.

13. API Architecture

Create clean FastAPI routers.

Example:

/api/auth
/api/users
/api/social-accounts
/api/posts
/api/media
/api/schedules
/api/ai
/api/analytics

Use:

Pydantic schemas
dependency injection
authentication dependencies
validation
proper HTTP status codes
centralized exception handling

Add API documentation through FastAPI OpenAPI.

14. Security

Treat this as a production SaaS.

Implement:

Password hashing
Secure authentication
Authorization
OAuth state validation
CSRF protection where applicable
Input validation
File validation
Rate limiting architecture
CORS configuration
Secure cookies
Environment variables
No secrets in Git
No secrets in frontend code
Audit logging

Never expose:

OAuth client secrets
access tokens
refresh tokens
AI API keys

to the browser.

15. Error Handling

Publishing can fail.

Handle:

expired OAuth token
invalid token
API rate limit
invalid media
unsupported post type
network error
platform API error

Store publish attempts and error messages.

Frontend should show meaningful statuses.

Example:

✓ Published

⏳ Scheduled

⚠ Retry required

✕ Failed

16. Retry System

Implement safe retries for temporary failures.

Do not blindly retry permanent API errors.

Use:

retry count
exponential backoff
maximum retry limit

Record every attempt.

17. Analytics

Create an analytics dashboard architecture.

Display available metrics from each platform's official APIs.

Examples:

Posts published
Engagement
Likes
Comments
Shares
Impressions
Reach

Only display metrics actually available through the platform APIs and user's permissions.

18. Settings

Create:

Profile Settings

Name
Email
Avatar

AI Settings

AI provider
Default tone
Default language

Publishing Settings

Default timezone
Default platforms

Security

Change password
Sessions
19. UI/UX

Design must look like a modern premium SaaS.

Use:

clean sidebar
responsive dashboard
professional typography
cards
tables
modal dialogs
toast notifications
loading skeletons
empty states
error states
confirmation dialogs

Must work on:

desktop
tablet
mobile

Do not create generic ugly CRUD screens.

20. Project Structure

Use a clean monorepo:

socialpilot-ai/
frontend/
backend/
worker/
README.md
.gitignore
.env.example

Frontend:

frontend/
app/
components/
lib/
hooks/
types/

Backend:

backend/
app/
api/
core/
models/
schemas/
services/
integrations/
workers/
db/
tests/

Worker:

worker/
tasks/
scheduler/

Keep responsibilities separated.

21. Environment Variables

Create complete .env.example files.

Never commit real credentials.

Include placeholders for:

DATABASE_URL
JWT_SECRET
OPENAI_API_KEY
GEMINI_API_KEY

META_CLIENT_ID
META_CLIENT_SECRET

LINKEDIN_CLIENT_ID
LINKEDIN_CLIENT_SECRET

X_CLIENT_ID
X_CLIENT_SECRET

PINTEREST_CLIENT_ID
PINTEREST_CLIENT_SECRET

TIKTOK_CLIENT_KEY
TIKTOK_CLIENT_SECRET

YOUTUBE_CLIENT_ID
YOUTUBE_CLIENT_SECRET

STORAGE credentials

REDIS_URL

and all required redirect URLs.

22. API Documentation

Create a README explaining:

architecture
setup
installation
environment variables
database migration
local development
OAuth setup
social platform developer account setup
worker setup
production deployment
Vercel frontend deployment
backend deployment
troubleshooting

Also document which features require platform API approval.

23. Local Development

The project must run locally.

Provide commands for:

Frontend:

npm install
npm run dev

Backend:

create virtual environment
install dependencies
run FastAPI

Worker:

run scheduler/worker

Database:

run migrations

24. Testing

Create tests for:

authentication
authorization
post creation
scheduling
AI service
social provider abstraction
publishing workflow
retry logic

Mock external social APIs in tests.

Do not make real social API calls during automated tests.

25. Production Requirements

Before considering the project complete:

No hardcoded secrets
No fake authentication
No fake publishing
No fake successful API responses
No placeholder backend endpoints pretending to work
No browser automation for social media
Proper error handling
Proper database migrations
Production CORS configuration
Secure token handling
Worker architecture
Deployment documentation
26. Development Strategy

Build in phases.

PHASE 1:
Create project structure and architecture.

PHASE 2:
Implement authentication and database.

PHASE 3:
Implement dashboard and post composer.

PHASE 4:
Implement AI content generation.

PHASE 5:
Implement social provider abstraction.

PHASE 6:
Implement Instagram/Facebook integration through official Meta APIs.

PHASE 7:
Implement LinkedIn integration.

PHASE 8:
Implement additional platforms one by one.

PHASE 9:
Implement scheduling worker.

PHASE 10:
Implement analytics.

PHASE 11:
Security review.

PHASE 12:
Testing.

PHASE 13:
Production deployment documentation.

Do not rush all features into fake placeholder implementations.

27. Important Rule

Whenever an API requires developer approval, permissions, review, business verification, or specific account types:

DO NOT attempt to bypass it.

Instead:

Implement the integration correctly.
Add environment variables.
Add OAuth flow.
Document exactly what the developer must configure.
Provide a graceful "Not configured" state in the dashboard.
28. Final Deliverable

The final repository must contain:

Complete frontend
Complete FastAPI backend
Worker/scheduler
PostgreSQL schema
Migrations
Authentication
AI content assistant
Social integrations architecture
Real supported API integrations
Scheduling
Media handling
Analytics architecture
Tests
.env.example
README
Deployment instructions

At the end, provide:

Project structure
Technologies used
Environment variables
Local setup commands
Database setup
OAuth setup
Worker setup
Deployment instructions
Known platform limitations
Production security checklist

Start by inspecting the repository and then implement the project incrementally. Do not overwrite existing useful work without checking it first.