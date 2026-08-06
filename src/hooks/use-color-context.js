/**
 * Derive explicit color-channel states from standard block attributes.
 */

import { useSettings } from '@wordpress/block-editor';

import { parseColor } from '../utils/color';
import { resolvePaletteColor } from '../utils/resolve-color';

export const PALETTE_SETTING_PATHS = [
	'color.palette.custom',
	'color.palette.theme',
	'color.palette.default',
];

const CHANNELS = {
	text: {
		customProperty: 'text',
		presetAttribute: 'textColor',
	},
	background: {
		customProperty: 'background',
		presetAttribute: 'backgroundColor',
	},
};

/**
 * Determine whether a value is a record.
 *
 * @param {*} value Candidate value.
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
 * Create a state that cannot currently be adjusted.
 *
 * @param {string} channel Channel name.
 * @param {string} kind    State kind.
 * @param {string} reason  Stable reason key.
 * @param {Object} extra   Additional state fields.
 * @return {Object} Explicit channel state.
 */
function unavailableState( channel, kind, reason, extra = {} ) {
	return {
		channel,
		kind,
		available: false,
		reason,
		opacity: null,
		parsed: null,
		presetSlug: null,
		resolvedLiteral: null,
		...extra,
	};
}

/**
 * Detect a standard preset or custom background gradient.
 *
 * @param {Object} attributes Current block attributes.
 * @return {boolean} Whether a gradient is active.
 */
export function hasActiveBackgroundGradient( attributes ) {
	if ( ! isRecord( attributes ) ) {
		return false;
	}

	if (
		typeof attributes.gradient === 'string' &&
		attributes.gradient.trim() !== ''
	) {
		return true;
	}

	const style = isRecord( attributes.style ) ? attributes.style : {};
	const color = isRecord( style.color ) ? style.color : {};

	return typeof color.gradient === 'string' && color.gradient.trim() !== '';
}

/**
 * Derive one explicit channel state.
 *
 * Presets are authoritative over stale custom values. Background gradients
 * block background opacity before any background color is parsed or resolved.
 *
 * @param {'text'|'background'} channel
 * @param {Object}              attributes
 * @param {Object}              eligibility
 * @param {Object}              palettes
 * @return {Object} Explicit state object.
 */
export function deriveChannelState(
	channel,
	attributes,
	eligibility,
	palettes
) {
	const definition = CHANNELS[ channel ];

	if ( ! definition || ! eligibility?.[ channel ] ) {
		return unavailableState( channel, 'ineligible', 'ineligible' );
	}

	const safeAttributes = isRecord( attributes ) ? attributes : {};

	if (
		channel === 'background' &&
		hasActiveBackgroundGradient( safeAttributes )
	) {
		return unavailableState(
			channel,
			'gradient-blocked',
			'gradient-active'
		);
	}

	const style = isRecord( safeAttributes.style ) ? safeAttributes.style : {};
	const colorStyle = isRecord( style.color ) ? style.color : {};
	const preset = safeAttributes[ definition.presetAttribute ];

	if ( preset !== undefined ) {
		const presetSlug = typeof preset === 'string' ? preset.trim() : '';

		if ( presetSlug === '' ) {
			return unavailableState(
				channel,
				'missing-preset',
				'missing-preset'
			);
		}

		const resolution = resolvePaletteColor( presetSlug, palettes );

		if ( ! resolution ) {
			return unavailableState(
				channel,
				'missing-preset',
				'missing-preset',
				{ presetSlug }
			);
		}

		return {
			channel,
			kind: 'preset',
			available: true,
			reason: null,
			opacity: Math.round( resolution.parsed.alpha * 100 ),
			parsed: resolution.parsed,
			presetSlug,
			resolvedLiteral: resolution.value,
		};
	}

	const customValue = colorStyle[ definition.customProperty ];

	if (
		customValue === undefined ||
		customValue === null ||
		( typeof customValue === 'string' && customValue.trim() === '' )
	) {
		return unavailableState( channel, 'missing', 'no-color' );
	}

	const parsed = parseColor( customValue );

	if ( ! parsed ) {
		return unavailableState( channel, 'unsupported', 'unsupported-color' );
	}

	return {
		channel,
		kind: 'custom',
		available: true,
		reason: null,
		opacity: Math.round( parsed.alpha * 100 ),
		parsed,
		presetSlug: null,
		resolvedLiteral: null,
	};
}

/**
 * Derive both channel states from current editor inputs.
 *
 * @param {Object} attributes  Current block attributes.
 * @param {Object} eligibility Channel eligibility.
 * @param {Object} palettes    Effective palette origins.
 * @return {{ text: Object, background: Object }} Color context.
 */
export function deriveColorContext( attributes, eligibility, palettes ) {
	return {
		text: deriveChannelState( 'text', attributes, eligibility, palettes ),
		background: deriveChannelState(
			'background',
			attributes,
			eligibility,
			palettes
		),
	};
}

/**
 * Subscribe once to effective block-context palettes and derive current state.
 *
 * @param {Object} attributes  Current block attributes.
 * @param {Object} eligibility Channel eligibility.
 * @return {{ text: Object, background: Object }} Color context.
 */
export function useColorContext( attributes, eligibility ) {
	const settings = useSettings( ...PALETTE_SETTING_PATHS ) || [];
	const [ custom, theme, defaultPalette ] = settings;

	return deriveColorContext( attributes, eligibility, {
		custom,
		theme,
		default: defaultPalette,
	} );
}
