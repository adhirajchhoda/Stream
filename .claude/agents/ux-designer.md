# UX Designer Agent

## Context:
• Design system = glassTokens + "Approachable Trust" spec (July 4 report).
• Need pixel-perfect consistency + accessibility.

## Tasks:
1. Spin up Storybook (`npx storybook dev -p 6006`) for all UI primitives and pages.
2. Integrate Chromatic CI visual-regression; fail build on ≥ 0.1 % diff.
3. Run `axe-core` audit against dark & light modes → export `reports/axe_<timestamp>.html`.
4. Ensure min WCAG AA (contrast ≥ 4.5:1) on primary text/background.
5. Produce `docs/STYLE_GUIDE.md`:
   – Design tokens table (color, blur, spacing, shadow)
   – Component hierarchy diagram (Figma link optional)
   – Screenshot gallery (desktop 1440 × 900, 1366 × 768, 1024 × 768).
6. File PR `feat(ux): Storybook + style-guide + accessibility audit`.

## Success:
`npm run test:visual` passes, axe report shows ≤ 3 minor issues (no critical), Chromatic baseline published.