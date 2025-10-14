# UX Customization Playbook

_Last Updated: 2025-10-07_<br>
_Owner: Frontend Lead_

The rebuild now centralizes theming in `@letswriteabook/ui-tokens` and mirrors those values into Tailwind, DaisyUI, Storybook, and runtime CSS variables. Use this guide whenever you need to tweak colors, typography, spacing, or add a new light/dark variant.

## Before You Begin
- Install dependencies and link workspaces: `pnpm install` (run from repo root).
- Familiarize yourself with the token map in `packages/ui-tokens/src/index.ts` and the runtime injector in `apps/web/src/app/styles/register-tokens.ts`.
- Launch Storybook to preview changes quickly: `pnpm --filter @letswriteabook/web storybook` (theme toggle lives in the toolbar).

## Workflow
1. **Update or extend tokens**
	- Edit `packages/ui-tokens/src/index.ts`.
	- Add semantic entries (e.g., `tokens.color.status.escalation`) rather than hard-coding hex values downstream.
	- For new themes, append to `tokens.themes` with `name`, semantic colors, and nested `text` shades.
	- Rebuild the package so consumers pick up the new constants:

	  ```powershell
	  pnpm --filter @letswriteabook/ui-tokens build
	  ```

2. **Propagate variables to runtime**
	- Ensure any additional tokens are surfaced in `apps/web/src/app/styles/register-tokens.ts`. The helper writes CSS variables for both themes into a `<style>` tag on load.
	- If you add theme-specific values, extend `getThemeVariables` so dark/light variants stay in sync.

3. **Wire tokens into Tailwind & DaisyUI**
	- Update `apps/web/tailwind.config.cjs` to expose new CSS variables via `theme.extend.colors`, `spacing`, `borderRadius`, etc.
	- Use the shared helper `buildDaisyTheme` to keep DaisyUI themes (`lwb`, `lwb-dark`) aligned with token values. Avoid manual hex edits here.

4. **Document variants in Storybook**
	- Stories live alongside components (e.g., `apps/web/src/features/**/components/*.stories.tsx`).
	- Use the theme toolbar (☾ icon) to QA both modes—icons, typography, and surface tokens should respond automatically.
	- Add descriptions/controls for props that impact appearance so designers can test permutations.

5. **Capture references and share**
	- Save annotated screenshots or recordings to `docs/assets/ui/` when introducing notable visual changes.
	- Include release notes in the PR description and link to any design specs or Figma resources.

## Validation Checklist
- `pnpm --filter @letswriteabook/web test` ✅ (Vitest suites).
- `pnpm --filter @letswriteabook/web storybook -- --smoke-test` ✅ (ensures Storybook builds with both themes).
- Manual a11y spot-check using the Storybook a11y panel + keyboard navigation across high-risk components.
- Confirm bundle impact with the Vite analyzer (`pnpm --filter @letswriteabook/web build` + review output) if fonts/assets were added.

## Rollback
- `git revert` the token and config commits (tokens, Tailwind, Storybook) in a single PR to keep history readable.
- If runtime variables cause issues, remove the injected `<style>` block by reverting `register-tokens.ts` and re-run Storybook to confirm.
- Post a short note in the UI channel summarizing what was rolled back and why, so the roadmap stays accurate.
