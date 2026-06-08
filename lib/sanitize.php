<?php
/**
 * Sanitizes the mf_fields meta value before persistence.
 *
 * mf_fields is a JSON array of MetaField objects saved by the React repeater.
 * Each field is sanitized individually.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_filter( 'gct_sanitize_post_type_meta', function ( array $meta, int $post_id ): array {
	if ( ! array_key_exists( 'mf_fields', $meta ) ) {
		return $meta;
	}

	$raw = $meta['mf_fields'];
	if ( ! is_array( $raw ) ) {
		$meta['mf_fields'] = array();
		return $meta;
	}

	$allowed_object_types = array( 'field', 'tab', 'accordion', 'endpoint' );
	$allowed_field_types  = array(
		'text', 'date', 'time', 'datetime', 'textarea', 'wysiwyg',
		'switcher', 'checkbox', 'iconpicker', 'media', 'gallery', 'radio',
		'repeater', 'select', 'number', 'colorpicker', 'posts', 'html', 'map',
	);
	$allowed_widths       = array( '100%', '75%', '66.6%', '50%', '33.3%', '25%' );
	$allowed_operators    = array(
		'equals', 'not_equals', 'contains', 'not_contains',
		'is_empty', 'is_not_empty', 'greater_than', 'less_than',
	);

	$clean = array();
	foreach ( $raw as $field ) {
		if ( ! is_array( $field ) ) {
			continue;
		}

		// Sanitize conditional rules.
		$rules = array();
		if ( isset( $field['conditional']['rules'] ) && is_array( $field['conditional']['rules'] ) ) {
			foreach ( $field['conditional']['rules'] as $rule ) {
				if ( ! is_array( $rule ) ) continue;
				$rules[] = array(
					'id'       => sanitize_text_field( (string) ( $rule['id'] ?? '' ) ),
					'fieldId'  => sanitize_text_field( (string) ( $rule['fieldId'] ?? '' ) ),
					'operator' => in_array( $rule['operator'] ?? '', $allowed_operators, true ) ? $rule['operator'] : 'equals',
					'value'    => sanitize_text_field( (string) ( $rule['value'] ?? '' ) ),
				);
			}
		}

		$clean[] = array(
			'id'             => sanitize_text_field( (string) ( $field['id'] ?? '' ) ),
			'label'          => sanitize_text_field( (string) ( $field['label'] ?? '' ) ),
			'name'           => sanitize_key( (string) ( $field['name'] ?? '' ) ),
			'objectType'     => in_array( $field['objectType'] ?? '', $allowed_object_types, true ) ? $field['objectType'] : 'field',
			'fieldType'      => in_array( $field['fieldType'] ?? '', $allowed_field_types, true ) ? $field['fieldType'] : 'text',
			'description'    => sanitize_textarea_field( (string) ( $field['description'] ?? '' ) ),
			'fieldWidth'     => in_array( $field['fieldWidth'] ?? '', $allowed_widths, true ) ? $field['fieldWidth'] : '100%',
			'revisionSupport'=> (bool) ( $field['revisionSupport'] ?? false ),
			'conditional'    => array(
				'enabled'  => (bool) ( $field['conditional']['enabled'] ?? false ),
				'relation' => in_array( $field['conditional']['relation'] ?? '', array( 'and', 'or' ), true ) ? $field['conditional']['relation'] : 'and',
				'rules'    => $rules,
			),
		);
	}

	$meta['mf_fields'] = $clean;
	return $meta;
}, 10, 2 );
