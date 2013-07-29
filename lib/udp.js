/*
** © 2013 by Philipp Dunkel. Licensed under MIT-License.
*/

module.exports = UDP;

try { var Snappy=require('snappy'); } catch(ex) {}
var Dgram = require('dgram');

function UDP(port, host, options) {
  if (!(this instanceof UDP)) return new UDP(host, port, options);
  options = options || {};
  Object.defineProperty(this, 'host', { value:host });
  Object.defineProperty(this, 'port', { value:isNaN(port)?5050:port });
  Object.defineProperty(this, 'snappy', { value:(options.compress===false) ? false : Snappy });
  this.connect();
}

UDP.prototype.send = function(evt) {
  var self = this;
  if (!this.connection) return setTimeout(function() { self.send(evt); }, 10);
  evt = new Buffer(JSON.stringify(evt).trim());
  if (this.snappy) {
    this.snappy.compress(evt, function(err, evt) {
      self.transmit(evt);
    });
  } else {
    self.transmit(evt);
  }
};

UDP.prototype.connect = function() {
  var self = this;
  self.connection = Dgram.createSocket('udp4');
  self.connection.on('error', function(err) {
    self.connect();
  });
  self.connection.on('close', function() {
    self.connect();
  });
};

UDP.prototype.transmit = function(buf) {
  if (!this.connection) return;
  this.connection.send(buf, 0, buf.length, this.port, this.host);
};
