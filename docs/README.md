# Documentation

This folder contains detailed documentation for the Personal Finance App. The main `CLAUDE.md` file in the root provides quick reference and links to these detailed guides.

## Documentation Files

- **[DATA_FETCHING.md](DATA_FETCHING.md)** - Server Components data fetching patterns, props over API calls
- **[GENERATED_COLUMNS.md](GENERATED_COLUMNS.md)** - PostgreSQL generated columns for passing data to client components
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Database schema, Plaid sync logic, project structure, AI categorization
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Development commands, environment setup, testing, debugging

## Structure

```
docs/
├── README.md            # This file
├── DATA_FETCHING.md     # Data fetching patterns (Server Components, props)
├── GENERATED_COLUMNS.md # PostgreSQL generated columns for client data
├── ARCHITECTURE.md      # Database schema, sync patterns, project structure
└── DEVELOPMENT.md       # Commands, setup, testing
```

## How to Use

1. **Start with `CLAUDE.md`** in the root - it has the critical rules and quick reference
2. **Deep dive into specific topics** using these detailed docs
3. **Follow the patterns** shown in code examples

## Claude Code Integration

Claude Code reads `CLAUDE.md` as the primary instruction file. These docs are referenced from CLAUDE.md and provide additional context when needed.
