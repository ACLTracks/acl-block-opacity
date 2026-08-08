import { render } from '@testing-library/react';
import { addFilter } from '@wordpress/hooks';

import { createBlockEditFilter, FILTER_NAMESPACE } from '../../src/index';

jest.mock( '@wordpress/hooks', () => ( {
	addFilter: jest.fn(),
} ) );

jest.mock( '@wordpress/block-editor', () => ( {
	useSettings: jest.fn(),
} ) );

jest.mock( '@wordpress/blocks', () => ( {
	getBlockType: jest.fn(),
} ) );

jest.mock( '@wordpress/compose', () => ( {
	createHigherOrderComponent: ( factory ) => factory,
} ) );

jest.mock( '../../src/components/opacity-controls', () => ( {
	OpacityControls: () => <div data-testid="default-opacity-controls" />,
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

function setup( { incompatibleBlocks = new Set() } = {} ) {
	const blockEdit = jest.fn( () => <div data-testid="block-edit" /> );
	const controls = jest.fn( () => <div data-testid="opacity-controls" /> );
	const getBlockType = jest.fn( () => standardBlockType );
	const filter = createBlockEditFilter( {
		ControlsComponent: controls,
		createHigherOrderComponentImpl: ( factory ) => factory,
		getBlockTypeImpl: getBlockType,
		incompatibleBlocks,
	} );
	const WrappedBlockEdit = filter( blockEdit );

	return { blockEdit, controls, getBlockType, WrappedBlockEdit };
}

describe( 'editor.BlockEdit registration', () => {
	test( 'registers under the unique plugin namespace', () => {
		const blockEditCalls = addFilter.mock.calls.filter(
			( call ) => call[ 0 ] === 'editor.BlockEdit'
		);

		expect( FILTER_NAMESPACE ).toBe(
			'acl-block-opacity/with-opacity-controls'
		);
		expect( blockEditCalls ).toHaveLength( 1 );
		expect( blockEditCalls[ 0 ] ).toEqual( [
			'editor.BlockEdit',
			FILTER_NAMESPACE,
			expect.any( Function ),
		] );
	} );

	test( 'renders the original BlockEdit exactly once', () => {
		const { blockEdit, WrappedBlockEdit } = setup();

		render(
			<WrappedBlockEdit
				attributes={ {} }
				isSelected
				name="core/paragraph"
				setAttributes={ jest.fn() }
			/>
		);

		expect( blockEdit ).toHaveBeenCalledTimes( 1 );
	} );

	test( 'does not mount controls or look up an unselected block', () => {
		const { blockEdit, controls, getBlockType, WrappedBlockEdit } = setup();

		render(
			<WrappedBlockEdit
				attributes={ {} }
				isSelected={ false }
				name="core/paragraph"
			/>
		);

		expect( getBlockType ).not.toHaveBeenCalled();
		expect( controls ).not.toHaveBeenCalled();
		expect( blockEdit ).toHaveBeenCalledTimes( 1 );
	} );

	test.each( [ [ 'invalid' ], [ 'core/cover' ] ] )(
		'rejects %s before block lookup or hook component mounting',
		( name ) => {
			const { controls, getBlockType, WrappedBlockEdit } = setup();

			render(
				<WrappedBlockEdit attributes={ {} } isSelected name={ name } />
			);

			expect( getBlockType ).not.toHaveBeenCalled();
			expect( controls ).not.toHaveBeenCalled();
		}
	);

	test( 'does not mount controls for an ineligible registered block', () => {
		const { controls, getBlockType, WrappedBlockEdit } = setup();
		getBlockType.mockReturnValue( {
			name: 'core/image',
			supports: { color: false },
			attributes: {},
		} );

		render(
			<WrappedBlockEdit attributes={ {} } isSelected name="core/image" />
		);

		expect( getBlockType ).toHaveBeenCalledTimes( 1 );
		expect( controls ).not.toHaveBeenCalled();
	} );

	test( 'mounts controls for a selected eligible block', () => {
		const { controls, WrappedBlockEdit } = setup();

		const view = render(
			<WrappedBlockEdit
				attributes={ { style: { color: { text: '#000' } } } }
				clientId="client-1"
				isSelected
				name="core/paragraph"
				setAttributes={ jest.fn() }
			/>
		);

		expect( view.getByTestId( 'opacity-controls' ) ).toBeTruthy();
		expect( controls ).toHaveBeenCalledTimes( 1 );
		expect( controls.mock.calls[ 0 ][ 0 ].eligibility ).toMatchObject( {
			eligible: true,
			text: true,
			background: true,
		} );
	} );

	test( 'excludes an explicitly incompatible block before lookup', () => {
		const { controls, getBlockType, WrappedBlockEdit } = setup( {
			incompatibleBlocks: new Set( [ 'core/paragraph' ] ),
		} );

		render(
			<WrappedBlockEdit
				attributes={ {} }
				isSelected
				name="core/paragraph"
			/>
		);

		expect( getBlockType ).not.toHaveBeenCalled();
		expect( controls ).not.toHaveBeenCalled();
	} );
} );
