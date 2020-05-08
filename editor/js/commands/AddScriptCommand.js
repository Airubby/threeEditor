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
var AddScriptCommand = function ( editor, object, script ) {
	//设置其他属性
	Command.call( this, editor );
	//命令类型
	this.type = 'AddScriptCommand';
	this.name = 'Add Script';
	//对象、新脚本
	this.object = object;
	this.script = script;

};

AddScriptCommand.prototype = {
	//执行命令
	execute: function () {
		//查找对象的脚本列表
		if ( this.editor.scripts[ this.object.uuid ] === undefined ) {
			//脚本不存在就创建
			this.editor.scripts[ this.object.uuid ] = [];

		}
		//添加新脚本
		this.editor.scripts[ this.object.uuid ].push( this.script );
		//脚本添加后派发消息
		this.editor.signals.scriptAdded.dispatch( this.script );

	},
	//撤销命令
	undo: function () {
		//脚本不存在就返回
		if ( this.editor.scripts[ this.object.uuid ] === undefined ) return;
		//查找脚本的索引
		var index = this.editor.scripts[ this.object.uuid ].indexOf( this.script );
		//找到脚本就删除
		if ( index !== - 1 ) {

			this.editor.scripts[ this.object.uuid ].splice( index, 1 );

		}
		//移除脚本，派发消息
		this.editor.signals.scriptRemoved.dispatch( this.script );

	},
	//序列化
	toJSON: function () {

		var output = Command.prototype.toJSON.call( this );

		output.objectUuid = this.object.uuid;
		output.script = this.script;

		return output;

	},
	// 反序列化
	fromJSON: function ( json ) {

		Command.prototype.fromJSON.call( this, json );

		this.script = json.script;
		this.object = this.editor.objectByUuid( json.objectUuid );

	}

};

export { AddScriptCommand };
