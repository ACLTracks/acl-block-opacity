const { expect } = require( '@playwright/test' );

function currentGmtDate() {
	return new Date().toISOString().replace( /\.\d{3}Z$/, '' );
}

async function createFixturePost( requestUtils, title, content ) {
	return requestUtils.createPost( {
		content,
		date_gmt: currentGmtDate(),
		status: 'publish',
		title: `[ACL Opacity E2E] ${ title } ${ Date.now() }`,
	} );
}

async function deleteFixturePost( requestUtils, postId ) {
	await requestUtils.rest( {
		method: 'DELETE',
		path: `/wp/v2/posts/${ postId }?force=true`,
	} );
}

async function retryWordPressRequest( operation, attempts = 3 ) {
	let lastError;

	for ( let attempt = 0; attempt < attempts; attempt++ ) {
		try {
			return await operation();
		} catch ( error ) {
			lastError = error;
			await new Promise( ( resolve ) => setTimeout( resolve, 1_000 ) );
		}
	}

	throw lastError;
}

async function dismissEditorWelcome( page ) {
	const dialog = page.getByRole( 'dialog', {
		name: 'Welcome to the editor',
	} );

	if ( await dialog.isVisible().catch( () => false ) ) {
		await dialog.getByRole( 'button', { name: 'Close' } ).click();
	}
}

async function waitForEditor( page ) {
	await page.waitForFunction(
		() =>
			window.wp?.data?.select( 'core/block-editor' )?.getBlocks()
				?.length > 0
	);
}

async function selectBlock( page, matcher ) {
	const selected = await page.evaluate( ( requested ) => {
		const flatten = ( blocks ) =>
			blocks.flatMap( ( block ) => [
				block,
				...flatten( block.innerBlocks || [] ),
			] );
		const blocks = flatten(
			window.wp.data.select( 'core/block-editor' ).getBlocks()
		);
		const matches = blocks.filter( ( block ) => {
			if ( requested.name && block.name !== requested.name ) {
				return false;
			}

			if (
				requested.content &&
				! String(
					block.attributes.content || block.attributes.text || ''
				).includes( requested.content )
			) {
				return false;
			}

			return true;
		} );
		const block = matches[ requested.index || 0 ];

		if ( ! block ) {
			return null;
		}

		window.wp.data
			.dispatch( 'core/block-editor' )
			.selectBlock( block.clientId );

		return { clientId: block.clientId, name: block.name };
	}, matcher );

	expect( selected ).not.toBeNull();

	const settingsButton = page.getByRole( 'button', {
		name: 'Settings',
		exact: true,
	} );

	if (
		( await settingsButton.isVisible().catch( () => false ) ) &&
		( await settingsButton.getAttribute( 'aria-pressed' ) ) !== 'true'
	) {
		await settingsButton.click();
	}

	const blockTab = page.getByRole( 'tab', { name: 'Block', exact: true } );

	if ( await blockTab.isVisible().catch( () => false ) ) {
		await blockTab.click();
	}

	const blockPanel = page.getByRole( 'tabpanel', { name: 'Block' } );
	const settingsTab = blockPanel.getByRole( 'tab', {
		name: 'Settings',
		exact: true,
	} );

	if ( await settingsTab.isVisible().catch( () => false ) ) {
		await settingsTab.click();
	}

	return selected;
}

async function getSelectedAttributes( page ) {
	return page.evaluate( () => {
		const editor = window.wp.data.select( 'core/block-editor' );
		const clientId = editor.getSelectedBlockClientId();

		return editor.getBlockAttributes( clientId );
	} );
}

async function getBlockRecords( page ) {
	return page.evaluate( () => {
		const flatten = ( blocks ) =>
			blocks.flatMap( ( block ) => [
				{
					attributes: block.attributes,
					clientId: block.clientId,
					name: block.name,
				},
				...flatten( block.innerBlocks || [] ),
			] );

		return flatten(
			window.wp.data.select( 'core/block-editor' ).getBlocks()
		);
	} );
}

async function setOpacity( page, label, value ) {
	const slider = page.getByRole( 'slider', { name: label, exact: true } );

	await expect( slider ).toBeVisible();
	await slider.fill( String( value ) );
	await expect( slider ).toHaveValue( String( value ) );
}

async function savePost( page ) {
	const save = page.getByRole( 'button', { name: 'Save', exact: true } );
	let lastError;

	await expect( save ).toBeEnabled();

	for ( let attempt = 0; attempt < 2; attempt++ ) {
		await save.click();

		try {
			await expect
				.poll(
					() =>
						page.evaluate( () =>
							window.wp.data
								.select( 'core/editor' )
								.hasChangedContent()
						),
					{ timeout: 30_000 }
				)
				.toBe( false );
			await page.waitForTimeout( 500 );
			return;
		} catch ( error ) {
			lastError = error;
		}
	}

	throw lastError;
}

module.exports = {
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
};
