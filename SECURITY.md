# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. Email the maintainer directly or use GitHub's private vulnerability reporting
3. Include a detailed description of the vulnerability
4. Provide steps to reproduce if possible

We will respond within 48 hours and work with you to understand and address the issue.

## Security Best Practices for Users

### Environment Variables

**Never commit secrets to the repository.** All sensitive values should be in:
- `.env.local` (local development)
- Convex environment variables (via `npx convex env set`)
- Vercel environment variables (production)

Required secrets:
- `BETTER_AUTH_SECRET` - Auth encryption key
- `PLAID_CLIENT_ID` / `PLAID_SECRET` - Plaid API credentials
- `GOOGLE_CLIENT_SECRET` / `GITHUB_CLIENT_SECRET` - OAuth secrets
- `OPENAI_API_KEY` - AI features (optional)
- `CLOUDINARY_API_SECRET` - File uploads (optional)

### Access Control

This app uses email-gated access:
- Only emails in `ALLOWED_EMAILS` can sign in
- All routes are protected except `/login` and `/api/auth/*`
- Sessions are managed by Better Auth with secure cookies

### Financial Data

- Plaid access tokens are stored encrypted in Convex
- No raw banking credentials are ever stored
- All financial data is scoped to authenticated users

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Known Limitations

- This is a single-user/family app - not designed for multi-tenant use
- File uploads go through Cloudinary - review their security practices
- AI features send transaction data to OpenAI - review their data policies
