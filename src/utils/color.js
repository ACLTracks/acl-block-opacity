/**
 * Strict RGB color parsing and deterministic formatting.
 */

const PRECISION = 6;
const NUMBER_SOURCE =
	'[+-]?(?:(?:\\d+(?:\\.\\d*)?)|(?:\\.\\d+))(?:[eE][+-]?\\d+)?';
const NUMBER_PATTERN = new RegExp( '^' + NUMBER_SOURCE + '$' );
const PERCENTAGE_PATTERN = new RegExp( '^' + NUMBER_SOURCE + '%$' );

/**
 * Normalize a number to the precision shared with the PHP implementation.
 *
 * @param {number} value Number to normalize.
 * @return {number} Normalized number.
 */
function normalizeNumber( value ) {
	const factor = 10 ** PRECISION;
	const normalized = Math.round( value * factor ) / factor;

	return Object.is( normalized, -0 ) ? 0 : normalized;
}

/**
 * Parse a finite CSS number or percentage.
 *
 * @param {string}  token
 * @param {boolean} percentage
 * @return {number|null} Parsed number or null.
 */
function parseNumericToken( token, percentage ) {
	const pattern = percentage ? PERCENTAGE_PATTERN : NUMBER_PATTERN;

	if ( ! pattern.test( token ) ) {
		return null;
	}

	const numeric = Number( percentage ? token.slice( 0, -1 ) : token );

	return Number.isFinite( numeric ) ? numeric : null;
}

/**
 * Parse one RGB component.
 *
 * @param {string} token Component token.
 * @return {{ unit: string, value: number }|null} Parsed component.
 */
function parseRgbComponent( token ) {
	const percentage = parseNumericToken( token, true );

	if ( percentage !== null ) {
		if ( percentage < 0 || percentage > 100 ) {
			return null;
		}

		return {
			unit: 'percentage',
			value: normalizeNumber( ( percentage * 255 ) / 100 ),
		};
	}

	const number = parseNumericToken( token, false );

	if ( number === null || number < 0 || number > 255 ) {
		return null;
	}

	return {
		unit: 'number',
		value: normalizeNumber( number ),
	};
}

/**
 * Parse one alpha component.
 *
 * @param {string} token Alpha token.
 * @return {number|null} Normalized alpha.
 */
function parseAlphaComponent( token ) {
	const percentage = parseNumericToken( token, true );

	if ( percentage !== null ) {
		return percentage >= 0 && percentage <= 100
			? normalizeNumber( percentage / 100 )
			: null;
	}

	const number = parseNumericToken( token, false );

	if ( number === null || number < 0 || number > 1 ) {
		return null;
	}

	return normalizeNumber( number );
}

/**
 * Create the public parsed-color structure.
 *
 * @param {number} red    Red channel.
 * @param {number} green  Green channel.
 * @param {number} blue   Blue channel.
 * @param {number} alpha  Alpha channel.
 * @param {string} syntax Parsed syntax label.
 * @return {Object} Structured color.
 */
function createResult( red, green, blue, alpha, syntax ) {
	return {
		space: 'srgb',
		red: normalizeNumber( red ),
		green: normalizeNumber( green ),
		blue: normalizeNumber( blue ),
		alpha: normalizeNumber( alpha ),
		syntax,
	};
}

/**
 * Parse supported hexadecimal syntax.
 *
 * @param {string} value CSS color.
 * @return {Object|null} Structured color or null.
 */
function parseHex( value ) {
	if (
		! /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(
			value
		)
	) {
		return null;
	}

	let hex = value.slice( 1 );

	if ( hex.length === 3 || hex.length === 4 ) {
		hex = hex
			.split( '' )
			.map( ( character ) => character + character )
			.join( '' );
	}

	const alpha =
		hex.length === 8
			? normalizeNumber( parseInt( hex.slice( 6, 8 ), 16 ) / 255 )
			: 1;

	return createResult(
		parseInt( hex.slice( 0, 2 ), 16 ),
		parseInt( hex.slice( 2, 4 ), 16 ),
		parseInt( hex.slice( 4, 6 ), 16 ),
		alpha,
		'hex'
	);
}

/**
 * Parse the supported comma-separated legacy grammar.
 *
 * @param {string} functionName Function name.
 * @param {string} body         Function body.
 * @return {Object|null} Structured color or null.
 */
