import { fireEvent, render } from '@testing-library/react';

import {
	applyOpacityChange,
	OpacityControls,
} from '../../src/components/opacity-controls';
import { useColorContext } from '../../src/hooks/use-color-context';

jest.mock( '../../src/hooks/use-color-context', () => ( {
	useColorContext: jest.fn(),
} ) );

jest.mock( '@wordpress/block-editor', () => ( {
	InspectorControls: ( { children } ) => (
		<aside aria-label="Block inspector">{ children }</aside>
	),
} ) );

jest.mock( '@wordpress/components', () => ( {
	Notice: ( { children } ) => <div role="status">{ children }</div>,
	PanelBody: ( { children, title } ) => (
		<section aria-label={ title }>
			<h2>{ title }</h2>
			{ children }
		</section>
	),
	RangeControl: ( {
		__next40pxDefaultSize,
		help,
		label,
		max,
		min,
		onChange,
		step,
		value,
	} ) => (
		<div>
			<label htmlFor={ `${ label }-range` }>
				{ label }
				<input
					aria-label={ label }
					data-next40px-default-size={ __next40pxDefaultSize }
					id={ `${ label }-range` }
					max={ max }
					min={ min }
					onChange={ ( event ) =>
						onChange( Number( event.target.value ) )
					}
					step={ step }
					type="range"
					value={ value }
				/>
			</label>
			<label htmlFor={ `${ label }-number` }>
				{ `${ label } value` }
				<input
					aria-label={ `${ label } value` }
					id={ `${ label }-number` }
					max={ max }
					min={ min }
					onChange={ ( event ) =>
						onChange( Number( event.target.value ) )
					}
					step={ step }
					type="number"
					value={ value }
				/>
			</label>
			<output aria-label={ `${ label } current value` }>
				{ `${ value }%` }
			</output>
			<p>{ help }</p>
		</div>
	),
} ) );

const ineligible = {
	kind: 'ineligible',
	available: false,
	opacity: null,
};

function validState( channel, overrides = {} ) {
	return {
		channel,
		kind: 'custom',
		available: true,
		opacity: 100,
		resolvedLiteral: null,
		...overrides,
	};
}

function unavailableState( channel, kind ) {
	return {
		channel,
		kind,
		available: false,
		opacity: null,
	};
}

function renderControls( {
	attributes = {},
	background = ineligible,
	eligibility = { text: true, background: false },
	setAttributes = jest.fn(),
	text = validState( 'text' ),
} = {} ) {
	useColorContext.mockReturnValue( { text, background } );
	const view = render(
		<OpacityControls
			attributes={ attributes }
			eligibility={ eligibility }
			setAttributes={ setAttributes }
		/>
	);

	return { ...view, setAttributes };
}

describe( 'OpacityControls accessibility and visibility', () => {
	beforeEach( () => {
		useColorContext.mockReset();
	} );

	test( 'renders a discoverable collapsible panel and labeled range', () => {
		const view = renderControls( {
			attributes: { style: { color: { text: '#000' } } },
		} );
		const slider = view.getByRole( 'slider', {
			name: 'Text opacity',
		} );

		expect( view.getByRole( 'region', { name: 'Opacity' } ) ).toBeTruthy();
		expect( slider.getAttribute( 'min' ) ).toBe( '0' );
		expect( slider.getAttribute( 'max' ) ).toBe( '100' );
		expect( slider.getAttribute( 'step' ) ).toBe( '1' );
		expect( slider.getAttribute( 'data-next40px-default-size' ) ).toBe(
			'true'
		);
		expect(
			view.getByRole( 'spinbutton', { name: 'Text opacity value' } )
		).toBeTruthy();
		expect(
			view.getByLabelText( 'Text opacity current value' ).textContent
		).toBe( '100%' );
	} );

	test( 'renders only eligible channels', () => {
		const view = renderControls( {
			attributes: { style: { color: { text: '#000' } } },
		} );

		expect(
			view.getByRole( 'slider', { name: 'Text opacity' } )
		).toBeTruthy();
		expect(
			view.queryByRole( 'slider', { name: 'Background opacity' } )
		).toBeNull();
	} );

	test.each( [
		[ 'text', 'At 0%, the text will be invisible.' ],
		[ 'background', 'At 0%, the background color will be transparent.' ],
	] )( 'renders the zero-percent %s warning', ( channel, warning ) => {
		const text =
			channel === 'text'
				? validState( 'text', { opacity: 0 } )
				: ineligible;
		const background =
			channel === 'background'
				? validState( 'background', { opacity: 0 } )
				: ineligible;
		const view = renderControls( {
			attributes: {
				style: {
					color:
						channel === 'text'
							? { text: 'rgba(0, 0, 0, 0)' }
							: { background: 'rgba(0, 0, 0, 0)' },
				},
			},
			background,
			eligibility: {
				text: channel === 'text',
				background: channel === 'background',
			},
			text,
		} );

		expect( view.getByText( warning ) ).toBeTruthy();
	} );

	test( 'shows rounded fractional alpha without rewriting on mount', () => {
		const setAttributes = jest.fn();
		const view = renderControls( {
			attributes: {
				style: { color: { text: 'rgba(0, 0, 0, 0.333)' } },
			},
			setAttributes,
			text: validState( 'text', { opacity: 33 } ),
		} );

		expect(
			view.getByLabelText( 'Text opacity current value' ).textContent
		).toBe( '33%' );
		expect( setAttributes ).not.toHaveBeenCalled();
	} );
} );

