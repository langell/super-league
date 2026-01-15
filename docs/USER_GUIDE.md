# 📘 Golf League Manager - User Guide

This guide is for league administrators who will be managing their golf league using this application.

## Table of Contents
1. [Getting Started](#getting-started)
2. [League Setup](#league-setup)
3. [Managing Members](#managing-members)
4. [Course Management](#course-management)
5. [Season & Teams](#season--teams)
6. [Scheduling Rounds](#scheduling-rounds)
7. [Scoring](#scoring)
8. [Viewing Results](#viewing-results)

---

## Getting Started

### First Login
1. Navigate to your league's URL
2. Sign in with your credentials
3. You'll land on the dashboard showing all your leagues

### Dashboard Overview
The dashboard shows:
- **Your Leagues**: All leagues you're a member of
- **Quick Actions**: Create new league, view schedules
- **Recent Activity**: Latest scores and updates

---

## League Setup

### Creating a New League

1. Click **"Create New League"** from the dashboard
2. Fill in the league details:
   - **League Name**: e.g., "River Oaks Wednesday League"
   - **Slug**: URL-friendly name (auto-generated)
   - **Handicap Percentage**: Usually 90% (0.90) for most leagues
   - **Min Scores**: Minimum rounds needed for handicap (typically 3)

3. Click **Save**

### League Settings

Navigate to `League → Settings` to configure:
- **League Information**: Name, description
- **Handicap Rules**: Percentage, minimum scores
- **Season Defaults**: Team size, format preferences

---

## Managing Members

### Adding Members

**Option 1: Manual Entry**
1. Go to `League → Members`
2. Click **"Add Member"**
3. Enter:
   - First Name
   - Last Name
   - Email
   - Initial Handicap (optional)
4. Assign role: **Admin** or **Player**
5. Click **Save**

**Option 2: Bulk Invite**
1. Go to `League → Members`
2. Click **"Invite Members"**
3. Enter email addresses (one per line)
4. Click **Send Invites**

### Managing Handicaps

**View Member Handicaps**
- Go to `League → Members`
- Current handicap index shown next to each member

**Update Manually**
1. Click on a member's name
2. Click **"Edit"**
3. Update handicap field
4. Save changes

**Automatic Updates**
- Handicaps update automatically after each round is scored
- Based on USGA World Handicap System
- Uses best 8 of last 20 scores

### Member Roles

**Player**
- Can view scores and standings
- Can enter their own scores (if enabled)
- View league schedules

**Admin**
- All player permissions, plus:
- Create/edit seasons and teams
- Manage course information
- Generate schedules
- Edit all scores
- Manage members

---

## Course Management

### Adding a Course

**Option 1: AI Scorecard Scanner**
1. Go to `Courses → Add Course`
2. Click **"Scan Scorecard"**
3. Upload a photo of a scorecard
4. AI will extract:
   - Course name
   - City and state
   - Tee information
   - Hole details (par, yardage)
5. Review and adjust if needed
6. Click **Save**

**Option 2: Manual Entry**
1. Go to `Courses → Add Course`
2. Enter course details:
   - Course Name
   - City
   - State
3. Click **Next**

### Adding Tees

For each set of tees:
1. Click **"Add Tee"**
2. Enter:
   - **Tee Name**: e.g., "Blue", "White", "Red"
   - **Rating**: Course rating (e.g., 72.0)
   - **Slope**: Slope rating (e.g., 130)
   - **Par**: Total par (e.g., 72)
3. Save

### Adding Holes

For each tee, add hole details:
1. Select the tee
2. For each hole (1-18):
   - **Par**: 3, 4, or 5
   - **Yardage**: Distance in yards
   - **Handicap Index**: Difficulty ranking (1-18)
3. Save

---

## Season & Teams

### Creating a Season

1. Go to `League → Schedule → New Season`
2. Enter:
   - **Season Name**: e.g., "Spring 2024"
   - **Start Date**: When season begins
   - **End Date**: When season ends
3. Click **Create**

### Creating Teams

1. Within a season, click **"Teams"**
2. Click **"Create Team"**
3. Enter team name
4. Add team members (drag and drop or select)
5. Ensure teams are balanced (equal number of players)
6. Save

### Team Balance Tips
- Keep teams equal in size
- Balance handicaps across teams
- Consider player availability

---

## Scheduling Rounds

### Manual Schedule Creation

1. Go to `Schedule → New Round`
2. Select:
   - **Date**: When the round will be played
   - **Course**: Which course
   - **Tees**: Which set of tees
   - **Format**: Stroke play, match play, etc.
3. Click **Create**

### Automatic Schedule Generation

1. Go to `Schedule → Generate Schedule`
2. Select:
   - Number of weeks
   - Play frequency (weekly, bi-weekly)
   - Rotation preferences
3. Click **Generate**
4. Review and adjust as needed
5. Confirm

### Creating Matches

For match play formats:
1. Open a round
2. Click **"Setup Matches"**
3. Select:
   - Team vs Team OR
   - Player vs Player
4. Assign tees for each player
5. Click **Finalize Matches**

---

## Scoring

### Entering Scores

**Option 1: During Play (Scorecard Page)**
1. Navigate to `Round → [Date] → Scorecard`
2. Select player
3. Enter scores hole-by-hole
4. Scores save automatically
5. View live leaderboard

**Option 2: After Play (Batch Entry)**
1. Go to round details
2. Click **"Enter All Scores"**
3. Fill in the grid:
   - Rows = Players
   - Columns = Holes
4. Click **Save All**

**Option 3: AI Scanner**
1. Take photo of completed scorecard
2. Go to round page
3. Click **"Scan Scorecard"**
4. Upload photo
5. AI extracts all scores
6. Review and confirm
7. Save

### Score Verification

**Admin Override**
- Admins can edit any score
- Go to scorecard → Click score → Edit → Save

**Player Confirmation**
- Players receive notification to confirm scores
- Once confirmed, scores locked (admin can still edit)

---

## Viewing Results

### Leaderboard

**Accessing**
- Go to `League → Leaderboard`

**View Options**
- **By Season**: Current standings
- **By Round**: Individual round results
- **Overall**: All-time statistics

**Metrics Shown**
- Gross Score
- Net Score (with handicap)
- Rounds Played
- Average Score
- Current Handicap

### Player Statistics

1. Click on any player name
2. View:
   - Score history
   - Handicap trend
   - Best rounds
   - Course performance

### Team Standings

1. Go to `Teams` tab
2. View:
   - Team points
   - Win/Loss records
   - Individual contributions

### Exporting Data

1. Go to any results page
2. Click **"Export"**
3. Choose format:
   - CSV (Excel compatible)
   - PDF (printable)
4. Download

---

## Tips & Best Practices

### Before Your Season
- ✅ Add all courses you'll play
- ✅ Set up all members with accurate handicaps
- ✅ Create balanced teams
- ✅ Generate full season schedule

### Week of Play
- 📅 Confirm players are available
- 🏌️ Double-check tee assignments
- 📱 Share round link with players

### After Each Round
- 📊 Enter scores promptly
- ✅ Verify and confirm all scores
- 📢 Share leaderboard with league

### End of Season
- 🏆 Export final standings
- 📸 Save screenshots for records
- 🎉 Celebrate your winners!

---

## Troubleshooting

### Common Issues

**"I can't add a member"**
- Ensure you have Admin role
- Check email format is valid
- Verify email isn't already in use

**"Handicaps aren't updating"**
- Ensure minimum rounds have been played
- Check scores are confirmed
- Wait a few minutes for recalculation

**"AI scanner isn't working"**
- Ensure good photo quality (clear, well-lit)
- Try manual entry as backup
- Contact support if persistent

**"Can't see the leaderboard"**
- Ensure scores have been entered
- Check you're viewing the correct season/round
- Refresh the page

### Getting Help

1. Check this user guide
2. Review the FAQ (coming soon)
3. Contact your system administrator
4. Submit a bug report on GitHub

---

## Glossary

- **Gross Score**: Total strokes without handicap
- **Net Score**: Gross score minus handicap strokes
- **Handicap Index**: Official USGA handicap number
- **Course Rating**: Difficulty rating for scratch golfer
- **Slope Rating**: Difficulty rating for bogey golfer
- **Differential**: Calculation used for handicap (Score - Rating) × (113 / Slope)
- **Match Play**: Hole-by-hole competition format
- **Stroke Play**: Total score competition format

---

**Need more help?** Contact your league administrator or visit our [GitHub repository](your-repo-url) for technical support.
