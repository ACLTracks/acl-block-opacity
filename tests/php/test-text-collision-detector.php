<?php
/**
 * Effective palette detector tests.
 *
 * @package AshesCreativeLabs\BlockOpacity\Tests
 */

declare(strict_types=1);

namespace AshesCreativeLabs\BlockOpacity\Tests;

use AshesCreativeLabs\BlockOpacity\Text_Collision_Detector;
use PHPUnit\Framework\TestCase;

/**
 * Verifies merged global, user, and block-context palette detection.
 */
final class Test_Text_Collision_Detector extends TestCase {
	/**
	 * A normal palette has no collision potential.
	 */
	public function test_collision_slug_absent(): void {
		$detector = $this->detector(
			array(
				'color' => array(
					'palette' => array(
						'theme' => array( array( 'slug' => 'contrast' ) ),
					),
				),
			)
		);

		self::assertFalse( $detector->has_collision_for_block( 'core/paragraph' ) );
		self::assertFalse( $detector->has_site_collision_potential() );
	}

	/**
	 * Theme and user origins are both recognized exactly.
	 */
	public function test_theme_and_user_collision_origins(): void {
		foreach ( array( 'theme', 'custom' ) as $origin ) {
			$detector = $this->detector(
				array(
					'color' => array(
						'palette' => array(
							$origin => array( array( 'slug' => 'text' ) ),
						),
					),
				)
			);

			self::assertTrue( $detector->has_collision_for_block( 'core/paragraph' ) );
			self::assertTrue( $detector->has_site_collision_potential() );
		}
	}

	/**
	 * A block-context slug affects only its applicable block.
	 */
	public function test_block_context_collision(): void {
		$detector = $this->detector(
			array(
				'blocks' => array(
					'core/quote' => array(
						'color' => array(
							'palette' => array(
								'theme' => array( array( 'slug' => 'text' ) ),
							),
						),
					),
				),
			)
		);

		self::assertTrue( $detector->has_collision_for_block( 'core/quote' ) );
		self::assertFalse( $detector->has_collision_for_block( 'core/paragraph' ) );
		self::assertTrue( $detector->has_site_collision_potential() );
		self::assertSame(
			array( 'core/quote' ),
			$detector->get_block_context_collision_names()
		);
	}

	/**
	 * Similar and malformed values do not widen the exact condition.
	 */
	public function test_requires_exact_text_slug(): void {
		self::assertFalse(
			Text_Collision_Detector::palette_contains_text_slug(
				array(
					array( 'slug' => 'Text' ),
					array( 'slug' => 'text-muted' ),
					array( 'slug' => 7 ),
				)
			)
		);
	}

	/**
	 * Repeated block checks reuse the merged settings snapshot.
	 */
	public function test_caches_settings_and_block_results(): void {
		$calls    = 0;
		$detector = new Text_Collision_Detector(
			static function () use ( &$calls ): array {
				$calls++;

				return array(
					'color' => array(
						'palette' => array(
							'theme' => array( array( 'slug' => 'text' ) ),
						),
					),
				);
			}
		);

		self::assertTrue( $detector->has_collision_for_block( 'core/paragraph' ) );
		self::assertTrue( $detector->has_collision_for_block( 'core/paragraph' ) );
		self::assertTrue( $detector->has_site_collision_potential() );
		self::assertSame( 1, $calls );
	}

	/**
	 * Create a detector around a fixed merged settings tree.
	 *
	 * @param array<string, mixed> $settings Merged settings.
	 */
	private function detector( array $settings ): Text_Collision_Detector {
		return new Text_Collision_Detector(
			static function () use ( $settings ): array {
				return $settings;
			}
		);
	}
}
