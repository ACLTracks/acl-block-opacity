<?php
/**
 * Route isolated PHP development-server requests through WordPress.
 *
 * @package ACLBlockOpacityE2E
 */

$request_path = parse_url( $_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH );
$file_path    = __DIR__ . ( is_string( $request_path ) ? $request_path : '/' );

if ( is_file( $file_path ) ) {
	return false;
}

if ( is_string( $request_path ) && 0 === strpos( $request_path, '/wp-json' ) ) {
	$_GET['rest_route'] = substr( $request_path, 8 ) ?: '/';
}

require __DIR__ . '/index.php';
