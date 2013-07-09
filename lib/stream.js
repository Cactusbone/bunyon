/*
** © 2013 by Philipp Dunkel <p.dunkel@me.com>. Licensed under MIT License.
*/

module.exports = Stream;

function Stream(stream, min, max) {
  min = isNaN(min) ? 0 : min;
  max = isNaN(max) ? 99 : max;
  this.min = Math.min(min, max);
  this.max = Math.max(min, max);
  this.stream = stream;
}

Stream.prototype.send = function(evt) {
  if ((this.min > evt.level) || (this.max < evt.level)) return;
  this.stream.write(JSON.stringify(evt)+'\n');
};
