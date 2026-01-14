# Architecture & Technology Stack

## Overview
This application is a **Golf League Management System** built with a modern web stack. It supports multi-tenancy (leagues), course management (with AI scanning), member management, and team tracking.

## Technology Stack

### Core
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (via Neon Serverless)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: [NextAuth.js v5](https://authjs.dev/) (Beta)
- **Styling**: Tailwind CSS v4

### External Services
- **AI/ML**: Google Gemini 2.5 Flash (via `google-generative-ai`) for optical character recognition (OCR) of scorecard images.

## Database Schema
The database is designed with relational integrity and multi-tenancy in mind.

### Core Tables
- **Organizations (Leagues)**: The top-level tenant. All members, courses, and seasons belong to an organization (or are linked to one).
  - `id`, `name`, `slug`, `settings`
- **Users**: Global user profiles.
  - `id`, `email`, `name`, `firstName`, `lastName`, `phone`, `notificationPreference`
- **League Members**: Link between Users and Organizations. Handles roles and permission levels.
  - `role`: "admin", "player", "sub"
  - `handicap`: League-specific handicap.

### Golf Data
- **Courses**: Golf course details.
  - `name`, `city`, `state`, `proName`, `contactInfo`
- **Tees**: Sets of tees for a course (e.g., Blue, White).
  - `rating`, `slope`, `par`
- **Holes**: Specifics for each hole on a tee.
  - `par`, `handicapIndex`, `yardage`

### Competition Data
- **Teams**: 2-person teams within a league.
- **Team Members**: Link between Teams and League Members.

### Upcoming
- **Seasons**, **Rounds**, **Matches**, **Scores**.

## Authentication & Authorization
- **Auth**: Handled via NextAuth.js with Google and GitHub providers.
- **Authorization**:
  - **Public**: Landing page.
  - **Protected**: Dashboard routes (`/dashboard`).
  - **Role-Based**: Middleware and Server Actions checks `leagueMembers.role` to allow/deny actions (e.g., only admins can add members or edit courses).

## Data Flow & Server Actions
- **Mutations**: All data mutations (Creates, Updates, Deletes) are handled via **Server Actions** in `src/app/actions.ts`.
- **Fetching**: Data fetching is primarily done directly in **Server Components** using Drizzle.
- **Validation**: Input validation happens both client-side (HTML5) and server-side (manual checks in actions).

## AI Integration
- **Scorecard Scanning**:
  1. User uploads an image.
  2. Server Action sends image to Google Gemini.
  3. Gemini returns structured JSON (Course > Tees > Holes).
  4. Data is validated and inserted into the database in a single transaction.
