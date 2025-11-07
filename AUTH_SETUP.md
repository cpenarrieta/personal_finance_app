# Authentication Setup Guide

Your Personal Finance app now has SSO authentication with email restriction! Only the email specified in your `.env` file will be able to access the application.

## ✅ What's Been Implemented

1. **Better Auth** - Modern authentication library for Next.js 15
2. **OAuth Providers** - Google and GitHub sign-in only (no password login)
3. **Centralized Email Restriction** - AuthGuard in root layout protects ALL pages automatically
4. **Route Protection** - All routes are protected except `/login`
5. **Database Models** - Prisma schema with User, Session, Account (OAuth), and Verification tables
6. **Login Page** - Beautiful login UI with shadcn/ui components
7. **Logout Functionality** - Sign out button in Settings section of dashboard
8. **Type Safety** - Complete type system for Prisma models with PlaidAccount/Account separation

## 🔧 Required Environment Variables

You need to add these variables to your `.env` file:

```bash
# Better Auth Configuration
BETTER_AUTH_SECRET=your-random-secret-key-min-32-chars
BETTER_AUTH_URL=http://localhost:3000

# Allowed User Emails (REQUIRED)
ALLOWED_EMAILS=your-email@gmail.com

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth Credentials
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

## 📝 Setup Steps

### 1. Generate Auth Secret

Generate a random secret for `BETTER_AUTH_SECRET`:

```bash
openssl rand -base64 32
```

Copy the output and add it to your `.env` file.

### 2. Set Your Allowed Email

Update `ALLOWED_EMAILS` in `.env` with your personal email address:

```bash
ALLOWED_EMAILS=yourname@gmail.com
```

**Important:** This email MUST match the email from your Google or GitHub OAuth account.

### 3. Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project (or select existing)
3. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
4. Configure OAuth consent screen if needed (Internal is fine for personal use)
5. Application type: "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://yourdomain.com/api/auth/callback/google` (for production)
7. Copy the Client ID and Client Secret to your `.env` file

### 4. Set Up GitHub OAuth

