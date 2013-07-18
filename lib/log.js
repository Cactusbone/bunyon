/*
** © 2013 by Philipp Dunkel <p.dunkel@me.com>. Licensed under MIT License.
*/

module.exports = Log;
module.exports.Stream = require('./stream.js');

var Os = require('os');
var Util = require('util');

function Log(options) {
  if (!(this instanceof Log)) return new Log(options);
  Object.defineProperty(this, '_info', { value:{} });
  this._info.name = options.name || process.title;
  this._info.hostname = options.hostname || Os.hostname();
  this._info.version = options.version || 0;
  this._info.pid = options.pid || process.pid;
  this.transports = [];
  this.serializers = {};
  this.levels = {};
  Log.levels.forEach(function(level) { this.define(level); }.bind(this));
}
Log.prototype.log = function(level) {
  var that = this;
  level = isNaN(level) ? log.level(level) : level;
  var evt = {
    name:this._info.name,
    hostname:this._info.hostname,
    pid:this._info.pid,
    time:(new Date()).toISOString(),
    v:this._info.version,
    level:Log.level(level),
    msg:[]
  };
  Array.prototype.slice.call(arguments, 1).forEach(function(arg) {
    if ('object' !== typeof arg) {
      return evt.msg.push(Util.format(arg));
    } else if (arg instanceof RegExp) {
      return evt.msg.push(Log.serialize(arg));
    } else if (arg instanceof Error) {
      evt.msg.push(arg.message);
      arg = Log.serialize(arg);
    }
    Object.keys(arg).forEach(function(key) {
      if (key==='msg') {
        evt[key].push(''+that.serialize(key, arg[key]));
      } else {
        evt[key]=that.serialize(key, arg[key]);
      }
    });
  });
  evt.msg = (Array.isArray(evt.msg) ? evt.msg : [ evt.msg || 'event' ]).join(' ');
  this.send(evt);
};
Log.prototype.define = function(name, level) {
  if ([ 'define', 'send', 'serializer', 'serialize', 'child', 'level' ].indexOf(name) > -1) throw new Error('illeagal level name');
  level = Log.level(level || name);
  this[name]=function log() {
    return this.log.apply(this, [level].concat(Array.prototype.slice.apply(arguments)));
  };
};
Log.prototype.transport = function(transport) {
  this.transports.push(transport);
};
Log.prototype.send = function(evt) {
  this.transports.forEach(function(transport) {
    transport.send(evt);
  });
};
Log.prototype.serializer = function(name, fn) {
  this.serializers[name] = fn;
};
Log.prototype.serialize = function(name, value) {
  return ('function' === typeof this.serializers[name]) ? this.serializers[name](value) : Log.serialize(value);
};
Log.prototype.child = function(childinfo) {
  var parent = this;
  var child = new Log(this._info);
  child.log = function(level) {
    return parent.log.apply(parent, [level, childinfo].concat(Array.prototype.slice.call(arguments, 1)));
  };
  child.send = function(evt) { parent.send(evt); Log.prototype.send.call(this, evt); };
  child.serializer = function(name, fn) { return parent(name, fn); };
  return child;
};
Log.prototype.level = function(level) {
  return this.levels[level] || Log.level(level);
};

Log.levels = [ 'trace', 'debug', 'info', 'warn', 'error', 'fatal' ];
Log.levels.forEach(function(level, idx) { Log[level.toUpperCase()] = (idx + 1) * 10; });
Log.level = function(level) {
  if (!isNaN(level)) return level;
  level = (''+level).toLowerCase().trim();
  var res = (Log.levels.indexOf(level) + 1) * 10;
  res = (isNaN(res) || (res<0)) ? parseInt(level, 10) : res;
  res = isNaN(res) ? 0 : res;
  return Math.max(res, 0);
};

Log.serialize = function(value) {
  if ('object' !== typeof value) return value;
  if (null === value) return undefined;
  var result;
  if (Array.isArray(value)) return undefined;
  if (value instanceof RegExp) {
    result = value.toString().slice(1).split('/');
    result = {
      expr:result.slice(0,-1).join('/'),
      flag:result.pop()
    };
    result = ("'"+result.expr.split("'").join("\\'")+"'")+','+"'"+result.flag+"'";
    result = 'RegExp('+result+')';
    return result;
  }
  if (value instanceof Error) {
    result = { msg:value.message };
    var stack = err.stack.split(/\r?\n/).slice(1).shift();
    if (stack) {
      //     at Object.<anonymous> (/Users/philipp/Documents/dbpro/server.js:5:7)
      stack = stack.replace(/^\s*at\s*/,'');
      stack = (/([\s|\S]*)\s+\(([\s|\S]+):(\d+):(\d+)\)/).exec(stack);
      result.src = {
        file:stack[1],
        symbol:stack[2],
        line:stack[3],
        column:stack[4]
      };
    }
    return result;
  }
  return '[Object]';
};
