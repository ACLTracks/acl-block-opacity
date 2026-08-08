const fs = require( 'fs/promises' );
const path = require( 'path' );

const { RequestUtils } = require( '@wordpress/e2e-test-utils-playwright' );

module.exports = async function globalSetup( config ) {
	const username = process.env.WP_USERNAME;
	const password = process.env.WP_PASSWORD;
	const baseURL = config.projects[ 0 ].use.baseURL;
	const storageStatePath = process.env.STORAGE_STATE_PATH;

	if ( ! username || ! password ) {
		throw new Error(
			'WP_USERNAME and WP_PASSWORD are required for the real WordPress E2E suite.'
		);
	}

	await fs.mkdir( path.dirname( storageStatePath ), { recursive: true } );
	await fs.rm( storageStatePath, { force: true } );

	await RequestUtils.setup( {
		baseURL,
		storageStatePath,
		user: { username, password },
	} );
};
