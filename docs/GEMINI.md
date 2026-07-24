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

dont deploy after make every changes
i will say when to deploy and all that

and also use the utils-engine to keep the core logic for the tool
so that later i can use that to make an npm package

# ==========================================================
# SEO & Content Architecture Rules
# ==========================================================

Every tool page is a first-class landing page.

Never create thin utility pages.

Each tool page should continuously evolve into the best resource on the internet for its topic.

When modifying or creating any tool page, always improve:

- semantic HTML
- metadata
- internal linking
- keyword coverage
- accessibility
- structured data
- search intent coverage

Every tool page should naturally include:

- What the tool does
- Why developers use it
- Practical examples
- Common mistakes
- Edge cases
- Best practices
- Language-specific recommendations
- Framework-specific recommendations
- FAQ
- Related tools
- Official references whenever applicable

Avoid generic AI-generated filler.

Content should be original, technically accurate, and educational.

Prefer diagrams, comparison tables, code examples, and interactive demonstrations over unnecessary paragraphs.

Whenever possible, improve pages rather than simply adding more text.

All examples should be realistic and based on actual developer workflows.

# ==========================================================
# Site Growth Strategy
# ==========================================================

Every utility should be treated as a content cluster rather than a single page.

Whenever a new tool is implemented or an existing tool is modified:

1. Identify all relevant keyword variations.
2. Group them by search intent.
3. Determine which deserve dedicated landing pages.
4. Reuse the same utility engine wherever possible.
5. Generate unique metadata and supporting content for each landing page.

Landing pages should differ through:

- title
- description
- H1
- introduction
- examples
- FAQs
- internal links
- supporting educational content

Avoid duplicate pages.

Avoid doorway pages.

Every landing page must provide unique educational value.

The long-term objective is to grow the project into hundreds of high-quality indexable pages built around reusable utility engines.

Always update sitemap.xml whenever new indexable pages are created. 

# ==========================================================
# Search Intent Rules
# ==========================================================

Never optimize pages for only one broad keyword.

Always identify:

- primary keyword
- secondary keywords
- long-tail keywords
- People Also Ask questions
- related searches

Pages should answer the complete search intent surrounding a topic rather than simply defining it.

For example:

Instead of only answering:

"What is snake_case?"

Also answer:

- How do I convert camelCase to snake_case?
- Why does Python use snake_case?
- When should I use kebab-case?
- What naming convention does React use?
- Can JSON keys use kebab-case?
- Is PascalCase the same as UpperCamelCase?

Search intent should drive the structure of every page.

