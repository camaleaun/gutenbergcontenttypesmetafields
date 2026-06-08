<?php
/**
 * Runtime effects + export/schema filter hooks for the Meta Fields PoC.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// ---- Runtime: apply meta field visibility -----------------------------------

add_action( 'init', function (): void {
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

		$show_excerpt       = isset( $meta['mf_excerpt'] )       ? (bool) $meta['mf_excerpt']       : true;
		$show_custom_fields = isset( $meta['mf_custom_fields'] ) ? (bool) $meta['mf_custom_fields'] : false;
		$show_comments      = isset( $meta['mf_comments'] )      ? (bool) $meta['mf_comments']      : true;

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
}, 20 );

// ---- Export: include mf_fields in the exported post type data ---------------

/**
 * Adds the meta_fields array to each exported post type.
 *
 * @param array<string,mixed> $pt     Normalized post type data.
 * @param WP_Post             $record Raw post record.
 */
add_filter( 'gct_export_post_type', function ( array $pt, WP_Post $record ): array {
	$raw_meta = get_post_meta( $record->ID, '_gct_meta', true );
	if ( ! $raw_meta ) {
		return $pt;
	}
	$meta = json_decode( $raw_meta, true );
	if ( ! is_array( $meta ) || empty( $meta['mf_fields'] ) ) {
		return $pt;
	}
	$pt['meta_fields'] = $meta['mf_fields'];
	return $pt;
}, 10, 2 );

// ---- Export: extend the JSON Schema with meta_fields property ---------------

add_filter( 'gct_export_schema', function ( array $schema ): array {
	// The post_type definition lives under definitions.post_type (via $ref),
	// NOT under properties.post_types.items.properties.
	if ( ! isset( $schema['definitions']['post_type']['properties'] ) ||
		! is_array( $schema['definitions']['post_type']['properties'] ) ) {
		return $schema;
	}

	// Add meta_fields to the post_type definition properties.
	$schema['definitions']['post_type']['properties']['meta_fields'] = array(
		'type'        => 'array',
		'description' => 'Meta fields configured for this post type (gutenbergcontenttypesmetafields).',
		'items'       => array(
			'type'       => 'object',
			'properties' => array(
				'id'              => array( 'type' => 'string' ),
				'label'           => array( 'type' => 'string' ),
				'name'            => array( 'type' => 'string' ),
				'objectType'      => array( 'type' => 'string', 'enum' => array( 'field', 'tab', 'accordion', 'endpoint' ) ),
				'fieldType'       => array( 'type' => 'string' ),
				'description'     => array( 'type' => 'string' ),
				'fieldWidth'      => array( 'type' => 'string' ),
				'revisionSupport' => array( 'type' => 'boolean' ),
				'conditional'     => array( 'type' => 'object' ),
				'typeConfig'      => array( 'type' => 'object' ),
			),
		),
	);

	// additionalProperties:false would reject meta_fields — relax it.
	unset( $schema['definitions']['post_type']['additionalProperties'] );

	return $schema;
} );
