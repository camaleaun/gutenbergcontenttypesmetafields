<?php
/**
 * Plugin Name: Gutenberg Content Types — Meta Fields
 * Plugin URI:  https://github.com/camaleaun/gutenbergcontenttypes
 * Description: Proof-of-concept extension that adds a "Meta Fields" section to the post type edit form, allowing per-post-type meta field configuration.
 * Version:     0.1.0
 * Author:      camaleaun
 * License:     GPL-2.0-or-later
 * Text Domain: gutenbergcontenttypesmetafields
 *
 * Requires Plugins: gutenbergcontenttypes
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Guard: only run when the core plugin's extension API is available.
add_action( 'init', function (): void {
	if ( ! function_exists( 'gct_get_post_type_form_sections' ) ) {
		return;
	}
	require_once __DIR__ . '/lib/sections.php';
	require_once __DIR__ . '/lib/sanitize.php';
	require_once __DIR__ . '/lib/js.php';
}, 5 );

// Enqueue the compiled JS bundle on the content-types admin page.
add_action( 'admin_enqueue_scripts', function (): void {
	$asset_file = __DIR__ . '/build/index.asset.php';
	if ( ! file_exists( $asset_file ) ) {
		return;
	}
	$asset = require $asset_file;
	wp_enqueue_script(
		'gutenbergcontenttypesmetafields',
		plugins_url( 'build/index.js', __FILE__ ),
		$asset['dependencies'],
		$asset['version'],
		array( 'strategy' => 'defer' )
	);
	if ( file_exists( __DIR__ . '/build/index.css' ) ) {
		wp_enqueue_style(
			'gutenbergcontenttypesmetafields',
			plugins_url( 'build/index.css', __FILE__ ),
			array(),
			$asset['version']
		);
	}
} ); // Before priority 10 so sections are registered before gct_get_post_type_form_sections() is called.
