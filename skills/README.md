# Skills

Personal Claude skills library bundled with `nexus-investment-suite`. Each skill lives in its own subdirectory with a `SKILL.md` (YAML frontmatter + body) and optional `references/`, `scripts/`, and `assets/`.

## Index

### Design & UI/UX
| Skill | Use for |
|---|---|
| [apple-ui-design](apple-ui-design/SKILL.md) | Apple-inspired clean, minimal, premium UI |
| [ui-ux-pro-max](ui-ux-pro-max/SKILL.md) | Broad UI/UX reference library (50 styles, 97 palettes, 9 stacks) |
| [design-taste-frontend](design-taste-frontend/SKILL.md) | Opinionated high-agency frontend with metric-based rules |
| [design-consultation](design-consultation/SKILL.md) | Full design-system consultation, generates DESIGN.md |
| [design-motion-principles](design-motion-principles/SKILL.md) | Motion audit by Emil Kowalski, Jakub Krehel, Jhey Tompkins (review-only) |
| [interaction-design](interaction-design/SKILL.md) | Microinteractions, feedback patterns, accessible interactions |
| [color-font-skill](color-font-skill/SKILL.md) | Presentation palettes and font pairings |
| [plan-design-review](plan-design-review/SKILL.md) | Designer-eye review of a live site (report-only) |

### Animation
| Skill | Use for |
|---|---|
| [animation-systems](animation-systems/SKILL.md) | Motion principles & tokens à la Stripe/Linear/Apple/Vercel |
| [awwwards-animations](awwwards-animations/SKILL.md) | Awwwards/FWA-level React animations (GSAP, Framer Motion, Anime.js, Lenis) |
| [gsap](gsap/SKILL.md) | Advanced GSAP timelines, ScrollTrigger, SVG morphing |

### Data & Finance
| Skill | Use for |
|---|---|
| [data-viz-2025](data-viz-2025/SKILL.md) | State-of-the-art data viz in React/Next/TS (Tufte + NYT Graphics) |
| [quant-analyst](quant-analyst/SKILL.md) | Risk metrics, backtesting, portfolio optimization, options |
| [stock-evaluator-v3](stock-evaluator-v3/SKILL.md) | Stock evaluation with technical + fundamental + 8 investor personas |

### Presentations
| Skill | Use for |
|---|---|
| [sora-pptx-design](sora-pptx-design/SKILL.md) | SORA weekly reports / Oberstufe presentations (Klasse 11/12) |
| [cowork-visuals](cowork-visuals/SKILL.md) | Stock images (Unsplash/Pexels/Wikimedia) + Napkin-style diagrams |

### Workflow & Meta
| Skill | Use for |
|---|---|
| [context-engineering](context-engineering/SKILL.md) | Optimize token cost & context window for Claude Code |
| [session-handoff-kay](session-handoff-kay/SKILL.md) | Copy-paste session summary for handoff to a new chat |
| [gepeto](gepeto/SKILL.md) | Pinokio launcher development |

## Overlapping Skills

Where multiple skills cover similar territory, each `description:` carries a `NOT for:` clause that routes Claude to the right choice:

- **Animation:** principles/tokens → `animation-systems`; React → `awwwards-animations`; pure GSAP → `gsap`; audit only → `design-motion-principles`.
- **Design:** Apple aesthetic → `apple-ui-design`; quick reference library → `ui-ux-pro-max`; high-agency defaults → `design-taste-frontend`; full design-system creation → `design-consultation`.

## Layout convention

```
skills/
  <skill-name>/
    SKILL.md              # required, with YAML frontmatter
    references/           # optional, long-form docs loaded on demand
    scripts/              # optional, executable helpers
    assets/               # optional, example files
```

`data-viz-2025/` and `stock-evaluator-v3/` are the Progressive Disclosure reference models — the main `SKILL.md` stays concise and points to deeper files in `references/`.
