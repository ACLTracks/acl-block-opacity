const fs = require( 'fs/promises' );
const path = require( 'path' );

const { chromium } = require( '@playwright/test' );
const { RequestUtils } = require( '@wordpress/e2e-test-utils-playwright' );

const baseURL = process.env.WP_BASE_URL || 'http://localhost:10010';
const suppliedSourcePostId = process.env.WP_MANUAL_POST_ID
	? Number( process.env.WP_MANUAL_POST_ID )
	: null;
const repositoryRoot = path.resolve( __dirname, '../..' );
const authPath = path.join( __dirname, '.auth/admin.json' );
const evidenceDirectory = path.join( __dirname, 'evidence' );
const screenshotPath = path.join( evidenceDirectory, 'manual-200-percent.png' );
const evidencePath = path.join(
	evidenceDirectory,
	'manual-browser-checks.json'
);
const executablePath =
	process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;

function hasStandardOpacityAttributes( block ) {
	return (
		block.name === 'core/paragraph' &&
		block.attributes?.style?.color?.text === 'rgba(17, 34, 51, 0.75)' &&
		block.attributes?.style?.color?.background ===
			'rgba(221, 238, 255, 0.4)'
	);
}

async function selectSourceBlock( page ) {
	const canvas = page.frameLocator( 'iframe[name="editor-canvas"]' );
	const block = canvas.getByText( 'Phase 4 opacity smoke', { exact: true } );

	await block.waitFor( { state: 'visible' } );
	await block.click();

	return block;
}

async function copySelectedBlock( page ) {
	const options = page.getByRole( 'button', {
		name: 'Options',
		exact: true,
	} );
	let blockOptions;

	for ( let index = 0; index < ( await options.count() ); index++ ) {
		const candidate = options.nth( index );
		const box = await candidate.boundingBox();

		if ( box && box.x < 900 && box.y > 80 ) {
			blockOptions = candidate;
			break;
		}
	}

	if ( ! blockOptions ) {
		throw new Error( 'The selected block Options menu was not found.' );
	}

	await blockOptions.click();
	await page
		.locator( '[role="menuitem"]' )
		.filter( { hasText: /^Copy\s*Ctrl\+C/ } )
		.click();

	return page.evaluate( () => navigator.clipboard.readText() );
}

async function readBlocks( page ) {
	return page.evaluate( () =>
		window.wp.data
			.select( 'core/block-editor' )
			.getBlocks()
			.map( ( block ) => ( {
				attributes: block.attributes,
				name: block.name,
			} ) )
	);
}

