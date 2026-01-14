# Design & UX Guidelines

## Design Philosophy
- **Premium & Dark**: The UI uses a deep dark mode (`bg-[#0a0a0a]`, `zinc-900`) with emerald accents to convey a premium, modern sports aesthetic.
- **Clean & Focused**: Interfaces are designed to be uncluttered, focusing on the data (scorecards, player lists) with clear calls to action.
- **Responsive**: All pages are built to work on desktop and mobile, critical for users entering scores on the course.

## Color Palette
- **Backgrounds**: 
  - Main: `#0a0a0a` (Near Black)
  - Cards/Containers: `zinc-900`
  - Inputs: `zinc-950`
- **Accents**: 
  - Primary: `emerald-500` (Success, Primary Actions, Highlights)
  - Secondary: `zinc-500` (Subtext, Muted elements)
  - Danger: `red-500` (Delete, Hazardous actions)
- **Text**:
  - Headings/Body: `white`
  - Muted: `zinc-400` / `zinc-500`

## Key UI Components

### Navigation
- **Dashboard Layout**: A sidebar/top-bar hybrid that provides access to key league areas: Overview, Members, Courses, Settings.
- **Breadcrumbs**: Explicit "Back to..." links are used for navigation depth (e.g., Back to Members -> Member Edit).

### Forms & Inputs
- **Styled Inputs**: Custom styled `input` and `select` elements with stripped browser defaults.
  - Large click areas for mobile friendliness.
  - `focus:border-emerald-500` for active states.
- **Server Feedback**: Forms use `useActionState` (or direct server action calls) and allow for inline validation messages.

### Special Components
- **ScorecardScanner**: A complex client component that handles:
  - Drag-and-drop file upload.
  - Image preview.
  - Loading states (Scanning...).
  - Editable form preview of extracted AI data before saving.
- **Member Lists**: Grid/Table hybrid layouts that show player avatars, roles, and quick actions.

## Icons
- **Lucide React**: Used throughout for consistent, clean SVG iconography.
