# ACL Opacity Controls for Blocks

ACL Opacity Controls for Blocks is a standalone WordPress plugin project by Ashes Creative Labs. Its intended version 1.0.0 feature is text and background opacity control for eligible blocks through standard WordPress color attributes.

## Development status

This repository currently contains the tested Phase 5 editor integration, real-WordPress validation, and conditional text-collision bridge:

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
- serial Playwright coverage against WordPress 7.0.3 for editor, persistence, frontend, patterns, nesting, palette context, theme switching, and deactivation behavior.

Phase 4 proved a real editor/frontend conflict when a palette defines the slug `text`: WordPress can generate an important `.has-text-color` rule that overrides a valid saved literal. Phase 5 conditionally restores that literal on the affected block root through the runtime-only class `acl-block-opacity-compat-text` and custom property `--acl-block-opacity-text-color`. Neither identifier is serialized.

The bridge uses merged WordPress settings, supports global/user and applicable block-context palettes, and uses `WP_HTML_Tag_Processor` on the frontend. It never searches descendants. A block whose public root selector targets an inner element, including the tested core Button structure, is conservatively left unchanged by the bridge; its standard saved color data and sibling isolation remain intact. Cover is always excluded.

Fresh testing found that ACL Trace 3.0.9 contains the collision slug, no longer provides the earlier 3.0.8 theme-local mitigation, and is corrected by this generic bridge in editor and frontend. There is no ACL Trace-specific code. Normal themes without the slug remain unaffected and do not load the compatibility stylesheet. See [the browser-validation record](docs/browser-validation.md).

Plugin deactivation preserves valid standard block content, but a broken theme's conflicting CSS becomes visible again while the runtime bridge is inactive. Reactivation restores the correction. No frontend JavaScript is used.

Release packaging, broader compatibility testing, and the production compatibility matrix have not been completed. This is not a production release and does not claim universal theme compatibility.

No WordPress or PHP compatibility floor has been approved. The future GitHub repository `ACLTracks/acl-block-opacity` does not exist yet.

## Persistence contract

The editor controls persist only standard `style.color.text` and `style.color.background` values while clearing the mutually exclusive `textColor` or `backgroundColor` preset attribute during preset conversion. The compatibility bridge reads `style.color.text` but never changes it. Runtime classes and custom properties are added only to rendered/editor wrappers and never enter post content. The plugin stores no proprietary opacity attributes, compatibility markers, settings, telemetry, or database records. Background gradients remain untouched and block only the Background opacity control.

## Source boundary

The earlier ACL Trace experiment is reference material only and is not the release source. This standalone project does not require ACL Trace.

## Version 1.0.0 exclusions

Version 1.0.0 will not include whole-block, border, gradient, image, or hover opacity; animation; page-builder integrations; premium features; accounts; telemetry; or remote services.

## License

GPL-2.0-or-later.
