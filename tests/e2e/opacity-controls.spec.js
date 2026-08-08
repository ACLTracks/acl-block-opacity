const fs = require( 'fs' );
const path = require( 'path' );

const { test, expect } = require( '@wordpress/e2e-test-utils-playwright' );

const {
	createFixturePost,
	deleteFixturePost,
	dismissEditorWelcome,
	getBlockRecords,
	getSelectedAttributes,
	retryWordPressRequest,
	savePost,
	selectBlock,
	setOpacity,
	waitForEditor,
} = require( './helpers/wordpress' );

const PRODUCT_PLUGIN = 'acl-opacity-controls-for-blocks';
const FIXTURE_PLUGIN = 'acl-opacity-e2e-standard-color-block';

const customParagraph = `<!-- wp:paragraph {"style":{"color":{"text":"rgba(17, 34, 51, 0.75)","background":"rgba(221, 238, 255, 0.4)"}}} -->
<p class="has-text-color has-background" style="color:rgba(17, 34, 51, 0.75);background-color:rgba(221, 238, 255, 0.4)">Custom opacity fixture</p>
<!-- /wp:paragraph -->`;

const presetParagraph = `<!-- wp:paragraph {"textColor":"contrast","backgroundColor":"accent-1"} -->
<p class="has-contrast-color has-accent-1-background-color has-text-color has-background">Preset opacity fixture</p>
<!-- /wp:paragraph -->`;

async function openPost( admin, page, postId ) {
	await admin.editPost( postId );
	await dismissEditorWelcome( page );
	await waitForEditor( page );
}

