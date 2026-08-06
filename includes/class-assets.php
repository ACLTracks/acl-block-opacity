<?php
/**
 * Editor asset registration.
 *
 * @package AshesCreativeLabs\BlockOpacity
 */

declare(strict_types=1);

namespace AshesCreativeLabs\BlockOpacity;

defined( 'ABSPATH' ) || exit;

/**
 * Registers the generated editor-only JavaScript foundation.
 */
final class Assets {
	/**
	 * Absolute path to the main plugin file.
	 *
	 * @var string
	 */
	private $plugin_file;

	/**
	 * Set the plugin entry point.
	 *
	 * @param string $plugin_file Absolute path to the main plugin file.
	 */
	public function __construct( string $plugin_file ) {
		$this->plugin_file = $plugin_file;
	}

	/**
	 * Register editor-only asset hooks.
	 */
	public function register_hooks(): void {
		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_editor_assets' ) );
	}

	/**
	 * Enqueue the generated editor foundation when build metadata is available.
	 */
	public function enqueue_editor_assets(): void {
		$script_path = plugin_dir_path( $this->plugin_file ) . 'build/index.js';
		$asset_path  = plugin_dir_path( $this->plugin_file ) . 'build/index.asset.php';

		if ( ! is_readable( $script_path ) || ! is_readable( $asset_path ) ) {
			return;
		}

		$asset = require $asset_path;

		if (
			! is_array( $asset ) ||
			! isset( $asset['dependencies'], $asset['version'] ) ||
			! is_array( $asset['dependencies'] ) ||
			! is_string( $asset['version'] )
		) {
			return;
		}

		$handle = 'acl-block-opacity-editor';

		wp_enqueue_script(
			$handle,
			plugins_url( 'build/index.js', $this->plugin_file ),
			$asset['dependencies'],
			$asset['version'],
			true
		);

		wp_set_script_translations(
			$handle,
			'acl-block-opacity',
			plugin_dir_path( $this->plugin_file ) . 'languages'
		);
	}
}
