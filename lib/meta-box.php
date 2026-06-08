<?php
/**
 * Registers a "Settings" meta box for every user post type that has mf_fields.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Returns post types with renderable mf_fields. @return array[] */
function mf_get_configured_post_types(): array {
	static $cache = null;
	if ( null !== $cache ) return $cache;
	$records = get_posts( array(
		'post_type' => 'wp_user_post_type', 'post_status' => 'publish',
		'posts_per_page' => -1, 'no_found_rows' => true, 'suppress_filters' => true,
	) );
	$cache = array();
	foreach ( $records as $record ) {
		$meta   = gct_get_record_meta( $record->ID );
		$fields = $meta['mf_fields'] ?? array();
		if ( ! is_array( $fields ) || empty( $fields ) ) continue;
		$renderable = array_values( array_filter( $fields, static fn( $f ) => ( $f['objectType'] ?? 'field' ) === 'field' ) );
		if ( empty( $renderable ) ) continue;
		$cache[] = array( 'slug' => $record->post_name, 'fields' => $renderable );
	}
	return $cache;
}

// ---- Register meta boxes ---------------------------------------------------
add_action( 'add_meta_boxes', function (): void {
	foreach ( mf_get_configured_post_types() as $pt ) {
		$slug = $pt['slug']; $fields = $pt['fields'];
		add_meta_box(
			'mf_settings_' . $slug,
			__( 'Settings', 'gutenbergcontenttypesmetafields' ),
			static fn( WP_Post $post ) => mf_render_meta_box( $post, $fields ),
			$slug, 'normal', 'high'
		);
	}
} );

// ---- Render meta box -------------------------------------------------------
function mf_render_meta_box( WP_Post $post, array $fields ): void {
	wp_nonce_field( 'mf_save_meta_' . $post->ID, 'mf_meta_nonce' );

	// Group by fieldWidth into rows.
	$rows = array(); $buffer = array();
	foreach ( $fields as $field ) {
		$width = $field['fieldWidth'] ?? '100%';
		if ( '100%' === $width ) {
			if ( ! empty( $buffer ) ) { $rows[] = $buffer; $buffer = array(); }
			$rows[] = array( $field );
		} else {
			$buffer[] = $field;
			$total = array_sum( array_map(
				static fn( $f ) => (float) rtrim( $f['fieldWidth'] ?? '100%', '%' ), $buffer
			) );
			if ( $total >= 99.9 ) { $rows[] = $buffer; $buffer = array(); }
		}
	}
	if ( ! empty( $buffer ) ) $rows[] = $buffer;

	echo '<div class="mf-meta-box">';
	foreach ( $rows as $row ) {
		echo '<div class="mf-meta-box__row mf-meta-box__row--cols-' . esc_attr( (string) count( $row ) ) . '">';
		foreach ( $row as $field ) mf_render_field( $post->ID, $field );
		echo '</div>';
	}
	echo '</div>';
	mf_enqueue_meta_box_assets();
}

// ---- Field-type renderers -------------------------------------------------
function mf_render_switcher( string $name, bool $checked ): void {
	$id = 'mf_' . $name;
	echo '<div class="mf-switcher">';
	echo '<input type="hidden" name="mf_' . esc_attr( $name ) . '" value="0">';
	echo '<input type="checkbox" id="' . esc_attr( $id ) . '" name="mf_' . esc_attr( $name ) . '" value="1" class="mf-switcher__input"' . checked( $checked, true, false ) . '>';
	echo '<label class="mf-switcher__track" for="' . esc_attr( $id ) . '"><span class="mf-switcher__thumb"></span><span class="mf-switcher__on">' . esc_html__( 'On', 'gutenbergcontenttypesmetafields' ) . '</span><span class="mf-switcher__off">' . esc_html__( 'Off', 'gutenbergcontenttypesmetafields' ) . '</span></label>';
	echo '</div>';
}

function mf_render_checkboxes( string $name, array $options, array $selected ): void {
	if ( empty( $options ) ) { echo '<em class="mf-meta-box__empty">' . esc_html__( 'No options configured.', 'gutenbergcontenttypesmetafields' ) . '</em>'; return; }
	echo '<div class="mf-checkbox-group">';
	foreach ( $options as $opt ) {
		$val = $opt['value'] ?? ''; $lbl = $opt['label'] ?? $val;
		echo '<label class="mf-checkbox-group__item"><input type="checkbox" name="mf_' . esc_attr( $name ) . '[]" value="' . esc_attr( $val ) . '"' . ( in_array( $val, $selected, true ) ? ' checked' : '' ) . '> ' . esc_html( $lbl ) . '</label>';
	}
	echo '</div>';
}

