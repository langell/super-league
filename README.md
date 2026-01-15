# ⛳ Golf League Manager

A modern, full-stack web application for managing golf leagues, tournaments, and handicaps. Built with Next.js 15, featuring AI-powered scorecard scanning and comprehensive handicap tracking.

## ✨ Features

### Core Functionality
- 🏆 **League Management** - Create and manage multiple golf leagues
- 👥 **Member Management** - Add players, track handicaps, assign roles
- 🎯 **Season & Team Management** - Organize seasonal play with team-based formats
- ⛳ **Course Management** - Maintain course database with tees and hole details
- 📊 **Live Scoring** - Real-time score entry and leaderboard updates
- 📈 **Handicap Tracking** - Automatic USGA-compliant handicap calculations
- 🤖 **AI Scorecard Scanner** - Upload scorecard photos for automatic data extraction
- 📅 **Schedule Management** - Organize rounds and matches

### Technical Features
- 🔐 **Secure Authentication** - Role-based access control (Admin/Player)
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- ⚡ **Real-time Updates** - Instant leaderboard and score updates
- 🎨 **Modern UI** - Clean, intuitive interface
- 🧪 **Comprehensive Testing** - 69 unit tests with high coverage
- 📝 **Structured Logging** - Production-ready logging with Pino

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Google Gemini API key (for AI scorecard scanning)

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd golf-league
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
Create a `.env.local` file:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/golf_league"

# Auth Secret
AUTH_SECRET="your-secret-key-here"

# Google AI (for scorecard scanning)
GEMINI_API_KEY="your-gemini-api-key"

# Optional
LOG_LEVEL="info"
NODE_ENV="development"
```

4. **Initialize the database**
```bash
npm run db:push    # Push schema to database
npm run db:seed    # (Optional) Seed with sample data
```

5. **Run the development server**
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your app!

## 📖 Documentation

- [User Guide](./docs/USER_GUIDE.md) - For league administrators
- [API Documentation](./docs/API.md) - For developers
- [Development Guide](./docs/DEVELOPMENT.md) - Contributing and architecture

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Vanilla CSS** - Styling

### Backend
- **Next.js API Routes** - RESTful API
- **Drizzle ORM** - Type-safe database queries
- **PostgreSQL** - Primary database
- **NextAuth.js** - Authentication

### AI & Integrations
- **Google Gemini** - AI-powered scorecard scanning
- **Pino** - Structured logging

### Testing & Quality
- **Vitest** - Unit testing (69 tests)
- **Playwright** - E2E testing ready
- **Custom Code Review** - Automated code quality checks

## 📊 Project Structure

```
golf-league/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── api/          # API routes
│   │   ├── dashboard/    # League dashboard pages
│   │   └── actions.ts    # Server actions
│   ├── components/       # React components
│   ├── db/              # Database schema & connection
│   ├── lib/             # Utilities & services
│   └── auth.ts          # Authentication config
├── scripts/             # Build & dev scripts
├── docs/               # Documentation
└── tests/              # Test files

```

## 🧪 Testing

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run code review
npm run code-review

# Build production bundle (includes type checking)
npm run build
```

**Current Test Coverage:**
- 69 unit tests passing
- Coverage: Lines 65% | Statements 65% | Functions 67% | Branches 50%

## 🚢 Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

### Other Platforms
The app can run on any Node.js hosting platform:
- Railway
- Render
- Fly.io
- DigitalOcean App Platform

**Database**: Consider using:
- Neon (Serverless Postgres)
- Supabase
- Railway Postgres

## 🔑 Key Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start           # Start production server
npm test            # Run tests
npm run db:push     # Push schema to database
npm run db:studio   # Open Drizzle Studio (DB GUI)
npm run code-review # Run code quality checks
```

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Run `npm test` and `npm run code-review`
5. Submit a pull request

## 📝 License

[Add your license here]

## 🙏 Acknowledgments

- USGA for handicap calculation standards
- Google Gemini for AI capabilities
- The Next.js and React teams

## 📧 Support

For issues and questions, please [open an issue](your-repo-url/issues).

---

**Made with ⛳ for golf enthusiasts**
