<?php
/**
 * WordPress function stubs for editor asset tests.
 *
 * @package AshesCreativeLabs\BlockOpacity\Tests
 */

declare(strict_types=1);

namespace AshesCreativeLabs\BlockOpacity;

use AshesCreativeLabs\BlockOpacity\Tests\Test_Assets;

/**
 * Capture WordPress hook registration inside the production namespace.
 *
 * @param string   $hook     Hook name.
 * @param callable $callback Hook callback.
 */
function add_action( string $hook, callable $callback ): void {
	Test_Assets::$actions[] = array( $hook, $callback );
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
