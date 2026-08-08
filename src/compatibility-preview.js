/**
 * Runtime-only editor correction for the proven `text` palette collision.
 */

import { useSettings } from '@wordpress/block-editor';
import { getBlockType } from '@wordpress/blocks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { addFilter } from '@wordpress/hooks';

import { PALETTE_SETTING_PATHS } from './hooks/use-color-context';
import { parseColor } from './utils/color';
import { getBlockNameGate, getColorEligibility } from './utils/eligibility';

export const COMPATIBILITY_FILTER_NAMESPACE =
	'acl-block-opacity/with-text-collision-compatibility';
export const COMPATIBILITY_CLASS = 'acl-block-opacity-compat-text';
export const COMPATIBILITY_PROPERTY = '--acl-block-opacity-text-color';

/**
 * Determine whether a value is a plain record.
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
 * Detect the exact collision slug in effective palette origins.
 *
 * @param {Array|Object} palettes Origin arrays or useSettings() result.
 * @return {boolean} Whether any relevant origin contains `text`.
 */
export function hasTextCollisionSlug( palettes ) {
	let origins = [];

	if ( Array.isArray( palettes ) ) {
		origins = palettes;
	} else if ( isRecord( palettes ) ) {
		origins = Object.values( palettes );
	}

	return origins.some(
		( palette ) =>
			Array.isArray( palette ) &&
			palette.some(
				( entry ) => isRecord( entry ) && entry.slug === 'text'
			)
	);
}

/**
 * Read server-resolved block-context collision names from editor-only config.
 *
 * @return {Set<string>} Valid block names with a context-only `text` slug.
 */
export function getRuntimeBlockContextCollisions() {
	const names = globalThis.aclBlockOpacityCompatibility?.blockContexts;

	return new Set(
		Array.isArray( names )
			? names.filter(
					( name ) =>
						typeof name === 'string' &&
						getBlockNameGate( name ).allowed
			  )
			: []
	);
}

/**
 * Require an unambiguous first-root target when public selector metadata exists.
 *
 * A selector containing a combinator targets something beyond the block root.
 * The bridge deliberately rejects that shape rather than searching descendants.
 *
 * @param {Object} blockType Registered block type.
 * @return {boolean} Whether wrapperProps represents the color-support root.
 */
export function hasUnambiguousRootColorTarget( blockType ) {
	const rootSelector = blockType?.selectors?.root;

	if ( rootSelector === undefined ) {
		return true;
	}

	if ( typeof rootSelector !== 'string' || rootSelector.trim() === '' ) {
		return false;
	}

	return ! [ ' ', '\t', '\r', '\n', '>', '+', '~' ].some( ( token ) =>
		rootSelector.trim().includes( token )
	);
}

/**
 * Apply the cheap name, attribute, parser, and support gates before hooks mount.
 *
 * @param {string}   name               Block name.
 * @param {Object}   attributes         Current standard block attributes.
 * @param {Function} getBlockTypeImpl   Registered block resolver.
 * @param {Set}      incompatibleBlocks Explicit exclusion collection.
 * @return {{ color: string }|null} Validated candidate or null.
 */
export function getTextCollisionCandidate(
	name,
	attributes,
	getBlockTypeImpl = getBlockType,
	incompatibleBlocks = new Set()
) {
	const nameGate = getBlockNameGate( name, { incompatibleBlocks } );

	if ( ! nameGate.allowed || ! isRecord( attributes ) ) {
		return null;
	}

	if ( Object.prototype.hasOwnProperty.call( attributes, 'textColor' ) ) {
		const preset = attributes.textColor;

		if (
			preset !== undefined &&
			preset !== null &&
			( typeof preset !== 'string' || preset.trim() !== '' )
		) {
			return null;
		}
	}

	const style = isRecord( attributes.style ) ? attributes.style : {};
	const color = isRecord( style.color ) ? style.color : {};
	const custom = color.text;

	if (
		typeof custom !== 'string' ||
		custom.trim() === '' ||
		! parseColor( custom )
	) {
		return null;
	}

	const blockType = getBlockTypeImpl( name );
	const eligibility = getColorEligibility( blockType, {
		incompatibleBlocks,
	} );

	return eligibility.text && hasUnambiguousRootColorTarget( blockType )
		? { color: custom.trim() }
		: null;
}

/**
 * Merge runtime props without mutating or duplicating caller-owned values.
 *
 * @param {Object} wrapperProps Existing BlockListBlock wrapper props.
 * @param {string} color        Validated standard literal.
 * @return {Object} Runtime-only wrapper props.
 */
export function addCompatibilityWrapperProps( wrapperProps, color ) {
	const safeProps = isRecord( wrapperProps ) ? wrapperProps : {};
	const classTokens =
		typeof safeProps.className === 'string'
			? safeProps.className.trim().split( /\s+/ ).filter( Boolean )
			: [];

	if ( ! classTokens.includes( COMPATIBILITY_CLASS ) ) {
		classTokens.push( COMPATIBILITY_CLASS );
	}

	return {
		...safeProps,
		className: classTokens.join( ' ' ),
		style: {
			...( isRecord( safeProps.style ) ? safeProps.style : {} ),
			[ COMPATIBILITY_PROPERTY ]: color,
		},
	};
}

/**
 * Create the public editor.BlockListBlock filter.
 *
 * @param {Object}   [options]
 * @param {Function} [options.getBlockTypeImpl]
 * @param {Function} [options.createHigherOrderComponentImpl]
 * @param {Function} [options.useSettingsImpl]
 * @param {Set}      [options.incompatibleBlocks]
 * @param {Set}      [options.blockContextCollisions]
 * @return {Function} BlockListBlock filter callback.
 */
export function createCompatibilityBlockListFilter( {
	getBlockTypeImpl = getBlockType,
	createHigherOrderComponentImpl = createHigherOrderComponent,
	useSettingsImpl = useSettings,
	incompatibleBlocks = new Set(),
	blockContextCollisions = getRuntimeBlockContextCollisions(),
} = {} ) {
	return createHigherOrderComponentImpl( ( BlockListBlock ) => {
		function PotentialTextCollision( { blockListProps, candidate } ) {
			const palettes = useSettingsImpl( ...PALETTE_SETTING_PATHS ) || [];

			if ( ! hasTextCollisionSlug( palettes ) ) {
				return <BlockListBlock { ...blockListProps } />;
			}

			return (
				<BlockListBlock
					{ ...blockListProps }
					wrapperProps={ addCompatibilityWrapperProps(
						blockListProps.wrapperProps,
						candidate.color
					) }
				/>
			);
		}

		return function BlockListBlockWithTextCompatibility( props ) {
			const candidate = getTextCollisionCandidate(
				props.name,
				props.attributes,
				getBlockTypeImpl,
				incompatibleBlocks
			);

			if ( ! candidate ) {
				return <BlockListBlock { ...props } />;
			}

			if ( blockContextCollisions.has( props.name ) ) {
				return (
					<BlockListBlock
						{ ...props }
						wrapperProps={ addCompatibilityWrapperProps(
							props.wrapperProps,
							candidate.color
						) }
					/>
				);
			}

			return (
				<PotentialTextCollision
					blockListProps={ props }
					candidate={ candidate }
				/>
			);
		};
	}, 'withAclBlockOpacityTextCompatibility' );
}

export const withTextCollisionCompatibility =
	createCompatibilityBlockListFilter();

addFilter(
	'editor.BlockListBlock',
	COMPATIBILITY_FILTER_NAMESPACE,
	withTextCollisionCompatibility
);
