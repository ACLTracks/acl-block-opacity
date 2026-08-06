<?php
/**
 * Strict RGB color parsing and formatting.
 *
 * @package AshesCreativeLabs\BlockOpacity
 */

declare(strict_types=1);

namespace AshesCreativeLabs\BlockOpacity;

defined( 'ABSPATH' ) || exit;

/**
 * Parses the supported RGB grammar into normalized sRGB channels.
 */
final class Color_Value {
	/**
	 * Decimal precision retained during normalization.
	 */
	private const PRECISION = 6;

	/**
	 * CSS number grammar used by the supported RGB subset.
	 */
	private const NUMBER_PATTERN = '[+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]?\d+)?';

	/**
	 * Parse a supported CSS color.
	 *
	 * @param mixed $value Candidate CSS color.
	 * @return array<string, float|string>|null Normalized color or null.
	 */
	public static function parse( $value ): ?array {
		if ( ! is_string( $value ) ) {
			return null;
		}

		$color = trim( $value );

		if ( '' === $color ) {
			return null;
		}

		if ( '#' === $color[0] ) {
			return self::parse_hex( $color );
		}

		return self::parse_function( $color );
	}

	/**
	 * Format a parsed color with an absolute opacity percentage.
	 *
	 * @param mixed $color   Parsed color structure.
	 * @param mixed $opacity Opacity from 0 through 100.
	 * @return string|null Formatted CSS color or null.
	 */
	public static function format( $color, $opacity ): ?string {
		if (
			! self::is_parsed_color( $color ) ||
			( ! is_int( $opacity ) && ! is_float( $opacity ) ) ||
			! is_finite( (float) $opacity ) ||
			$opacity < 0 ||
			$opacity > 100
		) {
			return null;
		}

		$red   = self::format_number( (float) $color['red'] );
		$green = self::format_number( (float) $color['green'] );
		$blue  = self::format_number( (float) $color['blue'] );
		$alpha = self::normalize( (float) $opacity / 100 );

		if ( 1.0 === $alpha ) {
			return sprintf( 'rgb(%s, %s, %s)', $red, $green, $blue );
		}

		return sprintf(
			'rgba(%s, %s, %s, %s)',
			$red,
			$green,
			$blue,
			self::format_number( $alpha )
		);
	}

	/**
	 * Parse hexadecimal RGB syntax.
	 *
	 * @param string $value CSS color.
	 * @return array<string, float|string>|null Normalized color or null.
	 */
	private static function parse_hex( string $value ): ?array {
		if ( 1 !== preg_match( '/\A#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})\z/i', $value ) ) {
			return null;
		}

		$hex = substr( $value, 1 );

		if ( 3 === strlen( $hex ) || 4 === strlen( $hex ) ) {
			$expanded = '';

			foreach ( str_split( $hex ) as $character ) {
				$expanded .= $character . $character;
			}

			$hex = $expanded;
		}

		$alpha = 1.0;

		if ( 8 === strlen( $hex ) ) {
			$alpha = self::normalize( hexdec( substr( $hex, 6, 2 ) ) / 255 );
		}

		return self::create_result(
			(float) hexdec( substr( $hex, 0, 2 ) ),
			(float) hexdec( substr( $hex, 2, 2 ) ),
			(float) hexdec( substr( $hex, 4, 2 ) ),
			$alpha,
			'hex'
		);
	}

	/**
	 * Parse rgb() and rgba() syntax.
	 *
	 * @param string $value CSS color.
	 * @return array<string, float|string>|null Normalized color or null.
	 */
	private static function parse_function( string $value ): ?array {
		if ( 1 !== preg_match( '/\A(rgb|rgba)\((.*)\)\z/is', $value, $matches ) ) {
			return null;
		}

		$function = strtolower( $matches[1] );
		$body     = trim( $matches[2] );

		if ( '' === $body ) {
			return null;
		}

		if ( false !== strpos( $body, ',' ) ) {
			return self::parse_legacy_function( $function, $body );
		}

		return self::parse_modern_function( $function, $body );
	}

	/**
	 * Parse the supported comma-separated legacy grammar.
	 *
	 * @param string $function_name Function name.
	 * @param string $body     Function body.
	 * @return array<string, float|string>|null Normalized color or null.
	 */
	private static function parse_legacy_function( string $function_name, string $body ): ?array {
		if ( false !== strpos( $body, '/' ) ) {
			return null;
		}

		$parts = array_map( 'trim', explode( ',', $body ) );

		if ( in_array( '', $parts, true ) ) {
			return null;
		}

		if (
			( 'rgb' === $function_name && 3 !== count( $parts ) ) ||
			( 'rgba' === $function_name && 4 !== count( $parts ) )
		) {
			return null;
		}

		$channels = array();

		for ( $index = 0; $index < 3; $index++ ) {
			$channel = self::parse_rgb_component( $parts[ $index ] );

			if ( null === $channel ) {
				return null;
			}

			$channels[] = $channel;
		}

		if (
			$channels[0]['unit'] !== $channels[1]['unit'] ||
			$channels[0]['unit'] !== $channels[2]['unit']
		) {
			return null;
		}

		$alpha = 1.0;

		if ( 'rgba' === $function_name ) {
			$alpha = self::parse_alpha_component( $parts[3] );

			if ( null === $alpha ) {
				return null;
			}
		}

		return self::create_result(
			$channels[0]['value'],
			$channels[1]['value'],
			$channels[2]['value'],
			$alpha,
			'rgba' === $function_name ? 'legacy-rgba' : 'legacy-rgb'
		);
	}

