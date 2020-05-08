/**
 * @author mrdoob / http://mrdoob.com/
 */

import { UIPanel, UIBreak, UIRow, UIColor, UISelect, UIText, UINumber } from './libs/ui.js';
import { UIOutliner, UITexture, UICubeTexture } from './libs/ui.three.js';

var SidebarScene = function ( editor ) {
	
	var signals = editor.signals;
	var strings = editor.strings;

	var container = new UIPanel();
	container.setBorderTop( '0' );
	container.setPaddingTop( '20px' );

	// outliner
	//构建选项（对象、是否可以拖拽）
	function buildOption( object, draggable ) {
		
		var option = document.createElement( 'div' );
		option.draggable = draggable;
		option.innerHTML = buildHTML( object );
		option.value = object.id;

		return option;

	}
	//获取材质名称
	function getMaterialName( material ) {
		//如果材质是数组
		if ( Array.isArray( material ) ) {

			var array = [];
			//遍历材质（获取材质名称）
			for ( var i = 0; i < material.length; i ++ ) {

				array.push( material[ i ].name );

			}
			//，号分割材质名称
			return array.join( ',' );

		}

		return material.name;

	}
	//替换到名称当中的特殊字符
	function escapeHTML( html ) {
		
		return html
			.replace( /&/g, '&amp;' )
			.replace( /"/g, '&quot;' )
			.replace( /'/g, '&#39;' )
			.replace( /</g, '&lt;' )
			.replace( />/g, '&gt;' );

	}
	//对象名称--几何体名称--材质名称--脚本名称，这些东西组成了tree的一行
	//对象可以是camera、scene、object、mesh
	function buildHTML( object ) {
		//对象的类型
		var html = '<span class="type ' + object.type + '"></span> ' + escapeHTML( object.name );
		//如果对象时mesh
		if ( object.isMesh ) {
			//对象的几何体、材质
			var geometry = object.geometry;
			var material = object.material;
			//对象当中的几何体名称、材质名称
			html += ' <span class="type ' + geometry.type + '"></span> ' + escapeHTML( geometry.name );
			html += ' <span class="type ' + material.type + '"></span> ' + escapeHTML( getMaterialName( material ) );

		}
		//获取脚本
		html += getScript( object.uuid );

		return html;

	}
	//获取对象关联的脚本（如果存在）
	function getScript( uuid ) {
		
		if ( editor.scripts[ uuid ] !== undefined ) {

			return ' <span class="type Script"></span>';

		}

		return '';

	}
	//忽略选择的对象时使用
	var ignoreObjectSelectedSignal = false;

	var outliner = new UIOutliner( editor );
	outliner.setId( 'outliner' );
	//侧边栏场景导航下对象切换进入 //添加改变事件
	outliner.onChange( function () {
		//忽略对象被选择
		ignoreObjectSelectedSignal = true;
		//设置选择的对象？？
		editor.selectById( parseInt( outliner.getValue() ) );
		//启用对象被选择
		ignoreObjectSelectedSignal = false;

	} );
	//侧边栏场景导航下双击对象放大到当前对象展示
	outliner.onDblClick( function () {
		//关注选择的对象
		editor.focusById( parseInt( outliner.getValue() ) );

	} );
	container.add( outliner ); //添加到面板当中
	container.add( new UIBreak() ); //创建分割线

	// background

	function onBackgroundChanged() {
		
		signals.sceneBackgroundChanged.dispatch(
			backgroundType.getValue(),
			backgroundColor.getHexValue(),
			backgroundTexture.getValue(),
			backgroundCubeTexture.getValue(),
			backgroundEquirectTexture.getValue()
		);

	}
	//背景为texture时改变时进入
	function onTextureChanged( texture ) {
		
		texture.encoding = texture.isHDRTexture ? THREE.RGBEEncoding : THREE.sRGBEncoding;

		if ( texture.isCubeTexture && texture.isHDRTexture ) {

			texture.format = THREE.RGBAFormat;
			texture.minFilter = THREE.NearestFilter;
			texture.magFilter = THREE.NearestFilter;
			texture.generateMipmaps = false;

		}

		onBackgroundChanged();

	}

	var backgroundRow = new UIRow();

	var backgroundType = new UISelect().setOptions( {

		'None': 'None',
		'Color': 'Color',
		'Texture': 'Texture',
		'CubeTexture': 'CubeTexture',
		'Equirect': 'Equirect (HDR)'

	} ).setWidth( '150px' );
	//背景类型改变时进入
	backgroundType.onChange( function () {
		
		onBackgroundChanged();
		refreshBackgroundUI();

	} );
	backgroundType.setValue( 'Color' );

	backgroundRow.add( new UIText( strings.getKey( 'sidebar/scene/background' ) ).setWidth( '90px' ) );
	backgroundRow.add( backgroundType );

	container.add( backgroundRow );

	//背景为color时的颜色选择

	var colorRow = new UIRow();
	colorRow.setMarginLeft( '90px' );

	var backgroundColor = new UIColor().setValue( '#aaaaaa' ).onChange( onBackgroundChanged );
	colorRow.add( backgroundColor );

	container.add( colorRow );

	//背景为texture时的背景选择

	var textureRow = new UIRow();
	textureRow.setDisplay( 'none' );
	textureRow.setMarginLeft( '90px' );

	var backgroundTexture = new UITexture().onChange( onTextureChanged );
	textureRow.add( backgroundTexture );

	container.add( textureRow );

	//背景为CubeTexture时的图片选择

	var cubeTextureRow = new UIRow();
	cubeTextureRow.setDisplay( 'none' );
	cubeTextureRow.setMarginLeft( '90px' );

	var backgroundCubeTexture = new UICubeTexture().onChange( onTextureChanged );
	cubeTextureRow.add( backgroundCubeTexture );

	container.add( cubeTextureRow );

	//背景为Equirect时的图片选择

	var equirectRow = new UIRow();
	equirectRow.setDisplay( 'none' );
	equirectRow.setMarginLeft( '90px' );

	var backgroundEquirectTexture = new UITexture().onChange( onTextureChanged );
	equirectRow.add( backgroundEquirectTexture );

	container.add( equirectRow );

	//

	function refreshBackgroundUI() {
		
		var type = backgroundType.getValue();

		colorRow.setDisplay( type === 'Color' ? '' : 'none' );
		textureRow.setDisplay( type === 'Texture' ? '' : 'none' );
		cubeTextureRow.setDisplay( type === 'CubeTexture' ? '' : 'none' );
		equirectRow.setDisplay( type === 'Equirect' ? '' : 'none' );

	}

	// fog

	function onFogChanged() {
		
		signals.sceneFogChanged.dispatch(
			fogType.getValue(), //雾类型
			fogColor.getHexValue(), //雾的颜色
			fogNear.getValue(), //雾的近面
			fogFar.getValue(), //雾的远面
			fogDensity.getValue() //雾的衰减
		);

	}

	var fogTypeRow = new UIRow();
	var fogType = new UISelect().setOptions( {

		'None': 'None',	//不使用雾
		'Fog': 'Linear', //线性雾
		'FogExp2': 'Exponential' //扩展的雾

	} ).setWidth( '150px' );
	//雾类型改变时
	fogType.onChange( function () {
		
		onFogChanged();
		refreshFogUI();

	} );

	fogTypeRow.add( new UIText( strings.getKey( 'sidebar/scene/fog' ) ).setWidth( '90px' ) );
	fogTypeRow.add( fogType );

	container.add( fogTypeRow );

	// fog color

	var fogPropertiesRow = new UIRow();
	fogPropertiesRow.setDisplay( 'none' );
	fogPropertiesRow.setMarginLeft( '90px' );
	container.add( fogPropertiesRow );

	var fogColor = new UIColor().setValue( '#aaaaaa' );
	fogColor.onChange( onFogChanged );
	fogPropertiesRow.add( fogColor );

	// fog near

	var fogNear = new UINumber( 0.1 ).setWidth( '40px' ).setRange( 0, Infinity ).onChange( onFogChanged );
	fogPropertiesRow.add( fogNear );

	// fog far

	var fogFar = new UINumber( 50 ).setWidth( '40px' ).setRange( 0, Infinity ).onChange( onFogChanged );
	fogPropertiesRow.add( fogFar );

	// fog density

	var fogDensity = new UINumber( 0.05 ).setWidth( '40px' ).setRange( 0, 0.1 ).setStep( 0.001 ).setPrecision( 3 ).onChange( onFogChanged );
	fogPropertiesRow.add( fogDensity );

	//进入时或者更改背景或雾时刷新

	function refreshUI() {
		
		var camera = editor.camera;
		var scene = editor.scene;

		var options = [];
		//相机、场景的大纲项
		options.push( buildOption( camera, false ) );
		options.push( buildOption( scene, false ) );
		//对象的大纲项
		( function addObjects( objects, pad ) {
			//遍历场景子节点列表
			for ( var i = 0, l = objects.length; i < l; i ++ ) {
				//获取一个对象
				var object = objects[ i ];
				// /构建选项
				var option = buildOption( object, true );
				option.style.paddingLeft = ( pad * 10 ) + 'px'; //距离左边的间距
				options.push( option );
				//递归添加
				addObjects( object.children, pad + 1 );

			}

		} )( scene.children, 1 );
		// 大纲中设置选项
		outliner.setOptions( options );
		//编辑器中选择的对象不为nul
		if ( editor.selected !== null ) {

			outliner.setValue( editor.selected.id );

		}
		//场景背景改变
		if ( scene.background ) {

			if ( scene.background.isColor ) {

				backgroundType.setValue( "Color" );
				backgroundColor.setHexValue( scene.background.getHex() );
				backgroundTexture.setValue( null );
				backgroundCubeTexture.setValue( null );
				backgroundEquirectTexture.setValue( null );

			} else if ( scene.background.isTexture && ! scene.background.isPmremTexture ) {

				backgroundType.setValue( "Texture" );
				backgroundTexture.setValue( scene.background );
				backgroundCubeTexture.setValue( null );
				backgroundEquirectTexture.setValue( null );

			} else if ( scene.background.isCubeTexture ) {

				backgroundType.setValue( "CubeTexture" );
				backgroundCubeTexture.setValue( scene.background );
				backgroundTexture.setValue( null );
				backgroundEquirectTexture.setValue( null );

			}

		} else {

			backgroundType.setValue( "None" );
			backgroundTexture.setValue( null );

		}

		if ( scene.fog ) {

			fogColor.setHexValue( scene.fog.color.getHex() );

			if ( scene.fog.isFog ) {

				fogType.setValue( "Fog" );
				fogNear.setValue( scene.fog.near );
				fogFar.setValue( scene.fog.far );

			} else if ( scene.fog.isFogExp2 ) {

				fogType.setValue( "FogExp2" );
				fogDensity.setValue( scene.fog.density );

			}

		} else {

			fogType.setValue( "None" );

		}

		refreshBackgroundUI();
		refreshFogUI();

	}

	function refreshFogUI() {
		
		var type = fogType.getValue();

		fogPropertiesRow.setDisplay( type === 'None' ? 'none' : '' );
		fogNear.setDisplay( type === 'Fog' ? '' : 'none' );
		fogFar.setDisplay( type === 'Fog' ? '' : 'none' );
		fogDensity.setDisplay( type === 'FogExp2' ? '' : 'none' );

	}

	refreshUI();

	// events

	signals.editorCleared.add( refreshUI );
	//向场景区域添加或者删除对象的时候执行
	signals.sceneGraphChanged.add( refreshUI );
	//选择对象改变时执行
	signals.objectChanged.add( function ( object ) {
		
		var options = outliner.options;

		for ( var i = 0; i < options.length; i ++ ) {

			var option = options[ i ];

			if ( option.value === object.id ) {

				option.innerHTML = buildHTML( object );
				return;

			}

		}

	} );
	//选择某个对象的时候执行（场景中选择或者侧边栏选择）
	signals.objectSelected.add( function ( object ) {
		
		if ( ignoreObjectSelectedSignal === true ) return;

		outliner.setValue( object !== null ? object.id : null );

	} );

	return container;

};

export { SidebarScene };
