import { render } from '@testing-library/react';

import { useSettings } from '@wordpress/block-editor';

import {
	deriveColorContext,
	deriveChannelState,
	PALETTE_SETTING_PATHS,
	useColorContext,
} from '../../src/hooks/use-color-context';

jest.mock( '@wordpress/block-editor', () => ( {
	useSettings: jest.fn(),
} ) );

const bothEligible = { text: true, background: true };
const emptyPalettes = { custom: [], theme: [], default: [] };

function HookHarness( { attributes, eligibility, onResult } ) {
	onResult( useColorContext( attributes, eligibility ) );
	return null;
}

describe( 'deriveChannelState', () => {
	test( 'derives opaque and alpha custom text percentages', () => {
		expect(
			deriveChannelState(
				'text',
				{ style: { color: { text: '#123456' } } },
				bothEligible,
				emptyPalettes
			).opacity
		).toBe( 100 );
		expect(
			deriveChannelState(
				'text',
				{ style: { color: { text: 'rgba(1, 2, 3, 0.25)' } } },
				bothEligible,
				emptyPalettes
			).opacity
		).toBe( 25 );
	} );

	test( 'rounds fractional alpha for display without rewriting input', () => {
		const attributes = {
			style: { color: { text: 'rgba(1, 2, 3, 0.333)' } },
		};
		const snapshot = JSON.parse( JSON.stringify( attributes ) );
		const state = deriveChannelState(
			'text',
			attributes,
			bothEligible,
			emptyPalettes
		);

		expect( state.opacity ).toBe( 33 );
		expect( state.parsed.alpha ).toBe( 0.333 );
		expect( attributes ).toEqual( snapshot );
	} );

	test( 'derives opaque and alpha preset percentages', () => {
		const palettes = {
			custom: [
				{ slug: 'opaque', color: '#000' },
				{ slug: 'alpha', color: '#00000080' },
			],
		};

		expect(
			deriveChannelState(
				'text',
				{ textColor: 'opaque' },
				bothEligible,
				palettes
			).opacity
		).toBe( 100 );
		expect(
			deriveChannelState(
				'text',
				{ textColor: 'alpha' },
				bothEligible,
				palettes
			).opacity
		).toBe( 50 );
	} );

	test( 'background custom and preset states mirror text behavior', () => {
		const custom = deriveChannelState(
			'background',
			{ style: { color: { background: 'rgba(1, 2, 3, 0.35)' } } },
			bothEligible,
			emptyPalettes
		);
		const preset = deriveChannelState(
			'background',
			{ backgroundColor: 'surface' },
			bothEligible,
			{
				theme: [ { slug: 'surface', color: 'rgba(4, 5, 6, 0.65)' } ],
			}
		);

		expect( custom ).toMatchObject( { kind: 'custom', opacity: 35 } );
		expect( preset ).toMatchObject( { kind: 'preset', opacity: 65 } );
	} );

	test( 'uses custom, then theme, then default palette precedence', () => {
		const attributes = { textColor: 'brand' };
		const palettes = {
			custom: [ { slug: 'brand', color: 'rgba(0, 0, 0, 0.2)' } ],
			theme: [ { slug: 'brand', color: 'rgba(0, 0, 0, 0.4)' } ],
			default: [ { slug: 'brand', color: 'rgba(0, 0, 0, 0.6)' } ],
		};

		expect(
			deriveChannelState( 'text', attributes, bothEligible, palettes )
				.opacity
		).toBe( 20 );
		expect(
			deriveChannelState( 'text', attributes, bothEligible, {
				...palettes,
				custom: [],
			} ).opacity
		).toBe( 40 );
		expect(
			deriveChannelState( 'text', attributes, bothEligible, {
				...palettes,
				custom: [],
				theme: [],
			} ).opacity
		).toBe( 60 );
	} );

	test( 'distinguishes no color, unsupported color, and missing preset', () => {
		expect(
			deriveChannelState( 'text', {}, bothEligible, emptyPalettes ).kind
		).toBe( 'missing' );
		expect(
			deriveChannelState(
				'text',
				{ style: { color: { text: 'hsl(0 100% 50%)' } } },
				bothEligible,
				emptyPalettes
			).kind
		).toBe( 'unsupported' );
		expect(
			deriveChannelState(
				'text',
				{ textColor: 'missing' },
				bothEligible,
				emptyPalettes
			).kind
		).toBe( 'missing-preset' );
	} );

	test( 'ignores a stale custom value when a preset exists', () => {
		const state = deriveChannelState(
			'text',
			{
				textColor: 'brand',
				style: { color: { text: 'rgba(0, 0, 0, 0.1)' } },
			},
			bothEligible,
			{
				custom: [ { slug: 'brand', color: 'rgba(0, 0, 0, 0.8)' } ],
			}
		);

		expect( state.kind ).toBe( 'preset' );
		expect( state.opacity ).toBe( 80 );
	} );

	test.each( [
		[ { gradient: 'vivid-cyan-blue-to-vivid-purple' }, 'preset' ],
		[
			{ style: { color: { gradient: 'linear-gradient(red, blue)' } } },
			'custom',
		],
	] )( 'blocks background for an active %s gradient', ( attributes ) => {
		expect(
			deriveChannelState(
				'background',
				attributes,
				bothEligible,
				emptyPalettes
			).kind
		).toBe( 'gradient-blocked' );
	} );

	test( 'blocks a stale background color behind a gradient only', () => {
		const context = deriveColorContext(
			{
				gradient: 'brand-gradient',
				style: {
					color: { background: '#f00', text: '#000' },
				},
			},
			bothEligible,
			emptyPalettes
		);

		expect( context.background.kind ).toBe( 'gradient-blocked' );
		expect( context.text.kind ).toBe( 'custom' );
	} );
} );

