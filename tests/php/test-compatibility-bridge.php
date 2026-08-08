<?php
/**
 * Runtime compatibility bridge tests.
 *
 * @package AshesCreativeLabs\BlockOpacity\Tests
 */

declare(strict_types=1);

namespace AshesCreativeLabs\BlockOpacity\Tests;

use AshesCreativeLabs\BlockOpacity\Compatibility_Bridge;
use AshesCreativeLabs\BlockOpacity\Text_Collision_Detector;
use PHPUnit\Framework\TestCase;

/**
 * Verifies the first-root-only, marker-free persistence contract.
 */
final class Test_Compatibility_Bridge extends TestCase {
	/**
	 * Captured action registrations.
	 *
	 * @var array<int, array<int, mixed>>
	 */
	public static $actions = array();

	/**
	 * Captured filter registrations.
	 *
	 * @var array<int, array<int, mixed>>
	 */
	public static $filters = array();

	/**
	 * Captured compatibility styles.
	 *
	 * @var array<int, array<int, mixed>>
	 */
	public static $styles = array();

	/**
	 * Reset captured WordPress calls.
	 */
	protected function setUp(): void {
		self::$actions = array();
		self::$filters = array();
		self::$styles  = array();
	}

	/**
	 * Register only the authorized render filter and conditional style hooks.
	 */
	public function test_registers_runtime_hooks(): void {
		$bridge = $this->bridge();

		$bridge->register_hooks();

		self::assertSame( 'render_block', self::$filters[0][0] );
		self::assertSame( 10, self::$filters[0][2] );
		self::assertSame( 2, self::$filters[0][3] );
		self::assertSame(
			array( 'enqueue_block_assets' ),
			array_column( self::$actions, 0 )
		);
		self::assertSame( array( 20 ), array_column( self::$actions, 2 ) );
	}

	/**
	 * Normal sites do not load compatibility CSS.
	 */
	public function test_does_not_enqueue_style_without_collision_potential(): void {
		$this->bridge( array() )->enqueue_compatibility_style();

		self::assertSame( array(), self::$styles );
	}

	/**
	 * Collision sites load the static stylesheet with no script.
	 */
	public function test_enqueues_style_for_collision_potential(): void {
		$bridge = $this->bridge();

		$bridge->enqueue_compatibility_style();

		self::assertCount( 1, self::$styles );
		self::assertSame( Compatibility_Bridge::STYLE_HANDLE, self::$styles[0][0] );
		self::assertStringEndsWith( '/assets/css/compatibility.css', self::$styles[0][1] );
		self::assertSame( array(), self::$styles[0][2] );
	}

	/**
	 * Supported strict RGB grammars receive the runtime correction.
	 *
	 * @param string $color Supported literal.
	 * @dataProvider valid_color_provider
	 */
	public function test_bridges_valid_rgb_literals( string $color ): void {
		$bridge  = $this->bridge();
		$content = '<p class="alpha has-text-color omega">Text</p>';
		$result  = $bridge->filter_render_block(
			$content,
			$this->block( array( 'style' => array( 'color' => array( 'text' => $color ) ) ) )
		);

		self::assertStringContainsString( Compatibility_Bridge::MARKER_CLASS, $result );
		self::assertStringContainsString(
			Compatibility_Bridge::COLOR_PROPERTY . ':' . $color,
			$result
		);
	}

	/**
	 * Provide accepted legacy and modern RGB forms.
	 *
	 * @return iterable<string, array<int, string>>
	 */
	public static function valid_color_provider(): iterable {
		yield 'rgb' => array( 'rgb(1, 2, 3)' );
		yield 'rgba' => array( 'rgba(1, 2, 3, 0.5)' );
		yield 'modern rgb' => array( 'rgb(10% 20% 30% / 40%)' );
	}

	/**
	 * Cover is rejected before any render mutation.
	 */
	public function test_excludes_cover(): void {
		$content = '<div class="has-text-color">Cover</div>';
		$block   = $this->block(
			array( 'style' => array( 'color' => array( 'text' => '#123456' ) ) ),
			'core/cover'
		);

		self::assertSame( $content, $this->bridge()->filter_render_block( $content, $block ) );
	}

