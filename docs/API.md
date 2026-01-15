# 🔌 Golf League Manager - API Documentation

This document describes the REST API endpoints available in the Golf League Manager application.

## Base URL

```
http://localhost:3000/api  # Development
https://your-domain.com/api # Production
```

## Authentication

All API requests require authentication via session cookies. Users must be logged in through the NextAuth authentication flow.

## Endpoints

### Leagues

#### GET /api/leagues
Get all leagues for the authenticated user.

**Response**
```json
{
  "leagues": [
    {
      "id": "uuid",
      "name": "River Oaks Wednesday League",
      "slug": "river-oaks-wednesday",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### POST /api/leagues
Create a new league.

**Request Body**
```json
{
  "name": "My Golf League",
  "slug": "my-golf-league",
  "handicapPercentage": "0.90",
  "minScoresToCalculate": 3
}
```

**Response**
```json
{
  "success": true,
  "league": {
    "id": "uuid",
    "name": "My Golf League",
    "slug": "my-golf-league"
  }
}
```

---

### Scores

#### POST /api/scores
Save or update a score for a player on a specific hole.

**Request Body**
```json
{
  "matchId": "uuid",
  "playerId": "uuid", 
  "holeId": "uuid",
  "grossScore": 4,
  "isAdminOverride": false
}
```

**Validation Rules**
- `grossScore`: Must be between 1-20
- `matchId`, `playerId`, `holeId`: Must be valid UUIDs
- User must be authorized (player themselves or admin)

**Response**
```json
{
  "success": true,
  "score": {
    "id": "uuid",
    "matchPlayerId": "uuid",
    "holeId": "uuid",
    "grossScore": 4,
    "netScore": 4,
    "createdAt": "2024-01-15T14:30:00Z"
  }
}
```

**Error Responses**
```json
{
  "success": false,
  "error": "Unauthorized: Cannot edit other players' scores"
}
```

```json
{
  "success": false,
  "fieldErrors": {
    "grossScore": ["Gross score must be between 1 and 20"]
  }
}
```

---

## Server Actions

In addition to REST endpoints, the app uses Next.js Server Actions for most operations. These are called directly from components.

### Common Server Actions

Located in `src/app/actions.ts`:

#### League Management
- `createLeague(formData)` - Create new league
- `updateLeagueSettings(formData)` - Update league settings
- `addMemberToLeague(formData)` - Add a member
- `removeMemberFromLeague(formData)` - Remove a member

#### Course Management  
- `createCourse(formData)` - Add a course
- `updateCourse(formData)` - Edit course details
- `deleteCourse(formData)` - Remove a course
- `createTee(formData)` - Add tee to course

#### Season & Teams
- `createSeason(formData)` - Start new season
- `createTeam(formData)` - Create team
- `addMemberToTeam(formData)` - Add player to team

#### Scoring & Rounds
- `setupMatch(formData)` - Configure a match
- `generateSchedule(formData)` - Auto-generate schedule
- `scanScorecardAction(formData)` - AI scorecard scan

### Server Action Response Format

All server actions return:

```typescript
type ActionResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}
```

**Success Example**
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "Spring 2024" },
  "message": "Season created successfully"
}
```

**Error Example**
```json
{
  "success": false,
  "error": "Unauthorized",
  "fieldErrors": {
    "name": ["Name is required"]
  }
}
```

---

## Data Models

### Organization (League)
```typescript
{
  id: string;              // UUID
  name: string;            // League name
  slug: string;            // URL-friendly slug
  handicapPercentage: string; // e.g., "0.90"
  minScoresToCalculate: number; // e.g., 3
  createdAt: Date;
}
```

### User
```typescript
{
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
}
```

### League Member
```typescript
{
  id: string;
  userId: string;
  organizationId: string;
  role: 'admin' | 'player' | 'sub';
  handicap: string;  // Decimal string
  joinedAt: Date;
}
```

### Course
```typescript
{
  id: string;
  name: string;
  city?: string;
  state?: string;
  createdAt: Date;
}
```

### Tee
```typescript
{
  id: string;
  courseId: string;
  name: string;           // e.g., "Blue"
  rating: string;         // e.g., "72.0"
  slope: number;          // e.g., 130
  par: number;            // e.g., 72
}
```

### Hole
```typescript
{
  id: string;
  teeId: string;
  holeNumber: number;     // 1-18
  par: number;            // 3, 4, or 5
  handicapIndex: number;  // 1-18 (difficulty)
  yardage?: number;
}
```

### Season
```typescript
{
  id: string;
  organizationId: string;
  name: string;           // e.g., "Spring 2024"
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
}
```

### Team
```typescript
{
  id: string;
  organizationId: string;
  name: string;
  createdAt: Date;
}
```

### Round
```typescript
{
  id: string;
  seasonId: string;
  courseId: string;
  playDate: Date;
  createdAt: Date;
}
```

### Match
```typescript
{
  id: string;
  roundId: string;
  createdAt: Date;
}
```

### Match Player
```typescript
{
  id: string;
  matchId: string;
  userId: string;
  teeId: string;
  handicapUsed: string;
}
```

### Score
```typescript
{
  id: string;
  matchPlayerId: string;
  holeId: string;
  grossScore: number;     // Actual strokes
  netScore: number;       // With handicap applied
  isAdminOverride: boolean;
  createdAt: Date;
  updatedAt?: Date;
}
```

---

## Status Codes

The API uses standard HTTP status codes:

- `200 OK` - Successful GET request
- `201 Created` - Successful POST request
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not authorized
- `404 Not Found` - Resource doesn't exist
- `500 Internal Server Error` - Server error

---

## Rate Limiting

Currently no rate limiting is implemented. Consider adding rate limiting in production.

---

## Error Handling

### Validation Errors

Validation errors return field-specific messages:

```json
{
  "success": false,
  "fieldErrors": {
    "email": ["Invalid email address"],
    "handicap": ["Handicap must be between -10 and 54"]
  }
}
```

### Authorization Errors

```json
{
  "success": false,
  "error": "Unauthorized: Admin access required"
}
```

### Server Errors

```json
{
  "success": false,
  "error": "An unexpected error occurred"
}
```

---

## Development

### Adding New Endpoints

1. Create route handler in `src/app/api/[route]/route.ts`
2. Use Zod validation schemas from `src/lib/validations.ts`
3. Check authorization using `getServerSession`
4. Return consistent `ActionResponse` format
5. Add tests in `src/app/api/[route]/[route].test.ts`

### Testing API Endpoints

```bash
# Unit tests
npm test src/app/api/leagues/leagues.test.ts

# Manual testing
curl -X GET http://localhost:3000/api/leagues \
  -H "Cookie: your-session-cookie"
```

---

## Webhooks (Future)

*Webhook support is planned for future releases to enable integrations with external services.*

---

## GraphQL (Not Supported)

This API is REST-only. GraphQL is not currently supported.

---

For questions or issues, please [open an issue](your-repo-url/issues) on GitHub.
