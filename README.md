# ACL Opacity Controls for Blocks

ACL Opacity Controls for Blocks is a standalone WordPress plugin project by Ashes Creative Labs. Its intended version 1.0.0 feature is text and background opacity control for eligible blocks through standard WordPress color attributes.

## Development status

This repository currently contains the tested Phase 2 foundation only:

- strict JavaScript and PHP RGB color parsing and deterministic formatting;
- pure standard-attribute persistence utilities;
- conservative block eligibility utilities with complete Cover exclusion;
- palette resolution with explicit custom, theme, and default precedence;
- namespaced PHP bootstrap and generated editor-asset metadata support;
- isolated unit tests and development tooling.

The editor controls, immediate preview, compatibility render bridge, browser end-to-end validation, release packaging, and production compatibility matrix are not implemented yet. This is not a production release.

No WordPress or PHP compatibility floor has been approved. The future GitHub repository `ACLTracks/acl-block-opacity` does not exist yet.

## Persistence contract

The finished plugin will persist only standard `style.color.text` and `style.color.background` values while clearing the mutually exclusive `textColor` or `backgroundColor` preset attribute during preset conversion. It will not store proprietary opacity attributes, compatibility markers, settings, telemetry, or database records.

## Source boundary

The earlier ACL Trace experiment is reference material only and is not the release source. This standalone project does not require ACL Trace.

## Version 1.0.0 exclusions

Version 1.0.0 will not include whole-block, border, gradient, image, or hover opacity; animation; page-builder integrations; premium features; accounts; telemetry; or remote services.

## License

GPL-2.0-or-later.
