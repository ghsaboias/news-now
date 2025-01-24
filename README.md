# NewsNow

Transform real-time discussions into clear, concise summaries powered by AI. Stay on top of your communities without the overwhelm.

## Project Evolution

NewsNow has evolved from a Python-based application to a modern Next.js implementation, focusing on improved performance, better user experience, and maintainable code. The project maintains both implementations:

## Features

- **Real-Time Processing**: Stream and process messages in real-time
- **Smart Summarization**: AI-powered summaries of channel discussions
- **Flexible Timeframes**: Generate reports for 1-hour, 4-hour, or 24-hour periods
- **Report Management**: Save, view, and manage generated reports
- **Modern UI**: Clean, responsive interface built with Next.js and Tailwind CSS

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context
- **UI Components**: Custom components with Tailwind
- **Icons**: Feather Icons
- **Database**: SQLite with better-sqlite3

## Getting Started

### Prerequisites

- Node.js 20.x or later
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ghsaboias/news-now.git
cd news-now/new-app
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file:
```env
DISCORD_TOKEN=your_discord_bot_token
ANTHROPIC_API_KEY=your_api_key
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
news-now/
├── docs/               # Detailed documentation
└── new-app/           # Next.js implementation
    ├── src/
    │   ├── app/       # Next.js app router pages
    │   ├── components/# React components
    │   ├── context/   # React context providers
    │   ├── services/  # Business logic and services
    │   └── types/     # TypeScript type definitions
    ├── public/        # Static assets
    └── data/          # Local data storage
```

## Key Components

- **Real-Time Integration**: Message fetching and processing
- **Report Generation**: AI-powered summarization of discussions
- **Storage System**: Local file-based storage for reports
- **UI Components**: Reusable components for consistent design

## Development

### Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run type checking
npm run type-check

# Run linting
npm run lint
```

### Code Style

- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 