function parseLegacyFunction( functionName, body ) {
	if ( body.includes( '/' ) ) {
		return null;
	}

	const parts = body.split( ',' ).map( ( part ) => part.trim() );

	if ( parts.some( ( part ) => part === '' ) ) {
		return null;
	}

	if (
		( functionName === 'rgb' && parts.length !== 3 ) ||
		( functionName === 'rgba' && parts.length !== 4 )
	) {
		return null;
	}

	const channels = parts.slice( 0, 3 ).map( parseRgbComponent );

	if ( channels.some( ( channel ) => channel === null ) ) {
		return null;
	}

	if (
		channels[ 0 ].unit !== channels[ 1 ].unit ||
		channels[ 0 ].unit !== channels[ 2 ].unit
	) {
		return null;
	}

	const alpha =
		functionName === 'rgba' ? parseAlphaComponent( parts[ 3 ] ) : 1;

	if ( alpha === null ) {
		return null;
	}

	return createResult(
		channels[ 0 ].value,
		channels[ 1 ].value,
		channels[ 2 ].value,
		alpha,
		functionName === 'rgba' ? 'legacy-rgba' : 'legacy-rgb'
	);
}

/**
 * Parse the supported space-separated modern grammar.
 *
 * @param {string} functionName Function name.
 * @param {string} body         Function body.
 * @return {Object|null} Structured color or null.
 */
function parseModernFunction( functionName, body ) {
	const segments = body.split( '/' );

	if (
		segments.length > 2 ||
		segments[ 0 ].trim() === '' ||
		( segments.length === 2 && segments[ 1 ].trim() === '' )
	) {
		return null;
	}

	const channelTokens = segments[ 0 ].trim().split( /\s+/ );

	if ( channelTokens.length !== 3 ) {
		return null;
	}

	const channels = channelTokens.map( parseRgbComponent );

	if ( channels.some( ( channel ) => channel === null ) ) {
		return null;
	}

	const alpha =
		segments.length === 2 ? parseAlphaComponent( segments[ 1 ].trim() ) : 1;

	if ( alpha === null ) {
		return null;
	}

	return createResult(
		channels[ 0 ].value,
		channels[ 1 ].value,
		channels[ 2 ].value,
		alpha,
		functionName === 'rgba' ? 'modern-rgba' : 'modern-rgb'
	);
}

/**
 * Parse one supported CSS color.
 *
 * @param {*} value Candidate color.
 * @return {Object|null} Structured color or null.
 */
export function parseColor( value ) {
	if ( typeof value !== 'string' || value.trim() === '' ) {
		return null;
	}

	const color = value.trim();

	if ( color.startsWith( '#' ) ) {
		return parseHex( color );
	}

	const match = color.match( /^(rgb|rgba)\(([\s\S]*)\)$/i );

	if ( ! match || match[ 2 ].trim() === '' ) {
		return null;
	}

	const functionName = match[ 1 ].toLowerCase();
	const body = match[ 2 ].trim();

	return body.includes( ',' )
		? parseLegacyFunction( functionName, body )
		: parseModernFunction( functionName, body );
}

/**
 * Verify formatter input channel bounds.
 *
 * @param {*} color Candidate parsed color.
 * @return {boolean} Whether the value is safe to format.
 */
function isParsedColor( color ) {
	if ( ! color || typeof color !== 'object' || Array.isArray( color ) ) {
		return false;
	}

	const values = [ color.red, color.green, color.blue, color.alpha ];

	if (
		values.some(
			( value ) => typeof value !== 'number' || ! Number.isFinite( value )
		)
	) {
		return false;
	}

	return (
		color.red >= 0 &&
		color.red <= 255 &&
		color.green >= 0 &&
		color.green <= 255 &&
		color.blue >= 0 &&
		color.blue <= 255 &&
		color.alpha >= 0 &&
		color.alpha <= 1
	);
}

/**
 * Format a normalized number without precision noise.
 *
 * @param {number} value Number to format.
 * @return {string} Deterministic decimal.
 */
function formatNumber( value ) {
	const normalized = normalizeNumber( value );
	const formatted = normalized
		.toFixed( PRECISION )
		.replace( /0+$/, '' )
		.replace( /\.$/, '' );

	return formatted === '-0' || formatted === '' ? '0' : formatted;
}

/**
 * Format a parsed color with an absolute opacity percentage.
 *
 * @param {Object} color   Parsed color.
 * @param {number} opacity Opacity from 0 through 100.
 * @return {string|null} Standard CSS color or null.
 */
export function formatColor( color, opacity ) {
	if (
		! isParsedColor( color ) ||
		typeof opacity !== 'number' ||
		! Number.isFinite( opacity ) ||
		opacity < 0 ||
		opacity > 100
	) {
		return null;
	}

	const red = formatNumber( color.red );
	const green = formatNumber( color.green );
	const blue = formatNumber( color.blue );
	const alpha = normalizeNumber( opacity / 100 );

	if ( alpha === 1 ) {
		return 'rgb(' + red + ', ' + green + ', ' + blue + ')';
	}

	return (
		'rgba(' +
		red +
		', ' +
		green +
		', ' +
		blue +
		', ' +
		formatNumber( alpha ) +
		')'
	);
}
