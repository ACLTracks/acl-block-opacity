# ACL Opacity Controls for Blocks

ACL Opacity Controls for Blocks is a standalone WordPress plugin project by Ashes Creative Labs. Its current public version is 1.0.1, which preserves the qualified 1.0.0 text and background opacity behavior for eligible blocks through standard WordPress color attributes.

## Release status

Version 1.0.0 completed its Phase 6 compatibility qualification and was the initial public GitHub release. Version 1.0.1 carries that runtime forward unchanged while reconciling the canonical license text and repository publication documentation. The current release contains:

- strict JavaScript and PHP RGB color parsing and deterministic formatting;
- pure standard-attribute persistence utilities;
- conservative block eligibility utilities with complete Cover exclusion;
- palette resolution with explicit custom, theme, and default precedence;
- accessible Text opacity and Background opacity controls for selected eligible blocks;
- effective block-context palette subscriptions through the public `useSettings` API;
- explicit guidance for missing, unsupported, unresolved-preset, and gradient-blocked states;
- atomic updates through standard WordPress color attributes;
- namespaced PHP bootstrap and generated editor-asset metadata support;
- a runtime-only editor/frontend bridge for the narrowly proven `text` palette-slug collision;
- conditional compatibility CSS that remains unloaded when no global or block-context `text` slug exists;
- automated utility, state, registration, component, accessibility, PHP, and browser tests;
- serial Playwright coverage against WordPress 6.8.7, 6.9.6, and 7.0.3 for editor, persistence, frontend, patterns, nesting, palette context, theme switching, and deactivation behavior.

Phase 4 proved a real editor/frontend conflict when a palette defines the slug `text`: WordPress can generate an important `.has-text-color` rule that overrides a valid saved literal. Phase 5 conditionally restores that literal on the affected block root through the runtime-only class `acl-block-opacity-compat-text` and custom property `--acl-block-opacity-text-color`. Neither identifier is serialized.

The bridge uses merged WordPress settings, supports global/user and applicable block-context palettes, and uses `WP_HTML_Tag_Processor` on the frontend. It never searches descendants. A block whose public root selector targets an inner element, including the tested core Button structure, is conservatively left unchanged by the bridge; its standard saved color data and sibling isolation remain intact. Cover is always excluded.

Fresh testing found that ACL Trace 3.0.9 contains the collision slug, no longer provides the earlier 3.0.8 theme-local mitigation, and is corrected by this generic bridge in editor and frontend. There is no ACL Trace-specific code. Normal themes without the slug remain unaffected and do not load the compatibility stylesheet. See [the browser-validation record](docs/browser-validation.md).

Plugin deactivation preserves valid standard block content, but a broken theme's conflicting CSS becomes visible again while the runtime bridge is inactive. Reactivation restores the correction. No frontend JavaScript is used.

The qualified compatibility floor is WordPress 6.8 and PHP 8.0. Runtime and browser validation covered WordPress 6.8.7, 6.9.6, and 7.0.3; PHP 8.0.30, 8.1.34, 8.2.29, 8.3.33, 8.4.24, and 8.5.9; Twenty Twenty-Five 1.5, Twenty Twenty-Four 1.5, ACL Trace 3.0.9, BlankSlate 2026, and controlled palette fixtures. This matrix does not claim universal theme compatibility.

The plugin has no settings screen, plugin-specific options, custom tables, post or user metadata, telemetry, external service, remote request, or frontend JavaScript. The canonical repository is [ACLTracks/acl-block-opacity](https://github.com/ACLTracks/acl-block-opacity), and GitHub releases are published there. Version 1.0.0 was the initial public GitHub release; version 1.0.1 is a metadata and license maintenance release. WordPress.org publication has not occurred.

## Persistence contract

The editor controls persist only standard `style.color.text` and `style.color.background` values while clearing the mutually exclusive `textColor` or `backgroundColor` preset attribute during preset conversion. The compatibility bridge reads `style.color.text` but never changes it. Runtime classes and custom properties are added only to rendered/editor wrappers and never enter post content. The plugin stores no proprietary opacity attributes, compatibility markers, settings, telemetry, or database records. Background gradients remain untouched and block only the Background opacity control.

Supported input colors are 3-, 4-, 6-, and 8-digit hexadecimal values plus legacy and modern `rgb()`/`rgba()` values with numeric or percentage channels. Named colors, CSS variables, HSL, HWB, Lab, LCH, OKLab, OKLCH, `color()`, and mixed-unit RGB channels are intentionally not converted. The editor explains when a color is absent, unresolved, or unsupported.

When a preset is converted, its current resolved color becomes a literal standard color. That literal remains stable across theme switches. An unchanged preset continues to follow its theme; if a later theme cannot resolve it, the editor reports that the preset is unavailable instead of guessing.

## Source boundary

The earlier ACL Trace experiment is reference material only and is not the release source. This standalone project does not require ACL Trace.

## Version 1.0.1 exclusions

Version 1.0.1 does not include whole-block, border, gradient, image, or hover opacity; animation; page-builder integrations; premium features; accounts; telemetry; or remote services.

## License

GPL-2.0-or-later.
