/**
 * @author mrdoob / http://mrdoob.com/
 */

import * as THREE from '../../build/three.module.js';

import { TransformControls } from '../../examples/jsm/controls/TransformControls.js';

import { UIPanel } from './libs/ui.js';

import { EditorControls } from './EditorControls.js';

import { ViewportCamera } from './Viewport.Camera.js';
import { ViewportInfo } from './Viewport.Info.js';

import { SetPositionCommand } from './commands/SetPositionCommand.js';
import { SetRotationCommand } from './commands/SetRotationCommand.js';
import { SetScaleCommand } from './commands/SetScaleCommand.js';

var Viewport = function ( editor ) {
	
	var signals = editor.signals;

	var container = new UIPanel();
	container.setId( 'viewport' );
	container.setPosition( 'absolute' );

	container.add( new ViewportCamera( editor ) );
	container.add( new ViewportInfo( editor ) );

	//

	var renderer = null;
	var pmremGenerator = null;

	var camera = editor.camera;
	var scene = editor.scene;
	var sceneHelpers = editor.sceneHelpers;

	var objects = [];

	// helpers
	//场景中的辅助网格
	var grid = new THREE.GridHelper( 30, 30, 0x444444, 0x888888 );
	sceneHelpers.add( grid );
	//设置网格的颜色
	var array = grid.geometry.attributes.color.array;
	
	for ( var i = 0; i < array.length; i += 60 ) {

		for ( var j = 0; j < 12; j ++ ) {

			array[ i + j ] = 0.26;

		}

	}
	
	//
	//new 三维包围盒
	var box = new THREE.Box3();
	//选择物体的包围盒
	var selectionBox = new THREE.BoxHelper();
	selectionBox.material.depthTest = false; //禁用深度测试
	selectionBox.material.transparent = true; //包围盒透明
	selectionBox.visible = false; //不可见
	sceneHelpers.add( selectionBox );  //添加到辅助场景当中

	var objectPositionOnDown = null;
	var objectRotationOnDown = null;
	var objectScaleOnDown = null;
	//旋转、平移、缩放的控制按钮
	var transformControls = new TransformControls( camera, container.dom );
	//当变换控制改变时会引起包围盒变化、侧边栏改变(移入移出都会进入)
	transformControls.addEventListener( 'change', function () {
		
		//控制中的对象
		var object = transformControls.object;

		if ( object !== undefined ) {
			//关联选中的对象
			selectionBox.setFromObject( object );

			var helper = editor.helpers[ object.id ];

			if ( helper !== undefined && helper.isSkeletonHelper !== true ) {
				//更新辅助信息
				helper.update();

			}
			//更新侧边栏
			signals.refreshSidebarObject3D.dispatch( object );

		}
		//渲染
		render();

	} );
	//当“变换控制”鼠标按下时，获取对象的变换参量
	transformControls.addEventListener( 'mouseDown', function () {
		
		//获取对象
		var object = transformControls.object;
		//获取对象的位置、旋转、缩放
		objectPositionOnDown = object.position.clone();
		objectRotationOnDown = object.rotation.clone();
		objectScaleOnDown = object.scale.clone();
		//禁用场景中相机控制
		controls.enabled = false;

	} );
	//当“变换控制”鼠标抬起时，获取对象的变换参量
	transformControls.addEventListener( 'mouseUp', function () {
		
		var object = transformControls.object;

		if ( object !== undefined ) {
			//获取当前的操作模式
			switch ( transformControls.getMode() ) {
				//平移
				case 'translate':
					//鼠标按下的位置和抬起的位置不相同
					if ( ! objectPositionOnDown.equals( object.position ) ) {
						//创建位置改变命令
						editor.execute( new SetPositionCommand( editor, object, object.position, objectPositionOnDown ) );

					}

					break;
				//旋转
				case 'rotate':
					//鼠标抬起时旋转了
					if ( ! objectRotationOnDown.equals( object.rotation ) ) {
						//创建旋转命令
						editor.execute( new SetRotationCommand( editor, object, object.rotation, objectRotationOnDown ) );

					}

					break;
				//缩放
				case 'scale':
					//经过缩放了
					if ( ! objectScaleOnDown.equals( object.scale ) ) {
						//创建缩放命令
						editor.execute( new SetScaleCommand( editor, object, object.scale, objectScaleOnDown ) );

					}

					break;

			}

		}
		//启用场景中相机控制（转向、拉远拉近） EditorControls
		controls.enabled = true;

	} );
	//将控制部件加入到场景当中
	sceneHelpers.add( transformControls );

	// object picking
	//拾取对象的射线、鼠标位置
	var raycaster = new THREE.Raycaster();
	var mouse = new THREE.Vector2();

	// events
	//射线检测
	function getIntersects( point, objects ) {
		
		//通过鼠标点击的位置计算出raycaster所需要的点的位置，以dom元素中心为原点，值的范围为-1到1. 例如：以下
		// mouse.x = ( event.clientX / dom.innerWidth ) * 2 - 1;
        // mouse.y = - ( event.clientY / dom.innerHeight ) * 2 + 1;
		mouse.set( ( point.x * 2 ) - 1, - ( point.y * 2 ) + 1 );
		//射线检测
		raycaster.setFromCamera( mouse, camera );
		//返回拾取的对象信息
		return raycaster.intersectObjects( objects );

	}
	//鼠标按下、抬起、双击位置{x:"",y:""}
	var onDownPosition = new THREE.Vector2();
	var onUpPosition = new THREE.Vector2();
	var onDoubleClickPosition = new THREE.Vector2();
	//获取鼠标的位置
	function getMousePosition( dom, x, y ) {
		
		//返回dom元素的大小及其相对于视口的位置;由于兼容性问题（见下文），尽量仅使用 left, top, right, 和 bottom.属性是最安全的
		//x,y表示dom元素左上角距离body视窗的坐标；width、height变色dom元素的宽高；
		//top：元素上边框距离视窗顶部的的距离;bottom：元素下边框距离视窗顶部的的距离;left：元素左边框距离视窗左边的的距离;right：元素右边框距离视窗左部的的距离
		var rect = dom.getBoundingClientRect();
		return [ ( x - rect.left ) / rect.width, ( y - rect.top ) / rect.height ];

	}
	//3d面板中处理鼠标点击事件
	function handleClick() {
		
		//如果鼠标点击位置与鼠标抬起位置不变；onDownPosition和onUpPosition的距离为0；
		if ( onDownPosition.distanceTo( onUpPosition ) === 0 ) {
			//获取射线检测对象
			var intersects = getIntersects( onUpPosition, objects );

			if ( intersects.length > 0 ) {

				var object = intersects[ 0 ].object;
				//对象有自定义数据(灯的辅助对象)
				if ( object.userData.object !== undefined ) {

					// helper
					//选择对象(灯的辅助对象)
					editor.select( object.userData.object );

				} else {
					//选择对象
					editor.select( object );

				}

			} else {
				//不选择对象
				editor.select( null );

			}
			//刷新
			render();

		}

	}
	//3d面板中监听鼠标按下
	function onMouseDown( event ) {
		
		//阻止触发dom默认事件
		// event.preventDefault();
		//获取鼠标位置array[x的占宽比例，y的占高比例]
		var array = getMousePosition( container.dom, event.clientX, event.clientY );
		//将数组转为{x:array[0],y:array[1]}
		onDownPosition.fromArray( array );
		//添加鼠标抬起的监听
		document.addEventListener( 'mouseup', onMouseUp, false );

	}
	//3d面板中监听鼠标抬起
	function onMouseUp( event ) {
		
		//获取鼠标位置array[x的占宽比例，y的占高比例]
		var array = getMousePosition( container.dom, event.clientX, event.clientY );
		onUpPosition.fromArray( array );
		//处理鼠标点击
		handleClick();
		//移除鼠标抬起事件
		document.removeEventListener( 'mouseup', onMouseUp, false );

	}

	function onTouchStart( event ) {
		debugger
		var touch = event.changedTouches[ 0 ];

		var array = getMousePosition( container.dom, touch.clientX, touch.clientY );
		onDownPosition.fromArray( array );

		document.addEventListener( 'touchend', onTouchEnd, false );

	}

	function onTouchEnd( event ) {
		debugger
		var touch = event.changedTouches[ 0 ];

		var array = getMousePosition( container.dom, touch.clientX, touch.clientY );
		onUpPosition.fromArray( array );

		handleClick();

		document.removeEventListener( 'touchend', onTouchEnd, false );

	}
	//双击鼠标（面板上双击不变化，对象上双击放大展示当前对象）
	function onDoubleClick( event ) {
		
		//获取鼠标的位置
		var array = getMousePosition( container.dom, event.clientX, event.clientY );
		//双击位置
		onDoubleClickPosition.fromArray( array );
		//射线检测
		var intersects = getIntersects( onDoubleClickPosition, objects );

		if ( intersects.length > 0 ) {

			var intersect = intersects[ 0 ];
			//物体添加焦点
			signals.objectFocused.dispatch( intersect.object );

		}

	}
	//注册鼠标按下、触摸屏、双击事件
	container.dom.addEventListener( 'mousedown', onMouseDown, false );
	container.dom.addEventListener( 'touchstart', onTouchStart, false );
	container.dom.addEventListener( 'dblclick', onDoubleClick, false );

	// controls need to be added *after* main logic,
	// otherwise controls.enabled doesn't work.
	// 相机的控制类
	var controls = new EditorControls( camera, container.dom );
	controls.addEventListener( 'change', function () {
		//相机观察的目标改变了，导致相机的位置、方向改变了，会派发消息，重新渲染
		signals.cameraChanged.dispatch( camera );

	} );

	// signals
	// 关闭程序时清除编辑器后执行
	signals.editorCleared.add( function () {
		
		//重新设置相机控制的中心
		controls.center.set( 0, 0, 0 );
		currentBackgroundType = null;
		currentFogType = null;
		render();

	} );
	//转换模式改变了，应该是平移、旋转、缩放模式改变了（viewport底部的平移、旋转、缩放模式）
	signals.transformModeChanged.add( function ( mode ) {
		
		//设置转换模式
		transformControls.setMode( mode );

	} );

	signals.snapChanged.add( function ( dist ) {
		debugger
		transformControls.setTranslationSnap( dist );

	} );
	//空间改变（世界空间、本地空间；viewport底部的本地是否启用勾选）
	signals.spaceChanged.add( function ( space ) {
		
		//设置空间
		transformControls.setSpace( space );

	} );

	signals.rendererUpdated.add( function () {
		debugger
		render();

	} );
	//渲染方式改变了（webglrender、cssrender、softrender、raytrackrender）
	signals.rendererChanged.add( function ( newRenderer, newPmremGenerator ) {
		
		//初始化进来的时候renderer为null
		if ( renderer !== null ) {
			//移除渲染控件
			container.dom.removeChild( renderer.domElement );

		}
		//设置新的渲染方式
		renderer = newRenderer;
		pmremGenerator = newPmremGenerator;
		//禁用自动清除
		renderer.autoClear = false;
		//手动更新场景，不在自动更新scene.updateMatrixWorld()
		renderer.autoUpdateScene = false;
		//threejs 色彩空间转换
		renderer.outputEncoding = THREE.sRGBEncoding;
		//屏幕密度
		renderer.setPixelRatio( window.devicePixelRatio );
		//渲染视口大小
		renderer.setSize( container.dom.offsetWidth, container.dom.offsetHeight );
		//添加dom节点
		container.dom.appendChild( renderer.domElement );

		render();

	} );
	//场景图改变了（场景树）
	signals.sceneGraphChanged.add( function () {
		
		render();

	} );
	//相机改变了
	signals.cameraChanged.add( function () {
		
		render();

	} );
	//为对象信号添加处理函数（为什么要在viewport中处理，因为viewport是一个窗口，包含了所有的可视化的东西）
	signals.objectSelected.add( function ( object ) {
		
		//首先隐藏原来对象的包围盒
		selectionBox.visible = false;
		//剔除原来关联的对象
		transformControls.detach();
		//现在的对象不是null、不是scene、不是camera
		if ( object !== null && object !== scene && object !== camera ) {
			//将辅助盒子关联到新选择的对象当中
			box.setFromObject( object );
			//如果盒子不是空的
			if ( box.isEmpty() === false ) {
				//显示物体的盒子，并可见
				selectionBox.setFromObject( object );
				selectionBox.visible = true;

			}
			//关联对象
			transformControls.attach( object );

		}

		render();

	} );
	//对象焦点改变（双击的时候）
	signals.objectFocused.add( function ( object ) {
		
		controls.focus( object );

	} );
	//几何数据改变（几何组件宽度、高度、深度、分段、半径等改变）
	signals.geometryChanged.add( function ( object ) {
		
		if ( object !== undefined ) {
			//选择对象的包围盒
			selectionBox.setFromObject( object );

		}

		render();

	} );
	//场景中添加对象后会触发事件处理
	signals.objectAdded.add( function ( object ) {
		
		//遍历所有的对象
		object.traverse( function ( child ) {
			//存储对象
			objects.push( child );

		} );

	} );
	//当“变换控制”对象改变（平移，旋转，缩放）
	signals.objectChanged.add( function ( object ) {
		
		if ( editor.selected === object ) {
			//添加包围盒
			selectionBox.setFromObject( object );

		}
		//如果对象是透视相机
		if ( object.isPerspectiveCamera ) {
			//更新投影矩阵
			object.updateProjectionMatrix();

		}
		//辅助信息
		if ( editor.helpers[ object.id ] !== undefined ) {
			//更新对象的辅助对象
			editor.helpers[ object.id ].update();

		}

		render();

	} );
	//删除对象
	signals.objectRemoved.add( function ( object ) {
		
		controls.enabled = true; // see #14180
		if ( object === transformControls.object ) {
			//当前对象正在被操作;解除平移、旋转、缩放
			transformControls.detach();

		}
		//遍历对象、删除对象
		object.traverse( function ( child ) {

			objects.splice( objects.indexOf( child ), 1 );

		} );

	} );
	//添加对象的辅助对象时会触发这个事件处理
	signals.helperAdded.add( function ( object ) {
		debugger
		//将对象的拾取对象也添加到objects中（例如灯的辅助虚拟拾取对象）
		objects.push( object.getObjectByName( 'picker' ) );

	} );
	//移除辅助信息
	signals.helperRemoved.add( function ( object ) {
		//移除辅助模型，如果有虚拟的拾取模型也一并移除
		objects.splice( objects.indexOf( object.getObjectByName( 'picker' ) ), 1 );

	} );
	//材质改变（材质组件）
	signals.materialChanged.add( function () {
		
		render();

	} );

	// background

	var currentBackgroundType = null;
	//场景的背景改变
	signals.sceneBackgroundChanged.add( function ( backgroundType, backgroundColor, backgroundTexture, backgroundCubeTexture, backgroundEquirectTexture ) {
		
		if ( currentBackgroundType !== backgroundType ) {

			switch ( backgroundType ) {

				case 'None':
					scene.background = null;
					break;
				case 'Color':
					scene.background = new THREE.Color();
					break;

			}

		}

		if ( backgroundType === 'Color' ) {

			scene.background.set( backgroundColor );
			scene.environment = null;

		} else if ( backgroundType === 'Texture' ) {

			scene.background = backgroundTexture;
			scene.environment = null;

		} else if ( backgroundType === 'CubeTexture' ) {

			if ( backgroundCubeTexture && backgroundCubeTexture.isHDRTexture ) {

				var texture = pmremGenerator.fromCubemap( backgroundCubeTexture ).texture;
				texture.isPmremTexture = true;

				scene.background = texture;
				scene.environment = texture;

			} else {

				scene.background = backgroundCubeTexture;
				scene.environment = null;

			}

		} else if ( backgroundType === 'Equirect' ) {

			if ( backgroundEquirectTexture && backgroundEquirectTexture.isHDRTexture ) {

				var texture = pmremGenerator.fromEquirectangular( backgroundEquirectTexture ).texture;
				texture.isPmremTexture = true;

				scene.background = texture;
				scene.environment = texture;

			} else {

				scene.background = null;
				scene.environment = null;

			}

		}

		render();

	} );

	// fog
	//当前雾的类型
	var currentFogType = null;
	//场景中的雾改变
	signals.sceneFogChanged.add( function ( fogType, fogColor, fogNear, fogFar, fogDensity ) {
		
		if ( currentFogType !== fogType ) {
			//设置雾的类型
			switch ( fogType ) {

				case 'None':
					scene.fog = null;
					break;
				case 'Fog':
					scene.fog = new THREE.Fog();
					break;
				case 'FogExp2':
					scene.fog = new THREE.FogExp2();
					break;

			}

			currentFogType = fogType;

		}

		if ( scene.fog ) {

			if ( scene.fog.isFog ) {
				//普通雾;设置雾的颜色、雾的近、远距离
				scene.fog.color.setHex( fogColor );
				scene.fog.near = fogNear;
				scene.fog.far = fogFar;

			} else if ( scene.fog.isFogExp2 ) {
				//高级雾;设置雾的颜色、衰减
				scene.fog.color.setHex( fogColor );
				scene.fog.density = fogDensity;

			}

		}

		render();

	} );

	signals.viewportCameraChanged.add( function ( viewportCamera ) {
		debugger
		if ( viewportCamera.isPerspectiveCamera ) {

			viewportCamera.aspect = editor.camera.aspect;
			viewportCamera.projectionMatrix.copy( editor.camera.projectionMatrix );

		} else if ( ! viewportCamera.isOrthographicCamera ) {

			throw "Invalid camera set as viewport";

		}

		camera = viewportCamera;

		render();

	} );

	//
	//窗口大小改变响应
	signals.windowResize.add( function () {
		
		// TODO: Move this out?
		//更新默认相机(DEFAULT_CAMERA 和 camera是同一个相机)
		editor.DEFAULT_CAMERA.aspect = container.dom.offsetWidth / container.dom.offsetHeight;
		editor.DEFAULT_CAMERA.updateProjectionMatrix();
		//更新相机
		camera.aspect = container.dom.offsetWidth / container.dom.offsetHeight;
		camera.updateProjectionMatrix();
		//视口大小改变
		renderer.setSize( container.dom.offsetWidth, container.dom.offsetHeight );

		render();

	} );
	//网格的显示和隐藏
	signals.showGridChanged.add( function ( showGrid ) {
		
		grid.visible = showGrid;
		render();

	} );

	// animations

	var clock = new THREE.Clock(); // only used for animations
	//动画
	function animate() {
		//动画循环
		requestAnimationFrame( animate );

		var mixer = editor.mixer;
		//动画状态时正在被使用时才实时更新
		if ( mixer.stats.actions.inUse > 0 ) {
			//更新、渲染（非实时渲染）
			mixer.update( clock.getDelta() );
			render();

		}

	}
	//开启动画
	requestAnimationFrame( animate );

	//

	var startTime = 0;
	var endTime = 0;
	//重新渲染
	function render() {
		
		startTime = performance.now();
		//更新场景矩阵
		scene.updateMatrixWorld();
		//渲染场景
		renderer.render( scene, camera );

		if ( camera === editor.camera ) {
			//更新辅助场景矩阵
			sceneHelpers.updateMatrixWorld();
			//渲染辅助信息
			renderer.render( sceneHelpers, camera );

		}

		endTime = performance.now();
		var frametime = endTime - startTime;
		editor.signals.sceneRendered.dispatch( frametime );

	}
	//返回一个容器
	return container;

};

export { Viewport };
