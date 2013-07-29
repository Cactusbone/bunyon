/*
** © 2013 by Philipp Dunkel <p.dunkel@me.com>. Licensed under MIT License.
*/

exports = module.exports = RegisterAll;
exports.req = HttpRequest;
exports.res = HttpResponse;
exports.error = ErrorObject;

function RegisterAll(log) {
  Object.keys(exports).forEach(function(name) {
    if ('function' !== typeof exports[name]) return;
    log.serializer(name, exports[name]);
  });
}

function HttpRequest(value) {
  return {
    protocol:value.httpVersion,
    method:value.method,
    headers:value.headers,
    url:value.url
  };
}

function HttpResponse(value) {
  return {
    status:value.statusCode,
    type:String((value._headers ? value._headers['content-type'] : value.getHeader('content-type'))  || 'application/octet-stream'),
    size:parseInt((value._headers ? value._headers['content-length'] : value.getHeader('content-length')) || '0', 10)
  };
}

function ErrorObject(value) {
  if (!(value instanceof Error)) return undefined;
  var result = { msg:value.message };
  var stack = err.stack.split(/\r?\n/).slice(1).shift();
  if (stack) {
    //     at Object.<anonymous> (/Users/philipp/Documents/dbpro/server.js:5:7)
    stack = stack.replace(/^\s*at\s*/,'');
    stack = (/([\s|\S]*)\s+\(([\s|\S]+):(\d+):(\d+)\)/).exec(stack);
    result.src = {
      file:stack[2],
      symbol:stack[1],
      line:stack[3],
      column:stack[4]
    };
  }
  return result;
}
