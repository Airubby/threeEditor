/**
 * @author dforrer / https://github.com/dforrer
 * Developed as part of a project at University of Applied Sciences and Arts Northwestern Switzerland (www.fhnw.ch)
 */

/**
 * @param editor pointer to main editor object used to initialize
 *        each command object with a reference to the editor
 * @constructor
 */

 //命令基类（编辑的对象）
var Command = function ( editor ) {

	this.id = - 1; //命令的id，主要是对应history中的序号
	this.inMemory = false; //命令可以在内存中，也可以序列化到json中，方便存储
	this.updatable = false; //命令是否可以更新？？
	this.type = ''; //命令的类型
	this.name = ''; //命令的名称
	this.editor = editor;

};
//原型上添加函数
Command.prototype.toJSON = function () {
	//返回对象
	var output = {};
	output.type = this.type;
	output.id = this.id;
	output.name = this.name;
	return output;

};
//原型上添加函数
Command.prototype.fromJSON = function ( json ) {
	//设置成员
	this.inMemory = true;
	this.type = json.type;
	this.id = json.id;
	this.name = json.name;

};

export { Command };
