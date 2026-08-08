<?php
/**
 * Effective palette collision detection.
 *
 * @package AshesCreativeLabs\BlockOpacity
 */

declare(strict_types=1);

namespace AshesCreativeLabs\BlockOpacity;

defined( 'ABSPATH' ) || exit;

/**
 * Detects the narrowly proven `text` palette-slug collision potential.
 */
final class Text_Collision_Detector {
	/**
	 * Resolve the merged WordPress settings tree.
	 *
	 * @var callable
	 */
	private $settings_resolver;

	/**
	 * Request-local merged settings cache.
	 *
	 * @var array<string, mixed>|null
	 */
	private $settings;

	/**
	 * Request-local block result cache.
	 *
	 * @var array<string, bool>
	 */
	private $block_results = array();

	/**
	 * Request-local site-potential cache.
	 *
	 * @var bool|null
	 */
	private $site_result;

	/**
	 * Request-local block-context collision names.
	 *
	 * @var array<int, string>|null
	 */
	private $block_context_names;

	/**
	 * Set the documented settings resolver.
	 *
	 * @param callable|null $settings_resolver Optional testable settings resolver.
	 */
	public function __construct( ?callable $settings_resolver = null ) {
		$this->settings_resolver = $settings_resolver ?? static function (): array {
			$settings = wp_get_global_settings();

			return is_array( $settings ) ? $settings : array();
		};
	}

	/**
	 * Check global and applicable block-context palettes.
	 *
	 * A global palette is relevant to every block. A block palette is additionally
	 * relevant only to that block name.
	 *
	 * @param string $block_name Registered block name.
	 */
	public function has_collision_for_block( string $block_name ): bool {
		if ( isset( $this->block_results[ $block_name ] ) ) {
			return $this->block_results[ $block_name ];
		}

		$settings = $this->get_settings();
		$result   = self::palette_contains_text_slug(
			self::array_path( $settings, array( 'color', 'palette' ) )
		);

		if ( ! $result && '' !== $block_name ) {
			$result = self::palette_contains_text_slug(
				self::array_path(
					$settings,
					array( 'blocks', $block_name, 'color', 'palette' )
				)
			);
		}

		$this->block_results[ $block_name ] = $result;

		return $result;
	}

	/**
	 * Check whether any global or block-context palette can need the stylesheet.
	 */
	public function has_site_collision_potential(): bool {
		if ( null !== $this->site_result ) {
			return $this->site_result;
		}

		$settings = $this->get_settings();

		if (
			self::palette_contains_text_slug(
				self::array_path( $settings, array( 'color', 'palette' ) )
			)
		) {
			$this->site_result = true;

			return true;
		}

		if ( array() !== $this->get_block_context_collision_names() ) {
			$this->site_result = true;

			return true;
		}

		$this->site_result = false;

		return false;
	}

	/**
	 * List merged block contexts that introduce the collision slug.
	 *
	 * The list is safe to expose to the editor as runtime configuration. It
	 * contains registered-style block names only, never palette values.
	 *
	 * @return array<int, string>
	 */
	public function get_block_context_collision_names(): array {
		if ( null !== $this->block_context_names ) {
			return $this->block_context_names;
		}

		$this->block_context_names = array();
		$blocks                    = self::array_path(
			$this->get_settings(),
			array( 'blocks' )
		);

		if ( ! is_array( $blocks ) ) {
			return $this->block_context_names;
		}

		foreach ( $blocks as $block_name => $block_settings ) {
			if (
				is_string( $block_name ) &&
				is_array( $block_settings ) &&
				self::palette_contains_text_slug(
					self::array_path(
						$block_settings,
						array( 'color', 'palette' )
					)
				)
			) {
				$this->block_context_names[] = $block_name;
			}
		}

		sort( $this->block_context_names );

		return $this->block_context_names;
	}

	/**
	 * Recognize a `text` entry in an origin-keyed or direct palette array.
	 *
	 * @param mixed $palette Candidate merged palette.
	 */
	public static function palette_contains_text_slug( $palette ): bool {
		if ( ! is_array( $palette ) ) {
			return false;
		}

		foreach ( $palette as $entry ) {
			if ( ! is_array( $entry ) ) {
				continue;
			}

			if ( isset( $entry['slug'] ) && 'text' === $entry['slug'] ) {
				return true;
			}

			if ( self::palette_contains_text_slug( $entry ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Resolve the merged settings exactly once per request.
	 *
	 * @return array<string, mixed>
	 */
	private function get_settings(): array {
		if ( null === $this->settings ) {
			$settings       = call_user_func( $this->settings_resolver );
			$this->settings = is_array( $settings ) ? $settings : array();
		}

		return $this->settings;
	}

	/**
	 * Read a nested array path without relying on private WordPress helpers.
	 *
	 * @param array<string, mixed> $source Source array.
	 * @param array<string>        $path   Path segments.
	 * @return mixed Path value or null.
	 */
	private static function array_path( array $source, array $path ) {
		$value = $source;

		foreach ( $path as $segment ) {
			if ( ! is_array( $value ) || ! array_key_exists( $segment, $value ) ) {
				return null;
			}

			$value = $value[ $segment ];
		}

		return $value;
	}
}
