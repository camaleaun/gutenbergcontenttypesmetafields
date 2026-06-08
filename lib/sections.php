<?php
/**
 * Registers the "Meta Fields" section in the post type edit form.
 *
 * Priority 40 — appears after Advanced (30).
 * Change to e.g. 29 to insert before Advanced.
 *
 * The section body is rendered entirely by the JS bundle (MetaFieldRepeater)
 * via gctRegisterSectionRenderer — no PHP fields are registered here.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_filter( 'gct_post_type_form_sections', function ( array $sections ): array {
	$sections[] = array(
		'id'          => 'meta_fields',
		'label'       => __( 'Meta Fields', 'gutenbergcontenttypesmetafields' ),
		'description' => __( 'Configure built-in meta fieldes and default custom fields for this post type.', 'gutenbergcontenttypesmetafields' ),
		'priority'    => 40,
		'opened'      => false,
	);
	return $sections;
} );