	/**
	 * Missing, unsupported, and preset-authoritative values are no-ops.
	 */
	public function test_rejects_missing_unsupported_and_active_preset_values(): void {
		$content = '<p class="has-text-color">Text</p>';
		$bridge  = $this->bridge();
		$cases   = array(
			array(),
			array( 'style' => array( 'color' => array( 'text' => 'hsl(0 100% 50%)' ) ) ),
			array(
				'style'     => array( 'color' => array( 'text' => 'rgba(1, 2, 3, 0.5)' ) ),
				'textColor' => 'text',
			),
		);

		foreach ( $cases as $attributes ) {
			self::assertSame(
				$content,
				$bridge->filter_render_block( $content, $this->block( $attributes ) )
			);
		}
	}

	/**
	 * A block without standard text support cannot trigger the bridge.
	 */
	public function test_requires_standard_text_support(): void {
		$content = '<p class="has-text-color">Text</p>';
		$bridge  = $this->bridge( null, false );

		self::assertSame(
			$content,
			$bridge->filter_render_block(
				$content,
				$this->block(
					array( 'style' => array( 'color' => array( 'text' => '#123456' ) ) )
				)
			)
		);
	}

	/**
	 * The first element must itself carry the standard root state.
	 */
	public function test_requires_has_text_color_on_first_root(): void {
		$content = '<div class="wp-block-group"><p class="has-text-color">Child</p></div>';

		self::assertSame(
			$content,
			$this->bridge()->filter_render_block(
				$content,
				$this->block(
					array( 'style' => array( 'color' => array( 'text' => '#123456' ) ) )
				)
			)
		);
	}

	/**
	 * Existing classes, declarations, properties, and ordering are preserved.
	 */
	public function test_preserves_existing_class_and_inline_style(): void {
		$content = '<p class="theme-fix has-text-color custom" data-id="7" style="margin: 1px; --theme-text: blue; padding: 2px">Text</p>';
		$result  = $this->bridge()->filter_render_block(
			$content,
			$this->block(
				array(
					'style' => array(
						'color' => array( 'text' => 'rgba(1, 2, 3, 0.5)' ),
					),
				)
			)
		);

		self::assertStringContainsString( 'theme-fix has-text-color custom', $result );
		self::assertStringContainsString( 'data-id="7"', $result );
		self::assertStringContainsString(
			'style="margin: 1px; --theme-text: blue; padding: 2px;' .
			Compatibility_Bridge::COLOR_PROPERTY . ':rgba(1, 2, 3, 0.5)"',
			$result
		);
	}

	/**
	 * Repeated filtering neither duplicates nor changes runtime output.
	 */
	public function test_is_idempotent(): void {
		$bridge = $this->bridge();
		$block  = $this->block(
			array( 'style' => array( 'color' => array( 'text' => '#123456' ) ) )
		);
		$once   = $bridge->filter_render_block(
			'<p class="has-text-color">Text</p>',
			$block
		);
		$twice  = $bridge->filter_render_block( $once, $block );

		self::assertSame( $once, $twice );
		self::assertSame( 1, substr_count( $twice, Compatibility_Bridge::MARKER_CLASS ) );
		self::assertSame( 1, substr_count( $twice, Compatibility_Bridge::COLOR_PROPERTY ) );
	}

	/**
	 * Only the first root is processed; nested markup remains byte-identical.
	 */
	public function test_processes_root_only(): void {
		$nested = '<p class="has-text-color" style="color:blue">Child</p>';
		$result = $this->bridge()->filter_render_block(
			'<div class="has-text-color">' . $nested . '</div>',
			$this->block(
				array( 'style' => array( 'color' => array( 'text' => '#123456' ) ) )
			)
		);

		self::assertStringContainsString( $nested, $result );
		self::assertSame( 1, substr_count( $result, Compatibility_Bridge::MARKER_CLASS ) );
	}