1. Go to [GitHub Settings → Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - Application name: Personal Finance App
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Click "Register application"
5. Click "Generate a new client secret"
6. Copy the Client ID and Client Secret to your `.env` file

For production, create another OAuth app with your production URL.

### 5. Update Database

The Prisma migrations have already been applied, but if you need to regenerate:

```bash
npx prisma generate
```

## 🚀 Testing

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000`
   - You should be redirected to `/login`

3. Click "Continue with Google" or "Continue with GitHub"

4. Sign in with your Google/GitHub account

5. If your email matches `ALLOWED_EMAILS`, you'll be redirected to the dashboard

6. If your email doesn't match, you'll see "Access Denied" error

## 🔒 How Security Works

### Two-Layer Protection

The app uses a two-layer security approach:

#### Layer 1: Middleware (Session Check)
- Runs on EVERY request before the page loads
- Checks for `better-auth.session_token` cookie
- If no session → redirects to `/login`
- Allows public routes: `/login`, `/api/auth/*`

#### Layer 2: AuthGuard (Email Validation)
- Server component in root layout (`src/app/layout.tsx`)
- Runs for ALL pages automatically
- Validates email matches `ALLOWED_EMAILS`
- If email doesn't match → redirects to `/login?error=unauthorized`
- Single source of truth - no need to add validation to individual pages

### Why This Approach?

**✅ Advantages:**
- All pages are automatically protected
- Email validation in ONE place
- New pages are protected by default
- Can't forget to add auth checks
- Clean, maintainable code

**Security Flow:**
```
User visits any page
   ↓
Middleware checks session cookie
   ├─ No session? → Redirect to /login
   └─ Has session? → Continue
      ↓
AuthGuard checks email
   ├─ Email matches? → Render page ✅
   └─ Email doesn't match? → Redirect to /login ❌
```

## 📁 Key Files

### Authentication Files
- `src/lib/auth.ts` - Better Auth server configuration
- `src/lib/auth-client.ts` - Client-side auth helpers
- `src/lib/auth-helpers.ts` - Server-side utilities (getSession, validateAllowedEmail)
- `src/app/api/auth/[...all]/route.ts` - Auth API routes (handles OAuth callbacks)
- `src/middleware.ts` - Route protection (session check)
- `src/components/AuthGuard.tsx` - **Centralized email validation**
- `src/app/layout.tsx` - Root layout with AuthGuard wrapper

### UI Components
- `src/app/login/page.tsx` - Login page with error handling
- `src/components/LoginButtons.tsx` - OAuth login buttons (Google/GitHub)
- `src/components/LogoutButton.tsx` - Sign out button

### Database Schema
- `prisma/schema.prisma` - Updated with auth models:
  - `User` - User accounts
  - `Session` - Active sessions
  - `Account` - OAuth account connections (Google/GitHub)
  - `Verification` - Email verification tokens
  - `PlaidAccount` - Financial accounts from Plaid (renamed from Account to avoid conflict)

## 🗄️ Database Schema Changes

### Important Rename: Account → PlaidAccount

To avoid conflicts with Better Auth's OAuth `Account` model, the Plaid financial accounts were renamed:

- **PlaidAccount** - Your bank/investment accounts from Plaid
- **Account** - OAuth provider accounts (Google/GitHub credentials)

All code has been updated to use `prisma.plaidAccount` for financial accounts.

### Auth Models

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  sessions      Session[]
  accounts      Account[]
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  ipAddress String?
  userAgent String?
}

model Account {
  id                    String   @id @default(cuid())
  userId                String
  accountId             String   // Provider's user ID
  providerId            String   // "google" or "github"
  accessToken           String?
  refreshToken          String?
  idToken               String?
  expiresAt             DateTime?
  // ... other OAuth fields
}

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
}
```

## 🎨 UI Components Used

- Button (shadcn/ui)
- Card (shadcn/ui)
- Google and GitHub SVG logos

## 🔄 Production Deployment

When deploying to production:

1. Update `BETTER_AUTH_URL` to your production URL:
   ```bash
   BETTER_AUTH_URL=https://yourdomain.com
   ```

2. Add production callback URLs to Google OAuth:
   - `https://yourdomain.com/api/auth/callback/google`

3. Add production callback URL to GitHub OAuth:
   - `https://yourdomain.com/api/auth/callback/github`

4. Ensure your production database is migrated:
   ```bash
   npx prisma migrate deploy
   ```

5. Set environment variables in your deployment platform (Vercel, Railway, etc.)

## 🆘 Troubleshooting

### "Access denied" error when logging in
- Verify your `ALLOWED_EMAILS` matches exactly (comparison is case-insensitive)
- Check that you're signing in with the correct Google/GitHub account
- Look at server logs for the actual email that was used

### Redirect loops
- Clear browser cookies
- Verify `BETTER_AUTH_URL` matches your current URL
- Check that OAuth callback URLs are configured correctly in Google/GitHub

### "Invalid session" errors
- Clear browser cookies
- Regenerate `BETTER_AUTH_SECRET` (will log out all users)
- Restart your development server

### OAuth errors (404 or 500 on callback)
- Verify Client ID and Secret are correct in `.env`
- Check redirect URIs match exactly (including protocol and port)
- Ensure OAuth app is not restricted (use "Internal" for Google Workspace)
- Check browser console and server logs for detailed error messages

### Database errors
- Run `npx prisma generate` to regenerate Prisma client
- Run `npx prisma migrate deploy` to apply pending migrations
- Check that your DATABASE_URL is correct in `.env`

### Type errors after schema changes
- Run `npx prisma generate` to update types
- Restart your TypeScript server in VS Code
- Clear Next.js cache: `rm -rf .next`

## 🔐 Adding Multiple Allowed Emails (Future)

Currently only one email is supported. To allow multiple emails:

1. Update `.env`:
   ```bash
   ALLOWED_EMAILS=email1@gmail.com,email2@gmail.com,email3@gmail.com
   ```

2. Update `src/components/AuthGuard.tsx`:
   ```typescript
   const allowedEmails = process.env.ALLOWED_EMAILS?.split(',')
     .map(e => e.toLowerCase().trim());

   if (!allowedEmails?.includes(userEmail)) {
     redirect("/login?error=unauthorized");
   }
   ```

## 📚 Documentation

- **Better Auth**: https://better-auth.com
- **Prisma**: https://www.prisma.io/docs
- **Next.js 15**: https://nextjs.org/docs

## ✨ Why Better Auth?

Better Auth was chosen for this project because:

1. **Modern & Lightweight** - Built specifically for Next.js 15 App Router
2. **Great TypeScript Support** - Fully typed APIs
3. **Simple Configuration** - Less boilerplate than NextAuth.js
4. **Flexible** - Easy to customize and extend
5. **Active Development** - Well-maintained and growing community
6. **Perfect for Single-User Apps** - Not overkill like enterprise solutions
7. **Prisma Integration** - Native adapter for seamless database integration

## 🎯 Summary

You now have a fully functional authentication system with:

- ✅ OAuth login (Google + GitHub)
- ✅ Multiple-email restriction via `ALLOWED_EMAILS`
- ✅ Application-wide protection via AuthGuard in root layout
- ✅ Automatic route protection (no need to add auth to each page)
- ✅ Type-safe database models
- ✅ Beautiful login UI
- ✅ Production-ready security

Just set your environment variables and you're ready to go! 🚀
