import { render } from '@testing-library/react';
import { addFilter } from '@wordpress/hooks';

import {
	addCompatibilityWrapperProps,
	COMPATIBILITY_CLASS,
	COMPATIBILITY_FILTER_NAMESPACE,
	COMPATIBILITY_PROPERTY,
	createCompatibilityBlockListFilter,
	getRuntimeBlockContextCollisions,
	getTextCollisionCandidate,
	hasUnambiguousRootColorTarget,
	hasTextCollisionSlug,
} from '../../src/compatibility-preview';

jest.mock( '@wordpress/hooks', () => ( {
	addFilter: jest.fn(),
} ) );

jest.mock( '@wordpress/blocks', () => ( {
	getBlockType: jest.fn(),
} ) );

jest.mock( '@wordpress/compose', () => ( {
	createHigherOrderComponent: ( factory ) => factory,
} ) );

jest.mock( '@wordpress/block-editor', () => ( {
	useSettings: jest.fn(),
} ) );

const standardBlockType = {
	name: 'core/paragraph',
	supports: { color: true },
	attributes: {
		style: { type: 'object' },
		textColor: { type: 'string' },
		backgroundColor: { type: 'string' },
	},
};

const customAttributes = {
	style: { color: { text: 'rgba(200, 10, 20, 0.5)' } },
};

function setup( {
	palettes = [ [], [ { slug: 'text' } ], [] ],
	blockContextCollisions = new Set(),
} = {} ) {
	const blockList = jest.fn( ( props ) => (
		<div
			data-testid="block-list"
			data-runtime={ props.wrapperProps?.className }
		/>
	) );
	const getBlockType = jest.fn( () => standardBlockType );
	const useSettings = jest.fn( () => palettes );
	const filter = createCompatibilityBlockListFilter( {
		createHigherOrderComponentImpl: ( factory ) => factory,
		getBlockTypeImpl: getBlockType,
		useSettingsImpl: useSettings,
		blockContextCollisions,
	} );
	const Wrapped = filter( blockList );

	return { blockList, getBlockType, useSettings, Wrapped };
}

describe( 'text palette collision detector', () => {
	test( 'registers the public BlockListBlock filter', () => {
		expect( addFilter ).toHaveBeenCalledWith(
			'editor.BlockListBlock',
			COMPATIBILITY_FILTER_NAMESPACE,
			expect.any( Function )
		);
	} );

	test( 'keeps normal palettes dormant', () => {
		expect(
			hasTextCollisionSlug( [
				[ { slug: 'contrast' } ],
				[ { slug: 'body-text' } ],
				[],
			] )
		).toBe( false );
	} );

	test.each( [
		[ 'theme', [ [], [ { slug: 'text' } ], [] ] ],
		[ 'user', [ [ { slug: 'text' } ], [], [] ] ],
		[ 'block context', { theme: [ { slug: 'text' } ] } ],
	] )( 'recognizes a %s text slug', ( label, palettes ) => {
		expect( hasTextCollisionSlug( palettes ) ).toBe( true );
	} );

	test( 'reads only valid server-resolved block-context names', () => {
		globalThis.aclBlockOpacityCompatibility = {
			blockContexts: [ 'acl-opacity-e2e/standard-color', 'invalid', 7 ],
		};

		expect( [ ...getRuntimeBlockContextCollisions() ] ).toEqual( [
			'acl-opacity-e2e/standard-color',
		] );
		delete globalThis.aclBlockOpacityCompatibility;
	} );
} );

describe( 'cheap compatibility candidate gate', () => {
	test.each( [ 'core/cover', 'invalid' ] )(
		'short-circuits %s before block lookup',
		( name ) => {
			const getBlockType = jest.fn();

			expect(
				getTextCollisionCandidate(
					name,
					customAttributes,
					getBlockType
				)
			).toBeNull();
			expect( getBlockType ).not.toHaveBeenCalled();
		}
	);

	test( 'short-circuits an active preset behind a stale custom value', () => {
		const getBlockType = jest.fn();

		expect(
			getTextCollisionCandidate(
				'core/paragraph',
				{ ...customAttributes, textColor: 'text' },
				getBlockType
			)
		).toBeNull();
		expect( getBlockType ).not.toHaveBeenCalled();
	} );

	test( 'short-circuits an unsupported custom color', () => {
		const getBlockType = jest.fn();

		expect(
			getTextCollisionCandidate(
				'core/paragraph',
				{ style: { color: { text: 'hsl(0 100% 50%)' } } },
				getBlockType
			)
		).toBeNull();
		expect( getBlockType ).not.toHaveBeenCalled();
	} );

	test( 'requires standard text-color support', () => {
		expect(
			getTextCollisionCandidate( 'core/image', customAttributes, () => ( {
				name: 'core/image',
				attributes: {},
				supports: { color: false },
			} ) )
		).toBeNull();
	} );

	test( 'rejects a public root selector that targets a descendant', () => {
		expect(
			hasUnambiguousRootColorTarget( {
				selectors: {
					root: '.wp-block-button .wp-block-button__link',
				},
			} )
		).toBe( false );
		expect(
			hasUnambiguousRootColorTarget( {
				selectors: { root: '.wp-block-paragraph' },
			} )
		).toBe( true );
	} );

	test( 'does not mark a supported block with a descendant color target', () => {
		const getBlockType = jest.fn( () => ( {
			...standardBlockType,
			name: 'core/button',
			selectors: {
				root: '.wp-block-button .wp-block-button__link',
			},
		} ) );

		expect(
			getTextCollisionCandidate(
				'core/button',
				customAttributes,
				getBlockType
			)
		).toBeNull();
	} );
} );

