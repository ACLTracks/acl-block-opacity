<?php
/**
 * Development-only theme mitigation fixture.
 *
 * @package ACLBlockOpacityPremitigatedFixture
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'wp_enqueue_scripts',
	static function (): void {
		wp_enqueue_style(
			'phase5-theme-compatibility-fixture',
			get_stylesheet_uri(),
			array(),
			(string) wp_get_theme()->get( 'Version' )
		);
	}
);

add_filter(
	'render_block',
	static function ( string $block_content, array $block ): string {
		if (
			'core/cover' === ( $block['blockName'] ?? '' ) ||
			! empty( $block['attrs']['textColor'] )
		) {
			return $block_content;
		}

		$color = $block['attrs']['style']['color']['text'] ?? null;

		if ( ! is_string( $color ) || '' === trim( $color ) ) {
			return $block_content;
		}

		$processor = new WP_HTML_Tag_Processor( $block_content );

		if ( ! $processor->next_tag() || ! $processor->has_class( 'has-text-color' ) ) {
			return $block_content;
		}

		if ( ! $processor->has_class( 'phase5-theme-compat-text' ) ) {
			$processor->add_class( 'phase5-theme-compat-text' );
		}

		$style = $processor->get_attribute( 'style' );
		$style = is_string( $style ) ? rtrim( $style ) : '';

		if ( '' !== $style && ';' !== substr( $style, -1 ) ) {
			$style .= ';';
		}

		$processor->set_attribute(
			'style',
			$style . '--phase5-theme-text-color:' . trim( $color )
		);

		return $processor->get_updated_html();
	},
	10,
	2
);