function mf_render_radio( string $name, array $options, string $selected ): void {
	if ( empty( $options ) ) { echo '<em class="mf-meta-box__empty">' . esc_html__( 'No options configured.', 'gutenbergcontenttypesmetafields' ) . '</em>'; return; }
	echo '<div class="mf-radio-group">';
	foreach ( $options as $opt ) {
		$val = $opt['value'] ?? ''; $lbl = $opt['label'] ?? $val;
		echo '<label class="mf-radio-group__item"><input type="radio" name="mf_' . esc_attr( $name ) . '" value="' . esc_attr( $val ) . '"' . checked( $selected, $val, false ) . '> ' . esc_html( $lbl ) . '</label>';
	}
	echo '</div>';
}

function mf_render_select( string $name, array $config, string $selected ): void {
	$options = $config['options'] ?? array(); $multiple = $config['multiple'] ?? false;
	if ( empty( $options ) ) { echo '<em class="mf-meta-box__empty">' . esc_html__( 'No options configured.', 'gutenbergcontenttypesmetafields' ) . '</em>'; return; }
	$field_name = $multiple ? 'mf_' . $name . '[]' : 'mf_' . $name;
	$attrs = $multiple ? ' multiple size="' . min( count( $options ), 6 ) . '"' : '';
	echo '<select id="mf_' . esc_attr( $name ) . '" name="' . esc_attr( $field_name ) . '" class="mf-meta-box__select"' . $attrs . '>';
	if ( ! $multiple ) echo '<option value="">' . esc_html__( '\u2014 Select \u2014', 'gutenbergcontenttypesmetafields' ) . '</option>';
	foreach ( $options as $opt ) {
		$val = $opt['value'] ?? ''; $lbl = $opt['label'] ?? $val;
		echo '<option value="' . esc_attr( $val ) . '"' . selected( $selected, $val, false ) . '>' . esc_html( $lbl ) . '</option>';
	}
	echo '</select>';
}

function mf_render_media( string $name, string $value ): void {
	$aid = (int) $value; $thumb = $aid ? wp_get_attachment_image_url( $aid, 'thumbnail' ) : '';
	echo '<div class="mf-media-field" data-name="' . esc_attr( $name ) . '">';
	echo '<input type="hidden" id="mf_' . esc_attr( $name ) . '" name="mf_' . esc_attr( $name ) . '" value="' . esc_attr( $value ) . '" class="mf-media-field__id">';
	if ( $thumb ) echo '<img src="' . esc_url( $thumb ) . '" class="mf-media-field__preview" alt="">';
	else echo '<span class="mf-media-field__placeholder">' . esc_html__( 'No file selected', 'gutenbergcontenttypesmetafields' ) . '</span>';
	echo '<button type="button" class="button mf-media-field__choose">' . esc_html__( 'Choose', 'gutenbergcontenttypesmetafields' ) . '</button>';
	echo '<button type="button" class="button mf-media-field__remove"' . ( $value ? '' : ' style="display:none"' ) . '>' . esc_html__( 'Remove', 'gutenbergcontenttypesmetafields' ) . '</button>';
	echo '</div>';
}

