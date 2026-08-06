import { getColorEligibility } from '../../src/utils/eligibility';

const standardAttributes = {
	style: { type: 'object' },
	textColor: { type: 'string' },
	backgroundColor: { type: 'string' },
};

function createBlockType( color, attributes = standardAttributes ) {
	return {
		name: 'example/standard-color',
		supports: { color },
		attributes,
	};
}

describe( 'getColorEligibility', () => {
	test( 'excludes Cover before reading support or attribute data', () => {
		const cover = { name: 'core/cover' };

		Object.defineProperty( cover, 'supports', {
			get() {
				throw new Error( 'Cover support must not be read.' );
			},
		} );

		expect( getColorEligibility( cover ) ).toEqual( {
			eligible: false,
			text: false,
			background: false,
			reason: 'cover-excluded',
		} );
	} );

	test( 'rejects a missing or malformed block name', () => {
		expect( getColorEligibility( {} ).reason ).toBe( 'invalid-block-name' );
		expect(
			getColorEligibility( { name: 'not-a-block-name' } ).reason
		).toBe( 'invalid-block-name' );
	} );

	test( 'rejects a block without color support', () => {
		expect( getColorEligibility( createBlockType( false ) ) ).toEqual( {
			eligible: false,
			text: false,
			background: false,
			reason: 'missing-standard-contract',
		} );
	} );

	test( 'supports text only', () => {
		expect(
			getColorEligibility(
				createBlockType( { text: true, background: false } )
			)
		).toMatchObject( {
			eligible: true,
			text: true,
			background: false,
		} );
	} );

	test( 'supports background only', () => {
		expect(
			getColorEligibility(
				createBlockType( { text: false, background: true } )
			)
		).toMatchObject( {
			eligible: true,
			text: false,
			background: true,
		} );
	} );

	test( 'supports both channels with the documented true declaration', () => {
		expect( getColorEligibility( createBlockType( true ) ) ).toMatchObject(
			{
				eligible: true,
				text: true,
				background: true,
			}
		);
	} );

	test( 'respects explicitly disabled channels', () => {
		expect(
			getColorEligibility(
				createBlockType( { text: false, background: false } )
			).eligible
		).toBe( false );
	} );

	test( 'honors a narrow explicit incompatibility exclusion', () => {
		expect(
			getColorEligibility( createBlockType( true ), {
				incompatibleBlocks: new Set( [ 'example/standard-color' ] ),
			} ).reason
		).toBe( 'explicitly-incompatible' );
	} );

	test( 'rejects malformed color support declarations', () => {
		expect(
			getColorEligibility( createBlockType( 'text' ) ).eligible
		).toBe( false );
		expect( getColorEligibility( createBlockType( [] ) ).eligible ).toBe(
			false
		);
	} );

	test( 'does not trust top-level color support without standard attributes', () => {
		expect(
			getColorEligibility( createBlockType( true, {} ) ).eligible
		).toBe( false );
	} );
} );
