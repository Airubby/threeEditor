/**
 * @author mrdoob / http://mrdoob.com/
 */

import { UIPanel, UIBreak, UIText, UIButton, UIRow, UIInput } from './libs/ui.js';

import { AddScriptCommand } from './commands/AddScriptCommand.js';
import { SetScriptValueCommand } from './commands/SetScriptValueCommand.js';
import { RemoveScriptCommand } from './commands/RemoveScriptCommand.js';

var SidebarScript = function ( editor ) {
	//获取字符串用于设置ui的文本
	var strings = editor.strings;
	//获取信号
	var signals = editor.signals;
	//创建一个div，默认不显示（点击对象时才显示）
	var container = new UIPanel();
	container.setDisplay( 'none' );
	//添加文本、添加两层换行
	container.add( new UIText( strings.getKey( 'sidebar/script' ) ).setTextTransform( 'uppercase' ) );
	container.add( new UIBreak() );
	container.add( new UIBreak() );

	//
	//添加一个脚本的容器（动态添加 文本框、编辑按钮、删除按钮）
	var scriptsContainer = new UIRow();
	container.add( scriptsContainer );
	//添加一个按钮，设定点击事件
	var newScript = new UIButton( strings.getKey( 'sidebar/script/new' ) );
	newScript.onClick( function () {
		//传入的脚本内容、执行命令
		var script = { name: '', source: 'function update( event ) {}' };
		//创建一个添加命令
		editor.execute( new AddScriptCommand( editor, editor.selected, script ) );

	} );
	//添加到容器
	container.add( newScript );

	/*
	var loadScript = new UI.Button( 'Load' );
	loadScript.setMarginLeft( '4px' );
	container.add( loadScript );
	*/

	//
	//当添加、编辑、移除脚本时都会触发这个函数
	function update() {
		//清空脚本编辑的容器
		scriptsContainer.clear();
		scriptsContainer.setDisplay( 'none' );

		var object = editor.selected;

		if ( object === null ) {

			return;

		}
		//获取对象的脚本集合
		var scripts = editor.scripts[ object.uuid ];

		if ( scripts !== undefined && scripts.length > 0 ) {
			//显示脚本
			scriptsContainer.setDisplay( 'block' );
			//遍历该对象的所有脚本
			for ( var i = 0; i < scripts.length; i ++ ) {

				( function ( object, script ) {
					//添加一个输入框，脚本名称，设置宽高，字体大小
					var name = new UIInput( script.name ).setWidth( '130px' ).setFontSize( '12px' );
					name.onChange( function () {	//添加文本框改变事件
						//创建一个编辑命名
						editor.execute( new SetScriptValueCommand( editor, editor.selected, script, 'name', this.getValue() ) );

					} );
					//添加文本框
					scriptsContainer.add( name );
					//编辑按钮
					var edit = new UIButton( strings.getKey( 'sidebar/script/edit' ) );
					edit.setMarginLeft( '4px' );
					edit.onClick( function () { //添加编辑按钮处理

						signals.editScript.dispatch( object, script );

					} );
					//添加编辑按钮
					scriptsContainer.add( edit );

					var remove = new UIButton( strings.getKey( 'sidebar/script/remove' ) );
					remove.setMarginLeft( '4px' );
					remove.onClick( function () { //移除按钮处理

						if ( confirm( 'Are you sure?' ) ) {
							//创建一个移除命令
							editor.execute( new RemoveScriptCommand( editor, editor.selected, script ) );

						}

					} );
					// 添加移除按钮
					scriptsContainer.add( remove );
					//添加换行
					scriptsContainer.add( new UIBreak() );

				} )( object, scripts[ i ] );

			}

		}

	}

	// signals
	//对象被选中时的消息处理
	signals.objectSelected.add( function ( object ) {

		if ( object !== null && editor.camera !== object ) {

			container.setDisplay( 'block' );
			//创建编辑框等
			update();

		} else {
			//相机上不能添加处理事件
			container.setDisplay( 'none' );

		}

	} );
	//注册scriptAdded、scriptRemoved、scriptChanged事件响应
	signals.scriptAdded.add( update );
	signals.scriptRemoved.add( update );
	signals.scriptChanged.add( update );

	return container;

};

export { SidebarScript };