// ---- Render single field ---------------------------------------------------
function mf_render_field( int $post_id, array $field ): void {
	$name     = $field['name']        ?? '';
	$label    = $field['label']       ?? $name;
	$desc     = $field['description'] ?? '';
	$type     = $field['fieldType']   ?? 'text';
	$config   = $field['typeConfig']  ?? array();
	$meta_key = '_mf_' . $name;
	$value    = get_post_meta( $post_id, $meta_key, true );

	echo '<div class="mf-meta-box__field mf-meta-box__field--' . esc_attr( $type ) . '">';
	echo '<label class="mf-meta-box__label" for="mf_' . esc_attr( $name ) . '">' . esc_html( $label ) . '</label>';
	if ( $desc ) echo '<span class="mf-meta-box__desc">' . esc_html( $desc ) . '</span>';

	switch ( $type ) {
		case 'switcher':  mf_render_switcher( $name, (bool) $value ); break;
		case 'checkbox':  mf_render_checkboxes( $name, $config['options'] ?? array(), is_array( $value ) ? $value : ( $value ? array( $value ) : array() ) ); break;
		case 'radio':     mf_render_radio( $name, $config['options'] ?? array(), (string) $value ); break;
		case 'select':    mf_render_select( $name, $config, (string) $value ); break;
		case 'textarea': case 'wysiwyg':
			echo '<textarea id="mf_' . esc_attr( $name ) . '" name="mf_' . esc_attr( $name ) . '" class="mf-meta-box__textarea widefat" rows="4">' . esc_textarea( (string) $value ) . '</textarea>'; break;
		case 'number':
			$a = '';
			if ( isset( $config['min'] ) )  $a .= ' min="'  . esc_attr( $config['min'] ) . '"';
			if ( isset( $config['max'] ) )  $a .= ' max="'  . esc_attr( $config['max'] ) . '"';
			if ( isset( $config['step'] ) ) $a .= ' step="' . esc_attr( $config['step'] ) . '"';
			echo '<input type="number" id="mf_' . esc_attr( $name ) . '" name="mf_' . esc_attr( $name ) . '" value="' . esc_attr( (string) $value ) . '" class="mf-meta-box__input widefat"' . $a . '>'; break;
		case 'date':
			echo '<input type="date" id="mf_' . esc_attr( $name ) . '" name="mf_' . esc_attr( $name ) . '" value="' . esc_attr( (string) $value ) . '" class="mf-meta-box__input">'; break;
		case 'time':
			echo '<input type="time" id="mf_' . esc_attr( $name ) . '" name="mf_' . esc_attr( $name ) . '" value="' . esc_attr( (string) $value ) . '" class="mf-meta-box__input">'; break;
		case 'datetime':
			echo '<input type="datetime-local" id="mf_' . esc_attr( $name ) . '" name="mf_' . esc_attr( $name ) . '" value="' . esc_attr( (string) $value ) . '" class="mf-meta-box__input">'; break;
		case 'colorpicker':
			echo '<input type="color" id="mf_' . esc_attr( $name ) . '" name="mf_' . esc_attr( $name ) . '" value="' . esc_attr( (string) $value ) . '" class="mf-meta-box__input mf-meta-box__input--color">'; break;
		case 'media': case 'gallery':
			mf_render_media( $name, (string) $value ); break;
		default:
			$ph = $config['placeholder'] ?? '';
			$ml = isset( $config['maxLength'] ) ? ' maxlength="' . esc_attr( $config['maxLength'] ) . '"' : '';
			echo '<input type="text" id="mf_' . esc_attr( $name ) . '" name="mf_' . esc_attr( $name ) . '" value="' . esc_attr( (string) $value ) . '" class="mf-meta-box__input widefat"' . ( $ph ? ' placeholder="' . esc_attr( $ph ) . '"' : '' ) . $ml . '>'; break;
	}
	echo '</div>';
}

// ---- Save ------------------------------------------------------------------
add_action( 'save_post', function ( int $post_id ): void {
	if ( ! isset( $_POST['mf_meta_nonce'] ) ) return;
	if ( ! wp_verify_nonce( sanitize_key( $_POST['mf_meta_nonce'] ), 'mf_save_meta_' . $post_id ) ) return;
	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) return;
	if ( ! current_user_can( 'edit_post', $post_id ) ) return;
	$post_type = get_post_type( $post_id );
	$pt_config = null;
	foreach ( mf_get_configured_post_types() as $pt ) {
		if ( $pt['slug'] === $post_type ) { $pt_config = $pt; break; }
	}
	if ( ! $pt_config ) return;
	foreach ( $pt_config['fields'] as $field ) {
		$name = $field['name'] ?? ''; $type = $field['fieldType'] ?? 'text';
		$config = $field['typeConfig'] ?? array(); $meta_key = '_mf_' . $name;
		if ( '' === $name ) continue;
		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		$raw = $_POST[ 'mf_' . $name ] ?? null;
		switch ( $type ) {
			case 'switcher':  update_post_meta( $post_id, $meta_key, '1' === (string) $raw ? '1' : '0' ); break;
			case 'checkbox':  update_post_meta( $post_id, $meta_key, is_array( $raw ) ? array_map( 'sanitize_key', $raw ) : array() ); break;
			case 'number':    null === $raw || '' === $raw ? delete_post_meta( $post_id, $meta_key ) : update_post_meta( $post_id, $meta_key, (float) $raw ); break;
			case 'media': case 'gallery': update_post_meta( $post_id, $meta_key, absint( $raw ) ?: '' ); break;
			case 'textarea': case 'wysiwyg': update_post_meta( $post_id, $meta_key, sanitize_textarea_field( (string) $raw ) ); break;
			default: update_post_meta( $post_id, $meta_key, sanitize_text_field( (string) $raw ) ); break;
		}
	}
} );

