# Super League Enterprise Standards

This document defines the engineering and design standards for the Super League application. All future developments by AI agents or human contributors must adhere to these rules.

## 1. Code Quality & Type Safety
*   **No `any` Types:** Use of `any` is strictly prohibited. Define explicit interfaces or types for all data structures, including Drizzle results and form data.
*   **Strict Linting:** The code must pass all ESLint rules. Warnings should be treated as errors.
*   **Functional purity:** Keep business logic (calculations, scoring, ranking) pure and isolated in `src/lib` for easy unit testing.

## 2. Architecture & Data Integrity
*   **Service Layer Pattern:** Server actions (`src/app/actions.ts`) and API routes should remain slim. Move core logic to service files (e.g., `src/lib/handicap-service.ts`).
*   **Multitenancy Force Multiplier:** Every query must be scoped by `organizationId`. Never perform a write operation without verifying the user's membership and role within that organization.
*   **Atomic Transactions:** Any operation modifying multiple tables (e.g., creating a match and its associated scorecards) must wrap database calls in a `db.transaction()`.

## 3. Security & Authorization
*   **Auth-First Middleware:** Rely on `src/middleware.ts` for route protection, but always double-check permissions within Server Actions using helpers like `getLeagueAdmin(slug)`.
*   **Input Validation:** Sanitize and validate all user inputs before processing. Use Zod for complex schema validation.
*   **Secret Management:** Never hardcode configuration. Use `.env.local` and strictly follow the naming conventions in `.env.example`.

## 4. Testing & Reliability
*   **Automatic Quality Gates:** Husky is configured to run `npm audit`, `npm run lint`, and `npm run test:coverage` on push.
*   **80% Coverage Floor:** Every new business logic file MUST include a corresponding `.test.ts` file. Code coverage must stay above 80% for statements, branches, and functions.
*   **E2E for Critical Paths:** Any new core feature (League Creation, Round Scoring, Player Onboarding) must have an associated Playwright E2E test in `e2e/`.

## 5. Design & User Experience
*   **Premium Aesthetic:** Maintain the "Dark Mode / Emerald Accent" design system. Use `zinc-900` for cards, `emerald-500` for primary actions, and `zinc-950` for backgrounds.
*   **Optimistic UI:** When possible, implement optimistic updates for a snappy feel during scoring or settings changes.
*   **Consistency:** Use established UI tokens. Do not introduce new color palettes or typography choices without a clear architectural reason.

## 6. API Design
*   **RESTful Standards:** API responses should follow standard HTTP status codes.
*   **Semantic HTML:** Ensure all pages follow SEO best practices, including proper heading hierarchy (`h1` to `h3`) and meta descriptions.
