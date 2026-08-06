<?php
/**
 * Mirrored PHP color corpus tests.
 *
 * @package AshesCreativeLabs\BlockOpacity\Tests
 */

declare(strict_types=1);

namespace AshesCreativeLabs\BlockOpacity\Tests;

use AshesCreativeLabs\BlockOpacity\Color_Value;
use PHPUnit\Framework\TestCase;

/**
 * Verifies PHP and JavaScript share the fixture contract.
 */
final class Test_Color_Value extends TestCase {
	/**
	 * Provide accepted fixtures.
	 *
	 * @return iterable<string, array<int, array<string, mixed>>>
	 */
	public static function accepted_color_provider(): iterable {
		foreach ( self::load_corpus()['accepted'] as $fixture ) {
			yield $fixture['input'] => array( $fixture );
		}
	}

	/**
	 * Provide rejected fixtures.
	 *
	 * @return iterable<string, array<int, string>>
	 */
	public static function rejected_color_provider(): iterable {
		foreach ( self::load_corpus()['rejected'] as $input ) {
			yield $input => array( $input );
		}
	}

	/**
	 * Test accepted values and normalized channels.
	 *
	 * @param array<string, mixed> $fixture Color fixture.
	 * @dataProvider accepted_color_provider
	 */
	public function test_accepts_and_normalizes_supported_colors( array $fixture ): void {
		self::assertEquals(
			$fixture['normalized'],
			Color_Value::parse( $fixture['input'] )
		);
	}

	/**
	 * Test deterministic formatting at every fixture opacity.
	 *
	 * @param array<string, mixed> $fixture Color fixture.
	 * @dataProvider accepted_color_provider
	 */
	public function test_formats_without_changing_rgb_channels( array $fixture ): void {
		$parsed = Color_Value::parse( $fixture['input'] );

		foreach ( $fixture['formats'] as $opacity => $expected ) {
			self::assertSame(
				$expected,
				Color_Value::format( $parsed, (int) $opacity )
			);
		}
	}

	/**
	 * Test every malformed and unsupported fixture.
	 *
	 * @param string $input Candidate color.
	 * @dataProvider rejected_color_provider
	 */
	public function test_rejects_malformed_or_unsupported_colors( string $input ): void {
		self::assertNull( Color_Value::parse( $input ) );
	}

	/**
	 * Test invalid formatter arguments.
	 */
	public function test_rejects_invalid_formatter_arguments(): void {
		self::assertNull( Color_Value::format( null, 50 ) );
		self::assertNull( Color_Value::format( Color_Value::parse( '#fff' ), -1 ) );
		self::assertNull( Color_Value::format( Color_Value::parse( '#fff' ), 101 ) );
		self::assertNull( Color_Value::format( Color_Value::parse( '#fff' ), INF ) );
		self::assertNull( Color_Value::format( Color_Value::parse( '#fff' ), '50' ) );
	}

	/**
	 * Load the shared color fixture corpus.
	 *
	 * @return array<string, array<int, mixed>>
	 */
	private static function load_corpus(): array {
		$path         = dirname( __DIR__ ) . '/fixtures/colors.json';
		$fixture_file = new \SplFileObject( $path, 'r' );
		$contents     = '';

		while ( ! $fixture_file->eof() ) {
			$contents .= $fixture_file->fgets();
		}

		$decoded = json_decode( $contents, true );

		self::assertIsArray( $decoded );

		return $decoded;
	}
}
