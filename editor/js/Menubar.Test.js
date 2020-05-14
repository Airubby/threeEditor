/**
 * @author mrdoob / http://mrdoob.com/
 */

import * as THREE from '../../build/three.module.js';

import { UIPanel, UIRow, UIHorizontalRule } from './libs/ui.js';

import { AddObjectCommand } from './commands/AddObjectCommand.js';

var MenubarTest = function ( editor ) {

	var strings = editor.strings;

	var container = new UIPanel();
	container.setClass( 'menu' );

	var title = new UIPanel();
	title.setClass( 'title' );
	title.setTextContent( strings.getKey( 'menubar/test' ) );
	container.add( title );

	var options = new UIPanel();
	options.setClass( 'options' );
	container.add( options );

	// Box
	var items = [
		{ title: 'menubar/test/box', file: 'test.jigui.json' }
	];
	var loader = new THREE.FileLoader();
	for ( var i = 0; i < items.length; i ++ ) {

		( function ( i ) {

			var item = items[ i ];

			var option = new UIRow();
			option.setClass( 'option' );
			option.setTextContent( strings.getKey( item.title ) );
			option.onClick( function () {
				loader.load( 'examples/' + item.file, function ( text ) {
					console.log(text)
					var mesh = new THREE.Mesh(text.geometries, text.materials);
					// editor.execute( new AddObjectCommand( editor, mesh ) );

				} );
			} );
			options.add( option );

		} )( i );

	}

	return container;

};

export { MenubarTest };
