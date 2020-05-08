/**
 * @author dforrer / https://github.com/dforrer
 * Developed as part of a project at University of Applied Sciences and Arts Northwestern Switzerland (www.fhnw.ch)
 */

import { Command } from '../Command.js';

/**
 * @param editor Editor
 * @param object THREE.Object3D
 * @param script javascript object
 * @param attributeName string
 * @param newValue string, object
 * @constructor
 */

//脚本命令（对象、脚本、脚本名称、新的值）
var SetScriptValueCommand = function ( editor, object, script, attributeName, newValue ) {
	//命令基类
	Command.call( this, editor );
	//命令类型
	this.type = 'SetScriptValueCommand';
	this.name = 'Set Script.' + attributeName;
	//是否可更新？
	this.updatable = true;
	//操作的对象、操作的脚本
	this.object = object;
	this.script = script; //这是一个对象的脚本，一个对象可以有多个脚本
	//脚本名称
	this.attributeName = attributeName;
	//存储上次更改的这个脚本
	this.oldValue = ( script !== undefined ) ? script[ this.attributeName ] : undefined;
	//设置新的脚本
	this.newValue = newValue;

};

//脚本原型
SetScriptValueCommand.prototype = {
	//执行
	execute: function () {
		//将新脚本绑定到当前对象的脚本的this.attributeName上
		this.script[ this.attributeName ] = this.newValue;

		this.editor.signals.scriptChanged.dispatch();

	},
	//撤销操作
	undo: function () {
		//恢复上次的脚本
		this.script[ this.attributeName ] = this.oldValue;

		this.editor.signals.scriptChanged.dispatch();

	},
	//更新，将原来的脚本更新为现在的脚本
	update: function ( cmd ) {
		//更新新的脚本
		this.newValue = cmd.newValue;

	},
	//将脚本信息存储为json
	toJSON: function () {
		//获取基本信息
		var output = Command.prototype.toJSON.call( this );
		//添加自身信息
		output.objectUuid = this.object.uuid;
		//脚本索引
		output.index = this.editor.scripts[ this.object.uuid ].indexOf( this.script );
		//脚本名称
		output.attributeName = this.attributeName;
		//之前的脚本
		output.oldValue = this.oldValue;
		//现在的脚本
		output.newValue = this.newValue;

		return output;

	},
	//将json文件传入
	fromJSON: function ( json ) {
		//将基本信息添加到父类中
		Command.prototype.fromJSON.call( this, json );
		//复制信息
		this.oldValue = json.oldValue;
		this.newValue = json.newValue;
		this.attributeName = json.attributeName;
		this.object = this.editor.objectByUuid( json.objectUuid );
		//哪一个对象的哪一个脚本
		this.script = this.editor.scripts[ json.objectUuid ][ json.index ];

	}

};

export { SetScriptValueCommand };
