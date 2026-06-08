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