	/**
	 * Parse the supported space-separated modern grammar.
	 *
	 * @param string $function_name Function name.
	 * @param string $body     Function body.
	 * @return array<string, float|string>|null Normalized color or null.
	 */
	private static function parse_modern_function( string $function_name, string $body ): ?array {
		$segments = explode( '/', $body );

		if ( count( $segments ) > 2 || '' === trim( $segments[0] ) ) {
			return null;
		}

		if ( 2 === count( $segments ) && '' === trim( $segments[1] ) ) {
			return null;
		}

		$channel_tokens = preg_split( '/\s+/', trim( $segments[0] ) );

		if ( false === $channel_tokens || 3 !== count( $channel_tokens ) ) {
			return null;
		}

		$channels = array();

		foreach ( $channel_tokens as $token ) {
			$channel = self::parse_rgb_component( $token );

			if ( null === $channel ) {
				return null;
			}

			$channels[] = $channel;
		}

		$alpha = 1.0;

		if ( 2 === count( $segments ) ) {
			$alpha = self::parse_alpha_component( trim( $segments[1] ) );

			if ( null === $alpha ) {
				return null;
			}
		}

		return self::create_result(
			$channels[0]['value'],
			$channels[1]['value'],
			$channels[2]['value'],
			$alpha,
			'rgba' === $function_name ? 'modern-rgba' : 'modern-rgb'
		);
	}

	/**
	 * Parse one RGB component.
	 *
	 * @param string $token Component token.
	 * @return array{unit: string, value: float}|null Parsed component or null.
	 */
	private static function parse_rgb_component( string $token ): ?array {
		$percentage = self::parse_numeric_token( $token, true );

		if ( null !== $percentage ) {
			if ( $percentage < 0 || $percentage > 100 ) {
				return null;
			}

			return array(
				'unit'  => 'percentage',
				'value' => self::normalize( $percentage * 255 / 100 ),
			);
		}

		$number = self::parse_numeric_token( $token, false );

		if ( null === $number || $number < 0 || $number > 255 ) {
			return null;
		}

		return array(
			'unit'  => 'number',
			'value' => self::normalize( $number ),
		);
	}

	/**
	 * Parse one alpha component.
	 *
	 * @param string $token Alpha token.
	 * @return float|null Normalized alpha or null.
	 */
	private static function parse_alpha_component( string $token ): ?float {
		$percentage = self::parse_numeric_token( $token, true );

		if ( null !== $percentage ) {
			return $percentage >= 0 && $percentage <= 100
				? self::normalize( $percentage / 100 )
				: null;
		}

		$number = self::parse_numeric_token( $token, false );

		if ( null === $number || $number < 0 || $number > 1 ) {
			return null;
		}

		return self::normalize( $number );
	}

	/**
	 * Parse a finite CSS number or percentage token.
	 *
	 * @param string $token      Numeric token.
	 * @param bool   $percentage Whether a percentage suffix is required.
	 * @return float|null Parsed number or null.
	 */
	private static function parse_numeric_token( string $token, bool $percentage ): ?float {
		$pattern = $percentage
			? '/\A' . self::NUMBER_PATTERN . '%\z/'
			: '/\A' . self::NUMBER_PATTERN . '\z/';

		if ( 1 !== preg_match( $pattern, $token ) ) {
			return null;
		}

		$numeric = (float) ( $percentage ? substr( $token, 0, -1 ) : $token );

		return is_finite( $numeric ) ? $numeric : null;
	}

	/**
	 * Create the normalized public result.
	 *
	 * @param float  $red    Red channel.
	 * @param float  $green  Green channel.
	 * @param float  $blue   Blue channel.
	 * @param float  $alpha  Alpha channel.
	 * @param string $syntax Parsed syntax label.
	 * @return array<string, float|string> Normalized color.
	 */
	private static function create_result(
		float $red,
		float $green,
		float $blue,
		float $alpha,
		string $syntax
	): array {
		return array(
			'space'  => 'srgb',
			'red'    => self::normalize( $red ),
			'green'  => self::normalize( $green ),
			'blue'   => self::normalize( $blue ),
			'alpha'  => self::normalize( $alpha ),
			'syntax' => $syntax,
		);
	}

	/**
	 * Confirm a formatter input uses normalized channel bounds.
	 *
	 * @param mixed $color Candidate parsed color.
	 */
	private static function is_parsed_color( $color ): bool {
		if ( ! is_array( $color ) ) {
			return false;
		}

		foreach ( array( 'red', 'green', 'blue', 'alpha' ) as $key ) {
			if (
				! array_key_exists( $key, $color ) ||
				( ! is_int( $color[ $key ] ) && ! is_float( $color[ $key ] ) ) ||
				! is_finite( (float) $color[ $key ] )
			) {
				return false;
			}
		}

		return (
			$color['red'] >= 0 &&
			$color['red'] <= 255 &&
			$color['green'] >= 0 &&
			$color['green'] <= 255 &&
			$color['blue'] >= 0 &&
			$color['blue'] <= 255 &&
			$color['alpha'] >= 0 &&
			$color['alpha'] <= 1
		);
	}

	/**
	 * Normalize a finite decimal to the shared precision.
	 *
	 * @param float $value Number to normalize.
	 */
	private static function normalize( float $value ): float {
		$normalized = round( $value, self::PRECISION, PHP_ROUND_HALF_UP );

		return 0.0 === $normalized ? 0.0 : $normalized;
	}

	/**
	 * Format a normalized number without precision noise.
	 *
	 * @param float $value Number to format.
	 */
	private static function format_number( float $value ): string {
		$formatted = number_format( self::normalize( $value ), self::PRECISION, '.', '' );
		$formatted = rtrim( rtrim( $formatted, '0' ), '.' );

		return '' === $formatted || '-0' === $formatted ? '0' : $formatted;
	}
}