describe( 'OpacityControls updates', () => {
	beforeEach( () => {
		useColorContext.mockReset();
	} );

	test( 'updates custom text through one atomic setAttributes call', () => {
		const setAttributes = jest.fn();
		const view = renderControls( {
			attributes: { style: { color: { text: '#123456' } } },
			setAttributes,
		} );

		fireEvent.change(
			view.getByRole( 'slider', { name: 'Text opacity' } ),
			{ target: { value: '40' } }
		);

		expect( setAttributes ).toHaveBeenCalledTimes( 1 );
		expect( setAttributes ).toHaveBeenCalledWith( {
			style: { color: { text: 'rgba(18, 52, 86, 0.4)' } },
			textColor: undefined,
		} );
	} );

	test( 'converts a text preset and clears textColor atomically', () => {
		const setAttributes = jest.fn();
		const view = renderControls( {
			attributes: { textColor: 'brand' },
			setAttributes,
			text: validState( 'text', {
				kind: 'preset',
				resolvedLiteral: '#336699',
			} ),
		} );

		fireEvent.change(
			view.getByRole( 'slider', { name: 'Text opacity' } ),
			{ target: { value: '25' } }
		);

		expect( setAttributes ).toHaveBeenCalledTimes( 1 );
		expect( setAttributes.mock.calls[ 0 ][ 0 ] ).toEqual( {
			style: { color: { text: 'rgba(51, 102, 153, 0.25)' } },
			textColor: undefined,
		} );
	} );

	test( 'preserves unrelated styles during custom conversion', () => {
		const setAttributes = jest.fn();
		const attributes = {
			style: {
				border: { width: '2px' },
				color: { background: '#fff', text: '#000' },
			},
		};
		const view = renderControls( { attributes, setAttributes } );

		fireEvent.change(
			view.getByRole( 'slider', { name: 'Text opacity' } ),
			{ target: { value: '50' } }
		);

		expect( setAttributes.mock.calls[ 0 ][ 0 ].style ).toEqual( {
			border: { width: '2px' },
			color: {
				background: '#fff',
				text: 'rgba(0, 0, 0, 0.5)',
			},
		} );
	} );

	test.each( [ 0, 100 ] )( 'supports text opacity %i', ( opacity ) => {
		const setAttributes = jest.fn();
		const view = renderControls( {
			attributes: { style: { color: { text: '#000' } } },
			setAttributes,
			text: validState( 'text', {
				opacity: opacity === 100 ? 50 : 100,
			} ),
		} );

		fireEvent.change(
			view.getByRole( 'slider', { name: 'Text opacity' } ),
			{ target: { value: String( opacity ) } }
		);

		expect( setAttributes ).toHaveBeenCalledTimes( 1 );
		expect( setAttributes.mock.calls[ 0 ][ 0 ].style.color.text ).toBe(
			opacity === 0 ? 'rgba(0, 0, 0, 0)' : 'rgb(0, 0, 0)'
		);
	} );

	test( 'converts a background preset without changing text', () => {
		const setAttributes = jest.fn();
		const attributes = {
			backgroundColor: 'surface',
			style: { color: { text: '#123456' } },
		};
		const view = renderControls( {
			attributes,
			background: validState( 'background', {
				kind: 'preset',
				resolvedLiteral: '#ffffff',
			} ),
			eligibility: { text: true, background: true },
			setAttributes,
			text: validState( 'text' ),
		} );

		fireEvent.change(
			view.getByRole( 'slider', { name: 'Background opacity' } ),
			{ target: { value: '60' } }
		);

		expect( setAttributes ).toHaveBeenCalledTimes( 1 );
		expect( setAttributes.mock.calls[ 0 ][ 0 ] ).toEqual( {
			backgroundColor: undefined,
			style: {
				color: {
					background: 'rgba(255, 255, 255, 0.6)',
					text: '#123456',
				},
			},
		} );
	} );

	test( 'updates a custom background independently', () => {
		const setAttributes = jest.fn();
		const attributes = {
			style: { color: { background: '#ff0000', text: '#123456' } },
		};
		const view = renderControls( {
			attributes,
			background: validState( 'background' ),
			eligibility: { text: true, background: true },
			setAttributes,
			text: validState( 'text' ),
		} );

		fireEvent.change(
			view.getByRole( 'slider', { name: 'Background opacity' } ),
			{ target: { value: '45' } }
		);

		expect( setAttributes ).toHaveBeenCalledTimes( 1 );
		expect( setAttributes.mock.calls[ 0 ][ 0 ] ).toEqual( {
			backgroundColor: undefined,
			style: {
				color: {
					background: 'rgba(255, 0, 0, 0.45)',
					text: '#123456',
				},
			},
		} );
	} );

	test.each( [ 0, 100 ] )( 'supports background opacity %i', ( opacity ) => {
		const setAttributes = jest.fn();
		const view = renderControls( {
			attributes: {
				style: { color: { background: '#000' } },
			},
			background: validState( 'background', {
				opacity: opacity === 100 ? 50 : 100,
			} ),
			eligibility: { text: false, background: true },
			setAttributes,
			text: ineligible,
		} );

		fireEvent.change(
			view.getByRole( 'slider', { name: 'Background opacity' } ),
			{ target: { value: String( opacity ) } }
		);

		expect( setAttributes ).toHaveBeenCalledTimes( 1 );
		expect(
			setAttributes.mock.calls[ 0 ][ 0 ].style.color.background
		).toBe( opacity === 0 ? 'rgba(0, 0, 0, 0)' : 'rgb(0, 0, 0)' );
	} );

	test( 'rejects unavailable state and invalid step values', () => {
		const setAttributes = jest.fn();
		const options = {
			attributes: { style: { color: { text: '#000' } } },
			channel: 'text',
			opacity: 50,
			setAttributes,
			state: unavailableState( 'text', 'unsupported' ),
		};

		expect( applyOpacityChange( options ) ).toBe( false );
		expect(
			applyOpacityChange( {
				...options,
				opacity: 50.5,
				state: validState( 'text' ),
			} )
		).toBe( false );
		expect( setAttributes ).not.toHaveBeenCalled();
	} );
} );

