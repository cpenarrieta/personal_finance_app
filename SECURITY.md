# Security Policy

## Reporting a Vulnerability

We take the security of the Personal Finance App seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

**Please do NOT open a public issue for security vulnerabilities.**

Instead, please report security issues by:

1. **GitHub Security Advisories** (Recommended)
   - Go to the [Security tab](https://github.com/cpenarrieta/personal_finance_app/security)
   - Click "Report a vulnerability"
   - Provide detailed information about the vulnerability

2. **Email** (Alternative)
   - Email details to: [Open an issue first to get contact info]
   - Include "SECURITY" in the subject line
   - Provide as much detail as possible

### What to Include

When reporting a vulnerability, please include:

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested fix (if you have one)
- Your contact information (for follow-up)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Varies by severity (see below)

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| Latest  | ✅ Yes             |
| Older   | ❌ No              |

We only provide security updates for the latest release. Please update to the latest version to receive security patches.

## Security Best Practices for Self-Hosting

When self-hosting this application, follow these security guidelines:

### 1. Environment Variables

**Required Security Configurations:**

```bash
# ⚠️ Generate a strong secret (minimum 32 characters)
BETTER_AUTH_SECRET=<use-openssl-rand-base64-32>

# 🔒 Restrict access to trusted email addresses only
ALLOWED_EMAILS=your-trusted-email@example.com

# 🌐 Set to your production domain (never localhost in production!)
BETTER_AUTH_URL=https://yourdomain.com
```

**Generate Strong Secrets:**

```bash
# For BETTER_AUTH_SECRET
openssl rand -base64 32
```

### 2. OAuth Configuration

**Production Checklist:**

- ✅ Use separate OAuth apps for development and production
- ✅ Restrict OAuth redirect URIs to your exact domain
- ✅ Never commit OAuth secrets to version control
- ✅ Rotate OAuth secrets periodically

**Google OAuth:**
- Add only your production URL: `https://yourdomain.com/api/auth/callback/google`
- Set OAuth consent screen to "Internal" if using Google Workspace

**GitHub OAuth:**
- Add only your production URL: `https://yourdomain.com/api/auth/callback/github`
- Enable two-factor authentication on your GitHub account

### 3. Database Security

**PostgreSQL Best Practices:**

```bash
# ✅ Use SSL/TLS for database connections
DATABASE_URL=postgresql://user:password@host:5432/db?sslmode=require

# ✅ Use connection pooling for production
# ✅ Restrict database access to application server IP only
# ✅ Use strong database passwords (20+ characters)
# ✅ Enable automated backups
```

**Never:**
- ❌ Expose database publicly without SSL
- ❌ Use default PostgreSQL passwords
- ❌ Skip database backups

### 4. Plaid API Security

**Webhook Verification (REQUIRED in Production):**

```bash
# ⚠️ CRITICAL: Always set in production to prevent webhook spoofing
PLAID_WEBHOOK_SECRET=your-plaid-webhook-secret
```

**Environment Settings:**
- Development: `PLAID_ENV=sandbox` (test data)
- Production: `PLAID_ENV=production` (live banking data)

**Never:**
- ❌ Use production Plaid credentials in development
- ❌ Commit Plaid secrets to version control
- ❌ Share Plaid access tokens

### 5. HTTPS/TLS

**Production Deployment:**

- ✅ **ALWAYS use HTTPS** in production (never HTTP)
- ✅ Use SSL/TLS certificates (free via Let's Encrypt)
- ✅ Enable HSTS (HTTP Strict Transport Security)
- ✅ Disable insecure protocols (TLS 1.0, 1.1)

**Vercel/Modern Platforms:**
- Automatically provide HTTPS
- Handle SSL certificate renewal

### 6. Access Control

**Email Gating:**

```bash
# Single user (recommended for personal use)
ALLOWED_EMAILS=your-email@gmail.com

# Multiple users (comma-separated)
ALLOWED_EMAILS=user1@gmail.com,user2@gmail.com
```

**Important:**
- Email comparison is case-insensitive
- Whitespace is automatically trimmed
- Only listed emails can access the application

### 7. Testing Mode Security

**E2E Test Mode:**

```bash
# ⚠️ NEVER enable in production!
# Only use in controlled test environments
E2E_TEST_MODE=true  # ← DANGEROUS in production!
```

**Risk:** Bypasses all authentication when enabled. Never set this in production.

### 8. API Keys Security

**Rotation Schedule:**
- Better Auth Secret: Every 90 days
- OAuth Secrets: Every 6 months
- Plaid Secrets: When compromised
- OpenAI Key: Every 6 months

**Storage:**
- Use environment variables (never hardcode)
- Use secret management services (e.g., Vercel Secrets, AWS Secrets Manager)
- Never commit `.env` files

### 9. Session Security

**Better Auth Sessions:**
- Sessions expire automatically
- Stored in secure HTTP-only cookies
- Protected by CSRF tokens
- Session tokens are randomly generated

**Security Measures:**
- ✅ Sessions tied to IP address (optional)
- ✅ User agent validation
- ✅ Automatic expiration
- ✅ Secure cookie flags

### 10. Monitoring and Logging

**Recommended Tools:**

```bash
# Optional: Sentry for error tracking
SENTRY_DSN=your-sentry-dsn
NEXT_PUBLIC_SENTRY_DSN=your-public-sentry-dsn
```

**What to Monitor:**
- Failed login attempts
- Unauthorized access attempts
- Database errors
- API rate limit hits
- Plaid webhook failures

## Known Security Considerations

### 1. Single-User Architecture

This application is **designed for personal/single-user use**. Key points:

- Email gating is the primary access control
- Not designed for multi-tenancy
- All data is accessible to authenticated users
- No role-based access control (RBAC)

**Recommendation:** Do not use for multi-user scenarios without significant security enhancements.

### 2. Plaid Access Tokens

- Access tokens are stored encrypted in the database
- Tokens provide read-only access to linked bank accounts
- Tokens can be revoked via Plaid dashboard
- Regular token rotation is recommended

### 3. Client-Side Security

- Sensitive data is not exposed to client
- API routes validate authentication
- Server Components handle sensitive operations
- Client Components receive sanitized data

## Vulnerability Severity Levels

We use the following severity classifications:

### Critical
- **Impact**: Complete system compromise, data breach
- **Examples**: Authentication bypass, SQL injection, RCE
- **Response**: Immediate hotfix (within 24 hours)

### High
- **Impact**: Significant security weakness
- **Examples**: XSS, CSRF, privilege escalation
- **Response**: Fix within 7 days

### Medium
- **Impact**: Limited security impact
- **Examples**: Information disclosure, weak validation
- **Response**: Fix in next release

### Low
- **Impact**: Minimal security impact
- **Examples**: Missing security headers, outdated dependencies
- **Response**: Fix when convenient

## Security Checklist for Production

Before deploying to production, verify:

- [ ] `BETTER_AUTH_SECRET` is 32+ characters (randomly generated)
- [ ] `ALLOWED_EMAILS` is configured correctly
- [ ] `BETTER_AUTH_URL` uses HTTPS and matches your domain
- [ ] OAuth redirect URIs use HTTPS
- [ ] `PLAID_WEBHOOK_SECRET` is configured
- [ ] `E2E_TEST_MODE` is NOT set (or explicitly set to `false`)
- [ ] Database uses SSL/TLS connection
- [ ] HTTPS is enabled on your domain
- [ ] Environment variables are stored securely
- [ ] All secrets are unique (not copied from examples)
- [ ] Automated backups are enabled
- [ ] Monitoring/logging is configured

## Security Updates

We will announce security updates via:

- GitHub Security Advisories
- Release notes (for critical issues)
- README.md (for important notices)

To stay informed:
- Watch this repository for releases
- Subscribe to security advisories

## Dependencies

This project uses third-party dependencies. We:

- Regularly update dependencies via Dependabot
- Monitor security advisories
- Test updates before merging
- Use `npm audit` to detect vulnerabilities

**Users should:**
- Run `npm audit` regularly
- Keep dependencies updated
- Review Dependabot PRs

## Security Disclaimer

This software is provided "as is" without warranty of any kind. While we strive for security best practices, users are responsible for:

- Securing their own deployments
- Protecting their API keys and secrets
- Following security best practices
- Regularly updating the application
- Monitoring their instances

**For sensitive financial data, consider:**
- Professional security audit
- Penetration testing
- Compliance review (GDPR, PCI-DSS if applicable)

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Better Auth Security](https://better-auth.com/docs/concepts/security)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/security)
- [Plaid Security](https://plaid.com/safety/)
- [Prisma Security](https://www.prisma.io/docs/guides/security)

---

**Thank you for helping keep Personal Finance App secure!** 🔒
