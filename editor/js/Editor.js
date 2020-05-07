/**
 * @author mrdoob / http://mrdoob.com/
 */

import * as THREE from '../../build/three.module.js';

import { Config } from './Config.js';
import { Loader } from './Loader.js';
import { History as _History } from './History.js';
import { Strings } from './Strings.js';
import { Storage as _Storage } from './Storage.js';

var Editor = function () {

	this.DEFAULT_CAMERA = new THREE.PerspectiveCamera( 50, 1, 0.01, 1000 );
	this.DEFAULT_CAMERA.name = 'Camera';
	this.DEFAULT_CAMERA.position.set( 0, 5, 10 );
	this.DEFAULT_CAMERA.lookAt( new THREE.Vector3() );
	//信号库
	var Signal = signals.Signal;
	//各种信号（信号中心，都是通过editor中定义的全局变量来在各个组件中共享的）
	this.signals = {

		// script
		// 脚本监听
		editScript: new Signal(),

		// player
		// 播放器开始、停止监听
		startPlayer: new Signal(),
		stopPlayer: new Signal(),

		// notifications

		editorCleared: new Signal(),
		//开始保存监听、保存完成监听
		savingStarted: new Signal(),
		savingFinished: new Signal(),
		//变换改变监听（平移、旋转、缩放）
		transformModeChanged: new Signal(),
		snapChanged: new Signal(),
		spaceChanged: new Signal(),
		rendererChanged: new Signal(),
		rendererUpdated: new Signal(),
		//场景背景改变监听、雾监听、场景图改变监听
		sceneBackgroundChanged: new Signal(),
		sceneFogChanged: new Signal(),
		sceneGraphChanged: new Signal(),
		sceneRendered: new Signal(),
		//相机改变监听
		cameraChanged: new Signal(),
		//几何数据改变监听
		geometryChanged: new Signal(),
		//选择对象、设置焦点对象监听
		objectSelected: new Signal(),
		objectFocused: new Signal(),
		//对象的添加、改变、移除监听
		objectAdded: new Signal(),
		objectChanged: new Signal(),
		objectRemoved: new Signal(),

		cameraAdded: new Signal(),
		cameraRemoved: new Signal(),
		//添加、移除辅助信息监听
		helperAdded: new Signal(),
		helperRemoved: new Signal(),
		//材质添加、改变、移除监听
		materialAdded: new Signal(),
		materialChanged: new Signal(),
		materialRemoved: new Signal(),
		//添加、改变、移除脚本监听
		scriptAdded: new Signal(),
		scriptChanged: new Signal(),
		scriptRemoved: new Signal(),

		windowResize: new Signal(),
		// 网格监听、刷新边栏监听、历史改变监听
		showGridChanged: new Signal(),
		refreshSidebarObject3D: new Signal(),
		historyChanged: new Signal(),

		viewportCameraChanged: new Signal()

	};
	//配置类（配置的信息保存在浏览器的localstring中）
	this.config = new Config();
	//历史类
	this.history = new _History( this );
	//存储类，封装了浏览器数据库的操作
	this.storage = new _Storage();
	//编辑器ui中的所有文本信息
	this.strings = new Strings( this.config );
	//文件加载器，可以加载模型、发布的json文件、压缩文件
	this.loader = new Loader( this );
	//克隆相机
	this.camera = this.DEFAULT_CAMERA.clone();
	//创建场景
	this.scene = new THREE.Scene();
	this.scene.name = 'Scene';
	this.scene.background = new THREE.Color( 0xaaaaaa );
	//创建辅助场景展示的模型
	this.sceneHelpers = new THREE.Scene();
	//场景中所有的对象、几何体、材质、纹理、脚本
	this.object = {};
	this.geometries = {};
	this.materials = {};
	this.textures = {};
	this.scripts = {};

	this.materialsRefCounter = new Map(); // tracks how often is a material used by a 3D object
	//所有的动画
	this.animations = {};
	//创建一个混合器，所有的动画骨骼名称对应的mesh都会在整个场景中查找
	this.mixer = new THREE.AnimationMixer( this.scene );
	//选择的对象、所有的辅助的东西
	this.selected = null;
	this.helpers = {};

	this.cameras = {};
	this.viewportCamera = this.camera;

	this.addCamera( this.camera );

};

