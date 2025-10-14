# Design System Guidelines

_Last Updated: 2025-10-03_<br>
_Owner: Frontend Lead_

## Purpose

Document the design tokens, component standards, accessibility benchmarks, and usage rules for the LetsWriteABook UI as rebuilt under Phase 7.

## Contents

- Token architecture (colors, typography, spacing, radii).
- Component library overview (DaisyUI variants + custom extensions).
- Accessibility checklist (WCAG 2.1 AA targets, keyboard navigation, screen reader cues).
- Theming and internationalization considerations.

## Next Steps

- ✅ `packages/ui-tokens` exposes initial brand colors, radii, and shadow tokens. CSS variables are registered at runtime for Tailwind/DaisyUI consumption.
- ✅ Tailwind CSS + DaisyUI provide the rapid prototyping surface for Phase 7.
- ⏳ Document component catalog (navigation shell, status pills, timeline) once Storybook stories are scaffolded.
- ⏳ Cross-link to `customization-guide.md` for theming workflows and token overrides.