async function main() {
	await fs.mkdir( evidenceDirectory, { recursive: true } );
	if (
		suppliedSourcePostId !== null &&
		! Number.isInteger( suppliedSourcePostId )
	) {
		throw new Error(
			'WP_MANUAL_POST_ID must be an integer when provided.'
		);
	}

	const requestUtils = await RequestUtils.setup( {
		baseURL,
		storageStatePath: authPath,
	} );
	const generatedSource = suppliedSourcePostId
		? null
		: await requestUtils.createPost( {
				content:
					'<!-- wp:paragraph {"style":{"color":{"text":"rgba(17, 34, 51, 0.75)","background":"rgba(221, 238, 255, 0.4)"}}} --><p class="has-text-color has-background" style="color:rgba(17, 34, 51, 0.75);background-color:rgba(221, 238, 255, 0.4)">Phase 4 opacity smoke</p><!-- /wp:paragraph -->',
				status: 'publish',
				title: '[ACL Opacity E2E] Manual browser source',
		  } );
	const sourcePostId = suppliedSourcePostId || generatedSource.id;
	const destination = await requestUtils.createPost( {
		content:
			'<!-- wp:paragraph --><p>Cross-post destination</p><!-- /wp:paragraph -->',
		status: 'draft',
		title: '[ACL Opacity E2E] Manual clipboard destination',
	} );
	const browser = await chromium.launch( {
		executablePath,
		headless: true,
	} );
	const context = await browser.newContext( {
		permissions: [ 'clipboard-read', 'clipboard-write' ],
		storageState: authPath,
		viewport: { height: 720, width: 1280 },
	} );
	const page = await context.newPage();
	const consoleMessages = [];

	page.on( 'console', ( message ) => {
		if ( [ 'error', 'warning' ].includes( message.type() ) ) {
			consoleMessages.push( {
				text: message.text(),
				type: message.type(),
			} );
		}
	} );

	try {
		await page.goto(
			`${ baseURL }/wp-admin/post.php?post=${ sourcePostId }&action=edit`,
			{ waitUntil: 'domcontentloaded' }
		);
		const sourceBlock = await selectSourceBlock( page );
		const clipboard = await copySelectedBlock( page );

		await page.keyboard.press( 'Escape' );
		await sourceBlock.click();
		await page.keyboard.press( 'End' );
		await page.keyboard.press( 'Enter' );
		await page.keyboard.press( 'Control+V' );
		await page
			.frameLocator( 'iframe[name="editor-canvas"]' )
			.getByText( 'Phase 4 opacity smoke', { exact: true } )
			.nth( 1 )
			.waitFor( { state: 'visible' } );
		const samePostBlocks = await readBlocks( page );

		const zoomContext = await browser.newContext( {
			deviceScaleFactor: 2,
			storageState: authPath,
			viewport: { height: 360, width: 640 },
		} );
		const zoomPage = await zoomContext.newPage();

		await zoomPage.goto(
			`${ baseURL }/wp-admin/post.php?post=${ sourcePostId }&action=edit`,
			{ waitUntil: 'domcontentloaded' }
		);
		await selectSourceBlock( zoomPage );
		const settingsButton = zoomPage.getByRole( 'button', {
			name: 'Settings',
			exact: true,
		} );

		if (
			( await settingsButton.getAttribute( 'aria-expanded' ) ) !== 'true'
		) {
			await settingsButton.click();
		}

		await zoomPage
			.getByRole( 'tab', { name: 'Block', exact: true } )
			.click();
		const sliders = zoomPage.getByRole( 'slider', { name: /opacity/i } );
		const slidersAtZoom = await sliders.count();
		const initialSliderValue = await sliders.first().inputValue();

		await sliders.first().focus();
		await zoomPage.keyboard.press( 'ArrowLeft' );
		const keyboardAdjustedValue = await sliders.first().inputValue();
		await zoomPage.keyboard.press( 'ArrowRight' );

		await zoomPage.screenshot( {
			fullPage: false,
			path: screenshotPath,
		} );
		const zoomEvidence = await zoomPage.evaluate( () => {
			const settings = document.querySelector(
				'.interface-interface-skeleton__sidebar'
			);

			return {
				documentClientWidth: document.documentElement.clientWidth,
				documentScrollWidth: document.documentElement.scrollWidth,
				settingsClientWidth: settings?.clientWidth ?? null,
				settingsScrollWidth: settings?.scrollWidth ?? null,
			};
		} );
		const sliderBoxesAtZoom = await sliders.evaluateAll( ( elements ) =>
			elements.map( ( element ) => {
				const box = element.getBoundingClientRect();

				return {
					bottom: box.bottom,
					left: box.left,
					right: box.right,
					top: box.top,
				};
			} )
		);
		await zoomContext.close();

		const destinationPage = await context.newPage();
		await destinationPage.goto(
			`${ baseURL }/wp-admin/post.php?post=${ destination.id }&action=edit`,
			{ waitUntil: 'domcontentloaded' }
		);
		const destinationCanvas = destinationPage.frameLocator(
			'iframe[name="editor-canvas"]'
		);
		const destinationBlock = destinationCanvas.getByText(
			'Cross-post destination',
			{ exact: true }
		);
		await destinationBlock.waitFor( { state: 'visible' } );
		await destinationBlock.click();
		await destinationPage.keyboard.press( 'End' );
		await destinationPage.keyboard.press( 'Enter' );
		await destinationPage.keyboard.press( 'Control+V' );
		await destinationCanvas
			.getByText( 'Phase 4 opacity smoke', { exact: true } )
			.waitFor( { state: 'visible' } );
		const crossPostBlocks = await readBlocks( destinationPage );
		await destinationPage.close();

		const evidence = {
			baseURL,
			browserVersion: browser.version(),
			clipboardContainsBlockMarkup:
				clipboard.includes( '<!-- wp:paragraph' ),
			clipboardContainsStandardBackgroundColor: clipboard.includes(
				'"background":"rgba(221, 238, 255, 0.4)"'
			),
			clipboardContainsStandardTextColor: clipboard.includes(
				'"text":"rgba(17, 34, 51, 0.75)"'
			),
			consoleMessages,
			crossPostPasteFoundStandardAttributes: crossPostBlocks.some(
				hasStandardOpacityAttributes
			),
			generatedAt: new Date().toISOString(),
			keyboardAdjustment: {
				afterArrowLeft: keyboardAdjustedValue,
				before: initialSliderValue,
			},
			repositoryRoot,
			samePostPasteFoundStandardAttributes:
				samePostBlocks.filter( hasStandardOpacityAttributes ).length >=
				2,
			screenshot: path.relative( repositoryRoot, screenshotPath ),
			sliderBoxesAtZoom,
			slidersAtZoom,
			zoom: {
				...zoomEvidence,
				cssViewport: { height: 360, width: 640 },
				deviceScaleFactor: 2,
				method: '1280x720 physical-pixel viewport represented at 200% page scaling',
			},
		};

		await fs.writeFile(
			evidencePath,
			`${ JSON.stringify( evidence, null, 2 ) }\n`,
			'utf8'
		);
		process.stdout.write( `${ JSON.stringify( evidence, null, 2 ) }\n` );
	} finally {
		await browser.close();
		await requestUtils.rest( {
			method: 'DELETE',
			path: `/wp/v2/posts/${ destination.id }?force=true`,
		} );
		if ( generatedSource ) {
			await requestUtils.rest( {
				method: 'DELETE',
				path: `/wp/v2/posts/${ generatedSource.id }?force=true`,
			} );
		}
	}
}

main().catch( ( error ) => {
	process.stderr.write( `${ error.stack || error.message }\n` );
	process.exitCode = 1;
} );
