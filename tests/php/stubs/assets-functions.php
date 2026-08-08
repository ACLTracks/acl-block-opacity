<?php
/**
 * WordPress function stubs for editor asset tests.
 *
 * @package AshesCreativeLabs\BlockOpacity\Tests
 */

declare(strict_types=1);

namespace AshesCreativeLabs\BlockOpacity;

use AshesCreativeLabs\BlockOpacity\Tests\Test_Assets;
use AshesCreativeLabs\BlockOpacity\Tests\Test_Compatibility_Bridge;

/**
 * Capture WordPress hook registration inside the production namespace.
 *
 * @param string   $hook     Hook name.
 * @param callable $callback Hook callback.
 * @param int      $priority Hook priority.
 */
function add_action( string $hook, callable $callback, int $priority = 10 ): void {
	if ( is_array( $callback ) && $callback[0] instanceof Assets ) {
		Test_Assets::$actions[] = array( $hook, $callback );
		return;
	}

	Test_Compatibility_Bridge::$actions[] = array( $hook, $callback, $priority );
}

/**
 * Capture render filter registration.
 *
 * @param string   $hook          Hook name.
 * @param callable $callback      Hook callback.
 * @param int      $priority      Hook priority.
 * @param int      $accepted_args Accepted argument count.
 */
function add_filter(
	string $hook,
	callable $callback,
	int $priority = 10,
	int $accepted_args = 1
): void {
	Test_Compatibility_Bridge::$filters[] = array(
		$hook,
		$callback,
		$priority,
		$accepted_args,
	);
}

/**
 * Resolve the plugin directory in the isolated harness.
 *
 * @param string $plugin_file Plugin entry file.
 */
function plugin_dir_path( string $plugin_file ): string {
	return dirname( $plugin_file ) . DIRECTORY_SEPARATOR;
}

/**
 * Create a deterministic plugin URL for assertions.
 *
 * @param string $path        Relative asset path.
 * @param string $plugin_file Plugin entry file.
 */
function plugins_url( string $path, string $plugin_file ): string {
	return 'https://example.test/plugins/' . basename( dirname( $plugin_file ) ) . '/' . $path;
}

/**
 * Capture an enqueued editor script.
 *
 * @param string        $handle    Script handle.
 * @param string        $source    Script URL.
 * @param array<string> $depends   Script dependencies.
 * @param string        $version   Script version.
 * @param bool          $in_footer Whether the script loads in the footer.
 */
function wp_enqueue_script(
	string $handle,
	string $source,
	array $depends,
	string $version,
	bool $in_footer
): void {
	Test_Assets::$scripts[] = array(
		$handle,
		$source,
		$depends,
		$version,
		$in_footer,
	);
}

/**
 * Capture script translation registration.
 *
 * @param string $handle Script handle.
 * @param string $domain Text domain.
 * @param string $path   Translation directory.
 */
function wp_set_script_translations(
	string $handle,
	string $domain,
	string $path
): void {
	Test_Assets::$translations[] = array( $handle, $domain, $path );
}

/**
 * Capture editor-only runtime configuration.
 *
 * @param string $handle   Script handle.
 * @param string $data     Inline JavaScript.
 * @param string $position Placement relative to the script.
 */
function wp_add_inline_script(
	string $handle,
	string $data,
	string $position = 'after'
): void {
	Test_Assets::$inline_scripts[] = array( $handle, $data, $position );
}

/**
 * Encode runtime settings like WordPress for the isolated harness.
 *
 * @param mixed $value Value to encode.
 * @return string|false Encoded JSON.
 */
function wp_json_encode( $value ) {
	// phpcs:ignore WordPress.WP.AlternativeFunctions.json_encode_json_encode -- Isolated stub implementation.
	return json_encode( $value );
}

/**
 * Capture a conditionally enqueued compatibility stylesheet.
 *
 * @param string        $handle  Style handle.
 * @param string        $source  Style URL.
 * @param array<string> $depends Style dependencies.
 * @param string        $version Asset version.
 */
function wp_enqueue_style(
	string $handle,
	string $source,
	array $depends,
	string $version
): void {
	Test_Compatibility_Bridge::$styles[] = array(
		$handle,
		$source,
		$depends,
		$version,
	);
}