	/**
	 * Empty and malformed content fail safely.
	 */
	public function test_empty_and_malformed_content_are_unchanged(): void {
		$block = $this->block(
			array( 'style' => array( 'color' => array( 'text' => '#123456' ) ) )
		);

		self::assertSame( '', $this->bridge()->filter_render_block( '', $block ) );
		self::assertSame(
			'<p class="has-text-color"',
			$this->bridge()->filter_render_block( '<p class="has-text-color"', $block )
		);
	}

	/**
	 * Existing theme mitigation coexists without being changed or duplicated.
	 */
	public function test_coexists_with_theme_mitigation(): void {
		$content = '<p class="theme-compat has-text-color" style="--theme-text-color:rgba(4, 5, 6, 0.5)">Text</p>';
		$result  = $this->bridge()->filter_render_block(
			$content,
			$this->block(
				array( 'style' => array( 'color' => array( 'text' => 'rgba(4, 5, 6, 0.5)' ) ) )
			)
		);

		self::assertSame( 1, substr_count( $result, 'theme-compat' ) );
		self::assertSame( 1, substr_count( $result, '--theme-text-color' ) );
		self::assertSame( 1, substr_count( $result, Compatibility_Bridge::MARKER_CLASS ) );
	}

	/**
	 * The style updater preserves complex unrelated declaration text.
	 */
	public function test_style_upsert_preserves_unrelated_declarations(): void {
		$style = 'background-image:url("data:image/svg+xml;a;b"); color: red';

		self::assertSame(
			$style . ';' . Compatibility_Bridge::COLOR_PROPERTY . ':#123456',
			Compatibility_Bridge::upsert_custom_property( $style, '#123456' )
		);
	}

	/**
	 * Existing duplicate plugin properties collapse to one updated value.
	 */
	public function test_style_upsert_updates_and_deduplicates_property(): void {
		$style = 'color:red;--acl-block-opacity-text-color:old;--acl-block-opacity-text-color:older;background:blue';

		self::assertSame(
			'color:red;--acl-block-opacity-text-color:new;background:blue',
			Compatibility_Bridge::upsert_custom_property( $style, 'new' )
		);
	}

	/**
	 * Filtering does not mutate the parsed block data used as saved content.
	 */
	public function test_does_not_mutate_block_data(): void {
		$block    = $this->block(
			array( 'style' => array( 'color' => array( 'text' => '#123456' ) ) )
		);
		$snapshot = $block;

		$this->bridge()->filter_render_block(
			'<p class="has-text-color">Text</p>',
			$block
		);

		self::assertSame( $snapshot, $block );
	}

	/**
	 * Build a test bridge with controlled settings and block support.
	 *
	 * @param array<string, mixed>|null $settings Settings; null uses collision settings.
	 * @param bool                      $text_support Whether the block supports text color.
	 */
	private function bridge( ?array $settings = null, bool $text_support = true ): Compatibility_Bridge {
		$settings = $settings ?? array(
			'color' => array(
				'palette' => array(
					'theme' => array(
						array(
							'slug'  => 'text',
							'color' => '#112233',
						),
					),
				),
			),
		);
		$detector = new Text_Collision_Detector(
			static function () use ( $settings ): array {
				return $settings;
			}
		);

		return new Compatibility_Bridge(
			dirname( __DIR__, 2 ) . '/acl-block-opacity.php',
			$detector,
			static function ( string $html ): Fake_HTML_Tag_Processor {
				return new Fake_HTML_Tag_Processor( $html );
			},
			static function () use ( $text_support ): bool {
				return $text_support;
			}
		);
	}

	/**
	 * Create parsed block data around standard attributes.
	 *
	 * @param array<string, mixed> $attributes Standard attributes.
	 * @param string               $name       Block name.
	 * @return array<string, mixed>
	 */
	private function block( array $attributes, string $name = 'core/paragraph' ): array {
		return array(
			'attrs'     => $attributes,
			'blockName' => $name,
		);
	}
}
