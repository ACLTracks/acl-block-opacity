=== ACL Opacity Controls for Blocks ===
Contributors: ashescreativelabs
Tags: blocks, color, opacity, editor, accessibility
Requires at least: 6.8
Tested up to: 7.0
Stable tag: 1.0.1
Requires PHP: 8.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Accessible text and background opacity controls for eligible blocks in the WordPress editor.

== Description ==

ACL Opacity Controls for Blocks adds accessible 0-100 Text opacity and Background opacity controls to eligible blocks in the block editor. It uses the block's standard WordPress color attributes, so content remains portable and does not depend on proprietary opacity data.

The controls resolve custom colors and default, theme, user, and applicable block-context palette presets. Changing a preset's opacity converts that channel to a literal standard color so the selected appearance is preserved. Supported values are 3-, 4-, 6-, and 8-digit hexadecimal colors and legacy or modern `rgb()`/`rgba()` values with numeric or percentage channels. Named colors, CSS variables, HSL, HWB, Lab, LCH, OKLab, OKLCH, `color()`, and mixed-unit RGB channels are left unchanged and receive guidance instead of an unsafe conversion.

Cover is completely excluded. Background gradients are preserved and prevent only the Background opacity control. No whole-block, border, gradient, image, hover, or animation opacity is added.

Some themes define a palette slug named `text`. WordPress can then generate an important `.has-text-color` rule that overrides a valid saved literal. The plugin conditionally restores that literal in the editor and frontend only when the proven global, user, or applicable block-context collision exists. It adds runtime-only markup to the block root, never saves compatibility markers, and loads no compatibility CSS when the collision is absent.

The compatibility bridge deliberately does not search descendants. For blocks such as core Button, whose public color target is an inner element rather than the block root, normal WordPress opacity behavior remains available, but the special `text`-slug collision is not rewritten. Switching to a theme that cannot resolve an old preset may make that preset unavailable until a valid color is selected. Literal colors created by an opacity change remain stable across theme switches.

The plugin has no settings screen, options, custom database tables, post or user metadata, telemetry, external service, remote request, or frontend JavaScript. Deactivation leaves standard block content valid. If the active theme has the `text`-slug collision, its visual conflict can return while the plugin is inactive and is corrected again after reactivation. Nothing plugin-specific requires cleanup on uninstall.

The version 1.0.0 runtime was qualified on WordPress 6.8.7, 6.9.6, and 7.0.3; PHP 8.0.30 through 8.5.9; current Twenty Twenty-Five and Twenty Twenty-Four; ACL Trace 3.0.9; BlankSlate; and controlled palette fixtures. Version 1.0.1 preserves that runtime unchanged. This is a tested compatibility matrix, not a claim of universal theme compatibility.

== Changelog ==

= 1.0.1 =
* Replaces the abbreviated license notice with the complete canonical GNU GPL version 2 text.
* Corrects repository publication documentation.
* Changes no runtime plugin behavior.

= 1.0.0 =
* Adds Text opacity and Background opacity controls for eligible blocks using standard WordPress color attributes.
* Preserves Cover exclusion, gradients, portable saved content, and frontend output without frontend JavaScript.
* Adds conditional handling for the proven `text` palette-slug collision without descendant rewriting.
