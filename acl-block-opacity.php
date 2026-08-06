<?php
/**
 * Plugin Name: ACL Opacity Controls for Blocks
 * Description: Adds text and background opacity controls to eligible blocks using standard WordPress color attributes.
 * Version: 1.0.0
 * Author: Ashes Creative Labs
 * Author URI: https://acltracks.com/
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: acl-block-opacity
 * Domain Path: /languages
 *
 * @package AshesCreativeLabs\BlockOpacity
 */

declare(strict_types=1);

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/includes/class-assets.php';
require_once __DIR__ . '/includes/class-color-value.php';
require_once __DIR__ . '/includes/class-compatibility-bridge.php';
require_once __DIR__ . '/includes/class-plugin.php';

AshesCreativeLabs\BlockOpacity\Plugin::register( __FILE__ );
