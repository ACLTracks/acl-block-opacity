=== ACL Opacity Controls for Blocks ===
Contributors:
Stable tag: trunk
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Accessible text and background opacity controls for eligible blocks in the WordPress editor.

== Description ==

ACL Opacity Controls for Blocks is under active development. The current project implements accessible Text opacity and Background opacity controls for selected eligible blocks. It uses block-context default, theme, and user palettes; strict color parsing; and standard WordPress color attributes. Cover is completely excluded, background gradients are left untouched, and no frontend JavaScript is loaded.

Automated unit coverage verifies registration, performance gating, palette state, atomic attribute updates, gradients, unavailable states, and accessibility semantics. Phase 4 real-WordPress testing also verified Inspector Controls, immediate preview, save/reload, undo/redo, copy/paste, patterns, nested blocks, frontend output, theme switching, activation/deactivation, keyboard use, and 200% responsive usability across a limited theme matrix.

Testing reproduced a theme conflict when a palette uses the slug `text`: WordPress's generated important `.has-text-color` utility can override a standard saved literal text color. The Phase 5 bridge now detects that exact global, user, or applicable block-context condition and restores the validated literal through a conditional runtime class and CSS custom property. It uses public editor extensibility and `WP_HTML_Tag_Processor`, processes only the first block root, never searches descendants, and never changes saved block content.

Normal themes without the collision slug remain unchanged and do not load compatibility CSS. Cover remains excluded. Deactivation preserves valid standard content, although the theme's conflicting visual result returns while the plugin is inactive. Blocks whose public root selector points to an inner element are conservatively not bridged. No universal theme compatibility is claimed.

Fresh Phase 5 testing found that ACL Trace 3.0.9 contains the collision and has no theme-local runtime mitigation; the generic bridge restores editor/frontend parity without ACL Trace-specific code. Broader compatibility testing, release packaging, and the production compatibility matrix have not been completed. There is no current production release and no approved WordPress or PHP compatibility floor.

The project is standalone and does not require ACL Trace. Its experimental prototype is not the release source. No GitHub repository exists yet.

Version 1.0.0 will not include whole-block, border, gradient, image, or hover opacity; animation; page-builder integrations; premium features; accounts; telemetry; or remote services.

== Changelog ==

= 1.0.0 =
* Editor integration, Phase 4 validation, and the conditional Phase 5 text-collision bridge are complete; not released.
