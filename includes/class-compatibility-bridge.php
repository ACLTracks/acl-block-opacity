<?php
/**
 * Runtime text-color compatibility bridge.
 *
 * @package AshesCreativeLabs\BlockOpacity
 */

declare(strict_types=1);

namespace AshesCreativeLabs\BlockOpacity;

defined( 'ABSPATH' ) || exit;

/**
 * Restores a validated standard literal when the `text` palette slug collides.
 */
final class Compatibility_Bridge {
	/** Runtime-only class shared by editor and frontend. */
	public const MARKER_CLASS = 'acl-block-opacity-compat-text';

	/** Runtime-only custom property shared by editor and frontend. */
	public const COLOR_PROPERTY = '--acl-block-opacity-text-color';

	/** Compatibility stylesheet handle. */
	public const STYLE_HANDLE = 'acl-block-opacity-compatibility';

	/**
	 * Absolute path to the main plugin file.
	 *
	 * @var string
	 */
	private $plugin_file;

	/**
	 * Effective palette detector.
	 *
	 * @var Text_Collision_Detector
	 */
	private $detector;

	/**
	 * HTML processor factory.
	 *
	 * @var callable
	 */
	private $processor_factory;

	/**
	 * Standard text-support resolver.
	 *
	 * @var callable
	 */
	private $text_support_resolver;

	/**
	 * Build the bridge from public WordPress services.
	 *
	 * @param string                  $plugin_file          Main plugin file.
	 * @param Text_Collision_Detector $detector             Palette detector.
	 * @param callable|null           $processor_factory     Optional test factory.
	 * @param callable|null           $text_support_resolver Optional test resolver.
	 */
	public function __construct(
		string $plugin_file,
		Text_Collision_Detector $detector,
		?callable $processor_factory = null,
		?callable $text_support_resolver = null
	) {
		$this->plugin_file           = $plugin_file;
		$this->detector              = $detector;
		$this->processor_factory     = $processor_factory ?? static function ( string $html ) {
			return new \WP_HTML_Tag_Processor( $html );
		};
		$this->text_support_resolver = $text_support_resolver ?? static function ( string $block_name ): bool {
			$block_type = \WP_Block_Type_Registry::get_instance()->get_registered( $block_name );

			if ( ! $block_type ) {
				return false;
			}

			$color_support = $block_type->supports['color'] ?? false;

			return true === $color_support ||
				( is_array( $color_support ) &&
					( ! array_key_exists( 'text', $color_support ) || true === $color_support['text'] ) );
		};
	}

	/**
	 * Register the only authorized frontend mutation and conditional styles.
	 */
	public function register_hooks(): void {
		add_filter( 'render_block', array( $this, 'filter_render_block' ), 10, 2 );
		add_action( 'enqueue_block_assets', array( $this, 'enqueue_compatibility_style' ), 20 );
	}

	/**
	 * Enqueue the static rule only where a merged palette can collide.
	 */
	public function enqueue_compatibility_style(): void {
		if ( ! $this->detector->has_site_collision_potential() ) {
			return;
		}

		$style_path = plugin_dir_path( $this->plugin_file ) . 'assets/css/compatibility.css';

		if ( ! is_readable( $style_path ) ) {
			return;
		}

		wp_enqueue_style(
			self::STYLE_HANDLE,
			plugins_url( 'assets/css/compatibility.css', $this->plugin_file ),
			array(),
			(string) filemtime( $style_path )
		);
	}

