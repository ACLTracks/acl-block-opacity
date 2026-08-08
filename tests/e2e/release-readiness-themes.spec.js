const { test, expect } = require( '@wordpress/e2e-test-utils-playwright' );

const {
	createFixturePost,
	deleteFixturePost,
	dismissEditorWelcome,
	savePost,
	selectBlock,
	setOpacity,
	waitForEditor,
} = require( './helpers/wordpress' );

const PRODUCT_PLUGIN = 'acl-opacity-controls-for-blocks';

const themeCases = [
	{
		label: 'second current block theme',
		slug: 'twentytwentyfour',
	},
	{
		label: 'classic theme without a theme palette',
		slug: 'blankslate',
	},
];

async function openPost( admin, page, postId ) {
	await admin.editPost( postId );
	await dismissEditorWelcome( page );
	await waitForEditor( page );
}

test.describe.serial( 'ACL Block Opacity release-readiness themes', () => {
	const createdPostIds = [];

	test.beforeAll( async ( { requestUtils } ) => {
		await requestUtils.activatePlugin( PRODUCT_PLUGIN );
	} );

	test.afterAll( async ( { requestUtils } ) => {
		for ( const postId of createdPostIds ) {
			await deleteFixturePost( requestUtils, postId );
		}

		await requestUtils.activateTheme( 'acl-trace' );
		await requestUtils.activatePlugin( PRODUCT_PLUGIN );
	} );

	for ( const themeCase of themeCases ) {
		test( `${ themeCase.label } preserves editor and frontend parity`, async ( {
			admin,
			editor,
			page,
			requestUtils,
		} ) => {
			await requestUtils.activateTheme( themeCase.slug );
			const content = `<!-- wp:paragraph {"style":{"color":{"text":"rgba(17, 34, 51, 0.75)","background":"rgba(221, 238, 255, 0.4)"}}} -->
<p class="has-text-color has-background" style="color:rgba(17, 34, 51, 0.75);background-color:rgba(221, 238, 255, 0.4)">Theme readiness fixture</p>
<!-- /wp:paragraph -->`;
			const post = await createFixturePost(
				requestUtils,
				themeCase.slug,
				content
			);
			createdPostIds.push( post.id );

			await openPost( admin, page, post.id );
			await selectBlock( page, {
				content: 'Theme readiness fixture',
				name: 'core/paragraph',
			} );
			await setOpacity( page, 'Text opacity', 31 );
			await setOpacity( page, 'Background opacity', 62 );
			await savePost( page );

			await page.reload( { waitUntil: 'domcontentloaded' } );
			await dismissEditorWelcome( page );
			await waitForEditor( page );
			await selectBlock( page, {
				content: 'Theme readiness fixture',
				name: 'core/paragraph',
			} );
			await expect(
				page.getByRole( 'slider', { name: 'Text opacity' } )
			).toHaveValue( '31' );
			await expect(
				page.getByRole( 'slider', { name: 'Background opacity' } )
			).toHaveValue( '62' );
			await expect(
				editor.canvas.getByText( 'Theme readiness fixture', {
					exact: true,
				} )
			).toHaveCSS( 'color', 'rgba(17, 34, 51, 0.31)' );

			await page.goto( post.link );
			const frontend = page.getByText( 'Theme readiness fixture', {
				exact: true,
			} );
			await expect( frontend ).toHaveCSS(
				'color',
				'rgba(17, 34, 51, 0.31)'
			);
			await expect( frontend ).toHaveCSS(
				'background-color',
				'rgba(221, 238, 255, 0.62)'
			);
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
	}
} );
