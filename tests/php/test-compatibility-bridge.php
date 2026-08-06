<?php
/**
 * Compatibility seam tests.
 *
 * @package AshesCreativeLabs\BlockOpacity\Tests
 */

declare(strict_types=1);

namespace AshesCreativeLabs\BlockOpacity\Tests;

use AshesCreativeLabs\BlockOpacity\Compatibility_Bridge;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

/**
 * Confirms the later-phase bridge remains non-operational.
 */
final class Test_Compatibility_Bridge extends TestCase {
	/**
	 * The Phase 2 seam must expose no behavior or hook registration.
	 */
	public function test_bridge_is_non_operational(): void {
		$reflection = new ReflectionClass( Compatibility_Bridge::class );

		self::assertSame( array(), $reflection->getMethods() );
	}
}
