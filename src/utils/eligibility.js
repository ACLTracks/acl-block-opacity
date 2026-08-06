/**
 * Conservative block eligibility checks for standard color attributes.
 */

const BLOCK_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]*\/[a-z0-9][a-z0-9_-]*$/;

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
 * Test one standard attribute schema.
 *
 * @param {Object} attributes Attribute schema.
 * @param {string} name       Attribute name.
 * @param {string} type       Required type.
 * @return {boolean} Whether the schema matches.
 */
function hasAttributeType( attributes, name, type ) {
	return isRecord( attributes[ name ] ) && attributes[ name ].type === type;
}

/**
 * Resolve documented color-support default behavior.
 *
 * @param {boolean|Object}      colorSupport
 * @param {'text'|'background'} channel
 * @return {boolean} Whether the channel is declared.
 */
function hasChannelSupport( colorSupport, channel ) {
	if ( colorSupport === true ) {
		return true;
	}

	if ( ! isRecord( colorSupport ) ) {
		return false;
	}

	if ( ! Object.prototype.hasOwnProperty.call( colorSupport, channel ) ) {
		return true;
	}

	return colorSupport[ channel ] === true;
}

/**
 * Test an explicit incompatible-block collection.
 *
 * @param {Array<string>|Set<string>} collection
 * @param {string}                    name
 * @return {boolean} Whether the block is excluded.
 */
function isExplicitlyIncompatible( collection, name ) {
	if ( collection instanceof Set ) {
		return collection.has( name );
	}

	return Array.isArray( collection ) && collection.includes( name );
}

/**
 * Compute eligibility for both supported standard color channels.
 *
 * @param {Object}                    blockType
 * @param {Object}                    [options]
 * @param {Array<string>|Set<string>} [options.incompatibleBlocks]
 * @return {{ eligible: boolean, text: boolean, background: boolean, reason: string }} Eligibility.
 */
export function getColorEligibility( blockType, options = {} ) {
	if ( ! isRecord( blockType ) || typeof blockType.name !== 'string' ) {
		return {
			eligible: false,
			text: false,
			background: false,
			reason: 'invalid-block-name',
		};
	}

	const name = blockType.name;

	if ( ! BLOCK_NAME_PATTERN.test( name ) ) {
		return {
			eligible: false,
			text: false,
			background: false,
			reason: 'invalid-block-name',
		};
	}

	if ( name === 'core/cover' ) {
		return {
			eligible: false,
			text: false,
			background: false,
			reason: 'cover-excluded',
		};
	}

	if ( isExplicitlyIncompatible( options.incompatibleBlocks, name ) ) {
		return {
			eligible: false,
			text: false,
			background: false,
			reason: 'explicitly-incompatible',
		};
	}

	if (
		! isRecord( blockType.supports ) ||
		! isRecord( blockType.attributes )
	) {
		return {
			eligible: false,
			text: false,
			background: false,
			reason: 'missing-standard-contract',
		};
	}

	const colorSupport = blockType.supports.color;
	const hasStyle = hasAttributeType(
		blockType.attributes,
		'style',
		'object'
	);
	const text =
		hasStyle &&
		hasChannelSupport( colorSupport, 'text' ) &&
		hasAttributeType( blockType.attributes, 'textColor', 'string' );
	const background =
		hasStyle &&
		hasChannelSupport( colorSupport, 'background' ) &&
		hasAttributeType( blockType.attributes, 'backgroundColor', 'string' );

	return {
		eligible: text || background,
		text,
		background,
		reason: text || background ? 'eligible' : 'missing-standard-contract',
	};
}
