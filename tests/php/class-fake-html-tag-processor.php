<?php
/**
 * Minimal first-tag processor for isolated bridge tests.
 *
 * @package AshesCreativeLabs\BlockOpacity\Tests
 */

declare(strict_types=1);

namespace AshesCreativeLabs\BlockOpacity\Tests;

/**
 * Emulates only the public processor methods used by the production bridge.
 */
final class Fake_HTML_Tag_Processor {
	/**
	 * Original HTML.
	 *
	 * @var string
	 */
	private $html;

	/**
	 * First tag name.
	 *
	 * @var string|null
	 */
	private $tag_name;

	/**
	 * First tag byte offset.
	 *
	 * @var int
	 */
	private $tag_offset = 0;

	/**
	 * First tag byte length.
	 *
	 * @var int
	 */
	private $tag_length = 0;

	/**
	 * Parsed first-tag attributes.
	 *
	 * @var array<string, string>
	 */
	private $attributes = array();

	/**
	 * Original attribute order.
	 *
	 * @var array<int, string>
	 */
	private $attribute_order = array();

	/**
	 * Parse only the first complete element start tag.
	 *
	 * @param string $html Rendered HTML.
	 */
	public function __construct( string $html ) {
		$this->html = $html;

		if ( 1 !== preg_match( '/<([a-z][a-z0-9-]*)([^>]*)>/i', $html, $match, PREG_OFFSET_CAPTURE ) ) {
			return;
		}

		$this->tag_name   = $match[1][0];
		$this->tag_offset = $match[0][1];
		$this->tag_length = strlen( $match[0][0] );

		if ( 0 < preg_match_all( '/([a-z_:][a-z0-9_:.-]*)\s*=\s*"([^"]*)"/i', $match[2][0], $attributes, PREG_SET_ORDER ) ) {
			foreach ( $attributes as $attribute ) {
				$this->attributes[ $attribute[1] ] = $attribute[2];
				$this->attribute_order[]           = $attribute[1];
			}
		}
	}

	/**
	 * Check whether a first tag exists.
	 */
	public function next_tag(): bool {
		return null !== $this->tag_name;
	}

	/**
	 * Test a class token.
	 *
	 * @param string $class_name Class token.
	 */
	public function has_class( string $class_name ): bool {
		$classes = preg_split( '/\s+/', trim( $this->attributes['class'] ?? '' ) );

		return is_array( $classes ) && in_array( $class_name, $classes, true );
	}

	/**
	 * Add a unique class token.
	 *
	 * @param string $class_name Class token.
	 */
	public function add_class( string $class_name ): void {
		$existing = trim( $this->attributes['class'] ?? '' );
		$this->set_attribute( 'class', trim( $existing . ' ' . $class_name ) );
	}

	/**
	 * Read one attribute.
	 *
	 * @param string $name Attribute name.
	 */
	public function get_attribute( string $name ): ?string {
		return $this->attributes[ $name ] ?? null;
	}

	/**
	 * Set one attribute.
	 *
	 * @param string $name  Attribute name.
	 * @param string $value Attribute value.
	 */
	public function set_attribute( string $name, string $value ): void {
		if ( ! array_key_exists( $name, $this->attributes ) ) {
			$this->attribute_order[] = $name;
		}

		$this->attributes[ $name ] = $value;
	}

	/**
	 * Rebuild the first tag and leave all following markup untouched.
	 */
	public function get_updated_html(): string {
		$tag = '<' . $this->tag_name;

		foreach ( $this->attribute_order as $name ) {
			$tag .= ' ' . $name . '="' . $this->attributes[ $name ] . '"';
		}

		$tag .= '>';

		return substr( $this->html, 0, $this->tag_offset ) .
			$tag .
			substr( $this->html, $this->tag_offset + $this->tag_length );
	}
}
