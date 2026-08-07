( function ( blocks, blockEditor, element, i18n ) {
	const { registerBlockType } = blocks;
	const { RichText, useBlockProps } = blockEditor;
	const { createElement } = element;
	const { __ } = i18n;

	registerBlockType( 'acl-opacity-e2e/standard-color', {
		apiVersion: 3,
		attributes: {
			content: {
				selector: 'p',
				source: 'html',
				type: 'string',
			},
		},
		category: 'text',
		edit: function Edit( props ) {
			return createElement( RichText, {
				...useBlockProps(),
				onChange: function onChange( content ) {
					props.setAttributes( { content } );
				},
				placeholder: __(
					'Standard color fixture',
					'acl-block-opacity'
				),
				tagName: 'p',
				value: props.attributes.content,
			} );
		},
		icon: 'art',
		name: 'acl-opacity-e2e/standard-color',
		save: function Save( props ) {
			return createElement( RichText.Content, {
				...useBlockProps.save(),
				tagName: 'p',
				value: props.attributes.content,
			} );
		},
		supports: {
			color: {
				background: true,
				gradients: false,
				text: true,
			},
			html: false,
		},
		title: __( 'Standard Color Fixture', 'acl-block-opacity' ),
	} );
} )(
	window.wp.blocks,
	window.wp.blockEditor,
	window.wp.element,
	window.wp.i18n
);
