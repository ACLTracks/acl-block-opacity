import { resolvePaletteColor } from '../../src/utils/resolve-color';

const palettes = {
	default: [ { slug: 'brand', color: '#111111' } ],
	theme: [ { slug: 'brand', color: '#222222' } ],
	custom: [ { slug: 'brand', color: '#333333' } ],
};

describe( 'resolvePaletteColor', () => {
	test( 'uses custom palette precedence over theme and default', () => {
		expect( resolvePaletteColor( 'brand', palettes ) ).toMatchObject( {
			origin: 'custom',
			value: '#333333',
		} );
	} );

	test( 'uses theme precedence over default', () => {
		expect(
			resolvePaletteColor( 'brand', {
				default: palettes.default,
				theme: palettes.theme,
				custom: [],
			} )
		).toMatchObject( {
			origin: 'theme',
			value: '#222222',
		} );
	} );

	test( 'falls back to the default origin', () => {
		expect(
			resolvePaletteColor( 'brand', {
				default: palettes.default,
				theme: [],
				custom: [],
			} )
		).toMatchObject( {
			origin: 'default',
			value: '#111111',
		} );
	} );

	test( 'returns null for a missing slug', () => {
		expect( resolvePaletteColor( 'missing', palettes ) ).toBeNull();
	} );

	test( 'does not fall through an invalid authoritative match', () => {
		expect(
			resolvePaletteColor( 'brand', {
				...palettes,
				custom: [ { slug: 'brand', color: 'red' } ],
			} )
		).toBeNull();
	} );

	test( 'validates modern and percentage RGB palette colors', () => {
		const resolution = resolvePaletteColor( 'modern', {
			custom: [ { slug: 'modern', color: 'rgb(50% 25% 0% / 80%)' } ],
		} );

		expect( resolution.parsed ).toMatchObject( {
			red: 127.5,
			green: 63.75,
			blue: 0,
			alpha: 0.8,
		} );
	} );

	test( 'handles malformed palette collections without throwing', () => {
		expect(
			resolvePaletteColor( 'brand', {
				custom: null,
				theme: 'not-an-array',
				default: [],
			} )
		).toBeNull();
	} );
} );
