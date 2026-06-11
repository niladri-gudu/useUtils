# Context Expansion: useUtils Application Specification & Agent Directives

## 🚨 CRITICAL UTILITY GENERATION RULE
You are an expert Frontend Engineer. You must strictly execute code generation by aligning the internal specifications below with the local `.agents/skills/` knowledge trees present in this workspace root. Never fallback to generic modern web dashboards (e.g., UtilsLab styles). Generate production-ready, fully functional, and structurally complete client-side code for any micro-utility requested.

---

## 🔌 Activated Local Agent Skills Grounding
When implementing code, you must actively cross-reference your logic with the following active modules in the workspace:
- **Framework Architecture:** `.agents/skills/astro/`
- **Styling Engine:** `.agents/skills/tailwind-4-docs/` & `.agents/skills/tailwind-css-patterns/`
- **UI/UX Mechanics:** `.agents/skills/frontend-design/`, `.agents/skills/web-design-guidelines/`, `.agents/skills/bencium-controlled-ux-designer/`, and `.agents/skills/bencium-innovative-ux-designer/`

---

## 🎨 The Raycast Design System Directive
Do NOT mimic competitive anti-patterns (no crowded grids, standard modern web layouts, or plain white/grey backgrounds). Synthesize your installed UX skills to enforce a premium, high-end desktop application feel:

- **Canvas Background:** Rich, velvety dark charcoal (`#151515`).
- **Surface Panels:** Floating, slightly elevated modular containers (`#1c1c1e`).
- **Dividers & Borders:** Thin, razor-sharp separation lines (`#2c2c2e` or Tailwind v4 `zinc-800`).
- **Typography:** Use `font-mono` for all raw inputs, tokens, parsed outputs, payloads, and structural configurations.
- **Accent System:** Pure Emerald Green (`#34d399`) applied intentionally and strictly for success states, active system toggles, and macro-action feedback loops.
- **Keyboard Shortcuts:** Anchor key interactive actions with fine-tuned contextual badges:
  `<kbd class="font-mono bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-400">⌘ V</kbd>`

---

## 🛠️ Global Architectural Requirements For All Tools

1. **Split-Pane UI Engine:** Always utilize an interactive layout (typically a two-column or balanced modular split). The left side handles raw input ingestion and state controls; the right side handles structural parsed outputs, interactive trees, or real-time data transformations.
2. **Instant Local Dynamics:** Outputs, computations, and visual structural transformations must occur completely in real-time on the client side. Never use loading animations for simple text/data evaluations; update the view dynamically as the user types or interacts.
3. **Macro Action Feedback:** Embed clean, micro-copy or interaction pill actions next to comprehensive block components and nested keys to streamline developer workflows.
4. **100% Privacy Assurance Guarantee:** Every utility view must feature a prominent, native Raycast-style status pill indicating: `"Processed locally in browser. Zero server transmission."` Developers must instantly feel secure passing sensitive keys, logs, or code blocks into the engine.

---

## ⚙️ Engineering Implementation Constraints

- **Architecture:** Core UI utilities must be built natively in a modern component framework (React/Vue/Svelte) under `src/components/[ToolName].*` and mounted into their respective Astro routes under `src/pages/tools/[tool-slug].astro` using the explicit `client:load` hydration directive.
- **Zero-Dependency Core:** Execute parsing, encoding, decoding, or data formatting using native JavaScript/Web APIs directly. Avoid external, bloated npm utilities unless explicitly requested.

---

## 🛑 AI Output Validation Rules
- Never provide mock boilerplate layouts or truncated code snippets using placeholders or `// TODO`.
- All engineering states (initial empty state, handling garbage/malformed inputs, processing, and validated success) must be fully coded and handled gracefully.
- All Tailwind utility classes must rigorously comply with v4 specification standards parsed from your local Tailwind documentation skills.

if creating a new page, add it to the sitemap.xml file

dont dfeploy after make every changes
i will say when to deploy and all that