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

		$field_type  = in_array( $field['fieldType'] ?? '', $allowed_field_types, true ) ? $field['fieldType'] : 'text';
		$type_config = mf_sanitize_type_config( $field_type, $field['typeConfig'] ?? null );

		$clean_field = array(
			'id'             => sanitize_text_field( (string) ( $field['id'] ?? '' ) ),
			'label'          => sanitize_text_field( (string) ( $field['label'] ?? '' ) ),
			'name'           => sanitize_key( (string) ( $field['name'] ?? '' ) ),
			'objectType'     => in_array( $field['objectType'] ?? '', $allowed_object_types, true ) ? $field['objectType'] : 'field',
			'fieldType'      => $field_type,
			'description'    => sanitize_textarea_field( (string) ( $field['description'] ?? '' ) ),
			'fieldWidth'     => in_array( $field['fieldWidth'] ?? '', $allowed_widths, true ) ? $field['fieldWidth'] : '100%',
			'revisionSupport'=> (bool) ( $field['revisionSupport'] ?? false ),
			'conditional'    => array(
				'enabled'  => (bool) ( $field['conditional']['enabled'] ?? false ),
				'relation' => in_array( $field['conditional']['relation'] ?? '', array( 'and', 'or' ), true ) ? $field['conditional']['relation'] : 'and',
				'rules'    => $rules,
			),
		);
		if ( null !== $type_config ) {
			$clean_field['typeConfig'] = $type_config;
		}
		$clean[] = $clean_field;
	}

	$meta['mf_fields'] = $clean;
	return $meta;
}, 10, 2 );

/**
 * Sanitizes the typeConfig object for a given field type.
 *
 * @param  string     $field_type  e.g. 'select', 'number', 'text'.
 * @param  mixed      $raw         Raw typeConfig value from the request.
 * @return array|null Sanitized config, or null if not applicable.
 */
function mf_sanitize_type_config( string $field_type, $raw ): ?array {
	if ( ! is_array( $raw ) ) {
		return null;
	}

	switch ( $field_type ) {
		case 'select':
		case 'radio':
		case 'checkbox':
			$options = array();
			foreach ( (array) ( $raw['options'] ?? array() ) as $opt ) {
				if ( ! is_array( $opt ) ) continue;
				$options[] = array(
					'id'    => sanitize_text_field( (string) ( $opt['id'] ?? '' ) ),
					'label' => sanitize_text_field( (string) ( $opt['label'] ?? '' ) ),
					'value' => sanitize_key( (string) ( $opt['value'] ?? '' ) ),
				);
			}
			$config = array( 'options' => $options );
			if ( isset( $raw['multiple'] ) ) {
				$config['multiple'] = (bool) $raw['multiple'];
			}
			return $config;

		case 'number':
			$config = array();
			foreach ( array( 'min', 'max', 'step' ) as $k ) {
				if ( isset( $raw[ $k ] ) && is_numeric( $raw[ $k ] ) ) {
					$config[ $k ] = (float) $raw[ $k ];
				}
			}
			return empty( $config ) ? null : $config;

		case 'text':
		case 'textarea':
			$config = array();
			if ( isset( $raw['maxLength'] ) && is_numeric( $raw['maxLength'] ) ) {
				$config['maxLength'] = (int) $raw['maxLength'];
			}
			if ( ! empty( $raw['placeholder'] ) ) {
				$config['placeholder'] = sanitize_text_field( (string) $raw['placeholder'] );
			}
			return empty( $config ) ? null : $config;

		case 'media':
		case 'gallery':
			$allowed_media = array( 'image', 'video', 'audio', 'application' );
			$types = array_filter(
				(array) ( $raw['allowedTypes'] ?? array() ),
				static fn( $t ) => in_array( $t, $allowed_media, true )
			);
			return ! empty( $types ) ? array( 'allowedTypes' => array_values( $types ) ) : null;

		default:
			return null;
	}
}
