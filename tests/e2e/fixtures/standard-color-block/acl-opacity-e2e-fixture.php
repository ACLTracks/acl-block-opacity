<?php
/**
 * Plugin Name: ACL Opacity E2E Standard Color Block
 * Description: Development-only block fixture for ACL Block Opacity browser tests.
 * Version: 1.0.0
 * License: GPL-2.0-or-later
 *
 * @package ACLBlockOpacityE2EFixture
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'init',
	static function (): void {
		$script_path = __DIR__ . '/index.js';

		wp_register_script(
			'acl-opacity-e2e-standard-color-block',
			plugins_url( 'index.js', __FILE__ ),
			array( 'wp-block-editor', 'wp-blocks', 'wp-element', 'wp-i18n' ),
			(string) filemtime( $script_path ),
			true
		);

		register_block_type(
			'acl-opacity-e2e/standard-color',
			array(
				'api_version'   => 3,
				'attributes'    => array(
					'content' => array(
						'source'   => 'html',
						'selector' => 'p',
						'type'     => 'string',
					),
				),
				'editor_script' => 'acl-opacity-e2e-standard-color-block',
				'supports'      => array(
					'color' => array(
						'background' => true,
						'gradients'  => false,
						'text'       => true,
					),
					'html'  => false,
				),
			)
		);
	}
);
