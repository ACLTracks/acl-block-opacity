/**
 * Pure standard WordPress color-attribute update utilities.
 */

import { formatColor, parseColor } from './color';

const CONTEXTS = {
	text: {
		presetAttribute: 'textColor',
		styleProperty: 'text',
	},
	background: {
		presetAttribute: 'backgroundColor',
		styleProperty: 'background',
	},
};

/**
 * Determine whether a value is a plain record.
 *
 * @param {*} value Candidate record.
 * @return {boolean} Whether the value is a record.
 */
function isRecord( value ) {
	return (
		Boolean( value ) &&
		typeof value === 'object' &&
		! Array.isArray( value )
	);
}

/**
 * Build one immutable update for a future atomic setAttributes() call.
 *
 * Preset attributes are authoritative when both preset and stale custom forms
 * are present. The caller supplies the effective literal preset color.
 *
 * @param {Object}              options
 * @param {Object}              options.attributes
 * @param {'text'|'background'} options.context
 * @param {number}              options.opacity
 * @param {string}              [options.resolvedPresetColor]
 * @return {Object|null} Attribute update or null.
 */
export function createOpacityUpdate( {
	attributes,
	context,
	opacity,
	resolvedPresetColor,
} ) {
	const definition = CONTEXTS[ context ];

	if ( ! definition || ! isRecord( attributes ) ) {
		return null;
	}

	if ( attributes.style !== undefined && ! isRecord( attributes.style ) ) {
		return null;
	}

	const currentStyle = attributes.style || {};

	if (
		currentStyle.color !== undefined &&
		! isRecord( currentStyle.color )
	) {
		return null;
	}

	const currentColorStyle = currentStyle.color || {};
	const presetValue = attributes[ definition.presetAttribute ];
	let sourceColor;

	if ( presetValue !== undefined ) {
		if ( typeof presetValue !== 'string' || presetValue.trim() === '' ) {
			return null;
		}

		sourceColor = resolvedPresetColor;
	} else {
		sourceColor = currentColorStyle[ definition.styleProperty ];
	}

	const parsed = parseColor( sourceColor );
	const formatted = parsed ? formatColor( parsed, opacity ) : null;

	if ( ! formatted ) {
		return null;
	}

	return {
		style: {
			...currentStyle,
			color: {
				...currentColorStyle,
				[ definition.styleProperty ]: formatted,
			},
		},
		[ definition.presetAttribute ]: undefined,
	};
}
