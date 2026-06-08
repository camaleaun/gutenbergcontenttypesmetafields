import { TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import type { NumberConfig } from '../../types';

interface Props {
	config  : NumberConfig;
	onChange: ( c: NumberConfig ) => void;
}

export function NumberConfigPanel( { config, onChange }: Props ) {
	const num = ( v: string ) => v === '' ? undefined : Number( v );
	return (
		<div className="mf-type-config mf-type-config--number">
			<div className="mf-type-config__row">
				<TextControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					type="number"
					label={ __( 'Min', 'gutenbergcontenttypesmetafields' ) }
					value={ config.min !== undefined ? String( config.min ) : '' }
					onChange={ ( v ) => onChange( { ...config, min: num( v ) } ) }
				/>
				<TextControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					type="number"
					label={ __( 'Max', 'gutenbergcontenttypesmetafields' ) }
					value={ config.max !== undefined ? String( config.max ) : '' }
					onChange={ ( v ) => onChange( { ...config, max: num( v ) } ) }
				/>
				<TextControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					type="number"
					label={ __( 'Step', 'gutenbergcontenttypesmetafields' ) }
					value={ config.step !== undefined ? String( config.step ) : '' }
					onChange={ ( v ) => onChange( { ...config, step: num( v ) } ) }
				/>
			</div>
		</div>
	);
}
