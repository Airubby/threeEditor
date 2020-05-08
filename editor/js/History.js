/**
 * @author dforrer / https://github.com/dforrer
 * Developed as part of a project at University of Applied Sciences and Arts Northwestern Switzerland (www.fhnw.ch)
 */

import * as Commands from './commands/Commands.js';
//历史命令存储栈
var History = function ( editor ) {

	this.editor = editor; //保存全局编辑器
	this.undos = []; //撤销队列
	this.redos = []; //重做队列
	this.lastCmdTime = new Date(); //上次的时间
	this.idCounter = 0; //命令id索引

	this.historyDisabled = false; //历史启用、禁用
	this.config = editor.config; //配置

	// signals

	var scope = this;

	this.editor.signals.startPlayer.add( function () { //开始播放时处理
		//禁用历史
		scope.historyDisabled = true;

	} );

	this.editor.signals.stopPlayer.add( function () { //停止播放时处理
		//启用历史
		scope.historyDisabled = false;

	} );

};

History.prototype = {
	//执行命令
	execute: function ( cmd, optionalName ) {
		//弹出最后一次命令
		var lastCmd = this.undos[ this.undos.length - 1 ];
		var timeDifference = new Date().getTime() - this.lastCmdTime.getTime(); //时间间隔

		var isUpdatableCmd = lastCmd && //上次命令存在
			lastCmd.updatable && //上次命令也是可以更新的
			cmd.updatable && //本次命令是可以更新的
			lastCmd.object === cmd.object && //这次的命令关联的对象与上次的是否为同一个
			lastCmd.type === cmd.type && //这次的命令类型与上次的是否是同一种类型
			lastCmd.script === cmd.script && //这次的脚本和上次的脚本是否为同一个脚本
			lastCmd.attributeName === cmd.attributeName; //这次的属性名称和上次的是否为同一个名称（例如一个脚本修改了多次）

		if ( isUpdatableCmd && cmd.type === "SetScriptValueCommand" ) { //脚本命令类型

			// When the cmd.type is "SetScriptValueCommand" the timeDifference is ignored
			//忽略命令，脚本的编辑操作不能被撤销
			lastCmd.update( cmd );
			cmd = lastCmd;

		} else if ( isUpdatableCmd && timeDifference < 500 ) { //多次撤销命令的时间间隔很短？
			//忽略命令，脚本的编辑操作不能被撤销
			lastCmd.update( cmd );
			cmd = lastCmd;

		} else { //该命令不可更新

			// the command is not updatable and is added as a new part of the history
			//该命令不可更新，将作为历史记录的新部分添加
			this.undos.push( cmd ); //存放到可撤销的命令栈中
			cmd.id = ++ this.idCounter; //命令id

		}
		cmd.name = ( optionalName !== undefined ) ? optionalName : cmd.name;
		cmd.execute(); //执行命令
		cmd.inMemory = true; //命令在内存中存放？

		if ( this.config.getKey( 'settings/history' ) ) { //获取历史相关的配置信息
			//序列化命令
			cmd.json = cmd.toJSON();	// serialize the cmd immediately after execution and append the json to the cmd

		}
		this.lastCmdTime = new Date(); //执行完成的时间

		// clearing all the redo-commands
		// 清空所有的重做命令（当添加一个新命令后，原来的所有撤销的命令就不存在了）
		this.redos = [];
		this.editor.signals.historyChanged.dispatch( cmd ); //历史改变了

	},
	//撤销
	undo: function () {
		//播放时是不能撤销操作
		if ( this.historyDisabled ) {

			alert( "Undo/Redo disabled while scene is playing." );
			return;

		}

		var cmd = undefined;

		if ( this.undos.length > 0 ) {
			// /弹出撤销命令
			cmd = this.undos.pop();
			//命令不在内存中，将命令从json文件中提取出来，这一部分属于优化内容，可以保存到indexDB中
			if ( cmd.inMemory === false ) {
				//反序列化命令
				cmd.fromJSON( cmd.json );

			}

		}

		if ( cmd !== undefined ) {
			//执行撤销命令
			cmd.undo();
			this.redos.push( cmd ); //将命令压入到重做命令列表中
			this.editor.signals.historyChanged.dispatch( cmd ); //历史命令改变，消息派发

		}

		return cmd;

	},
	//重做
	redo: function () {
		//播放时是不能重做操作
		if ( this.historyDisabled ) {

			alert( "Undo/Redo disabled while scene is playing." );
			return;

		}

		var cmd = undefined;

		if ( this.redos.length > 0 ) {
			//弹出重做命令
			cmd = this.redos.pop();
			//如果命令不在内存中，反序列化命令
			if ( cmd.inMemory === false ) {

				cmd.fromJSON( cmd.json );

			}

		}

		if ( cmd !== undefined ) {
			//执行命令
			cmd.execute(); 
			this.undos.push( cmd ); //命令重新设置到撤销列表
			this.editor.signals.historyChanged.dispatch( cmd );

		}

		return cmd;

	},
	//转换到json
	toJSON: function () {

		var history = {};
		history.undos = [];
		history.redos = [];
		//启用历史存储
		if ( ! this.config.getKey( 'settings/history' ) ) {

			return history;

		}

		// Append Undos to History
		// 存储撤销命令列表
		for ( var i = 0; i < this.undos.length; i ++ ) {

			if ( this.undos[ i ].hasOwnProperty( "json" ) ) {

				history.undos.push( this.undos[ i ].json );

			}

		}

		// Append Redos to History
		// 存储重做命令列表
		for ( var i = 0; i < this.redos.length; i ++ ) {

			if ( this.redos[ i ].hasOwnProperty( "json" ) ) {

				history.redos.push( this.redos[ i ].json );

			}

		}

		return history;

	},
	//json中提取数据
	fromJSON: function ( json ) {

		if ( json === undefined ) return;

		for ( var i = 0; i < json.undos.length; i ++ ) {

			var cmdJSON = json.undos[ i ];
			var cmd = new Commands[ cmdJSON.type ]( this.editor ); // creates a new object of type "json.type"
			cmd.json = cmdJSON;
			cmd.id = cmdJSON.id;
			cmd.name = cmdJSON.name;
			this.undos.push( cmd );
			this.idCounter = ( cmdJSON.id > this.idCounter ) ? cmdJSON.id : this.idCounter; // set last used idCounter

		}

		for ( var i = 0; i < json.redos.length; i ++ ) {

			var cmdJSON = json.redos[ i ];
			var cmd = new Commands[ cmdJSON.type ]( this.editor ); // creates a new object of type "json.type"
			cmd.json = cmdJSON;
			cmd.id = cmdJSON.id;
			cmd.name = cmdJSON.name;
			this.redos.push( cmd );
			this.idCounter = ( cmdJSON.id > this.idCounter ) ? cmdJSON.id : this.idCounter; // set last used idCounter

		}

		// Select the last executed undo-command
		this.editor.signals.historyChanged.dispatch( this.undos[ this.undos.length - 1 ] );

	},
	//清除命令
	clear: function () {
		//清空所有的信息
		this.undos = [];
		this.redos = [];
		this.idCounter = 0;
		//历史改变了
		this.editor.signals.historyChanged.dispatch();

	},
	//恢复到某一个操作状态
	goToState: function ( id ) {
		//历史功能是否启用
		if ( this.historyDisabled ) {

			alert( "Undo/Redo disabled while scene is playing." );
			return;

		}
		//禁用场景图消息、历史改变消息
		this.editor.signals.sceneGraphChanged.active = false;
		this.editor.signals.historyChanged.active = false;
		//获取最后一个命令
		var cmd = this.undos.length > 0 ? this.undos[ this.undos.length - 1 ] : undefined;	// next cmd to pop
		//没有命令，或者命令id大于当前撤销队列的数量，弹出所有撤销过的命令
		if ( cmd === undefined || id > cmd.id ) {
			//撤销重做命令
			cmd = this.redo();
			while ( cmd !== undefined && id > cmd.id ) {

				cmd = this.redo();

			}

		} else {

			while ( true ) {

				cmd = this.undos[ this.undos.length - 1 ];	// next cmd to pop

				if ( cmd === undefined || id === cmd.id ) break;

				this.undo();

			}

		}
		//重新启用场景图改变消息、历史改变消息
		this.editor.signals.sceneGraphChanged.active = true;
		this.editor.signals.historyChanged.active = true;

		this.editor.signals.sceneGraphChanged.dispatch();
		this.editor.signals.historyChanged.dispatch( cmd );

	},
	//启用序列化功能
	enableSerialization: function ( id ) {

		/**
		 * because there might be commands in this.undos and this.redos
		 * which have not been serialized with .toJSON() we go back
		 * to the oldest command and redo one command after the other
		 * while also calling .toJSON() on them.
		 */

		this.goToState( - 1 );
		//禁用场景图消息、历史消息
		this.editor.signals.sceneGraphChanged.active = false;
		this.editor.signals.historyChanged.active = false;

		var cmd = this.redo();
		while ( cmd !== undefined ) {

			if ( ! cmd.hasOwnProperty( "json" ) ) {
				//命令序列化
				cmd.json = cmd.toJSON();

			}
			cmd = this.redo();

		}
		//启用消息
		this.editor.signals.sceneGraphChanged.active = true;
		this.editor.signals.historyChanged.active = true;
		//恢复到某一个操作状态
		this.goToState( id );

	}

};

export { History };
