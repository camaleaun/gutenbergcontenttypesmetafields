/**
 * Renders the appropriate extra-config panel for a given field type.
 * Returns null for types that have no extra settings.
 */
import type { FieldType, SelectConfig, NumberConfig, TextConfig, MediaConfig } from '../../types';
import { SelectOptionsRepeater } from './select-options-repeater';
import { NumberConfigPanel } from './number-config';
import { TextConfigPanel } from './text-config';
import { MediaConfigPanel } from './media-config';
import './style.scss';

interface Props {
	fieldType: FieldType;
	config   : SelectConfig | NumberConfig | TextConfig | MediaConfig | undefined;
	onChange : ( c: SelectConfig | NumberConfig | TextConfig | MediaConfig ) => void;
}

export function FieldTypeConfigPanel( { fieldType, config, onChange }: Props ) {
	switch ( fieldType ) {
		case 'select':
		case 'radio':
		case 'checkbox':
			return (
				<SelectOptionsRepeater
					fieldType={ fieldType }
					config={ ( config as SelectConfig | undefined ) ?? { options: [] } }
					onChange={ onChange as ( c: SelectConfig ) => void }
				/>
			);

		case 'number':
			return (
				<NumberConfigPanel
					config={ ( config as NumberConfig | undefined ) ?? {} }
					onChange={ onChange as ( c: NumberConfig ) => void }
				/>
			);

		case 'text':
		case 'textarea':
			return (
				<TextConfigPanel
					config={ ( config as TextConfig | undefined ) ?? {} }
					onChange={ onChange as ( c: TextConfig ) => void }
				/>
			);

		case 'media':
		case 'gallery':
			return (
				<MediaConfigPanel
					config={ ( config as MediaConfig | undefined ) ?? {} }
					onChange={ onChange as ( c: MediaConfig ) => void }
				/>
			);

		default:
			return null;
	}
}
