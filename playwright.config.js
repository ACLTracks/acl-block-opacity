const path = require( 'path' );

const { defineConfig } = require( '@playwright/test' );

const authPath = path.join( __dirname, 'tests/e2e/.auth/admin.json' );

process.env.STORAGE_STATE_PATH = authPath;

const launchOptions = {};

if ( process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ) {
	launchOptions.executablePath =
		process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
}

module.exports = defineConfig( {
	fullyParallel: false,
	globalSetup: require.resolve( './tests/e2e/global-setup' ),
	outputDir: 'tests/e2e/evidence/test-results',
	projects: [
		{
			name: 'chromium',
			use: { browserName: 'chromium' },
		},
	],
	reporter: [
		[ 'line' ],
		[ 'json', { outputFile: 'tests/e2e/evidence/results.json' } ],
	],
	retries: 0,
	testDir: 'tests/e2e',
	testMatch: '**/*.spec.js',
	timeout: 90_000,
	use: {
		baseURL: process.env.WP_BASE_URL || 'http://localhost:10010',
		launchOptions,
		screenshot: 'only-on-failure',
		storageState: authPath,
		trace: 'retain-on-failure',
		video: 'off',
	},
	workers: 1,
} );
