# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`brilliantmanagers.info` — a personal Gatsby v2 static site about management, derived from the Stackbit Libris theme. Deployed via Netlify (`netlify.toml`: `npm run build` → `public/`). Content is authored as Markdown files committed to git; there is no separate CMS backend.

## Commands

```bash
npm install           # install deps (Node + npm; uses node-sass — Node 14 is the highest version known to work without rebuilds)
npm run develop       # local dev server at http://localhost:8000 (alias: npm start)
npm run build         # production build with --prefix-paths
npm run serve         # serve the built site
```

No test runner, no linter, no formatter is configured in this repo.

## Architecture

The site is data-driven Markdown → Gatsby pages, with template selection encoded in each page's frontmatter. Understanding the flow below is the difference between editing the right file and editing the wrong one.

### Page creation pipeline (custom plugins do the work)

Two local plugins under `plugins/` extend Gatsby's defaults:

- **`plugins/gatsby-source-data`** — reads every `*.yml` / `*.yaml` / `*.json` under `src/data/` (recursively) plus the root `site-metadata.json`, merges them into a single `SiteData` GraphQL node, and uses `chokidar` to hot-reload changes during `gatsby develop`. The merged tree is exposed to templates as `pageContext.site.data` (with `site-metadata` lifted to `pageContext.site.siteMetadata`).
- **`plugins/gatsby-remark-page-creator`** — for each `MarkdownRemark` node it (a) computes URL fields from the file path, then (b) calls `createPage` with `component: src/templates/${frontmatter.template}.js`. So **every markdown file MUST declare a `template:` in its frontmatter** matching a file in `src/templates/`.

The full list of pages is passed into every page's `pageContext.pages`, which is how `blog.js`, `docs.js`, and `SectionDocs` can iterate siblings without their own GraphQL queries.

### Templates (`src/templates/`)

Pick the right one by setting `template:` in markdown frontmatter:

| Template | Used for | Notes |
| --- | --- | --- |
| `advanced` | The home page and any layout assembled from section blocks | Reads `frontmatter.sections[]` and dynamically renders one React component per entry. The component name is `_.upperFirst(_.camelCase(section.type))` — e.g. `section_hero` → `SectionHero`. Adding a new section type means adding a component **and** exporting it from `src/components/index.js`. |
| `page` | Plain content pages (`overview.md`, `the-tool.md`, `resources.md`) | Renders frontmatter title/subtitle + the markdown HTML. |
| `docs` | Pages under `src/pages/the-guide/` | Renders a sidebar (`DocsMenu`) plus child-page links derived from `pageContext.site.data.doc_sections` (configured in `src/data/doc_sections.yml`). |
| `blog` | The blog index (`src/pages/blog/index.md`) | Lists every page whose URL starts with `/blog`, ordered by `frontmatter.date` desc. |
| `post` | Individual blog posts under `src/pages/blog/` | Standard post layout with `moment-strftime` date formatting. |

The page templates use a `graphql` query block that exists **only to trigger Gatsby's hot reload** during `develop` — the actual data comes from `pageContext`, not GraphQL. Don't be misled into adding fields to the query expecting them to flow through.

### Content authoring locations

- `src/pages/*.md` — top-level pages. Filename becomes URL slug.
- `src/pages/the-guide/<section>/...` — the documentation guide. Section list lives in `src/data/doc_sections.yml`; child pages need a `weight` frontmatter for ordering.
- `src/pages/blog/*.md` — blog posts. Use `template: post`.
- `static/` — static assets copied verbatim to the build output.

### Site-wide configuration

- `site-metadata.json` — header nav, footer, palette choice (blue / green / navy / violet), and social links.
- `gatsby-config.js` — wires the SASS plugin (with a custom `getPaletteKey()` function that maps the active palette's hex values into SASS), Google gtag (`G-1BSMVXG0PJ`), the Stackbit menus plugin, and both local plugins.
- `stackbit.yaml` — content model schema for the Stackbit visual editor. Update this if you add new section types or frontmatter fields and want them editable in Stackbit.

### Styling

All styles entered through `src/sass/main.scss` (imported by `Layout.js`). The palette system is driven by `site-metadata.json` → `gatsby-config.js` → the custom `getPaletteKey()` SASS function — changing colors in palette objects flows through to compiled CSS, no separate stylesheet edit needed.

## Things that bite

- **Gatsby pinned to 2.22.17** with **`node-sass` 4.x**. Newer Node versions break the native build. If `npm install` fails, the issue is almost always Node version.
- The `imports/` directory referenced in some menu links does not exist in `src/pages/` — broken links are a content issue, not a code issue.
- `gatsby-source-data` is the only thing that exposes `src/data/*.yml` to templates. If a new data file isn't showing up in `pageContext.site.data`, restart `develop` (chokidar normally handles this, but cold start is the fallback).
- Section components rendered by `advanced.js` are resolved by **string-to-component lookup via `src/components/index.js`**. A new component file that isn't re-exported from `index.js` will silently fail to render.
- The footer content in `site-metadata.json` still carries the Stackbit attribution copy from the original theme — edit there, not in `Footer.js`.