describe( 'OpacityControls unavailable states', () => {
	beforeEach( () => {
		useColorContext.mockReset();
	} );

	test.each( [
		[ 'missing', 'Choose a text color to adjust its opacity.' ],
		[ 'unsupported', 'This text color format cannot be adjusted safely.' ],
		[
			'missing-preset',
			'The selected color preset is unavailable in the current theme.',
		],
	] )( 'shows text %s guidance without updating', ( kind, message ) => {
		const setAttributes = jest.fn();
		const view = renderControls( {
			setAttributes,
			text: unavailableState( 'text', kind ),
		} );

		expect( view.getByText( message ) ).toBeTruthy();
		expect(
			view.queryByRole( 'slider', { name: 'Text opacity' } )
		).toBeNull();
		expect( setAttributes ).not.toHaveBeenCalled();
	} );

	test( 'blocks only background when a gradient is active', () => {
		const setAttributes = jest.fn();
		const view = renderControls( {
			attributes: {
				gradient: 'brand-gradient',
				style: { color: { background: '#fff', text: '#000' } },
			},
			background: unavailableState( 'background', 'gradient-blocked' ),
			eligibility: { text: true, background: true },
			setAttributes,
		} );

		expect(
			view.getByRole( 'slider', { name: 'Text opacity' } )
		).toBeTruthy();
		expect(
			view.queryByRole( 'slider', { name: 'Background opacity' } )
		).toBeNull();
		expect(
			view.getByText(
				'Remove the background gradient to adjust background opacity.'
			)
		).toBeTruthy();
		expect( setAttributes ).not.toHaveBeenCalled();
	} );

	test( 'distinguishes missing and unsupported background colors', () => {
		const missingView = renderControls( {
			background: unavailableState( 'background', 'missing' ),
			eligibility: { text: false, background: true },
			text: ineligible,
		} );

		expect(
			missingView.getByText(
				'Choose a background color to adjust its opacity.'
			)
		).toBeTruthy();
		missingView.unmount();

		const unsupportedView = renderControls( {
			background: unavailableState( 'background', 'unsupported' ),
			eligibility: { text: false, background: true },
			text: ineligible,
		} );

		expect(
			unsupportedView.getByText(
				'This background color format cannot be adjusted safely.'
			)
		).toBeTruthy();
	} );
} );
