/**
 * Accessible InspectorControls for standard text and background opacity.
 */

import { InspectorControls } from '@wordpress/block-editor';
import { Notice, PanelBody, RangeControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

import { useColorContext } from '../hooks/use-color-context';
import { createOpacityUpdate } from '../utils/persistence';

/**
 * Apply one validated opacity update through one setAttributes call.
 *
 * @param {Object}              options
 * @param {Object}              options.attributes
 * @param {'text'|'background'} options.channel
 * @param {Object}              options.state
 * @param {number}              options.opacity
 * @param {Function}            options.setAttributes
 * @return {boolean} Whether an update was applied.
 */
export function applyOpacityChange( {
	attributes,
	channel,
	state,
	opacity,
	setAttributes,
} ) {
	if (
		! state?.available ||
		state.channel !== channel ||
		! Number.isInteger( opacity ) ||
		opacity < 0 ||
		opacity > 100 ||
		typeof setAttributes !== 'function'
	) {
		return false;
	}

	const update = createOpacityUpdate( {
		attributes,
		context: channel,
		opacity,
		resolvedPresetColor:
			state.kind === 'preset' ? state.resolvedLiteral : undefined,
	} );

	if ( ! update ) {
		return false;
	}

	setAttributes( update );

	return true;
}

/**
 * Return guidance for a channel that cannot currently be adjusted.
 *
 * @param {Object}              props         Component props.
 * @param {'text'|'background'} props.channel Channel name.
 * @param {Object}              props.state   Explicit channel state.
 * @return {Object} Guidance notice.
 */
function UnavailableChannel( { channel, state } ) {
	let message;
	let status = 'info';

	if ( state.kind === 'missing-preset' ) {
		message = __(
			'The selected color preset is unavailable in the current theme.',
			'acl-block-opacity'
		);
		status = 'warning';
	} else if ( state.kind === 'unsupported' ) {
		message =
			channel === 'text'
				? __(
						'This text color format cannot be adjusted safely.',
						'acl-block-opacity'
				  )
				: __(
						'This background color format cannot be adjusted safely.',
						'acl-block-opacity'
				  );
		status = 'warning';
	} else if ( state.kind === 'gradient-blocked' ) {
		message = __(
			'Remove the background gradient to adjust background opacity.',
			'acl-block-opacity'
		);
	} else {
		message =
			channel === 'text'
				? __(
						'Choose a text color to adjust its opacity.',
						'acl-block-opacity'
				  )
				: __(
						'Choose a background color to adjust its opacity.',
						'acl-block-opacity'
				  );
	}

	return (
		<Notice status={ status } isDismissible={ false }>
			{ message }
		</Notice>
	);
}

/**
 * Render one eligible channel.
 *
 * @param {Object}              props               Component props.
 * @param {Object}              props.attributes    Block attributes.
 * @param {'text'|'background'} props.channel       Channel name.
 * @param {Function}            props.setAttributes Attribute updater.
 * @param {Object}              props.state         Explicit channel state.
 * @return {Object|null} Channel control or guidance.
 */
function OpacityChannel( { attributes, channel, setAttributes, state } ) {
	if ( state.kind === 'ineligible' ) {
		return null;
	}

	if ( ! state.available ) {
		return <UnavailableChannel channel={ channel } state={ state } />;
	}

	const isText = channel === 'text';
	const label = isText
		? __( 'Text opacity', 'acl-block-opacity' )
		: __( 'Background opacity', 'acl-block-opacity' );
	let help = isText
		? __( 'Adjust the text color opacity.', 'acl-block-opacity' )
		: __( 'Adjust the background color opacity.', 'acl-block-opacity' );

	if ( state.opacity === 0 ) {
		help = isText
			? __( 'At 0%, the text will be invisible.', 'acl-block-opacity' )
			: __(
					'At 0%, the background color will be transparent.',
					'acl-block-opacity'
			  );
	}

	return (
		<RangeControl
			__next40pxDefaultSize
			help={ help }
			label={ label }
			max={ 100 }
			min={ 0 }
			onChange={ ( value ) =>
				applyOpacityChange( {
					attributes,
					channel,
					opacity: value,
					setAttributes,
					state,
				} )
			}
			renderTooltipContent={ ( value ) => `${ value }%` }
			showTooltip
			step={ 1 }
			value={ state.opacity }
			withInputField
		/>
	);
}

/**
 * Render the selected block's available opacity controls.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes
 * @param {Object}   props.eligibility
 * @param {Function} props.setAttributes
 * @return {Object} Inspector controls.
 */
export function OpacityControls( { attributes, eligibility, setAttributes } ) {
	const context = useColorContext( attributes, eligibility );

	return (
		<InspectorControls>
			<PanelBody
				initialOpen
				title={ __( 'Opacity', 'acl-block-opacity' ) }
			>
				<OpacityChannel
					attributes={ attributes }
					channel="text"
					setAttributes={ setAttributes }
					state={ context.text }
				/>
				<OpacityChannel
					attributes={ attributes }
					channel="background"
					setAttributes={ setAttributes }
					state={ context.background }
				/>
			</PanelBody>
		</InspectorControls>
	);
}
