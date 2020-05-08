/**
 * @author dforrer / https://github.com/dforrer
 * Developed as part of a project at University of Applied Sciences and Arts Northwestern Switzerland (www.fhnw.ch)
 */

import { Command } from '../Command.js';

/**
 * @param editor Editor
 * @param object THREE.Object3D
 * @param script javascript object
 * @constructor
 */
var RemoveScriptCommand = function ( editor, object, script ) {
	//继承自Command，只是调用一下Command方法，将this传递过去
	Command.call( this, editor );
	//命令类型
	this.type = 'RemoveScriptCommand';
	this.name = 'Remove Script';
	//操作的对象
	this.object = object;
	//需要移除的脚本（保存当前脚本，撤销时需要恢复脚本）
	this.script = script;
	//对象脚本都存在时，找到脚本的索引
	if ( this.object && this.script ) {

		this.index = this.editor.scripts[ this.object.uuid ].indexOf( this.script );

	}

};

RemoveScriptCommand.prototype = {
	//执行命令
	execute: function () {
		//查找对象的脚本
		if ( this.editor.scripts[ this.object.uuid ] === undefined ) return;
		//脚本的索引存在
		if ( this.index !== - 1 ) {
			//移除脚本
			this.editor.scripts[ this.object.uuid ].splice( this.index, 1 );

		}

		this.editor.signals.scriptRemoved.dispatch( this.script );

	},
	//撤销命令
	undo: function () {
		//脚本不存在
		if ( this.editor.scripts[ this.object.uuid ] === undefined ) {
			//建立脚本列表
			this.editor.scripts[ this.object.uuid ] = [];

		}
		//将原来的脚本放入到脚本列表
		this.editor.scripts[ this.object.uuid ].splice( this.index, 0, this.script );
		//更新脚本ui
		this.editor.signals.scriptAdded.dispatch( this.script );

	},
	//序列化
	toJSON: function () {

		var output = Command.prototype.toJSON.call( this );

		output.objectUuid = this.object.uuid;
		output.script = this.script;
		output.index = this.index;

		return output;

	},
	//反序列化
	fromJSON: function ( json ) {

		Command.prototype.fromJSON.call( this, json );

		this.script = json.script;
		this.index = json.index;
		this.object = this.editor.objectByUuid( json.objectUuid );

	}

};

export { RemoveScriptCommand };
