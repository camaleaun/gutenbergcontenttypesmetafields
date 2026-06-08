# Gutenberg Content Types — Meta Fields

Proof-of-concept extension plugin for [gutenbergcontenttypes](https://github.com/camaleaun/gutenbergcontenttypes).

Adds a **Meta Fields** section to the post type edit form where you can
configure a sortable, duplicatable, removable list of custom meta fields —
including conditional logic — that then appear as a **Settings** meta box
on the post edit screen.

---

## Requirements

- WordPress ≥ 6.5
- PHP ≥ 8.1
- `gutenbergcontenttypes` plugin active (`Requires Plugins` header enforces this)
- Node 20+ / npm 10+ (build only)

---

## Build

```bash
cd wp-content/plugins/gutenbergcontenttypesmetafields
npm install
npm run build      # production
npm run dev        # watch mode
```

Output goes to `build/`. The PHP plugin enqueues `build/index.tsx.js`
(and `build/style-index.tsx.css`) automatically via `admin_enqueue_scripts`.

**Dependencies bundled:** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/modifiers`, `@dnd-kit/utilities`

**Externalized (loaded from WordPress):** all `@wordpress/*` packages, React, React DOM

---

## Architecture

### PHP side (`lib/`)

| File | Purpose |
|---|---|
| `sections.php` | Registers the "Meta Fields" section (priority 40) via `gct_post_type_form_sections` |
| `sanitize.php` | `gct_sanitize_post_type_meta` filter — validates `mf_fields` array + `typeConfig` per field type |
| `js.php` | `gct_export_post_type` injects `meta_fields` into exports; `gct_export_schema` extends the JSON Schema |
| `meta-box.php` | Registers a "Settings" meta box for every post type with `mf_fields`; renders + saves field values |

Meta values are stored in `_gct_meta` (JSON, managed by the core plugin's extension API)
as `mf_fields: MetaField[]`.

Each field's runtime value is stored individually as `_mf_{field_name}` post meta.

### JS side (`src/`)

| Path | Purpose |
|---|---|
| `index.tsx` | Entry point — calls `gctRegisterSectionRenderer('meta_fields', renderer)` |
| `types.ts` | TypeScript types: `MetaField`, `SelectConfig`, `NumberConfig`, `TextConfig`, `MediaConfig`, `ConditionalLogic`, … |
| `components/meta-field-repeater/` | Sortable repeater (DnD Kit) with collapse/expand, duplicate, remove |
| `components/meta-field-repeater/field-item.tsx` | Single field item: Label→Name auto-slug, all field props, FieldTypeConfigPanel |
| `components/field-type-config/` | Per-type config panels: options repeater (select/radio/checkbox), number range, text config, media types |
| `components/conditional-modal/` | Full conditional logic modal: enable toggle, AND/OR relation, multiple rules (field + operator + value) |

### How the renderer connects

1. `gutenbergcontenttypes` injects `window.gctRegisterSectionRenderer` via an inline script on `gct-flags` (runs before the ES module)
2. `index.tsx` calls `gctRegisterSectionRenderer('meta_fields', renderer)`
3. `ExtensionSectionPanel` (core) detects the renderer on every render and calls `renderer(container, { meta, onChange })`
4. The renderer uses a `WeakMap<HTMLElement, Root>` so `createRoot` is called only once per container — subsequent calls use `root.render()` to update props

---

## MetaField type

```ts
interface MetaField {
  id          : string;       // crypto.randomUUID()
  label       : string;       // Display label
  name        : string;       // DB key → stored as _mf_{name}
  objectType  : 'field' | 'tab' | 'accordion' | 'endpoint';
  fieldType   : FieldType;    // 19 types: text|date|time|datetime|textarea|wysiwyg|
                              //           switcher|checkbox|iconpicker|media|gallery|
                              //           radio|repeater|select|number|colorpicker|
                              //           posts|html|map
  description : string;
  fieldWidth  : '100%' | '75%' | '66.6%' | '50%' | '33.3%' | '25%';
  revisionSupport: boolean;
  conditional : ConditionalLogic;
  typeConfig ?: SelectConfig | NumberConfig | TextConfig | MediaConfig;
}
```

**`typeConfig` by fieldType:**
- `select` / `radio` / `checkbox` → `SelectConfig { options: SelectOption[], multiple?: boolean }`
- `number` → `NumberConfig { min?, max?, step? }`
- `text` / `textarea` → `TextConfig { maxLength?, placeholder? }`
- `media` / `gallery` → `MediaConfig { allowedTypes?: string[] }`

---

## Meta Box rendering

`meta-box.php` reads `mf_fields` from `_gct_meta` for each active post type
and registers a "Settings" meta box (normal/high priority).

Fields are grouped into rows by `fieldWidth`:
- `100%` → own row
- `50% + 50%`, `33.3% + 33.3% + 33.3%` → shared row (fills to ~100%)

**Field renderers:** switcher (CSS toggle), select, radio, checkbox, textarea,
number, date/time/datetime, colorpicker, media (wp.media picker), text.

Values are saved as `_mf_{name}` post meta on `save_post`.

---

## Export integration

`js.php` hooks into the GCT export pipeline:

- `gct_export_post_type` → appends `meta_fields` key to each exported post type
- `gct_export_schema` → adds `meta_fields` property to `definitions.post_type`
  in the JSON Schema served at `GET /gct/v1/schema`; removes `additionalProperties: false`

The `$schema` URL embedded in YAML/JSON exports points to this filtered endpoint,
so `yaml-language-server` validates `meta_fields` without warnings.

---

## Known limitations / next steps

- Conditional logic is stored and UI is complete, but runtime enforcement
  (show/hide fields in the meta box based on conditions) is not yet implemented
- `tab` / `accordion` / `endpoint` object types are registered but not rendered
  in the meta box (only `field` type is rendered)
- Import: `meta_fields` from YAML/JSON is not yet applied back to `_gct_meta`
  during import (only the post type config is imported by the core plugin)
- `repeater` field type has no nested config UI yet
- `posts` / `iconpicker` field types have no specialized UI yet
