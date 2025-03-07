# NewsNow Next.js Implementation

Modern, production-ready implementation of NewsNow using Next.js and TypeScript. For the complete project documentation, see the [root README](../README.md).

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Start development server
npm run dev
```

## Development

### Key Technologies

- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **SQLite** with better-sqlite3
- **Jest** for testing

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start           # Start production server
npm test           # Run tests
npm run lint        # Run linting
```

### Environment Variables

Required environment variables:

```env
DISCORD_TOKEN=       # Discord bot token
ANTHROPIC_API_KEY=   # Anthropic API key for Claude
```

### Project Structure

```
src/
├── app/             # Next.js pages and API routes
├── components/      # React components
│   ├── common/      # Shared UI components
│   ├── controls/    # Application controls
│   ├── layout/      # Layout components
│   └── reports/     # Report-related components
├── context/         # React context providers
├── hooks/           # Custom React hooks
├── services/        # Business logic
└── types/          # TypeScript definitions
```

### Component Architecture

- **Atomic Design** principles
- Composition over inheritance
- Custom hooks for reusable logic
- Context for state management

### Testing Strategy

- Jest + React Testing Library
- Unit tests for components
- Integration tests for features
- E2E tests for critical flows

### Performance Optimizations

- Server components where possible
- Optimized images and fonts
- Code splitting and lazy loading
- Efficient database queries

### Style Guide

- ESLint + Prettier configuration
- TypeScript strict mode
- Tailwind CSS class ordering
- Component composition patterns

## Deployment

For detailed deployment instructions, see the [Deployment Guide](../docs/DEPLOYMENT.md).

Quick deployment checklist:

1. Build the application
2. Set up environment variables
3. Configure database
4. Start the server

## Contributing

1. Follow the style guide
2. Write tests for new features
3. Update documentation
4. Create focused pull requests