// ---- Assets ----------------------------------------------------------------
function mf_enqueue_meta_box_assets(): void {
	static $done = false; if ( $done ) return; $done = true;
	wp_enqueue_media();
	?>
	<style>
	.mf-meta-box{display:flex;flex-direction:column}
	.mf-meta-box__row{display:flex;gap:16px;padding:12px 0;border-bottom:1px solid #f0f0f0}
	.mf-meta-box__row:last-child{border-bottom:none}
	.mf-meta-box__field{flex:1;min-width:0}
	.mf-meta-box__label{display:block;font-weight:600;margin-bottom:2px;font-size:13px}
	.mf-meta-box__desc{display:block;color:#757575;font-size:12px;margin-bottom:6px}
	.mf-meta-box__input,.mf-meta-box__textarea,.mf-meta-box__select{width:100%;box-sizing:border-box}
	.mf-meta-box__input--color{width:48px;height:36px;padding:2px;cursor:pointer}
	.mf-meta-box__empty{color:#757575;font-style:italic;font-size:12px}
	.mf-switcher{display:flex;align-items:center}
	.mf-switcher__input{position:absolute;opacity:0;width:0;height:0}
	.mf-switcher__track{display:flex;align-items:center;width:80px;height:32px;background:#ddd;border-radius:16px;cursor:pointer;position:relative;transition:background .2s;user-select:none}
	.mf-switcher__input:checked+.mf-switcher__track{background:var(--wp-admin-theme-color,#3858e9)}
	.mf-switcher__thumb{position:absolute;left:4px;width:24px;height:24px;background:#fff;border-radius:50%;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.3)}
	.mf-switcher__input:checked+.mf-switcher__track .mf-switcher__thumb{left:calc(100% - 28px)}
	.mf-switcher__on,.mf-switcher__off{font-size:11px;font-weight:600;position:absolute;top:50%;transform:translateY(-50%);text-transform:uppercase;letter-spacing:.4px;pointer-events:none}
	.mf-switcher__on{right:8px;color:#fff;opacity:0}
	.mf-switcher__off{left:8px;color:#757575}
	.mf-switcher__input:checked+.mf-switcher__track .mf-switcher__on{opacity:1}
	.mf-switcher__input:checked+.mf-switcher__track .mf-switcher__off{opacity:0}
	.mf-checkbox-group,.mf-radio-group{display:flex;flex-wrap:wrap;gap:6px 16px}
	.mf-checkbox-group__item,.mf-radio-group__item{display:flex;align-items:center;gap:4px;font-size:13px}
	.mf-media-field{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
	.mf-media-field__preview{width:60px;height:60px;object-fit:cover;border-radius:2px;border:1px solid #ddd}
	.mf-media-field__placeholder{color:#757575;font-style:italic;font-size:12px}
	</style>
	<script>
	(function(){
		document.addEventListener('click',function(e){
			var btn=e.target.closest('.mf-media-field__choose');
			if(!btn)return;
			var wrap=btn.closest('.mf-media-field');
			var frame=wp.media({title:'Select Media',button:{text:'Use this'},multiple:false});
			frame.on('select',function(){
				var a=frame.state().get('selection').first().toJSON();
				wrap.querySelector('.mf-media-field__id').value=a.id;
				var url=(a.sizes&&a.sizes.thumbnail)?a.sizes.thumbnail.url:a.url;
				var prev=wrap.querySelector('.mf-media-field__preview');
				var ph=wrap.querySelector('.mf-media-field__placeholder');
				if(prev){prev.src=url;}else{var img=document.createElement('img');img.src=url;img.className='mf-media-field__preview';img.alt='';(ph||btn).before(img);}
				if(ph)ph.style.display='none';
				wrap.querySelector('.mf-media-field__remove').style.display='';
			});
			frame.open();
		});
		document.addEventListener('click',function(e){
			var btn=e.target.closest('.mf-media-field__remove');
			if(!btn)return;
			var wrap=btn.closest('.mf-media-field');
			wrap.querySelector('.mf-media-field__id').value='';
			var prev=wrap.querySelector('.mf-media-field__preview');
			if(prev)prev.remove();
			var ph=wrap.querySelector('.mf-media-field__placeholder');
			if(ph)ph.style.display='';
			btn.style.display='none';
		});
	})();
	</script>
	<?php
}
