# Project Structure

## Directory Layout

```
src/
├── app/                        # Next.js App Router Routes
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing page
│   ├── actions.ts              # Server Actions (Mutations)
│   ├── dashboard/              # Protected Dashboard Areas
│   │   ├── [slug]/             # Dynamic Route for League (Tenant)
│   │   │   ├── page.tsx        # Dashboard Home
│   │   │   ├── members/        # Member Management
│   │   │   ├── courses/        # Course Management & Scanning
│   │   │   ├── teams/          # Team Management
│   │   │   └── settings/       # League Settings
│   └── api/                    # API Routes (Auth)
│
├── components/                 # React Components
│   ├── ScorecardScanner.tsx    # AI Scanning UI
│   ├── InviteMemberForm.tsx    # Member Invite Logic
│   └── ...
│
├── db/                         # Database Configuration
│   ├── index.ts                # DB Connection
│   └── schema.ts               # Drizzle Schema Definitions
│
├── lib/                        # Utilities
│   ├── auth-utils.ts           # Auth helpers
│   ├── course-api.ts           # External API interfaces (if any)
│   └── utils.ts                # General helpers (cn, etc.)
│
├── auth.ts                     # NextAuth Main Config
├── auth.config.ts              # NextAuth Configuration Split
└── middleware.ts               # Route Protection Middleware
```

## Key Files

- **`src/db/schema.ts`**: The single source of truth for the data model. Modified via `drizzle-kit push`.
- **`src/app/actions.ts`**: Contains almost all business logic for data modification. Functions here are async and run on the server.
- **`src/components/ScorecardScanner.tsx`**: The visualization and interaction layer for the AI features.

## Workflows

### Adding a New Feature
1.  **Schema**: Update `src/db/schema.ts` with new tables/colums.
2.  **Migration**: Run `npx drizzle-kit push`.
3.  **Action**: Create a server action in `src/app/actions.ts` to handle the logic.
4.  **UI**: Create/Update a page in `src/app/dashboard/...` to consume the data and trigger the action.
