# Features Plan

## 1. Authentication Upgrades

### Email Login
Need to support users who prefer email/password instead of social login.
- **Action**: Add `Resend` provider for Magic Links (Passwordless) OR Credentials provider (Email/Password).
    - *Decision*: NextAuth strongly recommends Magic Links or external providers for security. Credentials require manual salt/hash/verify. Given the request "login for an email user", Magic Links are the modern "Email User" standard in NextAuth, but users often mean "Password".
    - *Plan*: Implement **Magic Links** via `Resend` (easier, more secure) OR **Credentials** (requires `bcrypt`, `password` column).
    - *Selected Approach*: **Magic Links** (Email Provider) is the safest default for "Email User" without managing passwords. If user insists on passwords, we pivot.
- **Deps**: `resend` SDK, `next-auth/providers/resend`.

### Facebook Login
- **Action**: Add `Facebook` provider to `auth.config.ts`.
- **Environment**: Needs `FACEBOOK_CLIENT_ID` and `FACEBOOK_CLIENT_SECRET`.

## 2. Notification Service
Centralized service for sending system messages (Sub requests, scoring updates).

- **Infrastructure**:
    - Use `Resend` for emails?
    - Use `Twilio` for SMS? (Schema already has `notificationPreference: "sms" | "email"`).
- **Implementation**:
    - Create `src/lib/notifications.ts`.
    - Function: `sendNotification({ userId, type, title, message, data })`.
    - Resolves user's preference (email vs SMS) and dispatches accordingly.

## 3. Sub Request System
Allow players to request substitutes for a match.

- **Schema Changes**:
    - New Table: `sub_requests`
        - `id`
        - `match_player_id` (The slot needing a sub)
        - `requested_by_user_id`
        - `status` ('open', 'fulfilled', 'cancelled')
        - `created_at`
    - New Table: `sub_request_invites` (Optional, if targeting specific people)
        - `sub_request_id`
        - `invited_user_id`
        - `status` ('pending', 'accepted', 'declined')

- **UI Changes**:
    - **Player Dashboard**: "Request Sub" button on scheduled matches.
    - **Sub Dashboard**: List of "Open Sub Requests".
    - **Notification**: When request is made -> Notify Subs.

## Implementation Steps

### Phase 1: Authentication Extension
1.  [ ] Install `resend`.
2.  [ ] Configure `Resend` provider in `auth.config.ts`.
3.  [ ] Configure `Facebook` provider in `auth.config.ts`.
4.  [ ] Update Login Page to show new options.

### Phase 2: Notification Infrastructure
1.  [ ] Create `src/lib/notifications` module.
2.  [ ] Implement `sendEmail` (Resend).
3.  [ ] Implement `sendSms` (Twilio or Console Log for now if keys missing).

### Phase 3: Sub Request Logic
1.  [ ] Create DB migrations for `sub_requests`.
2.  [ ] Create Server Actions: `createSubRequest`, `acceptSubRequest`.
3.  [ ] UI: Add "Request Sub" flow.
