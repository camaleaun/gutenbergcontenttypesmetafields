import { useState, useRef } from '@wordpress/element';
import {
	Button,
	SelectControl,
	TextControl,
	TextareaControl,
	ToggleControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { trash } from '@wordpress/icons';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { MetaField, ObjectType, FieldType, FieldWidth } from '../../types';
import { ConditionalModal } from '../conditional-modal';

const OBJECT_TYPE_OPTIONS: { value: ObjectType; label: string }[] = [
	{ value: 'field',     label: __( 'Field',     'gutenbergcontenttypesmetafields' ) },
	{ value: 'tab',       label: __( 'Tab',       'gutenbergcontenttypesmetafields' ) },
	{ value: 'accordion', label: __( 'Accordion', 'gutenbergcontenttypesmetafields' ) },
	{ value: 'endpoint',  label: __( 'Endpoint',  'gutenbergcontenttypesmetafields' ) },
];

const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
	{ value: 'text',        label: 'Text'        },
	{ value: 'date',        label: 'Date'        },
	{ value: 'time',        label: 'Time'        },
	{ value: 'datetime',    label: 'Datetime'    },
	{ value: 'textarea',    label: 'Textarea'    },
	{ value: 'wysiwyg',     label: 'WYSIWYG'     },
	{ value: 'switcher',    label: 'Switcher'    },
	{ value: 'checkbox',    label: 'Checkbox'    },
	{ value: 'iconpicker',  label: 'Iconpicker'  },
	{ value: 'media',       label: 'Media'       },
	{ value: 'gallery',     label: 'Gallery'     },
	{ value: 'radio',       label: 'Radio'       },
	{ value: 'repeater',    label: 'Repeater'    },
	{ value: 'select',      label: 'Select'      },
	{ value: 'number',      label: 'Number'      },
	{ value: 'colorpicker', label: 'Colorpicker' },
	{ value: 'posts',       label: 'Posts'       },
	{ value: 'html',        label: 'HTML'        },
	{ value: 'map',         label: 'Map'         },
];

const FIELD_WIDTH_OPTIONS: { value: FieldWidth; label: string }[] = [
	{ value: '100%',   label: '100%'   },
	{ value: '75%',    label: '75%'    },
	{ value: '66.6%',  label: '66.6%'  },
	{ value: '50%',    label: '50%'    },
	{ value: '33.3%',  label: '33.3%'  },
	{ value: '25%',    label: '25%'    },
];

/**
 * Derives a DB-safe slug from a human label:
 * 1. NFD normalize → strip combining diacritics (accents)
 * 2. Lowercase
 * 3. Replace non-alphanumeric runs with underscore
 * 4. Strip leading/trailing underscores
 *
 * e.g. "Título do Campo" → "titulo_do_campo"
 */
function slugify( value: string ): string {
	return value
		.normalize( 'NFD' )
		.replace( /[\u0300-\u036f]/g, '' )
		.toLowerCase()
		.replace( /[^a-z0-9]+/g, '_' )
		.replace( /^_+|_+$/g, '' );
}

interface Props {
	field           : MetaField;
	allFields       : MetaField[];
	initialExpanded?: boolean;
	onChange        : ( f: MetaField ) => void;
	onDuplicate     : () => void;
	onRemove        : () => void;
}

