/**
 * Sortable options repeater for select / radio / checkbox field types.
 */
import { Button, TextControl, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { trash, plus } from '@wordpress/icons';
import {
	DndContext,
	closestCenter,
	PointerSensor,
	KeyboardSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
} from '@dnd-kit/core';
import {
	SortableContext,
	sortableKeyboardCoordinates,
	arrayMove,
	verticalListSortingStrategy,
	useSortable,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import type { SelectConfig, SelectOption, FieldType } from '../../types';
import { makeDefaultSelectOption } from '../../types';

// ---- Single option row ------------------------------------------------------

interface OptionRowProps {
	option     : SelectOption;
	onChange   : ( o: SelectOption ) => void;
	onDuplicate: () => void;
	onRemove   : () => void;
}

function OptionRow( { option, onChange, onDuplicate, onRemove }: OptionRowProps ) {
	const {
		attributes, listeners, setNodeRef, transform, transition, isDragging,
	} = useSortable( { id: option.id } );

	const style = {
		transform : CSS.Transform.toString( transform ),
		transition,
		opacity   : isDragging ? 0.4 : 1,
	};

	// Auto-derive value from label (slug) while value is pristine.
	const slugify = ( v: string ) =>
		v.normalize( 'NFD' )
		 .replace( /[\u0300-\u036f]/g, '' )
		 .toLowerCase()
		 .replace( /[^a-z0-9]+/g, '_' )
		 .replace( /^_+|_+$/g, '' );

	// Track whether value was manually edited.
	// Use a module-level WeakMap keyed by option identity so it survives re-renders.
	const valueTouched = valueTouchedMap.get( option ) ?? false;

	return (
		<div
			ref={ setNodeRef }
			style={ style }
			className={ `mf-options-row${ isDragging ? ' is-dragging' : '' }` }
		>
			<button
				type="button"
				className="mf-options-row__handle"
				{ ...attributes }
				{ ...listeners }
				aria-label={ __( 'Drag to reorder', 'gutenbergcontenttypesmetafields' ) }
			>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden>
					<path d="M8 7h2V5H8v2zm0 6h2v-2H8v2zm0 6h2v-2H8v2zm6-14v2h2V5h-2zm0 8h2v-2h-2v2zm0 6h2v-2h-2v2z"/>
				</svg>
			</button>

			<div className="mf-options-row__fields">
				<TextControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={ __( 'Label', 'gutenbergcontenttypesmetafields' ) }
					value={ option.label }
					onChange={ ( v ) => {
						if ( ! valueTouched ) {
							valueTouchedMap.set( option, false ); // keep false until manual edit
							onChange( { ...option, label: v, value: slugify( v ) } );
						} else {
							onChange( { ...option, label: v } );
						}
					} }
				/>
				<TextControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={ __( 'Value', 'gutenbergcontenttypesmetafields' ) }
					value={ option.value }
					onChange={ ( v ) => {
						valueTouchedMap.set( option, true );
						onChange( { ...option, value: v.replace( /[^a-zA-Z0-9_-]/g, '' ) } );
					} }
					onBlur={ ( e ) => {
						if ( e.target.value === '' ) valueTouchedMap.set( option, false );
					} }
				/>
			</div>

			<div className="mf-options-row__actions">
				<Button
					type="button"
					size="compact"
					icon={ <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6z"/></svg> }
					label={ __( 'Duplicate option', 'gutenbergcontenttypesmetafields' ) }
					onClick={ onDuplicate }
				/>
				<Button
					type="button"
					size="compact"
					isDestructive
					icon={ trash }
					label={ __( 'Remove option', 'gutenbergcontenttypesmetafields' ) }
					onClick={ onRemove }
				/>
			</div>
		</div>
	);
}

// WeakMap to track per-option "value was manually touched" state without re-renders.
const valueTouchedMap = new WeakMap< SelectOption, boolean >();

// ---- Select options repeater ------------------------------------------------

interface Props {
	fieldType: FieldType; // 'select' | 'radio' | 'checkbox'
	config   : SelectConfig;
	onChange : ( c: SelectConfig ) => void;
}

export function SelectOptionsRepeater( { fieldType, config, onChange }: Props ) {
	const sensors = useSensors(
		useSensor( PointerSensor ),
		useSensor( KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates } )
	);

	const setOptions = ( options: SelectOption[] ) => onChange( { ...config, options } );

	const handleDragEnd = ( event: DragEndEvent ) => {
		const { active, over } = event;
		if ( over && active.id !== over.id ) {
			const oi = config.options.findIndex( ( o ) => o.id === active.id );
			const ni = config.options.findIndex( ( o ) => o.id === over.id );
			setOptions( arrayMove( config.options, oi, ni ) );
		}
	};

	const addOption = () => setOptions( [ ...config.options, makeDefaultSelectOption() ] );

	const updateOption = ( id: string, updated: SelectOption ) =>
		setOptions( config.options.map( ( o ) => o.id === id ? updated : o ) );

	const duplicateOption = ( id: string ) => {
		const idx = config.options.findIndex( ( o ) => o.id === id );
		if ( idx === -1 ) return;
		const clone = { ...config.options[ idx ], id: crypto.randomUUID() };
		const next = [ ...config.options ];
		next.splice( idx + 1, 0, clone );
		setOptions( next );
	};

	const removeOption = ( id: string ) =>
		setOptions( config.options.filter( ( o ) => o.id !== id ) );

	const supportsMultiple = fieldType === 'select' || fieldType === 'checkbox';

	return (
		<div className="mf-options-repeater">
			<div className="mf-options-repeater__header">
				<span className="mf-options-repeater__title">
					{ __( 'Options', 'gutenbergcontenttypesmetafields' ) }
				</span>
				{ supportsMultiple && (
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Allow multiple', 'gutenbergcontenttypesmetafields' ) }
						checked={ config.multiple ?? false }
						onChange={ ( v ) => onChange( { ...config, multiple: v } ) }
					/>
				) }
			</div>

			<DndContext
				sensors={ sensors }
				collisionDetection={ closestCenter }
				onDragEnd={ handleDragEnd }
				modifiers={ [ restrictToVerticalAxis, restrictToParentElement ] }
			>
				<SortableContext
					items={ config.options.map( ( o ) => o.id ) }
					strategy={ verticalListSortingStrategy }
				>
					{ config.options.length === 0 && (
						<p className="mf-options-repeater__empty">
							{ __( 'No options yet.', 'gutenbergcontenttypesmetafields' ) }
						</p>
					) }
					{ config.options.map( ( option ) => (
						<OptionRow
							key={ option.id }
							option={ option }
							onChange={ ( updated ) => updateOption( option.id, updated ) }
							onDuplicate={ () => duplicateOption( option.id ) }
							onRemove={ () => removeOption( option.id ) }
						/>
					) ) }
				</SortableContext>
			</DndContext>

			<Button
				type="button"
				variant="secondary"
				size="compact"
				icon={ plus }
				onClick={ addOption }
				className="mf-options-repeater__add"
			>
				{ __( 'New Option', 'gutenbergcontenttypesmetafields' ) }
			</Button>
		</div>
	);
}
