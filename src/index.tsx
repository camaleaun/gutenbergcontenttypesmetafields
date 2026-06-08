/**
 * Entry point for the Meta Fields PoC plugin.
 *
 * Hooks into window.gctExtensions rendering by registering a React component
 * that replaces the default ExtensionSectionPanel for the 'meta_fields' section.
 * The component renders a sortable, duplicatable, removable repeater of meta fields.
 */
import { createRoot } from '@wordpress/element';
import { MetaFieldRepeater } from './components/meta-field-repeater';
import type { MetaField } from './types';

// Wait for the core plugin to have mounted the form.
// The core plugin renders extension sections — we need to intercept
// the meta value for the mf_fields key and render our repeater inside.
// Since the core plugin renders ExtensionSectionPanel for each section,
// we use the gctRegisterSectionRenderer hook if available, otherwise
// we inject via a mutation observer after the section mounts.

declare global {
	interface Window {
		gctExtensions?: {
			postTypeSections: Array<{
				id    : string;
				label : string;
				fields: Array<{ id: string; [k: string]: unknown }>;
			}>;
		};
		gctRegisterSectionRenderer?: (
			sectionId: string,
			renderer : ( container: HTMLElement, props: SectionRendererProps ) => void
		) => void;
	}
}

interface SectionRendererProps {
	meta    : Record< string, unknown >;
	onChange: ( key: string, value: unknown ) => void;
}

// The core plugin exposes this hook (added in extensions.php) so third-party
// plugins can mount their own React trees inside a section body.
function register() {
	if ( typeof window.gctRegisterSectionRenderer === 'function' ) {
		window.gctRegisterSectionRenderer( 'meta_fields', ( container, { meta, onChange } ) => {
			const fields: MetaField[] = Array.isArray( meta.mf_fields ) ? meta.mf_fields as MetaField[] : [];
			const root = createRoot( container );
			root.render(
				<MetaFieldRepeater
					fields={ fields }
					onChange={ ( updated ) => onChange( 'mf_fields', updated ) }
				/>
			);
		} );
	}
}

// Register immediately if the hook is already available, or wait for it.
if ( typeof window.gctRegisterSectionRenderer === 'function' ) {
	register();
} else {
	// Poll briefly — the core plugin's inline script runs before this module.
	let attempts = 0;
	const interval = setInterval( () => {
		if ( typeof window.gctRegisterSectionRenderer === 'function' ) {
			clearInterval( interval );
			register();
		} else if ( ++attempts > 20 ) {
			clearInterval( interval );
			console.warn( '[gutenbergcontenttypesmetafields] gctRegisterSectionRenderer not found. Is gutenbergcontenttypes active?' );
		}
	}, 100 );
}
