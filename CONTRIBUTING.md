# Contributing to Personal Finance App

Thank you for your interest in contributing! This guide will help you get started.

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/personal_finance_app.git`
3. Install dependencies: `npm install`
4. Set up Convex: `npx convex dev`
5. Copy `.env.example` to `.env.local` and fill in your values

## Development Guidelines

### Critical Rules

Before writing code, read these documents:
- `CLAUDE.md` - Critical development rules
- `docs/DATA_FETCHING.md` - Server/client data patterns
- `docs/THEMING.md` - UI color guidelines

### Key Principles

1. **Data Fetching**: Use Convex only. `fetchQuery` for server, `useQuery` for client
2. **UI Components**: Always use shadcn/ui from `src/components/ui/`
3. **Colors**: Use shadcn theme variables, never hardcoded Tailwind colors
4. **TypeScript**: Strict mode enabled, no `any` types
5. **Params**: Always `await params` in Next.js 16 pages

### Dev Server

```bash
# Terminal 1: Start Convex
npx convex dev

# Terminal 2: Build and run
npm run build && npm start
```

Never run `npm run dev` - we use production builds locally.

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes following the guidelines above
3. Run linting: `npm run lint`
4. Run type check: `npm run type-check`
5. Run tests: `npm test`
6. Commit with clear messages
7. Push and open a PR

### PR Guidelines

- Keep PRs focused on a single change
- Include a clear description of what and why
- Update documentation if adding features
- Add tests for new functionality

## Areas for Contribution

- Bug fixes
- New features
- Documentation improvements
- UI/UX enhancements
- Performance optimizations
- Test coverage

## Questions?

Open an issue for questions or discussions. We're happy to help!

## License

By contributing, you agree that your contributions will be licensed under the CC BY-NC 4.0 License.
