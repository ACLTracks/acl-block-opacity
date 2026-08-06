=== ACL Opacity Controls for Blocks ===
Contributors:
Stable tag: trunk
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Accessible text and background opacity controls for eligible blocks in the WordPress editor.

== Description ==

ACL Opacity Controls for Blocks is under active development. The current project implements accessible Text opacity and Background opacity controls for selected eligible blocks. It uses block-context default, theme, and user palettes; strict color parsing; and standard WordPress color attributes. Cover is completely excluded, background gradients are left untouched, and no frontend JavaScript is loaded.

Automated editor-unit coverage verifies registration, performance gating, palette state, atomic attribute updates, gradients, unavailable states, and accessibility semantics. Frontend compatibility handling, browser validation, save and reload flows, theme switching, activation and deactivation, and the production compatibility matrix have not been completed. There is no current production release and no approved WordPress or PHP compatibility floor.

The project is standalone and does not require ACL Trace. Its experimental prototype is not the release source. No GitHub repository exists yet.

Version 1.0.0 will not include whole-block, border, gradient, image, or hover opacity; animation; page-builder integrations; premium features; accounts; telemetry; or remote services.

== Changelog ==

= 1.0.0 =
* Editor integration in progress; not released.
