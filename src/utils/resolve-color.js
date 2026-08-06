/**
 * Pure effective-palette resolution.
 */

import { parseColor } from './color';

const ORIGIN_PRECEDENCE = [ 'custom', 'theme', 'default' ];

/**
 * Resolve and validate one effective preset color.
 *
 * A matching entry in a higher-precedence origin is authoritative. If that
 * entry is invalid, resolution fails instead of falling through silently.
 *
 * @param {string} slug     Preset slug.
 * @param {Object} palettes Palette arrays keyed by origin.
 * @return {{ origin: string, slug: string, value: string, parsed: Object }|null} Resolution.
 */
export function resolvePaletteColor( slug, palettes ) {
	if (
		typeof slug !== 'string' ||
		slug.trim() === '' ||
		! palettes ||
		typeof palettes !== 'object' ||
		Array.isArray( palettes )
	) {
		return null;
	}

	const normalizedSlug = slug.trim();

	for ( const origin of ORIGIN_PRECEDENCE ) {
		const palette = palettes[ origin ];

		if ( ! Array.isArray( palette ) ) {
			continue;
		}

		const match = palette.find(
			( entry ) =>
				entry &&
				typeof entry === 'object' &&
				! Array.isArray( entry ) &&
				entry.slug === normalizedSlug
		);

		if ( ! match ) {
			continue;
		}

		if ( typeof match.color !== 'string' || match.color.trim() === '' ) {
			return null;
		}

		const value = match.color.trim();
		const parsed = parseColor( value );

		if ( ! parsed ) {
			return null;
		}

		return {
			origin,
			slug: normalizedSlug,
			value,
			parsed,
		};
	}

	return null;
}

export { ORIGIN_PRECEDENCE };
