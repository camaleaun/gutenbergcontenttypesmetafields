export type ObjectType = 'field' | 'tab' | 'accordion' | 'endpoint';

export type FieldType =
	| 'text'
	| 'date'
	| 'time'
	| 'datetime'
	| 'textarea'
	| 'wysiwyg'
	| 'switcher'
	| 'checkbox'
	| 'iconpicker'
	| 'media'
	| 'gallery'
	| 'radio'
	| 'repeater'
	| 'select'
	| 'number'
	| 'colorpicker'
	| 'posts'
	| 'html'
	| 'map';

export type FieldWidth = '100%' | '75%' | '66.6%' | '50%' | '33.3%' | '25%';

export type ConditionalOperator =
	| 'equals'
	| 'not_equals'
	| 'contains'
	| 'not_contains'
	| 'is_empty'
	| 'is_not_empty'
	| 'greater_than'
	| 'less_than';

export interface ConditionalRule {
	id      : string;
	fieldId : string; // references another MetaField.id in the same repeater
	operator: ConditionalOperator;
	value   : string;
}

export interface ConditionalLogic {
	enabled : boolean;
	relation: 'and' | 'or';
	rules   : ConditionalRule[];
}

export interface MetaField {
	id          : string; // unique within the repeater (uuid-like)
	label       : string;
	name        : string; // DB key
	objectType  : ObjectType;
	fieldType   : FieldType;
	description : string;
	fieldWidth  : FieldWidth;
	revisionSupport: boolean;
	conditional : ConditionalLogic;
	typeConfig ?: SelectConfig | NumberConfig | TextConfig | MediaConfig;
}

// ---- Field-type-specific config -------------------------------------------

export interface SelectOption {
	id   : string;
	label: string;
	value: string;
}

export interface SelectConfig {
	options : SelectOption[];
	multiple?: boolean;
}

export interface NumberConfig {
	min ?: number;
	max ?: number;
	step?: number;
}

export interface TextConfig {
	maxLength?: number;
	placeholder?: string;
}

export interface MediaConfig {
	allowedTypes?: string[]; // e.g. ['image', 'video']
}

/**
 * Discriminated union of per-field-type config objects.
 * `typeConfig` is only present when the field type needs extra settings.
 */
export type FieldTypeConfig =
	| { fieldType: 'select';      typeConfig: SelectConfig  }
	| { fieldType: 'radio';       typeConfig: SelectConfig  }
	| { fieldType: 'checkbox';    typeConfig: SelectConfig  }
	| { fieldType: 'number';      typeConfig: NumberConfig  }
	| { fieldType: 'text';        typeConfig: TextConfig    }
	| { fieldType: 'textarea';    typeConfig: TextConfig    }
	| { fieldType: 'media';       typeConfig: MediaConfig   }
	| { fieldType: 'gallery';     typeConfig: MediaConfig   }
	| { fieldType: FieldType;     typeConfig?: undefined    };

export function makeDefaultTypeConfig( fieldType: FieldType ): SelectConfig | NumberConfig | TextConfig | MediaConfig | undefined {
	switch ( fieldType ) {
		case 'select':
		case 'radio':
		case 'checkbox':
			return { options: [] } as SelectConfig;
		case 'number':
			return {} as NumberConfig;
		case 'text':
		case 'textarea':
			return {} as TextConfig;
		case 'media':
		case 'gallery':
			return {} as MediaConfig;
		default:
			return undefined;
	}
}

export function makeDefaultSelectOption(): SelectOption {
	return { id: crypto.randomUUID(), label: '', value: '' };
}

export function makeDefaultField( overrides: Partial< MetaField > = {} ): MetaField {
	return {
		id          : crypto.randomUUID(),
		label       : '',
		name        : '',
		objectType  : 'field',
		fieldType   : 'text',
		description : '',
		fieldWidth  : '100%',
		revisionSupport: false,
		conditional : { enabled: false, relation: 'and', rules: [] },
		typeConfig  : undefined,
		...overrides,
	};
}

export function makeDefaultRule(): ConditionalRule {
	return {
		id      : crypto.randomUUID(),
		fieldId : '',
		operator: 'equals',
		value   : '',
	};
}
