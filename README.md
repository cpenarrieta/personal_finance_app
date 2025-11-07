# Personal Finance App

A modern, full-featured personal finance management application built with Next.js 16. Track your transactions, manage investments, categorize expenses, and gain insights into your financial health—all in one place.

## 🎯 What It Does

This application provides a comprehensive solution for managing your personal finances by:

- **Syncing Financial Data**: Automatically sync transactions, accounts, and investment holdings from your banks and financial institutions via Plaid API
- **Transaction Management**: View, edit, and organize all your financial transactions with powerful filtering and search capabilities
- **Investment Tracking**: Monitor your investment portfolio with real-time holdings, cost basis, and investment transaction history
- **Split Transactions**: Split a single transaction into multiple categories for better expense tracking
- **Custom Tags**: Organize transactions with flexible, custom tags for additional categorization
- **Analytics & Insights**: Visualize your spending patterns, income trends, and financial health with interactive charts and analytics
- **Account Management**: Track multiple accounts across different institutions with custom account names

## ✨ Key Features

### 🔄 Automatic Data Sync
- Incremental sync with Plaid API to fetch only new transactions
- Historical data import from January 2024 onwards
- Preserves user customizations (renamed accounts, custom prices)
- Real-time account balance updates

### 💰 Investment Portfolio
- Track holdings across multiple investment accounts
- Monitor cost basis, current prices, and gains/losses
- Investment transaction history (buys, sells, dividends)
- Stock price updates via Alpha Vantage API
- Custom price overrides when needed

### 📊 Analytics & Visualization
- Interactive charts and graphs for spending analysis
- Income vs. expense tracking
- Category-wise spending breakdowns
- Time-based trends and comparisons
- Custom date range filtering

### 🔐 Secure Authentication
- OAuth authentication with Google and GitHub
- Email-gated access for single-user deployment
- Session-based security with Better Auth
- Protected routes and API endpoints

### 🎨 Modern UI
- Built with shadcn/ui components for consistent design
- Dark mode support
- Responsive design for all devices
- Intuitive navigation with breadcrumbs
- Accessible components following best practices

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router) with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Better Auth with OAuth (Google, GitHub)
- **Financial Data**: Plaid API for banking and investment data
- **Stock Data**: Alpha Vantage API for real-time stock prices
- **UI**: React 19, Tailwind CSS 4, shadcn/ui components
- **Visualization**: Recharts for data visualization

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm/yarn/bun
- PostgreSQL database
- Plaid account (for financial data sync)
- Google/GitHub OAuth apps (for authentication)
- OpenAI API key (optional, for AI categorization)
- Alpha Vantage API key (optional, for stock price updates)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd personal_finance_app
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory with the following variables:

   ```bash
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/personal_finance"

   # Better Auth Configuration
   BETTER_AUTH_SECRET="your-random-secret-key-min-32-chars"
   BETTER_AUTH_URL="http://localhost:3000"

   # Allowed User Email (REQUIRED - only this email can access the app)
   ALLOWED_EMAIL="your-email@gmail.com"

   # Google OAuth Credentials
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"

   # GitHub OAuth Credentials
   GITHUB_CLIENT_ID="your-github-client-id"
   GITHUB_CLIENT_SECRET="your-github-client-secret"

   # Plaid API Credentials
   PLAID_CLIENT_ID="your-plaid-client-id"
   PLAID_SECRET="your-plaid-secret"
   PLAID_ENV="sandbox"  # Options: sandbox, development, production

   # OpenAI API (Optional - for AI-powered categorization)
   OPENAI_API_KEY="your-openai-api-key"

   # Alpha Vantage API (Optional - for stock price updates)
   ALPHA_VANTAGE_API_KEY="your-alpha-vantage-api-key"
   ```

   **Generating `BETTER_AUTH_SECRET`:**
   ```bash
   openssl rand -base64 32
   ```

4. **Set up the database**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### First-Time Setup

1. **Configure OAuth Providers**
   - See [AUTH_SETUP.md](./AUTH_SETUP.md) for detailed OAuth setup instructions
   - Set up Google OAuth: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Set up GitHub OAuth: [GitHub Developer Settings](https://github.com/settings/developers)

2. **Connect Your Bank Accounts**
   - Navigate to the accounts page
   - Click "Add Account" to connect via Plaid Link
   - Follow the Plaid Link flow to authenticate your bank

3. **Sync Financial Data**
   ```bash
   npm run sync
   ```
   This will sync transactions, accounts, and investment holdings from Plaid.

## 📚 Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Development rules and quick reference
- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - Database schema, sync logic, project structure
- **[docs/DATA_FETCHING.md](./docs/DATA_FETCHING.md)** - Server Components data fetching patterns
- **[docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md)** - Development commands and setup
- **[docs/MIGRATIONS.md](./docs/MIGRATIONS.md)** - Database migration best practices
- **[AUTH_SETUP.md](./AUTH_SETUP.md)** - Authentication setup guide

## 🧑‍💻 Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking

# Database
npx prisma migrate dev   # Create and apply migrations
npx prisma generate      # Generate Prisma Client
npx prisma studio        # Open database GUI

# Financial Data Sync
npm run sync             # Incremental sync (uses cursors)
npm run sync:fresh       # Full sync from scratch


### Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (app)/              # Authenticated routes with AppShell
│   │   ├── transactions/  # Transaction pages
│   │   ├── accounts/       # Account pages
│   │   ├── investments/    # Investment pages
│   │   ├── analytics/      # Analytics dashboard
│   │   └── settings/       # Settings pages
│   ├── api/                # API routes
│   └── login/              # Login page
├── components/             # React components
│   ├── ui/                 # shadcn/ui components
│   └── ...                 # Feature components
├── lib/                    # Utilities and core logic
│   ├── auth.ts             # Better Auth configuration
│   ├── plaid.ts            # Plaid client
│   ├── sync.ts             # Sync logic
│   └── prisma.ts           # Prisma client
└── types/                  # TypeScript type definitions
```

## 🤝 Contributing

We welcome contributions! Whether you're fixing bugs, adding features, improving documentation, or enhancing the UI, your help makes this project better.

### How to Contribute

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following the project's coding standards
   - Use TypeScript with strict mode
   - Follow the patterns in `CLAUDE.md` and `docs/` folder
   - Use shadcn/ui components for UI elements
   - Fetch data in Server Components and pass as props
3. **Test your changes** thoroughly
4. **Commit your changes** with clear, descriptive commit messages
5. **Push to your fork** and open a Pull Request

### Areas for Contribution

- 🐛 **Bug Fixes**: Report or fix issues you encounter
- ✨ **New Features**: Add functionality that enhances the app
- 📝 **Documentation**: Improve docs, add examples, fix typos
- 🎨 **UI/UX Improvements**: Enhance the user interface and experience
- ⚡ **Performance**: Optimize queries, improve sync speed
- 🧪 **Testing**: Add tests for better code coverage
- 🔒 **Security**: Improve security practices and audit code

### Development Guidelines

- Read `CLAUDE.md` for critical development rules
- Follow the data fetching patterns in `docs/DATA_FETCHING.md`
- Use shadcn/ui components (see `docs/THEMING.md`)
- Maintain TypeScript strict mode compliance
- Write clear commit messages
- Update documentation when adding features

### Questions?

Feel free to open an issue for questions, suggestions, or discussions. We're happy to help!

---

**Thank you for contributing!** 🎉