describe( 'runtime wrapper behavior', () => {
	test( 'preserves existing props without mutation and is idempotent', () => {
		const original = {
			className: 'theme-class has-text-color',
			'data-id': '7',
			style: { marginTop: '1px', '--theme-text': 'blue' },
		};
		const snapshot = JSON.parse( JSON.stringify( original ) );
		const once = addCompatibilityWrapperProps(
			original,
			'rgba(1, 2, 3, 0.5)'
		);
		const twice = addCompatibilityWrapperProps(
			once,
			'rgba(1, 2, 3, 0.5)'
		);

		expect( original ).toEqual( snapshot );
		expect( twice.className.split( COMPATIBILITY_CLASS ) ).toHaveLength(
			2
		);
		expect( twice.style ).toEqual( {
			marginTop: '1px',
			'--theme-text': 'blue',
			[ COMPATIBILITY_PROPERTY ]: 'rgba(1, 2, 3, 0.5)',
		} );
		expect( twice[ 'data-id' ] ).toBe( '7' );
	} );

	test( 'adds runtime props only for a positive collision', () => {
		const { blockList, useSettings, Wrapped } = setup();
		const attributes = JSON.parse( JSON.stringify( customAttributes ) );
		const snapshot = JSON.parse( JSON.stringify( attributes ) );

		render(
			<Wrapped
				attributes={ attributes }
				name="core/paragraph"
				wrapperProps={ { className: 'has-text-color' } }
			/>
		);

		expect( useSettings ).toHaveBeenCalledTimes( 1 );
		const runtime = blockList.mock.calls.at( -1 )[ 0 ].wrapperProps;
		expect( runtime.className ).toContain( COMPATIBILITY_CLASS );
		expect( runtime.style[ COMPATIBILITY_PROPERTY ] ).toBe(
			'rgba(200, 10, 20, 0.5)'
		);
		expect( attributes ).toEqual( snapshot );
	} );

	test( 'normal palette passes the editor wrapper through unchanged', () => {
		const { blockList, Wrapped } = setup( { palettes: [ [], [], [] ] } );
		const wrapperProps = { className: 'has-text-color' };

		render(
			<Wrapped
				attributes={ customAttributes }
				name="core/paragraph"
				wrapperProps={ wrapperProps }
			/>
		);

		expect( blockList.mock.calls.at( -1 )[ 0 ].wrapperProps ).toBe(
			wrapperProps
		);
	} );

	test( 'uses server-resolved block context without a global subscription', () => {
		const { blockList, useSettings, Wrapped } = setup( {
			palettes: [ [], [], [] ],
			blockContextCollisions: new Set( [ 'core/paragraph' ] ),
		} );

		render(
			<Wrapped attributes={ customAttributes } name="core/paragraph" />
		);

		expect( useSettings ).not.toHaveBeenCalled();
		expect(
			blockList.mock.calls.at( -1 )[ 0 ].wrapperProps.className
		).toContain( COMPATIBILITY_CLASS );
	} );

	test( 'Cover and active presets never subscribe to palettes', () => {
		const { useSettings, Wrapped } = setup();

		render(
			<>
				<Wrapped attributes={ customAttributes } name="core/cover" />
				<Wrapped
					attributes={ { ...customAttributes, textColor: 'text' } }
					name="core/paragraph"
				/>
			</>
		);

		expect( useSettings ).not.toHaveBeenCalled();
	} );

	test( 'isolates sibling colors and nested no-op blocks', () => {
		const { blockList, Wrapped } = setup();

		render(
			<>
				<Wrapped
					attributes={ {
						style: { color: { text: 'rgba(1, 2, 3, 0.25)' } },
					} }
					name="core/paragraph"
				/>
				<Wrapped
					attributes={ {
						style: { color: { text: 'rgba(4, 5, 6, 0.75)' } },
					} }
					name="core/paragraph"
				/>
				<Wrapped attributes={ {} } name="core/paragraph" />
			</>
		);

		const runtimeCalls = blockList.mock.calls.map(
			( call ) =>
				call[ 0 ].wrapperProps?.style?.[ COMPATIBILITY_PROPERTY ]
		);
		expect( runtimeCalls ).toEqual( [
			'rgba(1, 2, 3, 0.25)',
			'rgba(4, 5, 6, 0.75)',
			undefined,
		] );
	} );
} );
