# Contributing to Personal Finance App

Thank you for your interest in contributing to the Personal Finance App! We welcome contributions from everyone, whether you're fixing bugs, adding features, improving documentation, or enhancing the UI.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Pull Request Process](#pull-request-process)
- [Areas for Contribution](#areas-for-contribution)
- [Questions?](#questions)

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- PostgreSQL database running
- Plaid account (for financial data)
- Google/GitHub OAuth apps configured

See the [README.md](./README.md) for detailed setup instructions.

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/personal_finance_app.git
   cd personal_finance_app
   ```
3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/cpenarrieta/personal_finance_app.git
   ```

### Set Up Development Environment

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your credentials

3. Run database migrations:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Development Workflow

### Create a Feature Branch

Always create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

Use descriptive branch names:
- `feature/add-budget-tracking`
- `fix/transaction-date-timezone`
- `docs/update-deployment-guide`

### Make Your Changes

1. Follow the project's coding standards (see below)
2. Test your changes thoroughly
3. Add/update tests if applicable
4. Update documentation if needed

### Commit Your Changes

We use conventional commits for clear git history:

```bash
git add .
git commit -m "feat: add monthly budget tracking"
```

**Commit message format:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style/formatting (no functional changes)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### Keep Your Fork Updated

Regularly sync with upstream:

```bash
git fetch upstream
git rebase upstream/main
```

## Coding Standards

### General Guidelines

Read and follow the project guidelines in:
- [CLAUDE.md](./CLAUDE.md) - Critical development rules
- [docs/DATA_FETCHING.md](./docs/DATA_FETCHING.md) - Data fetching patterns
- [docs/THEMING.md](./docs/THEMING.md) - Theming guidelines
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Project architecture

### Key Rules

#### 1. Data Fetching ⭐ MOST IMPORTANT

**Always fetch data in Server Components** and pass as props to Client Components:

```typescript
// ✅ DO: Server Component
export default async function Page() {
  const data = await getAllTransactions() // Cached query
  return <ClientComponent data={data} />
}

// ❌ DON'T: Client-side fetching
'use client'
export function Component() {
  useEffect(() => { fetch('/api/data') }, []) // ❌ NO!
}
```

#### 2. Theming ⭐ NO HARDCODED COLORS

Use shadcn/ui theme variables exclusively:

```typescript
// ✅ DO
<div className="bg-background text-foreground">

// ❌ DON'T
<div className="bg-gray-50 text-gray-900">
```

#### 3. UI Components

Use shadcn/ui components for all UI elements:

```bash
npx shadcn@latest add [component-name]
```

#### 4. TypeScript

- Use strict mode (already configured)
- No `any` types unless absolutely necessary
- Prefer type inference where possible
- Use Prisma-generated types

#### 5. Database Migrations

**ALWAYS use `migrate dev`, NEVER `db push`:**

```bash
npx prisma migrate dev --name descriptive_migration_name
```

Always commit migration files to version control.

### Code Quality Checks

Before submitting a PR, ensure all checks pass:

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Format check
npm run format:check

# Tests
npm test

# Build
npm run build
```

## Pull Request Process

### Before Submitting

1. ✅ All tests pass
2. ✅ Type checking passes
3. ✅ Code is formatted (run `npm run format`)
4. ✅ No console errors in browser
5. ✅ Documentation updated if needed
6. ✅ Migrations committed (if applicable)

### Submitting the PR

1. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. Open a Pull Request on GitHub

3. Fill in the PR template with:
   - **Description**: What does this PR do?
   - **Motivation**: Why is this change needed?
   - **Testing**: How did you test this?
   - **Screenshots**: For UI changes

4. Link any related issues: `Closes #123`

### PR Review Process

- Maintainers will review your PR
- Address any feedback or requested changes
- Once approved, your PR will be merged

### After Your PR is Merged

1. Delete your feature branch:
   ```bash
   git branch -d feature/your-feature-name
   git push origin --delete feature/your-feature-name
   ```

2. Update your local main branch:
   ```bash
   git checkout main
   git pull upstream main
   ```

## Areas for Contribution

We welcome contributions in these areas:

### 🐛 Bug Fixes
- Report or fix issues you encounter
- Check [Issues](https://github.com/cpenarrieta/personal_finance_app/issues) for known bugs

### ✨ New Features
- Budget tracking
- Recurring transaction detection
- Multi-currency support
- Transaction import/export enhancements
- Mobile app improvements

### 📝 Documentation
- Improve setup guides
- Add code examples
- Fix typos
- Translate documentation

### 🎨 UI/UX Improvements
- Enhance user interface
- Improve accessibility
- Add dark mode enhancements
- Mobile responsiveness

### ⚡ Performance
- Optimize database queries
- Improve sync speed
- Reduce bundle size
- Cache optimizations

### 🧪 Testing
- Add unit tests
- Add E2E tests
- Improve test coverage

### 🔒 Security
- Security audits
- Vulnerability fixes
- Best practices improvements

## Questions?

- **General Questions**: Open a [Discussion](https://github.com/cpenarrieta/personal_finance_app/discussions)
- **Bug Reports**: Open an [Issue](https://github.com/cpenarrieta/personal_finance_app/issues)
- **Feature Requests**: Open an [Issue](https://github.com/cpenarrieta/personal_finance_app/issues) with the `enhancement` label

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help create a welcoming community

## License

By contributing, you agree that your contributions will be licensed under the same [CC BY-NC-SA 4.0 License](./LICENSE) as the project.

---

**Thank you for contributing!** 🎉 Your efforts make this project better for everyone.
