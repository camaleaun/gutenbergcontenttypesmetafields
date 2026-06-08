import {
	Button,
	Modal,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { dragHandle, trash, plus } from '@wordpress/icons';
import type { MetaField, ConditionalLogic, ConditionalRule, ConditionalOperator } from '../../types';
import { makeDefaultRule } from '../../types';
import './style.scss';

const OPERATOR_OPTIONS: { value: ConditionalOperator; label: string }[] = [
	{ value: 'equals',        label: __( 'equals',           'gutenbergcontenttypesmetafields' ) },
	{ value: 'not_equals',    label: __( 'not equals',       'gutenbergcontenttypesmetafields' ) },
	{ value: 'contains',      label: __( 'contains',         'gutenbergcontenttypesmetafields' ) },
	{ value: 'not_contains',  label: __( 'not contains',     'gutenbergcontenttypesmetafields' ) },
	{ value: 'is_empty',      label: __( 'is empty',         'gutenbergcontenttypesmetafields' ) },
	{ value: 'is_not_empty',  label: __( 'is not empty',     'gutenbergcontenttypesmetafields' ) },
	{ value: 'greater_than',  label: __( 'greater than',     'gutenbergcontenttypesmetafields' ) },
	{ value: 'less_than',     label: __( 'less than',        'gutenbergcontenttypesmetafields' ) },
];

const NO_VALUE_OPERATORS: ConditionalOperator[] = [ 'is_empty', 'is_not_empty' ];

interface Props {
	field     : MetaField;
	allFields : MetaField[];
	onClose   : () => void;
	onChange  : ( logic: ConditionalLogic ) => void;
}

export function ConditionalModal( { field, allFields, onClose, onChange }: Props ) {
	const logic = field.conditional;

	const set = ( partial: Partial< ConditionalLogic > ) =>
		onChange( { ...logic, ...partial } );

	const setRule = ( id: string, partial: Partial< ConditionalRule > ) =>
		set( { rules: logic.rules.map( ( r ) => r.id === id ? { ...r, ...partial } : r ) } );

	const addRule = () =>
		set( { rules: [ ...logic.rules, makeDefaultRule() ] } );

	const duplicateRule = ( id: string ) => {
		const idx = logic.rules.findIndex( ( r ) => r.id === id );
		if ( idx === -1 ) return;
		const clone = { ...logic.rules[ idx ], id: crypto.randomUUID() };
		const next = [ ...logic.rules ];
		next.splice( idx + 1, 0, clone );
		set( { rules: next } );
	};

	const removeRule = ( id: string ) =>
		set( { rules: logic.rules.filter( ( r ) => r.id !== id ) } );

	// Other fields available as condition subjects (exclude self).
	const fieldOptions = [
		{ value: '', label: __( 'Select field…', 'gutenbergcontenttypesmetafields' ) },
		...allFields
			.filter( ( f ) => f.id !== field.id && f.objectType === 'field' )
			.map( ( f ) => ( { value: f.id, label: f.label || f.name || f.id } ) ),
	];

	return (
		<Modal
			title={ __( 'Conditional Logic', 'gutenbergcontenttypesmetafields' ) + ( field.label ? ` — "${ field.label }"` : '' ) }
			onRequestClose={ onClose }
			className="mf-conditional-modal"
			size="medium"
		>
			<div className="mf-conditional-modal__body">
				<ToggleControl
					__nextHasNoMarginBottom
					label={ __( 'Enable Conditional Logic', 'gutenbergcontenttypesmetafields' ) }
					help={ __( 'Toggle this option to set display rules.', 'gutenbergcontenttypesmetafields' ) }
					checked={ logic.enabled }
					onChange={ ( v ) => set( { enabled: v } ) }
				/>

				{ logic.enabled && (
					<>
						<div className="mf-conditional-modal__rules">
							{ logic.rules.map( ( rule ) => (
								<div key={ rule.id } className="mf-conditional-modal__rule">
									<div className="mf-conditional-modal__rule-handle" aria-hidden>
										{ /* drag handle icon */ }
										<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden><path d="M8 7h2V5H8v2zm0 6h2v-2H8v2zm0 6h2v-2H8v2zm6-14v2h2V5h-2zm0 8h2v-2h-2v2zm0 6h2v-2h-2v2z"/></svg>
									</div>

									<div className="mf-conditional-modal__rule-fields">
										<SelectControl
											__nextHasNoMarginBottom
											__next40pxDefaultSize
											label={ __( 'Field', 'gutenbergcontenttypesmetafields' ) }
											value={ rule.fieldId }
											options={ fieldOptions }
											onChange={ ( v ) => setRule( rule.id, { fieldId: v } ) }
										/>

										<SelectControl
											__nextHasNoMarginBottom
											__next40pxDefaultSize
											label={ __( 'Operator', 'gutenbergcontenttypesmetafields' ) }
											value={ rule.operator }
											options={ OPERATOR_OPTIONS }
											onChange={ ( v ) => setRule( rule.id, { operator: v as ConditionalOperator } ) }
										/>

										{ ! NO_VALUE_OPERATORS.includes( rule.operator ) && (
											<TextControl
												__nextHasNoMarginBottom
												__next40pxDefaultSize
												label={ __( 'Value', 'gutenbergcontenttypesmetafields' ) }
												value={ rule.value }
												onChange={ ( v ) => setRule( rule.id, { value: v } ) }
											/>
										) }
									</div>

									<div className="mf-conditional-modal__rule-actions">
										<Button
											size="compact"
											icon={ /* copy */ <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6z"/></svg> }
											label={ __( 'Duplicate rule', 'gutenbergcontenttypesmetafields' ) }
											onClick={ () => duplicateRule( rule.id ) }
										/>
										<Button
											size="compact"
											isDestructive
											icon={ trash }
											label={ __( 'Remove rule', 'gutenbergcontenttypesmetafields' ) }
											onClick={ () => removeRule( rule.id ) }
										/>
									</div>
								</div>
							) ) }
						</div>

						<Button
							className="mf-conditional-modal__add-rule"
							variant="secondary"
							size="compact"
							icon={ plus }
							onClick={ addRule }
						>
							{ __( 'New Rule', 'gutenbergcontenttypesmetafields' ) }
						</Button>

						<SelectControl
							__nextHasNoMarginBottom
							__next40pxDefaultSize
							label={ __( 'Relation', 'gutenbergcontenttypesmetafields' ) }
							help={ __( 'The logical relationship between conditional rules.', 'gutenbergcontenttypesmetafields' ) }
							value={ logic.relation }
							options={ [
								{ value: 'and', label: __( 'And', 'gutenbergcontenttypesmetafields' ) },
								{ value: 'or',  label: __( 'Or',  'gutenbergcontenttypesmetafields' ) },
							] }
							onChange={ ( v ) => set( { relation: v as 'and' | 'or' } ) }
						/>
					</>
				) }
			</div>

			<div className="mf-conditional-modal__footer">
				<Button variant="primary" onClick={ onClose }>
					{ __( 'Done', 'gutenbergcontenttypesmetafields' ) }
				</Button>
			</div>
		</Modal>
	);
}
