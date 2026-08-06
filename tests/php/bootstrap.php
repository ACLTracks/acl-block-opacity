<?php
/**
 * PHPUnit bootstrap.
 *
 * @package AshesCreativeLabs\BlockOpacity\Tests
 */

declare(strict_types=1);

define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );

require dirname( __DIR__, 2 ) . '/vendor/autoload.php';
require __DIR__ . '/stubs/assets-functions.php';
