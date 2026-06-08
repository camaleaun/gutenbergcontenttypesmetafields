import { TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import type { TextConfig } from '../../types';

interface Props {
	config  : TextConfig;
	onChange: ( c: TextConfig ) => void;
}

export function TextConfigPanel( { config, onChange }: Props ) {
	return (
		<div className="mf-type-config mf-type-config--text">
			<div className="mf-type-config__row">
				<TextControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					type="number"
					label={ __( 'Max length', 'gutenbergcontenttypesmetafields' ) }
					value={ config.maxLength !== undefined ? String( config.maxLength ) : '' }
					onChange={ ( v ) =>
						onChange( { ...config, maxLength: v === '' ? undefined : parseInt( v, 10 ) || undefined } )
					}
				/>
				<TextControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={ __( 'Placeholder', 'gutenbergcontenttypesmetafields' ) }
					value={ config.placeholder ?? '' }
					onChange={ ( v ) => onChange( { ...config, placeholder: v || undefined } ) }
				/>
			</div>
		</div>
	);
}
