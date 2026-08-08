const { test, expect } = require( '@wordpress/e2e-test-utils-playwright' );

const {
	createFixturePost,
	deleteFixturePost,
	dismissEditorWelcome,
	getSelectedAttributes,
	savePost,
	selectBlock,
	setOpacity,
	waitForEditor,
} = require( './helpers/wordpress' );

const PRODUCT_PLUGIN = 'acl-opacity-controls-for-blocks';

const packageParagraph = `<!-- wp:paragraph {"style":{"color":{"text":"#112233","background":"#ddeeff"}}} -->
<p class="has-text-color has-background" style="color:#112233;background-color:#ddeeff">Package opacity fixture</p>
<!-- /wp:paragraph -->`;

async function openPost( admin, page, postId ) {
	await admin.editPost( postId );
	await dismissEditorWelcome( page );
	await waitForEditor( page );
}

test.describe.serial( 'Installed release-candidate package', () => {
	const createdPostIds = [];

	test.beforeAll( async ( { requestUtils } ) => {
		await requestUtils.activatePlugin( PRODUCT_PLUGIN );
	} );

	test.afterAll( async ( { requestUtils } ) => {
		for ( const postId of createdPostIds ) {
			await deleteFixturePost( requestUtils, postId );
		}

		await requestUtils.activatePlugin( PRODUCT_PLUGIN );
	} );

	test( 'activates, saves standard colors, reloads, matches the frontend, and excludes Cover', async ( {
		admin,
		page,
		requestUtils,
	} ) => {
		const consoleMessages = [];

		page.on( 'console', ( message ) => {
			if ( [ 'error', 'warning' ].includes( message.type() ) ) {
				consoleMessages.push( {
					text: message.text(),
					type: message.type(),
				} );
			}
		} );

		await requestUtils.deactivatePlugin( PRODUCT_PLUGIN );
		await requestUtils.activatePlugin( PRODUCT_PLUGIN );
		await admin.visitAdminPage( 'plugins.php' );
		await expect(
			page.getByRole( 'row', {
				name: /ACL Opacity Controls for Blocks.*Deactivate ACL Opacity Controls for Blocks/,
			} )
		).toContainText( 'Version 1.0.0' );
		await expect(
			page.locator(
				'#wpbody-content > .notice-error:visible, #wpbody-content > .error:visible'
			)
		).toHaveCount( 0 );

		const post = await createFixturePost(
			requestUtils,
			'package candidate smoke',
			packageParagraph
		);
		createdPostIds.push( post.id );

		await openPost( admin, page, post.id );
		await selectBlock( page, {
			content: 'Package opacity fixture',
			name: 'core/paragraph',
		} );
		await expect(
			page.getByRole( 'slider', { name: 'Text opacity' } )
		).toHaveValue( '100' );
		await expect(
			page.getByRole( 'slider', { name: 'Background opacity' } )
		).toHaveValue( '100' );

		await setOpacity( page, 'Text opacity', 55 );
		await setOpacity( page, 'Background opacity', 20 );
		expect( ( await getSelectedAttributes( page ) ).style.color ).toEqual( {
			background: 'rgba(221, 238, 255, 0.2)',
			text: 'rgba(17, 34, 51, 0.55)',
		} );

		await savePost( page );
		await page.reload( { waitUntil: 'domcontentloaded' } );
		await dismissEditorWelcome( page );
		await waitForEditor( page );
		await selectBlock( page, {
			content: 'Package opacity fixture',
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
		const frontend = page.getByText( 'Package opacity fixture', {
			exact: true,
		} );
		await expect( frontend ).toHaveCSS( 'color', 'rgba(17, 34, 51, 0.55)' );
		await expect( frontend ).toHaveCSS(
			'background-color',
			'rgba(221, 238, 255, 0.2)'
		);
		await expect(
			page.locator(
				'script[src*="/wp-content/plugins/acl-block-opacity/"]'
			)
		).toHaveCount( 0 );
		await expect(
			page.locator(
				'link[href*="/wp-content/plugins/acl-block-opacity/assets/css/compatibility.css"]'
			)
		).toHaveCount( 0 );

		await page.goto( `/wp-admin/post.php?post=${ post.id }&action=edit`, {
			waitUntil: 'domcontentloaded',
		} );
		await dismissEditorWelcome( page );
		await waitForEditor( page );
		await page.evaluate( () => {
			const { createBlock } = window.wp.blocks;
			window.wp.data.dispatch( 'core/block-editor' ).insertBlock(
				createBlock(
					'core/cover',
					{ dimRatio: 50, overlayColor: 'contrast' },
					[
						createBlock( 'core/paragraph', {
							content: 'Package Cover fixture',
						} ),
					]
				)
			);
		} );
		await selectBlock( page, { name: 'core/cover' } );
		await expect(
			page.getByRole( 'slider', { name: 'Text opacity' } )
		).toHaveCount( 0 );
		await expect(
			page.getByRole( 'slider', { name: 'Background opacity' } )
		).toHaveCount( 0 );
		expect( consoleMessages ).toEqual( [] );
	} );

	test( 'exposes accessible range state, focus, percentage and unavailable guidance', async ( {
		admin,
		page,
		requestUtils,
	}, testInfo ) => {
		const post = await createFixturePost(
			requestUtils,
			'package accessibility',
			packageParagraph
		);
		createdPostIds.push( post.id );
		await openPost( admin, page, post.id );
		await selectBlock( page, {
			content: 'Package opacity fixture',
			name: 'core/paragraph',
		} );

		const textSlider = page.getByRole( 'slider', {
			name: 'Text opacity',
			exact: true,
		} );
		const backgroundSlider = page.getByRole( 'slider', {
			name: 'Background opacity',
			exact: true,
		} );
		await expect( textSlider ).toHaveAttribute( 'min', '0' );
		await expect( textSlider ).toHaveAttribute( 'max', '100' );
		await expect( textSlider ).toHaveValue( '100' );
		await expect( backgroundSlider ).toHaveValue( '100' );

		await textSlider.focus();
		await page.keyboard.press( 'Tab' );
		await page.keyboard.press( 'Shift+Tab' );
		const focusEvidence = await textSlider.evaluate( ( element ) => {
			const style = window.getComputedStyle( element );

			return {
				active: element.ownerDocument.activeElement === element,
				boxShadow: style.boxShadow,
				focusVisible: element.matches( ':focus-visible' ),
				outlineStyle: style.outlineStyle,
				outlineWidth: style.outlineWidth,
			};
		} );
		expect( focusEvidence.active ).toBe( true );
		expect( focusEvidence.focusVisible ).toBe( true );
		await testInfo.attach( 'package-keyboard-focus.png', {
			body: await page.screenshot(),
			contentType: 'image/png',
		} );

		await textSlider.press( 'Home' );
		await expect( textSlider ).toHaveValue( '0' );
		await expect(
			page
				.getByLabel( 'Editor settings' )
				.getByText( 'At 0%, the text will be invisible.' )
		).toBeVisible();
		await expect( page.getByText( '0%', { exact: true } ) ).toBeVisible();

		await page.evaluate( () => {
			const { createBlock } = window.wp.blocks;
			window.wp.data.dispatch( 'core/block-editor' ).insertBlocks( [
				createBlock( 'core/paragraph', {
					content: 'Package uncolored fixture',
				} ),
				createBlock( 'core/paragraph', {
					content: 'Package unsupported fixture',
					style: { color: { text: 'hsl(120 50% 50%)' } },
				} ),
				createBlock( 'core/paragraph', {
					content: 'Package gradient fixture',
					style: {
						color: {
							background: '#ffffff',
							gradient:
								'linear-gradient(135deg, rgb(0, 0, 0) 0%, rgb(255, 255, 255) 100%)',
							text: '#123456',
						},
					},
				} ),
			] );
		} );

		await selectBlock( page, {
			content: 'Package uncolored fixture',
			name: 'core/paragraph',
		} );
		await expect(
			page
				.getByLabel( 'Editor settings' )
				.getByText( 'Choose a text color to adjust its opacity.' )
		).toBeVisible();
		await expect(
			page
				.getByLabel( 'Editor settings' )
				.getByText( 'Choose a background color to adjust its opacity.' )
		).toBeVisible();

		await selectBlock( page, {
			content: 'Package unsupported fixture',
			name: 'core/paragraph',
		} );
		await expect(
			page
				.getByLabel( 'Editor settings' )
				.getByText(
					'This text color format cannot be adjusted safely.'
				)
		).toBeVisible();

		await selectBlock( page, {
			content: 'Package gradient fixture',
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
			page.getByRole( 'slider', { name: 'Background opacity' } )
		).toHaveCount( 0 );

		await testInfo.attach( 'package-accessibility.json', {
			body: JSON.stringify(
				{
					focus: focusEvidence,
					range: {
						maximum: await textSlider.getAttribute( 'max' ),
						minimum: await textSlider.getAttribute( 'min' ),
						value: await textSlider.inputValue(),
					},
				},
				null,
				2
			),
			contentType: 'application/json',
		} );
	} );
} );
