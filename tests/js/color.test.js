import colorCorpus from '../fixtures/colors.json';

import { formatColor, parseColor } from '../../src/utils/color';

describe( 'parseColor', () => {
	test.each( colorCorpus.accepted )(
		'accepts and normalizes $input',
		( fixture ) => {
			expect( parseColor( fixture.input ) ).toEqual( fixture.normalized );
		}
	);

	test.each( colorCorpus.rejected )(
		'rejects malformed or unsupported value %s',
		( input ) => {
			expect( parseColor( input ) ).toBeNull();
		}
	);
} );

describe( 'formatColor', () => {
	test.each( colorCorpus.accepted )(
		'formats $input without changing RGB channels',
		( fixture ) => {
			const parsed = parseColor( fixture.input );

			Object.entries( fixture.formats ).forEach(
				( [ opacity, expected ] ) => {
					expect( formatColor( parsed, Number( opacity ) ) ).toBe(
						expected
					);
				}
			);
		}
	);

	test( 'rejects invalid formatter inputs', () => {
		expect( formatColor( null, 50 ) ).toBeNull();
		expect( formatColor( parseColor( '#fff' ), -1 ) ).toBeNull();
		expect( formatColor( parseColor( '#fff' ), 101 ) ).toBeNull();
		expect( formatColor( parseColor( '#fff' ), Infinity ) ).toBeNull();
		expect( formatColor( parseColor( '#fff' ), '50' ) ).toBeNull();
	} );
} );
