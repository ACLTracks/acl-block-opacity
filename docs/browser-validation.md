# Phase 4 and Phase 5 browser validation

This record covers the real-WordPress validation run performed on August 6, 2026. Versions below are test evidence, not declared compatibility floors.

## Environment

- WordPress 7.0.3 at `http://localhost:10010/`
- Gutenberg plugin not separately active
- PHP 8.2.29 and MySQL 8.4.0 in LocalWP
- Google Chrome / Chromium 150.0.7871.189
- Playwright 1.62.1 through `@wordpress/e2e-test-utils-playwright` 1.52.0
- Node.js 24.15.0 and npm 11.12.1
- Serial browser suite with one worker against the real LocalWP database

The automated run used a temporary administrator and exact test records. Test-created posts, patterns, Global Styles changes, theme changes, and activation changes were restored or removed after their scenarios.

## Tested themes

- Twenty Twenty-Five 1.5, a current installed default block theme
- ACL Block Opacity Palette Collision Fixture 1.0.0
- ACL Trace 3.0.8
- BlankSlate 2026, a classic theme using the block editor

This is a deliberately limited matrix and does not establish broad theme compatibility.

## Tested blocks and workflows

Paragraph, Heading, Group, Buttons/Button, List, Quote, Cover, and the minimal `acl-opacity-e2e/standard-color` fixture were exercised. The fixture registers documented text and background color supports and proves that eligibility is capability-based rather than limited to core block names.

The run passed the following behaviors:

- clean activation and real Inspector Controls rendering;
- immediate computed-style preview for custom and preset-derived text/background colors;
- standard `style.color.text` and `style.color.background` persistence with mutually exclusive preset attributes removed atomically;
- native standard-attribute changes reflected without reopening the selected block;
- save/reload, frontend rendering, undo/redo, duplication, same-post paste, and cross-post paste;
- unsynced pattern and synced-pattern insertion, save, reload, and frontend rendering;
- independent nested Group children, multiple Button siblings, and List/Quote inner blocks;
- default, theme, user/Global Styles, duplicate-slug, and block-context palette resolution;
- theme switching after preset conversion, with stored literals intentionally detached from the old palette slug;
- gradient blocking without gradient mutation, followed by restored background control after gradient removal;
- complete Cover exclusion while its native overlay opacity remains unchanged;
- structural/content safety through deactivation and correct value derivation after reactivation;
- keyboard range adjustment, accessible range labels/values, unavailable-state guidance, the 0% text warning, and 0% frontend behavior;
- no mutation for controlled unsupported `hsl(...)` and `var(...)` values.

The automated suite passed 12 of 12 scenarios. A repeatable development-only browser check also passed standard clipboard serialization/paste and two-slider usability in a 640 by 360 CSS viewport rendered at device scale 2, representing a 1280 by 720 physical-pixel surface at 200% page scaling. The inspector used the full responsive width, produced no horizontal overflow, exposed both ranges, and accepted keyboard adjustment. The screenshot and JSON are generated under ignored `tests/e2e/evidence/` and are excluded from distribution.

## Activation and persistence evidence

Activation produced no product PHP warning, fatal error, notice spam, option, table, user meta, or product post meta. The public frontend loaded no JavaScript from this plugin. Saved markup contained only standard WordPress block attributes and no plugin marker, compatibility class, or proprietary opacity attribute.

The one production defect found was a WordPress 7.0 editor-console deprecation for the old 36-pixel `RangeControl` default. Setting the component's supported `__next40pxDefaultSize` opt-in removed that warning; a component regression assertion covers the prop. No persistence or rendering architecture changed.

Intermittent LocalWP `502 Bad Gateway` responses occurred during a small number of REST/save requests. Narrow retries handled the local service instability, and the final serial suite still passed all assertions. Unrelated installed plugins emitted `PluginDocumentSettingPanel` and `core/post-meta` `useSelect` deprecation/performance warnings; the plugin's former `RangeControl` warning did not recur.

## `text` palette-slug collision

The fixture defines the palette slug `text` as `#112233`. WordPress generates:

```css
.has-text-color { color: var(--wp--preset--color--text) !important; }
```

For saved `style.color.text: rgba(200, 10, 20, 0.5)`, the serialized element correctly retained `class="has-text-color"` and the literal inline color. The editor and frontend nevertheless computed `rgb(17, 34, 51)` because the generated important preset utility overrode that literal. No plugin marker was written. This controlled failure demonstrates that a narrowly scoped editor/frontend compatibility bridge is required for the verified `text`-slug conflict.

