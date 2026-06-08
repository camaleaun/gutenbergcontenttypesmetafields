import { CheckboxControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import type { MediaConfig } from '../../types';

const MEDIA_TYPES = [ 'image', 'video', 'audio', 'application' ];

interface Props {
	config  : MediaConfig;
	onChange: ( c: MediaConfig ) => void;
}

export function MediaConfigPanel( { config, onChange }: Props ) {
	const allowed = config.allowedTypes ?? [];

	const toggle = ( type: string, checked: boolean ) => {
		const next = checked
			? [ ...allowed, type ]
			: allowed.filter( ( t ) => t !== type );
		onChange( { ...config, allowedTypes: next.length ? next : undefined } );
	};

	return (
		<div className="mf-type-config mf-type-config--media">
			<fieldset className="mf-type-config__fieldset">
				<legend className="mf-type-config__legend">
					{ __( 'Allowed file types', 'gutenbergcontenttypesmetafields' ) }
				</legend>
				<div className="mf-type-config__checkboxes">
					{ MEDIA_TYPES.map( ( type ) => (
						<CheckboxControl
							key={ type }
							__nextHasNoMarginBottom
							label={ type.charAt( 0 ).toUpperCase() + type.slice( 1 ) }
							checked={ allowed.includes( type ) }
							onChange={ ( v ) => toggle( type, v ) }
						/>
					) ) }
				</div>
			</fieldset>
		</div>
	);
}
