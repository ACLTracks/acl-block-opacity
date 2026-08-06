import { createOpacityUpdate } from '../../src/utils/persistence';

describe( 'createOpacityUpdate', () => {
	test( 'updates a custom text color through standard attributes', () => {
		expect(
			createOpacityUpdate( {
				attributes: {
					style: { color: { text: 'rgb(10, 20, 30)' } },
				},
				context: 'text',
				opacity: 50,
			} )
		).toEqual( {
			style: { color: { text: 'rgba(10, 20, 30, 0.5)' } },
			textColor: undefined,
		} );
	} );

	test( 'converts a preset text color atomically', () => {
		expect(
			createOpacityUpdate( {
				attributes: { textColor: 'brand' },
				context: 'text',
				opacity: 25,
				resolvedPresetColor: '#336699',
			} )
		).toEqual( {
			style: { color: { text: 'rgba(51, 102, 153, 0.25)' } },
			textColor: undefined,
		} );
	} );

	test( 'updates a custom background color independently', () => {
		expect(
			createOpacityUpdate( {
				attributes: {
					style: { color: { background: '#ff0000' } },
				},
				context: 'background',
				opacity: 75,
			} )
		).toEqual( {
			style: {
				color: { background: 'rgba(255, 0, 0, 0.75)' },
			},
			backgroundColor: undefined,
		} );
	} );

	test( 'converts a preset background color atomically', () => {
		expect(
			createOpacityUpdate( {
				attributes: { backgroundColor: 'surface' },
				context: 'background',
				opacity: 40,
				resolvedPresetColor: 'rgb(5 10 15)',
			} )
		).toEqual( {
			style: {
				color: { background: 'rgba(5, 10, 15, 0.4)' },
			},
			backgroundColor: undefined,
		} );
	} );

	test( 'preserves unrelated style and color properties', () => {
		const update = createOpacityUpdate( {
			attributes: {
				style: {
					border: { width: '2px' },
					color: {
						background: '#fff',
						gradient: 'linear-gradient(red, blue)',
						text: '#000',
					},
				},
			},
			context: 'text',
			opacity: 60,
		} );

		expect( update.style.border ).toEqual( { width: '2px' } );
		expect( update.style.color.background ).toBe( '#fff' );
		expect( update.style.color.gradient ).toBe(
			'linear-gradient(red, blue)'
		);
	} );

	test( 'returns no update for unsupported or absent source colors', () => {
		expect(
			createOpacityUpdate( {
				attributes: { style: { color: { text: 'red' } } },
				context: 'text',
				opacity: 50,
			} )
		).toBeNull();
		expect(
			createOpacityUpdate( {
				attributes: {},
				context: 'background',
				opacity: 50,
			} )
		).toBeNull();
	} );

	test( 'supports opacity zero', () => {
		const update = createOpacityUpdate( {
			attributes: { style: { color: { text: '#123456' } } },
			context: 'text',
			opacity: 0,
		} );

		expect( update.style.color.text ).toBe( 'rgba(18, 52, 86, 0)' );
	} );

	test( 'supports fully opaque output at 100', () => {
		const update = createOpacityUpdate( {
			attributes: {
				style: { color: { background: '#12345680' } },
			},
			context: 'background',
			opacity: 100,
		} );

		expect( update.style.color.background ).toBe( 'rgb(18, 52, 86)' );
	} );

	test( 'does not mutate the input attributes', () => {
		const attributes = {
			className: 'example',
			style: {
				spacing: { padding: '1rem' },
				color: { text: '#abcdef' },
			},
		};
		const snapshot = JSON.parse( JSON.stringify( attributes ) );

		createOpacityUpdate( {
			attributes,
			context: 'text',
			opacity: 50,
		} );

		expect( attributes ).toEqual( snapshot );
	} );

	test( 'treats a preset as authoritative over stale custom data', () => {
		const update = createOpacityUpdate( {
			attributes: {
				textColor: 'authoritative',
				style: { color: { text: '#ff0000' } },
			},
			context: 'text',
			opacity: 50,
			resolvedPresetColor: '#0000ff',
		} );

		expect( update.style.color.text ).toBe( 'rgba(0, 0, 255, 0.5)' );
		expect( update.textColor ).toBeUndefined();
	} );
} );
