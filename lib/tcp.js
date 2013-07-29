/*
** © 2013 by Philipp Dunkel. Licensed under MIT-License.
*/

module.exports = TCP;

var Net = require('net');
try {
  var Snappy = require('snappy');
} catch(ex) {}

function TCP(port, host, options) {
  if (!(this instanceof TCP)) return new TCP(host, port, options);
  options = options || {};
  Object.defineProperty(this, 'host', { value:host });
  Object.defineProperty(this, 'port', { value:isNaN(port)?5050:port });
  Object.defineProperty(this, 'snappy', { value:(options.compress===false) ? false : !!Snappy });
  Object.defineProperty(this, 'queue', { value:[] });
  setTimeout(bind(this.connect, this), 500);
}
TCP.prototype.send = function(evt) {
  var self = this;
  this.queue.push(new Buffer(JSON.stringify(evt)));
  setImmediate(bind(this.unqueue, this));
};
TCP.prototype.transmit = function(evt, callback) {
  if (!this.connection) return callback(new Error('no connection'));
  this.connection.write(evt, callback);
};
TCP.prototype.unqueue = function() {
  var evt = this.queue.shift();
  if (!evt) return;
  var self = this;
  if (this.snappy) {
    Snappy.compress(evt, function(err, val) {
      if (err) {
        console.error(err);
        self.queue.unshift(evt);
      }
      var buf = new Buffer(val.length+2);
      buf.writeInt16BE(val.length * -1, 0);
      val.copy(buf, 2);
      self.transmit(buf, again);
    });
  } else {
    var buf = new Buffer(evt.length+2);
    buf.writeInt16BE(evt.length, 0);
    evt.copy(buf, 2);
    self.transmit(buf, again);
  }
  function again(err) {
    if (err) {
      console.error(err);
      self.queue.unshift(evt);
    }
    setImmediate(bind(self.unqueue, self));
  }
};
TCP.prototype.connect = function(err) {
  var self = this;
  self.connection = undefined;
  var conn = Net.connect(self.port, self.host, function() { self.connection = conn; });
  conn.on('error', bind(console.error, console));
  conn.on('close', bind(self.connect, self));
};

function bind(fn, tp) {
  var sub = Array.prototype.slice.call(arguments, 2);
  return function bound() {
    var arg = Array.prototype.slice.call(arguments);
    return fn.apply(tp, sub.concat(arg));
  };
}