Editor.prototype = {
	//设置场景
	setScene: function ( scene ) {

		this.scene.uuid = scene.uuid;
		this.scene.name = scene.name;

		this.scene.background = ( scene.background !== null ) ? scene.background.clone() : null;

		if ( scene.fog !== null ) this.scene.fog = scene.fog.clone();

		this.scene.userData = JSON.parse( JSON.stringify( scene.userData ) );

		// avoid render per object
		//禁用场景图改变
		this.signals.sceneGraphChanged.active = false;
		//场景的子节点
		while ( scene.children.length > 0 ) {
			//添加子节点
			this.addObject( scene.children[ 0 ] );

		}
		//启用场景图改变
		this.signals.sceneGraphChanged.active = true;
		this.signals.sceneGraphChanged.dispatch();

	},

	//
	//新建一个对象
	addObject: function ( object, parent, index ) {

		var scope = this;
		//遍历对象
		object.traverse( function ( child ) {
			//存储所有的几何数据、材质数据
			if ( child.geometry !== undefined ) scope.addGeometry( child.geometry );
			if ( child.material !== undefined ) scope.addMaterial( child.material );

			scope.addCamera( child );
			scope.addHelper( child );

		} );

		if ( parent === undefined ) {
			//对象添加到场景中
			this.scene.add( object );

		} else {

			parent.children.splice( index, 0, object );
			object.parent = parent;

		}
		//派发消息
		this.signals.objectAdded.dispatch( object );
		this.signals.sceneGraphChanged.dispatch();

	},
	//移动对象（主要是材质场景树，将一个模型变为另一个模型的子节点）
	moveObject: function ( object, parent, before ) {

		if ( parent === undefined ) {

			parent = this.scene;

		}

		parent.add( object );

		// sort children array

		if ( before !== undefined ) {

			var index = parent.children.indexOf( before );
			parent.children.splice( index, 0, object );
			parent.children.pop();

		}

		this.signals.sceneGraphChanged.dispatch();

	},
	//重命名对象
	nameObject: function ( object, name ) {

		object.name = name;
		this.signals.sceneGraphChanged.dispatch();

	},
	//删除所有的对象
	removeObject: function ( object ) {
		//没有父节点，就返回
		if ( object.parent === null ) return; // avoid deleting the camera or scene

		var scope = this;
		//遍历对象、移除所有的辅助
		object.traverse( function ( child ) {

			scope.removeCamera( child );
			scope.removeHelper( child );

			if ( child.material !== undefined ) scope.removeMaterial( child.material );

		} );
		//移除该对象
		object.parent.remove( object );
		//对象移除事件、场景图改变事件
		this.signals.objectRemoved.dispatch( object );
		this.signals.sceneGraphChanged.dispatch();

	},
	//添加几何数据
	addGeometry: function ( geometry ) {
		//所有的几何数据都存储在这里了（几何数据id--几何数据）
		this.geometries[ geometry.uuid ] = geometry;

	},
	//设置几何数据名称
	setGeometryName: function ( geometry, name ) {

		geometry.name = name;
		this.signals.sceneGraphChanged.dispatch();

	},
	//添加材质
	addMaterial: function ( material ) {

		if ( Array.isArray( material ) ) {

			for ( var i = 0, l = material.length; i < l; i ++ ) {

				this.addMaterialToRefCounter( material[ i ] );

			}

		} else {

			this.addMaterialToRefCounter( material );

		}

		this.signals.materialAdded.dispatch();

	},

	addMaterialToRefCounter: function ( material ) {

		var materialsRefCounter = this.materialsRefCounter;

		var count = materialsRefCounter.get( material );

		if ( count === undefined ) {

			materialsRefCounter.set( material, 1 );
			this.materials[ material.uuid ] = material;

		} else {

			count ++;
			materialsRefCounter.set( material, count );

		}

	},

	removeMaterial: function ( material ) {

		if ( Array.isArray( material ) ) {

			for ( var i = 0, l = material.length; i < l; i ++ ) {

				this.removeMaterialFromRefCounter( material[ i ] );

			}

		} else {

			this.removeMaterialFromRefCounter( material );

		}

		this.signals.materialRemoved.dispatch();

	},

	removeMaterialFromRefCounter: function ( material ) {

		var materialsRefCounter = this.materialsRefCounter;

		var count = materialsRefCounter.get( material );
		count --;

		if ( count === 0 ) {

			materialsRefCounter.delete( material );
			delete this.materials[ material.uuid ];

		} else {

			materialsRefCounter.set( material, count );

		}

	},

	getMaterialById: function ( id ) {

		var material;
		var materials = Object.values( this.materials );

		for ( var i = 0; i < materials.length; i ++ ) {

			if ( materials[ i ].id === id ) {

				material = materials[ i ];
				break;

			}

		}

		return material;

	},

	setMaterialName: function ( material, name ) {

		material.name = name;
		this.signals.sceneGraphChanged.dispatch();

	},
	//添加纹理
	addTexture: function ( texture ) {
		//场景中所有的纹理都存在这里了（纹理id---纹理）
		this.textures[ texture.uuid ] = texture;

	},
	//添加动画
	addAnimation: function ( object, animations ) {

		if ( animations.length > 0 ) {
			//场景中所有的动画都存储在这里了（对象id---对象动画）
			this.animations[ object.uuid ] = animations;

		}

	},

	//

	addCamera: function ( camera ) {

		if ( camera.isCamera ) {

			this.cameras[ camera.uuid ] = camera;

			this.signals.cameraAdded.dispatch( camera );

		}

	},

	removeCamera: function ( camera ) {

		if ( this.cameras[ camera.uuid ] !== undefined ) {

			delete this.cameras[ camera.uuid ];

			this.signals.cameraRemoved.dispatch( camera );

		}

	},

	//

	addHelper: function () {

		var geometry = new THREE.SphereBufferGeometry( 2, 4, 2 );
		var material = new THREE.MeshBasicMaterial( { color: 0xff0000, visible: false } );

		return function ( object ) {

			var helper;

			if ( object.isCamera ) {

				helper = new THREE.CameraHelper( object );

			} else if ( object.isPointLight ) {

				helper = new THREE.PointLightHelper( object, 1 );

			} else if ( object.isDirectionalLight ) {

				helper = new THREE.DirectionalLightHelper( object, 1 );

			} else if ( object.isSpotLight ) {

				helper = new THREE.SpotLightHelper( object, 1 );

			} else if ( object.isHemisphereLight ) {

				helper = new THREE.HemisphereLightHelper( object, 1 );

			} else if ( object.isSkinnedMesh ) {

				helper = new THREE.SkeletonHelper( object.skeleton.bones[ 0 ] );

			} else {

				// no helper for this object type
				return;

			}

			var picker = new THREE.Mesh( geometry, material );
			picker.name = 'picker';
			picker.userData.object = object;
			helper.add( picker );

			this.sceneHelpers.add( helper );
			this.helpers[ object.id ] = helper;

			this.signals.helperAdded.dispatch( helper );

		};

	}(),

	removeHelper: function ( object ) {

		if ( this.helpers[ object.id ] !== undefined ) {

			var helper = this.helpers[ object.id ];
			helper.parent.remove( helper );

			delete this.helpers[ object.id ];

			this.signals.helperRemoved.dispatch( helper );

		}

	},

	//

	addScript: function ( object, script ) {

		if ( this.scripts[ object.uuid ] === undefined ) {

			this.scripts[ object.uuid ] = [];

		}

		this.scripts[ object.uuid ].push( script );

		this.signals.scriptAdded.dispatch( script );

	},

	removeScript: function ( object, script ) {

		if ( this.scripts[ object.uuid ] === undefined ) return;

		var index = this.scripts[ object.uuid ].indexOf( script );

		if ( index !== - 1 ) {

			this.scripts[ object.uuid ].splice( index, 1 );

		}

		this.signals.scriptRemoved.dispatch( script );

	},
	//获取对象的材质
	getObjectMaterial: function ( object, slot ) {

		var material = object.material;
		//是否材质数组
		if ( Array.isArray( material ) && slot !== undefined ) {
			//按照材质索引获取材质
			material = material[ slot ];

		}

		return material;

	},
	//对象赋予新的材质，对象可能有多个材质，可以对每一个材质单独设置
	setObjectMaterial: function ( object, slot, newMaterial ) {
		//材质数组
		if ( Array.isArray( object.material ) && slot !== undefined ) {

			object.material[ slot ] = newMaterial;

		} else {
			//唯一材质
			object.material = newMaterial;

		}

	},

	setViewportCamera: function ( uuid ) {

		this.viewportCamera = this.cameras[ uuid ];
		this.signals.viewportCameraChanged.dispatch( this.viewportCamera );

	},

	//
	//选择对象时调用
	select: function ( object ) {
		//如果选择的对象是自己就返回
		if ( this.selected === object ) return;

		var uuid = null;

		if ( object !== null ) {

			uuid = object.uuid;

		}
		//设置为选择的对象
		this.selected = object;
		//config应该是一个配置文件，可能是关联了localstring
		this.config.setKey( 'selected', uuid );
		this.signals.objectSelected.dispatch( object );

	},
	//通过id选择对象
	selectById: function ( id ) {
		//如果选择的是相机
		if ( id === this.camera.id ) {

			this.select( this.camera );
			return;

		}

		this.select( this.scene.getObjectById( id, true ) );

	},
	//通过uuid选择对象
	selectByUuid: function ( uuid ) {

		var scope = this;

		this.scene.traverse( function ( child ) {

			if ( child.uuid === uuid ) {

				scope.select( child );

			}

		} );

	},
	//撤销选择对象
	deselect: function () {

		this.select( null );

	},
	//聚焦对象
	focus: function ( object ) {

		if ( object !== undefined ) {

			this.signals.objectFocused.dispatch( object );

		}

	},
	//通过id聚焦对象
	focusById: function ( id ) {

		this.focus( this.scene.getObjectById( id, true ) );

	},

	clear: function () {
		//清除历史、清除存储
		this.history.clear();
		this.storage.clear();
		//相机默认、背景默认、雾默认
		this.camera.copy( this.DEFAULT_CAMERA );
		this.scene.name = "Scene";
		this.scene.userData = {};
		this.scene.background = new THREE.Color( 0xaaaaaa );
		this.scene.fog = null;

		var objects = this.scene.children;
		//遍历场景中的对象
		while ( objects.length > 0 ) {
			//删除对象
			this.removeObject( objects[ 0 ] );

		}
		//几何数据、材质数据、纹理数据、脚本数据都删除
		this.geometries = {};
		this.materials = {};
		this.textures = {};
		this.scripts = {};

		this.materialsRefCounter.clear();
		//动画置空，停止所有的动画
		this.animations = {};
		this.mixer.stopAllAction();
		//选择置空
		this.deselect();
		//清除所有的编辑项
		this.signals.editorCleared.dispatch();

	},

	//

	fromJSON: function ( json ) {

		var scope = this;
		//创建对象解析器
		var loader = new THREE.ObjectLoader();
		var camera = loader.parse( json.camera );
		//设置相机参数
		this.camera.copy( camera );
		this.camera.aspect = this.DEFAULT_CAMERA.aspect;
		this.camera.updateProjectionMatrix();
		//解析历史、脚本
		this.history.fromJSON( json.history );
		this.scripts = json.scripts;

		loader.parse( json.scene, function ( scene ) {
			//解析场景
			scope.setScene( scene );

		} );

	},

	toJSON: function () {

		// scripts clean up

		var scene = this.scene;
		var scripts = this.scripts;
		//遍历场景中所有脚本的key-value（对象名称--脚本）
		for ( var key in scripts ) {
			//获取一个对象的所有脚本
			var script = scripts[ key ];
			//如果没有这个脚本就删除
			if ( script.length === 0 || scene.getObjectByProperty( 'uuid', key ) === undefined ) {

				delete scripts[ key ];

			}

		}

		//

		return {

			metadata: {},
			project: {
				shadows: this.config.getKey( 'project/renderer/shadows' ),
				vr: this.config.getKey( 'project/vr' )
			},
			camera: this.camera.toJSON(),
			scene: this.scene.toJSON(),
			scripts: this.scripts,
			history: this.history.toJSON()

		};

	},

	objectByUuid: function ( uuid ) {
		//根据uuid获取一个对象
		return this.scene.getObjectByProperty( 'uuid', uuid, true );

	},
	//执行命令
	execute: function ( cmd, optionalName ) {
		//首先添加到执行列表中，等待执行
		this.history.execute( cmd, optionalName );

	},

	undo: function () {
		//撤销上一个命令
		this.history.undo();

	},

	redo: function () {
		//重做上一个命令
		this.history.redo();

	}

};

export { Editor };
