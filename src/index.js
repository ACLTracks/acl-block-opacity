/**
 * Register the selected-block editor integration.
 */

import { getBlockType } from '@wordpress/blocks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { addFilter } from '@wordpress/hooks';

import { OpacityControls } from './components/opacity-controls';
import { getBlockNameGate, getColorEligibility } from './utils/eligibility';

export const FILTER_NAMESPACE = 'acl-block-opacity/with-opacity-controls';
export const INCOMPATIBLE_BLOCKS = new Set();

/**
 * Create the lightweight editor.BlockEdit wrapper.
 *
 * Hook-dependent controls mount only after the selected/name/type/channel gate.
 *
 * @param {Object}   [options]
 * @param {Function} [options.getBlockTypeImpl]
 * @param {Function} [options.ControlsComponent]
 * @param {Set}      [options.incompatibleBlocks]
 * @param {Function} [options.createHigherOrderComponentImpl]
 * @return {Function} BlockEdit filter callback.
 */
export function createBlockEditFilter( {
	getBlockTypeImpl = getBlockType,
	ControlsComponent = OpacityControls,
	incompatibleBlocks = INCOMPATIBLE_BLOCKS,
	createHigherOrderComponentImpl = createHigherOrderComponent,
} = {} ) {
	return createHigherOrderComponentImpl( ( BlockEdit ) => {
		return function BlockEditWithOpacityControls( props ) {
			let controls = null;

			if ( props.isSelected ) {
				const nameGate = getBlockNameGate( props.name, {
					incompatibleBlocks,
				} );

				if ( nameGate.allowed ) {
					const blockType = getBlockTypeImpl( props.name );
					const eligibility = getColorEligibility( blockType, {
						incompatibleBlocks,
					} );

					if ( eligibility.eligible ) {
						controls = (
							<ControlsComponent
								attributes={ props.attributes }
								clientId={ props.clientId }
								eligibility={ eligibility }
								setAttributes={ props.setAttributes }
							/>
						);
					}
				}
			}

			return (
				<>
					<BlockEdit { ...props } />
					{ controls }
				</>
			);
		};
	}, 'withAclBlockOpacityControls' );
}

export const withOpacityControls = createBlockEditFilter();

addFilter( 'editor.BlockEdit', FILTER_NAMESPACE, withOpacityControls );
