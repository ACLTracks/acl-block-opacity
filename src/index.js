/**
 * Editor bundle entry point for the tested foundation.
 *
 * No block-editor filters or controls are registered in this phase.
 */

export { formatColor, parseColor } from './utils/color';
export { getColorEligibility } from './utils/eligibility';
export { createOpacityUpdate } from './utils/persistence';
export { ORIGIN_PRECEDENCE, resolvePaletteColor } from './utils/resolve-color';