describe( 'useColorContext synchronization', () => {
	beforeEach( () => {
		useSettings.mockReset();
	} );

	test( 'subscribes to all effective block-context palette origins', () => {
		useSettings.mockReturnValue( [ [], [], [] ] );
		let result;

		render(
			<HookHarness
				attributes={ {} }
				eligibility={ bothEligible }
				onResult={ ( value ) => {
					result = value;
				} }
			/>
		);

		expect( useSettings ).toHaveBeenCalledWith( ...PALETTE_SETTING_PATHS );
		expect( result.text.kind ).toBe( 'missing' );
	} );

	test( 'palette changes update a selected preset opacity', () => {
		useSettings.mockReturnValue( [
			[ { slug: 'brand', color: 'rgba(0, 0, 0, 0.2)' } ],
			[],
			[],
		] );
		let result;
		const props = {
			attributes: { textColor: 'brand' },
			eligibility: bothEligible,
			onResult: ( value ) => {
				result = value;
			},
		};
		const view = render( <HookHarness { ...props } /> );

		expect( result.text.opacity ).toBe( 20 );

		useSettings.mockReturnValue( [
			[ { slug: 'brand', color: 'rgba(0, 0, 0, 0.7)' } ],
			[],
			[],
		] );
		view.rerender( <HookHarness { ...props } /> );

		expect( result.text.opacity ).toBe( 70 );
	} );

	test( 'native custom and preset changes update the derived source', () => {
		useSettings.mockReturnValue( [
			[ { slug: 'brand', color: 'rgba(0, 0, 0, 0.75)' } ],
			[],
			[],
		] );
		let result;
		const capture = ( value ) => {
			result = value;
		};
		const view = render(
			<HookHarness
				attributes={ {
					style: { color: { text: 'rgba(0, 0, 0, 0.25)' } },
				} }
				eligibility={ bothEligible }
				onResult={ capture }
			/>
		);

		expect( result.text ).toMatchObject( {
			kind: 'custom',
			opacity: 25,
		} );

		view.rerender(
			<HookHarness
				attributes={ { textColor: 'brand' } }
				eligibility={ bothEligible }
				onResult={ capture }
			/>
		);

		expect( result.text ).toMatchObject( {
			kind: 'preset',
			opacity: 75,
		} );

		view.rerender(
			<HookHarness
				attributes={ {
					style: { color: { text: 'rgba(0, 0, 0, 0.5)' } },
				} }
				eligibility={ bothEligible }
				onResult={ capture }
			/>
		);

		expect( result.text ).toMatchObject( {
			kind: 'custom',
			opacity: 50,
		} );
	} );

	test( 'native background color changes update displayed opacity', () => {
		useSettings.mockReturnValue( [ [], [], [] ] );
		let result;
		const capture = ( value ) => {
			result = value;
		};
		const view = render(
			<HookHarness
				attributes={ {
					style: {
						color: { background: 'rgba(0, 0, 0, 0.2)' },
					},
				} }
				eligibility={ bothEligible }
				onResult={ capture }
			/>
		);

		expect( result.background.opacity ).toBe( 20 );

		view.rerender(
			<HookHarness
				attributes={ {
					style: {
						color: { background: 'rgba(0, 0, 0, 0.9)' },
					},
				} }
				eligibility={ bothEligible }
				onResult={ capture }
			/>
		);

		expect( result.background.opacity ).toBe( 90 );
	} );
} );
