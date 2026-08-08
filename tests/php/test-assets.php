<?php
/**
 * Editor asset loader tests.
 *
 * @package AshesCreativeLabs\BlockOpacity\Tests
 */

declare(strict_types=1);

namespace AshesCreativeLabs\BlockOpacity\Tests;

use AshesCreativeLabs\BlockOpacity\Assets;
use AshesCreativeLabs\BlockOpacity\Text_Collision_Detector;
use PHPUnit\Framework\TestCase;

/**
 * Verifies editor-only hooks and generated metadata consumption.
 */
final class Test_Assets extends TestCase {
	/**
	 * Captured actions.
	 *
	 * @var array<int, array<int, mixed>>
	 */
	public static $actions = array();

	/**
	 * Captured scripts.
	 *
	 * @var array<int, array<int, mixed>>
	 */
	public static $scripts = array();

	/**
	 * Captured translations.
	 *
	 * @var array<int, array<int, mixed>>
	 */
	public static $translations = array();

	/**
	 * Captured editor runtime configuration.
	 *
	 * @var array<int, array<int, mixed>>
	 */
	public static $inline_scripts = array();

	/**
	 * Reset captured calls.
	 */
	protected function setUp(): void {
		self::$actions        = array();
		self::$inline_scripts = array();
		self::$scripts        = array();
		self::$translations   = array();
	}

	/**
	 * Block-context collision names are exposed before the editor bundle only.
	 */
	public function test_exposes_block_context_collision_names_to_editor(): void {
		$root     = dirname( __DIR__, 2 );
		$detector = new Text_Collision_Detector(
			static function (): array {
				return array(
					'blocks' => array(
						'acl-opacity-e2e/standard-color' => array(
							'color' => array(
								'palette' => array(
									'theme' => array( array( 'slug' => 'text' ) ),
								),
							),
						),
					),
				);
			}
		);
		$assets   = new Assets( $root . '/acl-block-opacity.php', $detector );

		$assets->enqueue_editor_assets();

		self::assertSame(
			array(
				array(
					'acl-block-opacity-editor',
					'window.aclBlockOpacityCompatibility = Object.freeze({blockContexts:["acl-opacity-e2e\\/standard-color"]});',
					'before',
				),
			),
			self::$inline_scripts
		);
	}

	/**
	 * The loader registers only the block-editor asset hook.
	 */
	public function test_registers_only_editor_asset_hook(): void {
		$assets = new Assets( dirname( __DIR__, 2 ) . '/acl-block-opacity.php' );

		$assets->register_hooks();

		self::assertCount( 1, self::$actions );
		self::assertSame( 'enqueue_block_editor_assets', self::$actions[0][0] );
		self::assertSame( $assets, self::$actions[0][1][0] );
		self::assertSame( 'enqueue_editor_assets', self::$actions[0][1][1] );
	}

	/**
	 * Generated dependencies, version, and translations are consumed.
	 */
	public function test_enqueues_generated_editor_metadata_and_translations(): void {
		$root       = dirname( __DIR__, 2 );
		$plugin     = $root . '/acl-block-opacity.php';
		$metadata   = require $root . '/build/index.asset.php';
		$assets     = new Assets( $plugin );
		$script_url = 'https://example.test/plugins/acl-block-opacity/build/index.js';

		$assets->enqueue_editor_assets();

		self::assertSame(
			array(
				array(
					'acl-block-opacity-editor',
					$script_url,
					$metadata['dependencies'],
					$metadata['version'],
					true,
				),
			),
			self::$scripts
		);
		self::assertSame(
			array(
				array(
					'acl-block-opacity-editor',
					'acl-block-opacity',
					$root . DIRECTORY_SEPARATOR . 'languages',
				),
			),
			self::$translations
		);
	}

	/**
	 * A missing build directory returns before WordPress enqueue calls.
	 */
	public function test_missing_build_metadata_fails_safely(): void {
		$missing_plugin = __DIR__ . '/missing/acl-block-opacity.php';
		$assets         = new Assets( $missing_plugin );

		$assets->enqueue_editor_assets();

		self::assertSame( array(), self::$scripts );
		self::assertSame( array(), self::$translations );
	}
}
