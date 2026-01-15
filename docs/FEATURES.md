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
- [x] **Enhanced Course Information** (Address, Zip, Phone, Email, Website, Pro Name)
- [x] **Rich Course Display** (Detailed course cards with contact info and links)

### 4. Team Management
- [x] Create Teams
- [x] Assign Members to Teams
- [x] View Rosters
- [x] Manage assignments (add/remove players)

## In Progress / Next Steps

### 5. Scheduling & Competition
- [x] **Seasons**: Define active periods (e.g., "Spring 2026").
- [x] **Rounds**: Schedule events (Auto-populate or manual).
- [x] **Matches**: Generate pairings for rounds.
- [x] **Format Support**: 9 vs 18 Holes, Front/Back Rotation.

### 6. Scoring & Handicaps
- [x] **Score Entry**: Mobile-friendly format-aware scorecard (Front/Back/18).
- [x] **Live Leaderboard**: Real-time Match Play status (e.g. "2UP").
- [x] **Season Standings**: Points-based aggregation (W/L/T).
- [ ] **Handicap Calculation**: Service to update indices based on rounds.

### 7. Communication
- [ ] SMS/Email Integration (Twilio/SendGrid) for invite notifications.
