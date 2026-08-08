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
	 * Optional block-context collision detector.
	 *
	 * @var Text_Collision_Detector|null
	 */
	private $collision_detector;

	/**
	 * Set the plugin entry point.
	 *
	 * @param string                       $plugin_file        Absolute path to the main plugin file.
	 * @param Text_Collision_Detector|null $collision_detector Optional collision detector.
	 */
	public function __construct(
		string $plugin_file,
		?Text_Collision_Detector $collision_detector = null
	) {
		$this->plugin_file        = $plugin_file;
		$this->collision_detector = $collision_detector;
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

		if ( null !== $this->collision_detector ) {
			wp_add_inline_script(
				$handle,
				'window.aclBlockOpacityCompatibility = Object.freeze({' .
					'blockContexts:' .
					wp_json_encode(
						$this->collision_detector->get_block_context_collision_names()
					) .
				'});',
				'before'
			);
		}

		wp_set_script_translations(
			$handle,
			'acl-block-opacity',
			plugin_dir_path( $this->plugin_file ) . 'languages'
		);
	}
}
