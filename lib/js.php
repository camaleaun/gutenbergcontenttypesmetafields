<?php
/**
 * Applies the meta field configuration at runtime.
 *
 * Uses the `add_meta_fields_{post_type}` action to remove or keep meta fieldes
 * based on the values stored in _gct_meta for the post type record.
 *
 * This demonstrates the real-world effect of the PoC: the settings saved
 * in the content-types admin actually influence WordPress behaviour.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'init', function (): void {
	// Apply meta field visibility for every registered user post type.
	$records = get_posts( array(
		'post_type'        => 'wp_user_post_type',
		'post_status'      => 'publish',
		'posts_per_page'   => -1,
		'no_found_rows'    => true,
		'suppress_filters' => true,
	) );

	foreach ( $records as $record ) {
		$slug = $record->post_name;
		$meta = gct_get_record_meta( $record->ID );

		// Default values match field definitions.
		$show_excerpt       = isset( $meta['mf_excerpt'] )       ? (bool) $meta['mf_excerpt']       : true;
		$show_custom_fields = isset( $meta['mf_custom_fields'] ) ? (bool) $meta['mf_custom_fields'] : false;
		$show_comments      = isset( $meta['mf_comments'] )      ? (bool) $meta['mf_comments']      : true;

		// Use a closure to capture $slug and settings for each post type.
		add_action(
			"add_meta_fields_{$slug}",
			static function () use ( $slug, $show_excerpt, $show_custom_fields, $show_comments ) {
				if ( ! $show_excerpt ) {
					remove_meta_box( 'postexcerpt', $slug, 'normal' );
				}
				if ( ! $show_custom_fields ) {
					remove_meta_box( 'postcustom', $slug, 'normal' );
				}
				if ( ! $show_comments ) {
					remove_meta_box( 'commentstatusdiv', $slug, 'normal' );
					remove_meta_box( 'commentsdiv',      $slug, 'normal' );
				}
			}
		);
	}
}, 20 ); // After post types are registered (priority 10).