test.describe.serial( 'ACL Block Opacity in real WordPress', () => {
	const createdPatternIds = [];
	const createdPostIds = [];

	test.beforeAll( async ( { requestUtils } ) => {
		await requestUtils.activatePlugin( FIXTURE_PLUGIN );
		await requestUtils.activatePlugin( PRODUCT_PLUGIN );
	} );

	test.afterAll( async ( { requestUtils } ) => {
		for ( const postId of createdPostIds ) {
			await deleteFixturePost( requestUtils, postId );
		}
		for ( const patternId of createdPatternIds ) {
			await requestUtils.rest( {
				method: 'DELETE',
				path: `/wp/v2/blocks/${ patternId }?force=true`,
			} );
		}

		await requestUtils.activateTheme( 'acl-trace' );
		await requestUtils.activatePlugin( PRODUCT_PLUGIN );
	} );

	test( 'activates cleanly and enqueues no frontend script', async ( {
		admin,
		page,
		requestUtils,
	} ) => {
		await requestUtils.deactivatePlugin( PRODUCT_PLUGIN );
		await requestUtils.activatePlugin( PRODUCT_PLUGIN );
		await admin.visitAdminPage( 'plugins.php' );

		const row = page.getByRole( 'row', {
			name: /ACL Opacity Controls for Blocks.*Deactivate ACL Opacity Controls for Blocks/,
		} );

		await expect( row ).toContainText( 'ACL Opacity Controls for Blocks' );
		await expect( row ).toContainText( 'Deactivate' );
		await expect(
			page.locator(
				'#wpbody-content > .notice-error:visible, #wpbody-content > .error:visible, #wpbody-content > .update-nag:visible'
			)
		).toHaveCount( 0 );

		await requestUtils.activateTheme( 'twentytwentyfive' );
		await page.goto( '/' );
		await expect(
			page.locator(
				'script[src*="acl-block-opacity"], script[src*="/build/index.js"]'
			)
		).toHaveCount( 0 );
		await expect(
			page.locator( '[class*="acl-block-opacity"]' )
		).toHaveCount( 0 );
		await expect(
			page.locator( 'link[href*="assets/css/compatibility.css"]' )
		).toHaveCount( 0 );
	} );

	test( 'renders controls, previews custom colors, saves, reloads, and matches the frontend', async ( {
		admin,
		editor,
		page,
		requestUtils,
	} ) => {
		await requestUtils.activateTheme( 'twentytwentyfive' );
		const post = await createFixturePost(
			requestUtils,
			'custom parity',
			customParagraph
		);
		createdPostIds.push( post.id );

		await openPost( admin, page, post.id );
		await selectBlock( page, {
			content: 'Custom opacity fixture',
			name: 'core/paragraph',
		} );
		expect( await getSelectedAttributes( page ) ).toMatchObject( {
			style: {
				color: {
					background: 'rgba(221, 238, 255, 0.4)',
					text: 'rgba(17, 34, 51, 0.75)',
				},
			},
		} );

		await expect(
			page.getByRole( 'slider', { name: 'Text opacity' } )
		).toHaveValue( '75' );
		await expect(
			page.getByRole( 'slider', { name: 'Background opacity' } )
		).toHaveValue( '40' );

		await setOpacity( page, 'Text opacity', 55 );
		await setOpacity( page, 'Background opacity', 20 );

		const attributes = await getSelectedAttributes( page );
		expect( attributes.style.color ).toEqual( {
			background: 'rgba(221, 238, 255, 0.2)',
			text: 'rgba(17, 34, 51, 0.55)',
		} );
		expect( attributes.textColor ).toBeUndefined();
		expect( attributes.backgroundColor ).toBeUndefined();

		const editorColors = await editor.canvas
			.getByText( 'Custom opacity fixture', { exact: true } )
			.evaluate( ( element ) => {
				const style = window.getComputedStyle( element );

				return {
					backgroundColor: style.backgroundColor,
					color: style.color,
				};
			} );

		expect( editorColors ).toEqual( {
			backgroundColor: 'rgba(221, 238, 255, 0.2)',
			color: 'rgba(17, 34, 51, 0.55)',
		} );

		await savePost( page );
		await page.reload( { waitUntil: 'domcontentloaded' } );
		await dismissEditorWelcome( page );
		await waitForEditor( page );
		await selectBlock( page, {
			content: 'Custom opacity fixture',
			name: 'core/paragraph',
		} );
		await expect(
			page.getByRole( 'slider', { name: 'Text opacity' } )
		).toHaveValue( '55' );
		await expect(
			page.getByRole( 'slider', { name: 'Background opacity' } )
		).toHaveValue( '20' );

		const saved = await requestUtils.rest( {
			path: `/wp/v2/posts/${ post.id }?context=edit`,
		} );
		expect( saved.content.raw ).toContain(
			'"text":"rgba(17, 34, 51, 0.55)"'
		);
		expect( saved.content.raw ).toContain(
			'"background":"rgba(221, 238, 255, 0.2)"'
		);
		expect( saved.content.raw ).not.toContain( 'acl-block-opacity' );

		await page.goto( saved.link );
		const frontend = page.getByText( 'Custom opacity fixture', {
			exact: true,
		} );
		await expect( frontend ).toBeVisible();
		await expect( frontend ).toHaveCSS( 'color', 'rgba(17, 34, 51, 0.55)' );
		await expect( frontend ).toHaveCSS(
			'background-color',
			'rgba(221, 238, 255, 0.2)'
		);
	} );

	test( 'converts presets atomically and follows real undo and redo history', async ( {
		admin,
		page,
		requestUtils,
	} ) => {
		await requestUtils.activateTheme( 'twentytwentyfive' );
		const post = await createFixturePost(
			requestUtils,
			'preset history',
			presetParagraph
		);
		createdPostIds.push( post.id );

		await openPost( admin, page, post.id );
		await selectBlock( page, {
			content: 'Preset opacity fixture',
			name: 'core/paragraph',
		} );
		await expect(
			page.getByRole( 'slider', { name: 'Text opacity' } )
		).toHaveValue( '100' );

		await setOpacity( page, 'Text opacity', 35 );
		let attributes = await getSelectedAttributes( page );
		expect( attributes.textColor ).toBeUndefined();
		expect( attributes.style.color.text ).toBe( 'rgba(17, 17, 17, 0.35)' );

		await page.keyboard.press( 'Control+z' );
		await expect
			.poll(
				async () => ( await getSelectedAttributes( page ) ).textColor
			)
			.toBe( 'contrast' );
		attributes = await getSelectedAttributes( page );
		expect( attributes.style?.color?.text ).toBeUndefined();

		await page.keyboard.press( 'Control+Shift+z' );
		await expect
			.poll(
				async () =>
					( await getSelectedAttributes( page ) ).style?.color?.text
			)
			.toBe( 'rgba(17, 17, 17, 0.35)' );

		await setOpacity( page, 'Background opacity', 45 );
		attributes = await getSelectedAttributes( page );
		expect( attributes.backgroundColor ).toBeUndefined();
		expect( attributes.style.color.background ).toBe(
			'rgba(255, 238, 88, 0.45)'
		);

		await page.evaluate( () => {
			const editor = window.wp.data.select( 'core/block-editor' );
			const clientId = editor.getSelectedBlockClientId();
			const current = editor.getBlockAttributes( clientId );

			window.wp.data
				.dispatch( 'core/block-editor' )
				.updateBlockAttributes( clientId, {
					style: {
						...current.style,
						color: {
							...current.style.color,
							text: 'rgba(1, 2, 3, 0.2)',
						},
					},
					textColor: 'base',
				} );
		} );
		await expect(
			page.getByRole( 'slider', { name: 'Text opacity' } )
		).toHaveValue( '100' );
		await setOpacity( page, 'Text opacity', 80 );
		attributes = await getSelectedAttributes( page );
		expect( attributes.textColor ).toBeUndefined();
		expect( attributes.style.color.text ).toBe(
			'rgba(255, 255, 255, 0.8)'
		);

		await page.evaluate( () => {
			const editor = window.wp.data.select( 'core/block-editor' );
			const clientId = editor.getSelectedBlockClientId();
			const current = editor.getBlockAttributes( clientId );

			window.wp.data
				.dispatch( 'core/block-editor' )
				.updateBlockAttributes( clientId, {
					style: {
						...current.style,
						color: {
							...current.style.color,
							text: undefined,
						},
					},
					textColor: undefined,
				} );
		} );
		await expect(
			page.getByRole( 'slider', { name: 'Text opacity' } )
		).toHaveCount( 0 );
		await expect(
			page
				.getByLabel( 'Editor settings' )
				.getByText( 'Choose a text color to adjust its opacity.' )
		).toBeVisible();
	} );

	test( 'excludes Cover and blocks background opacity without changing gradients', async ( {
		admin,
		page,
		requestUtils,
	} ) => {
		const post = await createFixturePost(
			requestUtils,
			'cover gradient unsupported',
			customParagraph
		);
		createdPostIds.push( post.id );

		await openPost( admin, page, post.id );
		await page.evaluate( () => {
			const { createBlock } = window.wp.blocks;
			const blocks = [
				createBlock(
					'core/cover',
					{ dimRatio: 50, overlayColor: 'contrast' },
					[
						createBlock( 'core/paragraph', {
							content: 'Cover child fixture',
						} ),
					]
				),
				createBlock( 'core/paragraph', {
					content: 'Gradient fixture',
					style: {
						color: {
							background: '#ffffff',
							gradient:
								'linear-gradient(135deg, rgb(0, 0, 0) 0%, rgb(255, 255, 255) 100%)',
							text: '#123456',
						},
					},
				} ),
				createBlock( 'core/paragraph', {
					content: 'Unsupported fixture',
					style: { color: { text: 'hsl(120 50% 50%)' } },
				} ),
				createBlock( 'core/paragraph', {
					content: 'Unsupported variable fixture',
					style: {
						color: { text: 'var(--wp--preset--color--contrast)' },
					},
				} ),
			];

			window.wp.data
				.dispatch( 'core/block-editor' )
				.resetBlocks( blocks );
		} );

		await selectBlock( page, { name: 'core/cover' } );
		await expect(
			page.getByRole( 'slider', { name: 'Text opacity' } )
		).toHaveCount( 0 );
		await expect(
			page.getByRole( 'slider', { name: 'Background opacity' } )
		).toHaveCount( 0 );
		expect( ( await getSelectedAttributes( page ) ).dimRatio ).toBe( 50 );

		await selectBlock( page, {
			content: 'Gradient fixture',
			name: 'core/paragraph',
		} );
		await expect(
			page
				.getByLabel( 'Editor settings' )
				.getByText(
					'Remove the background gradient to adjust background opacity.'
				)
		).toBeVisible();
		await expect(
			page.getByRole( 'slider', { name: 'Text opacity' } )
		).toHaveValue( '100' );
		await expect(
			page.getByRole( 'slider', { name: 'Background opacity' } )
		).toHaveCount( 0 );
		const gradientBefore = ( await getSelectedAttributes( page ) ).style
			.color.gradient;
		await setOpacity( page, 'Text opacity', 60 );
		expect(
			( await getSelectedAttributes( page ) ).style.color.gradient
		).toBe( gradientBefore );
		await page.evaluate( () => {
			const editor = window.wp.data.select( 'core/block-editor' );
			const clientId = editor.getSelectedBlockClientId();
			const current = editor.getBlockAttributes( clientId );

			window.wp.data
				.dispatch( 'core/block-editor' )
				.updateBlockAttributes( clientId, {
					backgroundColor: undefined,
					gradient: undefined,
					style: {
						...current.style,
						color: {
							...current.style.color,
							background: undefined,
							gradient: undefined,
						},
					},
				} );
		} );
		await page.waitForTimeout( 100 );
		await page.evaluate( () => {
			const editor = window.wp.data.select( 'core/block-editor' );
			const clientId = editor.getSelectedBlockClientId();
			const current = editor.getBlockAttributes( clientId );

			window.wp.data
				.dispatch( 'core/block-editor' )
				.updateBlockAttributes( clientId, {
					style: {
						...current.style,
						color: {
							...current.style?.color,
							background: '#ffffff',
						},
					},
				} );
		} );
		await expect(
			page.getByRole( 'slider', { name: 'Background opacity' } )
		).toHaveValue( '100' );

		await selectBlock( page, {
			content: 'Unsupported fixture',
			name: 'core/paragraph',
		} );
		const unsupportedBefore = await getSelectedAttributes( page );
		await expect(
			page
				.getByLabel( 'Editor settings' )
				.getByText(
					'This text color format cannot be adjusted safely.'
				)
		).toBeVisible();
		await page.waitForTimeout( 500 );
		expect( await getSelectedAttributes( page ) ).toEqual(
			unsupportedBefore
		);

		await selectBlock( page, {
			content: 'Unsupported variable fixture',
			name: 'core/paragraph',
		} );
		const variableBefore = await getSelectedAttributes( page );
		await expect(
			page
				.getByLabel( 'Editor settings' )
				.getByText(
					'This text color format cannot be adjusted safely.'
				)
		).toBeVisible();
		await page.waitForTimeout( 500 );
		expect( await getSelectedAttributes( page ) ).toEqual( variableBefore );
	} );

	test( 'supports a third-party standard-color block and keeps nested siblings independent', async ( {
		admin,
		editor,
		page,
		requestUtils,
	} ) => {
		const post = await createFixturePost(
			requestUtils,
			'third party and nested',
			customParagraph
		);
		createdPostIds.push( post.id );

		await openPost( admin, page, post.id );
		await page.evaluate( () => {
			const { createBlock } = window.wp.blocks;
			const blocks = [
				createBlock(
					'core/group',
					{
						style: {
							color: {
								background: 'rgba(10, 20, 30, 0.5)',
								text: 'rgba(40, 50, 60, 0.6)',
							},
						},
					},
					[
						createBlock( 'core/paragraph', {
							content: 'Explicit group child',
							style: {
								color: { text: 'rgba(70, 80, 90, 0.7)' },
							},
						} ),
					]
				),
				createBlock( 'core/buttons', {}, [
					createBlock( 'core/button', {
						backgroundColor: 'accent-1',
						text: 'First button',
						textColor: 'contrast',
					} ),
					createBlock( 'core/button', {
						backgroundColor: 'accent-2',
						text: 'Second button',
						textColor: 'contrast',
					} ),
				] ),
				createBlock( 'acl-opacity-e2e/standard-color', {
					content: 'Third-party fixture',
					style: {
						color: {
							background: 'rgba(100, 110, 120, 0.3)',
							text: 'rgba(130, 140, 150, 0.8)',
						},
					},
				} ),
			];

			window.wp.data
				.dispatch( 'core/block-editor' )
				.resetBlocks( blocks );
		} );

		await selectBlock( page, {
			name: 'acl-opacity-e2e/standard-color',
		} );
		await expect(
			page.getByRole( 'slider', { name: 'Text opacity' } )
		).toHaveValue( '80' );
		await expect(
			page.getByRole( 'slider', { name: 'Background opacity' } )
		).toHaveValue( '30' );

		await selectBlock( page, {
			content: 'First button',
			name: 'core/button',
		} );
		await setOpacity( page, 'Text opacity', 25 );
		await setOpacity( page, 'Background opacity', 35 );

		const buttons = ( await getBlockRecords( page ) ).filter(
			( block ) => block.name === 'core/button'
		);
		expect( buttons ).toHaveLength( 2 );
		expect( buttons[ 0 ].attributes.style.color ).toEqual( {
			background: 'rgba(255, 238, 88, 0.35)',
			text: 'rgba(17, 17, 17, 0.25)',
		} );
		expect( buttons[ 1 ].attributes.backgroundColor ).toBe( 'accent-2' );
		expect( buttons[ 1 ].attributes.textColor ).toBe( 'contrast' );

		await selectBlock( page, {
			content: 'Explicit group child',
			name: 'core/paragraph',
		} );
		await setOpacity( page, 'Text opacity', 45 );
		const records = await getBlockRecords( page );
		const group = records.find( ( block ) => block.name === 'core/group' );
		expect( group.attributes.style.color ).toEqual( {
			background: 'rgba(10, 20, 30, 0.5)',
			text: 'rgba(40, 50, 60, 0.6)',
		} );

		await selectBlock( page, {
			name: 'acl-opacity-e2e/standard-color',
		} );
		await editor.clickBlockOptionsMenuItem( 'Duplicate' );
		await expect
			.poll(
				async () =>
					( await getBlockRecords( page ) ).filter(
						( block ) =>
							block.name === 'acl-opacity-e2e/standard-color'
					).length
			)
			.toBe( 2 );

		await savePost( page );
		await page.reload( { waitUntil: 'domcontentloaded' } );
		await dismissEditorWelcome( page );
		await waitForEditor( page );
		const reloaded = await getBlockRecords( page );
		expect(
			reloaded.filter(
				( block ) => block.name === 'acl-opacity-e2e/standard-color'
			)
		).toHaveLength( 2 );
		expect(
			reloaded.filter( ( block ) => block.name === 'core/button' )
		).toHaveLength( 2 );
	} );

	test( 'validates Heading, List, Quote, keyboard operation, and zero opacity', async ( {
		admin,
		page,
		requestUtils,
	}, testInfo ) => {
		await requestUtils.activateTheme( 'twentytwentyfive' );
		const post = await createFixturePost(
			requestUtils,
			'core block matrix and zero',
			customParagraph
		);
		createdPostIds.push( post.id );

		await openPost( admin, page, post.id );
		await page.evaluate( () => {
			const { createBlock } = window.wp.blocks;
			const blocks = [
				createBlock( 'core/heading', {
					content: 'Heading opacity fixture',
					textColor: 'contrast',
				} ),
				createBlock(
					'core/list',
					{
						backgroundColor: 'accent-1',
						textColor: 'contrast',
					},
					[
						createBlock( 'core/list-item', {
							content: 'List opacity fixture',
						} ),
					]
				),
				createBlock(
					'core/quote',
					{
						backgroundColor: 'accent-2',
						textColor: 'contrast',
					},
					[
						createBlock( 'core/paragraph', {
							content: 'Quote opacity fixture',
						} ),
					]
				),
				createBlock( 'core/paragraph', {
					content: 'Zero opacity fixture',
					style: {
						color: {
							background: '#ff0000',
							text: '#336699',
						},
					},
				} ),
			];

			window.wp.data
				.dispatch( 'core/block-editor' )
				.resetBlocks( blocks );
		} );

		await selectBlock( page, {
			content: 'Heading opacity fixture',
			name: 'core/heading',
		} );
		await setOpacity( page, 'Text opacity', 65 );
		expect( ( await getSelectedAttributes( page ) ).style.color.text ).toBe(
			'rgba(17, 17, 17, 0.65)'
		);

		await selectBlock( page, { name: 'core/list' } );
		await page.evaluate( () => {
			const editor = window.wp.data.select( 'core/block-editor' );
			window.wp.data
				.dispatch( 'core/block-editor' )
				.updateBlockAttributes( editor.getSelectedBlockClientId(), {
					backgroundColor: 'accent-1',
					textColor: 'contrast',
				} );
		} );
		await selectBlock( page, { name: 'core/list' } );
		const listEvidence = await page.evaluate( () => {
			const editor = window.wp.data.select( 'core/block-editor' );
			const clientId = editor.getSelectedBlockClientId();
			const block = editor.getBlock( clientId );
			const type = window.wp.blocks.getBlockType( block.name );

			return {
				attributes: block.attributes,
				name: block.name,
				supports: type.supports.color,
			};
		} );
		await testInfo.attach( 'list-support.json', {
			body: JSON.stringify( listEvidence, null, 2 ),
			contentType: 'application/json',
		} );
		expect( listEvidence.name ).toBe( 'core/list' );
		expect( listEvidence.attributes.textColor ).toBe( 'contrast' );
		expect( listEvidence.attributes.backgroundColor ).toBe( 'accent-1' );
		await expect(
			page.getByRole( 'slider', { name: 'Text opacity' } )
		).toHaveValue( '100' );
		await expect(
			page.getByRole( 'slider', { name: 'Background opacity' } )
		).toHaveValue( '100' );
		await setOpacity( page, 'Text opacity', 75 );
		await setOpacity( page, 'Background opacity', 25 );

		await selectBlock( page, { name: 'core/quote' } );
		await page.evaluate( () => {
			const editor = window.wp.data.select( 'core/block-editor' );
			window.wp.data
				.dispatch( 'core/block-editor' )
				.updateBlockAttributes( editor.getSelectedBlockClientId(), {
					backgroundColor: 'accent-2',
					textColor: 'contrast',
				} );
		} );
		await selectBlock( page, { name: 'core/quote' } );
		await expect(
			page.getByRole( 'slider', { name: 'Text opacity' } )
		).toHaveValue( '100' );
		await expect(
			page.getByRole( 'slider', { name: 'Background opacity' } )
		).toHaveValue( '100' );
		await setOpacity( page, 'Text opacity', 65 );
		await setOpacity( page, 'Background opacity', 35 );

		await selectBlock( page, {
			content: 'Zero opacity fixture',
			name: 'core/paragraph',
		} );
		await setOpacity( page, 'Text opacity', 0 );
		await expect(
			page
				.getByLabel( 'Editor settings' )
				.getByText( 'At 0%, the text will be invisible.' )
		).toBeVisible();
		await setOpacity( page, 'Background opacity', 0 );
		await expect(
			page
				.getByLabel( 'Editor settings' )
				.getByText( 'At 0%, the background color will be transparent.' )
		).toBeVisible();

		const textSlider = page.getByRole( 'slider', {
			name: 'Text opacity',
		} );
		await textSlider.press( 'ArrowRight' );
		await expect( textSlider ).toHaveValue( '1' );
		await textSlider.press( 'ArrowLeft' );
		await expect( textSlider ).toHaveValue( '0' );
		const zeroAttributes = await getSelectedAttributes( page );
		expect( zeroAttributes.style.color ).toEqual( {
			background: 'rgba(255, 0, 0, 0)',
			text: 'rgba(51, 102, 153, 0)',
		} );

		await savePost( page );
		const saved = await requestUtils.rest( {
			path: `/wp/v2/posts/${ post.id }?context=edit`,
		} );
		await page.goto( saved.link );
		const zero = page.getByText( 'Zero opacity fixture', { exact: true } );
		await expect( zero ).toBeVisible();
		await expect( zero ).toHaveCSS( 'color', 'rgba(51, 102, 153, 0)' );
		await expect( zero ).toHaveCSS(
			'background-color',
			'rgba(255, 0, 0, 0)'
		);
		expect( await zero.textContent() ).toBe( 'Zero opacity fixture' );
	} );

	test( 'preserves unsynced and synced pattern opacity', async ( {
		admin,
		page,
		requestUtils,
	} ) => {
		await requestUtils.activateTheme( 'twentytwentyfive' );
		const patternMarkup = fs.readFileSync(
			path.join( __dirname, '../fixtures/patterns/opacity-pattern.html' ),
			'utf8'
		);
		const unsyncedPost = await createFixturePost(
			requestUtils,
			'unsynced pattern',
			patternMarkup
		);
		createdPostIds.push( unsyncedPost.id );

		await openPost( admin, page, unsyncedPost.id );
		await selectBlock( page, {
			content: 'Opacity pattern fixture',
			name: 'core/paragraph',
		} );
		await expect(
			page.getByRole( 'slider', { name: 'Text opacity' } )
		).toHaveValue( '75' );
		await savePost( page );
		await page.reload( { waitUntil: 'domcontentloaded' } );
		await dismissEditorWelcome( page );
		await waitForEditor( page );
		await selectBlock( page, {
			content: 'Opacity pattern fixture',
			name: 'core/paragraph',
		} );
		await expect(
			page.getByRole( 'slider', { name: 'Text opacity' } )
		).toHaveValue( '75' );
		await page.goto( unsyncedPost.link );
		await expect(
			page.getByText( 'Opacity pattern fixture', { exact: true } )
		).toHaveCSS( 'color', 'rgba(171, 205, 239, 0.75)' );

		const syncedPattern = await retryWordPressRequest( () =>
			requestUtils.createBlock( {
				content: patternMarkup,
				date_gmt: new Date().toISOString().replace( /\.\d{3}Z$/, '' ),
				status: 'publish',
				title: `ACL Opacity Synced Pattern ${ Date.now() }`,
			} )
		);
		createdPatternIds.push( syncedPattern.id );
		const syncedPost = await createFixturePost(
			requestUtils,
			'synced pattern',
			`<!-- wp:block {"ref":${ syncedPattern.id }} /-->`
		);
		createdPostIds.push( syncedPost.id );
		const saved = await requestUtils.rest( {
			path: `/wp/v2/posts/${ syncedPost.id }?context=edit`,
		} );
		expect( saved.content.raw ).toBe(
			`<!-- wp:block {"ref":${ syncedPattern.id }} /-->`
		);
		await page.goto( syncedPost.link );
		await expect(
			page.getByText( 'Opacity pattern fixture', { exact: true } )
		).toHaveCSS( 'color', 'rgba(171, 205, 239, 0.75)' );
	} );

	test( 'uses user, block-context, theme, and default palette precedence', async ( {
		admin,
		page,
		requestUtils,
	} ) => {
		await requestUtils.activateTheme( 'palette-text-collision' );
		const globalStylesId =
			await requestUtils.getCurrentThemeGlobalStylesPostId();
		expect( globalStylesId ).not.toBe( '' );
		const originalGlobalStyles = await requestUtils.rest( {
			path: `/wp/v2/global-styles/${ globalStylesId }?context=edit`,
		} );
		const post = await createFixturePost(
			requestUtils,
			'palette precedence',
			customParagraph
		);
		createdPostIds.push( post.id );

		try {
			await requestUtils.rest( {
				data: {
					id: globalStylesId,
					settings: {
						color: {
							palette: [
								{
									color: '#00aa88',
									name: 'User Override Fixture',
									slug: 'phase4-shared',
								},
							],
						},
					},
					styles: originalGlobalStyles.styles,
				},
				method: 'POST',
				path: `/wp/v2/global-styles/${ globalStylesId }`,
			} );

			await openPost( admin, page, post.id );
			await page.evaluate( () => {
				const { createBlock } = window.wp.blocks;
				window.wp.data.dispatch( 'core/block-editor' ).resetBlocks( [
					createBlock( 'core/paragraph', {
						content: 'User palette fixture',
						textColor: 'phase4-shared',
					} ),
					createBlock( 'acl-opacity-e2e/standard-color', {
						content: 'Block palette fixture',
						textColor: 'phase4-shared',
					} ),
				] );
			} );

			await selectBlock( page, {
				content: 'User palette fixture',
				name: 'core/paragraph',
			} );
			await setOpacity( page, 'Text opacity', 50 );
			expect(
				( await getSelectedAttributes( page ) ).style.color.text
			).toBe( 'rgba(0, 170, 136, 0.5)' );
			await savePost( page );

			await requestUtils.rest( {
				data: {
					id: globalStylesId,
					settings: originalGlobalStyles.settings,
					styles: originalGlobalStyles.styles,
				},
				method: 'POST',
				path: `/wp/v2/global-styles/${ globalStylesId }`,
			} );
			await page.reload( { waitUntil: 'domcontentloaded' } );
			await dismissEditorWelcome( page );
			await waitForEditor( page );
			await selectBlock( page, {
				name: 'acl-opacity-e2e/standard-color',
			} );
			await setOpacity( page, 'Text opacity', 50 );
			expect(
				( await getSelectedAttributes( page ) ).style.color.text
			).toBe( 'rgba(204, 85, 0, 0.5)' );

			await page.evaluate( () => {
				const { createBlock } = window.wp.blocks;
				window.wp.data.dispatch( 'core/block-editor' ).insertBlock(
					createBlock( 'core/paragraph', {
						content: 'Theme palette fixture',
						textColor: 'phase4-shared',
					} )
				);
			} );
			await selectBlock( page, {
				content: 'Theme palette fixture',
				name: 'core/paragraph',
			} );
			await setOpacity( page, 'Text opacity', 50 );
			expect(
				( await getSelectedAttributes( page ) ).style.color.text
			).toBe( 'rgba(68, 85, 102, 0.5)' );

			await requestUtils.activateTheme( 'twentytwentyfive' );
			await page.reload( { waitUntil: 'domcontentloaded' } );
			await dismissEditorWelcome( page );
			await waitForEditor( page );
			await page.evaluate( () => {
				const { createBlock } = window.wp.blocks;
				window.wp.data.dispatch( 'core/block-editor' ).insertBlock(
					createBlock( 'core/paragraph', {
						content: 'Default palette fixture',
						textColor: 'black',
					} )
				);
			} );
			await selectBlock( page, {
				content: 'Default palette fixture',
				name: 'core/paragraph',
			} );
			await setOpacity( page, 'Text opacity', 50 );
			expect(
				( await getSelectedAttributes( page ) ).style.color.text
			).toBe( 'rgba(0, 0, 0, 0.5)' );
		} finally {
			await requestUtils.activateTheme( 'palette-text-collision' );
			await requestUtils.rest( {
				data: {
					id: globalStylesId,
					settings: originalGlobalStyles.settings,
					styles: originalGlobalStyles.styles,
				},
				method: 'POST',
				path: `/wp/v2/global-styles/${ globalStylesId }`,
			} );
		}
	} );

	test( 'keeps converted literal colors valid across theme switching', async ( {
		admin,
		page,
		requestUtils,
	} ) => {
		await requestUtils.activateTheme( 'twentytwentyfive' );
		const post = await createFixturePost(
			requestUtils,
			'theme switch',
			presetParagraph
		);
		createdPostIds.push( post.id );

		await openPost( admin, page, post.id );
		await selectBlock( page, {
			content: 'Preset opacity fixture',
			name: 'core/paragraph',
		} );
		await setOpacity( page, 'Text opacity', 42 );
		await savePost( page );

		await requestUtils.activateTheme( 'acl-trace' );
		await page.reload( { waitUntil: 'domcontentloaded' } );
		await dismissEditorWelcome( page );
		await waitForEditor( page );
		await selectBlock( page, {
			content: 'Preset opacity fixture',
			name: 'core/paragraph',
		} );
		await expect(
			page.getByRole( 'slider', { name: 'Text opacity' } )
		).toHaveValue( '42' );
		const switched = await getSelectedAttributes( page );
		expect( switched.textColor ).toBeUndefined();
		expect( switched.style.color.text ).toBe( 'rgba(17, 17, 17, 0.42)' );
		await expect(
			page.getByText( /block contains unexpected/i )
		).toHaveCount( 0 );

		await requestUtils.activateTheme( 'blankslate' );
		await page.reload( { waitUntil: 'domcontentloaded' } );
		await dismissEditorWelcome( page );
		await waitForEditor( page );
		await selectBlock( page, {
			content: 'Preset opacity fixture',
			name: 'core/paragraph',
		} );
		await expect(
			page.getByRole( 'slider', { name: 'Text opacity' } )
		).toHaveValue( '42' );
		await expect(
			page.getByText( /block contains unexpected/i )
		).toHaveCount( 0 );
	} );

	test( 'corrects the text-slug utility collision without mutating saved content', async ( {
		admin,
		editor,
		page,
		requestUtils,
	}, testInfo ) => {
		await requestUtils.activateTheme( 'palette-text-collision' );
		const expected = 'rgba(200, 10, 20, 0.5)';
		const content = `<!-- wp:paragraph {"style":{"color":{"text":"${ expected }"}}} -->\n<p class="has-text-color" style="color:${ expected }">Collision fixture</p>\n<!-- /wp:paragraph -->`;
		const post = await createFixturePost(
			requestUtils,
			'text slug collision',
			content
		);
		createdPostIds.push( post.id );

		await openPost( admin, page, post.id );
		await selectBlock( page, {
			content: 'Collision fixture',
			name: 'core/paragraph',
		} );
		await expect(
			page.getByRole( 'slider', { name: 'Text opacity' } )
		).toHaveValue( '50' );

		const editorEvidence = await editor.canvas
			.getByText( 'Collision fixture', { exact: true } )
			.evaluate( ( element ) => ( {
				className: element.className,
				computedColor: window.getComputedStyle( element ).color,
				style: element.getAttribute( 'style' ),
			} ) );

		await page.goto( post.link );
		const frontend = page.getByText( 'Collision fixture', { exact: true } );
		const frontendEvidence = await frontend.evaluate( ( element ) => ( {
			className: element.className,
			computedColor: window.getComputedStyle( element ).color,
			style: element.getAttribute( 'style' ),
		} ) );
		const relevantThemeCss = await page.evaluate( () =>
			Array.from( document.styleSheets ).flatMap( ( sheet ) => {
				try {
					return Array.from( sheet.cssRules )
						.map( ( rule ) => rule.cssText )
						.filter(
							( rule ) =>
								rule.includes( '.has-text-color' ) &&
								( rule.includes(
									'--wp--preset--color--text'
								) ||
									rule.includes(
										'--acl-block-opacity-text-color'
									) )
						);
				} catch {
					return [];
				}
			} )
		);
		const saved = await requestUtils.rest( {
			path: `/wp/v2/posts/${ post.id }?context=edit`,
		} );
		const evidence = {
			editor: editorEvidence,
			expected,
			frontend: frontendEvidence,
			relevantThemeCss,
			serialized: saved.content.raw,
		};

		await testInfo.attach( 'text-slug-collision.json', {
			body: JSON.stringify( evidence, null, 2 ),
			contentType: 'application/json',
		} );

		expect( editorEvidence.className ).toContain( 'has-text-color' );
		expect( editorEvidence.className ).toContain(
			'acl-block-opacity-compat-text'
		);
		expect( editorEvidence.style ).toContain(
			'--acl-block-opacity-text-color: rgba(200, 10, 20, 0.5)'
		);
		expect( editorEvidence.computedColor ).toBe( expected );
		expect( frontendEvidence.className ).toContain( 'has-text-color' );
		expect( frontendEvidence.className ).toContain(
			'acl-block-opacity-compat-text'
		);
		expect( frontendEvidence.style ).toContain(
			'--acl-block-opacity-text-color:rgba(200, 10, 20, 0.5)'
		);
		expect( saved.content.raw ).toContain( `"text":"${ expected }"` );
		expect( saved.content.raw ).not.toContain( 'acl-block-opacity' );
		expect( relevantThemeCss ).not.toHaveLength( 0 );
		expect( relevantThemeCss ).toEqual(
			expect.arrayContaining( [
				expect.stringContaining( '--wp--preset--color--text' ),
				expect.stringContaining( '--acl-block-opacity-text-color' ),
			] )
		);
		expect( frontendEvidence.computedColor ).toBe( expected );
	} );

	test( 'records ACL Trace 3.0.9 editor and frontend bridge behavior', async ( {
		admin,
		editor,
		page,
		requestUtils,
	}, testInfo ) => {
		await requestUtils.activateTheme( 'acl-trace' );
		const theme = await requestUtils.rest( {
			path: '/wp/v2/themes/acl-trace?context=edit',
		} );
		expect( theme.version ).toBe( '3.0.9' );
		const expected = 'rgba(200, 10, 20, 0.5)';
		const content = `<!-- wp:paragraph {"style":{"color":{"text":"${ expected }"}}} -->\n<p class="has-text-color" style="color:${ expected }">ACL Trace collision fixture</p>\n<!-- /wp:paragraph -->`;
		const post = await createFixturePost(
			requestUtils,
			'ACL Trace collision',
			content
		);
		createdPostIds.push( post.id );

		await openPost( admin, page, post.id );
		await selectBlock( page, {
			content: 'ACL Trace collision fixture',
			name: 'core/paragraph',
		} );
		await expect(
			page.getByRole( 'slider', { name: 'Text opacity' } )
		).toHaveValue( '50' );
		const editorEvidence = await editor.canvas
			.getByText( 'ACL Trace collision fixture', { exact: true } )
			.evaluate( ( element ) => ( {
				className: element.className,
				computedColor: window.getComputedStyle( element ).color,
				style: element.getAttribute( 'style' ),
			} ) );
		const saved = await requestUtils.rest( {
			path: `/wp/v2/posts/${ post.id }?context=edit`,
		} );
		expect( saved.content.raw ).not.toContain(
			'acl-trace-text-color-bridge'
		);

		await page.goto( saved.link );
		const frontendEvidence = await page
			.getByText( 'ACL Trace collision fixture', { exact: true } )
			.evaluate( ( element ) => ( {
				className: element.className,
				computedColor: window.getComputedStyle( element ).color,
				style: element.getAttribute( 'style' ),
			} ) );
		const relevantThemeCss = await page.evaluate( () =>
			Array.from( document.styleSheets ).flatMap( ( sheet ) => {
				try {
					return Array.from( sheet.cssRules )
						.map( ( rule ) => rule.cssText )
						.filter(
							( rule ) =>
								rule.includes( '.has-text-color' ) ||
								rule.includes( 'acl-trace-text-color-bridge' )
						);
				} catch {
					return [];
				}
			} )
		);
		await testInfo.attach( 'acl-trace-collision.json', {
			body: JSON.stringify(
				{
					editor: editorEvidence,
					expected,
					frontend: frontendEvidence,
					relevantThemeCss,
					serialized: saved.content.raw,
					themeVersion: theme.version,
				},
				null,
				2
			),
			contentType: 'application/json',
		} );

		expect( editorEvidence.computedColor ).toBe( expected );
		expect( editorEvidence.className ).toContain(
			'acl-block-opacity-compat-text'
		);
		expect( frontendEvidence.computedColor ).toBe( expected );
		expect( frontendEvidence.className ).toContain(
			'acl-block-opacity-compat-text'
		);
		expect( editorEvidence.className ).not.toContain( 'acl-trace-' );
		expect( frontendEvidence.className ).not.toContain( 'acl-trace-' );
		expect( saved.content.raw ).not.toContain( 'acl-block-opacity' );
		expect( relevantThemeCss ).not.toHaveLength( 0 );
	} );

	test( 'remains structurally safe through deactivation and derives values after reactivation', async ( {
		admin,
		page,
		requestUtils,
	} ) => {
		await requestUtils.activateTheme( 'twentytwentyfive' );
		const post = await createFixturePost(
			requestUtils,
			'deactivation',
			customParagraph
		);
		createdPostIds.push( post.id );
		const before = await requestUtils.rest( {
			path: `/wp/v2/posts/${ post.id }?context=edit`,
		} );

		await requestUtils.deactivatePlugin( PRODUCT_PLUGIN );
		await openPost( admin, page, post.id );
		await selectBlock( page, {
			content: 'Custom opacity fixture',
			name: 'core/paragraph',
		} );
		await expect(
			page.getByRole( 'slider', { name: 'Text opacity' } )
		).toHaveCount( 0 );
		await expect(
			page.getByText( /block contains unexpected/i )
		).toHaveCount( 0 );
		const inactive = await requestUtils.rest( {
			path: `/wp/v2/posts/${ post.id }?context=edit`,
		} );
		expect( inactive.content.raw ).toBe( before.content.raw );

		await page.goto( inactive.link );
		await expect(
			page.getByText( 'Custom opacity fixture', { exact: true } )
		).toBeVisible();

		await requestUtils.activatePlugin( PRODUCT_PLUGIN );
		await openPost( admin, page, post.id );
		await selectBlock( page, {
			content: 'Custom opacity fixture',
			name: 'core/paragraph',
		} );
		await expect(
			page.getByRole( 'slider', { name: 'Text opacity' } )
		).toHaveValue( '75' );
		await expect(
			page.getByRole( 'slider', { name: 'Background opacity' } )
		).toHaveValue( '40' );
	} );
} );