ACL Trace 3.0.8 computed the expected `rgba(200, 10, 20, 0.5)` in both surfaces. Its saved content remained marker-free; on frontend rendering, ACL Trace itself added `acl-trace-text-color-bridge` and a transient CSS custom property. That theme-local mitigation is not a standalone-plugin dependency and was not copied or activated in Phase 4.

After the finished-source 12/12 run and initial test teardown, the unrelated installed ACL Trace source changed externally from the tested 3.0.8 snapshot to 3.0.9. A redundant diagnostic rerun then reproduced the unmitigated collision in that changed theme because the earlier theme-local bridge was no longer present. This later observation is retained in ignored evidence for transparency; it does not revise the verified 3.0.8 result or establish a 3.0.9 compatibility claim.

## Limitations and next boundary

- The matrix does not establish minimum supported WordPress, PHP, browser, or theme versions.
- Native color synchronization was asserted through real editor state transitions and seeded native preset attributes; every color-picker gesture was not automated.
- The 200% check is targeted responsive/keyboard usability evidence, not a WCAG certification.
- LocalWP's intermittent 502 responses remain an environment limitation.
- The live ACL Trace installation drifted to 3.0.9 after the defined matrix completed; only the earlier 3.0.8 run is part of the Phase 4 compatibility evidence.
- The verified `text`-slug conflict is intentionally unresolved in Phase 4. No PHP render bridge, compatibility CSS, frontend script, runtime compatibility class, or saved-content marker was added.

## Phase 5 conditional compatibility bridge

Phase 5 re-ran the collision evidence gate before production changes. The controlled fixture still saved `style.color.text: rgba(200, 10, 20, 0.5)` with a `has-text-color` root, while editor and frontend both computed `rgb(17, 34, 51)`. The generated rule remained:

```css
.has-text-color { color: var(--wp--preset--color--text) !important; }
```

Fresh ACL Trace 3.0.9 evidence separately found the same standard saved literal and root state, the theme palette value `#F3ECF6`, editor/frontend computed `rgb(243, 236, 246)`, and no ACL Trace runtime mitigation class or custom property. This finding is specific to the tested 3.0.9 installation and is not inferred from the earlier 3.0.8 result.

The implemented bridge is conditional and runtime-only:

- PHP reads merged effective settings with `wp_get_global_settings()` and caches global and block-context collision checks for the request.
- The frontend `render_block` filter validates standard `style.color.text`, rejects active `textColor`, rejects Cover, confirms standard text-color support, and changes only the first element through `WP_HTML_Tag_Processor`.
- The editor uses `editor.BlockListBlock`, a cheap pre-hook candidate gate, `useSettings()` for global/user origins, and server-resolved merged block-context names for contexts unavailable outside `BlockEditContext`.
- Positive roots receive `acl-block-opacity-compat-text` and `--acl-block-opacity-text-color` at runtime only.
- Compatibility CSS is loaded through `enqueue_block_assets` only when a global or block-context `text` slug exists. No frontend JavaScript is loaded.
- The selector targets the same element and includes the runtime style attribute for deterministic specificity against both global and block-context important utilities. It contains no descendant selector.

Controlled fixture and ACL Trace 3.0.9 testing then computed the saved `rgba(200, 10, 20, 0.5)` value in both editor and frontend. REST content remained marker-free. A default theme without the slug received no runtime marker/property, no render mutation, and no compatibility stylesheet.

Additional focused scenarios passed global/user and block-context detection, nested Group/Quote/List roots, explicit and inherited child colors, Cover exclusion, active-preset rejection, sibling Button isolation, a third-party standard-color root, deactivation/reactivation, and coexistence with a separate theme-side render mitigation. The premitigated theme and this plugin each added one independent runtime marker/property and produced the same final literal without warnings or saved-content changes.

Core Button exposes the public root selector `.wp-block-button .wp-block-button__link`. Because that color target is not the first rendered block root, the compatibility bridge intentionally performs no mutation in editor or frontend. Its two tested siblings retained distinct standard literal values and received no compatibility marker/property; their visual collision remains a documented root-target limitation. The bridge does not add a descendant heuristic.

While the plugin is active, collision-theme content is corrected. Deactivation removes only the runtime correction: the block stays valid and editable, its standard literal is unchanged, and the theme collision becomes visible again as expected. Reactivation restores the correction.