export function FieldItem( { field, allFields, initialExpanded = false, onChange, onDuplicate, onRemove }: Props ) {
	const [ expanded,        setExpanded        ] = useState( initialExpanded );
	const [ conditionalOpen, setConditionalOpen ] = useState( false );

	// Once the user manually edits the Name/ID field, stop auto-generating from Label.
	// Cleared again if the user empties Name/ID (re-enables auto-slug).
	const nameTouched = useRef( field.name !== '' );

	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable( { id: field.id } );

	const style = {
		transform : CSS.Transform.toString( transform ),
		transition,
		opacity   : isDragging ? 0.4 : 1,
	};

	const set = ( partial: Partial< MetaField > ) => onChange( { ...field, ...partial } );

	const hasConditional = field.conditional.enabled && field.conditional.rules.length > 0;

	const headerLabel = field.label || field.name || __( '(unnamed)', 'gutenbergcontenttypesmetafields' );
	const headerMeta  = field.name
		? `${ field.name } (${ field.fieldType })`
		: `(${ field.fieldType })`;

	return (
		<div
			ref={ setNodeRef }
			style={ style }
			className={ `mf-field-item${ isDragging ? ' is-dragging' : '' }` }
		>
			{ /* ---- Header ---- */ }
			<div className="mf-field-item__header">
				<button
					type="button"
					className="mf-field-item__drag-handle"
					{ ...attributes }
					{ ...listeners }
					aria-label={ __( 'Drag to reorder', 'gutenbergcontenttypesmetafields' ) }
					tabIndex={ 0 }
				>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden>
						<path d="M8 7h2V5H8v2zm0 6h2v-2H8v2zm0 6h2v-2H8v2zm6-14v2h2V5h-2zm0 8h2v-2h-2v2zm0 6h2v-2h-2v2z"/>
					</svg>
				</button>

				<button
					type="button"
					className="mf-field-item__toggle"
					onClick={ () => setExpanded( ( v ) => ! v ) }
					aria-expanded={ expanded }
				>
					<span className="mf-field-item__toggle-label">{ headerLabel }</span>
					<span className="mf-field-item__toggle-meta">{ headerMeta }</span>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden className={ `mf-field-item__chevron${ expanded ? ' is-open' : '' }` }>
						<path d="M17.5 11.6L12 16l-5.5-4.4.9-1.2L12 14l4.5-3.6 1 1.2z"/>
					</svg>
				</button>

				<div className="mf-field-item__header-actions">
					<Button
						size="compact"
						label={ __( 'Conditional Logic', 'gutenbergcontenttypesmetafields' ) }
						className={ `mf-field-item__btn-conditional${ hasConditional ? ' is-active' : '' }` }
						onClick={ () => setConditionalOpen( true ) }
						aria-pressed={ hasConditional }
					>
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden>
							<path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
						</svg>
					</Button>
					<Button
						size="compact"
						icon={ <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6z"/></svg> }
						label={ __( 'Duplicate field', 'gutenbergcontenttypesmetafields' ) }
						onClick={ onDuplicate }
					/>
					<Button
						size="compact"
						isDestructive
						icon={ trash }
						label={ __( 'Remove field', 'gutenbergcontenttypesmetafields' ) }
						onClick={ onRemove }
					/>
				</div>
			</div>

			{ /* ---- Body ---- */ }
			{ expanded && (
				<div className="mf-field-item__body">
					<div className="mf-field-item__row">
						<TextControl
							__nextHasNoMarginBottom
							__next40pxDefaultSize
							label={ <><span className="mf-required">*</span> { __( 'Label', 'gutenbergcontenttypesmetafields' ) }</> as any }
							help={ __( 'Meta field label. It will be displayed on the Post edit page.', 'gutenbergcontenttypesmetafields' ) }
							value={ field.label }
							onChange={ ( v ) => {
								if ( ! nameTouched.current ) {
									// Mirror label → slug live while name is pristine.
									set( { label: v, name: slugify( v ) } );
								} else {
									set( { label: v } );
								}
							} }
						/>
						<TextControl
							__nextHasNoMarginBottom
							__next40pxDefaultSize
							label={ <><span className="mf-required">*</span> { __( 'Name / ID', 'gutenbergcontenttypesmetafields' ) }</> as any }
							help={ __( 'Meta field name/key. Stored in the database. Use only Latin letters, numbers, - or _.', 'gutenbergcontenttypesmetafields' ) }
							value={ field.name }
							onChange={ ( v ) => {
								nameTouched.current = true;
								set( { name: v.replace( /[^a-zA-Z0-9_-]/g, '' ) } );
							} }
							onBlur={ ( e ) => {
								// Clearing the name field re-enables auto-slug from Label.
								if ( e.target.value === '' ) {
									nameTouched.current = false;
								}
							} }
						/>
					</div>

					<div className="mf-field-item__row">
						<SelectControl
							__nextHasNoMarginBottom
							__next40pxDefaultSize
							label={ <><span className="mf-required">*</span> { __( 'Object Type', 'gutenbergcontenttypesmetafields' ) }</> as any }
							help={ __( 'Field or layout element (Tab, Accordion, Endpoint).', 'gutenbergcontenttypesmetafields' ) }
							value={ field.objectType }
							options={ OBJECT_TYPE_OPTIONS }
							onChange={ ( v ) => set( { objectType: v as ObjectType } ) }
						/>
						<SelectControl
							__nextHasNoMarginBottom
							__next40pxDefaultSize
							label={ <><span className="mf-required">*</span> { __( 'Field Type', 'gutenbergcontenttypesmetafields' ) }</> as any }
							help={ __( 'Defines how the field is displayed on the Post edit page.', 'gutenbergcontenttypesmetafields' ) }
							value={ field.fieldType }
							options={ FIELD_TYPE_OPTIONS }
							onChange={ ( v ) => set( { fieldType: v as FieldType } ) }
						/>
					</div>

					<TextareaControl
						__nextHasNoMarginBottom
						label={ __( 'Description', 'gutenbergcontenttypesmetafields' ) }
						help={ __( 'Meta field description to be shown on the Post edit page.', 'gutenbergcontenttypesmetafields' ) }
						value={ field.description }
						onChange={ ( v ) => set( { description: v } ) }
						rows={ 2 }
					/>

					<div className="mf-field-item__row mf-field-item__row--narrow">
						<SelectControl
							__nextHasNoMarginBottom
							__next40pxDefaultSize
							label={ __( 'Field Width', 'gutenbergcontenttypesmetafields' ) }
							help={ __( 'Field width on the Post edit page.', 'gutenbergcontenttypesmetafields' ) }
							value={ field.fieldWidth }
							options={ FIELD_WIDTH_OPTIONS }
							onChange={ ( v ) => set( { fieldWidth: v as FieldWidth } ) }
						/>
						<ToggleControl
							__nextHasNoMarginBottom
							label={ __( 'Revision Support', 'gutenbergcontenttypesmetafields' ) }
							help={ __( 'Include this field in post revisions.', 'gutenbergcontenttypesmetafields' ) }
							checked={ field.revisionSupport }
							onChange={ ( v ) => set( { revisionSupport: v } ) }
						/>
					</div>
				</div>
			) }

			{ conditionalOpen && (
				<ConditionalModal
					field={ field }
					allFields={ allFields }
					onClose={ () => setConditionalOpen( false ) }
					onChange={ ( conditional ) => set( { conditional } ) }
				/>
			) }
		</div>
	);
}
