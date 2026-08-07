# ACL Opacity Controls for Blocks

ACL Opacity Controls for Blocks is a standalone WordPress plugin project by Ashes Creative Labs. Its intended version 1.0.0 feature is text and background opacity control for eligible blocks through standard WordPress color attributes.

## Development status

This repository currently contains the tested Phase 4 editor integration and real-WordPress validation:

- strict JavaScript and PHP RGB color parsing and deterministic formatting;
- pure standard-attribute persistence utilities;
- conservative block eligibility utilities with complete Cover exclusion;
- palette resolution with explicit custom, theme, and default precedence;
- accessible Text opacity and Background opacity controls for selected eligible blocks;
- effective block-context palette subscriptions through the public `useSettings` API;
- explicit guidance for missing, unsupported, unresolved-preset, and gradient-blocked states;
- atomic updates through standard WordPress color attributes;
- namespaced PHP bootstrap and generated editor-asset metadata support;
- automated utility, state, registration, component, accessibility, and PHP tests.
- serial Playwright coverage against WordPress 7.0.3 for editor, persistence, frontend, patterns, nesting, palette context, theme switching, and deactivation behavior.

The Phase 4 browser matrix passed 12 automated scenarios plus a development-only clipboard, keyboard, and 200%-scaling check. It also proved a real editor/frontend conflict when a theme defines the palette slug `text`: WordPress's generated important `.has-text-color` rule can override a saved literal text color. ACL Trace 3.0.8 already mitigates its frontend independently, but the standalone compatibility bridge remains deferred to Phase 5. See [the browser-validation record](docs/browser-validation.md).

Release packaging, broader compatibility testing, the standalone compatibility bridge, and the production compatibility matrix have not been completed. This is not a production release.

No WordPress or PHP compatibility floor has been approved. The future GitHub repository `ACLTracks/acl-block-opacity` does not exist yet.

## Persistence contract

The editor controls persist only standard `style.color.text` and `style.color.background` values while clearing the mutually exclusive `textColor` or `backgroundColor` preset attribute during preset conversion. They do not store proprietary opacity attributes, compatibility markers, settings, telemetry, or database records. Background gradients remain untouched and block only the Background opacity control.

## Source boundary

The earlier ACL Trace experiment is reference material only and is not the release source. This standalone project does not require ACL Trace.

## Version 1.0.0 exclusions

Version 1.0.0 will not include whole-block, border, gradient, image, or hover opacity; animation; page-builder integrations; premium features; accounts; telemetry; or remote services.

## License

GPL-2.0-or-later.
