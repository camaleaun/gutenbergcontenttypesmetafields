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
	require_once __DIR__ . '/lib/meta-box.php';
}, 5 );

// Enqueue the compiled JS bundle on the content-types admin page.
// Must run BEFORE the core plugin's React app mounts so gctRegisterSectionRenderer
// is called before ExtensionSectionPanel first renders.
add_action( 'admin_enqueue_scripts', function (): void {
	// wp-scripts generates asset files named after the entry point, including extension.
	$candidates = array(
		__DIR__ . '/build/index.tsx.asset.php', // wp-scripts with .tsx entry
		__DIR__ . '/build/index.asset.php',     // wp-scripts with .js entry
	);
	$asset_file = null;
	foreach ( $candidates as $candidate ) {
		if ( file_exists( $candidate ) ) {
			$asset_file = $candidate;
			break;
		}
	}
	if ( ! $asset_file ) {
		return;
	}
	$asset = require $asset_file;

	// Derive the JS filename from the asset file name.
	$js_base = basename( $asset_file, '.asset.php' ) . '.js';

	// Add 'gct-flags' as a dependency only when it is already registered
	// (i.e. we are on the content-types admin page and the core plugin is active).
	// Avoids the "dependency not registered" notice on other admin pages.
	$deps = $asset['dependencies'];
	if ( wp_script_is( 'gct-flags', 'registered' ) ) {
		$deps[] = 'gct-flags';
	}
	$deps = array_unique( $deps );

	wp_enqueue_script(
		'gutenbergcontenttypesmetafields',
		plugins_url( 'build/' . $js_base, __FILE__ ),
		$deps,
		$asset['version'],
		false // in <head> — must execute before the core React app deferred scripts
	);

	// CSS: check both naming conventions.
	$css_candidates = array(
		__DIR__ . '/build/style-index.tsx.css',
		__DIR__ . '/build/index.css',
	);
	foreach ( $css_candidates as $css_file ) {
		if ( file_exists( $css_file ) ) {
			wp_enqueue_style(
				'gutenbergcontenttypesmetafields',
				plugins_url( 'build/' . basename( $css_file ), __FILE__ ),
				array(),
				$asset['version']
			);
			break;
		}
	}
} );
