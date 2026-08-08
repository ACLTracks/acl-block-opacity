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
	waitForEditor,
} = require( './helpers/wordpress' );

const PRODUCT_PLUGIN = 'acl-opacity-controls-for-blocks';
const FIXTURE_PLUGIN = 'acl-opacity-e2e-standard-color-block';
const COMPATIBILITY_CLASS = 'acl-block-opacity-compat-text';
const COMPATIBILITY_PROPERTY = '--acl-block-opacity-text-color';

async function openPost( admin, page, postId ) {
	await admin.editPost( postId );
	await dismissEditorWelcome( page );
	await waitForEditor( page );
}

async function inspectEditorElement( locator ) {
	return locator.evaluate( ( element ) => ( {
		className: element.className,
		color: window.getComputedStyle( element ).color,
		style: element.getAttribute( 'style' ),
	} ) );
}

async function inspectFrontendElement( locator ) {
	return locator.evaluate( ( element ) => ( {
		className: element.className,
		color: window.getComputedStyle( element ).color,
		style: element.getAttribute( 'style' ),
	} ) );
}

test.describe.serial( 'ACL Block Opacity text collision bridge', () => {
	const createdPostIds = [];

	test.beforeAll( async ( { requestUtils } ) => {
		await requestUtils.activatePlugin( FIXTURE_PLUGIN );
		await requestUtils.activatePlugin( PRODUCT_PLUGIN );
	} );

	test.afterAll( async ( { requestUtils } ) => {
		for ( const postId of createdPostIds ) {
			await retryWordPressRequest( () =>
				deleteFixturePost( requestUtils, postId )
			);
		}

		await requestUtils.activateTheme( 'acl-trace' );
		await requestUtils.activatePlugin( PRODUCT_PLUGIN );
	} );

	test( 'uses a block-context text slug only for the applicable standard root', async ( {
		admin,
		editor,
		page,
		requestUtils,
	} ) => {
		await requestUtils.activateTheme(
			'palette-text-block-context-collision'
		);
		const post = await createFixturePost(
			requestUtils,
			'block context collision',
			'<!-- wp:paragraph --><p>Block context placeholder</p><!-- /wp:paragraph -->'
		);
		createdPostIds.push( post.id );

		await openPost( admin, page, post.id );
		await page.evaluate( () => {
			const { createBlock } = window.wp.blocks;

			window.wp.data.dispatch( 'core/block-editor' ).resetBlocks( [
				createBlock( 'core/paragraph', {
					content: 'Global context paragraph',
					style: {
						color: { text: 'rgba(20, 30, 40, 0.5)' },
					},
				} ),
				createBlock( 'acl-opacity-e2e/standard-color', {
					content: 'Block context third party',
					style: {
						color: { text: 'rgba(200, 10, 20, 0.5)' },
					},
				} ),
			] );
		} );

		const paragraph = await inspectEditorElement(
			editor.canvas.getByText( 'Global context paragraph', {
				exact: true,
			} )
		);
		const thirdPartyLocator = editor.canvas.getByText(
			'Block context third party',
			{ exact: true }
		);

		await expect
			.poll(
				async () =>
					( await inspectEditorElement( thirdPartyLocator ) ).color
			)
			.toBe( 'rgba(200, 10, 20, 0.5)' );

		const thirdParty = await inspectEditorElement( thirdPartyLocator );

		expect( paragraph.className ).not.toContain( COMPATIBILITY_CLASS );
		expect( paragraph.style ).not.toContain( COMPATIBILITY_PROPERTY );
		expect( paragraph.color ).toBe( 'rgba(20, 30, 40, 0.5)' );
		expect( thirdParty.className ).toContain( COMPATIBILITY_CLASS );
		expect( thirdParty.style ).toContain( COMPATIBILITY_PROPERTY );
		expect( thirdParty.color ).toBe( 'rgba(200, 10, 20, 0.5)' );

		await savePost( page );
		const saved = await requestUtils.rest( {
			path: `/wp/v2/posts/${ post.id }?context=edit`,
		} );
		expect( saved.content.raw ).not.toContain( COMPATIBILITY_CLASS );
		expect( saved.content.raw ).not.toContain( COMPATIBILITY_PROPERTY );

		await page.goto( saved.link );
		const frontendParagraph = await inspectFrontendElement(
			page.getByText( 'Global context paragraph', { exact: true } )
		);
		const frontendThirdParty = await inspectFrontendElement(
			page.getByText( 'Block context third party', { exact: true } )
		);

		expect( frontendParagraph.className ).not.toContain(
			COMPATIBILITY_CLASS
		);
		expect( frontendParagraph.style ).not.toContain(
			COMPATIBILITY_PROPERTY
		);
		expect( frontendThirdParty.className ).toContain( COMPATIBILITY_CLASS );
		expect( frontendThirdParty.style ).toContain( COMPATIBILITY_PROPERTY );
		expect( frontendThirdParty.color ).toBe( 'rgba(200, 10, 20, 0.5)' );
	} );

	test( 'isolates nested roots and sibling Buttons while keeping Cover and presets untouched', async ( {
		admin,
		editor,
		page,
		requestUtils,
	}, testInfo ) => {
		await requestUtils.activateTheme( 'palette-text-collision' );
		const post = await createFixturePost(
			requestUtils,
			'nested collision isolation',
			'<!-- wp:paragraph --><p>Nested placeholder</p><!-- /wp:paragraph -->'
		);
		createdPostIds.push( post.id );

		await openPost( admin, page, post.id );
		await page.evaluate( () => {
			const { createBlock } = window.wp.blocks;

			window.wp.data.dispatch( 'core/block-editor' ).resetBlocks( [
				createBlock(
					'core/group',
					{
						style: {
							color: { text: 'rgba(40, 50, 60, 0.6)' },
						},
					},
					[
						createBlock( 'core/paragraph', {
							content: 'Inherited group child',
						} ),
						createBlock( 'core/paragraph', {
							content: 'Explicit group child',
							style: {
								color: { text: 'rgba(70, 80, 90, 0.7)' },
							},
						} ),
					]
				),
				createBlock(
					'core/quote',
					{
						style: {
							color: { text: 'rgba(90, 100, 110, 0.45)' },
						},
					},
					[
						createBlock( 'core/paragraph', {
							content: 'Inherited quote child',
						} ),
					]
				),
				createBlock(
					'core/list',
					{
						style: {
							color: { text: 'rgba(120, 130, 140, 0.55)' },
						},
					},
					[
						createBlock( 'core/list-item', {
							content: 'Inherited list item',
						} ),
					]
				),
				createBlock( 'core/buttons', {}, [
					createBlock( 'core/button', {
						style: {
							color: { text: 'rgba(150, 20, 30, 0.25)' },
						},
						text: 'First bridge button',
					} ),
					createBlock( 'core/button', {
						style: {
							color: { text: 'rgba(30, 150, 40, 0.75)' },
						},
						text: 'Second bridge button',
					} ),
				] ),
				createBlock(
					'core/cover',
					{
						dimRatio: 50,
						style: {
							color: { text: 'rgba(1, 2, 3, 0.5)' },
						},
					},
					[
						createBlock( 'core/paragraph', {
							content: 'Cover isolation child',
						} ),
					]
				),
				createBlock( 'core/paragraph', {
					content: 'Preset authoritative fixture',
					style: {
						color: { text: 'rgba(200, 10, 20, 0.5)' },
					},
					textColor: 'text',
				} ),
			] );
		} );

		const groupChild = editor.canvas.getByText( 'Inherited group child', {
			exact: true,
		} );

		await expect
			.poll( () =>
				groupChild.evaluate(
					( element ) => window.getComputedStyle( element ).color
				)
			)
			.toBe( 'rgba(40, 50, 60, 0.6)' );

		const group = await groupChild.evaluate( ( element ) => {
			const root = element.closest( '.wp-block-group' );

			return {
				className: root.className,
				color: window.getComputedStyle( element ).color,
				style: root.getAttribute( 'style' ),
			};
		} );
		const explicit = await inspectEditorElement(
			editor.canvas.getByText( 'Explicit group child', { exact: true } )
		);
		const quote = await editor.canvas
			.getByText( 'Inherited quote child', { exact: true } )
			.evaluate( ( element ) => {
				const root = element.closest( '.wp-block-quote' );

				return {
					className: root.className,
					color: window.getComputedStyle( element ).color,
					style: root.getAttribute( 'style' ),
				};
			} );
		const list = await editor.canvas
			.getByText( 'Inherited list item', { exact: true } )
			.evaluate( ( element ) => {
				const root = element.closest( '.wp-block-list' );

				return {
					className: root.className,
					color: window.getComputedStyle( element ).color,
					style: root.getAttribute( 'style' ),
				};
			} );

		expect( group.className ).toContain( COMPATIBILITY_CLASS );
		expect( group.style ).toContain( 'rgba(40, 50, 60, 0.6)' );
		expect( group.color ).toBe( 'rgba(40, 50, 60, 0.6)' );
		expect( explicit.className ).toContain( COMPATIBILITY_CLASS );
		expect( explicit.color ).toBe( 'rgba(70, 80, 90, 0.7)' );
		expect( quote.className ).toContain( COMPATIBILITY_CLASS );
		expect( quote.color ).toBe( 'rgba(90, 100, 110, 0.45)' );
		expect( list.className ).toContain( COMPATIBILITY_CLASS );
		expect( list.color ).toBe( 'rgba(120, 130, 140, 0.55)' );

		const buttons = [];
		for ( const label of [
			'First bridge button',
			'Second bridge button',
		] ) {
			buttons.push(
				await editor.canvas
					.getByText( label, { exact: true } )
					.evaluate( ( element ) => {
						const root = element.closest( '.wp-block-button' );

						return {
							className: root.className,
							style: root.getAttribute( 'style' ),
							targetColor:
								window.getComputedStyle( element ).color,
							targetStyle: element.getAttribute( 'style' ),
						};
					} )
			);
		}

		expect( buttons[ 0 ].targetStyle ).toContain(
			'rgba(150, 20, 30, 0.25)'
		);
		expect( buttons[ 1 ].targetStyle ).toContain(
			'rgba(30, 150, 40, 0.75)'
		);
		expect( buttons[ 0 ].className ).not.toContain( COMPATIBILITY_CLASS );
		expect( buttons[ 1 ].className ).not.toContain( COMPATIBILITY_CLASS );
		expect( buttons[ 0 ].style || '' ).not.toContain(
			COMPATIBILITY_PROPERTY
		);
		expect( buttons[ 1 ].style || '' ).not.toContain(
			COMPATIBILITY_PROPERTY
		);
		expect( buttons[ 0 ].targetColor ).toBe( 'rgb(17, 34, 51)' );
		expect( buttons[ 1 ].targetColor ).toBe( 'rgb(17, 34, 51)' );

		await selectBlock( page, { name: 'core/cover' } );
		const coverAttributes = await getSelectedAttributes( page );
		expect( coverAttributes.dimRatio ).toBe( 50 );
		const coverRoot = await editor.canvas
			.getByText( 'Cover isolation child', { exact: true } )
			.evaluate( ( element ) => {
				const root = element.closest( '.wp-block-cover' );

				return {
					className: root.className,
					style: root.getAttribute( 'style' ),
				};
			} );
		expect( coverRoot.className ).not.toContain( COMPATIBILITY_CLASS );
		expect( coverRoot.style || '' ).not.toContain( COMPATIBILITY_PROPERTY );

		const preset = await inspectEditorElement(
			editor.canvas.getByText( 'Preset authoritative fixture', {
				exact: true,
			} )
		);
		expect( preset.className ).not.toContain( COMPATIBILITY_CLASS );
		expect( preset.style || '' ).not.toContain( COMPATIBILITY_PROPERTY );
		expect( preset.color ).toBe( 'rgb(17, 34, 51)' );

		await testInfo.attach( 'nested-isolation.json', {
			body: JSON.stringify(
				{ buttons, coverRoot, explicit, group, list, preset, quote },
				null,
				2
			),
			contentType: 'application/json',
		} );

		await savePost( page );
		const saved = await requestUtils.rest( {
			path: `/wp/v2/posts/${ post.id }?context=edit`,
		} );
		expect( saved.content.raw ).not.toContain( COMPATIBILITY_CLASS );
		expect( saved.content.raw ).not.toContain( COMPATIBILITY_PROPERTY );
		const records = await getBlockRecords( page );
		const buttonRecords = records.filter(
			( block ) => block.name === 'core/button'
		);
		expect( buttonRecords[ 0 ].attributes.style.color.text ).toBe(
			'rgba(150, 20, 30, 0.25)'
		);
		expect( buttonRecords[ 1 ].attributes.style.color.text ).toBe(
			'rgba(30, 150, 40, 0.75)'
		);

		await page.goto( saved.link );
		const frontendGroup = await page
			.getByText( 'Inherited group child', { exact: true } )
			.evaluate( ( element ) => {
				const root = element.closest( '.wp-block-group' );

				return {
					className: root.className,
					color: window.getComputedStyle( element ).color,
					style: root.getAttribute( 'style' ),
				};
			} );
		expect( frontendGroup.className ).toContain( COMPATIBILITY_CLASS );
		expect( frontendGroup.color ).toBe( 'rgba(40, 50, 60, 0.6)' );

		for ( const label of [
			'First bridge button',
			'Second bridge button',
		] ) {
			const frontendButton = await page
				.getByText( label, { exact: true } )
				.evaluate( ( element ) => {
					const root = element.closest( '.wp-block-button' );

					return {
						className: root.className,
						color: window.getComputedStyle( element ).color,
						rootStyle: root.getAttribute( 'style' ),
						targetClassName: element.className,
						targetStyle: element.getAttribute( 'style' ),
					};
				} );

			expect( frontendButton.className ).not.toContain(
				COMPATIBILITY_CLASS
			);
			expect( frontendButton.targetClassName ).not.toContain(
				COMPATIBILITY_CLASS
			);
			expect( frontendButton.rootStyle || '' ).not.toContain(
				COMPATIBILITY_PROPERTY
			);
			expect( frontendButton.targetStyle || '' ).not.toContain(
				COMPATIBILITY_PROPERTY
			);
			expect( frontendButton.color ).toBe( 'rgb(17, 34, 51)' );
		}

		const frontendCover = await page
			.getByText( 'Cover isolation child', { exact: true } )
			.evaluate( ( element ) => {
				const root = element.closest( '.wp-block-cover' );

				return {
					className: root.className,
					style: root.getAttribute( 'style' ),
				};
			} );
		expect( frontendCover.className ).not.toContain( COMPATIBILITY_CLASS );
		expect( frontendCover.style || '' ).not.toContain(
			COMPATIBILITY_PROPERTY
		);
	} );

	test( 'preserves standard content through deactivation and restores correction after reactivation', async ( {
		admin,
		editor,
		page,
		requestUtils,
	} ) => {
		await requestUtils.activateTheme( 'palette-text-collision' );
		const expected = 'rgba(200, 10, 20, 0.5)';
		const content = `<!-- wp:paragraph {"style":{"color":{"text":"${ expected }"}}} -->\n<p class="has-text-color" style="color:${ expected }">Collision deactivation fixture</p>\n<!-- /wp:paragraph -->`;
		const post = await createFixturePost(
			requestUtils,
			'collision deactivation',
			content
		);
		createdPostIds.push( post.id );

		await openPost( admin, page, post.id );
		const collisionFixture = editor.canvas.getByText(
			'Collision deactivation fixture',
			{ exact: true }
		);
		await expect
			.poll(
				async () =>
					( await inspectEditorElement( collisionFixture ) ).color
			)
			.toBe( expected );
		let editorState = await inspectEditorElement( collisionFixture );
		expect( editorState.className ).toContain( COMPATIBILITY_CLASS );
		expect( editorState.color ).toBe( expected );

		const before = await requestUtils.rest( {
			path: `/wp/v2/posts/${ post.id }?context=edit`,
		} );
		await requestUtils.deactivatePlugin( PRODUCT_PLUGIN );
		await openPost( admin, page, post.id );
		await selectBlock( page, {
			content: 'Collision deactivation fixture',
			name: 'core/paragraph',
		} );
		await expect(
			page.getByText( /block contains unexpected/i )
		).toHaveCount( 0 );
		expect( ( await getSelectedAttributes( page ) ).style.color.text ).toBe(
			expected
		);
		editorState = await inspectEditorElement(
			editor.canvas.getByText( 'Collision deactivation fixture', {
				exact: true,
			} )
		);
		expect( editorState.className ).not.toContain( COMPATIBILITY_CLASS );
		expect( editorState.color ).toBe( 'rgb(17, 34, 51)' );

		const inactive = await requestUtils.rest( {
			path: `/wp/v2/posts/${ post.id }?context=edit`,
		} );
		expect( inactive.content.raw ).toBe( before.content.raw );
		await page.goto( inactive.link );
		const inactiveFrontend = await inspectFrontendElement(
			page.getByText( 'Collision deactivation fixture', { exact: true } )
		);
		expect( inactiveFrontend.className ).not.toContain(
			COMPATIBILITY_CLASS
		);
		expect( inactiveFrontend.color ).toBe( 'rgb(17, 34, 51)' );

		await requestUtils.activatePlugin( PRODUCT_PLUGIN );
		await openPost( admin, page, post.id );
		await expect
			.poll(
				async () =>
					( await inspectEditorElement( collisionFixture ) ).color
			)
			.toBe( expected );
		editorState = await inspectEditorElement( collisionFixture );
		expect( editorState.className ).toContain( COMPATIBILITY_CLASS );
		expect( editorState.color ).toBe( expected );
		await page.goto( inactive.link );
		const activeFrontend = await inspectFrontendElement(
			page.getByText( 'Collision deactivation fixture', { exact: true } )
		);
		expect( activeFrontend.className ).toContain( COMPATIBILITY_CLASS );
		expect( activeFrontend.color ).toBe( expected );
	} );

	test( 'coexists with a theme that already applies the same saved literal at runtime', async ( {
		admin,
		editor,
		page,
		requestUtils,
	} ) => {
		await requestUtils.activateTheme( 'palette-text-collision-mitigated' );
		const expected = 'rgba(200, 10, 20, 0.5)';
		const content = `<!-- wp:paragraph {"style":{"color":{"text":"${ expected }"}}} -->\n<p class="has-text-color" style="color:${ expected }">Premitigated collision fixture</p>\n<!-- /wp:paragraph -->`;
		const post = await createFixturePost(
			requestUtils,
			'premitigated collision',
			content
		);
		createdPostIds.push( post.id );

		await openPost( admin, page, post.id );
		const premitigatedFixture = editor.canvas.getByText(
			'Premitigated collision fixture',
			{ exact: true }
		);
		await expect
			.poll(
				async () =>
					( await inspectEditorElement( premitigatedFixture ) ).color
			)
			.toBe( expected );
		const editorState = await inspectEditorElement( premitigatedFixture );
		expect( editorState.className ).toContain( COMPATIBILITY_CLASS );
		expect( editorState.color ).toBe( expected );

		const saved = await requestUtils.rest( {
			path: `/wp/v2/posts/${ post.id }?context=edit`,
		} );
		expect( saved.content.raw ).not.toContain( COMPATIBILITY_CLASS );
		expect( saved.content.raw ).not.toContain( COMPATIBILITY_PROPERTY );
		expect( saved.content.raw ).not.toContain( 'phase5-theme-compat-text' );

		await page.goto( saved.link );
		const frontend = await inspectFrontendElement(
			page.getByText( 'Premitigated collision fixture', { exact: true } )
		);
		expect( frontend.color ).toBe( expected );
		expect( frontend.className ).toContain( COMPATIBILITY_CLASS );
		expect( frontend.className ).toContain( 'phase5-theme-compat-text' );
		expect(
			frontend.className.match( /acl-block-opacity-compat-text/g )
		).toHaveLength( 1 );
		expect(
			frontend.style.match( /--acl-block-opacity-text-color/g )
		).toHaveLength( 1 );
		expect(
			frontend.style.match( /--phase5-theme-text-color/g )
		).toHaveLength( 1 );
	} );
} );