	/**
	 * Add a runtime class/property to the first rendered element only.
	 *
	 * @param string               $block_content Rendered block HTML.
	 * @param array<string, mixed> $block         Parsed block data.
	 */
	public function filter_render_block( string $block_content, array $block ): string {
		if ( '' === trim( $block_content ) ) {
			return $block_content;
		}

		$block_name = $block['blockName'] ?? null;

		if (
			! is_string( $block_name ) ||
			1 !== preg_match( '/\A[a-z0-9][a-z0-9_-]*\/[a-z0-9][a-z0-9_-]*\z/', $block_name ) ||
			'core/cover' === $block_name
		) {
			return $block_content;
		}

		$attributes = $block['attrs'] ?? array();

		if ( ! is_array( $attributes ) ) {
			return $block_content;
		}

		if ( array_key_exists( 'textColor', $attributes ) ) {
			if ( ! is_string( $attributes['textColor'] ) || '' !== trim( $attributes['textColor'] ) ) {
				return $block_content;
			}
		}

		$custom_color = $attributes['style']['color']['text'] ?? null;

		if (
			! is_string( $custom_color ) ||
			'' === trim( $custom_color ) ||
			null === Color_Value::parse( $custom_color )
		) {
			return $block_content;
		}

		if ( ! call_user_func( $this->text_support_resolver, $block_name ) ) {
			return $block_content;
		}

		if ( ! $this->detector->has_collision_for_block( $block_name ) ) {
			return $block_content;
		}

		$processor = call_user_func( $this->processor_factory, $block_content );

		if ( ! is_object( $processor ) || ! $processor->next_tag() ) {
			return $block_content;
		}

		if ( ! $processor->has_class( 'has-text-color' ) ) {
			return $block_content;
		}

		if ( ! $processor->has_class( self::MARKER_CLASS ) ) {
			$processor->add_class( self::MARKER_CLASS );
		}

		$existing_style = $processor->get_attribute( 'style' );
		$processor->set_attribute(
			'style',
			self::upsert_custom_property(
				is_string( $existing_style ) ? $existing_style : '',
				trim( $custom_color )
			)
		);

		return $processor->get_updated_html();
	}

	/**
	 * Add or update the plugin property without normalizing unrelated styles.
	 *
	 * @param string $style Existing inline declarations.
	 * @param string $value Validated literal color.
	 */
	public static function upsert_custom_property( string $style, string $value ): string {
		$parts = self::split_declarations( $style );
		$found = false;

		foreach ( $parts as $index => $declaration ) {
			$colon = strpos( $declaration, ':' );

			if ( false === $colon ) {
				continue;
			}

			$name = trim( substr( $declaration, 0, $colon ) );

			if ( 0 !== strcasecmp( $name, self::COLOR_PROPERTY ) ) {
				continue;
			}

			if ( $found ) {
				unset( $parts[ $index ] );
				continue;
			}

			$after_colon     = substr( $declaration, $colon + 1 );
			$leading_count   = strspn( $after_colon, " \t\r\n\f" );
			$leading_space   = substr( $after_colon, 0, $leading_count );
			$trailing_size   = strlen( $after_colon ) - strlen( rtrim( $after_colon ) );
			$trailing        = $trailing_size > 0 ? substr( $after_colon, -$trailing_size ) : '';
			$parts[ $index ] = substr( $declaration, 0, $colon + 1 ) .
				$leading_space . $value . $trailing;
			$found           = true;
		}

		if ( $found ) {
			return implode( ';', $parts );
		}

		if ( '' === trim( $style ) ) {
			return self::COLOR_PROPERTY . ':' . $value;
		}

		$separator = ';' === substr( rtrim( $style ), -1 ) ? '' : ';';

		return $style . $separator . self::COLOR_PROPERTY . ':' . $value;
	}

	/**
	 * Split declarations while respecting quoted and parenthesized semicolons.
	 *
	 * @param string $style Inline style value.
	 * @return array<int, string>
	 */
	private static function split_declarations( string $style ): array {
		$parts  = array();
		$start  = 0;
		$quote  = '';
		$depth  = 0;
		$escape = false;
		$length = strlen( $style );

		for ( $index = 0; $index < $length; $index++ ) {
			$character = $style[ $index ];

			if ( '' !== $quote ) {
				if ( $escape ) {
					$escape = false;
					continue;
				}

				if ( '\\' === $character ) {
					$escape = true;
				} elseif ( $quote === $character ) {
					$quote = '';
				}

				continue;
			}

			if ( '"' === $character || "'" === $character ) {
				$quote = $character;
			} elseif ( '(' === $character ) {
				++$depth;
			} elseif ( ')' === $character && $depth > 0 ) {
				--$depth;
			} elseif ( ';' === $character && 0 === $depth ) {
				$parts[] = substr( $style, $start, $index - $start );
				$start   = $index + 1;
			}
		}

		$parts[] = substr( $style, $start );

		return $parts;
	}
}
