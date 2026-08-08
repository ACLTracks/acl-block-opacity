<?php
/**
 * Plugin orchestration.
 *
 * @package AshesCreativeLabs\BlockOpacity
 */

declare(strict_types=1);

namespace AshesCreativeLabs\BlockOpacity;

defined( 'ABSPATH' ) || exit;

/**
 * Registers the currently implemented plugin foundation.
 */
final class Plugin {
	/**
	 * Absolute path to the main plugin file.
	 *
	 * @var string
	 */
	private $plugin_file;

	/**
	 * Editor asset service.
	 *
	 * @var Assets
	 */
	private $assets;

	/**
	 * Conditional runtime compatibility service.
	 *
	 * @var Compatibility_Bridge
	 */
	private $compatibility_bridge;

	/**
	 * Construct the plugin services.
	 *
	 * @param string $plugin_file Absolute path to the main plugin file.
	 */
	private function __construct( string $plugin_file ) {
		$collision_detector = new Text_Collision_Detector();

		$this->plugin_file          = $plugin_file;
		$this->assets               = new Assets( $plugin_file, $collision_detector );
		$this->compatibility_bridge = new Compatibility_Bridge(
			$plugin_file,
			$collision_detector
		);
	}

	/**
	 * Register the implemented hooks.
	 *
	 * @param string $plugin_file Absolute path to the main plugin file.
	 */
	public static function register( string $plugin_file ): void {
		$plugin = new self( $plugin_file );

		add_action( 'init', array( $plugin, 'load_textdomain' ) );
		$plugin->assets->register_hooks();
		$plugin->compatibility_bridge->register_hooks();
	}

	/**
	 * Load translations from the final plugin text domain.
	 */
	public function load_textdomain(): void {
		load_plugin_textdomain(
			'acl-block-opacity',
			false,
			dirname( plugin_basename( $this->plugin_file ) ) . '/languages'
		);
	}
}
