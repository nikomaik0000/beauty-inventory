# NIKO Website Development Rules

Please follow these rules for all future projects.

---

# Development Philosophy

Prioritize development in this order:

1. UI / UX
2. Responsive Design
3. Features
4. Database Integration
5. Deployment

I prefer to perfect the UI before connecting the database.

---

# Project Structure

- Always create a complete standalone project.
- Do NOT generate diffs or patch files unless I explicitly ask for them.
- Always provide complete files.
- The project must compile successfully after every phase.
- Never leave the project in a broken state.

---

# Development Phases

If the project is large, split it into logical phases.

Example:

- Phase 1 – Project Setup
- Phase 2 – UI
- Phase 3 – Admin
- Phase 4 – Database
- Phase 5 – Polish

Each phase must be fully runnable.

---

# Preview Mode (Very Important)

The project must work before Supabase is configured.

Please implement a Preview Mode.

Requirements:

- No Supabase required.
- No runtime errors.
- The UI should render completely.
- Navigation should work.
- Components should work.
- Responsive layouts should work.
- Database features can be disabled temporarily.

If Supabase is unavailable:

- Use mock data.
- Skip authentication.
- Display a banner:

"Running in Preview Mode (Supabase not configured)."

---

# Production Mode

When the following environment variables exist:

NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY

Automatically switch to Production Mode.

No code changes should be required.

---

# Mock Data

Always provide realistic mock data during development.

Include at least 20–30 records.

Mock data should allow testing:

- Search
- Filters
- Sorting
- Cards
- Tables
- Responsive layouts

---

# UI Design

Preferred style:

- Elegant
- Minimal
- Comfortable spacing
- Soft warm beige color palette
- Premium feeling
- High readability

Avoid:

- ERP style
- Warehouse software
- Enterprise dashboards
- Overly colorful interfaces

---

# Design Language

When a reference project is provided:

Reuse its overall design language, including:

- Typography
- Color palette
- Cards
- Buttons
- Search bars
- Filter panels
- Tags
- Border radius
- Shadows
- Animations

The new application should feel like another app in the same design family.

---

# Responsive Design

Desktop is the primary experience.

Tablet should work well.

Mobile should feel like a native application.

Avoid horizontal scrolling whenever possible.

---

# Dark Mode

Support:

- Light
- Dark
- System

---

# Components

Create reusable components.

Avoid duplicate code.

Prefer shared UI components whenever possible.

---

# Forms

Use:

- React Hook Form
- Zod

for validation.

---

# Database Design

Design the database for future scalability.

Avoid hardcoded values.

The following should always come from database tables:

- Categories
- Subcategories
- Brands
- Tags
- Settings

---

# Admin Panel

Provide full CRUD functionality.

Prefer inline editing when appropriate.

---

# Search

Search should be:

- Fast
- Instant
- Case insensitive

---

# Filters

Filters should be dynamic.

Only display values that actually exist.

Never show empty filter options.

---

# Sorting

Sorting should be configurable.

Avoid hardcoded sorting logic.

---

# Empty States

Every page should have friendly empty states.

Never leave blank screens.

---

# Loading States

Every asynchronous page should include loading UI.

---

# Error Handling

The application should never crash.

If an API fails:

Display a friendly error message.

---

# Images

Support image placeholders.

Broken images should never break layouts.

---

# Icons

Use Lucide Icons consistently.

---

# Animations

Use Framer Motion.

Keep animations subtle and elegant.

Avoid excessive motion.

---

# Accessibility

Support:

- Keyboard navigation
- ARIA labels
- Semantic HTML

---

# Code Quality

Use:

- TypeScript Strict Mode
- Reusable utilities
- Clear naming conventions

Avoid magic numbers.

---

# Documentation

Always provide:

- README
- Installation instructions
- Environment variable examples
- Folder structure explanation
- Database migration files (if applicable)

---

# Deliverables

Do NOT generate diffs.

Always generate complete files.

When updating existing code:

- Clearly indicate which files were created.
- Clearly indicate which files were modified.

---

# My Personal Preferences

I prefer clean and elegant applications.

Please keep the visual style similar across all my projects.

Design preferences:

- Warm beige color palette
- Rounded corners (12–16px)
- Comfortable spacing
- Soft colors
- Premium appearance
- Clean cards
- Beautiful tags
- Minimal design

Development preferences:

- UI first
- Database later
- Complete files only
- Preview Mode by default
- Mock data included
- Easy future expansion

Please optimize for maintainability rather than quick hacks.

If there are multiple implementation options:

- Briefly explain the trade-offs.
- Choose the most maintainable solution.

If requirements are incomplete:

Make a reasonable assumption and continue development.

Do not stop progress waiting for clarification unless absolutely necessary.