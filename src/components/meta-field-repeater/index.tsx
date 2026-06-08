import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { plus } from '@wordpress/icons';
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
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import type { MetaField } from '../../types';
import { makeDefaultField } from '../../types';
import { FieldItem } from './field-item';
import './style.scss';

interface Props {
	fields   : MetaField[];
	onChange : ( fields: MetaField[] ) => void;
}

export function MetaFieldRepeater( { fields, onChange }: Props ) {
	const sensors = useSensors(
		useSensor( PointerSensor ),
		useSensor( KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		} )
	);

	const handleDragEnd = ( event: DragEndEvent ) => {
		const { active, over } = event;
		if ( over && active.id !== over.id ) {
			const oldIndex = fields.findIndex( ( f ) => f.id === active.id );
			const newIndex = fields.findIndex( ( f ) => f.id === over.id );
			onChange( arrayMove( fields, oldIndex, newIndex ) );
		}
	};

	const addField = () => onChange( [ ...fields, makeDefaultField() ] );

	const updateField = ( id: string, updated: MetaField ) =>
		onChange( fields.map( ( f ) => f.id === id ? updated : f ) );

	const duplicateField = ( id: string ) => {
		const idx = fields.findIndex( ( f ) => f.id === id );
		if ( idx === -1 ) return;
		const clone: MetaField = {
			...fields[ idx ],
			id   : crypto.randomUUID(),
			name : fields[ idx ].name ? `${ fields[ idx ].name }_copy` : '',
		};
		const next = [ ...fields ];
		next.splice( idx + 1, 0, clone );
		onChange( next );
	};

	const removeField = ( id: string ) =>
		onChange( fields.filter( ( f ) => f.id !== id ) );

	return (
		<div className="mf-repeater">
			<DndContext
				sensors={ sensors }
				collisionDetection={ closestCenter }
				onDragEnd={ handleDragEnd }
				modifiers={ [ restrictToVerticalAxis, restrictToParentElement ] }
			>
				<SortableContext
					items={ fields.map( ( f ) => f.id ) }
					strategy={ verticalListSortingStrategy }
				>
					{ fields.length === 0 && (
						<p className="mf-repeater__empty">
							{ __( 'No meta fields yet. Click "Add Meta Field" to get started.', 'gutenbergcontenttypesmetafields' ) }
						</p>
					) }
					{ fields.map( ( field ) => (
						<FieldItem
							key={ field.id }
							field={ field }
							allFields={ fields }
							onChange={ ( updated ) => updateField( field.id, updated ) }
							onDuplicate={ () => duplicateField( field.id ) }
							onRemove={ () => removeField( field.id ) }
						/>
					) ) }
				</SortableContext>
			</DndContext>

			<Button
				variant="secondary"
				size="compact"
				icon={ plus }
				onClick={ addField }
				className="mf-repeater__add"
			>
				{ __( 'Add Meta Field', 'gutenbergcontenttypesmetafields' ) }
			</Button>
		</div>
	);
}
