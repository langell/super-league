# Features & Status

## Completed Implementation

### 1. Multi-Tenant Foundation
- [x] Create Organizations (Leagues)
- [x] Dashboard Routing logic (`/dashboard/[slug]`)
- [x] Member Role Management (Admin, Player, Sub)

### 2. User Profiles
- [x] Google/GitHub Authentication
- [x] Profile Expansion (First, Last, Phone, Notification Pref)
- [x] User Editing (Admins can update user details)

### 3. Course Management
- [x] Manual Course Creation/Editing
- [x] **AI Scorecard Scanning** (Scorecard Image -> DB Data)
- [x] Full CRUD for Courses, Tees, and Holes
- [x] Course Deletion (Handling dependencies via transactions)

### 4. Team Management
- [x] Create Teams
- [x] Assign Members to Teams
- [x] View Rosters
- [x] Manage assignments (add/remove players)

## In Progress / Next Steps

### 5. Scheduling & Competition
- [x] **Seasons**: Define active periods (e.g., "Spring 2026").
- [x] **Rounds**: Schedule events (Auto-populate or manual).
- [ ] **Matches**: Generate pairings for rounds.

### 6. Scoring & Handicaps
- [ ] **Score Entry**: UI for inputting hole-by-hole scores.
- [ ] **Live Leaderboard**: Real-time calculation of net scores.
- [ ] **Handicap Calculation**: Service to update indices based on rounds.

### 7. Communication
- [ ] SMS/Email Integration (Twilio/SendGrid) for invite notifications.
