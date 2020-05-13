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

	var option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/add/box' ) );
	option.onClick( function () {

		// var geometry = new THREE.BoxBufferGeometry( 1, 1, 1, 1, 1, 1 );
		// var mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial() );
		// mesh.name = 'Box';

		// editor.execute( new AddObjectCommand( editor, mesh ) );
		editor.loader.loadFiles('../examples/test.jigui.json');

	} );
	options.add( option );
	
	return container;

};

export { MenubarTest };
