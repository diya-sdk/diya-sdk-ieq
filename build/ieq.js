(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],2:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],3:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],4:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./support/isBuffer":3,"_process":1,"inherits":2}],5:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/*
 * Copyright : Partnering 3.0 (2007-2016)
 * Author : Sylvain Mahé <sylvain.mahe@partnering.fr>
 *
 * This file is part of diya-sdk.
 *
 * diya-sdk is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 *
 * diya-sdk is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with diya-sdk.  If not, see <http://www.gnu.org/licenses/>.
 */

/* maya-client
 * Copyright (c) 2014, Partnering Robotics, All rights reserved.
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; version
 *	3.0 of the License. This library is distributed in the hope
 * that it will be useful, but WITHOUT ANY WARRANTY; without even
 * the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR
 * PURPOSE. See the GNU Lesser General Public License for more details.
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library.
 */

/**
   Todo :
   check err for each data
   improve API : getData(sensorName, dataConfig)
   updateData(sensorName, dataConfig)
   set and get for the different dataConfig params

*/

(function () {

	var DiyaSelector = d1.DiyaSelector;
	var util = require('util');

	var Message = require('../message');

	//////////////////////////////////////////////////////////////
	/////////////////// Logging utility methods //////////////////
	//////////////////////////////////////////////////////////////

	var DEBUG = true;
	var Logger = {
		log: function log(message) {
			if (DEBUG) console.log(message);
		},

		error: function error(message) {
			if (DEBUG) console.error(message);
		}
	};

	/**
  * IEQ API handler
  */
	function IEQ(selector) {
		var that = this;
		this.selector = selector;
		this.dataModel = {};
		this._coder = selector.encode();
		this.subscriptions = [];
		//	that.subscriptionErrorNum = 0;

		/*** structure of data config. [] means default value ***
  	 criteria :
  	   time: all 3 time criteria should not be defined at the same time. (range would be given up)
  	     start: {[null],time} (null means most recent) // stored a UTC in ms (num)
  	     end: {[null], time} (null means most oldest) // stored as UTC in ms (num)
  	     range: {[null], time} (range of time(positive) ) // in s (num)
  	   robot: {ArrayOf ID or ["all"]}
  	   place: {ArrayOf ID or ["all"]}
  	 operator: {[last], max, moy, sd} - deprecated
  	 ...
  		 sensors : {[null] or ArrayOf SensorName}
  		 sampling: {[null] or int}
  */
		this.dataConfig = {
			criteria: {
				time: {
					start: null,
					end: null,
					range: null // in s
				},
				robot: null,
				place: null
			},
			operator: 'last',
			sensors: null,
			sampling: null //sampling
		};

		return this;
	};

	/**
  * Get dataModel :
  * {
  *	"senseurXX": {
  *			data:[FLOAT, ...],
  *			time:[FLOAT, ...],
  *			robot:[FLOAT, ...],
  *			place:[FLOAT, ...],
  *			qualityIndex:[FLOAT, ...],
  *			range: [FLOAT, FLOAT],
  *			unit: string,
  *		label: string
  *		},
  *	 ... ("senseursYY")
  * }
  */
	IEQ.prototype.getDataModel = function () {
		return this.dataModel;
	};
	IEQ.prototype.getDataRange = function () {
		return this.dataModel.range;
	};

	/**
  * @param {Object} dataConfig config for data request
  * if dataConfig is define : set and return this
  *	 @return {IEQ} this
  * else
  *	 @return {Object} current dataConfig
  */
	IEQ.prototype.DataConfig = function (newDataConfig) {
		if (newDataConfig) {
			this.dataConfig = newDataConfig;
			return this;
		} else return this.dataConfig;
	};
	/**
  * TO BE IMPLEMENTED : operator management in DN-IEQ
  * @param  {String}	 newOperator : {[last], max, moy, sd}
  * @return {IEQ} this - chainable
  * Set operator criteria.
  * Depends on newOperator
  *	@param {String} newOperator
  *	@return this
  * Get operator criteria.
  *	@return {String} operator
  */
	IEQ.prototype.DataOperator = function (newOperator) {
		if (newOperator) {
			this.dataConfig.operator = newOperator;
			return this;
		} else return this.dataConfig.operator;
	};
	/**
  * Depends on numSamples
  * @param {int} number of samples in dataModel
  * if defined : set number of samples
  *	@return {IEQ} this
  * else
  *	@return {int} number of samples
  **/
	IEQ.prototype.DataSampling = function (numSamples) {
		if (numSamples) {
			this.dataConfig.sampling = numSamples;
			return this;
		} else return this.dataConfig.sampling;
	};
	/**
  * Set or get data time criteria start and end.
  * If param defined
  *	@param {Date} newTimeStart // may be null
  *	@param {Date} newTimeEnd // may be null
  *	@return {IEQ} this
  * If no param defined:
  *	@return {Object} Time object: fields start and end.
  */
	IEQ.prototype.DataTime = function (newTimeStart, newTimeEnd, newRange) {
		if (newTimeStart || newTimeEnd || newRange) {
			this.dataConfig.criteria.time.start = newTimeStart.getTime();
			this.dataConfig.criteria.time.end = newTimeEnd.getTime();
			this.dataConfig.criteria.time.range = newRange;
			return this;
		} else return {
			start: new Date(this.dataConfig.criteria.time.start),
			end: new Date(this.dataConfig.criteria.time.end),
			range: new Date(this.dataConfig.criteria.time.range)
		};
	};
	/**
  * Depends on robotIds
  * Set robot criteria.
  *	@param {Array[Int]} robotIds list of robot Ids
  * Get robot criteria.
  *	@return {Array[Int]} list of robot Ids
  */
	IEQ.prototype.DataRobotIds = function (robotIds) {
		if (robotIds) {
			this.dataConfig.criteria.robot = robotIds;
			return this;
		} else return this.dataConfig.criteria.robot;
	};
	/**
  * Depends on placeIds
  * Set place criteria.
  *	@param {Array[Int]} placeIds list of place Ids
  * Get place criteria.
  *	@return {Array[Int]} list of place Ids
  */
	IEQ.prototype.DataPlaceIds = function (placeIds) {
		if (placeIds) {
			this.dataConfig.criteria.placeId = placeIds;
			return this;
		} else return this.dataConfig.criteria.place;
	};
	/**
  * Get data by sensor name.
  *	@param {Array[String]} sensorName list of sensors
  */

	IEQ.prototype.getDataByName = function (sensorNames) {
		var data = [];
		for (var n in sensorNames) {
			data.push(this.dataModel[sensorNames[n]]);
		}
		return data;
	};

	/**
  * Update data given dataConfig.
  * @param {func} callback : called after update
  * @param {object} dataConfig: data to config request
  * TODO USE PROMISE
  */

	IEQ.prototype.updateData = function (callback, dataConfig) {
		this._updateData(callback, dataConfig, "DataRequest");
	};

	/**
  * Update data given dataConfig.
  * @param {func} callback : called after update
  * @param {object} dataConfig: data to config request
  * @param {string} funcName: name of requested function in diya-node-ieq. Default: "DataRequest".
  * TODO USE PROMISE
  */

	IEQ.prototype._updateData = function (callback, dataConfig, funcName) {
		var that = this;
		if (dataConfig) this.DataConfig(dataConfig);

		this.selector.request({
			service: "ieq",
			func: funcName,
			data: { data: JSON.stringify(that.dataConfig) }, //	type:"splReq",
			obj: {
				path: '/fr/partnering/Ieq',
				interface: "fr.partnering.Ieq"
			}
		}, function (dnId, err, data) {
			data = JSON.parse(data);
			if (err) {
				if (typeof err == "string") Logger.error("Recv err: " + err);else if ((typeof err === 'undefined' ? 'undefined' : _typeof(err)) == "object" && typeof err.name == 'string') {
					callback(null, err.name);
					if (typeof err.message == "string") Logger.error(err.message);
				}
				return;
			}
			if (data && data.header && data.header.error) {
				// TODO : check/use err status and adapt behavior accordingly
				Logger.error("UpdateData:\n" + JSON.stringify(data.header.dataConfig));
				Logger.error("Data request failed (" + data.header.error.st + "): " + data.header.error.msg);
				return;
			}
			that._getDataModelFromRecv(data);
			// Logger.log(that.getDataModel());
			callback(that.getDataModel()); // callback func
		});
	};

	IEQ.prototype._isDataModelWithNaN = function () {
		var dataModelNaN = false;
		var sensorNan;
		for (var n in this.dataModel) {
			sensorNan = this.dataModel[n].data.reduce(function (nanPres, d) {
				return nanPres && isNaN(d);
			}, false);
			dataModelNaN = dataModelNaN && sensorNan;
			Logger.log(n + " with nan : " + sensorNan + " (" + dataModelNaN + ") / " + this.dataModel[n].data.length);
		}
	};

	IEQ.prototype.getConfinementLevel = function () {
		return this.confinement;
	};

	IEQ.prototype.getAirQualityLevel = function () {
		return this.airQuality;
	};

	IEQ.prototype.getEnvQualityLevel = function () {
		return this.envQuality;
	};

	/**
  * Update internal model with received data
  * @param  data to configure subscription
  * @param  callback called on answers (@param : dataModel)
  */
	IEQ.prototype.watch = function (config, callback) {
		var that = this;
		/** default **/
		config = config || {};
		config.timeRange = config.timeRange || 'hours';
		config.category = config.cat || 'ieq'; /* category */

		var requestConfig = {
			sampling: config.sampling || 500,
			criteria: {
				time: { rangeUnit: config.timeRange },
				robots: config.robots
			},
			category: config.category,
			operators: ['avg', 'min', 'max', 'stddev']
		};

		// Request history data before subscribing
		this.selector.request({
			service: "ieq",
			func: "DataRequest",
			data: { data: JSON.stringify(requestConfig) },
			obj: {
				path: '/fr/partnering/Ieq',
				interface: "fr.partnering.Ieq"
			}
		}, function (dnId, err, dataString) {
			var data = JSON.parse(dataString);
			if (err != null) {
				if (typeof err == "string") Logger.error("Recv err: " + err);else if ((typeof err === 'undefined' ? 'undefined' : _typeof(err)) == "object" && typeof err.name == 'string') {
					callback(null, err.name);
					if (typeof err.message == "string") Logger.error(err.message);
				}
				return;
			}
			callback(that._getDataModelFromRecv(data)); // callback func
		});

		var subs = this.selector.subscribe({
			service: "ieq",
			func: "Second",
			data: { data: config },
			obj: {
				path: '/fr/partnering/Ieq',
				interface: "fr.partnering.Ieq"
			}
		}, function (dnd, err, data) {
			if (err) {
				//	Logger.error("WatchIEQRecvErr:"+JSON.stringify(err));
				that.closeSubscriptions(); // should not be necessary
				that.subscriptionReqPeriod = that.subscriptionReqPeriod + 1000 || 1000; // increase delay by 1 sec
				if (that.subscriptionReqPeriod > 300000) that.subscriptionReqPeriod = 300000; // max 5min
				subs.watchTentative = setTimeout(function () {
					that.watch(config, callback);
				}, that.subscriptionReqPeriod); // try again later
				return;
			}
			data = JSON.parse(data);

			that.subscriptionReqPeriod = 0; // reset period on subscription requests
			callback(that._getDataModelFromRecv(data)); // callback func
		});

		this.subscriptions.push(subs);
	};

	/**
  * Close all subscriptions
  */
	IEQ.prototype.closeSubscriptions = function () {
		for (var i in this.subscriptions) {
			this.subscriptions[i].close();
			clearTimeout(this.subscriptions[i].watchTentative);
		}
		this.subscriptions = [];
	};

	/**
 * Request Data to make CSV file
 	* @param {object} csvConfig params:
 	* @param {list} csvConfig.sensorNames : list of sensor and index names
 	* @param {number} csvConfig._startTime: timestamp of beginning time
 	* @param {number} csvConfig._endTime: timestamp of end time
 	* @param {string} csvConfig.timeSample: timeinterval for data. Parameters: "second", "minute", "hour", "day", "week", "month"
 	* @param {number} csvConfig._nlines: maximum number of lines requested
 	* @param {callback} callback: called after update
 */

	IEQ.prototype.getCSVData = function (csvConfig, callback) {

		var that = this;

		if (csvConfig && typeof csvConfig.nlines != "number") csvConfig.nlines = undefined;

		var dataConfig = JSON.stringify({
			criteria: {
				time: { start: new Date(csvConfig.startTime).getTime(), end: new Date(csvConfig.endTime).getTime(), sampling: csvConfig.timeSample },
				places: [],
				robots: []
			},
			sensors: csvConfig.sensorNames,
			sampling: csvConfig.nlines
		});

		this.selector.request({
			service: "ieq",
			func: "CsvDataRequest",
			data: { data: dataConfig },
			//	type:"splReq",
			obj: {
				path: '/fr/partnering/Ieq',
				interface: "fr.partnering.Ieq"
			}
		}, function (dnId, err, data) {
			if (err) {
				if (typeof err == "string") Logger.error("Recv err: " + err);else if ((typeof err === 'undefined' ? 'undefined' : _typeof(err)) == "object" && typeof err.name == 'string') {
					callback(null, err.name);
					if (typeof err.message == "string") Logger.error(err.message);
				}
				return;
			}
			if (typeof data === 'string') {
				callback(data);
			} else {
				// DEPRECATED
				if (data && data.header && data.header.error) {
					// TODO : check/use err status and adapt behavior accordingly
					Logger.error("UpdateData:\n" + JSON.stringify(data.header.dataConfig));
					Logger.error("Data request failed (" + data.header.error.st + "): " + data.header.error.msg);
					return;
				}
				that._getDataModelFromRecv(data);
				// Logger.log(that.getDataModel());
				callback(that.getDataModel()); // callback func
			}
		});
	};

	/**
  * Request Data to make data map
   * @param {Object} dataConfig config for data request
   * @param {callback} callback: called after update
   */
	IEQ.prototype.getDataMapData = function (dataConfig, callback) {
		this._updateData(callback, dataConfig, "DataRequest");
	};

	/**
  * Request Data to make heatmap
   * @param {list} sensorNames : list of sensor and index names
   * @param {object} time: object containing timestamps for begin and end of data for heatmap
   * @param {string} sample: timeinterval for data. Parameters: "second", "minute", "hour", "day", "week", "month"
   * @param {callback} callback: called after update
   * @deprecated Will be deprecated in future version. Please use "getDataMapData" instead.
 	  */
	IEQ.prototype.getHeatMapData = function (sensorNames, time, sample, callback) {
		var dataConfig = {
			criteria: {
				time: { start: time.startEpoch, end: time.endEpoch, sampling: sample },
				places: [],
				robots: []
			},
			sensors: sensorNames
		};
		console.warn('This function will be deprecated. Please use "getDataMapData" instead.');
		this.getDataMapData(dataConfig, callback);
	};

	/**
  * Update internal model with received data
  * @param  {Object} data data received from DiyaNode by websocket
  * @return {[type]}		[description]
  */
	IEQ.prototype._getDataModelFromRecv = function (data) {
		var dataModel = null;
		//	console.log('getDataModel');
		//	console.log(data);
		/*	if(data.err && data.err.st>0) {
  		Logger.error(data.err.msg);
  		return null;
  	} */
		//	delete data.err;
		if (data != null) {
			for (var n in data) {
				if (n != "header" && n != "err") {

					if (data[n].err && data[n].err.st > 0) {
						Logger.error(n + " was in error: " + data[n].err.msg);
						continue;
					}

					if (!dataModel) dataModel = {};

					// Logger.log(n);
					if (!dataModel[n]) {
						dataModel[n] = {};
					}
					/* update data absolute range */
					dataModel[n].range = data[n].range;
					/* update data range */
					dataModel[n].timeRange = data[n].timeRange;
					/* update data label */
					dataModel[n].label = data[n].label;
					/* update data unit */
					dataModel[n].unit = data[n].unit;
					/* update data precision */
					dataModel[n].precision = data[n].precision;
					/* update data categories */
					dataModel[n].category = data[n].category;
					/* suggested y display range */
					dataModel[n].zoomRange = [0, 100];
					// update sensor confort range
					dataModel[n].confortRange = data[n].confortRange;

					/* update data indexRange */
					dataModel[n].qualityConfig = {
						/* confortRange: data[n].confortRange, */
						indexRange: data[n].indexRange
					};
					dataModel[n].time = this._coder.from(data[n].time, 'b64', 8);
					dataModel[n].data = data[n].data ? this._coder.from(data[n].data, 'b64', 4) : data[n].avg ? this._coder.from(data[n].avg.d, 'b64', 4) : null;
					dataModel[n].qualityIndex = data[n].data ? this._coder.from(data[n].index, 'b64', 4) : data[n].avg ? this._coder.from(data[n].avg.i, 'b64', 4) : null;
					dataModel[n].robotId = this._coder.from(data[n].robotId, 'b64', 4);
					if (dataModel[n].robotId) {
						/** dico robotId -> robotName **/
						var dicoRobot = {};
						data.header.robots.forEach(function (el) {
							dicoRobot[el.id] = el.name;
						});
						dataModel[n].robotId = dataModel[n].robotId.map(function (el) {
							return dicoRobot[el];
						});
					}

					dataModel[n].placeId = this._coder.from(data[n].placeId, 'b64', 4);
					dataModel[n].x = null;
					dataModel[n].y = null;

					if (data[n].avg) dataModel[n].avg = {
						d: this._coder.from(data[n].avg.d, 'b64', 4),
						i: this._coder.from(data[n].avg.i, 'b64', 4)
					};
					if (data[n].min) dataModel[n].min = {
						d: this._coder.from(data[n].min.d, 'b64', 4),
						i: this._coder.from(data[n].min.i, 'b64', 4)
					};
					if (data[n].max) dataModel[n].max = {
						d: this._coder.from(data[n].max.d, 'b64', 4),
						i: this._coder.from(data[n].max.i, 'b64', 4)
					};
					if (data[n].stddev) dataModel[n].stddev = {
						d: this._coder.from(data[n].stddev.d, 'b64', 4),
						i: this._coder.from(data[n].stddev.i, 'b64', 4)
					};
					if (data[n].stddev) dataModel[n].stddev = {
						d: this._coder.from(data[n].stddev.d, 'b64', 4),
						i: this._coder.from(data[n].stddev.i, 'b64', 4)
					};
					if (data[n].x) dataModel[n].x = this._coder.from(data[n].x, 'b64', 4);
					if (data[n].y) dataModel[n].y = this._coder.from(data[n].y, 'b64', 4);
					/**
      * current quality : {'b'ad, 'm'edium, 'g'ood}
      * evolution : {'u'p, 'd'own, 's'table}
      * evolution quality : {'b'etter, 'w'orse, 's'ame}
      */
					/// TODO
					dataModel[n].trend = 'mss';
				}
			}
		} else {
			Logger.error("No Data to read or header is missing !");
		}
		/** list robots **/
		//	dataModel.robots = [{name: 'D2R2', id:1}];
		this.dataModel = dataModel;
		return dataModel;
	};

	/** create IEQ service **/
	DiyaSelector.prototype.IEQ = function () {
		return new IEQ(this);
	};
})();

},{"../message":undefined,"util":4}]},{},[5])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3V0aWwvbm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvdXRpbC9zdXBwb3J0L2lzQnVmZmVyQnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy91dGlsL3V0aWwuanMiLCJzcmMvaWVxLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7O0FDMWtCQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUF3QkE7Ozs7Ozs7Ozs7Ozs7QUFhQTs7Ozs7Ozs7O0FBU0EsQ0FBQyxZQUFVOztBQUVWLEtBQUksZUFBZSxHQUFHLFlBQXRCO0FBQ0EsS0FBSSxPQUFPLFFBQVEsTUFBUixDQUFYOztBQUdBLEtBQUksVUFBVSxRQUFRLFlBQVIsQ0FBZDs7QUFHQTtBQUNBO0FBQ0E7O0FBRUEsS0FBSSxRQUFRLElBQVo7QUFD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U0FBRyxLQUFLLENBQUwsRUFBUSxDQUFYLEVBQ0MsVUFBVSxDQUFWLEVBQWEsQ0FBYixHQUFpQixLQUFLLE1BQUwsQ0FBWSxJQUFaLENBQWlCLEtBQUssQ0FBTCxFQUFRLENBQXpCLEVBQTJCLEtBQTNCLEVBQWlDLENBQWpDLENBQWpCO0FBQ0QsU0FBRyxLQUFLLENBQUwsRUFBUSxDQUFYLEVBQ0MsVUFBVSxDQUFWLEVBQWEsQ0FBYixHQUFpQixLQUFLLE1BQUwsQ0FBWSxJQUFaLENBQWlCLEtBQUssQ0FBTCxFQUFRLENBQXpCLEVBQTJCLEtBQTNCLEVBQWlDLENBQWpDLENBQWpCO0FBQ0Q7Ozs7O0FBS0E7QUFDQSxlQUFVLENBQVYsRUFBYSxLQUFiLEdBQXFCLEtBQXJCO0FBQ0E7QUFDRDtBQUNELEdBL0ZELE1BZ0dLO0FBQ0osVUFBTyxLQUFQLENBQWEsd0NBQWI7QUFDQTtBQUNEO0FBQ0Q7QUFDQyxPQUFLLFNBQUwsR0FBZSxTQUFmO0FBQ0EsU0FBTyxTQUFQO0FBQ0EsRUFoSEQ7O0FBc0hBO0FBQ0EsY0FBYSxTQUFiLENBQXVCLEdBQXZCLEdBQTZCLFlBQVU7QUFDdEMsU0FBTyxJQUFJLEdBQUosQ0FBUSxJQUFSLENBQVA7QUFDQSxFQUZEO0FBR0EsQ0FubEJEIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNCdWZmZXIoYXJnKSB7XG4gIHJldHVybiBhcmcgJiYgdHlwZW9mIGFyZyA9PT0gJ29iamVjdCdcbiAgICAmJiB0eXBlb2YgYXJnLmNvcHkgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLmZpbGwgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLnJlYWRVSW50OCA9PT0gJ2Z1bmN0aW9uJztcbn0iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxudmFyIGZvcm1hdFJlZ0V4cCA9IC8lW3NkaiVdL2c7XG5leHBvcnRzLmZvcm1hdCA9IGZ1bmN0aW9uKGYpIHtcbiAgaWYgKCFpc1N0cmluZyhmKSkge1xuICAgIHZhciBvYmplY3RzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIG9iamVjdHMucHVzaChpbnNwZWN0KGFyZ3VtZW50c1tpXSkpO1xuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0cy5qb2luKCcgJyk7XG4gIH1cblxuICB2YXIgaSA9IDE7XG4gIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICB2YXIgbGVuID0gYXJncy5sZW5ndGg7XG4gIHZhciBzdHIgPSBTdHJpbmcoZikucmVwbGFjZShmb3JtYXRSZWdFeHAsIGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoeCA9PT0gJyUlJykgcmV0dXJuICclJztcbiAgICBpZiAoaSA+PSBsZW4pIHJldHVybiB4O1xuICAgIHN3aXRjaCAoeCkge1xuICAgICAgY2FzZSAnJXMnOiByZXR1cm4gU3RyaW5nKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclZCc6IHJldHVybiBOdW1iZXIoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVqJzpcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoYXJnc1tpKytdKTtcbiAgICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICAgIHJldHVybiAnW0NpcmN1bGFyXSc7XG4gICAgICAgIH1cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiB4O1xuICAgIH1cbiAgfSk7XG4gIGZvciAodmFyIHggPSBhcmdzW2ldOyBpIDwgbGVuOyB4ID0gYXJnc1srK2ldKSB7XG4gICAgaWYgKGlzTnVsbCh4KSB8fCAhaXNPYmplY3QoeCkpIHtcbiAgICAgIHN0ciArPSAnICcgKyB4O1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgKz0gJyAnICsgaW5zcGVjdCh4KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn07XG5cblxuLy8gTWFyayB0aGF0IGEgbWV0aG9kIHNob3VsZCBub3QgYmUgdXNlZC5cbi8vIFJldHVybnMgYSBtb2RpZmllZCBmdW5jdGlvbiB3aGljaCB3YXJucyBvbmNlIGJ5IGRlZmF1bHQuXG4vLyBJZiAtLW5vLWRlcHJlY2F0aW9uIGlzIHNldCwgdGhlbiBpdCBpcyBhIG5vLW9wLlxuZXhwb3J0cy5kZXByZWNhdGUgPSBmdW5jdGlvbihmbiwgbXNnKSB7XG4gIC8vIEFsbG93IGZvciBkZXByZWNhdGluZyB0aGluZ3MgaW4gdGhlIHByb2Nlc3Mgb2Ygc3RhcnRpbmcgdXAuXG4gIGlmIChpc1VuZGVmaW5lZChnbG9iYWwucHJvY2VzcykpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZXhwb3J0cy5kZXByZWNhdGUoZm4sIG1zZykuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XG5cbiAgaWYgKHByb2Nlc3Mubm9EZXByZWNhdGlvbiA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBmbjtcbiAgfVxuXG4gIHZhciB3YXJuZWQgPSBmYWxzZTtcbiAgZnVuY3Rpb24gZGVwcmVjYXRlZCgpIHtcbiAgICBpZiAoIXdhcm5lZCkge1xuICAgICAgaWYgKHByb2Nlc3MudGhyb3dEZXByZWNhdGlvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgICAgIH0gZWxzZSBpZiAocHJvY2Vzcy50cmFjZURlcHJlY2F0aW9uKSB7XG4gICAgICAgIGNvbnNvbGUudHJhY2UobXNnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IobXNnKTtcbiAgICAgIH1cbiAgICAgIHdhcm5lZCA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG5cbiAgcmV0dXJuIGRlcHJlY2F0ZWQ7XG59O1xuXG5cbnZhciBkZWJ1Z3MgPSB7fTtcbnZhciBkZWJ1Z0Vudmlyb247XG5leHBvcnRzLmRlYnVnbG9nID0gZnVuY3Rpb24oc2V0KSB7XG4gIGlmIChpc1VuZGVmaW5lZChkZWJ1Z0Vudmlyb24pKVxuICAgIGRlYnVnRW52aXJvbiA9IHByb2Nlc3MuZW52Lk5PREVfREVCVUcgfHwgJyc7XG4gIHNldCA9IHNldC50b1VwcGVyQ2FzZSgpO1xuICBpZiAoIWRlYnVnc1tzZXRdKSB7XG4gICAgaWYgKG5ldyBSZWdFeHAoJ1xcXFxiJyArIHNldCArICdcXFxcYicsICdpJykudGVzdChkZWJ1Z0Vudmlyb24pKSB7XG4gICAgICB2YXIgcGlkID0gcHJvY2Vzcy5waWQ7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbXNnID0gZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKTtcbiAgICAgICAgY29uc29sZS5lcnJvcignJXMgJWQ6ICVzJywgc2V0LCBwaWQsIG1zZyk7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge307XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWJ1Z3Nbc2V0XTtcbn07XG5cblxuLyoqXG4gKiBFY2hvcyB0aGUgdmFsdWUgb2YgYSB2YWx1ZS4gVHJ5cyB0byBwcmludCB0aGUgdmFsdWUgb3V0XG4gKiBpbiB0aGUgYmVzdCB3YXkgcG9zc2libGUgZ2l2ZW4gdGhlIGRpZmZlcmVudCB0eXBlcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFRoZSBvYmplY3QgdG8gcHJpbnQgb3V0LlxuICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgb3B0aW9ucyBvYmplY3QgdGhhdCBhbHRlcnMgdGhlIG91dHB1dC5cbiAqL1xuLyogbGVnYWN5OiBvYmosIHNob3dIaWRkZW4sIGRlcHRoLCBjb2xvcnMqL1xuZnVuY3Rpb24gaW5zcGVjdChvYmosIG9wdHMpIHtcbiAgLy8gZGVmYXVsdCBvcHRpb25zXG4gIHZhciBjdHggPSB7XG4gICAgc2VlbjogW10sXG4gICAgc3R5bGl6ZTogc3R5bGl6ZU5vQ29sb3JcbiAgfTtcbiAgLy8gbGVnYWN5Li4uXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDMpIGN0eC5kZXB0aCA9IGFyZ3VtZW50c1syXTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gNCkgY3R4LmNvbG9ycyA9IGFyZ3VtZW50c1szXTtcbiAgaWYgKGlzQm9vbGVhbihvcHRzKSkge1xuICAgIC8vIGxlZ2FjeS4uLlxuICAgIGN0eC5zaG93SGlkZGVuID0gb3B0cztcbiAgfSBlbHNlIGlmIChvcHRzKSB7XG4gICAgLy8gZ290IGFuIFwib3B0aW9uc1wiIG9iamVjdFxuICAgIGV4cG9ydHMuX2V4dGVuZChjdHgsIG9wdHMpO1xuICB9XG4gIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5zaG93SGlkZGVuKSkgY3R4LnNob3dIaWRkZW4gPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5kZXB0aCkpIGN0eC5kZXB0aCA9IDI7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY29sb3JzKSkgY3R4LmNvbG9ycyA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmN1c3RvbUluc3BlY3QpKSBjdHguY3VzdG9tSW5zcGVjdCA9IHRydWU7XG4gIGlmIChjdHguY29sb3JzKSBjdHguc3R5bGl6ZSA9IHN0eWxpemVXaXRoQ29sb3I7XG4gIHJldHVybiBmb3JtYXRWYWx1ZShjdHgsIG9iaiwgY3R4LmRlcHRoKTtcbn1cbmV4cG9ydHMuaW5zcGVjdCA9IGluc3BlY3Q7XG5cblxuLy8gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9BTlNJX2VzY2FwZV9jb2RlI2dyYXBoaWNzXG5pbnNwZWN0LmNvbG9ycyA9IHtcbiAgJ2JvbGQnIDogWzEsIDIyXSxcbiAgJ2l0YWxpYycgOiBbMywgMjNdLFxuICAndW5kZXJsaW5lJyA6IFs0LCAyNF0sXG4gICdpbnZlcnNlJyA6IFs3LCAyN10sXG4gICd3aGl0ZScgOiBbMzcsIDM5XSxcbiAgJ2dyZXknIDogWzkwLCAzOV0sXG4gICdibGFjaycgOiBbMzAsIDM5XSxcbiAgJ2JsdWUnIDogWzM0LCAzOV0sXG4gICdjeWFuJyA6IFszNiwgMzldLFxuICAnZ3JlZW4nIDogWzMyLCAzOV0sXG4gICdtYWdlbnRhJyA6IFszNSwgMzldLFxuICAncmVkJyA6IFszMSwgMzldLFxuICAneWVsbG93JyA6IFszMywgMzldXG59O1xuXG4vLyBEb24ndCB1c2UgJ2JsdWUnIG5vdCB2aXNpYmxlIG9uIGNtZC5leGVcbmluc3BlY3Quc3R5bGVzID0ge1xuICAnc3BlY2lhbCc6ICdjeWFuJyxcbiAgJ251bWJlcic6ICd5ZWxsb3cnLFxuICAnYm9vbGVhbic6ICd5ZWxsb3cnLFxuICAndW5kZWZpbmVkJzogJ2dyZXknLFxuICAnbnVsbCc6ICdib2xkJyxcbiAgJ3N0cmluZyc6ICdncmVlbicsXG4gICdkYXRlJzogJ21hZ2VudGEnLFxuICAvLyBcIm5hbWVcIjogaW50ZW50aW9uYWxseSBub3Qgc3R5bGluZ1xuICAncmVnZXhwJzogJ3JlZCdcbn07XG5cblxuZnVuY3Rpb24gc3R5bGl6ZVdpdGhDb2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICB2YXIgc3R5bGUgPSBpbnNwZWN0LnN0eWxlc1tzdHlsZVR5cGVdO1xuXG4gIGlmIChzdHlsZSkge1xuICAgIHJldHVybiAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzBdICsgJ20nICsgc3RyICtcbiAgICAgICAgICAgJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVsxXSArICdtJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gc3RyO1xuICB9XG59XG5cblxuZnVuY3Rpb24gc3R5bGl6ZU5vQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgcmV0dXJuIHN0cjtcbn1cblxuXG5mdW5jdGlvbiBhcnJheVRvSGFzaChhcnJheSkge1xuICB2YXIgaGFzaCA9IHt9O1xuXG4gIGFycmF5LmZvckVhY2goZnVuY3Rpb24odmFsLCBpZHgpIHtcbiAgICBoYXNoW3ZhbF0gPSB0cnVlO1xuICB9KTtcblxuICByZXR1cm4gaGFzaDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRWYWx1ZShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMpIHtcbiAgLy8gUHJvdmlkZSBhIGhvb2sgZm9yIHVzZXItc3BlY2lmaWVkIGluc3BlY3QgZnVuY3Rpb25zLlxuICAvLyBDaGVjayB0aGF0IHZhbHVlIGlzIGFuIG9iamVjdCB3aXRoIGFuIGluc3BlY3QgZnVuY3Rpb24gb24gaXRcbiAgaWYgKGN0eC5jdXN0b21JbnNwZWN0ICYmXG4gICAgICB2YWx1ZSAmJlxuICAgICAgaXNGdW5jdGlvbih2YWx1ZS5pbnNwZWN0KSAmJlxuICAgICAgLy8gRmlsdGVyIG91dCB0aGUgdXRpbCBtb2R1bGUsIGl0J3MgaW5zcGVjdCBmdW5jdGlvbiBpcyBzcGVjaWFsXG4gICAgICB2YWx1ZS5pbnNwZWN0ICE9PSBleHBvcnRzLmluc3BlY3QgJiZcbiAgICAgIC8vIEFsc28gZmlsdGVyIG91dCBhbnkgcHJvdG90eXBlIG9iamVjdHMgdXNpbmcgdGhlIGNpcmN1bGFyIGNoZWNrLlxuICAgICAgISh2YWx1ZS5jb25zdHJ1Y3RvciAmJiB2YWx1ZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgPT09IHZhbHVlKSkge1xuICAgIHZhciByZXQgPSB2YWx1ZS5pbnNwZWN0KHJlY3Vyc2VUaW1lcywgY3R4KTtcbiAgICBpZiAoIWlzU3RyaW5nKHJldCkpIHtcbiAgICAgIHJldCA9IGZvcm1hdFZhbHVlKGN0eCwgcmV0LCByZWN1cnNlVGltZXMpO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgLy8gUHJpbWl0aXZlIHR5cGVzIGNhbm5vdCBoYXZlIHByb3BlcnRpZXNcbiAgdmFyIHByaW1pdGl2ZSA9IGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKTtcbiAgaWYgKHByaW1pdGl2ZSkge1xuICAgIHJldHVybiBwcmltaXRpdmU7XG4gIH1cblxuICAvLyBMb29rIHVwIHRoZSBrZXlzIG9mIHRoZSBvYmplY3QuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModmFsdWUpO1xuICB2YXIgdmlzaWJsZUtleXMgPSBhcnJheVRvSGFzaChrZXlzKTtcblxuICBpZiAoY3R4LnNob3dIaWRkZW4pIHtcbiAgICBrZXlzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModmFsdWUpO1xuICB9XG5cbiAgLy8gSUUgZG9lc24ndCBtYWtlIGVycm9yIGZpZWxkcyBub24tZW51bWVyYWJsZVxuICAvLyBodHRwOi8vbXNkbi5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvaWUvZHd3NTJzYnQodj12cy45NCkuYXNweFxuICBpZiAoaXNFcnJvcih2YWx1ZSlcbiAgICAgICYmIChrZXlzLmluZGV4T2YoJ21lc3NhZ2UnKSA+PSAwIHx8IGtleXMuaW5kZXhPZignZGVzY3JpcHRpb24nKSA+PSAwKSkge1xuICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICAvLyBTb21lIHR5cGUgb2Ygb2JqZWN0IHdpdGhvdXQgcHJvcGVydGllcyBjYW4gYmUgc2hvcnRjdXR0ZWQuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgdmFyIG5hbWUgPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW0Z1bmN0aW9uJyArIG5hbWUgKyAnXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfVxuICAgIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoRGF0ZS5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdkYXRlJyk7XG4gICAgfVxuICAgIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICB2YXIgYmFzZSA9ICcnLCBhcnJheSA9IGZhbHNlLCBicmFjZXMgPSBbJ3snLCAnfSddO1xuXG4gIC8vIE1ha2UgQXJyYXkgc2F5IHRoYXQgdGhleSBhcmUgQXJyYXlcbiAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgYXJyYXkgPSB0cnVlO1xuICAgIGJyYWNlcyA9IFsnWycsICddJ107XG4gIH1cblxuICAvLyBNYWtlIGZ1bmN0aW9ucyBzYXkgdGhhdCB0aGV5IGFyZSBmdW5jdGlvbnNcbiAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgdmFyIG4gPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICBiYXNlID0gJyBbRnVuY3Rpb24nICsgbiArICddJztcbiAgfVxuXG4gIC8vIE1ha2UgUmVnRXhwcyBzYXkgdGhhdCB0aGV5IGFyZSBSZWdFeHBzXG4gIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZGF0ZXMgd2l0aCBwcm9wZXJ0aWVzIGZpcnN0IHNheSB0aGUgZGF0ZVxuICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBEYXRlLnByb3RvdHlwZS50b1VUQ1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZXJyb3Igd2l0aCBtZXNzYWdlIGZpcnN0IHNheSB0aGUgZXJyb3JcbiAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCAmJiAoIWFycmF5IHx8IHZhbHVlLmxlbmd0aCA9PSAwKSkge1xuICAgIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgYnJhY2VzWzFdO1xuICB9XG5cbiAgaWYgKHJlY3Vyc2VUaW1lcyA8IDApIHtcbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tPYmplY3RdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cblxuICBjdHguc2Vlbi5wdXNoKHZhbHVlKTtcblxuICB2YXIgb3V0cHV0O1xuICBpZiAoYXJyYXkpIHtcbiAgICBvdXRwdXQgPSBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKTtcbiAgfSBlbHNlIHtcbiAgICBvdXRwdXQgPSBrZXlzLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KTtcbiAgICB9KTtcbiAgfVxuXG4gIGN0eC5zZWVuLnBvcCgpO1xuXG4gIHJldHVybiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ3VuZGVmaW5lZCcsICd1bmRlZmluZWQnKTtcbiAgaWYgKGlzU3RyaW5nKHZhbHVlKSkge1xuICAgIHZhciBzaW1wbGUgPSAnXFwnJyArIEpTT04uc3RyaW5naWZ5KHZhbHVlKS5yZXBsYWNlKC9eXCJ8XCIkL2csICcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKSArICdcXCcnO1xuICAgIHJldHVybiBjdHguc3R5bGl6ZShzaW1wbGUsICdzdHJpbmcnKTtcbiAgfVxuICBpZiAoaXNOdW1iZXIodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnbnVtYmVyJyk7XG4gIGlmIChpc0Jvb2xlYW4odmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnYm9vbGVhbicpO1xuICAvLyBGb3Igc29tZSByZWFzb24gdHlwZW9mIG51bGwgaXMgXCJvYmplY3RcIiwgc28gc3BlY2lhbCBjYXNlIGhlcmUuXG4gIGlmIChpc051bGwodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnbnVsbCcsICdudWxsJyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0RXJyb3IodmFsdWUpIHtcbiAgcmV0dXJuICdbJyArIEVycm9yLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSArICddJztcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKSB7XG4gIHZhciBvdXRwdXQgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZiAoaGFzT3duUHJvcGVydHkodmFsdWUsIFN0cmluZyhpKSkpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAgU3RyaW5nKGkpLCB0cnVlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dHB1dC5wdXNoKCcnKTtcbiAgICB9XG4gIH1cbiAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGlmICgha2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBrZXksIHRydWUpKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gb3V0cHV0O1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpIHtcbiAgdmFyIG5hbWUsIHN0ciwgZGVzYztcbiAgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodmFsdWUsIGtleSkgfHwgeyB2YWx1ZTogdmFsdWVba2V5XSB9O1xuICBpZiAoZGVzYy5nZXQpIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyL1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmICghaGFzT3duUHJvcGVydHkodmlzaWJsZUtleXMsIGtleSkpIHtcbiAgICBuYW1lID0gJ1snICsga2V5ICsgJ10nO1xuICB9XG4gIGlmICghc3RyKSB7XG4gICAgaWYgKGN0eC5zZWVuLmluZGV4T2YoZGVzYy52YWx1ZSkgPCAwKSB7XG4gICAgICBpZiAoaXNOdWxsKHJlY3Vyc2VUaW1lcykpIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCBudWxsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgcmVjdXJzZVRpbWVzIC0gMSk7XG4gICAgICB9XG4gICAgICBpZiAoc3RyLmluZGV4T2YoJ1xcbicpID4gLTEpIHtcbiAgICAgICAgaWYgKGFycmF5KSB7XG4gICAgICAgICAgc3RyID0gc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpLnN1YnN0cigyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHIgPSAnXFxuJyArIHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tDaXJjdWxhcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoaXNVbmRlZmluZWQobmFtZSkpIHtcbiAgICBpZiAoYXJyYXkgJiYga2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG4gICAgbmFtZSA9IEpTT04uc3RyaW5naWZ5KCcnICsga2V5KTtcbiAgICBpZiAobmFtZS5tYXRjaCgvXlwiKFthLXpBLVpfXVthLXpBLVpfMC05XSopXCIkLykpIHtcbiAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cigxLCBuYW1lLmxlbmd0aCAtIDIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICduYW1lJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8oXlwifFwiJCkvZywgXCInXCIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICdzdHJpbmcnKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmFtZSArICc6ICcgKyBzdHI7XG59XG5cblxuZnVuY3Rpb24gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpIHtcbiAgdmFyIG51bUxpbmVzRXN0ID0gMDtcbiAgdmFyIGxlbmd0aCA9IG91dHB1dC5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgY3VyKSB7XG4gICAgbnVtTGluZXNFc3QrKztcbiAgICBpZiAoY3VyLmluZGV4T2YoJ1xcbicpID49IDApIG51bUxpbmVzRXN0Kys7XG4gICAgcmV0dXJuIHByZXYgKyBjdXIucmVwbGFjZSgvXFx1MDAxYlxcW1xcZFxcZD9tL2csICcnKS5sZW5ndGggKyAxO1xuICB9LCAwKTtcblxuICBpZiAobGVuZ3RoID4gNjApIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICtcbiAgICAgICAgICAgKGJhc2UgPT09ICcnID8gJycgOiBiYXNlICsgJ1xcbiAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIG91dHB1dC5qb2luKCcsXFxuICAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIGJyYWNlc1sxXTtcbiAgfVxuXG4gIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgJyAnICsgb3V0cHV0LmpvaW4oJywgJykgKyAnICcgKyBicmFjZXNbMV07XG59XG5cblxuLy8gTk9URTogVGhlc2UgdHlwZSBjaGVja2luZyBmdW5jdGlvbnMgaW50ZW50aW9uYWxseSBkb24ndCB1c2UgYGluc3RhbmNlb2ZgXG4vLyBiZWNhdXNlIGl0IGlzIGZyYWdpbGUgYW5kIGNhbiBiZSBlYXNpbHkgZmFrZWQgd2l0aCBgT2JqZWN0LmNyZWF0ZSgpYC5cbmZ1bmN0aW9uIGlzQXJyYXkoYXIpIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkoYXIpO1xufVxuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gaXNCb29sZWFuKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nO1xufVxuZXhwb3J0cy5pc0Jvb2xlYW4gPSBpc0Jvb2xlYW47XG5cbmZ1bmN0aW9uIGlzTnVsbChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsID0gaXNOdWxsO1xuXG5mdW5jdGlvbiBpc051bGxPclVuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGxPclVuZGVmaW5lZCA9IGlzTnVsbE9yVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuZXhwb3J0cy5pc051bWJlciA9IGlzTnVtYmVyO1xuXG5mdW5jdGlvbiBpc1N0cmluZyhhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnO1xufVxuZXhwb3J0cy5pc1N0cmluZyA9IGlzU3RyaW5nO1xuXG5mdW5jdGlvbiBpc1N5bWJvbChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnO1xufVxuZXhwb3J0cy5pc1N5bWJvbCA9IGlzU3ltYm9sO1xuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuZXhwb3J0cy5pc1VuZGVmaW5lZCA9IGlzVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc1JlZ0V4cChyZSkge1xuICByZXR1cm4gaXNPYmplY3QocmUpICYmIG9iamVjdFRvU3RyaW5nKHJlKSA9PT0gJ1tvYmplY3QgUmVnRXhwXSc7XG59XG5leHBvcnRzLmlzUmVnRXhwID0gaXNSZWdFeHA7XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuZXhwb3J0cy5pc09iamVjdCA9IGlzT2JqZWN0O1xuXG5mdW5jdGlvbiBpc0RhdGUoZCkge1xuICByZXR1cm4gaXNPYmplY3QoZCkgJiYgb2JqZWN0VG9TdHJpbmcoZCkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cbmV4cG9ydHMuaXNEYXRlID0gaXNEYXRlO1xuXG5mdW5jdGlvbiBpc0Vycm9yKGUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGUpICYmXG4gICAgICAob2JqZWN0VG9TdHJpbmcoZSkgPT09ICdbb2JqZWN0IEVycm9yXScgfHwgZSBpbnN0YW5jZW9mIEVycm9yKTtcbn1cbmV4cG9ydHMuaXNFcnJvciA9IGlzRXJyb3I7XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcblxuZnVuY3Rpb24gaXNQcmltaXRpdmUoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGwgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ251bWJlcicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3ltYm9sJyB8fCAgLy8gRVM2IHN5bWJvbFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3VuZGVmaW5lZCc7XG59XG5leHBvcnRzLmlzUHJpbWl0aXZlID0gaXNQcmltaXRpdmU7XG5cbmV4cG9ydHMuaXNCdWZmZXIgPSByZXF1aXJlKCcuL3N1cHBvcnQvaXNCdWZmZXInKTtcblxuZnVuY3Rpb24gb2JqZWN0VG9TdHJpbmcobykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pO1xufVxuXG5cbmZ1bmN0aW9uIHBhZChuKSB7XG4gIHJldHVybiBuIDwgMTAgPyAnMCcgKyBuLnRvU3RyaW5nKDEwKSA6IG4udG9TdHJpbmcoMTApO1xufVxuXG5cbnZhciBtb250aHMgPSBbJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJyxcbiAgICAgICAgICAgICAgJ09jdCcsICdOb3YnLCAnRGVjJ107XG5cbi8vIDI2IEZlYiAxNjoxOTozNFxuZnVuY3Rpb24gdGltZXN0YW1wKCkge1xuICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gIHZhciB0aW1lID0gW3BhZChkLmdldEhvdXJzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRNaW51dGVzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRTZWNvbmRzKCkpXS5qb2luKCc6Jyk7XG4gIHJldHVybiBbZC5nZXREYXRlKCksIG1vbnRoc1tkLmdldE1vbnRoKCldLCB0aW1lXS5qb2luKCcgJyk7XG59XG5cblxuLy8gbG9nIGlzIGp1c3QgYSB0aGluIHdyYXBwZXIgdG8gY29uc29sZS5sb2cgdGhhdCBwcmVwZW5kcyBhIHRpbWVzdGFtcFxuZXhwb3J0cy5sb2cgPSBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2coJyVzIC0gJXMnLCB0aW1lc3RhbXAoKSwgZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKSk7XG59O1xuXG5cbi8qKlxuICogSW5oZXJpdCB0aGUgcHJvdG90eXBlIG1ldGhvZHMgZnJvbSBvbmUgY29uc3RydWN0b3IgaW50byBhbm90aGVyLlxuICpcbiAqIFRoZSBGdW5jdGlvbi5wcm90b3R5cGUuaW5oZXJpdHMgZnJvbSBsYW5nLmpzIHJld3JpdHRlbiBhcyBhIHN0YW5kYWxvbmVcbiAqIGZ1bmN0aW9uIChub3Qgb24gRnVuY3Rpb24ucHJvdG90eXBlKS4gTk9URTogSWYgdGhpcyBmaWxlIGlzIHRvIGJlIGxvYWRlZFxuICogZHVyaW5nIGJvb3RzdHJhcHBpbmcgdGhpcyBmdW5jdGlvbiBuZWVkcyB0byBiZSByZXdyaXR0ZW4gdXNpbmcgc29tZSBuYXRpdmVcbiAqIGZ1bmN0aW9ucyBhcyBwcm90b3R5cGUgc2V0dXAgdXNpbmcgbm9ybWFsIEphdmFTY3JpcHQgZG9lcyBub3Qgd29yayBhc1xuICogZXhwZWN0ZWQgZHVyaW5nIGJvb3RzdHJhcHBpbmcgKHNlZSBtaXJyb3IuanMgaW4gcjExNDkwMykuXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB3aGljaCBuZWVkcyB0byBpbmhlcml0IHRoZVxuICogICAgIHByb3RvdHlwZS5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IHN1cGVyQ3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB0byBpbmhlcml0IHByb3RvdHlwZSBmcm9tLlxuICovXG5leHBvcnRzLmluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcblxuZXhwb3J0cy5fZXh0ZW5kID0gZnVuY3Rpb24ob3JpZ2luLCBhZGQpIHtcbiAgLy8gRG9uJ3QgZG8gYW55dGhpbmcgaWYgYWRkIGlzbid0IGFuIG9iamVjdFxuICBpZiAoIWFkZCB8fCAhaXNPYmplY3QoYWRkKSkgcmV0dXJuIG9yaWdpbjtcblxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGFkZCk7XG4gIHZhciBpID0ga2V5cy5sZW5ndGg7XG4gIHdoaWxlIChpLS0pIHtcbiAgICBvcmlnaW5ba2V5c1tpXV0gPSBhZGRba2V5c1tpXV07XG4gIH1cbiAgcmV0dXJuIG9yaWdpbjtcbn07XG5cbmZ1bmN0aW9uIGhhc093blByb3BlcnR5KG9iaiwgcHJvcCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCk7XG59XG4iLCIvKlxuICogQ29weXJpZ2h0IDogUGFydG5lcmluZyAzLjAgKDIwMDctMjAxNilcbiAqIEF1dGhvciA6IFN5bHZhaW4gTWFow6kgPHN5bHZhaW4ubWFoZUBwYXJ0bmVyaW5nLmZyPlxuICpcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIGRpeWEtc2RrLlxuICpcbiAqIGRpeWEtc2RrIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbiwgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIGRpeWEtc2RrIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlXG4gKiBhbG9uZyB3aXRoIGRpeWEtc2RrLiAgSWYgbm90LCBzZWUgPGh0dHA6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cblxuXG5cblxuLyogbWF5YS1jbGllbnRcbiAqIENvcHlyaWdodCAoYykgMjAxNCwgUGFydG5lcmluZyBSb2JvdGljcywgQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgbGlicmFyeSBpcyBmcmVlIHNvZnR3YXJlOyB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3JcbiAqIG1vZGlmeSBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWNcbiAqIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5IHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IHZlcnNpb25cbiAqXHQzLjAgb2YgdGhlIExpY2Vuc2UuIFRoaXMgbGlicmFyeSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZVxuICogdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCwgYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW5cbiAqIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVJcbiAqIFBVUlBPU0UuIFNlZSB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljXG4gKiBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBsaWJyYXJ5LlxuICovXG5cbi8qKlxuICAgVG9kbyA6XG4gICBjaGVjayBlcnIgZm9yIGVhY2ggZGF0YVxuICAgaW1wcm92ZSBBUEkgOiBnZXREYXRhKHNlbnNvck5hbWUsIGRhdGFDb25maWcpXG4gICB1cGRhdGVEYXRhKHNlbnNvck5hbWUsIGRhdGFDb25maWcpXG4gICBzZXQgYW5kIGdldCBmb3IgdGhlIGRpZmZlcmVudCBkYXRhQ29uZmlnIHBhcmFtc1xuXG4qL1xuXG4oZnVuY3Rpb24oKXtcblxuXHR2YXIgRGl5YVNlbGVjdG9yID0gZDEuRGl5YVNlbGVjdG9yO1xuXHR2YXIgdXRpbCA9IHJlcXVpcmUoJ3V0aWwnKTtcblxuXG5cdHZhciBNZXNzYWdlID0gcmVxdWlyZSgnLi4vbWVzc2FnZScpO1xuXG5cblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblx0Ly8vLy8vLy8vLy8vLy8vLy8vLyBMb2dnaW5nIHV0aWxpdHkgbWV0aG9kcyAvLy8vLy8vLy8vLy8vLy8vLy9cblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXHR2YXIgREVCVUcgPSB0cnVlO1xuXHR2YXIgTG9nZ2VyID0ge1xuXHRcdGxvZzogZnVuY3Rpb24obWVzc2FnZSl7XG5cdFx0XHRpZihERUJVRykgY29uc29sZS5sb2cobWVzc2FnZSk7XG5cdFx0fSxcblxuXHRcdGVycm9yOiBmdW5jdGlvbihtZXNzYWdlKXtcblx0XHRcdGlmKERFQlVHKSBjb25zb2xlLmVycm9yKG1lc3NhZ2UpO1xuXHRcdH1cblx0fTtcblxuXHQvKipcblx0ICogSUVRIEFQSSBoYW5kbGVyXG5cdCAqL1xuXHRmdW5jdGlvbiBJRVEoc2VsZWN0b3Ipe1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHR0aGlzLnNlbGVjdG9yID0gc2VsZWN0b3I7XG5cdFx0dGhpcy5kYXRhTW9kZWw9e307XG5cdFx0dGhpcy5fY29kZXIgPSBzZWxlY3Rvci5lbmNvZGUoKTtcblx0XHR0aGlzLnN1YnNjcmlwdGlvbnMgPSBbXTtcblx0Ly9cdHRoYXQuc3Vic2NyaXB0aW9uRXJyb3JOdW0gPSAwO1xuXG5cdFx0LyoqKiBzdHJ1Y3R1cmUgb2YgZGF0YSBjb25maWcuIFtdIG1lYW5zIGRlZmF1bHQgdmFsdWUgKioqXG5cdFx0XHQgY3JpdGVyaWEgOlxuXHRcdFx0ICAgdGltZTogYWxsIDMgdGltZSBjcml0ZXJpYSBzaG91bGQgbm90IGJlIGRlZmluZWQgYXQgdGhlIHNhbWUgdGltZS4gKHJhbmdlIHdvdWxkIGJlIGdpdmVuIHVwKVxuXHRcdFx0ICAgICBzdGFydDoge1tudWxsXSx0aW1lfSAobnVsbCBtZWFucyBtb3N0IHJlY2VudCkgLy8gc3RvcmVkIGEgVVRDIGluIG1zIChudW0pXG5cdFx0XHQgICAgIGVuZDoge1tudWxsXSwgdGltZX0gKG51bGwgbWVhbnMgbW9zdCBvbGRlc3QpIC8vIHN0b3JlZCBhcyBVVEMgaW4gbXMgKG51bSlcblx0XHRcdCAgICAgcmFuZ2U6IHtbbnVsbF0sIHRpbWV9IChyYW5nZSBvZiB0aW1lKHBvc2l0aXZlKSApIC8vIGluIHMgKG51bSlcblx0XHRcdCAgIHJvYm90OiB7QXJyYXlPZiBJRCBvciBbXCJhbGxcIl19XG5cdFx0XHQgICBwbGFjZToge0FycmF5T2YgSUQgb3IgW1wiYWxsXCJdfVxuXHRcdFx0IG9wZXJhdG9yOiB7W2xhc3RdLCBtYXgsIG1veSwgc2R9IC0gZGVwcmVjYXRlZFxuXHRcdFx0IC4uLlxuXG5cdFx0XHQgc2Vuc29ycyA6IHtbbnVsbF0gb3IgQXJyYXlPZiBTZW5zb3JOYW1lfVxuXG5cdFx0XHQgc2FtcGxpbmc6IHtbbnVsbF0gb3IgaW50fVxuXHRcdCovXG5cdFx0dGhpcy5kYXRhQ29uZmlnID0ge1xuXHRcdFx0Y3JpdGVyaWE6IHtcblx0XHRcdFx0dGltZToge1xuXHRcdFx0XHRcdHN0YXJ0OiBudWxsLFxuXHRcdFx0XHRcdGVuZDogbnVsbCxcblx0XHRcdFx0XHRyYW5nZTogbnVsbCAvLyBpbiBzXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHJvYm90OiBudWxsLFxuXHRcdFx0XHRwbGFjZTogbnVsbFxuXHRcdFx0fSxcblx0XHRcdG9wZXJhdG9yOiAnbGFzdCcsXG5cdFx0XHRzZW5zb3JzOiBudWxsLFxuXHRcdFx0c2FtcGxpbmc6IG51bGwgLy9zYW1wbGluZ1xuXHRcdH07XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXHQvKipcblx0ICogR2V0IGRhdGFNb2RlbCA6XG5cdCAqIHtcblx0ICpcdFwic2Vuc2V1clhYXCI6IHtcblx0ICpcdFx0XHRkYXRhOltGTE9BVCwgLi4uXSxcblx0ICpcdFx0XHR0aW1lOltGTE9BVCwgLi4uXSxcblx0ICpcdFx0XHRyb2JvdDpbRkxPQVQsIC4uLl0sXG5cdCAqXHRcdFx0cGxhY2U6W0ZMT0FULCAuLi5dLFxuXHQgKlx0XHRcdHF1YWxpdHlJbmRleDpbRkxPQVQsIC4uLl0sXG5cdCAqXHRcdFx0cmFuZ2U6IFtGTE9BVCwgRkxPQVRdLFxuXHQgKlx0XHRcdHVuaXQ6IHN0cmluZyxcblx0ICpcdFx0bGFiZWw6IHN0cmluZ1xuXHQgKlx0XHR9LFxuXHQgKlx0IC4uLiAoXCJzZW5zZXVyc1lZXCIpXG5cdCAqIH1cblx0ICovXG5cdElFUS5wcm90b3R5cGUuZ2V0RGF0YU1vZGVsID0gZnVuY3Rpb24oKXtcblx0XHRyZXR1cm4gdGhpcy5kYXRhTW9kZWw7XG5cdH07XG5cdElFUS5wcm90b3R5cGUuZ2V0RGF0YVJhbmdlID0gZnVuY3Rpb24oKXtcblx0XHRyZXR1cm4gdGhpcy5kYXRhTW9kZWwucmFuZ2U7XG5cdH07XG5cblx0LyoqXG5cdCAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhQ29uZmlnIGNvbmZpZyBmb3IgZGF0YSByZXF1ZXN0XG5cdCAqIGlmIGRhdGFDb25maWcgaXMgZGVmaW5lIDogc2V0IGFuZCByZXR1cm4gdGhpc1xuXHQgKlx0IEByZXR1cm4ge0lFUX0gdGhpc1xuXHQgKiBlbHNlXG5cdCAqXHQgQHJldHVybiB7T2JqZWN0fSBjdXJyZW50IGRhdGFDb25maWdcblx0ICovXG5cdElFUS5wcm90b3R5cGUuRGF0YUNvbmZpZyA9IGZ1bmN0aW9uKG5ld0RhdGFDb25maWcpe1xuXHRcdGlmKG5ld0RhdGFDb25maWcpIHtcblx0XHRcdHRoaXMuZGF0YUNvbmZpZz1uZXdEYXRhQ29uZmlnO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXHRcdGVsc2Vcblx0XHRcdHJldHVybiB0aGlzLmRhdGFDb25maWc7XG5cdH07XG5cdC8qKlxuXHQgKiBUTyBCRSBJTVBMRU1FTlRFRCA6IG9wZXJhdG9yIG1hbmFnZW1lbnQgaW4gRE4tSUVRXG5cdCAqIEBwYXJhbSAge1N0cmluZ31cdCBuZXdPcGVyYXRvciA6IHtbbGFzdF0sIG1heCwgbW95LCBzZH1cblx0ICogQHJldHVybiB7SUVRfSB0aGlzIC0gY2hhaW5hYmxlXG5cdCAqIFNldCBvcGVyYXRvciBjcml0ZXJpYS5cblx0ICogRGVwZW5kcyBvbiBuZXdPcGVyYXRvclxuXHQgKlx0QHBhcmFtIHtTdHJpbmd9IG5ld09wZXJhdG9yXG5cdCAqXHRAcmV0dXJuIHRoaXNcblx0ICogR2V0IG9wZXJhdG9yIGNyaXRlcmlhLlxuXHQgKlx0QHJldHVybiB7U3RyaW5nfSBvcGVyYXRvclxuXHQgKi9cblx0SUVRLnByb3RvdHlwZS5EYXRhT3BlcmF0b3IgPSBmdW5jdGlvbihuZXdPcGVyYXRvcil7XG5cdFx0aWYobmV3T3BlcmF0b3IpIHtcblx0XHRcdHRoaXMuZGF0YUNvbmZpZy5vcGVyYXRvciA9IG5ld09wZXJhdG9yO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXHRcdGVsc2Vcblx0XHRcdHJldHVybiB0aGlzLmRhdGFDb25maWcub3BlcmF0b3I7XG5cdH07XG5cdC8qKlxuXHQgKiBEZXBlbmRzIG9uIG51bVNhbXBsZXNcblx0ICogQHBhcmFtIHtpbnR9IG51bWJlciBvZiBzYW1wbGVzIGluIGRhdGFNb2RlbFxuXHQgKiBpZiBkZWZpbmVkIDogc2V0IG51bWJlciBvZiBzYW1wbGVzXG5cdCAqXHRAcmV0dXJuIHtJRVF9IHRoaXNcblx0ICogZWxzZVxuXHQgKlx0QHJldHVybiB7aW50fSBudW1iZXIgb2Ygc2FtcGxlc1xuXHQgKiovXG5cdElFUS5wcm90b3R5cGUuRGF0YVNhbXBsaW5nID0gZnVuY3Rpb24obnVtU2FtcGxlcyl7XG5cdFx0aWYobnVtU2FtcGxlcykge1xuXHRcdFx0dGhpcy5kYXRhQ29uZmlnLnNhbXBsaW5nID0gbnVtU2FtcGxlcztcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH1cblx0XHRlbHNlXG5cdFx0XHRyZXR1cm4gdGhpcy5kYXRhQ29uZmlnLnNhbXBsaW5nO1xuXHR9O1xuXHQvKipcblx0ICogU2V0IG9yIGdldCBkYXRhIHRpbWUgY3JpdGVyaWEgc3RhcnQgYW5kIGVuZC5cblx0ICogSWYgcGFyYW0gZGVmaW5lZFxuXHQgKlx0QHBhcmFtIHtEYXRlfSBuZXdUaW1lU3RhcnQgLy8gbWF5IGJlIG51bGxcblx0ICpcdEBwYXJhbSB7RGF0ZX0gbmV3VGltZUVuZCAvLyBtYXkgYmUgbnVsbFxuXHQgKlx0QHJldHVybiB7SUVRfSB0aGlzXG5cdCAqIElmIG5vIHBhcmFtIGRlZmluZWQ6XG5cdCAqXHRAcmV0dXJuIHtPYmplY3R9IFRpbWUgb2JqZWN0OiBmaWVsZHMgc3RhcnQgYW5kIGVuZC5cblx0ICovXG5cdElFUS5wcm90b3R5cGUuRGF0YVRpbWUgPSBmdW5jdGlvbihuZXdUaW1lU3RhcnQsbmV3VGltZUVuZCwgbmV3UmFuZ2Upe1xuXHRcdGlmKG5ld1RpbWVTdGFydCB8fCBuZXdUaW1lRW5kIHx8IG5ld1JhbmdlKSB7XG5cdFx0XHR0aGlzLmRhdGFDb25maWcuY3JpdGVyaWEudGltZS5zdGFydCA9IG5ld1RpbWVTdGFydC5nZXRUaW1lKCk7XG5cdFx0XHR0aGlzLmRhdGFDb25maWcuY3JpdGVyaWEudGltZS5lbmQgPSBuZXdUaW1lRW5kLmdldFRpbWUoKTtcblx0XHRcdHRoaXMuZGF0YUNvbmZpZy5jcml0ZXJpYS50aW1lLnJhbmdlID0gbmV3UmFuZ2U7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cdFx0ZWxzZVxuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0c3RhcnQ6IG5ldyBEYXRlKHRoaXMuZGF0YUNvbmZpZy5jcml0ZXJpYS50aW1lLnN0YXJ0KSxcblx0XHRcdFx0ZW5kOiBuZXcgRGF0ZSh0aGlzLmRhdGFDb25maWcuY3JpdGVyaWEudGltZS5lbmQpLFxuXHRcdFx0XHRyYW5nZTogbmV3IERhdGUodGhpcy5kYXRhQ29uZmlnLmNyaXRlcmlhLnRpbWUucmFuZ2UpXG5cdFx0XHR9O1xuXHR9O1xuXHQvKipcblx0ICogRGVwZW5kcyBvbiByb2JvdElkc1xuXHQgKiBTZXQgcm9ib3QgY3JpdGVyaWEuXG5cdCAqXHRAcGFyYW0ge0FycmF5W0ludF19IHJvYm90SWRzIGxpc3Qgb2Ygcm9ib3QgSWRzXG5cdCAqIEdldCByb2JvdCBjcml0ZXJpYS5cblx0ICpcdEByZXR1cm4ge0FycmF5W0ludF19IGxpc3Qgb2Ygcm9ib3QgSWRzXG5cdCAqL1xuXHRJRVEucHJvdG90eXBlLkRhdGFSb2JvdElkcyA9IGZ1bmN0aW9uKHJvYm90SWRzKXtcblx0XHRpZihyb2JvdElkcykge1xuXHRcdFx0dGhpcy5kYXRhQ29uZmlnLmNyaXRlcmlhLnJvYm90ID0gcm9ib3RJZHM7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cdFx0ZWxzZVxuXHRcdFx0cmV0dXJuIHRoaXMuZGF0YUNvbmZpZy5jcml0ZXJpYS5yb2JvdDtcblx0fTtcblx0LyoqXG5cdCAqIERlcGVuZHMgb24gcGxhY2VJZHNcblx0ICogU2V0IHBsYWNlIGNyaXRlcmlhLlxuXHQgKlx0QHBhcmFtIHtBcnJheVtJbnRdfSBwbGFjZUlkcyBsaXN0IG9mIHBsYWNlIElkc1xuXHQgKiBHZXQgcGxhY2UgY3JpdGVyaWEuXG5cdCAqXHRAcmV0dXJuIHtBcnJheVtJbnRdfSBsaXN0IG9mIHBsYWNlIElkc1xuXHQgKi9cblx0SUVRLnByb3RvdHlwZS5EYXRhUGxhY2VJZHMgPSBmdW5jdGlvbihwbGFjZUlkcyl7XG5cdFx0aWYocGxhY2VJZHMpIHtcblx0XHRcdHRoaXMuZGF0YUNvbmZpZy5jcml0ZXJpYS5wbGFjZUlkID0gcGxhY2VJZHM7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cdFx0ZWxzZVxuXHRcdFx0cmV0dXJuIHRoaXMuZGF0YUNvbmZpZy5jcml0ZXJpYS5wbGFjZTtcblx0fTtcblx0LyoqXG5cdCAqIEdldCBkYXRhIGJ5IHNlbnNvciBuYW1lLlxuXHQgKlx0QHBhcmFtIHtBcnJheVtTdHJpbmddfSBzZW5zb3JOYW1lIGxpc3Qgb2Ygc2Vuc29yc1xuXHQgKi9cblxuXG5cblx0SUVRLnByb3RvdHlwZS5nZXREYXRhQnlOYW1lID0gZnVuY3Rpb24oc2Vuc29yTmFtZXMpe1xuXHRcdHZhciBkYXRhPVtdO1xuXHRcdGZvcih2YXIgbiBpbiBzZW5zb3JOYW1lcykge1xuXHRcdFx0ZGF0YS5wdXNoKHRoaXMuZGF0YU1vZGVsW3NlbnNvck5hbWVzW25dXSk7XG5cdFx0fVxuXHRcdHJldHVybiBkYXRhO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBVcGRhdGUgZGF0YSBnaXZlbiBkYXRhQ29uZmlnLlxuXHQgKiBAcGFyYW0ge2Z1bmN9IGNhbGxiYWNrIDogY2FsbGVkIGFmdGVyIHVwZGF0ZVxuXHQgKiBAcGFyYW0ge29iamVjdH0gZGF0YUNvbmZpZzogZGF0YSB0byBjb25maWcgcmVxdWVzdFxuXHQgKiBUT0RPIFVTRSBQUk9NSVNFXG5cdCAqL1xuXG5cdElFUS5wcm90b3R5cGUudXBkYXRlRGF0YSA9IGZ1bmN0aW9uKGNhbGxiYWNrLCBkYXRhQ29uZmlnKXtcblx0XHR0aGlzLl91cGRhdGVEYXRhKGNhbGxiYWNrLCBkYXRhQ29uZmlnLCBcIkRhdGFSZXF1ZXN0XCIpXG5cdH07XG5cblx0LyoqXG5cdCAqIFVwZGF0ZSBkYXRhIGdpdmVuIGRhdGFDb25maWcuXG5cdCAqIEBwYXJhbSB7ZnVuY30gY2FsbGJhY2sgOiBjYWxsZWQgYWZ0ZXIgdXBkYXRlXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhQ29uZmlnOiBkYXRhIHRvIGNvbmZpZyByZXF1ZXN0XG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBmdW5jTmFtZTogbmFtZSBvZiByZXF1ZXN0ZWQgZnVuY3Rpb24gaW4gZGl5YS1ub2RlLWllcS4gRGVmYXVsdDogXCJEYXRhUmVxdWVzdFwiLlxuXHQgKiBUT0RPIFVTRSBQUk9NSVNFXG5cdCAqL1xuXG5cdElFUS5wcm90b3R5cGUuX3VwZGF0ZURhdGEgPSBmdW5jdGlvbihjYWxsYmFjaywgZGF0YUNvbmZpZywgZnVuY05hbWUpe1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRpZihkYXRhQ29uZmlnKVxuXHRcdFx0dGhpcy5EYXRhQ29uZmlnKGRhdGFDb25maWcpO1xuXG5cdFx0dGhpcy5zZWxlY3Rvci5yZXF1ZXN0KHtcblx0XHRcdHNlcnZpY2U6IFwiaWVxXCIsXG5cdFx0XHRmdW5jOiBmdW5jTmFtZSxcblx0XHRcdGRhdGE6IHtkYXRhOiBKU09OLnN0cmluZ2lmeSh0aGF0LmRhdGFDb25maWcpfSxcdFx0Ly9cdHR5cGU6XCJzcGxSZXFcIixcblx0XHRcdG9iajp7XG5cdFx0XHRcdHBhdGg6ICcvZnIvcGFydG5lcmluZy9JZXEnLFxuXHRcdFx0XHRpbnRlcmZhY2U6IFwiZnIucGFydG5lcmluZy5JZXFcIlxuXHRcdFx0fVxuXHRcdH0sIGZ1bmN0aW9uKGRuSWQsIGVyciwgZGF0YSl7XG5cdFx0XHRkYXRhID0gSlNPTi5wYXJzZShkYXRhKTtcblx0XHRcdGlmKGVycikge1xuXHRcdFx0XHRpZiAodHlwZW9mIGVyciA9PVwic3RyaW5nXCIpIExvZ2dlci5lcnJvcihcIlJlY3YgZXJyOiBcIisgZXJyKTtcblx0XHRcdFx0ZWxzZSBpZiAodHlwZW9mIGVyciA9PSBcIm9iamVjdFwiICYmIHR5cGVvZiBlcnIubmFtZSA9PSdzdHJpbmcnKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2sobnVsbCwgZXJyLm5hbWUpO1xuXHRcdFx0XHRcdGlmICh0eXBlb2YgZXJyLm1lc3NhZ2U9PVwic3RyaW5nXCIpIExvZ2dlci5lcnJvcihlcnIubWVzc2FnZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0aWYoZGF0YSAmJiBkYXRhLmhlYWRlciAmJiBkYXRhLmhlYWRlci5lcnJvcikge1xuXHRcdFx0XHQvLyBUT0RPIDogY2hlY2svdXNlIGVyciBzdGF0dXMgYW5kIGFkYXB0IGJlaGF2aW9yIGFjY29yZGluZ2x5XG5cdFx0XHRcdExvZ2dlci5lcnJvcihcIlVwZGF0ZURhdGE6XFxuXCIrSlNPTi5zdHJpbmdpZnkoZGF0YS5oZWFkZXIuZGF0YUNvbmZpZykpO1xuXHRcdFx0XHRMb2dnZXIuZXJyb3IoXCJEYXRhIHJlcXVlc3QgZmFpbGVkIChcIitkYXRhLmhlYWRlci5lcnJvci5zdCtcIik6IFwiK2RhdGEuaGVhZGVyLmVycm9yLm1zZyk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdHRoYXQuX2dldERhdGFNb2RlbEZyb21SZWN2KGRhdGEpO1xuXHRcdFx0Ly8gTG9nZ2VyLmxvZyh0aGF0LmdldERhdGFNb2RlbCgpKTtcblx0XHRcdGNhbGxiYWNrKHRoYXQuZ2V0RGF0YU1vZGVsKCkpOyAvLyBjYWxsYmFjayBmdW5jXG5cdFx0fSk7XG5cdH07XG5cblx0SUVRLnByb3RvdHlwZS5faXNEYXRhTW9kZWxXaXRoTmFOID0gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGRhdGFNb2RlbE5hTj1mYWxzZTtcblx0XHR2YXIgc2Vuc29yTmFuO1xuXHRcdGZvcih2YXIgbiBpbiB0aGlzLmRhdGFNb2RlbCkge1xuXHRcdFx0c2Vuc29yTmFuID0gdGhpcy5kYXRhTW9kZWxbbl0uZGF0YS5yZWR1Y2UoZnVuY3Rpb24obmFuUHJlcyxkKSB7XG5cdFx0XHRcdHJldHVybiBuYW5QcmVzICYmIGlzTmFOKGQpO1xuXHRcdFx0fSxmYWxzZSk7XG5cdFx0XHRkYXRhTW9kZWxOYU4gPSBkYXRhTW9kZWxOYU4gJiYgc2Vuc29yTmFuO1xuXHRcdFx0TG9nZ2VyLmxvZyhuK1wiIHdpdGggbmFuIDogXCIrc2Vuc29yTmFuK1wiIChcIitkYXRhTW9kZWxOYU4rXCIpIC8gXCIrdGhpcy5kYXRhTW9kZWxbbl0uZGF0YS5sZW5ndGgpO1xuXHRcdH1cblx0fTtcblxuXHRJRVEucHJvdG90eXBlLmdldENvbmZpbmVtZW50TGV2ZWwgPSBmdW5jdGlvbigpe1xuXHRcdHJldHVybiB0aGlzLmNvbmZpbmVtZW50O1xuXHR9O1xuXG5cdElFUS5wcm90b3R5cGUuZ2V0QWlyUXVhbGl0eUxldmVsID0gZnVuY3Rpb24oKXtcblx0XHRyZXR1cm4gdGhpcy5haXJRdWFsaXR5O1xuXHR9O1xuXG5cdElFUS5wcm90b3R5cGUuZ2V0RW52UXVhbGl0eUxldmVsID0gZnVuY3Rpb24oKXtcblx0XHRyZXR1cm4gdGhpcy5lbnZRdWFsaXR5O1xuXHR9O1xuXG5cblxuXHQvKipcblx0ICogVXBkYXRlIGludGVybmFsIG1vZGVsIHdpdGggcmVjZWl2ZWQgZGF0YVxuXHQgKiBAcGFyYW0gIGRhdGEgdG8gY29uZmlndXJlIHN1YnNjcmlwdGlvblxuXHQgKiBAcGFyYW0gIGNhbGxiYWNrIGNhbGxlZCBvbiBhbnN3ZXJzIChAcGFyYW0gOiBkYXRhTW9kZWwpXG5cdCAqL1xuXHRJRVEucHJvdG90eXBlLndhdGNoID0gZnVuY3Rpb24oY29uZmlnLCBjYWxsYmFjayl7XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdC8qKiBkZWZhdWx0ICoqL1xuXHRcdGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcblx0XHRjb25maWcudGltZVJhbmdlID0gY29uZmlnLnRpbWVSYW5nZSAgfHwgJ2hvdXJzJztcblx0XHRjb25maWcuY2F0ZWdvcnkgPSBjb25maWcuY2F0IHx8ICdpZXEnOyAvKiBjYXRlZ29yeSAqL1xuXG5cdFx0dmFyIHJlcXVlc3RDb25maWcgPSB7XG5cdFx0XHRzYW1wbGluZzogY29uZmlnLnNhbXBsaW5nIHx8IDUwMCxcblx0XHRcdGNyaXRlcmlhOiB7XG5cdFx0XHRcdHRpbWU6IHtyYW5nZVVuaXQ6IGNvbmZpZy50aW1lUmFuZ2V9LFxuXHRcdFx0XHRyb2JvdHM6IGNvbmZpZy5yb2JvdHNcblx0XHRcdH0sXG5cdFx0XHRjYXRlZ29yeTogY29uZmlnLmNhdGVnb3J5LFxuXHRcdFx0b3BlcmF0b3JzOiBbJ2F2ZycsJ21pbicsJ21heCcsJ3N0ZGRldiddXG5cdFx0fTtcblxuXHRcdC8vIFJlcXVlc3QgaGlzdG9yeSBkYXRhIGJlZm9yZSBzdWJzY3JpYmluZ1xuXHRcdHRoaXMuc2VsZWN0b3IucmVxdWVzdCh7XG5cdFx0XHRzZXJ2aWNlOiBcImllcVwiLFxuXHRcdFx0ZnVuYzogXCJEYXRhUmVxdWVzdFwiLFxuXHRcdFx0ZGF0YToge2RhdGE6IEpTT04uc3RyaW5naWZ5KHJlcXVlc3RDb25maWcpfSxcblx0XHRcdG9iajp7XG5cdFx0XHRcdHBhdGg6ICcvZnIvcGFydG5lcmluZy9JZXEnLFxuXHRcdFx0XHRpbnRlcmZhY2U6IFwiZnIucGFydG5lcmluZy5JZXFcIlxuXHRcdFx0fVxuXHRcdH0sIGZ1bmN0aW9uKGRuSWQsIGVyciwgZGF0YVN0cmluZyl7XG5cdFx0XHR2YXIgZGF0YSA9IEpTT04ucGFyc2UoZGF0YVN0cmluZyk7XG5cdFx0XHRpZihlcnIgIT0gbnVsbCkge1xuXHRcdFx0XHRpZiAodHlwZW9mIGVyciA9PVwic3RyaW5nXCIpIExvZ2dlci5lcnJvcihcIlJlY3YgZXJyOiBcIisgZXJyKTtcblx0XHRcdFx0ZWxzZSBpZiAodHlwZW9mIGVyciA9PSBcIm9iamVjdFwiICYmIHR5cGVvZiBlcnIubmFtZSA9PSdzdHJpbmcnKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2sobnVsbCwgZXJyLm5hbWUpO1xuXHRcdFx0XHRcdGlmICh0eXBlb2YgZXJyLm1lc3NhZ2U9PVwic3RyaW5nXCIpIExvZ2dlci5lcnJvcihlcnIubWVzc2FnZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0Y2FsbGJhY2sodGhhdC5fZ2V0RGF0YU1vZGVsRnJvbVJlY3YoZGF0YSkpOyAvLyBjYWxsYmFjayBmdW5jXG5cdFx0fSk7XG5cblx0XHR2YXIgc3VicyA9IHRoaXMuc2VsZWN0b3Iuc3Vic2NyaWJlKHtcblx0XHRcdHNlcnZpY2U6IFwiaWVxXCIsXG5cdFx0XHRmdW5jOiBcIlNlY29uZFwiLFxuXHRcdFx0ZGF0YToge2RhdGE6IGNvbmZpZ30sXG5cdFx0XHRvYmo6e1xuXHRcdFx0XHRwYXRoOiAnL2ZyL3BhcnRuZXJpbmcvSWVxJyxcblx0XHRcdFx0aW50ZXJmYWNlOiBcImZyLnBhcnRuZXJpbmcuSWVxXCJcblx0XHRcdH1cblx0XHR9LCBmdW5jdGlvbihkbmQsIGVyciwgZGF0YSl7XG5cdFx0XHRpZihlcnIpIHtcblx0XHRcdC8vXHRMb2dnZXIuZXJyb3IoXCJXYXRjaElFUVJlY3ZFcnI6XCIrSlNPTi5zdHJpbmdpZnkoZXJyKSk7XG5cdFx0XHRcdHRoYXQuY2xvc2VTdWJzY3JpcHRpb25zKCk7IC8vIHNob3VsZCBub3QgYmUgbmVjZXNzYXJ5XG5cdFx0XHRcdHRoYXQuc3Vic2NyaXB0aW9uUmVxUGVyaW9kID0gdGhhdC5zdWJzY3JpcHRpb25SZXFQZXJpb2QrMTAwMHx8MTAwMDsgLy8gaW5jcmVhc2UgZGVsYXkgYnkgMSBzZWNcblx0XHRcdFx0aWYodGhhdC5zdWJzY3JpcHRpb25SZXFQZXJpb2QgPiAzMDAwMDApIHRoYXQuc3Vic2NyaXB0aW9uUmVxUGVyaW9kPTMwMDAwMDsgLy8gbWF4IDVtaW5cblx0XHRcdFx0c3Vicy53YXRjaFRlbnRhdGl2ZSA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHR0aGF0LndhdGNoKGNvbmZpZyxjYWxsYmFjayk7IH0sIHRoYXQuc3Vic2NyaXB0aW9uUmVxUGVyaW9kKTsgLy8gdHJ5IGFnYWluIGxhdGVyXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdGRhdGEgPSBKU09OLnBhcnNlKGRhdGEpO1xuXG5cdFx0XHR0aGF0LnN1YnNjcmlwdGlvblJlcVBlcmlvZD0wOyAvLyByZXNldCBwZXJpb2Qgb24gc3Vic2NyaXB0aW9uIHJlcXVlc3RzXG5cdFx0XHRjYWxsYmFjayh0aGF0Ll9nZXREYXRhTW9kZWxGcm9tUmVjdihkYXRhKSk7IC8vIGNhbGxiYWNrIGZ1bmNcblx0XHR9KTtcblxuXHRcdHRoaXMuc3Vic2NyaXB0aW9ucy5wdXNoKHN1YnMpO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBDbG9zZSBhbGwgc3Vic2NyaXB0aW9uc1xuXHQgKi9cblx0SUVRLnByb3RvdHlwZS5jbG9zZVN1YnNjcmlwdGlvbnMgPSBmdW5jdGlvbigpe1xuXHRcdGZvcih2YXIgaSBpbiB0aGlzLnN1YnNjcmlwdGlvbnMpIHtcblx0XHRcdHRoaXMuc3Vic2NyaXB0aW9uc1tpXS5jbG9zZSgpO1xuXHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMuc3Vic2NyaXB0aW9uc1tpXS53YXRjaFRlbnRhdGl2ZSk7XG5cdFx0fVxuXHRcdHRoaXMuc3Vic2NyaXB0aW9ucyA9W107XG5cdH07XG5cblx0LyoqXG5cdCogUmVxdWVzdCBEYXRhIHRvIG1ha2UgQ1NWIGZpbGVcblx0XHQqIEBwYXJhbSB7b2JqZWN0fSBjc3ZDb25maWcgcGFyYW1zOlxuXHRcdCogQHBhcmFtIHtsaXN0fSBjc3ZDb25maWcuc2Vuc29yTmFtZXMgOiBsaXN0IG9mIHNlbnNvciBhbmQgaW5kZXggbmFtZXNcblx0XHQqIEBwYXJhbSB7bnVtYmVyfSBjc3ZDb25maWcuX3N0YXJ0VGltZTogdGltZXN0YW1wIG9mIGJlZ2lubmluZyB0aW1lXG5cdFx0KiBAcGFyYW0ge251bWJlcn0gY3N2Q29uZmlnLl9lbmRUaW1lOiB0aW1lc3RhbXAgb2YgZW5kIHRpbWVcblx0XHQqIEBwYXJhbSB7c3RyaW5nfSBjc3ZDb25maWcudGltZVNhbXBsZTogdGltZWludGVydmFsIGZvciBkYXRhLiBQYXJhbWV0ZXJzOiBcInNlY29uZFwiLCBcIm1pbnV0ZVwiLCBcImhvdXJcIiwgXCJkYXlcIiwgXCJ3ZWVrXCIsIFwibW9udGhcIlxuXHRcdCogQHBhcmFtIHtudW1iZXJ9IGNzdkNvbmZpZy5fbmxpbmVzOiBtYXhpbXVtIG51bWJlciBvZiBsaW5lcyByZXF1ZXN0ZWRcblx0XHQqIEBwYXJhbSB7Y2FsbGJhY2t9IGNhbGxiYWNrOiBjYWxsZWQgYWZ0ZXIgdXBkYXRlXG5cdCovXG5cblxuXHRJRVEucHJvdG90eXBlLmdldENTVkRhdGEgPSBmdW5jdGlvbihjc3ZDb25maWcsIGNhbGxiYWNrKXtcblxuXHRcdHZhciB0aGF0ID0gdGhpcztcblxuXHRcdGlmIChjc3ZDb25maWcgJiYgdHlwZW9mIGNzdkNvbmZpZy5ubGluZXMgIT1cIm51bWJlclwiICkgY3N2Q29uZmlnLm5saW5lcyA9IHVuZGVmaW5lZDtcblxuXHRcdHZhciBkYXRhQ29uZmlnID1KU09OLnN0cmluZ2lmeSh7XG5cdFx0XHRjcml0ZXJpYToge1xuXHRcdFx0XHR0aW1lOiB7IHN0YXJ0OiAobmV3IERhdGUoY3N2Q29uZmlnLnN0YXJ0VGltZSkpLmdldFRpbWUoKSwgZW5kOiAobmV3IERhdGUoY3N2Q29uZmlnLmVuZFRpbWUpKS5nZXRUaW1lKCkgLCBzYW1wbGluZzpjc3ZDb25maWcudGltZVNhbXBsZX0sXG5cdFx0XHRcdHBsYWNlczogW10sXG5cdFx0XHRcdHJvYm90czogW11cblx0XHRcdH0sXG5cdFx0XHRzZW5zb3JzOiBjc3ZDb25maWcuc2Vuc29yTmFtZXMsXG5cdFx0XHRzYW1wbGluZzogY3N2Q29uZmlnLm5saW5lc1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5zZWxlY3Rvci5yZXF1ZXN0KHtcblx0XHRcdHNlcnZpY2U6IFwiaWVxXCIsXG5cdFx0XHRmdW5jOiBcIkNzdkRhdGFSZXF1ZXN0XCIsXG5cdFx0XHRkYXRhOiB7ZGF0YTogZGF0YUNvbmZpZ30sXG5cdFx0XHQvL1x0dHlwZTpcInNwbFJlcVwiLFxuXHRcdFx0b2JqOntcblx0XHRcdFx0cGF0aDogJy9mci9wYXJ0bmVyaW5nL0llcScsXG5cdFx0XHRcdGludGVyZmFjZTogXCJmci5wYXJ0bmVyaW5nLkllcVwiXG5cdFx0XHR9XG5cdFx0fSwgZnVuY3Rpb24oZG5JZCwgZXJyLCBkYXRhKXtcblx0XHRcdGlmKGVycikge1xuXHRcdFx0XHRpZiAodHlwZW9mIGVyciA9PVwic3RyaW5nXCIpIExvZ2dlci5lcnJvcihcIlJlY3YgZXJyOiBcIisgZXJyKTtcblx0XHRcdFx0ZWxzZSBpZiAodHlwZW9mIGVyciA9PSBcIm9iamVjdFwiICYmIHR5cGVvZiBlcnIubmFtZSA9PSdzdHJpbmcnKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2sobnVsbCwgZXJyLm5hbWUpO1xuXHRcdFx0XHRcdGlmICh0eXBlb2YgZXJyLm1lc3NhZ2U9PVwic3RyaW5nXCIpIExvZ2dlci5lcnJvcihlcnIubWVzc2FnZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0aWYodHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGRhdGEpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdC8vIERFUFJFQ0FURURcblx0XHRcdFx0aWYoZGF0YSAmJiBkYXRhLmhlYWRlciAmJiBkYXRhLmhlYWRlci5lcnJvcikge1xuXHRcdFx0XHQvLyBUT0RPIDogY2hlY2svdXNlIGVyciBzdGF0dXMgYW5kIGFkYXB0IGJlaGF2aW9yIGFjY29yZGluZ2x5XG5cdFx0XHRcdExvZ2dlci5lcnJvcihcIlVwZGF0ZURhdGE6XFxuXCIrSlNPTi5zdHJpbmdpZnkoZGF0YS5oZWFkZXIuZGF0YUNvbmZpZykpO1xuXHRcdFx0XHRMb2dnZXIuZXJyb3IoXCJEYXRhIHJlcXVlc3QgZmFpbGVkIChcIitkYXRhLmhlYWRlci5lcnJvci5zdCtcIik6IFwiK2RhdGEuaGVhZGVyLmVycm9yLm1zZyk7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoYXQuX2dldERhdGFNb2RlbEZyb21SZWN2KGRhdGEpO1xuXHRcdFx0XHQvLyBMb2dnZXIubG9nKHRoYXQuZ2V0RGF0YU1vZGVsKCkpO1xuXHRcdFx0XHRjYWxsYmFjayh0aGF0LmdldERhdGFNb2RlbCgpKTsgLy8gY2FsbGJhY2sgZnVuY1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xuXG5cblxuXHQvKipcblx0ICogUmVxdWVzdCBEYXRhIHRvIG1ha2UgZGF0YSBtYXBcblx0ICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhQ29uZmlnIGNvbmZpZyBmb3IgZGF0YSByZXF1ZXN0XG5cdCAgKiBAcGFyYW0ge2NhbGxiYWNrfSBjYWxsYmFjazogY2FsbGVkIGFmdGVyIHVwZGF0ZVxuXHQgICovXG5cdElFUS5wcm90b3R5cGUuZ2V0RGF0YU1hcERhdGEgPSBmdW5jdGlvbihkYXRhQ29uZmlnLCBjYWxsYmFjayl7XG5cdFx0dGhpcy5fdXBkYXRlRGF0YShjYWxsYmFjaywgZGF0YUNvbmZpZywgXCJEYXRhUmVxdWVzdFwiKTtcblx0fTtcblxuXG5cdC8qKlxuXHQgKiBSZXF1ZXN0IERhdGEgdG8gbWFrZSBoZWF0bWFwXG5cdCAgKiBAcGFyYW0ge2xpc3R9IHNlbnNvck5hbWVzIDogbGlzdCBvZiBzZW5zb3IgYW5kIGluZGV4IG5hbWVzXG5cdCAgKiBAcGFyYW0ge29iamVjdH0gdGltZTogb2JqZWN0IGNvbnRhaW5pbmcgdGltZXN0YW1wcyBmb3IgYmVnaW4gYW5kIGVuZCBvZiBkYXRhIGZvciBoZWF0bWFwXG5cdCAgKiBAcGFyYW0ge3N0cmluZ30gc2FtcGxlOiB0aW1laW50ZXJ2YWwgZm9yIGRhdGEuIFBhcmFtZXRlcnM6IFwic2Vjb25kXCIsIFwibWludXRlXCIsIFwiaG91clwiLCBcImRheVwiLCBcIndlZWtcIiwgXCJtb250aFwiXG5cdCAgKiBAcGFyYW0ge2NhbGxiYWNrfSBjYWxsYmFjazogY2FsbGVkIGFmdGVyIHVwZGF0ZVxuXHQgICogQGRlcHJlY2F0ZWQgV2lsbCBiZSBkZXByZWNhdGVkIGluIGZ1dHVyZSB2ZXJzaW9uLiBQbGVhc2UgdXNlIFwiZ2V0RGF0YU1hcERhdGFcIiBpbnN0ZWFkLlxuXG5cdCAgKi9cblx0SUVRLnByb3RvdHlwZS5nZXRIZWF0TWFwRGF0YSA9IGZ1bmN0aW9uKHNlbnNvck5hbWVzLHRpbWUsIHNhbXBsZSwgY2FsbGJhY2spe1xuXHRcdHZhciBkYXRhQ29uZmlnID0ge1xuXHRcdFx0Y3JpdGVyaWE6IHtcblx0XHRcdFx0dGltZToge3N0YXJ0OiB0aW1lLnN0YXJ0RXBvY2gsIGVuZDogdGltZS5lbmRFcG9jaCwgc2FtcGxpbmc6IHNhbXBsZX0sXG5cdFx0XHRcdHBsYWNlczogW10sXG5cdFx0XHRcdHJvYm90czogW11cblx0XHRcdH0sXG5cdFx0XHRzZW5zb3JzOiBzZW5zb3JOYW1lc1xuXHRcdH07XG5cdFx0Y29uc29sZS53YXJuKCdUaGlzIGZ1bmN0aW9uIHdpbGwgYmUgZGVwcmVjYXRlZC4gUGxlYXNlIHVzZSBcImdldERhdGFNYXBEYXRhXCIgaW5zdGVhZC4nKTtcblx0XHR0aGlzLmdldERhdGFNYXBEYXRhKGRhdGFDb25maWcsIGNhbGxiYWNrKVxuXHR9O1xuXG5cdC8qKlxuXHQgKiBVcGRhdGUgaW50ZXJuYWwgbW9kZWwgd2l0aCByZWNlaXZlZCBkYXRhXG5cdCAqIEBwYXJhbSAge09iamVjdH0gZGF0YSBkYXRhIHJlY2VpdmVkIGZyb20gRGl5YU5vZGUgYnkgd2Vic29ja2V0XG5cdCAqIEByZXR1cm4ge1t0eXBlXX1cdFx0W2Rlc2NyaXB0aW9uXVxuXHQgKi9cblx0SUVRLnByb3RvdHlwZS5fZ2V0RGF0YU1vZGVsRnJvbVJlY3YgPSBmdW5jdGlvbihkYXRhKXtcblx0XHR2YXIgZGF0YU1vZGVsPW51bGw7XG5cdC8vXHRjb25zb2xlLmxvZygnZ2V0RGF0YU1vZGVsJyk7XG5cdC8vXHRjb25zb2xlLmxvZyhkYXRhKTtcblx0LypcdGlmKGRhdGEuZXJyICYmIGRhdGEuZXJyLnN0PjApIHtcblx0XHRcdExvZ2dlci5lcnJvcihkYXRhLmVyci5tc2cpO1xuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fSAqL1xuXHQvL1x0ZGVsZXRlIGRhdGEuZXJyO1xuXHRcdGlmKGRhdGEgIT0gbnVsbCkge1xuXHRcdFx0Zm9yICh2YXIgbiBpbiBkYXRhKSB7XG5cdFx0XHRcdGlmKG4gIT0gXCJoZWFkZXJcIiAmJiBuICE9IFwiZXJyXCIpIHtcblxuXHRcdFx0XHRcdGlmKGRhdGFbbl0uZXJyICYmIGRhdGFbbl0uZXJyLnN0PjApIHtcblx0XHRcdFx0XHRcdExvZ2dlci5lcnJvcihuK1wiIHdhcyBpbiBlcnJvcjogXCIrZGF0YVtuXS5lcnIubXNnKTtcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmKCFkYXRhTW9kZWwpXG5cdFx0XHRcdFx0XHRkYXRhTW9kZWw9e307XG5cblx0XHRcdFx0XHQvLyBMb2dnZXIubG9nKG4pO1xuXHRcdFx0XHRcdGlmKCFkYXRhTW9kZWxbbl0pIHtcblx0XHRcdFx0XHRcdGRhdGFNb2RlbFtuXT17fTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0LyogdXBkYXRlIGRhdGEgYWJzb2x1dGUgcmFuZ2UgKi9cblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0ucmFuZ2U9ZGF0YVtuXS5yYW5nZTtcblx0XHRcdFx0XHQvKiB1cGRhdGUgZGF0YSByYW5nZSAqL1xuXHRcdFx0XHRcdGRhdGFNb2RlbFtuXS50aW1lUmFuZ2U9ZGF0YVtuXS50aW1lUmFuZ2U7XG5cdFx0XHRcdFx0LyogdXBkYXRlIGRhdGEgbGFiZWwgKi9cblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0ubGFiZWw9ZGF0YVtuXS5sYWJlbDtcblx0XHRcdFx0XHQvKiB1cGRhdGUgZGF0YSB1bml0ICovXG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnVuaXQ9ZGF0YVtuXS51bml0O1xuXHRcdFx0XHRcdC8qIHVwZGF0ZSBkYXRhIHByZWNpc2lvbiAqL1xuXHRcdFx0XHRcdGRhdGFNb2RlbFtuXS5wcmVjaXNpb249ZGF0YVtuXS5wcmVjaXNpb247XG5cdFx0XHRcdFx0LyogdXBkYXRlIGRhdGEgY2F0ZWdvcmllcyAqL1xuXHRcdFx0XHRcdGRhdGFNb2RlbFtuXS5jYXRlZ29yeT1kYXRhW25dLmNhdGVnb3J5O1xuXHRcdFx0XHRcdC8qIHN1Z2dlc3RlZCB5IGRpc3BsYXkgcmFuZ2UgKi9cblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0uem9vbVJhbmdlID0gWzAsIDEwMF07XG5cdFx0XHRcdFx0Ly8gdXBkYXRlIHNlbnNvciBjb25mb3J0IHJhbmdlXG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLmNvbmZvcnRSYW5nZSA9IGRhdGFbbl0uY29uZm9ydFJhbmdlO1xuXG5cdFx0XHRcdFx0LyogdXBkYXRlIGRhdGEgaW5kZXhSYW5nZSAqL1xuXHRcdFx0XHRcdGRhdGFNb2RlbFtuXS5xdWFsaXR5Q29uZmlnPXtcblx0XHRcdFx0XHRcdC8qIGNvbmZvcnRSYW5nZTogZGF0YVtuXS5jb25mb3J0UmFuZ2UsICovXG5cdFx0XHRcdFx0XHRpbmRleFJhbmdlOiBkYXRhW25dLmluZGV4UmFuZ2Vcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdGRhdGFNb2RlbFtuXS50aW1lID0gdGhpcy5fY29kZXIuZnJvbShkYXRhW25dLnRpbWUsJ2I2NCcsOCk7XG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLmRhdGEgPSAoZGF0YVtuXS5kYXRhP3RoaXMuX2NvZGVyLmZyb20oZGF0YVtuXS5kYXRhLCdiNjQnLDQpOihkYXRhW25dLmF2Zz90aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0uYXZnLmQsJ2I2NCcsNCk6bnVsbCkpO1xuXHRcdFx0XHRcdGRhdGFNb2RlbFtuXS5xdWFsaXR5SW5kZXggPSAoZGF0YVtuXS5kYXRhP3RoaXMuX2NvZGVyLmZyb20oZGF0YVtuXS5pbmRleCwnYjY0Jyw0KTooZGF0YVtuXS5hdmc/dGhpcy5fY29kZXIuZnJvbShkYXRhW25dLmF2Zy5pLCdiNjQnLDQpOm51bGwpKTtcblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0ucm9ib3RJZCA9IHRoaXMuX2NvZGVyLmZyb20oZGF0YVtuXS5yb2JvdElkLCdiNjQnLDQpO1xuXHRcdFx0XHRcdGlmKGRhdGFNb2RlbFtuXS5yb2JvdElkKSB7XG5cdFx0XHRcdFx0XHQvKiogZGljbyByb2JvdElkIC0+IHJvYm90TmFtZSAqKi9cblx0XHRcdFx0XHRcdHZhciBkaWNvUm9ib3QgPSB7fTtcblx0XHRcdFx0XHRcdGRhdGEuaGVhZGVyLnJvYm90cy5mb3JFYWNoKGZ1bmN0aW9uKGVsKSB7XG5cdFx0XHRcdFx0XHRcdGRpY29Sb2JvdFtlbC5pZF09ZWwubmFtZTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnJvYm90SWQgPSBkYXRhTW9kZWxbbl0ucm9ib3RJZC5tYXAoZnVuY3Rpb24oZWwpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGRpY29Sb2JvdFtlbF07XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0ucGxhY2VJZCA9IHRoaXMuX2NvZGVyLmZyb20oZGF0YVtuXS5wbGFjZUlkLCdiNjQnLDQpO1xuXHRcdFx0XHRcdGRhdGFNb2RlbFtuXS54ID0gbnVsbDtcblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0ueSA9IG51bGw7XG5cblx0XHRcdFx0XHRpZihkYXRhW25dLmF2Zylcblx0XHRcdFx0XHRcdGRhdGFNb2RlbFtuXS5hdmcgPSB7XG5cdFx0XHRcdFx0XHRcdGQ6IHRoaXMuX2NvZGVyLmZyb20oZGF0YVtuXS5hdmcuZCwnYjY0Jyw0KSxcblx0XHRcdFx0XHRcdFx0aTogdGhpcy5fY29kZXIuZnJvbShkYXRhW25dLmF2Zy5pLCdiNjQnLDQpXG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdGlmKGRhdGFbbl0ubWluKVxuXHRcdFx0XHRcdFx0ZGF0YU1vZGVsW25dLm1pbiA9IHtcblx0XHRcdFx0XHRcdFx0ZDogdGhpcy5fY29kZXIuZnJvbShkYXRhW25dLm1pbi5kLCdiNjQnLDQpLFxuXHRcdFx0XHRcdFx0XHRpOiB0aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0ubWluLmksJ2I2NCcsNClcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0aWYoZGF0YVtuXS5tYXgpXG5cdFx0XHRcdFx0XHRkYXRhTW9kZWxbbl0ubWF4ID0ge1xuXHRcdFx0XHRcdFx0XHRkOiB0aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0ubWF4LmQsJ2I2NCcsNCksXG5cdFx0XHRcdFx0XHRcdGk6IHRoaXMuX2NvZGVyLmZyb20oZGF0YVtuXS5tYXguaSwnYjY0Jyw0KVxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRpZihkYXRhW25dLnN0ZGRldilcblx0XHRcdFx0XHRcdGRhdGFNb2RlbFtuXS5zdGRkZXYgPSB7XG5cdFx0XHRcdFx0XHRcdGQ6IHRoaXMuX2NvZGVyLmZyb20oZGF0YVtuXS5zdGRkZXYuZCwnYjY0Jyw0KSxcblx0XHRcdFx0XHRcdFx0aTogdGhpcy5fY29kZXIuZnJvbShkYXRhW25dLnN0ZGRldi5pLCdiNjQnLDQpXG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdGlmKGRhdGFbbl0uc3RkZGV2KVxuXHRcdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnN0ZGRldiA9IHtcblx0XHRcdFx0XHRcdFx0ZDogdGhpcy5fY29kZXIuZnJvbShkYXRhW25dLnN0ZGRldi5kLCdiNjQnLDQpLFxuXHRcdFx0XHRcdFx0XHRpOiB0aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0uc3RkZGV2LmksJ2I2NCcsNClcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0aWYoZGF0YVtuXS54KVxuXHRcdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnggPSB0aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0ueCwnYjY0Jyw0KTtcblx0XHRcdFx0XHRpZihkYXRhW25dLnkpXG5cdFx0XHRcdFx0XHRkYXRhTW9kZWxbbl0ueSA9IHRoaXMuX2NvZGVyLmZyb20oZGF0YVtuXS55LCdiNjQnLDQpO1xuXHRcdFx0XHRcdC8qKlxuXHRcdFx0XHRcdCAqIGN1cnJlbnQgcXVhbGl0eSA6IHsnYidhZCwgJ20nZWRpdW0sICdnJ29vZH1cblx0XHRcdFx0XHQgKiBldm9sdXRpb24gOiB7J3UncCwgJ2Qnb3duLCAncyd0YWJsZX1cblx0XHRcdFx0XHQgKiBldm9sdXRpb24gcXVhbGl0eSA6IHsnYidldHRlciwgJ3cnb3JzZSwgJ3MnYW1lfVxuXHRcdFx0XHRcdCAqL1xuXHRcdFx0XHRcdC8vLyBUT0RPXG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnRyZW5kID0gJ21zcyc7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRMb2dnZXIuZXJyb3IoXCJObyBEYXRhIHRvIHJlYWQgb3IgaGVhZGVyIGlzIG1pc3NpbmcgIVwiKTtcblx0XHR9XG5cdFx0LyoqIGxpc3Qgcm9ib3RzICoqL1xuXHQvL1x0ZGF0YU1vZGVsLnJvYm90cyA9IFt7bmFtZTogJ0QyUjInLCBpZDoxfV07XG5cdFx0dGhpcy5kYXRhTW9kZWw9ZGF0YU1vZGVsO1xuXHRcdHJldHVybiBkYXRhTW9kZWw7XG5cdH07XG5cblxuXG5cblxuXHQvKiogY3JlYXRlIElFUSBzZXJ2aWNlICoqL1xuXHREaXlhU2VsZWN0b3IucHJvdG90eXBlLklFUSA9IGZ1bmN0aW9uKCl7XG5cdFx0cmV0dXJuIG5ldyBJRVEodGhpcyk7XG5cdH07XG59KSgpXG4iXX0=
