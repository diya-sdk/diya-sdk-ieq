(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process){
/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // NB: In an Electron preload script, document will be defined but not fully
  // initialized. Since we know we're in Chrome, we'll just detect this case
  // explicitly
  if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') {
    return true;
  }

  // is webkit? http://stackoverflow.com/a/16459606/376773
  // document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
  return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
    // double check webkit in userAgent just in case we are in a worker
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  try {
    return JSON.stringify(v);
  } catch (err) {
    return '[UnexpectedJSONParseError]: ' + err.message;
  }
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs(args) {
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return;

  var c = 'color: ' + this.color;
  args.splice(1, 0, c, 'color: inherit')

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-zA-Z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}

  // If debug isn't set in LS, and we're in Electron, try to load $DEBUG
  if (!r && typeof process !== 'undefined' && 'env' in process) {
    r = process.env.DEBUG;
  }

  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage() {
  try {
    return window.localStorage;
  } catch (e) {}
}

}).call(this,require('_process'))

},{"./debug":2,"_process":5}],2:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = createDebug.debug = createDebug['default'] = createDebug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
 */

exports.formatters = {};

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 * @param {String} namespace
 * @return {Number}
 * @api private
 */

function selectColor(namespace) {
  var hash = 0, i;

  for (i in namespace) {
    hash  = ((hash << 5) - hash) + namespace.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  return exports.colors[Math.abs(hash) % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function createDebug(namespace) {

  function debug() {
    // disabled?
    if (!debug.enabled) return;

    var self = debug;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // turn the `arguments` into a proper Array
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %O
      args.unshift('%O');
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-zA-Z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    // apply env-specific formatting (colors, etc.)
    exports.formatArgs.call(self, args);

    var logFn = debug.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }

  debug.namespace = namespace;
  debug.enabled = exports.enabled(namespace);
  debug.useColors = exports.useColors();
  debug.color = selectColor(namespace);

  // env-specific initialization logic for debug instances
  if ('function' === typeof exports.init) {
    exports.init(debug);
  }

  return debug;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  exports.names = [];
  exports.skips = [];

  var split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":4}],3:[function(require,module,exports){
'use strict';

var has = Object.prototype.hasOwnProperty
  , prefix = '~';

/**
 * Constructor to create a storage for our `EE` objects.
 * An `Events` instance is a plain object whose properties are event names.
 *
 * @constructor
 * @api private
 */
function Events() {}

//
// We try to not inherit from `Object.prototype`. In some engines creating an
// instance in this way is faster than calling `Object.create(null)` directly.
// If `Object.create(null)` is not supported we prefix the event names with a
// character to make sure that the built-in object properties are not
// overridden or used as an attack vector.
//
if (Object.create) {
  Events.prototype = Object.create(null);

  //
  // This hack is needed because the `__proto__` property is still inherited in
  // some old browsers like Android 4, iPhone 5.1, Opera 11 and Safari 5.
  //
  if (!new Events().__proto__) prefix = false;
}

/**
 * Representation of a single event listener.
 *
 * @param {Function} fn The listener function.
 * @param {Mixed} context The context to invoke the listener with.
 * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
 * @constructor
 * @api private
 */
function EE(fn, context, once) {
  this.fn = fn;
  this.context = context;
  this.once = once || false;
}

/**
 * Minimal `EventEmitter` interface that is molded against the Node.js
 * `EventEmitter` interface.
 *
 * @constructor
 * @api public
 */
function EventEmitter() {
  this._events = new Events();
  this._eventsCount = 0;
}

/**
 * Return an array listing the events for which the emitter has registered
 * listeners.
 *
 * @returns {Array}
 * @api public
 */
EventEmitter.prototype.eventNames = function eventNames() {
  var names = []
    , events
    , name;

  if (this._eventsCount === 0) return names;

  for (name in (events = this._events)) {
    if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
  }

  if (Object.getOwnPropertySymbols) {
    return names.concat(Object.getOwnPropertySymbols(events));
  }

  return names;
};

/**
 * Return the listeners registered for a given event.
 *
 * @param {String|Symbol} event The event name.
 * @param {Boolean} exists Only check if there are listeners.
 * @returns {Array|Boolean}
 * @api public
 */
EventEmitter.prototype.listeners = function listeners(event, exists) {
  var evt = prefix ? prefix + event : event
    , available = this._events[evt];

  if (exists) return !!available;
  if (!available) return [];
  if (available.fn) return [available.fn];

  for (var i = 0, l = available.length, ee = new Array(l); i < l; i++) {
    ee[i] = available[i].fn;
  }

  return ee;
};

/**
 * Calls each of the listeners registered for a given event.
 *
 * @param {String|Symbol} event The event name.
 * @returns {Boolean} `true` if the event had listeners, else `false`.
 * @api public
 */
EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
  var evt = prefix ? prefix + event : event;

  if (!this._events[evt]) return false;

  var listeners = this._events[evt]
    , len = arguments.length
    , args
    , i;

  if (listeners.fn) {
    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

    switch (len) {
      case 1: return listeners.fn.call(listeners.context), true;
      case 2: return listeners.fn.call(listeners.context, a1), true;
      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
    }

    for (i = 1, args = new Array(len -1); i < len; i++) {
      args[i - 1] = arguments[i];
    }

    listeners.fn.apply(listeners.context, args);
  } else {
    var length = listeners.length
      , j;

    for (i = 0; i < length; i++) {
      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

      switch (len) {
        case 1: listeners[i].fn.call(listeners[i].context); break;
        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
        case 4: listeners[i].fn.call(listeners[i].context, a1, a2, a3); break;
        default:
          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
            args[j - 1] = arguments[j];
          }

          listeners[i].fn.apply(listeners[i].context, args);
      }
    }
  }

  return true;
};

/**
 * Add a listener for a given event.
 *
 * @param {String|Symbol} event The event name.
 * @param {Function} fn The listener function.
 * @param {Mixed} [context=this] The context to invoke the listener with.
 * @returns {EventEmitter} `this`.
 * @api public
 */
EventEmitter.prototype.on = function on(event, fn, context) {
  var listener = new EE(fn, context || this)
    , evt = prefix ? prefix + event : event;

  if (!this._events[evt]) this._events[evt] = listener, this._eventsCount++;
  else if (!this._events[evt].fn) this._events[evt].push(listener);
  else this._events[evt] = [this._events[evt], listener];

  return this;
};

/**
 * Add a one-time listener for a given event.
 *
 * @param {String|Symbol} event The event name.
 * @param {Function} fn The listener function.
 * @param {Mixed} [context=this] The context to invoke the listener with.
 * @returns {EventEmitter} `this`.
 * @api public
 */
EventEmitter.prototype.once = function once(event, fn, context) {
  var listener = new EE(fn, context || this, true)
    , evt = prefix ? prefix + event : event;

  if (!this._events[evt]) this._events[evt] = listener, this._eventsCount++;
  else if (!this._events[evt].fn) this._events[evt].push(listener);
  else this._events[evt] = [this._events[evt], listener];

  return this;
};

/**
 * Remove the listeners of a given event.
 *
 * @param {String|Symbol} event The event name.
 * @param {Function} fn Only remove the listeners that match this function.
 * @param {Mixed} context Only remove the listeners that have this context.
 * @param {Boolean} once Only remove one-time listeners.
 * @returns {EventEmitter} `this`.
 * @api public
 */
EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
  var evt = prefix ? prefix + event : event;

  if (!this._events[evt]) return this;
  if (!fn) {
    if (--this._eventsCount === 0) this._events = new Events();
    else delete this._events[evt];
    return this;
  }

  var listeners = this._events[evt];

  if (listeners.fn) {
    if (
         listeners.fn === fn
      && (!once || listeners.once)
      && (!context || listeners.context === context)
    ) {
      if (--this._eventsCount === 0) this._events = new Events();
      else delete this._events[evt];
    }
  } else {
    for (var i = 0, events = [], length = listeners.length; i < length; i++) {
      if (
           listeners[i].fn !== fn
        || (once && !listeners[i].once)
        || (context && listeners[i].context !== context)
      ) {
        events.push(listeners[i]);
      }
    }

    //
    // Reset the array, or remove it completely if we have no more listeners.
    //
    if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
    else if (--this._eventsCount === 0) this._events = new Events();
    else delete this._events[evt];
  }

  return this;
};

/**
 * Remove all listeners, or those of the specified event.
 *
 * @param {String|Symbol} [event] The event name.
 * @returns {EventEmitter} `this`.
 * @api public
 */
EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
  var evt;

  if (event) {
    evt = prefix ? prefix + event : event;
    if (this._events[evt]) {
      if (--this._eventsCount === 0) this._events = new Events();
      else delete this._events[evt];
    }
  } else {
    this._events = new Events();
    this._eventsCount = 0;
  }

  return this;
};

//
// Alias methods names because people roll like that.
//
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.addListener = EventEmitter.prototype.on;

//
// This function doesn't apply anymore.
//
EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
  return this;
};

//
// Expose the prefix.
//
EventEmitter.prefixed = prefix;

//
// Allow `EventEmitter` to be imported as module namespace.
//
EventEmitter.EventEmitter = EventEmitter;

//
// Expose the module.
//
if ('undefined' !== typeof module) {
  module.exports = EventEmitter;
}

},{}],4:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} [options]
 * @throws {Error} throw an error if val is not a non-empty string or a number
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options) {
  options = options || {};
  var type = typeof val;
  if (type === 'string' && val.length > 0) {
    return parse(val);
  } else if (type === 'number' && isNaN(val) === false) {
    return options.long ? fmtLong(val) : fmtShort(val);
  }
  throw new Error(
    'val is not a non-empty string or a valid number. val=' +
      JSON.stringify(val)
  );
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = String(str);
  if (str.length > 100) {
    return;
  }
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(
    str
  );
  if (!match) {
    return;
  }
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
    default:
      return undefined;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtShort(ms) {
  if (ms >= d) {
    return Math.round(ms / d) + 'd';
  }
  if (ms >= h) {
    return Math.round(ms / h) + 'h';
  }
  if (ms >= m) {
    return Math.round(ms / m) + 'm';
  }
  if (ms >= s) {
    return Math.round(ms / s) + 's';
  }
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtLong(ms) {
  return plural(ms, d, 'day') ||
    plural(ms, h, 'hour') ||
    plural(ms, m, 'minute') ||
    plural(ms, s, 'second') ||
    ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) {
    return;
  }
  if (ms < n * 1.5) {
    return Math.floor(ms / n) + ' ' + name;
  }
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],8:[function(require,module,exports){
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

},{"./support/isBuffer":7,"_process":5,"inherits":6}],9:[function(require,module,exports){
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

(function () {

	var DiyaSelector = d1.DiyaSelector;
	var util = require('util');
	var Watcher = require('./watcher.js');
	var formatTime = require('./timecontrol.js').formatTime;
	var debug = require('debug')('ieq');

	'use strict';

	//////////////////////////////////////////////////////////////
	/////////////////// Logging utility methods //////////////////
	//////////////////////////////////////////////////////////////

	/**
  * IEQ API handler
  */
	function IEQ(selector) {
		var that = this;
		this.selector = selector;
		this.dataModel = {};
		this._coder = selector.encode();
		this.watchers = [];

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
  	 sampling: {[null] or int} - deprecated
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
		if (newDataConfig != null) {
			this.dataConfig = newDataConfig;
			return this;
		} else {
			return this.dataConfig;
		}
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
		if (newOperator != null) {
			this.dataConfig.operator = newOperator;
			return this;
		} else {
			return this.dataConfig.operator;
		}
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
		if (numSamples != null) {
			this.dataConfig.sampling = numSamples;
			return this;
		} else {
			return this.dataConfig.sampling;
		}
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
		if (newTimeStart != null || newTimeEnd != null || newRange != null) {
			this.dataConfig.criteria.time.start = formatTime(newTimeStart);
			this.dataConfig.criteria.time.end = formatTime(newTimeEnd);
			this.dataConfig.criteria.time.range = newRange;
			return this;
		} else {
			return {
				start: new Date(this.dataConfig.criteria.time.start),
				end: new Date(this.dataConfig.criteria.time.end),
				range: new Date(this.dataConfig.criteria.time.range)
			};
		}
	};
	/**
  * Depends on robotIds
  * Set robot criteria.
  *	@param {Array[Int]} robotIds list of robot Ids
  * Get robot criteria.
  *	@return {Array[Int]} list of robot Ids
  */
	IEQ.prototype.DataRobotIds = function (robotIds) {
		if (robotIds != null) {
			this.dataConfig.criteria.robot = robotIds;
			return this;
		} else {
			return this.dataConfig.criteria.robot;
		}
	};
	/**
  * Depends on placeIds
  * Set place criteria.
  *	@param {Array[Int]} placeIds list of place Ids
  * Get place criteria.
  *	@return {Array[Int]} list of place Ids
  */
	IEQ.prototype.DataPlaceIds = function (placeIds) {
		if (placeIds != null) {
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
			if (err != null) {
				if (typeof err == "string") debug("Recv err: " + err);else if ((typeof err === 'undefined' ? 'undefined' : _typeof(err)) == "object" && typeof err.name == 'string') {
					callback(null, err.name);
					if (typeof err.message == "string") debug(err.message);
				}
				return;
			}
			callback(that._getDataModelFromRecv(data)); // callback func
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
			debug(n + " with nan : " + sensorNan + " (" + dataModelNaN + ") / " + this.dataModel[n].data.length);
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
  * @param  config data to configure subscription
  * @param  callback called on answers (@param : dataModel)
  * @return watcher created watcher
  */
	IEQ.prototype.watch = function (config, callback) {
		var that = this;

		// do not create watcher without a callback
		if (callback == null || typeof callback !== 'function') return null;

		var watcher = new Watcher(this.selector, config);

		// add watcher in watcher list
		this.watchers.push(watcher);

		watcher.on('data', function (data) {
			callback(that._getDataModelFromRecv(data));
		});
		watcher.on('stop', this._removeWatcher);

		return watcher;
	};

	/**
  * Callback to remove watcher from list
  * @param watcher to be removed
  */
	IEQ.prototype._removeWatcher = function (watcher) {
		// find and remove watcher in list
		this.watchers.find(function (el, id, watchers) {
			if (watcher === el) {
				watchers.splice(id, 1); // remove
				return true;
			}
			return false;
		});
	};

	/**
  * Stop all watchers
  */
	IEQ.prototype.closeSubscriptions = function () {
		console.warn('Deprecated function use stopWatchers instead');
		this.stopWatchers();
	};
	IEQ.prototype.stopWatchers = function () {
		var _this = this;

		this.watchers.forEach(function (watcher) {
			// remove listener on stop event to avoid purging watchers twice
			watcher.removeListener('stop', _this._removeWatcher);
			watcher.stop();
		});
		this.watchers = [];
	};

	/**
 * Request Data to make CSV file
 	* @param {object} csvConfig params:
 	* @param {list} csvConfig.sensorNames : list of sensor and index names
 	* @param {number} csvConfig._startTime: timestamp of beginning time
 	* @param {number} csvConfig._endTime: timestamp of end time
 	* @param {string} csvConfig.timeSample: timeinterval for data. Parameters: "second", "minute", "hour", "day", "week", "month"
 	* @param {number} csvConfig._nlines: maximum number of lines requested
 	* @param {callback} callback: called after update (@param url to download csv file)
 */
	IEQ.prototype.getCSVData = function (csvConfig, callback) {

		var that = this;

		if (csvConfig && typeof csvConfig.nlines != "number") csvConfig.nlines = undefined;

		var dataConfig = JSON.stringify({
			criteria: {
				time: { start: formatTime(csvConfig.startTime), end: formatTime(csvConfig.endTime), sampling: csvConfig.timeSample },
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
				if (typeof err == "string") debug("Recv err: " + err);else if ((typeof err === 'undefined' ? 'undefined' : _typeof(err)) == "object" && typeof err.name == 'string') {
					callback(null, err.name);
					if (typeof err.message == "string") debug(err.message);
				}
				return;
			}
			callback(data);
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
				time: { start: formatTime(time.startEpoch), end: formatTime(time.endEpoch), sampling: sample },
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
		debug('GetDataModel', data);
		if (data != null) {
			for (var n in data) {
				if (n != "header" && n != "err") {

					if (data[n].err && data[n].err.st > 0) {
						debug(n + " was in error: " + data[n].err.msg);
						continue;
					}

					if (!dataModel) dataModel = {};

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
			debug("No Data to read or header is missing !");
		}
		/** list robots **/
		this.dataModel = dataModel;
		debug(dataModel);
		return dataModel;
	};

	/** create IEQ service **/
	DiyaSelector.prototype.IEQ = function () {
		return new IEQ(this);
	};
})();

},{"./timecontrol.js":10,"./watcher.js":11,"debug":1,"util":8}],10:[function(require,module,exports){
'use strict';

/***************************************************/
/*
/***************************************************/

var debug = require('debug')('ieq:timecontrol');

'use strict';

/**
 * Convert time to number of milliseconds as used in IEQ API
 * @param {object,string,date,number} time - time to be formatted
 * @return {number} time - in ms
 */
var formatTime = function formatTime(time) {
	return new Date(time).getTime();
};

/**
 * Get time sampling from time range.
 * Set sampling is structure provided in parameter
 * @param {object} time - time criteria i.e. defining range
 * @param {number} maxSamples - max number of samples to be displayed
 * @return {string} timeSampling - computed timeSampling
 */
var getTimeSampling = function getTimeSampling(time, maxSamples) {
	// do nothing without time being defined
	if (time == null) {
		return undefined;
	}
	// default maxSamples
	if (maxSamples == null) {
		maxSamples = 300;
	}

	// assume default time.range is 1
	var range = time.range;
	if (range == null) {
		range = 1;
	}

	// range unit to seconds
	var timeInSeconds = {
		"second": 1,
		"minute": 60,
		"hour": 3600,
		"day": 24 * 3600,
		"week": 7 * 24 * 3600,
		"month": 30 * 24 * 3600,
		"year": 365 * 24 * 3600
	};

	// ordered time thresholds
	var samplingThresholds = [{ thresh: maxSamples, sampling: "Second" }, { thresh: maxSamples * 60, sampling: "Minute" }, { thresh: maxSamples * 3600, sampling: "Hour" }, { thresh: maxSamples * 24 * 3600, sampling: "Day" }, { thresh: maxSamples * 7 * 24 * 3600, sampling: "Week" }, { thresh: maxSamples * 30 * 24 * 3600, sampling: "Month" }];

	var timeUnit = time.rangeUnit.toLowerCase();
	var last = timeUnit.length - 1;
	// remove trailing 's'
	if (timeUnit[last] === 's') {
		timeUnit = timeUnit.slice(0, last);
	}

	var timeInSec = range * timeInSeconds[timeUnit];
	debug("timeInSec: " + timeInSec);

	var timeSampling = "Year"; // default sampling
	// find smallest threshold above timeSec to determine sampling
	samplingThresholds.find(function (samplingThreshold) {
		// update sampling until first threshold above timeSec
		timeSampling = samplingThreshold.sampling;
		return timeInSec < samplingThreshold.thresh;
	});

	debug(timeSampling);
	return timeSampling;
};

// export functions
module.exports = {
	formatTime: formatTime,
	getTimeSampling: getTimeSampling
};

},{"debug":1}],11:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('eventemitter3');
var debug = require('debug')('ieq:watcher');
var debugError = require('debug')('ieq:watcher:errors');
var getTimeSampling = require('./timecontrol.js').getTimeSampling;

// import Promise
var Promise = null;
if (window != null) Promise = window.Promise;else Promise = require('bluebird');

'use strict';

var StopCondition = function (_Error) {
	_inherits(StopCondition, _Error);

	function StopCondition(msg) {
		_classCallCheck(this, StopCondition);

		var _this = _possibleConstructorReturn(this, (StopCondition.__proto__ || Object.getPrototypeOf(StopCondition)).call(this, msg));

		_this.name = 'StopCondition';return _this;
	}

	return StopCondition;
}(Error);

;

// default and max number of samples for the provided time range
var MAXSAMPLING = 300;

var Watcher = function (_EventEmitter) {
	_inherits(Watcher, _EventEmitter);

	/**
  * @param emit emit data (mandatory)
  * @param config to get data from server
  */
	function Watcher(selector, _config) {
		_classCallCheck(this, Watcher);

		var _this2 = _possibleConstructorReturn(this, (Watcher.__proto__ || Object.getPrototypeOf(Watcher)).call(this));

		_this2.selector = selector;
		_this2.state = 'running';

		_this2.reconnectionPeriod = 0; // initial period between reconnections
		_this2.maxReconnectionPeriod = 300000; // max 5 min

		/** initialise options for request **/
		var options = {
			criteria: {
				time: {}
			},
			operators: ['avg', 'min', 'max', 'stddev']
		};
		if (_config.robots instanceof Array) {
			options.criteria.robots = _config.robots;
		}
		if (_config.timeRange != null && typeof _config.timeRange === 'string') {
			options.criteria.time.rangeUnit = _config.timeRange;
		} else {
			options.criteria.time.rangeUnit = 'hours';
		}
		if (_config.category != null && typeof _config.category === 'string') {
			options.category = _config.category;
		} else {
			options.category = 'ieq';
		}
		if (_config.sampling != null && typeof _config.sampling === 'number') {
			options.sampling = _config.sampling;
		} else {
			options.sampling = MAXSAMPLING;
		}
		if (options.sampling > MAXSAMPLING) {
			options.sampling = 300;
		}
		options.criteria.time.sampling = getTimeSampling(options.criteria.time, options.sampling);

		_this2.options = options;
		debug(options);

		_this2.watch(options); // start watcher
		return _this2;
	}

	_createClass(Watcher, [{
		key: 'watch',
		value: function watch(options) {
			var _this3 = this;

			debug('in watch');
			new Promise(function (resolve, reject) {
				// Request history data before subscribing
				_this3.selector.request({
					service: "ieq",
					func: "DataRequest",
					data: {
						data: JSON.stringify(options)
					},
					obj: {
						path: '/fr/partnering/Ieq',
						interface: "fr.partnering.Ieq"
					}
				}, function (dnId, err, dataString) {
					if (err != null) {
						reject(err);
						return;
					}
					if (_this3.state === 'stopped') {
						reject(new StopCondition());
					}
					debug('Request:emitData');
					var data = JSON.parse(dataString);
					_this3.emit('data', data);
					resolve();
				});
			}).then(function (_) {
				// subscribe to signal
				debug('Subscribing');
				return new Promise(function (resolve, reject) {
					_this3.subscription = _this3.selector.subscribe({
						service: "ieq",
						func: options.criteria.time.sampling,
						data: { data: options },
						obj: {
							path: '/fr/partnering/Ieq',
							interface: "fr.partnering.Ieq"
						}
					}, function (dnd, err, data) {
						if (err != null) {
							reject(err);
							return;
						}
						debug('Signal:emitData');
						data = JSON.parse(data);
						_this3.emit('data', data);

						_this3.reconnectionPeriod = 0; // reset period on subscription requests
						resolve();
					});
				});
			}).catch(function (err) {
				if (err.name === 'StopCondition') {
					// watcher stopped : do nothing
					return;
				}
				// try to restart later
				debugError("WatchIEQRecvErr:", err);
				_this3._closeSubscription(); // should not be necessary
				_this3.reconnectionPeriod = _this3.reconnectionPeriod + 1000; // increase delay by 1 sec
				if (_this3.reconnectionPeriod > _this3.maxReconnectionPeriod) {
					_this3.reconnectionPeriod = _this3.maxReconnectionPeriod; // max 5min
				}
				_this3.watchTentative = setTimeout(function (_) {
					_this3.watch(options);
				}, _this3.reconnectionPeriod); // try again later
			});
		}

		// Close subscription if any

	}, {
		key: '_closeSubscription',
		value: function _closeSubscription() {
			debug('In closeSubscription');
			if (this.subscription != null) {
				this.subscription.close();
				this.subscription = null;
			}
		}
	}, {
		key: 'stop',
		value: function stop() {
			debug('In stop');
			this.state = 'stopped';
			if (this.watchTentative != null) {
				clearTimeout(this.watchTentative);
			}
			this._closeSubscription();
			this.emit('stop');
			this.removeAllListeners();
		}
	}]);

	return Watcher;
}(EventEmitter);

module.exports = Watcher;

},{"./timecontrol.js":10,"bluebird":undefined,"debug":1,"eventemitter3":3}]},{},[9])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZGVidWcvc3JjL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvZGVidWcvc3JjL2RlYnVnLmpzIiwibm9kZV9tb2R1bGVzL2V2ZW50ZW1pdHRlcjMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbXMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3V0aWwvbm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvdXRpbC9zdXBwb3J0L2lzQnVmZmVyQnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy91dGlsL3V0aWwuanMiLCJzcmMvaWVxLmpzIiwic3JjL3RpbWVjb250cm9sLmpzIiwic3JjL3dhdGNoZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDekxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMU1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2VEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7QUMxa0JBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQXdCQTs7Ozs7Ozs7Ozs7OztBQWNBLENBQUMsWUFBWTs7QUFFWixLQUFJLGVBQWUsR0FBRyxZQUF0QjtBQUNBLEtBQUksT0FBTyxRQUFRLE1BQVIsQ0FBWDtBQUNBLEtBQUksVUFBVSxRQUFRLGNBQVIsQ0FBZDtBQUNBLEtBQUksYUFBYSxRQUFRLGtCQUFSLEVBQTRCLFVBQTdDO0FBQ0EsS0FBTSxRQUFRLFFBQVEsT0FBUixFQUFpQixLQUFqQixDQUFkOztBQUVBOztBQUtBO0FBQ0E7QUFD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QUssa0JBQUw7QUFDQTs7OztFQTVJb0IsWTs7QUFnSnRCLE9BQU8sT0FBUCxHQUFpQixPQUFqQiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKipcbiAqIFRoaXMgaXMgdGhlIHdlYiBicm93c2VyIGltcGxlbWVudGF0aW9uIG9mIGBkZWJ1ZygpYC5cbiAqXG4gKiBFeHBvc2UgYGRlYnVnKClgIGFzIHRoZSBtb2R1bGUuXG4gKi9cblxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9kZWJ1ZycpO1xuZXhwb3J0cy5sb2cgPSBsb2c7XG5leHBvcnRzLmZvcm1hdEFyZ3MgPSBmb3JtYXRBcmdzO1xuZXhwb3J0cy5zYXZlID0gc2F2ZTtcbmV4cG9ydHMubG9hZCA9IGxvYWQ7XG5leHBvcnRzLnVzZUNvbG9ycyA9IHVzZUNvbG9ycztcbmV4cG9ydHMuc3RvcmFnZSA9ICd1bmRlZmluZWQnICE9IHR5cGVvZiBjaHJvbWVcbiAgICAgICAgICAgICAgICYmICd1bmRlZmluZWQnICE9IHR5cGVvZiBjaHJvbWUuc3RvcmFnZVxuICAgICAgICAgICAgICAgICAgPyBjaHJvbWUuc3RvcmFnZS5sb2NhbFxuICAgICAgICAgICAgICAgICAgOiBsb2NhbHN0b3JhZ2UoKTtcblxuLyoqXG4gKiBDb2xvcnMuXG4gKi9cblxuZXhwb3J0cy5jb2xvcnMgPSBbXG4gICdsaWdodHNlYWdyZWVuJyxcbiAgJ2ZvcmVzdGdyZWVuJyxcbiAgJ2dvbGRlbnJvZCcsXG4gICdkb2RnZXJibHVlJyxcbiAgJ2RhcmtvcmNoaWQnLFxuICAnY3JpbXNvbidcbl07XG5cbi8qKlxuICogQ3VycmVudGx5IG9ubHkgV2ViS2l0LWJhc2VkIFdlYiBJbnNwZWN0b3JzLCBGaXJlZm94ID49IHYzMSxcbiAqIGFuZCB0aGUgRmlyZWJ1ZyBleHRlbnNpb24gKGFueSBGaXJlZm94IHZlcnNpb24pIGFyZSBrbm93blxuICogdG8gc3VwcG9ydCBcIiVjXCIgQ1NTIGN1c3RvbWl6YXRpb25zLlxuICpcbiAqIFRPRE86IGFkZCBhIGBsb2NhbFN0b3JhZ2VgIHZhcmlhYmxlIHRvIGV4cGxpY2l0bHkgZW5hYmxlL2Rpc2FibGUgY29sb3JzXG4gKi9cblxuZnVuY3Rpb24gdXNlQ29sb3JzKCkge1xuICAvLyBOQjogSW4gYW4gRWxlY3Ryb24gcHJlbG9hZCBzY3JpcHQsIGRvY3VtZW50IHdpbGwgYmUgZGVmaW5lZCBidXQgbm90IGZ1bGx5XG4gIC8vIGluaXRpYWxpemVkLiBTaW5jZSB3ZSBrbm93IHdlJ3JlIGluIENocm9tZSwgd2UnbGwganVzdCBkZXRlY3QgdGhpcyBjYXNlXG4gIC8vIGV4cGxpY2l0bHlcbiAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5wcm9jZXNzICYmIHdpbmRvdy5wcm9jZXNzLnR5cGUgPT09ICdyZW5kZXJlcicpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8vIGlzIHdlYmtpdD8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMTY0NTk2MDYvMzc2NzczXG4gIC8vIGRvY3VtZW50IGlzIHVuZGVmaW5lZCBpbiByZWFjdC1uYXRpdmU6IGh0dHBzOi8vZ2l0aHViLmNvbS9mYWNlYm9vay9yZWFjdC1uYXRpdmUvcHVsbC8xNjMyXG4gIHJldHVybiAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJyAmJiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQgJiYgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlICYmIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZS5XZWJraXRBcHBlYXJhbmNlKSB8fFxuICAgIC8vIGlzIGZpcmVidWc/IGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzM5ODEyMC8zNzY3NzNcbiAgICAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LmNvbnNvbGUgJiYgKHdpbmRvdy5jb25zb2xlLmZpcmVidWcgfHwgKHdpbmRvdy5jb25zb2xlLmV4Y2VwdGlvbiAmJiB3aW5kb3cuY29uc29sZS50YWJsZSkpKSB8fFxuICAgIC8vIGlzIGZpcmVmb3ggPj0gdjMxP1xuICAgIC8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvVG9vbHMvV2ViX0NvbnNvbGUjU3R5bGluZ19tZXNzYWdlc1xuICAgICh0eXBlb2YgbmF2aWdhdG9yICE9PSAndW5kZWZpbmVkJyAmJiBuYXZpZ2F0b3IudXNlckFnZW50ICYmIG5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKS5tYXRjaCgvZmlyZWZveFxcLyhcXGQrKS8pICYmIHBhcnNlSW50KFJlZ0V4cC4kMSwgMTApID49IDMxKSB8fFxuICAgIC8vIGRvdWJsZSBjaGVjayB3ZWJraXQgaW4gdXNlckFnZW50IGp1c3QgaW4gY2FzZSB3ZSBhcmUgaW4gYSB3b3JrZXJcbiAgICAodHlwZW9mIG5hdmlnYXRvciAhPT0gJ3VuZGVmaW5lZCcgJiYgbmF2aWdhdG9yLnVzZXJBZ2VudCAmJiBuYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKCkubWF0Y2goL2FwcGxld2Via2l0XFwvKFxcZCspLykpO1xufVxuXG4vKipcbiAqIE1hcCAlaiB0byBgSlNPTi5zdHJpbmdpZnkoKWAsIHNpbmNlIG5vIFdlYiBJbnNwZWN0b3JzIGRvIHRoYXQgYnkgZGVmYXVsdC5cbiAqL1xuXG5leHBvcnRzLmZvcm1hdHRlcnMuaiA9IGZ1bmN0aW9uKHYpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodik7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIHJldHVybiAnW1VuZXhwZWN0ZWRKU09OUGFyc2VFcnJvcl06ICcgKyBlcnIubWVzc2FnZTtcbiAgfVxufTtcblxuXG4vKipcbiAqIENvbG9yaXplIGxvZyBhcmd1bWVudHMgaWYgZW5hYmxlZC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIGZvcm1hdEFyZ3MoYXJncykge1xuICB2YXIgdXNlQ29sb3JzID0gdGhpcy51c2VDb2xvcnM7XG5cbiAgYXJnc1swXSA9ICh1c2VDb2xvcnMgPyAnJWMnIDogJycpXG4gICAgKyB0aGlzLm5hbWVzcGFjZVxuICAgICsgKHVzZUNvbG9ycyA/ICcgJWMnIDogJyAnKVxuICAgICsgYXJnc1swXVxuICAgICsgKHVzZUNvbG9ycyA/ICclYyAnIDogJyAnKVxuICAgICsgJysnICsgZXhwb3J0cy5odW1hbml6ZSh0aGlzLmRpZmYpO1xuXG4gIGlmICghdXNlQ29sb3JzKSByZXR1cm47XG5cbiAgdmFyIGMgPSAnY29sb3I6ICcgKyB0aGlzLmNvbG9yO1xuICBhcmdzLnNwbGljZSgxLCAwLCBjLCAnY29sb3I6IGluaGVyaXQnKVxuXG4gIC8vIHRoZSBmaW5hbCBcIiVjXCIgaXMgc29tZXdoYXQgdHJpY2t5LCBiZWNhdXNlIHRoZXJlIGNvdWxkIGJlIG90aGVyXG4gIC8vIGFyZ3VtZW50cyBwYXNzZWQgZWl0aGVyIGJlZm9yZSBvciBhZnRlciB0aGUgJWMsIHNvIHdlIG5lZWQgdG9cbiAgLy8gZmlndXJlIG91dCB0aGUgY29ycmVjdCBpbmRleCB0byBpbnNlcnQgdGhlIENTUyBpbnRvXG4gIHZhciBpbmRleCA9IDA7XG4gIHZhciBsYXN0QyA9IDA7XG4gIGFyZ3NbMF0ucmVwbGFjZSgvJVthLXpBLVolXS9nLCBmdW5jdGlvbihtYXRjaCkge1xuICAgIGlmICgnJSUnID09PSBtYXRjaCkgcmV0dXJuO1xuICAgIGluZGV4Kys7XG4gICAgaWYgKCclYycgPT09IG1hdGNoKSB7XG4gICAgICAvLyB3ZSBvbmx5IGFyZSBpbnRlcmVzdGVkIGluIHRoZSAqbGFzdCogJWNcbiAgICAgIC8vICh0aGUgdXNlciBtYXkgaGF2ZSBwcm92aWRlZCB0aGVpciBvd24pXG4gICAgICBsYXN0QyA9IGluZGV4O1xuICAgIH1cbiAgfSk7XG5cbiAgYXJncy5zcGxpY2UobGFzdEMsIDAsIGMpO1xufVxuXG4vKipcbiAqIEludm9rZXMgYGNvbnNvbGUubG9nKClgIHdoZW4gYXZhaWxhYmxlLlxuICogTm8tb3Agd2hlbiBgY29uc29sZS5sb2dgIGlzIG5vdCBhIFwiZnVuY3Rpb25cIi5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIGxvZygpIHtcbiAgLy8gdGhpcyBoYWNrZXJ5IGlzIHJlcXVpcmVkIGZvciBJRTgvOSwgd2hlcmVcbiAgLy8gdGhlIGBjb25zb2xlLmxvZ2AgZnVuY3Rpb24gZG9lc24ndCBoYXZlICdhcHBseSdcbiAgcmV0dXJuICdvYmplY3QnID09PSB0eXBlb2YgY29uc29sZVxuICAgICYmIGNvbnNvbGUubG9nXG4gICAgJiYgRnVuY3Rpb24ucHJvdG90eXBlLmFwcGx5LmNhbGwoY29uc29sZS5sb2csIGNvbnNvbGUsIGFyZ3VtZW50cyk7XG59XG5cbi8qKlxuICogU2F2ZSBgbmFtZXNwYWNlc2AuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVzcGFjZXNcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIHNhdmUobmFtZXNwYWNlcykge1xuICB0cnkge1xuICAgIGlmIChudWxsID09IG5hbWVzcGFjZXMpIHtcbiAgICAgIGV4cG9ydHMuc3RvcmFnZS5yZW1vdmVJdGVtKCdkZWJ1ZycpO1xuICAgIH0gZWxzZSB7XG4gICAgICBleHBvcnRzLnN0b3JhZ2UuZGVidWcgPSBuYW1lc3BhY2VzO1xuICAgIH1cbiAgfSBjYXRjaChlKSB7fVxufVxuXG4vKipcbiAqIExvYWQgYG5hbWVzcGFjZXNgLlxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gcmV0dXJucyB0aGUgcHJldmlvdXNseSBwZXJzaXN0ZWQgZGVidWcgbW9kZXNcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIGxvYWQoKSB7XG4gIHZhciByO1xuICB0cnkge1xuICAgIHIgPSBleHBvcnRzLnN0b3JhZ2UuZGVidWc7XG4gIH0gY2F0Y2goZSkge31cblxuICAvLyBJZiBkZWJ1ZyBpc24ndCBzZXQgaW4gTFMsIGFuZCB3ZSdyZSBpbiBFbGVjdHJvbiwgdHJ5IHRvIGxvYWQgJERFQlVHXG4gIGlmICghciAmJiB0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCcgJiYgJ2VudicgaW4gcHJvY2Vzcykge1xuICAgIHIgPSBwcm9jZXNzLmVudi5ERUJVRztcbiAgfVxuXG4gIHJldHVybiByO1xufVxuXG4vKipcbiAqIEVuYWJsZSBuYW1lc3BhY2VzIGxpc3RlZCBpbiBgbG9jYWxTdG9yYWdlLmRlYnVnYCBpbml0aWFsbHkuXG4gKi9cblxuZXhwb3J0cy5lbmFibGUobG9hZCgpKTtcblxuLyoqXG4gKiBMb2NhbHN0b3JhZ2UgYXR0ZW1wdHMgdG8gcmV0dXJuIHRoZSBsb2NhbHN0b3JhZ2UuXG4gKlxuICogVGhpcyBpcyBuZWNlc3NhcnkgYmVjYXVzZSBzYWZhcmkgdGhyb3dzXG4gKiB3aGVuIGEgdXNlciBkaXNhYmxlcyBjb29raWVzL2xvY2Fsc3RvcmFnZVxuICogYW5kIHlvdSBhdHRlbXB0IHRvIGFjY2VzcyBpdC5cbiAqXG4gKiBAcmV0dXJuIHtMb2NhbFN0b3JhZ2V9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBsb2NhbHN0b3JhZ2UoKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIHdpbmRvdy5sb2NhbFN0b3JhZ2U7XG4gIH0gY2F0Y2ggKGUpIHt9XG59XG4iLCJcbi8qKlxuICogVGhpcyBpcyB0aGUgY29tbW9uIGxvZ2ljIGZvciBib3RoIHRoZSBOb2RlLmpzIGFuZCB3ZWIgYnJvd3NlclxuICogaW1wbGVtZW50YXRpb25zIG9mIGBkZWJ1ZygpYC5cbiAqXG4gKiBFeHBvc2UgYGRlYnVnKClgIGFzIHRoZSBtb2R1bGUuXG4gKi9cblxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gY3JlYXRlRGVidWcuZGVidWcgPSBjcmVhdGVEZWJ1Z1snZGVmYXVsdCddID0gY3JlYXRlRGVidWc7XG5leHBvcnRzLmNvZXJjZSA9IGNvZXJjZTtcbmV4cG9ydHMuZGlzYWJsZSA9IGRpc2FibGU7XG5leHBvcnRzLmVuYWJsZSA9IGVuYWJsZTtcbmV4cG9ydHMuZW5hYmxlZCA9IGVuYWJsZWQ7XG5leHBvcnRzLmh1bWFuaXplID0gcmVxdWlyZSgnbXMnKTtcblxuLyoqXG4gKiBUaGUgY3VycmVudGx5IGFjdGl2ZSBkZWJ1ZyBtb2RlIG5hbWVzLCBhbmQgbmFtZXMgdG8gc2tpcC5cbiAqL1xuXG5leHBvcnRzLm5hbWVzID0gW107XG5leHBvcnRzLnNraXBzID0gW107XG5cbi8qKlxuICogTWFwIG9mIHNwZWNpYWwgXCIlblwiIGhhbmRsaW5nIGZ1bmN0aW9ucywgZm9yIHRoZSBkZWJ1ZyBcImZvcm1hdFwiIGFyZ3VtZW50LlxuICpcbiAqIFZhbGlkIGtleSBuYW1lcyBhcmUgYSBzaW5nbGUsIGxvd2VyIG9yIHVwcGVyLWNhc2UgbGV0dGVyLCBpLmUuIFwiblwiIGFuZCBcIk5cIi5cbiAqL1xuXG5leHBvcnRzLmZvcm1hdHRlcnMgPSB7fTtcblxuLyoqXG4gKiBQcmV2aW91cyBsb2cgdGltZXN0YW1wLlxuICovXG5cbnZhciBwcmV2VGltZTtcblxuLyoqXG4gKiBTZWxlY3QgYSBjb2xvci5cbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lc3BhY2VcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIHNlbGVjdENvbG9yKG5hbWVzcGFjZSkge1xuICB2YXIgaGFzaCA9IDAsIGk7XG5cbiAgZm9yIChpIGluIG5hbWVzcGFjZSkge1xuICAgIGhhc2ggID0gKChoYXNoIDw8IDUpIC0gaGFzaCkgKyBuYW1lc3BhY2UuY2hhckNvZGVBdChpKTtcbiAgICBoYXNoIHw9IDA7IC8vIENvbnZlcnQgdG8gMzJiaXQgaW50ZWdlclxuICB9XG5cbiAgcmV0dXJuIGV4cG9ydHMuY29sb3JzW01hdGguYWJzKGhhc2gpICUgZXhwb3J0cy5jb2xvcnMubGVuZ3RoXTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBkZWJ1Z2dlciB3aXRoIHRoZSBnaXZlbiBgbmFtZXNwYWNlYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZXNwYWNlXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gY3JlYXRlRGVidWcobmFtZXNwYWNlKSB7XG5cbiAgZnVuY3Rpb24gZGVidWcoKSB7XG4gICAgLy8gZGlzYWJsZWQ/XG4gICAgaWYgKCFkZWJ1Zy5lbmFibGVkKSByZXR1cm47XG5cbiAgICB2YXIgc2VsZiA9IGRlYnVnO1xuXG4gICAgLy8gc2V0IGBkaWZmYCB0aW1lc3RhbXBcbiAgICB2YXIgY3VyciA9ICtuZXcgRGF0ZSgpO1xuICAgIHZhciBtcyA9IGN1cnIgLSAocHJldlRpbWUgfHwgY3Vycik7XG4gICAgc2VsZi5kaWZmID0gbXM7XG4gICAgc2VsZi5wcmV2ID0gcHJldlRpbWU7XG4gICAgc2VsZi5jdXJyID0gY3VycjtcbiAgICBwcmV2VGltZSA9IGN1cnI7XG5cbiAgICAvLyB0dXJuIHRoZSBgYXJndW1lbnRzYCBpbnRvIGEgcHJvcGVyIEFycmF5XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBhcmdzW2ldID0gYXJndW1lbnRzW2ldO1xuICAgIH1cblxuICAgIGFyZ3NbMF0gPSBleHBvcnRzLmNvZXJjZShhcmdzWzBdKTtcblxuICAgIGlmICgnc3RyaW5nJyAhPT0gdHlwZW9mIGFyZ3NbMF0pIHtcbiAgICAgIC8vIGFueXRoaW5nIGVsc2UgbGV0J3MgaW5zcGVjdCB3aXRoICVPXG4gICAgICBhcmdzLnVuc2hpZnQoJyVPJyk7XG4gICAgfVxuXG4gICAgLy8gYXBwbHkgYW55IGBmb3JtYXR0ZXJzYCB0cmFuc2Zvcm1hdGlvbnNcbiAgICB2YXIgaW5kZXggPSAwO1xuICAgIGFyZ3NbMF0gPSBhcmdzWzBdLnJlcGxhY2UoLyUoW2EtekEtWiVdKS9nLCBmdW5jdGlvbihtYXRjaCwgZm9ybWF0KSB7XG4gICAgICAvLyBpZiB3ZSBlbmNvdW50ZXIgYW4gZXNjYXBlZCAlIHRoZW4gZG9uJ3QgaW5jcmVhc2UgdGhlIGFycmF5IGluZGV4XG4gICAgICBpZiAobWF0Y2ggPT09ICclJScpIHJldHVybiBtYXRjaDtcbiAgICAgIGluZGV4Kys7XG4gICAgICB2YXIgZm9ybWF0dGVyID0gZXhwb3J0cy5mb3JtYXR0ZXJzW2Zvcm1hdF07XG4gICAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGZvcm1hdHRlcikge1xuICAgICAgICB2YXIgdmFsID0gYXJnc1tpbmRleF07XG4gICAgICAgIG1hdGNoID0gZm9ybWF0dGVyLmNhbGwoc2VsZiwgdmFsKTtcblxuICAgICAgICAvLyBub3cgd2UgbmVlZCB0byByZW1vdmUgYGFyZ3NbaW5kZXhdYCBzaW5jZSBpdCdzIGlubGluZWQgaW4gdGhlIGBmb3JtYXRgXG4gICAgICAgIGFyZ3Muc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgaW5kZXgtLTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBtYXRjaDtcbiAgICB9KTtcblxuICAgIC8vIGFwcGx5IGVudi1zcGVjaWZpYyBmb3JtYXR0aW5nIChjb2xvcnMsIGV0Yy4pXG4gICAgZXhwb3J0cy5mb3JtYXRBcmdzLmNhbGwoc2VsZiwgYXJncyk7XG5cbiAgICB2YXIgbG9nRm4gPSBkZWJ1Zy5sb2cgfHwgZXhwb3J0cy5sb2cgfHwgY29uc29sZS5sb2cuYmluZChjb25zb2xlKTtcbiAgICBsb2dGbi5hcHBseShzZWxmLCBhcmdzKTtcbiAgfVxuXG4gIGRlYnVnLm5hbWVzcGFjZSA9IG5hbWVzcGFjZTtcbiAgZGVidWcuZW5hYmxlZCA9IGV4cG9ydHMuZW5hYmxlZChuYW1lc3BhY2UpO1xuICBkZWJ1Zy51c2VDb2xvcnMgPSBleHBvcnRzLnVzZUNvbG9ycygpO1xuICBkZWJ1Zy5jb2xvciA9IHNlbGVjdENvbG9yKG5hbWVzcGFjZSk7XG5cbiAgLy8gZW52LXNwZWNpZmljIGluaXRpYWxpemF0aW9uIGxvZ2ljIGZvciBkZWJ1ZyBpbnN0YW5jZXNcbiAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBleHBvcnRzLmluaXQpIHtcbiAgICBleHBvcnRzLmluaXQoZGVidWcpO1xuICB9XG5cbiAgcmV0dXJuIGRlYnVnO1xufVxuXG4vKipcbiAqIEVuYWJsZXMgYSBkZWJ1ZyBtb2RlIGJ5IG5hbWVzcGFjZXMuIFRoaXMgY2FuIGluY2x1ZGUgbW9kZXNcbiAqIHNlcGFyYXRlZCBieSBhIGNvbG9uIGFuZCB3aWxkY2FyZHMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVzcGFjZXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZW5hYmxlKG5hbWVzcGFjZXMpIHtcbiAgZXhwb3J0cy5zYXZlKG5hbWVzcGFjZXMpO1xuXG4gIGV4cG9ydHMubmFtZXMgPSBbXTtcbiAgZXhwb3J0cy5za2lwcyA9IFtdO1xuXG4gIHZhciBzcGxpdCA9ICh0eXBlb2YgbmFtZXNwYWNlcyA9PT0gJ3N0cmluZycgPyBuYW1lc3BhY2VzIDogJycpLnNwbGl0KC9bXFxzLF0rLyk7XG4gIHZhciBsZW4gPSBzcGxpdC5sZW5ndGg7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgIGlmICghc3BsaXRbaV0pIGNvbnRpbnVlOyAvLyBpZ25vcmUgZW1wdHkgc3RyaW5nc1xuICAgIG5hbWVzcGFjZXMgPSBzcGxpdFtpXS5yZXBsYWNlKC9cXCovZywgJy4qPycpO1xuICAgIGlmIChuYW1lc3BhY2VzWzBdID09PSAnLScpIHtcbiAgICAgIGV4cG9ydHMuc2tpcHMucHVzaChuZXcgUmVnRXhwKCdeJyArIG5hbWVzcGFjZXMuc3Vic3RyKDEpICsgJyQnKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGV4cG9ydHMubmFtZXMucHVzaChuZXcgUmVnRXhwKCdeJyArIG5hbWVzcGFjZXMgKyAnJCcpKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBEaXNhYmxlIGRlYnVnIG91dHB1dC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIGRpc2FibGUoKSB7XG4gIGV4cG9ydHMuZW5hYmxlKCcnKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIG1vZGUgbmFtZSBpcyBlbmFibGVkLCBmYWxzZSBvdGhlcndpc2UuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIGVuYWJsZWQobmFtZSkge1xuICB2YXIgaSwgbGVuO1xuICBmb3IgKGkgPSAwLCBsZW4gPSBleHBvcnRzLnNraXBzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgaWYgKGV4cG9ydHMuc2tpcHNbaV0udGVzdChuYW1lKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICBmb3IgKGkgPSAwLCBsZW4gPSBleHBvcnRzLm5hbWVzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgaWYgKGV4cG9ydHMubmFtZXNbaV0udGVzdChuYW1lKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBDb2VyY2UgYHZhbGAuXG4gKlxuICogQHBhcmFtIHtNaXhlZH0gdmFsXG4gKiBAcmV0dXJuIHtNaXhlZH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIGNvZXJjZSh2YWwpIHtcbiAgaWYgKHZhbCBpbnN0YW5jZW9mIEVycm9yKSByZXR1cm4gdmFsLnN0YWNrIHx8IHZhbC5tZXNzYWdlO1xuICByZXR1cm4gdmFsO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaGFzID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eVxuICAsIHByZWZpeCA9ICd+JztcblxuLyoqXG4gKiBDb25zdHJ1Y3RvciB0byBjcmVhdGUgYSBzdG9yYWdlIGZvciBvdXIgYEVFYCBvYmplY3RzLlxuICogQW4gYEV2ZW50c2AgaW5zdGFuY2UgaXMgYSBwbGFpbiBvYmplY3Qgd2hvc2UgcHJvcGVydGllcyBhcmUgZXZlbnQgbmFtZXMuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gRXZlbnRzKCkge31cblxuLy9cbi8vIFdlIHRyeSB0byBub3QgaW5oZXJpdCBmcm9tIGBPYmplY3QucHJvdG90eXBlYC4gSW4gc29tZSBlbmdpbmVzIGNyZWF0aW5nIGFuXG4vLyBpbnN0YW5jZSBpbiB0aGlzIHdheSBpcyBmYXN0ZXIgdGhhbiBjYWxsaW5nIGBPYmplY3QuY3JlYXRlKG51bGwpYCBkaXJlY3RseS5cbi8vIElmIGBPYmplY3QuY3JlYXRlKG51bGwpYCBpcyBub3Qgc3VwcG9ydGVkIHdlIHByZWZpeCB0aGUgZXZlbnQgbmFtZXMgd2l0aCBhXG4vLyBjaGFyYWN0ZXIgdG8gbWFrZSBzdXJlIHRoYXQgdGhlIGJ1aWx0LWluIG9iamVjdCBwcm9wZXJ0aWVzIGFyZSBub3Rcbi8vIG92ZXJyaWRkZW4gb3IgdXNlZCBhcyBhbiBhdHRhY2sgdmVjdG9yLlxuLy9cbmlmIChPYmplY3QuY3JlYXRlKSB7XG4gIEV2ZW50cy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gIC8vXG4gIC8vIFRoaXMgaGFjayBpcyBuZWVkZWQgYmVjYXVzZSB0aGUgYF9fcHJvdG9fX2AgcHJvcGVydHkgaXMgc3RpbGwgaW5oZXJpdGVkIGluXG4gIC8vIHNvbWUgb2xkIGJyb3dzZXJzIGxpa2UgQW5kcm9pZCA0LCBpUGhvbmUgNS4xLCBPcGVyYSAxMSBhbmQgU2FmYXJpIDUuXG4gIC8vXG4gIGlmICghbmV3IEV2ZW50cygpLl9fcHJvdG9fXykgcHJlZml4ID0gZmFsc2U7XG59XG5cbi8qKlxuICogUmVwcmVzZW50YXRpb24gb2YgYSBzaW5nbGUgZXZlbnQgbGlzdGVuZXIuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gVGhlIGxpc3RlbmVyIGZ1bmN0aW9uLlxuICogQHBhcmFtIHtNaXhlZH0gY29udGV4dCBUaGUgY29udGV4dCB0byBpbnZva2UgdGhlIGxpc3RlbmVyIHdpdGguXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvbmNlPWZhbHNlXSBTcGVjaWZ5IGlmIHRoZSBsaXN0ZW5lciBpcyBhIG9uZS10aW1lIGxpc3RlbmVyLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gRUUoZm4sIGNvbnRleHQsIG9uY2UpIHtcbiAgdGhpcy5mbiA9IGZuO1xuICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICB0aGlzLm9uY2UgPSBvbmNlIHx8IGZhbHNlO1xufVxuXG4vKipcbiAqIE1pbmltYWwgYEV2ZW50RW1pdHRlcmAgaW50ZXJmYWNlIHRoYXQgaXMgbW9sZGVkIGFnYWluc3QgdGhlIE5vZGUuanNcbiAqIGBFdmVudEVtaXR0ZXJgIGludGVyZmFjZS5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqIEBhcGkgcHVibGljXG4gKi9cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gbmV3IEV2ZW50cygpO1xuICB0aGlzLl9ldmVudHNDb3VudCA9IDA7XG59XG5cbi8qKlxuICogUmV0dXJuIGFuIGFycmF5IGxpc3RpbmcgdGhlIGV2ZW50cyBmb3Igd2hpY2ggdGhlIGVtaXR0ZXIgaGFzIHJlZ2lzdGVyZWRcbiAqIGxpc3RlbmVycy5cbiAqXG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmV2ZW50TmFtZXMgPSBmdW5jdGlvbiBldmVudE5hbWVzKCkge1xuICB2YXIgbmFtZXMgPSBbXVxuICAgICwgZXZlbnRzXG4gICAgLCBuYW1lO1xuXG4gIGlmICh0aGlzLl9ldmVudHNDb3VudCA9PT0gMCkgcmV0dXJuIG5hbWVzO1xuXG4gIGZvciAobmFtZSBpbiAoZXZlbnRzID0gdGhpcy5fZXZlbnRzKSkge1xuICAgIGlmIChoYXMuY2FsbChldmVudHMsIG5hbWUpKSBuYW1lcy5wdXNoKHByZWZpeCA/IG5hbWUuc2xpY2UoMSkgOiBuYW1lKTtcbiAgfVxuXG4gIGlmIChPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKSB7XG4gICAgcmV0dXJuIG5hbWVzLmNvbmNhdChPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKGV2ZW50cykpO1xuICB9XG5cbiAgcmV0dXJuIG5hbWVzO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gdGhlIGxpc3RlbmVycyByZWdpc3RlcmVkIGZvciBhIGdpdmVuIGV2ZW50LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfFN5bWJvbH0gZXZlbnQgVGhlIGV2ZW50IG5hbWUuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGV4aXN0cyBPbmx5IGNoZWNrIGlmIHRoZXJlIGFyZSBsaXN0ZW5lcnMuXG4gKiBAcmV0dXJucyB7QXJyYXl8Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24gbGlzdGVuZXJzKGV2ZW50LCBleGlzdHMpIHtcbiAgdmFyIGV2dCA9IHByZWZpeCA/IHByZWZpeCArIGV2ZW50IDogZXZlbnRcbiAgICAsIGF2YWlsYWJsZSA9IHRoaXMuX2V2ZW50c1tldnRdO1xuXG4gIGlmIChleGlzdHMpIHJldHVybiAhIWF2YWlsYWJsZTtcbiAgaWYgKCFhdmFpbGFibGUpIHJldHVybiBbXTtcbiAgaWYgKGF2YWlsYWJsZS5mbikgcmV0dXJuIFthdmFpbGFibGUuZm5dO1xuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gYXZhaWxhYmxlLmxlbmd0aCwgZWUgPSBuZXcgQXJyYXkobCk7IGkgPCBsOyBpKyspIHtcbiAgICBlZVtpXSA9IGF2YWlsYWJsZVtpXS5mbjtcbiAgfVxuXG4gIHJldHVybiBlZTtcbn07XG5cbi8qKlxuICogQ2FsbHMgZWFjaCBvZiB0aGUgbGlzdGVuZXJzIHJlZ2lzdGVyZWQgZm9yIGEgZ2l2ZW4gZXZlbnQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8U3ltYm9sfSBldmVudCBUaGUgZXZlbnQgbmFtZS5cbiAqIEByZXR1cm5zIHtCb29sZWFufSBgdHJ1ZWAgaWYgdGhlIGV2ZW50IGhhZCBsaXN0ZW5lcnMsIGVsc2UgYGZhbHNlYC5cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uIGVtaXQoZXZlbnQsIGExLCBhMiwgYTMsIGE0LCBhNSkge1xuICB2YXIgZXZ0ID0gcHJlZml4ID8gcHJlZml4ICsgZXZlbnQgOiBldmVudDtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1tldnRdKSByZXR1cm4gZmFsc2U7XG5cbiAgdmFyIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1tldnRdXG4gICAgLCBsZW4gPSBhcmd1bWVudHMubGVuZ3RoXG4gICAgLCBhcmdzXG4gICAgLCBpO1xuXG4gIGlmIChsaXN0ZW5lcnMuZm4pIHtcbiAgICBpZiAobGlzdGVuZXJzLm9uY2UpIHRoaXMucmVtb3ZlTGlzdGVuZXIoZXZlbnQsIGxpc3RlbmVycy5mbiwgdW5kZWZpbmVkLCB0cnVlKTtcblxuICAgIHN3aXRjaCAobGVuKSB7XG4gICAgICBjYXNlIDE6IHJldHVybiBsaXN0ZW5lcnMuZm4uY2FsbChsaXN0ZW5lcnMuY29udGV4dCksIHRydWU7XG4gICAgICBjYXNlIDI6IHJldHVybiBsaXN0ZW5lcnMuZm4uY2FsbChsaXN0ZW5lcnMuY29udGV4dCwgYTEpLCB0cnVlO1xuICAgICAgY2FzZSAzOiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQsIGExLCBhMiksIHRydWU7XG4gICAgICBjYXNlIDQ6IHJldHVybiBsaXN0ZW5lcnMuZm4uY2FsbChsaXN0ZW5lcnMuY29udGV4dCwgYTEsIGEyLCBhMyksIHRydWU7XG4gICAgICBjYXNlIDU6IHJldHVybiBsaXN0ZW5lcnMuZm4uY2FsbChsaXN0ZW5lcnMuY29udGV4dCwgYTEsIGEyLCBhMywgYTQpLCB0cnVlO1xuICAgICAgY2FzZSA2OiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQsIGExLCBhMiwgYTMsIGE0LCBhNSksIHRydWU7XG4gICAgfVxuXG4gICAgZm9yIChpID0gMSwgYXJncyA9IG5ldyBBcnJheShsZW4gLTEpOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgIH1cblxuICAgIGxpc3RlbmVycy5mbi5hcHBseShsaXN0ZW5lcnMuY29udGV4dCwgYXJncyk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIGxlbmd0aCA9IGxpc3RlbmVycy5sZW5ndGhcbiAgICAgICwgajtcblxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGxpc3RlbmVyc1tpXS5vbmNlKSB0aGlzLnJlbW92ZUxpc3RlbmVyKGV2ZW50LCBsaXN0ZW5lcnNbaV0uZm4sIHVuZGVmaW5lZCwgdHJ1ZSk7XG5cbiAgICAgIHN3aXRjaCAobGVuKSB7XG4gICAgICAgIGNhc2UgMTogbGlzdGVuZXJzW2ldLmZuLmNhbGwobGlzdGVuZXJzW2ldLmNvbnRleHQpOyBicmVhaztcbiAgICAgICAgY2FzZSAyOiBsaXN0ZW5lcnNbaV0uZm4uY2FsbChsaXN0ZW5lcnNbaV0uY29udGV4dCwgYTEpOyBicmVhaztcbiAgICAgICAgY2FzZSAzOiBsaXN0ZW5lcnNbaV0uZm4uY2FsbChsaXN0ZW5lcnNbaV0uY29udGV4dCwgYTEsIGEyKTsgYnJlYWs7XG4gICAgICAgIGNhc2UgNDogbGlzdGVuZXJzW2ldLmZuLmNhbGwobGlzdGVuZXJzW2ldLmNvbnRleHQsIGExLCBhMiwgYTMpOyBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBpZiAoIWFyZ3MpIGZvciAoaiA9IDEsIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0xKTsgaiA8IGxlbjsgaisrKSB7XG4gICAgICAgICAgICBhcmdzW2ogLSAxXSA9IGFyZ3VtZW50c1tqXTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsaXN0ZW5lcnNbaV0uZm4uYXBwbHkobGlzdGVuZXJzW2ldLmNvbnRleHQsIGFyZ3MpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBBZGQgYSBsaXN0ZW5lciBmb3IgYSBnaXZlbiBldmVudC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xTeW1ib2x9IGV2ZW50IFRoZSBldmVudCBuYW1lLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gVGhlIGxpc3RlbmVyIGZ1bmN0aW9uLlxuICogQHBhcmFtIHtNaXhlZH0gW2NvbnRleHQ9dGhpc10gVGhlIGNvbnRleHQgdG8gaW52b2tlIHRoZSBsaXN0ZW5lciB3aXRoLlxuICogQHJldHVybnMge0V2ZW50RW1pdHRlcn0gYHRoaXNgLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uIG9uKGV2ZW50LCBmbiwgY29udGV4dCkge1xuICB2YXIgbGlzdGVuZXIgPSBuZXcgRUUoZm4sIGNvbnRleHQgfHwgdGhpcylcbiAgICAsIGV2dCA9IHByZWZpeCA/IHByZWZpeCArIGV2ZW50IDogZXZlbnQ7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbZXZ0XSkgdGhpcy5fZXZlbnRzW2V2dF0gPSBsaXN0ZW5lciwgdGhpcy5fZXZlbnRzQ291bnQrKztcbiAgZWxzZSBpZiAoIXRoaXMuX2V2ZW50c1tldnRdLmZuKSB0aGlzLl9ldmVudHNbZXZ0XS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZSB0aGlzLl9ldmVudHNbZXZ0XSA9IFt0aGlzLl9ldmVudHNbZXZ0XSwgbGlzdGVuZXJdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGQgYSBvbmUtdGltZSBsaXN0ZW5lciBmb3IgYSBnaXZlbiBldmVudC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xTeW1ib2x9IGV2ZW50IFRoZSBldmVudCBuYW1lLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gVGhlIGxpc3RlbmVyIGZ1bmN0aW9uLlxuICogQHBhcmFtIHtNaXhlZH0gW2NvbnRleHQ9dGhpc10gVGhlIGNvbnRleHQgdG8gaW52b2tlIHRoZSBsaXN0ZW5lciB3aXRoLlxuICogQHJldHVybnMge0V2ZW50RW1pdHRlcn0gYHRoaXNgLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24gb25jZShldmVudCwgZm4sIGNvbnRleHQpIHtcbiAgdmFyIGxpc3RlbmVyID0gbmV3IEVFKGZuLCBjb250ZXh0IHx8IHRoaXMsIHRydWUpXG4gICAgLCBldnQgPSBwcmVmaXggPyBwcmVmaXggKyBldmVudCA6IGV2ZW50O1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW2V2dF0pIHRoaXMuX2V2ZW50c1tldnRdID0gbGlzdGVuZXIsIHRoaXMuX2V2ZW50c0NvdW50Kys7XG4gIGVsc2UgaWYgKCF0aGlzLl9ldmVudHNbZXZ0XS5mbikgdGhpcy5fZXZlbnRzW2V2dF0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2UgdGhpcy5fZXZlbnRzW2V2dF0gPSBbdGhpcy5fZXZlbnRzW2V2dF0sIGxpc3RlbmVyXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVtb3ZlIHRoZSBsaXN0ZW5lcnMgb2YgYSBnaXZlbiBldmVudC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xTeW1ib2x9IGV2ZW50IFRoZSBldmVudCBuYW1lLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gT25seSByZW1vdmUgdGhlIGxpc3RlbmVycyB0aGF0IG1hdGNoIHRoaXMgZnVuY3Rpb24uXG4gKiBAcGFyYW0ge01peGVkfSBjb250ZXh0IE9ubHkgcmVtb3ZlIHRoZSBsaXN0ZW5lcnMgdGhhdCBoYXZlIHRoaXMgY29udGV4dC5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gb25jZSBPbmx5IHJlbW92ZSBvbmUtdGltZSBsaXN0ZW5lcnMuXG4gKiBAcmV0dXJucyB7RXZlbnRFbWl0dGVyfSBgdGhpc2AuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXIoZXZlbnQsIGZuLCBjb250ZXh0LCBvbmNlKSB7XG4gIHZhciBldnQgPSBwcmVmaXggPyBwcmVmaXggKyBldmVudCA6IGV2ZW50O1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW2V2dF0pIHJldHVybiB0aGlzO1xuICBpZiAoIWZuKSB7XG4gICAgaWYgKC0tdGhpcy5fZXZlbnRzQ291bnQgPT09IDApIHRoaXMuX2V2ZW50cyA9IG5ldyBFdmVudHMoKTtcbiAgICBlbHNlIGRlbGV0ZSB0aGlzLl9ldmVudHNbZXZ0XTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHZhciBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbZXZ0XTtcblxuICBpZiAobGlzdGVuZXJzLmZuKSB7XG4gICAgaWYgKFxuICAgICAgICAgbGlzdGVuZXJzLmZuID09PSBmblxuICAgICAgJiYgKCFvbmNlIHx8IGxpc3RlbmVycy5vbmNlKVxuICAgICAgJiYgKCFjb250ZXh0IHx8IGxpc3RlbmVycy5jb250ZXh0ID09PSBjb250ZXh0KVxuICAgICkge1xuICAgICAgaWYgKC0tdGhpcy5fZXZlbnRzQ291bnQgPT09IDApIHRoaXMuX2V2ZW50cyA9IG5ldyBFdmVudHMoKTtcbiAgICAgIGVsc2UgZGVsZXRlIHRoaXMuX2V2ZW50c1tldnRdO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBmb3IgKHZhciBpID0gMCwgZXZlbnRzID0gW10sIGxlbmd0aCA9IGxpc3RlbmVycy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgaWYgKFxuICAgICAgICAgICBsaXN0ZW5lcnNbaV0uZm4gIT09IGZuXG4gICAgICAgIHx8IChvbmNlICYmICFsaXN0ZW5lcnNbaV0ub25jZSlcbiAgICAgICAgfHwgKGNvbnRleHQgJiYgbGlzdGVuZXJzW2ldLmNvbnRleHQgIT09IGNvbnRleHQpXG4gICAgICApIHtcbiAgICAgICAgZXZlbnRzLnB1c2gobGlzdGVuZXJzW2ldKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvL1xuICAgIC8vIFJlc2V0IHRoZSBhcnJheSwgb3IgcmVtb3ZlIGl0IGNvbXBsZXRlbHkgaWYgd2UgaGF2ZSBubyBtb3JlIGxpc3RlbmVycy5cbiAgICAvL1xuICAgIGlmIChldmVudHMubGVuZ3RoKSB0aGlzLl9ldmVudHNbZXZ0XSA9IGV2ZW50cy5sZW5ndGggPT09IDEgPyBldmVudHNbMF0gOiBldmVudHM7XG4gICAgZWxzZSBpZiAoLS10aGlzLl9ldmVudHNDb3VudCA9PT0gMCkgdGhpcy5fZXZlbnRzID0gbmV3IEV2ZW50cygpO1xuICAgIGVsc2UgZGVsZXRlIHRoaXMuX2V2ZW50c1tldnRdO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBhbGwgbGlzdGVuZXJzLCBvciB0aG9zZSBvZiB0aGUgc3BlY2lmaWVkIGV2ZW50LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfFN5bWJvbH0gW2V2ZW50XSBUaGUgZXZlbnQgbmFtZS5cbiAqIEByZXR1cm5zIHtFdmVudEVtaXR0ZXJ9IGB0aGlzYC5cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24gcmVtb3ZlQWxsTGlzdGVuZXJzKGV2ZW50KSB7XG4gIHZhciBldnQ7XG5cbiAgaWYgKGV2ZW50KSB7XG4gICAgZXZ0ID0gcHJlZml4ID8gcHJlZml4ICsgZXZlbnQgOiBldmVudDtcbiAgICBpZiAodGhpcy5fZXZlbnRzW2V2dF0pIHtcbiAgICAgIGlmICgtLXRoaXMuX2V2ZW50c0NvdW50ID09PSAwKSB0aGlzLl9ldmVudHMgPSBuZXcgRXZlbnRzKCk7XG4gICAgICBlbHNlIGRlbGV0ZSB0aGlzLl9ldmVudHNbZXZ0XTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5fZXZlbnRzID0gbmV3IEV2ZW50cygpO1xuICAgIHRoaXMuX2V2ZW50c0NvdW50ID0gMDtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy9cbi8vIEFsaWFzIG1ldGhvZHMgbmFtZXMgYmVjYXVzZSBwZW9wbGUgcm9sbCBsaWtlIHRoYXQuXG4vL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmYgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUub247XG5cbi8vXG4vLyBUaGlzIGZ1bmN0aW9uIGRvZXNuJ3QgYXBwbHkgYW55bW9yZS5cbi8vXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uIHNldE1heExpc3RlbmVycygpIHtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vL1xuLy8gRXhwb3NlIHRoZSBwcmVmaXguXG4vL1xuRXZlbnRFbWl0dGVyLnByZWZpeGVkID0gcHJlZml4O1xuXG4vL1xuLy8gQWxsb3cgYEV2ZW50RW1pdHRlcmAgdG8gYmUgaW1wb3J0ZWQgYXMgbW9kdWxlIG5hbWVzcGFjZS5cbi8vXG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG4vL1xuLy8gRXhwb3NlIHRoZSBtb2R1bGUuXG4vL1xuaWYgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgbW9kdWxlKSB7XG4gIG1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xufVxuIiwiLyoqXG4gKiBIZWxwZXJzLlxuICovXG5cbnZhciBzID0gMTAwMDtcbnZhciBtID0gcyAqIDYwO1xudmFyIGggPSBtICogNjA7XG52YXIgZCA9IGggKiAyNDtcbnZhciB5ID0gZCAqIDM2NS4yNTtcblxuLyoqXG4gKiBQYXJzZSBvciBmb3JtYXQgdGhlIGdpdmVuIGB2YWxgLlxuICpcbiAqIE9wdGlvbnM6XG4gKlxuICogIC0gYGxvbmdgIHZlcmJvc2UgZm9ybWF0dGluZyBbZmFsc2VdXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfSB2YWxcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAqIEB0aHJvd3Mge0Vycm9yfSB0aHJvdyBhbiBlcnJvciBpZiB2YWwgaXMgbm90IGEgbm9uLWVtcHR5IHN0cmluZyBvciBhIG51bWJlclxuICogQHJldHVybiB7U3RyaW5nfE51bWJlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih2YWwsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHZhciB0eXBlID0gdHlwZW9mIHZhbDtcbiAgaWYgKHR5cGUgPT09ICdzdHJpbmcnICYmIHZhbC5sZW5ndGggPiAwKSB7XG4gICAgcmV0dXJuIHBhcnNlKHZhbCk7XG4gIH0gZWxzZSBpZiAodHlwZSA9PT0gJ251bWJlcicgJiYgaXNOYU4odmFsKSA9PT0gZmFsc2UpIHtcbiAgICByZXR1cm4gb3B0aW9ucy5sb25nID8gZm10TG9uZyh2YWwpIDogZm10U2hvcnQodmFsKTtcbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgJ3ZhbCBpcyBub3QgYSBub24tZW1wdHkgc3RyaW5nIG9yIGEgdmFsaWQgbnVtYmVyLiB2YWw9JyArXG4gICAgICBKU09OLnN0cmluZ2lmeSh2YWwpXG4gICk7XG59O1xuXG4vKipcbiAqIFBhcnNlIHRoZSBnaXZlbiBgc3RyYCBhbmQgcmV0dXJuIG1pbGxpc2Vjb25kcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gKiBAcmV0dXJuIHtOdW1iZXJ9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBwYXJzZShzdHIpIHtcbiAgc3RyID0gU3RyaW5nKHN0cik7XG4gIGlmIChzdHIubGVuZ3RoID4gMTAwKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBtYXRjaCA9IC9eKCg/OlxcZCspP1xcLj9cXGQrKSAqKG1pbGxpc2Vjb25kcz98bXNlY3M/fG1zfHNlY29uZHM/fHNlY3M/fHN8bWludXRlcz98bWlucz98bXxob3Vycz98aHJzP3xofGRheXM/fGR8eWVhcnM/fHlycz98eSk/JC9pLmV4ZWMoXG4gICAgc3RyXG4gICk7XG4gIGlmICghbWF0Y2gpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIG4gPSBwYXJzZUZsb2F0KG1hdGNoWzFdKTtcbiAgdmFyIHR5cGUgPSAobWF0Y2hbMl0gfHwgJ21zJykudG9Mb3dlckNhc2UoKTtcbiAgc3dpdGNoICh0eXBlKSB7XG4gICAgY2FzZSAneWVhcnMnOlxuICAgIGNhc2UgJ3llYXInOlxuICAgIGNhc2UgJ3lycyc6XG4gICAgY2FzZSAneXInOlxuICAgIGNhc2UgJ3knOlxuICAgICAgcmV0dXJuIG4gKiB5O1xuICAgIGNhc2UgJ2RheXMnOlxuICAgIGNhc2UgJ2RheSc6XG4gICAgY2FzZSAnZCc6XG4gICAgICByZXR1cm4gbiAqIGQ7XG4gICAgY2FzZSAnaG91cnMnOlxuICAgIGNhc2UgJ2hvdXInOlxuICAgIGNhc2UgJ2hycyc6XG4gICAgY2FzZSAnaHInOlxuICAgIGNhc2UgJ2gnOlxuICAgICAgcmV0dXJuIG4gKiBoO1xuICAgIGNhc2UgJ21pbnV0ZXMnOlxuICAgIGNhc2UgJ21pbnV0ZSc6XG4gICAgY2FzZSAnbWlucyc6XG4gICAgY2FzZSAnbWluJzpcbiAgICBjYXNlICdtJzpcbiAgICAgIHJldHVybiBuICogbTtcbiAgICBjYXNlICdzZWNvbmRzJzpcbiAgICBjYXNlICdzZWNvbmQnOlxuICAgIGNhc2UgJ3NlY3MnOlxuICAgIGNhc2UgJ3NlYyc6XG4gICAgY2FzZSAncyc6XG4gICAgICByZXR1cm4gbiAqIHM7XG4gICAgY2FzZSAnbWlsbGlzZWNvbmRzJzpcbiAgICBjYXNlICdtaWxsaXNlY29uZCc6XG4gICAgY2FzZSAnbXNlY3MnOlxuICAgIGNhc2UgJ21zZWMnOlxuICAgIGNhc2UgJ21zJzpcbiAgICAgIHJldHVybiBuO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbi8qKlxuICogU2hvcnQgZm9ybWF0IGZvciBgbXNgLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBtc1xuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gZm10U2hvcnQobXMpIHtcbiAgaWYgKG1zID49IGQpIHtcbiAgICByZXR1cm4gTWF0aC5yb3VuZChtcyAvIGQpICsgJ2QnO1xuICB9XG4gIGlmIChtcyA+PSBoKSB7XG4gICAgcmV0dXJuIE1hdGgucm91bmQobXMgLyBoKSArICdoJztcbiAgfVxuICBpZiAobXMgPj0gbSkge1xuICAgIHJldHVybiBNYXRoLnJvdW5kKG1zIC8gbSkgKyAnbSc7XG4gIH1cbiAgaWYgKG1zID49IHMpIHtcbiAgICByZXR1cm4gTWF0aC5yb3VuZChtcyAvIHMpICsgJ3MnO1xuICB9XG4gIHJldHVybiBtcyArICdtcyc7XG59XG5cbi8qKlxuICogTG9uZyBmb3JtYXQgZm9yIGBtc2AuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IG1zXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBmbXRMb25nKG1zKSB7XG4gIHJldHVybiBwbHVyYWwobXMsIGQsICdkYXknKSB8fFxuICAgIHBsdXJhbChtcywgaCwgJ2hvdXInKSB8fFxuICAgIHBsdXJhbChtcywgbSwgJ21pbnV0ZScpIHx8XG4gICAgcGx1cmFsKG1zLCBzLCAnc2Vjb25kJykgfHxcbiAgICBtcyArICcgbXMnO1xufVxuXG4vKipcbiAqIFBsdXJhbGl6YXRpb24gaGVscGVyLlxuICovXG5cbmZ1bmN0aW9uIHBsdXJhbChtcywgbiwgbmFtZSkge1xuICBpZiAobXMgPCBuKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChtcyA8IG4gKiAxLjUpIHtcbiAgICByZXR1cm4gTWF0aC5mbG9vcihtcyAvIG4pICsgJyAnICsgbmFtZTtcbiAgfVxuICByZXR1cm4gTWF0aC5jZWlsKG1zIC8gbikgKyAnICcgKyBuYW1lICsgJ3MnO1xufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kT25jZUxpc3RlbmVyID0gbm9vcDtcblxucHJvY2Vzcy5saXN0ZW5lcnMgPSBmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gW10gfVxuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsImlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAvLyBpbXBsZW1lbnRhdGlvbiBmcm9tIHN0YW5kYXJkIG5vZGUuanMgJ3V0aWwnIG1vZHVsZVxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xufSBlbHNlIHtcbiAgLy8gb2xkIHNjaG9vbCBzaGltIGZvciBvbGQgYnJvd3NlcnNcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIHZhciBUZW1wQ3RvciA9IGZ1bmN0aW9uICgpIHt9XG4gICAgVGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZVxuICAgIGN0b3IucHJvdG90eXBlID0gbmV3IFRlbXBDdG9yKClcbiAgICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3JcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0J1ZmZlcihhcmcpIHtcbiAgcmV0dXJuIGFyZyAmJiB0eXBlb2YgYXJnID09PSAnb2JqZWN0J1xuICAgICYmIHR5cGVvZiBhcmcuY29weSA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcuZmlsbCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcucmVhZFVJbnQ4ID09PSAnZnVuY3Rpb24nO1xufSIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgZm9ybWF0UmVnRXhwID0gLyVbc2RqJV0vZztcbmV4cG9ydHMuZm9ybWF0ID0gZnVuY3Rpb24oZikge1xuICBpZiAoIWlzU3RyaW5nKGYpKSB7XG4gICAgdmFyIG9iamVjdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgb2JqZWN0cy5wdXNoKGluc3BlY3QoYXJndW1lbnRzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiBvYmplY3RzLmpvaW4oJyAnKTtcbiAgfVxuXG4gIHZhciBpID0gMTtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gIHZhciBsZW4gPSBhcmdzLmxlbmd0aDtcbiAgdmFyIHN0ciA9IFN0cmluZyhmKS5yZXBsYWNlKGZvcm1hdFJlZ0V4cCwgZnVuY3Rpb24oeCkge1xuICAgIGlmICh4ID09PSAnJSUnKSByZXR1cm4gJyUnO1xuICAgIGlmIChpID49IGxlbikgcmV0dXJuIHg7XG4gICAgc3dpdGNoICh4KSB7XG4gICAgICBjYXNlICclcyc6IHJldHVybiBTdHJpbmcoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVkJzogcmV0dXJuIE51bWJlcihhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWonOlxuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhcmdzW2krK10pO1xuICAgICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgICAgcmV0dXJuICdbQ2lyY3VsYXJdJztcbiAgICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgfVxuICB9KTtcbiAgZm9yICh2YXIgeCA9IGFyZ3NbaV07IGkgPCBsZW47IHggPSBhcmdzWysraV0pIHtcbiAgICBpZiAoaXNOdWxsKHgpIHx8ICFpc09iamVjdCh4KSkge1xuICAgICAgc3RyICs9ICcgJyArIHg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciArPSAnICcgKyBpbnNwZWN0KHgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuXG4vLyBNYXJrIHRoYXQgYSBtZXRob2Qgc2hvdWxkIG5vdCBiZSB1c2VkLlxuLy8gUmV0dXJucyBhIG1vZGlmaWVkIGZ1bmN0aW9uIHdoaWNoIHdhcm5zIG9uY2UgYnkgZGVmYXVsdC5cbi8vIElmIC0tbm8tZGVwcmVjYXRpb24gaXMgc2V0LCB0aGVuIGl0IGlzIGEgbm8tb3AuXG5leHBvcnRzLmRlcHJlY2F0ZSA9IGZ1bmN0aW9uKGZuLCBtc2cpIHtcbiAgLy8gQWxsb3cgZm9yIGRlcHJlY2F0aW5nIHRoaW5ncyBpbiB0aGUgcHJvY2VzcyBvZiBzdGFydGluZyB1cC5cbiAgaWYgKGlzVW5kZWZpbmVkKGdsb2JhbC5wcm9jZXNzKSkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBleHBvcnRzLmRlcHJlY2F0ZShmbiwgbXNnKS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH1cblxuICBpZiAocHJvY2Vzcy5ub0RlcHJlY2F0aW9uID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIGZuO1xuICB9XG5cbiAgdmFyIHdhcm5lZCA9IGZhbHNlO1xuICBmdW5jdGlvbiBkZXByZWNhdGVkKCkge1xuICAgIGlmICghd2FybmVkKSB7XG4gICAgICBpZiAocHJvY2Vzcy50aHJvd0RlcHJlY2F0aW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICAgICAgfSBlbHNlIGlmIChwcm9jZXNzLnRyYWNlRGVwcmVjYXRpb24pIHtcbiAgICAgICAgY29uc29sZS50cmFjZShtc2cpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihtc2cpO1xuICAgICAgfVxuICAgICAgd2FybmVkID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICByZXR1cm4gZGVwcmVjYXRlZDtcbn07XG5cblxudmFyIGRlYnVncyA9IHt9O1xudmFyIGRlYnVnRW52aXJvbjtcbmV4cG9ydHMuZGVidWdsb2cgPSBmdW5jdGlvbihzZXQpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKGRlYnVnRW52aXJvbikpXG4gICAgZGVidWdFbnZpcm9uID0gcHJvY2Vzcy5lbnYuTk9ERV9ERUJVRyB8fCAnJztcbiAgc2V0ID0gc2V0LnRvVXBwZXJDYXNlKCk7XG4gIGlmICghZGVidWdzW3NldF0pIHtcbiAgICBpZiAobmV3IFJlZ0V4cCgnXFxcXGInICsgc2V0ICsgJ1xcXFxiJywgJ2knKS50ZXN0KGRlYnVnRW52aXJvbikpIHtcbiAgICAgIHZhciBwaWQgPSBwcm9jZXNzLnBpZDtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBtc2cgPSBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpO1xuICAgICAgICBjb25zb2xlLmVycm9yKCclcyAlZDogJXMnLCBzZXQsIHBpZCwgbXNnKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7fTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlYnVnc1tzZXRdO1xufTtcblxuXG4vKipcbiAqIEVjaG9zIHRoZSB2YWx1ZSBvZiBhIHZhbHVlLiBUcnlzIHRvIHByaW50IHRoZSB2YWx1ZSBvdXRcbiAqIGluIHRoZSBiZXN0IHdheSBwb3NzaWJsZSBnaXZlbiB0aGUgZGlmZmVyZW50IHR5cGVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogVGhlIG9iamVjdCB0byBwcmludCBvdXQuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBvcHRpb25zIG9iamVjdCB0aGF0IGFsdGVycyB0aGUgb3V0cHV0LlxuICovXG4vKiBsZWdhY3k6IG9iaiwgc2hvd0hpZGRlbiwgZGVwdGgsIGNvbG9ycyovXG5mdW5jdGlvbiBpbnNwZWN0KG9iaiwgb3B0cykge1xuICAvLyBkZWZhdWx0IG9wdGlvbnNcbiAgdmFyIGN0eCA9IHtcbiAgICBzZWVuOiBbXSxcbiAgICBzdHlsaXplOiBzdHlsaXplTm9Db2xvclxuICB9O1xuICAvLyBsZWdhY3kuLi5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gMykgY3R4LmRlcHRoID0gYXJndW1lbnRzWzJdO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSA0KSBjdHguY29sb3JzID0gYXJndW1lbnRzWzNdO1xuICBpZiAoaXNCb29sZWFuKG9wdHMpKSB7XG4gICAgLy8gbGVnYWN5Li4uXG4gICAgY3R4LnNob3dIaWRkZW4gPSBvcHRzO1xuICB9IGVsc2UgaWYgKG9wdHMpIHtcbiAgICAvLyBnb3QgYW4gXCJvcHRpb25zXCIgb2JqZWN0XG4gICAgZXhwb3J0cy5fZXh0ZW5kKGN0eCwgb3B0cyk7XG4gIH1cbiAgLy8gc2V0IGRlZmF1bHQgb3B0aW9uc1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LnNob3dIaWRkZW4pKSBjdHguc2hvd0hpZGRlbiA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmRlcHRoKSkgY3R4LmRlcHRoID0gMjtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jb2xvcnMpKSBjdHguY29sb3JzID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY3VzdG9tSW5zcGVjdCkpIGN0eC5jdXN0b21JbnNwZWN0ID0gdHJ1ZTtcbiAgaWYgKGN0eC5jb2xvcnMpIGN0eC5zdHlsaXplID0gc3R5bGl6ZVdpdGhDb2xvcjtcbiAgcmV0dXJuIGZvcm1hdFZhbHVlKGN0eCwgb2JqLCBjdHguZGVwdGgpO1xufVxuZXhwb3J0cy5pbnNwZWN0ID0gaW5zcGVjdDtcblxuXG4vLyBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0FOU0lfZXNjYXBlX2NvZGUjZ3JhcGhpY3Ncbmluc3BlY3QuY29sb3JzID0ge1xuICAnYm9sZCcgOiBbMSwgMjJdLFxuICAnaXRhbGljJyA6IFszLCAyM10sXG4gICd1bmRlcmxpbmUnIDogWzQsIDI0XSxcbiAgJ2ludmVyc2UnIDogWzcsIDI3XSxcbiAgJ3doaXRlJyA6IFszNywgMzldLFxuICAnZ3JleScgOiBbOTAsIDM5XSxcbiAgJ2JsYWNrJyA6IFszMCwgMzldLFxuICAnYmx1ZScgOiBbMzQsIDM5XSxcbiAgJ2N5YW4nIDogWzM2LCAzOV0sXG4gICdncmVlbicgOiBbMzIsIDM5XSxcbiAgJ21hZ2VudGEnIDogWzM1LCAzOV0sXG4gICdyZWQnIDogWzMxLCAzOV0sXG4gICd5ZWxsb3cnIDogWzMzLCAzOV1cbn07XG5cbi8vIERvbid0IHVzZSAnYmx1ZScgbm90IHZpc2libGUgb24gY21kLmV4ZVxuaW5zcGVjdC5zdHlsZXMgPSB7XG4gICdzcGVjaWFsJzogJ2N5YW4nLFxuICAnbnVtYmVyJzogJ3llbGxvdycsXG4gICdib29sZWFuJzogJ3llbGxvdycsXG4gICd1bmRlZmluZWQnOiAnZ3JleScsXG4gICdudWxsJzogJ2JvbGQnLFxuICAnc3RyaW5nJzogJ2dyZWVuJyxcbiAgJ2RhdGUnOiAnbWFnZW50YScsXG4gIC8vIFwibmFtZVwiOiBpbnRlbnRpb25hbGx5IG5vdCBzdHlsaW5nXG4gICdyZWdleHAnOiAncmVkJ1xufTtcblxuXG5mdW5jdGlvbiBzdHlsaXplV2l0aENvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHZhciBzdHlsZSA9IGluc3BlY3Quc3R5bGVzW3N0eWxlVHlwZV07XG5cbiAgaWYgKHN0eWxlKSB7XG4gICAgcmV0dXJuICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMF0gKyAnbScgKyBzdHIgK1xuICAgICAgICAgICAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzFdICsgJ20nO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBzdHI7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBzdHlsaXplTm9Db2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICByZXR1cm4gc3RyO1xufVxuXG5cbmZ1bmN0aW9uIGFycmF5VG9IYXNoKGFycmF5KSB7XG4gIHZhciBoYXNoID0ge307XG5cbiAgYXJyYXkuZm9yRWFjaChmdW5jdGlvbih2YWwsIGlkeCkge1xuICAgIGhhc2hbdmFsXSA9IHRydWU7XG4gIH0pO1xuXG4gIHJldHVybiBoYXNoO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFZhbHVlKGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcykge1xuICAvLyBQcm92aWRlIGEgaG9vayBmb3IgdXNlci1zcGVjaWZpZWQgaW5zcGVjdCBmdW5jdGlvbnMuXG4gIC8vIENoZWNrIHRoYXQgdmFsdWUgaXMgYW4gb2JqZWN0IHdpdGggYW4gaW5zcGVjdCBmdW5jdGlvbiBvbiBpdFxuICBpZiAoY3R4LmN1c3RvbUluc3BlY3QgJiZcbiAgICAgIHZhbHVlICYmXG4gICAgICBpc0Z1bmN0aW9uKHZhbHVlLmluc3BlY3QpICYmXG4gICAgICAvLyBGaWx0ZXIgb3V0IHRoZSB1dGlsIG1vZHVsZSwgaXQncyBpbnNwZWN0IGZ1bmN0aW9uIGlzIHNwZWNpYWxcbiAgICAgIHZhbHVlLmluc3BlY3QgIT09IGV4cG9ydHMuaW5zcGVjdCAmJlxuICAgICAgLy8gQWxzbyBmaWx0ZXIgb3V0IGFueSBwcm90b3R5cGUgb2JqZWN0cyB1c2luZyB0aGUgY2lyY3VsYXIgY2hlY2suXG4gICAgICAhKHZhbHVlLmNvbnN0cnVjdG9yICYmIHZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZSA9PT0gdmFsdWUpKSB7XG4gICAgdmFyIHJldCA9IHZhbHVlLmluc3BlY3QocmVjdXJzZVRpbWVzLCBjdHgpO1xuICAgIGlmICghaXNTdHJpbmcocmV0KSkge1xuICAgICAgcmV0ID0gZm9ybWF0VmFsdWUoY3R4LCByZXQsIHJlY3Vyc2VUaW1lcyk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICAvLyBQcmltaXRpdmUgdHlwZXMgY2Fubm90IGhhdmUgcHJvcGVydGllc1xuICB2YXIgcHJpbWl0aXZlID0gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpO1xuICBpZiAocHJpbWl0aXZlKSB7XG4gICAgcmV0dXJuIHByaW1pdGl2ZTtcbiAgfVxuXG4gIC8vIExvb2sgdXAgdGhlIGtleXMgb2YgdGhlIG9iamVjdC5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh2YWx1ZSk7XG4gIHZhciB2aXNpYmxlS2V5cyA9IGFycmF5VG9IYXNoKGtleXMpO1xuXG4gIGlmIChjdHguc2hvd0hpZGRlbikge1xuICAgIGtleXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh2YWx1ZSk7XG4gIH1cblxuICAvLyBJRSBkb2Vzbid0IG1ha2UgZXJyb3IgZmllbGRzIG5vbi1lbnVtZXJhYmxlXG4gIC8vIGh0dHA6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9pZS9kd3c1MnNidCh2PXZzLjk0KS5hc3B4XG4gIGlmIChpc0Vycm9yKHZhbHVlKVxuICAgICAgJiYgKGtleXMuaW5kZXhPZignbWVzc2FnZScpID49IDAgfHwga2V5cy5pbmRleE9mKCdkZXNjcmlwdGlvbicpID49IDApKSB7XG4gICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIC8vIFNvbWUgdHlwZSBvZiBvYmplY3Qgd2l0aG91dCBwcm9wZXJ0aWVzIGNhbiBiZSBzaG9ydGN1dHRlZC5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICB2YXIgbmFtZSA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbRnVuY3Rpb24nICsgbmFtZSArICddJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9XG4gICAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShEYXRlLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ2RhdGUnKTtcbiAgICB9XG4gICAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHZhciBiYXNlID0gJycsIGFycmF5ID0gZmFsc2UsIGJyYWNlcyA9IFsneycsICd9J107XG5cbiAgLy8gTWFrZSBBcnJheSBzYXkgdGhhdCB0aGV5IGFyZSBBcnJheVxuICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBhcnJheSA9IHRydWU7XG4gICAgYnJhY2VzID0gWydbJywgJ10nXTtcbiAgfVxuXG4gIC8vIE1ha2UgZnVuY3Rpb25zIHNheSB0aGF0IHRoZXkgYXJlIGZ1bmN0aW9uc1xuICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICB2YXIgbiA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgIGJhc2UgPSAnIFtGdW5jdGlvbicgKyBuICsgJ10nO1xuICB9XG5cbiAgLy8gTWFrZSBSZWdFeHBzIHNheSB0aGF0IHRoZXkgYXJlIFJlZ0V4cHNcbiAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBkYXRlcyB3aXRoIHByb3BlcnRpZXMgZmlyc3Qgc2F5IHRoZSBkYXRlXG4gIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIERhdGUucHJvdG90eXBlLnRvVVRDU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBlcnJvciB3aXRoIG1lc3NhZ2UgZmlyc3Qgc2F5IHRoZSBlcnJvclxuICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwICYmICghYXJyYXkgfHwgdmFsdWUubGVuZ3RoID09IDApKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyBicmFjZXNbMV07XG4gIH1cblxuICBpZiAocmVjdXJzZVRpbWVzIDwgMCkge1xuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW09iamVjdF0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuXG4gIGN0eC5zZWVuLnB1c2godmFsdWUpO1xuXG4gIHZhciBvdXRwdXQ7XG4gIGlmIChhcnJheSkge1xuICAgIG91dHB1dCA9IGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpO1xuICB9IGVsc2Uge1xuICAgIG91dHB1dCA9IGtleXMubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpO1xuICAgIH0pO1xuICB9XG5cbiAgY3R4LnNlZW4ucG9wKCk7XG5cbiAgcmV0dXJuIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSkge1xuICBpZiAoaXNVbmRlZmluZWQodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgndW5kZWZpbmVkJywgJ3VuZGVmaW5lZCcpO1xuICBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgdmFyIHNpbXBsZSA9ICdcXCcnICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpLnJlcGxhY2UoL15cInxcIiQvZywgJycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpICsgJ1xcJyc7XG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKHNpbXBsZSwgJ3N0cmluZycpO1xuICB9XG4gIGlmIChpc051bWJlcih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdudW1iZXInKTtcbiAgaWYgKGlzQm9vbGVhbih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdib29sZWFuJyk7XG4gIC8vIEZvciBzb21lIHJlYXNvbiB0eXBlb2YgbnVsbCBpcyBcIm9iamVjdFwiLCBzbyBzcGVjaWFsIGNhc2UgaGVyZS5cbiAgaWYgKGlzTnVsbCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCdudWxsJywgJ251bGwnKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRFcnJvcih2YWx1ZSkge1xuICByZXR1cm4gJ1snICsgRXJyb3IucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpICsgJ10nO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpIHtcbiAgdmFyIG91dHB1dCA9IFtdO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgU3RyaW5nKGkpKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBTdHJpbmcoaSksIHRydWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0cHV0LnB1c2goJycpO1xuICAgIH1cbiAgfVxuICBrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKCFrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIGtleSwgdHJ1ZSkpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSkge1xuICB2YXIgbmFtZSwgc3RyLCBkZXNjO1xuICBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih2YWx1ZSwga2V5KSB8fCB7IHZhbHVlOiB2YWx1ZVtrZXldIH07XG4gIGlmIChkZXNjLmdldCkge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXIvU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tTZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKCFoYXNPd25Qcm9wZXJ0eSh2aXNpYmxlS2V5cywga2V5KSkge1xuICAgIG5hbWUgPSAnWycgKyBrZXkgKyAnXSc7XG4gIH1cbiAgaWYgKCFzdHIpIHtcbiAgICBpZiAoY3R4LnNlZW4uaW5kZXhPZihkZXNjLnZhbHVlKSA8IDApIHtcbiAgICAgIGlmIChpc051bGwocmVjdXJzZVRpbWVzKSkge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIG51bGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCByZWN1cnNlVGltZXMgLSAxKTtcbiAgICAgIH1cbiAgICAgIGlmIChzdHIuaW5kZXhPZignXFxuJykgPiAtMSkge1xuICAgICAgICBpZiAoYXJyYXkpIHtcbiAgICAgICAgICBzdHIgPSBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJykuc3Vic3RyKDIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0ciA9ICdcXG4nICsgc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0NpcmN1bGFyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmIChpc1VuZGVmaW5lZChuYW1lKSkge1xuICAgIGlmIChhcnJheSAmJiBrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICByZXR1cm4gc3RyO1xuICAgIH1cbiAgICBuYW1lID0gSlNPTi5zdHJpbmdpZnkoJycgKyBrZXkpO1xuICAgIGlmIChuYW1lLm1hdGNoKC9eXCIoW2EtekEtWl9dW2EtekEtWl8wLTldKilcIiQvKSkge1xuICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyKDEsIG5hbWUubGVuZ3RoIC0gMik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ25hbWUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJylcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLyheXCJ8XCIkKS9nLCBcIidcIik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ3N0cmluZycpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuYW1lICsgJzogJyArIHN0cjtcbn1cblxuXG5mdW5jdGlvbiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcykge1xuICB2YXIgbnVtTGluZXNFc3QgPSAwO1xuICB2YXIgbGVuZ3RoID0gb3V0cHV0LnJlZHVjZShmdW5jdGlvbihwcmV2LCBjdXIpIHtcbiAgICBudW1MaW5lc0VzdCsrO1xuICAgIGlmIChjdXIuaW5kZXhPZignXFxuJykgPj0gMCkgbnVtTGluZXNFc3QrKztcbiAgICByZXR1cm4gcHJldiArIGN1ci5yZXBsYWNlKC9cXHUwMDFiXFxbXFxkXFxkP20vZywgJycpLmxlbmd0aCArIDE7XG4gIH0sIDApO1xuXG4gIGlmIChsZW5ndGggPiA2MCkge1xuICAgIHJldHVybiBicmFjZXNbMF0gK1xuICAgICAgICAgICAoYmFzZSA9PT0gJycgPyAnJyA6IGJhc2UgKyAnXFxuICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgb3V0cHV0LmpvaW4oJyxcXG4gICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgYnJhY2VzWzFdO1xuICB9XG5cbiAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyAnICcgKyBvdXRwdXQuam9pbignLCAnKSArICcgJyArIGJyYWNlc1sxXTtcbn1cblxuXG4vLyBOT1RFOiBUaGVzZSB0eXBlIGNoZWNraW5nIGZ1bmN0aW9ucyBpbnRlbnRpb25hbGx5IGRvbid0IHVzZSBgaW5zdGFuY2VvZmBcbi8vIGJlY2F1c2UgaXQgaXMgZnJhZ2lsZSBhbmQgY2FuIGJlIGVhc2lseSBmYWtlZCB3aXRoIGBPYmplY3QuY3JlYXRlKClgLlxuZnVuY3Rpb24gaXNBcnJheShhcikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcik7XG59XG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuXG5mdW5jdGlvbiBpc0Jvb2xlYW4oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnYm9vbGVhbic7XG59XG5leHBvcnRzLmlzQm9vbGVhbiA9IGlzQm9vbGVhbjtcblxuZnVuY3Rpb24gaXNOdWxsKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGwgPSBpc051bGw7XG5cbmZ1bmN0aW9uIGlzTnVsbE9yVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbE9yVW5kZWZpbmVkID0gaXNOdWxsT3JVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5leHBvcnRzLmlzTnVtYmVyID0gaXNOdW1iZXI7XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N0cmluZyc7XG59XG5leHBvcnRzLmlzU3RyaW5nID0gaXNTdHJpbmc7XG5cbmZ1bmN0aW9uIGlzU3ltYm9sKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCc7XG59XG5leHBvcnRzLmlzU3ltYm9sID0gaXNTeW1ib2w7XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG5leHBvcnRzLmlzVW5kZWZpbmVkID0gaXNVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzUmVnRXhwKHJlKSB7XG4gIHJldHVybiBpc09iamVjdChyZSkgJiYgb2JqZWN0VG9TdHJpbmcocmUpID09PSAnW29iamVjdCBSZWdFeHBdJztcbn1cbmV4cG9ydHMuaXNSZWdFeHAgPSBpc1JlZ0V4cDtcblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3Q7XG5cbmZ1bmN0aW9uIGlzRGF0ZShkKSB7XG4gIHJldHVybiBpc09iamVjdChkKSAmJiBvYmplY3RUb1N0cmluZyhkKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuZXhwb3J0cy5pc0RhdGUgPSBpc0RhdGU7XG5cbmZ1bmN0aW9uIGlzRXJyb3IoZSkge1xuICByZXR1cm4gaXNPYmplY3QoZSkgJiZcbiAgICAgIChvYmplY3RUb1N0cmluZyhlKSA9PT0gJ1tvYmplY3QgRXJyb3JdJyB8fCBlIGluc3RhbmNlb2YgRXJyb3IpO1xufVxuZXhwb3J0cy5pc0Vycm9yID0gaXNFcnJvcjtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuXG5mdW5jdGlvbiBpc1ByaW1pdGl2ZShhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbCB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnbnVtYmVyJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N0cmluZycgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnIHx8ICAvLyBFUzYgc3ltYm9sXG4gICAgICAgICB0eXBlb2YgYXJnID09PSAndW5kZWZpbmVkJztcbn1cbmV4cG9ydHMuaXNQcmltaXRpdmUgPSBpc1ByaW1pdGl2ZTtcblxuZXhwb3J0cy5pc0J1ZmZlciA9IHJlcXVpcmUoJy4vc3VwcG9ydC9pc0J1ZmZlcicpO1xuXG5mdW5jdGlvbiBvYmplY3RUb1N0cmluZyhvKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobyk7XG59XG5cblxuZnVuY3Rpb24gcGFkKG4pIHtcbiAgcmV0dXJuIG4gPCAxMCA/ICcwJyArIG4udG9TdHJpbmcoMTApIDogbi50b1N0cmluZygxMCk7XG59XG5cblxudmFyIG1vbnRocyA9IFsnSmFuJywgJ0ZlYicsICdNYXInLCAnQXByJywgJ01heScsICdKdW4nLCAnSnVsJywgJ0F1ZycsICdTZXAnLFxuICAgICAgICAgICAgICAnT2N0JywgJ05vdicsICdEZWMnXTtcblxuLy8gMjYgRmViIDE2OjE5OjM0XG5mdW5jdGlvbiB0aW1lc3RhbXAoKSB7XG4gIHZhciBkID0gbmV3IERhdGUoKTtcbiAgdmFyIHRpbWUgPSBbcGFkKGQuZ2V0SG91cnMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldE1pbnV0ZXMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldFNlY29uZHMoKSldLmpvaW4oJzonKTtcbiAgcmV0dXJuIFtkLmdldERhdGUoKSwgbW9udGhzW2QuZ2V0TW9udGgoKV0sIHRpbWVdLmpvaW4oJyAnKTtcbn1cblxuXG4vLyBsb2cgaXMganVzdCBhIHRoaW4gd3JhcHBlciB0byBjb25zb2xlLmxvZyB0aGF0IHByZXBlbmRzIGEgdGltZXN0YW1wXG5leHBvcnRzLmxvZyA9IGZ1bmN0aW9uKCkge1xuICBjb25zb2xlLmxvZygnJXMgLSAlcycsIHRpbWVzdGFtcCgpLCBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpKTtcbn07XG5cblxuLyoqXG4gKiBJbmhlcml0IHRoZSBwcm90b3R5cGUgbWV0aG9kcyBmcm9tIG9uZSBjb25zdHJ1Y3RvciBpbnRvIGFub3RoZXIuXG4gKlxuICogVGhlIEZ1bmN0aW9uLnByb3RvdHlwZS5pbmhlcml0cyBmcm9tIGxhbmcuanMgcmV3cml0dGVuIGFzIGEgc3RhbmRhbG9uZVxuICogZnVuY3Rpb24gKG5vdCBvbiBGdW5jdGlvbi5wcm90b3R5cGUpLiBOT1RFOiBJZiB0aGlzIGZpbGUgaXMgdG8gYmUgbG9hZGVkXG4gKiBkdXJpbmcgYm9vdHN0cmFwcGluZyB0aGlzIGZ1bmN0aW9uIG5lZWRzIHRvIGJlIHJld3JpdHRlbiB1c2luZyBzb21lIG5hdGl2ZVxuICogZnVuY3Rpb25zIGFzIHByb3RvdHlwZSBzZXR1cCB1c2luZyBub3JtYWwgSmF2YVNjcmlwdCBkb2VzIG5vdCB3b3JrIGFzXG4gKiBleHBlY3RlZCBkdXJpbmcgYm9vdHN0cmFwcGluZyAoc2VlIG1pcnJvci5qcyBpbiByMTE0OTAzKS5cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHdoaWNoIG5lZWRzIHRvIGluaGVyaXQgdGhlXG4gKiAgICAgcHJvdG90eXBlLlxuICogQHBhcmFtIHtmdW5jdGlvbn0gc3VwZXJDdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIGluaGVyaXQgcHJvdG90eXBlIGZyb20uXG4gKi9cbmV4cG9ydHMuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuXG5leHBvcnRzLl9leHRlbmQgPSBmdW5jdGlvbihvcmlnaW4sIGFkZCkge1xuICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiBhZGQgaXNuJ3QgYW4gb2JqZWN0XG4gIGlmICghYWRkIHx8ICFpc09iamVjdChhZGQpKSByZXR1cm4gb3JpZ2luO1xuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYWRkKTtcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aDtcbiAgd2hpbGUgKGktLSkge1xuICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXTtcbiAgfVxuICByZXR1cm4gb3JpZ2luO1xufTtcblxuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cbiIsIi8qXG4gKiBDb3B5cmlnaHQgOiBQYXJ0bmVyaW5nIDMuMCAoMjAwNy0yMDE2KVxuICogQXV0aG9yIDogU3lsdmFpbiBNYWjDqSA8c3lsdmFpbi5tYWhlQHBhcnRuZXJpbmcuZnI+XG4gKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgZGl5YS1zZGsuXG4gKlxuICogZGl5YS1zZGsgaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uLCBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogZGl5YS1zZGsgaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2VcbiAqIGFsb25nIHdpdGggZGl5YS1zZGsuICBJZiBub3QsIHNlZSA8aHR0cDovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuXG5cblxuXG4vKiBtYXlhLWNsaWVudFxuICogQ29weXJpZ2h0IChjKSAyMDE0LCBQYXJ0bmVyaW5nIFJvYm90aWNzLCBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVGhpcyBsaWJyYXJ5IGlzIGZyZWUgc29mdHdhcmU7IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vclxuICogbW9kaWZ5IGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpY1xuICogTGljZW5zZSBhcyBwdWJsaXNoZWQgYnkgdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgdmVyc2lvblxuICpcdDMuMCBvZiB0aGUgTGljZW5zZS4gVGhpcyBsaWJyYXJ5IGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlXG4gKiB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLCBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlblxuICogdGhlIGltcGxpZWQgd2FycmFudHkgb2YgTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUlxuICogUFVSUE9TRS4gU2VlIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWNcbiAqIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIGxpYnJhcnkuXG4gKi9cblxuXG4oZnVuY3Rpb24gKCkge1xuXG5cdHZhciBEaXlhU2VsZWN0b3IgPSBkMS5EaXlhU2VsZWN0b3I7XG5cdHZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpO1xuXHR2YXIgV2F0Y2hlciA9IHJlcXVpcmUoJy4vd2F0Y2hlci5qcycpO1xuXHR2YXIgZm9ybWF0VGltZSA9IHJlcXVpcmUoJy4vdGltZWNvbnRyb2wuanMnKS5mb3JtYXRUaW1lO1xuXHRjb25zdCBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJykoJ2llcScpO1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXG5cblxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXHQvLy8vLy8vLy8vLy8vLy8vLy8vIExvZ2dpbmcgdXRpbGl0eSBtZXRob2RzIC8vLy8vLy8vLy8vLy8vLy8vL1xuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cdC8qKlxuXHQgKiBJRVEgQVBJIGhhbmRsZXJcblx0ICovXG5cdGZ1bmN0aW9uIElFUShzZWxlY3Rvcikge1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHR0aGlzLnNlbGVjdG9yID0gc2VsZWN0b3I7XG5cdFx0dGhpcy5kYXRhTW9kZWwgPSB7fTtcblx0XHR0aGlzLl9jb2RlciA9IHNlbGVjdG9yLmVuY29kZSgpO1xuXHRcdHRoaXMud2F0Y2hlcnMgPSBbXTtcblxuXHRcdC8qKiogc3RydWN0dXJlIG9mIGRhdGEgY29uZmlnLiBbXSBtZWFucyBkZWZhdWx0IHZhbHVlICoqKlxuXHRcdFx0IGNyaXRlcmlhIDpcblx0XHRcdCAgIHRpbWU6IGFsbCAzIHRpbWUgY3JpdGVyaWEgc2hvdWxkIG5vdCBiZSBkZWZpbmVkIGF0IHRoZSBzYW1lIHRpbWUuIChyYW5nZSB3b3VsZCBiZSBnaXZlbiB1cClcblx0XHRcdCAgICAgc3RhcnQ6IHtbbnVsbF0sdGltZX0gKG51bGwgbWVhbnMgbW9zdCByZWNlbnQpIC8vIHN0b3JlZCBhIFVUQyBpbiBtcyAobnVtKVxuXHRcdFx0ICAgICBlbmQ6IHtbbnVsbF0sIHRpbWV9IChudWxsIG1lYW5zIG1vc3Qgb2xkZXN0KSAvLyBzdG9yZWQgYXMgVVRDIGluIG1zIChudW0pXG5cdFx0XHQgICAgIHJhbmdlOiB7W251bGxdLCB0aW1lfSAocmFuZ2Ugb2YgdGltZShwb3NpdGl2ZSkgKSAvLyBpbiBzIChudW0pXG5cdFx0XHQgICByb2JvdDoge0FycmF5T2YgSUQgb3IgW1wiYWxsXCJdfVxuXHRcdFx0ICAgcGxhY2U6IHtBcnJheU9mIElEIG9yIFtcImFsbFwiXX1cblx0XHRcdCBvcGVyYXRvcjoge1tsYXN0XSwgbWF4LCBtb3ksIHNkfSAtIGRlcHJlY2F0ZWRcblx0XHRcdCAuLi5cblxuXHRcdFx0IHNlbnNvcnMgOiB7W251bGxdIG9yIEFycmF5T2YgU2Vuc29yTmFtZX1cblxuXHRcdCBzYW1wbGluZzoge1tudWxsXSBvciBpbnR9IC0gZGVwcmVjYXRlZFxuXHRcdCovXG5cdFx0dGhpcy5kYXRhQ29uZmlnID0ge1xuXHRcdFx0Y3JpdGVyaWE6IHtcblx0XHRcdFx0dGltZToge1xuXHRcdFx0XHRcdHN0YXJ0OiBudWxsLFxuXHRcdFx0XHRcdGVuZDogbnVsbCxcblx0XHRcdFx0XHRyYW5nZTogbnVsbCAvLyBpbiBzXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHJvYm90OiBudWxsLFxuXHRcdFx0XHRwbGFjZTogbnVsbFxuXHRcdFx0fSxcblx0XHRcdG9wZXJhdG9yOiAnbGFzdCcsXG5cdFx0XHRzZW5zb3JzOiBudWxsLFxuXHRcdFx0c2FtcGxpbmc6IG51bGwgLy9zYW1wbGluZ1xuXHRcdH07XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXHQvKipcblx0ICogR2V0IGRhdGFNb2RlbCA6XG5cdCAqIHtcblx0ICpcdFwic2Vuc2V1clhYXCI6IHtcblx0ICpcdFx0XHRkYXRhOltGTE9BVCwgLi4uXSxcblx0ICpcdFx0XHR0aW1lOltGTE9BVCwgLi4uXSxcblx0ICpcdFx0XHRyb2JvdDpbRkxPQVQsIC4uLl0sXG5cdCAqXHRcdFx0cGxhY2U6W0ZMT0FULCAuLi5dLFxuXHQgKlx0XHRcdHF1YWxpdHlJbmRleDpbRkxPQVQsIC4uLl0sXG5cdCAqXHRcdFx0cmFuZ2U6IFtGTE9BVCwgRkxPQVRdLFxuXHQgKlx0XHRcdHVuaXQ6IHN0cmluZyxcblx0ICpcdFx0bGFiZWw6IHN0cmluZ1xuXHQgKlx0XHR9LFxuXHQgKlx0IC4uLiAoXCJzZW5zZXVyc1lZXCIpXG5cdCAqIH1cblx0ICovXG5cdElFUS5wcm90b3R5cGUuZ2V0RGF0YU1vZGVsID0gZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLmRhdGFNb2RlbDtcblx0fTtcblx0SUVRLnByb3RvdHlwZS5nZXREYXRhUmFuZ2UgPSBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuZGF0YU1vZGVsLnJhbmdlO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBAcGFyYW0ge09iamVjdH0gZGF0YUNvbmZpZyBjb25maWcgZm9yIGRhdGEgcmVxdWVzdFxuXHQgKiBpZiBkYXRhQ29uZmlnIGlzIGRlZmluZSA6IHNldCBhbmQgcmV0dXJuIHRoaXNcblx0ICpcdCBAcmV0dXJuIHtJRVF9IHRoaXNcblx0ICogZWxzZVxuXHQgKlx0IEByZXR1cm4ge09iamVjdH0gY3VycmVudCBkYXRhQ29uZmlnXG5cdCAqL1xuXHRJRVEucHJvdG90eXBlLkRhdGFDb25maWcgPSBmdW5jdGlvbiAobmV3RGF0YUNvbmZpZykge1xuXHRcdGlmIChuZXdEYXRhQ29uZmlnICE9IG51bGwpIHtcblx0XHRcdHRoaXMuZGF0YUNvbmZpZyA9bmV3RGF0YUNvbmZpZztcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5kYXRhQ29uZmlnO1xuXHRcdH1cblx0fTtcblx0LyoqXG5cdCAqIFRPIEJFIElNUExFTUVOVEVEIDogb3BlcmF0b3IgbWFuYWdlbWVudCBpbiBETi1JRVFcblx0ICogQHBhcmFtICB7U3RyaW5nfVx0IG5ld09wZXJhdG9yIDoge1tsYXN0XSwgbWF4LCBtb3ksIHNkfVxuXHQgKiBAcmV0dXJuIHtJRVF9IHRoaXMgLSBjaGFpbmFibGVcblx0ICogU2V0IG9wZXJhdG9yIGNyaXRlcmlhLlxuXHQgKiBEZXBlbmRzIG9uIG5ld09wZXJhdG9yXG5cdCAqXHRAcGFyYW0ge1N0cmluZ30gbmV3T3BlcmF0b3Jcblx0ICpcdEByZXR1cm4gdGhpc1xuXHQgKiBHZXQgb3BlcmF0b3IgY3JpdGVyaWEuXG5cdCAqXHRAcmV0dXJuIHtTdHJpbmd9IG9wZXJhdG9yXG5cdCAqL1xuXHRJRVEucHJvdG90eXBlLkRhdGFPcGVyYXRvciA9IGZ1bmN0aW9uIChuZXdPcGVyYXRvcikge1xuXHRcdGlmIChuZXdPcGVyYXRvciAhPSBudWxsKSB7XG5cdFx0XHR0aGlzLmRhdGFDb25maWcub3BlcmF0b3IgPSBuZXdPcGVyYXRvcjtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5kYXRhQ29uZmlnLm9wZXJhdG9yO1xuXHRcdH1cblx0fTtcblx0LyoqXG5cdCAqIERlcGVuZHMgb24gbnVtU2FtcGxlc1xuXHQgKiBAcGFyYW0ge2ludH0gbnVtYmVyIG9mIHNhbXBsZXMgaW4gZGF0YU1vZGVsXG5cdCAqIGlmIGRlZmluZWQgOiBzZXQgbnVtYmVyIG9mIHNhbXBsZXNcblx0ICpcdEByZXR1cm4ge0lFUX0gdGhpc1xuXHQgKiBlbHNlXG5cdCAqXHRAcmV0dXJuIHtpbnR9IG51bWJlciBvZiBzYW1wbGVzXG5cdCAqKi9cblx0SUVRLnByb3RvdHlwZS5EYXRhU2FtcGxpbmcgPSBmdW5jdGlvbiAobnVtU2FtcGxlcykge1xuXHRcdGlmIChudW1TYW1wbGVzICE9IG51bGwpIHtcblx0XHRcdHRoaXMuZGF0YUNvbmZpZy5zYW1wbGluZyA9IG51bVNhbXBsZXM7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuZGF0YUNvbmZpZy5zYW1wbGluZztcblx0XHR9XG5cdH07XG5cdC8qKlxuXHQgKiBTZXQgb3IgZ2V0IGRhdGEgdGltZSBjcml0ZXJpYSBzdGFydCBhbmQgZW5kLlxuXHQgKiBJZiBwYXJhbSBkZWZpbmVkXG5cdCAqXHRAcGFyYW0ge0RhdGV9IG5ld1RpbWVTdGFydCAvLyBtYXkgYmUgbnVsbFxuXHQgKlx0QHBhcmFtIHtEYXRlfSBuZXdUaW1lRW5kIC8vIG1heSBiZSBudWxsXG5cdCAqXHRAcmV0dXJuIHtJRVF9IHRoaXNcblx0ICogSWYgbm8gcGFyYW0gZGVmaW5lZDpcblx0ICpcdEByZXR1cm4ge09iamVjdH0gVGltZSBvYmplY3Q6IGZpZWxkcyBzdGFydCBhbmQgZW5kLlxuXHQgKi9cblx0SUVRLnByb3RvdHlwZS5EYXRhVGltZSA9IGZ1bmN0aW9uIChuZXdUaW1lU3RhcnQsIG5ld1RpbWVFbmQsIG5ld1JhbmdlKSB7XG5cdFx0aWYgKG5ld1RpbWVTdGFydCAhPSBudWxsIHx8IG5ld1RpbWVFbmQgIT0gbnVsbCB8fCBuZXdSYW5nZSAhPSBudWxsKSB7XG5cdFx0XHR0aGlzLmRhdGFDb25maWcuY3JpdGVyaWEudGltZS5zdGFydCA9IGZvcm1hdFRpbWUobmV3VGltZVN0YXJ0KTtcblx0XHRcdHRoaXMuZGF0YUNvbmZpZy5jcml0ZXJpYS50aW1lLmVuZCA9IGZvcm1hdFRpbWUobmV3VGltZUVuZCk7XG5cdFx0XHR0aGlzLmRhdGFDb25maWcuY3JpdGVyaWEudGltZS5yYW5nZSA9IG5ld1JhbmdlO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHN0YXJ0OiBuZXcgRGF0ZSh0aGlzLmRhdGFDb25maWcuY3JpdGVyaWEudGltZS5zdGFydCksXG5cdFx0XHRcdGVuZDogbmV3IERhdGUodGhpcy5kYXRhQ29uZmlnLmNyaXRlcmlhLnRpbWUuZW5kKSxcblx0XHRcdFx0cmFuZ2U6IG5ldyBEYXRlKHRoaXMuZGF0YUNvbmZpZy5jcml0ZXJpYS50aW1lLnJhbmdlKVxuXHRcdFx0fTtcblx0XHR9XG5cdH07XG5cdC8qKlxuXHQgKiBEZXBlbmRzIG9uIHJvYm90SWRzXG5cdCAqIFNldCByb2JvdCBjcml0ZXJpYS5cblx0ICpcdEBwYXJhbSB7QXJyYXlbSW50XX0gcm9ib3RJZHMgbGlzdCBvZiByb2JvdCBJZHNcblx0ICogR2V0IHJvYm90IGNyaXRlcmlhLlxuXHQgKlx0QHJldHVybiB7QXJyYXlbSW50XX0gbGlzdCBvZiByb2JvdCBJZHNcblx0ICovXG5cdElFUS5wcm90b3R5cGUuRGF0YVJvYm90SWRzID0gZnVuY3Rpb24gKHJvYm90SWRzKSB7XG5cdFx0aWYgKHJvYm90SWRzICE9IG51bGwpIHtcblx0XHRcdHRoaXMuZGF0YUNvbmZpZy5jcml0ZXJpYS5yb2JvdCA9IHJvYm90SWRzO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLmRhdGFDb25maWcuY3JpdGVyaWEucm9ib3Q7XG5cdFx0fVxuXHR9O1xuXHQvKipcblx0ICogRGVwZW5kcyBvbiBwbGFjZUlkc1xuXHQgKiBTZXQgcGxhY2UgY3JpdGVyaWEuXG5cdCAqXHRAcGFyYW0ge0FycmF5W0ludF19IHBsYWNlSWRzIGxpc3Qgb2YgcGxhY2UgSWRzXG5cdCAqIEdldCBwbGFjZSBjcml0ZXJpYS5cblx0ICpcdEByZXR1cm4ge0FycmF5W0ludF19IGxpc3Qgb2YgcGxhY2UgSWRzXG5cdCAqL1xuXHRJRVEucHJvdG90eXBlLkRhdGFQbGFjZUlkcyA9IGZ1bmN0aW9uIChwbGFjZUlkcykge1xuXHRcdGlmIChwbGFjZUlkcyAhPSBudWxsKSB7XG5cdFx0XHR0aGlzLmRhdGFDb25maWcuY3JpdGVyaWEucGxhY2VJZCA9IHBsYWNlSWRzO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXHRcdGVsc2Vcblx0XHRcdHJldHVybiB0aGlzLmRhdGFDb25maWcuY3JpdGVyaWEucGxhY2U7XG5cdH07XG5cdC8qKlxuXHQgKiBHZXQgZGF0YSBieSBzZW5zb3IgbmFtZS5cblx0ICpcdEBwYXJhbSB7QXJyYXlbU3RyaW5nXX0gc2Vuc29yTmFtZSBsaXN0IG9mIHNlbnNvcnNcblx0ICovXG5cblxuXG5cdElFUS5wcm90b3R5cGUuZ2V0RGF0YUJ5TmFtZSA9IGZ1bmN0aW9uIChzZW5zb3JOYW1lcykge1xuXHRcdHZhciBkYXRhPVtdO1xuXHRcdGZvcih2YXIgbiBpbiBzZW5zb3JOYW1lcykge1xuXHRcdFx0ZGF0YS5wdXNoKHRoaXMuZGF0YU1vZGVsW3NlbnNvck5hbWVzW25dXSk7XG5cdFx0fVxuXHRcdHJldHVybiBkYXRhO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBVcGRhdGUgZGF0YSBnaXZlbiBkYXRhQ29uZmlnLlxuXHQgKiBAcGFyYW0ge2Z1bmN9IGNhbGxiYWNrIDogY2FsbGVkIGFmdGVyIHVwZGF0ZVxuXHQgKiBAcGFyYW0ge29iamVjdH0gZGF0YUNvbmZpZzogZGF0YSB0byBjb25maWcgcmVxdWVzdFxuXHQgKiBUT0RPIFVTRSBQUk9NSVNFXG5cdCAqL1xuXG5cdElFUS5wcm90b3R5cGUudXBkYXRlRGF0YSA9IGZ1bmN0aW9uIChjYWxsYmFjaywgZGF0YUNvbmZpZykge1xuXHRcdHRoaXMuX3VwZGF0ZURhdGEoY2FsbGJhY2ssIGRhdGFDb25maWcsIFwiRGF0YVJlcXVlc3RcIilcblx0fTtcblxuXHQvKipcblx0ICogVXBkYXRlIGRhdGEgZ2l2ZW4gZGF0YUNvbmZpZy5cblx0ICogQHBhcmFtIHtmdW5jfSBjYWxsYmFjayA6IGNhbGxlZCBhZnRlciB1cGRhdGVcblx0ICogQHBhcmFtIHtvYmplY3R9IGRhdGFDb25maWc6IGRhdGEgdG8gY29uZmlnIHJlcXVlc3Rcblx0ICogQHBhcmFtIHtzdHJpbmd9IGZ1bmNOYW1lOiBuYW1lIG9mIHJlcXVlc3RlZCBmdW5jdGlvbiBpbiBkaXlhLW5vZGUtaWVxLiBEZWZhdWx0OiBcIkRhdGFSZXF1ZXN0XCIuXG5cdCAqIFRPRE8gVVNFIFBST01JU0Vcblx0ICovXG5cblx0SUVRLnByb3RvdHlwZS5fdXBkYXRlRGF0YSA9IGZ1bmN0aW9uIChjYWxsYmFjaywgZGF0YUNvbmZpZywgZnVuY05hbWUpIHtcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0aWYgKGRhdGFDb25maWcpXG5cdFx0XHR0aGlzLkRhdGFDb25maWcoZGF0YUNvbmZpZyk7XG5cblx0XHR0aGlzLnNlbGVjdG9yLnJlcXVlc3Qoe1xuXHRcdFx0c2VydmljZTogXCJpZXFcIixcblx0XHRcdGZ1bmM6IGZ1bmNOYW1lLFxuXHRcdFx0ZGF0YToge2RhdGE6IEpTT04uc3RyaW5naWZ5KHRoYXQuZGF0YUNvbmZpZyl9LFx0XHQvL1x0dHlwZTpcInNwbFJlcVwiLFxuXHRcdFx0b2JqOntcblx0XHRcdFx0cGF0aDogJy9mci9wYXJ0bmVyaW5nL0llcScsXG5cdFx0XHRcdGludGVyZmFjZTogXCJmci5wYXJ0bmVyaW5nLkllcVwiXG5cdFx0XHR9XG5cdFx0fSwgZnVuY3Rpb24gKGRuSWQsIGVyciwgZGF0YSkge1xuXHRcdFx0ZGF0YSA9IEpTT04ucGFyc2UoZGF0YSk7XG5cdFx0XHRpZiAoZXJyICE9IG51bGwpIHtcblx0XHRcdFx0aWYgKHR5cGVvZiBlcnIgPT0gXCJzdHJpbmdcIikgZGVidWcoXCJSZWN2IGVycjogXCIrIGVycik7XG5cdFx0XHRcdGVsc2UgaWYgKHR5cGVvZiBlcnIgPT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgZXJyLm5hbWUgPT0gJ3N0cmluZycpIHtcblx0XHRcdFx0XHRjYWxsYmFjayhudWxsLCBlcnIubmFtZSk7XG5cdFx0XHRcdFx0aWYgKHR5cGVvZiBlcnIubWVzc2FnZT09XCJzdHJpbmdcIikgZGVidWcoZXJyLm1lc3NhZ2UpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdGNhbGxiYWNrKHRoYXQuX2dldERhdGFNb2RlbEZyb21SZWN2KGRhdGEpKTsgLy8gY2FsbGJhY2sgZnVuY1xuXHRcdH0pO1xuXHR9O1xuXG5cdElFUS5wcm90b3R5cGUuX2lzRGF0YU1vZGVsV2l0aE5hTiA9IGZ1bmN0aW9uICgpIHtcblx0XHR2YXIgZGF0YU1vZGVsTmFOPWZhbHNlO1xuXHRcdHZhciBzZW5zb3JOYW47XG5cdFx0Zm9yKHZhciBuIGluIHRoaXMuZGF0YU1vZGVsKSB7XG5cdFx0XHRzZW5zb3JOYW4gPSB0aGlzLmRhdGFNb2RlbFtuXS5kYXRhLnJlZHVjZShmdW5jdGlvbiAobmFuUHJlcywgZCkge1xuXHRcdFx0XHRyZXR1cm4gbmFuUHJlcyAmJiBpc05hTihkKTtcblx0XHRcdH0sIGZhbHNlKTtcblx0XHRcdGRhdGFNb2RlbE5hTiA9IGRhdGFNb2RlbE5hTiAmJiBzZW5zb3JOYW47XG5cdFx0XHRkZWJ1ZyhuK1wiIHdpdGggbmFuIDogXCIrc2Vuc29yTmFuK1wiIChcIitkYXRhTW9kZWxOYU4rXCIpIC8gXCIrdGhpcy5kYXRhTW9kZWxbbl0uZGF0YS5sZW5ndGgpO1xuXHRcdH1cblx0fTtcblxuXHRJRVEucHJvdG90eXBlLmdldENvbmZpbmVtZW50TGV2ZWwgPSBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuY29uZmluZW1lbnQ7XG5cdH07XG5cblx0SUVRLnByb3RvdHlwZS5nZXRBaXJRdWFsaXR5TGV2ZWwgPSBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuYWlyUXVhbGl0eTtcblx0fTtcblxuXHRJRVEucHJvdG90eXBlLmdldEVudlF1YWxpdHlMZXZlbCA9IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5lbnZRdWFsaXR5O1xuXHR9O1xuXG5cblxuXHQvKipcblx0ICogVXBkYXRlIGludGVybmFsIG1vZGVsIHdpdGggcmVjZWl2ZWQgZGF0YVxuXHQgKiBAcGFyYW0gIGNvbmZpZyBkYXRhIHRvIGNvbmZpZ3VyZSBzdWJzY3JpcHRpb25cblx0ICogQHBhcmFtICBjYWxsYmFjayBjYWxsZWQgb24gYW5zd2VycyAoQHBhcmFtIDogZGF0YU1vZGVsKVxuXHQgKiBAcmV0dXJuIHdhdGNoZXIgY3JlYXRlZCB3YXRjaGVyXG5cdCAqL1xuXHRJRVEucHJvdG90eXBlLndhdGNoID0gZnVuY3Rpb24gKGNvbmZpZywgY2FsbGJhY2spIHtcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cblx0XHQvLyBkbyBub3QgY3JlYXRlIHdhdGNoZXIgd2l0aG91dCBhIGNhbGxiYWNrXG5cdFx0aWYgKCBjYWxsYmFjaz09bnVsbCB8fCB0eXBlb2YgY2FsbGJhY2sgIT09ICdmdW5jdGlvbicpIHJldHVybiBudWxsO1xuXG5cdFx0bGV0IHdhdGNoZXIgPSBuZXcgV2F0Y2hlcih0aGlzLnNlbGVjdG9yLCBjb25maWcpO1xuXG5cdFx0Ly8gYWRkIHdhdGNoZXIgaW4gd2F0Y2hlciBsaXN0XG5cdFx0dGhpcy53YXRjaGVycy5wdXNoKHdhdGNoZXIpO1xuXG5cdFx0d2F0Y2hlci5vbignZGF0YScsIGRhdGEgPT4ge1xuXHRcdFx0Y2FsbGJhY2sodGhhdC5fZ2V0RGF0YU1vZGVsRnJvbVJlY3YoZGF0YSkpO1xuXHRcdH0pO1xuXHRcdHdhdGNoZXIub24oJ3N0b3AnLCB0aGlzLl9yZW1vdmVXYXRjaGVyKTtcblxuXHRcdHJldHVybiB3YXRjaGVyO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBDYWxsYmFjayB0byByZW1vdmUgd2F0Y2hlciBmcm9tIGxpc3Rcblx0ICogQHBhcmFtIHdhdGNoZXIgdG8gYmUgcmVtb3ZlZFxuXHQgKi9cblx0SUVRLnByb3RvdHlwZS5fcmVtb3ZlV2F0Y2hlciA9IGZ1bmN0aW9uICh3YXRjaGVyKSB7XG5cdFx0Ly8gZmluZCBhbmQgcmVtb3ZlIHdhdGNoZXIgaW4gbGlzdFxuXHRcdHRoaXMud2F0Y2hlcnMuZmluZCggKGVsLCBpZCwgd2F0Y2hlcnMpID0+IHtcblx0XHRcdGlmICggd2F0Y2hlcj09PWVsICkge1xuXHRcdFx0XHR3YXRjaGVycy5zcGxpY2UoaWQsIDEpOyAvLyByZW1vdmVcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSlcblx0fTtcblxuXHQvKipcblx0ICogU3RvcCBhbGwgd2F0Y2hlcnNcblx0ICovXG5cdElFUS5wcm90b3R5cGUuY2xvc2VTdWJzY3JpcHRpb25zID0gZnVuY3Rpb24gKCkge1xuXHRcdGNvbnNvbGUud2FybignRGVwcmVjYXRlZCBmdW5jdGlvbiB1c2Ugc3RvcFdhdGNoZXJzIGluc3RlYWQnKTtcblx0XHR0aGlzLnN0b3BXYXRjaGVycygpO1xuXHR9O1xuXHRJRVEucHJvdG90eXBlLnN0b3BXYXRjaGVycyA9IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLndhdGNoZXJzLmZvckVhY2goIHdhdGNoZXIgPT4ge1xuXHRcdFx0Ly8gcmVtb3ZlIGxpc3RlbmVyIG9uIHN0b3AgZXZlbnQgdG8gYXZvaWQgcHVyZ2luZyB3YXRjaGVycyB0d2ljZVxuXHRcdFx0d2F0Y2hlci5yZW1vdmVMaXN0ZW5lcignc3RvcCcsIHRoaXMuX3JlbW92ZVdhdGNoZXIpO1xuXHRcdFx0d2F0Y2hlci5zdG9wKCk7XG5cdFx0fSk7XG5cdFx0dGhpcy53YXRjaGVycyA9W107XG5cdH07XG5cblx0LyoqXG5cdCogUmVxdWVzdCBEYXRhIHRvIG1ha2UgQ1NWIGZpbGVcblx0XHQqIEBwYXJhbSB7b2JqZWN0fSBjc3ZDb25maWcgcGFyYW1zOlxuXHRcdCogQHBhcmFtIHtsaXN0fSBjc3ZDb25maWcuc2Vuc29yTmFtZXMgOiBsaXN0IG9mIHNlbnNvciBhbmQgaW5kZXggbmFtZXNcblx0XHQqIEBwYXJhbSB7bnVtYmVyfSBjc3ZDb25maWcuX3N0YXJ0VGltZTogdGltZXN0YW1wIG9mIGJlZ2lubmluZyB0aW1lXG5cdFx0KiBAcGFyYW0ge251bWJlcn0gY3N2Q29uZmlnLl9lbmRUaW1lOiB0aW1lc3RhbXAgb2YgZW5kIHRpbWVcblx0XHQqIEBwYXJhbSB7c3RyaW5nfSBjc3ZDb25maWcudGltZVNhbXBsZTogdGltZWludGVydmFsIGZvciBkYXRhLiBQYXJhbWV0ZXJzOiBcInNlY29uZFwiLCBcIm1pbnV0ZVwiLCBcImhvdXJcIiwgXCJkYXlcIiwgXCJ3ZWVrXCIsIFwibW9udGhcIlxuXHRcdCogQHBhcmFtIHtudW1iZXJ9IGNzdkNvbmZpZy5fbmxpbmVzOiBtYXhpbXVtIG51bWJlciBvZiBsaW5lcyByZXF1ZXN0ZWRcblx0XHQqIEBwYXJhbSB7Y2FsbGJhY2t9IGNhbGxiYWNrOiBjYWxsZWQgYWZ0ZXIgdXBkYXRlIChAcGFyYW0gdXJsIHRvIGRvd25sb2FkIGNzdiBmaWxlKVxuXHQqL1xuXHRJRVEucHJvdG90eXBlLmdldENTVkRhdGEgPSBmdW5jdGlvbiAoY3N2Q29uZmlnLCBjYWxsYmFjaykge1xuXG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXG5cdFx0aWYgKGNzdkNvbmZpZyAmJiB0eXBlb2YgY3N2Q29uZmlnLm5saW5lcyAhPSBcIm51bWJlclwiICkgY3N2Q29uZmlnLm5saW5lcyA9IHVuZGVmaW5lZDtcblxuXHRcdHZhciBkYXRhQ29uZmlnID1KU09OLnN0cmluZ2lmeSh7XG5cdFx0XHRjcml0ZXJpYToge1xuXHRcdFx0XHR0aW1lOiB7IHN0YXJ0OiBmb3JtYXRUaW1lKGNzdkNvbmZpZy5zdGFydFRpbWUpLCBlbmQ6IGZvcm1hdFRpbWUoY3N2Q29uZmlnLmVuZFRpbWUpLCBzYW1wbGluZzpjc3ZDb25maWcudGltZVNhbXBsZX0sXG5cdFx0XHRcdHBsYWNlczogW10sXG5cdFx0XHRcdHJvYm90czogW11cblx0XHRcdH0sXG5cdFx0XHRzZW5zb3JzOiBjc3ZDb25maWcuc2Vuc29yTmFtZXMsXG5cdFx0XHRzYW1wbGluZzogY3N2Q29uZmlnLm5saW5lc1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5zZWxlY3Rvci5yZXF1ZXN0KHtcblx0XHRcdHNlcnZpY2U6IFwiaWVxXCIsXG5cdFx0XHRmdW5jOiBcIkNzdkRhdGFSZXF1ZXN0XCIsXG5cdFx0XHRkYXRhOiB7ZGF0YTogZGF0YUNvbmZpZ30sXG5cdFx0XHQvL1x0dHlwZTpcInNwbFJlcVwiLFxuXHRcdFx0b2JqOntcblx0XHRcdFx0cGF0aDogJy9mci9wYXJ0bmVyaW5nL0llcScsXG5cdFx0XHRcdGludGVyZmFjZTogXCJmci5wYXJ0bmVyaW5nLkllcVwiXG5cdFx0XHR9XG5cdFx0fSwgZnVuY3Rpb24gKGRuSWQsIGVyciwgZGF0YSkge1xuXHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRpZiAodHlwZW9mIGVyciA9PVwic3RyaW5nXCIpIGRlYnVnKFwiUmVjdiBlcnI6IFwiKyBlcnIpO1xuXHRcdFx0XHRlbHNlIGlmICh0eXBlb2YgZXJyID09IFwib2JqZWN0XCIgJiYgdHlwZW9mIGVyci5uYW1lID09J3N0cmluZycpIHtcblx0XHRcdFx0XHRjYWxsYmFjayhudWxsLCBlcnIubmFtZSk7XG5cdFx0XHRcdFx0aWYgKHR5cGVvZiBlcnIubWVzc2FnZT09XCJzdHJpbmdcIikgZGVidWcoZXJyLm1lc3NhZ2UpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdGNhbGxiYWNrKGRhdGEpO1xuXHRcdH0pO1xuXHR9O1xuXG5cblxuXHQvKipcblx0ICogUmVxdWVzdCBEYXRhIHRvIG1ha2UgZGF0YSBtYXBcblx0ICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhQ29uZmlnIGNvbmZpZyBmb3IgZGF0YSByZXF1ZXN0XG5cdCAgKiBAcGFyYW0ge2NhbGxiYWNrfSBjYWxsYmFjazogY2FsbGVkIGFmdGVyIHVwZGF0ZVxuXHQgICovXG5cdElFUS5wcm90b3R5cGUuZ2V0RGF0YU1hcERhdGEgPSBmdW5jdGlvbiAoZGF0YUNvbmZpZywgY2FsbGJhY2spIHtcblx0XHR0aGlzLl91cGRhdGVEYXRhKGNhbGxiYWNrLCBkYXRhQ29uZmlnLCBcIkRhdGFSZXF1ZXN0XCIpO1xuXHR9O1xuXG5cblx0LyoqXG5cdCAqIFJlcXVlc3QgRGF0YSB0byBtYWtlIGhlYXRtYXBcblx0ICAqIEBwYXJhbSB7bGlzdH0gc2Vuc29yTmFtZXMgOiBsaXN0IG9mIHNlbnNvciBhbmQgaW5kZXggbmFtZXNcblx0ICAqIEBwYXJhbSB7b2JqZWN0fSB0aW1lOiBvYmplY3QgY29udGFpbmluZyB0aW1lc3RhbXBzIGZvciBiZWdpbiBhbmQgZW5kIG9mIGRhdGEgZm9yIGhlYXRtYXBcblx0ICAqIEBwYXJhbSB7c3RyaW5nfSBzYW1wbGU6IHRpbWVpbnRlcnZhbCBmb3IgZGF0YS4gUGFyYW1ldGVyczogXCJzZWNvbmRcIiwgXCJtaW51dGVcIiwgXCJob3VyXCIsIFwiZGF5XCIsIFwid2Vla1wiLCBcIm1vbnRoXCJcblx0ICAqIEBwYXJhbSB7Y2FsbGJhY2t9IGNhbGxiYWNrOiBjYWxsZWQgYWZ0ZXIgdXBkYXRlXG5cdCAgKiBAZGVwcmVjYXRlZCBXaWxsIGJlIGRlcHJlY2F0ZWQgaW4gZnV0dXJlIHZlcnNpb24uIFBsZWFzZSB1c2UgXCJnZXREYXRhTWFwRGF0YVwiIGluc3RlYWQuXG5cblx0ICAqL1xuXHRJRVEucHJvdG90eXBlLmdldEhlYXRNYXBEYXRhID0gZnVuY3Rpb24gKHNlbnNvck5hbWVzLCB0aW1lLCBzYW1wbGUsIGNhbGxiYWNrKSB7XG5cdFx0dmFyIGRhdGFDb25maWcgPSB7XG5cdFx0XHRjcml0ZXJpYToge1xuXHRcdFx0XHR0aW1lOiB7c3RhcnQ6IGZvcm1hdFRpbWUodGltZS5zdGFydEVwb2NoKSwgZW5kOiBmb3JtYXRUaW1lKHRpbWUuZW5kRXBvY2gpLCBzYW1wbGluZzogc2FtcGxlfSxcblx0XHRcdFx0cGxhY2VzOiBbXSxcblx0XHRcdFx0cm9ib3RzOiBbXVxuXHRcdFx0fSxcblx0XHRcdHNlbnNvcnM6IHNlbnNvck5hbWVzXG5cdFx0fTtcblx0XHRjb25zb2xlLndhcm4oJ1RoaXMgZnVuY3Rpb24gd2lsbCBiZSBkZXByZWNhdGVkLiBQbGVhc2UgdXNlIFwiZ2V0RGF0YU1hcERhdGFcIiBpbnN0ZWFkLicpO1xuXHRcdHRoaXMuZ2V0RGF0YU1hcERhdGEoZGF0YUNvbmZpZywgY2FsbGJhY2spXG5cdH07XG5cblx0LyoqXG5cdCAqIFVwZGF0ZSBpbnRlcm5hbCBtb2RlbCB3aXRoIHJlY2VpdmVkIGRhdGFcblx0ICogQHBhcmFtICB7T2JqZWN0fSBkYXRhIGRhdGEgcmVjZWl2ZWQgZnJvbSBEaXlhTm9kZSBieSB3ZWJzb2NrZXRcblx0ICogQHJldHVybiB7W3R5cGVdfVx0XHRbZGVzY3JpcHRpb25dXG5cdCAqL1xuXHRJRVEucHJvdG90eXBlLl9nZXREYXRhTW9kZWxGcm9tUmVjdiA9IGZ1bmN0aW9uIChkYXRhKSB7XG5cdFx0dmFyIGRhdGFNb2RlbD1udWxsO1xuXHRcdGRlYnVnKCdHZXREYXRhTW9kZWwnLCBkYXRhKVxuXHRcdGlmIChkYXRhICE9IG51bGwpIHtcblx0XHRcdGZvciAodmFyIG4gaW4gZGF0YSkge1xuXHRcdFx0XHRpZiAobiAhPSBcImhlYWRlclwiICYmIG4gIT0gXCJlcnJcIikge1xuXG5cdFx0XHRcdFx0aWYgKGRhdGFbbl0uZXJyICYmIGRhdGFbbl0uZXJyLnN0PjApIHtcblx0XHRcdFx0XHRcdGRlYnVnKG4rXCIgd2FzIGluIGVycm9yOiBcIitkYXRhW25dLmVyci5tc2cpO1xuXHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCFkYXRhTW9kZWwpXG5cdFx0XHRcdFx0XHRkYXRhTW9kZWw9e307XG5cblx0XHRcdFx0XHRpZiAoIWRhdGFNb2RlbFtuXSkge1xuXHRcdFx0XHRcdFx0ZGF0YU1vZGVsW25dPXt9O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQvKiB1cGRhdGUgZGF0YSBhYnNvbHV0ZSByYW5nZSAqL1xuXHRcdFx0XHRcdGRhdGFNb2RlbFtuXS5yYW5nZT1kYXRhW25dLnJhbmdlO1xuXHRcdFx0XHRcdC8qIHVwZGF0ZSBkYXRhIHJhbmdlICovXG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnRpbWVSYW5nZT1kYXRhW25dLnRpbWVSYW5nZTtcblx0XHRcdFx0XHQvKiB1cGRhdGUgZGF0YSBsYWJlbCAqL1xuXHRcdFx0XHRcdGRhdGFNb2RlbFtuXS5sYWJlbD1kYXRhW25dLmxhYmVsO1xuXHRcdFx0XHRcdC8qIHVwZGF0ZSBkYXRhIHVuaXQgKi9cblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0udW5pdD1kYXRhW25dLnVuaXQ7XG5cdFx0XHRcdFx0LyogdXBkYXRlIGRhdGEgcHJlY2lzaW9uICovXG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnByZWNpc2lvbj1kYXRhW25dLnByZWNpc2lvbjtcblx0XHRcdFx0XHQvKiB1cGRhdGUgZGF0YSBjYXRlZ29yaWVzICovXG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLmNhdGVnb3J5PWRhdGFbbl0uY2F0ZWdvcnk7XG5cdFx0XHRcdFx0Lyogc3VnZ2VzdGVkIHkgZGlzcGxheSByYW5nZSAqL1xuXHRcdFx0XHRcdGRhdGFNb2RlbFtuXS56b29tUmFuZ2UgPSBbMCwgMTAwXTtcblx0XHRcdFx0XHQvLyB1cGRhdGUgc2Vuc29yIGNvbmZvcnQgcmFuZ2Vcblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0uY29uZm9ydFJhbmdlID0gZGF0YVtuXS5jb25mb3J0UmFuZ2U7XG5cblx0XHRcdFx0XHQvKiB1cGRhdGUgZGF0YSBpbmRleFJhbmdlICovXG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnF1YWxpdHlDb25maWc9e1xuXHRcdFx0XHRcdFx0LyogY29uZm9ydFJhbmdlOiBkYXRhW25dLmNvbmZvcnRSYW5nZSwgKi9cblx0XHRcdFx0XHRcdGluZGV4UmFuZ2U6IGRhdGFbbl0uaW5kZXhSYW5nZVxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnRpbWUgPSB0aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0udGltZSwgJ2I2NCcsIDgpO1xuXHRcdFx0XHRcdGRhdGFNb2RlbFtuXS5kYXRhID0gKGRhdGFbbl0uZGF0YT90aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0uZGF0YSwgJ2I2NCcsIDQpOihkYXRhW25dLmF2Zz90aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0uYXZnLmQsICdiNjQnLCA0KTpudWxsKSk7XG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnF1YWxpdHlJbmRleCA9IChkYXRhW25dLmRhdGE/dGhpcy5fY29kZXIuZnJvbShkYXRhW25dLmluZGV4LCAnYjY0JywgNCk6KGRhdGFbbl0uYXZnP3RoaXMuX2NvZGVyLmZyb20oZGF0YVtuXS5hdmcuaSwgJ2I2NCcsIDQpOm51bGwpKTtcblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0ucm9ib3RJZCA9IHRoaXMuX2NvZGVyLmZyb20oZGF0YVtuXS5yb2JvdElkLCAnYjY0JywgNCk7XG5cdFx0XHRcdFx0aWYgKGRhdGFNb2RlbFtuXS5yb2JvdElkKSB7XG5cdFx0XHRcdFx0XHQvKiogZGljbyByb2JvdElkIC0+IHJvYm90TmFtZSAqKi9cblx0XHRcdFx0XHRcdHZhciBkaWNvUm9ib3QgPSB7fTtcblx0XHRcdFx0XHRcdGRhdGEuaGVhZGVyLnJvYm90cy5mb3JFYWNoKGZ1bmN0aW9uIChlbCkge1xuXHRcdFx0XHRcdFx0XHRkaWNvUm9ib3RbZWwuaWRdPWVsLm5hbWU7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdGRhdGFNb2RlbFtuXS5yb2JvdElkID0gZGF0YU1vZGVsW25dLnJvYm90SWQubWFwKGZ1bmN0aW9uIChlbCkge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gZGljb1JvYm90W2VsXTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGRhdGFNb2RlbFtuXS5wbGFjZUlkID0gdGhpcy5fY29kZXIuZnJvbShkYXRhW25dLnBsYWNlSWQsICdiNjQnLCA0KTtcblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0ueCA9IG51bGw7XG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnkgPSBudWxsO1xuXG5cdFx0XHRcdFx0aWYgKGRhdGFbbl0uYXZnKVxuXHRcdFx0XHRcdFx0ZGF0YU1vZGVsW25dLmF2ZyA9IHtcblx0XHRcdFx0XHRcdFx0ZDogdGhpcy5fY29kZXIuZnJvbShkYXRhW25dLmF2Zy5kLCAnYjY0JywgNCksXG5cdFx0XHRcdFx0XHRcdGk6IHRoaXMuX2NvZGVyLmZyb20oZGF0YVtuXS5hdmcuaSwgJ2I2NCcsIDQpXG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdGlmIChkYXRhW25dLm1pbilcblx0XHRcdFx0XHRcdGRhdGFNb2RlbFtuXS5taW4gPSB7XG5cdFx0XHRcdFx0XHRcdGQ6IHRoaXMuX2NvZGVyLmZyb20oZGF0YVtuXS5taW4uZCwgJ2I2NCcsIDQpLFxuXHRcdFx0XHRcdFx0XHRpOiB0aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0ubWluLmksICdiNjQnLCA0KVxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRpZiAoZGF0YVtuXS5tYXgpXG5cdFx0XHRcdFx0XHRkYXRhTW9kZWxbbl0ubWF4ID0ge1xuXHRcdFx0XHRcdFx0XHRkOiB0aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0ubWF4LmQsICdiNjQnLCA0KSxcblx0XHRcdFx0XHRcdFx0aTogdGhpcy5fY29kZXIuZnJvbShkYXRhW25dLm1heC5pLCAnYjY0JywgNClcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0aWYgKGRhdGFbbl0uc3RkZGV2KVxuXHRcdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnN0ZGRldiA9IHtcblx0XHRcdFx0XHRcdFx0ZDogdGhpcy5fY29kZXIuZnJvbShkYXRhW25dLnN0ZGRldi5kLCAnYjY0JywgNCksXG5cdFx0XHRcdFx0XHRcdGk6IHRoaXMuX2NvZGVyLmZyb20oZGF0YVtuXS5zdGRkZXYuaSwgJ2I2NCcsIDQpXG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdGlmIChkYXRhW25dLnN0ZGRldilcblx0XHRcdFx0XHRcdGRhdGFNb2RlbFtuXS5zdGRkZXYgPSB7XG5cdFx0XHRcdFx0XHRcdGQ6IHRoaXMuX2NvZGVyLmZyb20oZGF0YVtuXS5zdGRkZXYuZCwgJ2I2NCcsIDQpLFxuXHRcdFx0XHRcdFx0XHRpOiB0aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0uc3RkZGV2LmksICdiNjQnLCA0KVxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRpZiAoZGF0YVtuXS54KVxuXHRcdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnggPSB0aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0ueCwgJ2I2NCcsIDQpO1xuXHRcdFx0XHRcdGlmIChkYXRhW25dLnkpXG5cdFx0XHRcdFx0XHRkYXRhTW9kZWxbbl0ueSA9IHRoaXMuX2NvZGVyLmZyb20oZGF0YVtuXS55LCAnYjY0JywgNCk7XG5cdFx0XHRcdFx0LyoqXG5cdFx0XHRcdFx0ICogY3VycmVudCBxdWFsaXR5IDogeydiJ2FkLCAnbSdlZGl1bSwgJ2cnb29kfVxuXHRcdFx0XHRcdCAqIGV2b2x1dGlvbiA6IHsndSdwLCAnZCdvd24sICdzJ3RhYmxlfVxuXHRcdFx0XHRcdCAqIGV2b2x1dGlvbiBxdWFsaXR5IDogeydiJ2V0dGVyLCAndydvcnNlLCAncydhbWV9XG5cdFx0XHRcdFx0ICovXG5cdFx0XHRcdFx0Ly8vIFRPRE9cblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0udHJlbmQgPSAnbXNzJztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdGRlYnVnKFwiTm8gRGF0YSB0byByZWFkIG9yIGhlYWRlciBpcyBtaXNzaW5nICFcIik7XG5cdFx0fVxuXHRcdC8qKiBsaXN0IHJvYm90cyAqKi9cblx0XHR0aGlzLmRhdGFNb2RlbD1kYXRhTW9kZWw7XG5cdFx0ZGVidWcoZGF0YU1vZGVsKTtcblx0XHRyZXR1cm4gZGF0YU1vZGVsO1xuXHR9O1xuXG5cblxuXHQvKiogY3JlYXRlIElFUSBzZXJ2aWNlICoqL1xuXHREaXlhU2VsZWN0b3IucHJvdG90eXBlLklFUSA9IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gbmV3IElFUSh0aGlzKTtcblx0fTtcbn0pKClcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4vKlxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuY29uc3QgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpKCdpZXE6dGltZWNvbnRyb2wnKTtcblxuJ3VzZSBzdHJpY3QnO1xuXG5cbi8qKlxuICogQ29udmVydCB0aW1lIHRvIG51bWJlciBvZiBtaWxsaXNlY29uZHMgYXMgdXNlZCBpbiBJRVEgQVBJXG4gKiBAcGFyYW0ge29iamVjdCxzdHJpbmcsZGF0ZSxudW1iZXJ9IHRpbWUgLSB0aW1lIHRvIGJlIGZvcm1hdHRlZFxuICogQHJldHVybiB7bnVtYmVyfSB0aW1lIC0gaW4gbXNcbiAqL1xubGV0IGZvcm1hdFRpbWUgPSBmdW5jdGlvbiAodGltZSkge1xuXHRyZXR1cm4gbmV3IERhdGUodGltZSkuZ2V0VGltZSgpO1xufTtcblxuLyoqXG4gKiBHZXQgdGltZSBzYW1wbGluZyBmcm9tIHRpbWUgcmFuZ2UuXG4gKiBTZXQgc2FtcGxpbmcgaXMgc3RydWN0dXJlIHByb3ZpZGVkIGluIHBhcmFtZXRlclxuICogQHBhcmFtIHtvYmplY3R9IHRpbWUgLSB0aW1lIGNyaXRlcmlhIGkuZS4gZGVmaW5pbmcgcmFuZ2VcbiAqIEBwYXJhbSB7bnVtYmVyfSBtYXhTYW1wbGVzIC0gbWF4IG51bWJlciBvZiBzYW1wbGVzIHRvIGJlIGRpc3BsYXllZFxuICogQHJldHVybiB7c3RyaW5nfSB0aW1lU2FtcGxpbmcgLSBjb21wdXRlZCB0aW1lU2FtcGxpbmdcbiAqL1xubGV0IGdldFRpbWVTYW1wbGluZyA9IGZ1bmN0aW9uICh0aW1lLCBtYXhTYW1wbGVzKSB7XG5cdC8vIGRvIG5vdGhpbmcgd2l0aG91dCB0aW1lIGJlaW5nIGRlZmluZWRcblx0aWYgKHRpbWUgPT0gbnVsbCkge1xuXHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdH1cblx0Ly8gZGVmYXVsdCBtYXhTYW1wbGVzXG5cdGlmIChtYXhTYW1wbGVzID09IG51bGwpIHtcblx0XHRtYXhTYW1wbGVzID0gMzAwO1xuXHR9XG5cblx0Ly8gYXNzdW1lIGRlZmF1bHQgdGltZS5yYW5nZSBpcyAxXG5cdGxldCByYW5nZSA9IHRpbWUucmFuZ2U7XG5cdGlmIChyYW5nZSA9PSBudWxsKSB7XG5cdFx0cmFuZ2UgPSAxO1xuXHR9XG5cblx0Ly8gcmFuZ2UgdW5pdCB0byBzZWNvbmRzXG5cdGxldCB0aW1lSW5TZWNvbmRzID0ge1xuXHRcdFwic2Vjb25kXCI6IDEsXG5cdFx0XCJtaW51dGVcIjogNjAsXG5cdFx0XCJob3VyXCI6IDM2MDAsXG5cdFx0XCJkYXlcIjogMjQgKiAzNjAwLFxuXHRcdFwid2Vla1wiOiA3ICogMjQgKiAzNjAwLFxuXHRcdFwibW9udGhcIjogMzAgKiAyNCAqIDM2MDAsXG5cdFx0XCJ5ZWFyXCI6IDM2NSAqIDI0ICogMzYwMFxuXHR9O1xuXG5cdC8vIG9yZGVyZWQgdGltZSB0aHJlc2hvbGRzXG5cdGxldCBzYW1wbGluZ1RocmVzaG9sZHMgPSBbXG5cdFx0e3RocmVzaDogbWF4U2FtcGxlcywgc2FtcGxpbmc6IFwiU2Vjb25kXCJ9LFxuXHRcdHt0aHJlc2g6IG1heFNhbXBsZXMqNjAsIHNhbXBsaW5nOiBcIk1pbnV0ZVwifSxcblx0XHR7dGhyZXNoOiBtYXhTYW1wbGVzKjM2MDAsIHNhbXBsaW5nOiBcIkhvdXJcIn0sXG5cdFx0e3RocmVzaDogbWF4U2FtcGxlcyoyNCozNjAwLCBzYW1wbGluZzogXCJEYXlcIn0sXG5cdFx0e3RocmVzaDogbWF4U2FtcGxlcyo3KjI0KjM2MDAsIHNhbXBsaW5nOiBcIldlZWtcIn0sXG5cdFx0e3RocmVzaDogbWF4U2FtcGxlcyozMCoyNCozNjAwLCBzYW1wbGluZzogXCJNb250aFwifVxuXHRdO1xuXG5cdGxldCB0aW1lVW5pdCA9IHRpbWUucmFuZ2VVbml0LnRvTG93ZXJDYXNlKCk7XG5cdGxldCBsYXN0ID0gdGltZVVuaXQubGVuZ3RoLTE7XG5cdC8vIHJlbW92ZSB0cmFpbGluZyAncydcblx0aWYgKHRpbWVVbml0W2xhc3RdID09PSAncycpIHtcblx0XHR0aW1lVW5pdCA9IHRpbWVVbml0LnNsaWNlKDAsIGxhc3QpO1xuXHR9XG5cblx0bGV0IHRpbWVJblNlYyA9IHJhbmdlICogdGltZUluU2Vjb25kc1t0aW1lVW5pdF07XG5cdGRlYnVnKFwidGltZUluU2VjOiBcIiArIHRpbWVJblNlYyk7XG5cblx0bGV0IHRpbWVTYW1wbGluZyA9IFwiWWVhclwiOyAvLyBkZWZhdWx0IHNhbXBsaW5nXG5cdC8vIGZpbmQgc21hbGxlc3QgdGhyZXNob2xkIGFib3ZlIHRpbWVTZWMgdG8gZGV0ZXJtaW5lIHNhbXBsaW5nXG5cdHNhbXBsaW5nVGhyZXNob2xkcy5maW5kKCBzYW1wbGluZ1RocmVzaG9sZCA9PiB7XG5cdFx0Ly8gdXBkYXRlIHNhbXBsaW5nIHVudGlsIGZpcnN0IHRocmVzaG9sZCBhYm92ZSB0aW1lU2VjXG5cdFx0dGltZVNhbXBsaW5nID0gc2FtcGxpbmdUaHJlc2hvbGQuc2FtcGxpbmc7XG5cdFx0cmV0dXJuIHRpbWVJblNlYyA8IHNhbXBsaW5nVGhyZXNob2xkLnRocmVzaDtcblx0fSk7XG5cblx0ZGVidWcodGltZVNhbXBsaW5nKTtcblx0cmV0dXJuIHRpbWVTYW1wbGluZztcbn1cblxuLy8gZXhwb3J0IGZ1bmN0aW9uc1xubW9kdWxlLmV4cG9ydHMgPSB7XG5cdGZvcm1hdFRpbWU6IGZvcm1hdFRpbWUsXG5cdGdldFRpbWVTYW1wbGluZzogZ2V0VGltZVNhbXBsaW5nXG59O1xuIiwiY29uc3QgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRlbWl0dGVyMycpO1xuY29uc3QgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpKCdpZXE6d2F0Y2hlcicpO1xuY29uc3QgZGVidWdFcnJvciA9IHJlcXVpcmUoJ2RlYnVnJykoJ2llcTp3YXRjaGVyOmVycm9ycycpO1xuY29uc3QgZ2V0VGltZVNhbXBsaW5nID0gcmVxdWlyZSgnLi90aW1lY29udHJvbC5qcycpLmdldFRpbWVTYW1wbGluZztcblxuLy8gaW1wb3J0IFByb21pc2VcbmxldCBQcm9taXNlID0gbnVsbDtcbmlmKCB3aW5kb3cgIT0gbnVsbCApICBQcm9taXNlID0gd2luZG93LlByb21pc2U7XG5lbHNlICBQcm9taXNlID0gcmVxdWlyZSgnYmx1ZWJpcmQnKTtcblxuJ3VzZSBzdHJpY3QnO1xuXG5jbGFzcyBTdG9wQ29uZGl0aW9uIGV4dGVuZHMgRXJyb3Ige1xuXHRjb25zdHJ1Y3Rvcihtc2cpIHtzdXBlcihtc2cpO3RoaXMubmFtZT0nU3RvcENvbmRpdGlvbid9XG59O1xuXG4vLyBkZWZhdWx0IGFuZCBtYXggbnVtYmVyIG9mIHNhbXBsZXMgZm9yIHRoZSBwcm92aWRlZCB0aW1lIHJhbmdlXG5sZXQgTUFYU0FNUExJTkcgPSAzMDA7XG5cbmNsYXNzIFdhdGNoZXIgZXh0ZW5kcyBFdmVudEVtaXR0ZXJ7XG5cdC8qKlxuXHQgKiBAcGFyYW0gZW1pdCBlbWl0IGRhdGEgKG1hbmRhdG9yeSlcblx0ICogQHBhcmFtIGNvbmZpZyB0byBnZXQgZGF0YSBmcm9tIHNlcnZlclxuXHQgKi9cblx0Y29uc3RydWN0b3IgKHNlbGVjdG9yLCBfY29uZmlnKSB7XG5cdFx0c3VwZXIoKTtcblxuXHRcdHRoaXMuc2VsZWN0b3IgPSBzZWxlY3Rvcjtcblx0XHR0aGlzLnN0YXRlID0gJ3J1bm5pbmcnO1xuXG5cdFx0dGhpcy5yZWNvbm5lY3Rpb25QZXJpb2QgPSAwOyAvLyBpbml0aWFsIHBlcmlvZCBiZXR3ZWVuIHJlY29ubmVjdGlvbnNcblx0XHR0aGlzLm1heFJlY29ubmVjdGlvblBlcmlvZCA9IDMwMDAwMDsgLy8gbWF4IDUgbWluXG5cblx0XHQvKiogaW5pdGlhbGlzZSBvcHRpb25zIGZvciByZXF1ZXN0ICoqL1xuXHRcdGxldCBvcHRpb25zID0ge1xuXHRcdFx0Y3JpdGVyaWE6IHtcblx0XHRcdFx0dGltZToge31cblx0XHRcdH0sXG5cdFx0XHRvcGVyYXRvcnM6IFsnYXZnJywgJ21pbicsICdtYXgnLCAnc3RkZGV2J11cblx0XHR9O1xuXHRcdGlmIChfY29uZmlnLnJvYm90cyBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdFx0XHRvcHRpb25zLmNyaXRlcmlhLnJvYm90cyA9IF9jb25maWcucm9ib3RzO1xuXHRcdH1cblx0XHRpZiAoX2NvbmZpZy50aW1lUmFuZ2UgIT0gbnVsbCAmJiB0eXBlb2YgX2NvbmZpZy50aW1lUmFuZ2UgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRvcHRpb25zLmNyaXRlcmlhLnRpbWUucmFuZ2VVbml0ID0gX2NvbmZpZy50aW1lUmFuZ2U7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG9wdGlvbnMuY3JpdGVyaWEudGltZS5yYW5nZVVuaXQgPSAnaG91cnMnO1xuXHRcdH1cblx0XHRpZiAoX2NvbmZpZy5jYXRlZ29yeSAhPSBudWxsICYmIHR5cGVvZiBfY29uZmlnLmNhdGVnb3J5ID09PSAnc3RyaW5nJykge1xuXHRcdFx0b3B0aW9ucy5jYXRlZ29yeSA9IF9jb25maWcuY2F0ZWdvcnk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG9wdGlvbnMuY2F0ZWdvcnkgPSAnaWVxJztcblx0XHR9XG5cdFx0aWYgKF9jb25maWcuc2FtcGxpbmcgIT0gbnVsbCAmJiB0eXBlb2YgX2NvbmZpZy5zYW1wbGluZyA9PT0gJ251bWJlcicpIHtcblx0XHRcdG9wdGlvbnMuc2FtcGxpbmcgPSBfY29uZmlnLnNhbXBsaW5nO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRvcHRpb25zLnNhbXBsaW5nID0gTUFYU0FNUExJTkc7XG5cdFx0fVxuXHRcdGlmIChvcHRpb25zLnNhbXBsaW5nID4gTUFYU0FNUExJTkcpIHtcblx0XHRcdG9wdGlvbnMuc2FtcGxpbmcgPSAzMDA7XG5cdFx0fVxuXHRcdG9wdGlvbnMuY3JpdGVyaWEudGltZS5zYW1wbGluZyA9IGdldFRpbWVTYW1wbGluZyhvcHRpb25zLmNyaXRlcmlhLnRpbWUsIG9wdGlvbnMuc2FtcGxpbmcpO1xuXG5cdFx0dGhpcy5vcHRpb25zID0gb3B0aW9ucztcblx0XHRkZWJ1ZyhvcHRpb25zKTtcblxuXHRcdHRoaXMud2F0Y2gob3B0aW9ucyk7IC8vIHN0YXJ0IHdhdGNoZXJcblx0fVxuXG5cdHdhdGNoIChvcHRpb25zKSB7XG5cdFx0ZGVidWcoJ2luIHdhdGNoJyk7XG5cdFx0bmV3IFByb21pc2UoIChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdC8vIFJlcXVlc3QgaGlzdG9yeSBkYXRhIGJlZm9yZSBzdWJzY3JpYmluZ1xuXHRcdFx0dGhpcy5zZWxlY3Rvci5yZXF1ZXN0KHtcblx0XHRcdFx0c2VydmljZTogXCJpZXFcIixcblx0XHRcdFx0ZnVuYzogXCJEYXRhUmVxdWVzdFwiLFxuXHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0ZGF0YTogSlNPTi5zdHJpbmdpZnkob3B0aW9ucylcblx0XHRcdFx0fSxcblx0XHRcdFx0b2JqOntcblx0XHRcdFx0XHRwYXRoOiAnL2ZyL3BhcnRuZXJpbmcvSWVxJyxcblx0XHRcdFx0XHRpbnRlcmZhY2U6IFwiZnIucGFydG5lcmluZy5JZXFcIlxuXHRcdFx0XHR9XG5cdFx0XHR9LCAoZG5JZCwgZXJyLCBkYXRhU3RyaW5nKSA9PiB7XG5cdFx0XHRcdGlmIChlcnIgIT0gbnVsbCkgIHtcblx0XHRcdFx0XHRyZWplY3QoZXJyKTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKHRoaXMuc3RhdGUgPT09ICdzdG9wcGVkJykge1xuXHRcdFx0XHRcdHJlamVjdChuZXcgU3RvcENvbmRpdGlvbigpKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRkZWJ1ZygnUmVxdWVzdDplbWl0RGF0YScpO1xuXHRcdFx0XHRsZXQgZGF0YSA9IEpTT04ucGFyc2UoZGF0YVN0cmluZyk7XG5cdFx0XHRcdHRoaXMuZW1pdCgnZGF0YScsIGRhdGEpO1xuXHRcdFx0XHRyZXNvbHZlKCk7XG5cdFx0XHR9KVxuXHRcdH0pXG5cdFx0XHQudGhlbiggXyA9PiB7XG5cdFx0XHRcdC8vIHN1YnNjcmliZSB0byBzaWduYWxcblx0XHRcdFx0ZGVidWcoJ1N1YnNjcmliaW5nJyk7XG5cdFx0XHRcdHJldHVybiBuZXcgUHJvbWlzZSAoIChyZXNvbHZlLCByZWplY3QpID0+ICB7XG5cdFx0XHRcdFx0dGhpcy5zdWJzY3JpcHRpb24gPSB0aGlzLnNlbGVjdG9yLnN1YnNjcmliZSh7XG5cdFx0XHRcdFx0XHRzZXJ2aWNlOiBcImllcVwiLFxuXHRcdFx0XHRcdFx0ZnVuYzogb3B0aW9ucy5jcml0ZXJpYS50aW1lLnNhbXBsaW5nLFxuXHRcdFx0XHRcdFx0ZGF0YToge2RhdGE6IG9wdGlvbnN9LFxuXHRcdFx0XHRcdFx0b2JqOntcblx0XHRcdFx0XHRcdFx0cGF0aDogJy9mci9wYXJ0bmVyaW5nL0llcScsXG5cdFx0XHRcdFx0XHRcdGludGVyZmFjZTogXCJmci5wYXJ0bmVyaW5nLkllcVwiXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSwgKGRuZCwgZXJyLCBkYXRhKSA9PiB7XG5cdFx0XHRcdFx0XHRpZiAoZXJyICE9IG51bGwpIHtcblx0XHRcdFx0XHRcdFx0cmVqZWN0KGVycik7XG5cdFx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGRlYnVnKCdTaWduYWw6ZW1pdERhdGEnKTtcblx0XHRcdFx0XHRcdGRhdGEgPSBKU09OLnBhcnNlKGRhdGEpO1xuXHRcdFx0XHRcdFx0dGhpcy5lbWl0KCdkYXRhJywgZGF0YSk7XG5cblx0XHRcdFx0XHRcdHRoaXMucmVjb25uZWN0aW9uUGVyaW9kPTA7IC8vIHJlc2V0IHBlcmlvZCBvbiBzdWJzY3JpcHRpb24gcmVxdWVzdHNcblx0XHRcdFx0XHRcdHJlc29sdmUoKTtcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9KVxuXHRcdFx0fSlcblx0XHRcdC5jYXRjaCggZXJyID0+IHtcblx0XHRcdFx0aWYgKGVyci5uYW1lID09PSAnU3RvcENvbmRpdGlvbicpIHsgLy8gd2F0Y2hlciBzdG9wcGVkIDogZG8gbm90aGluZ1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyB0cnkgdG8gcmVzdGFydCBsYXRlclxuXHRcdFx0XHRkZWJ1Z0Vycm9yKFwiV2F0Y2hJRVFSZWN2RXJyOlwiLCBlcnIpO1xuXHRcdFx0XHR0aGlzLl9jbG9zZVN1YnNjcmlwdGlvbigpOyAvLyBzaG91bGQgbm90IGJlIG5lY2Vzc2FyeVxuXHRcdFx0XHR0aGlzLnJlY29ubmVjdGlvblBlcmlvZCA9IHRoaXMucmVjb25uZWN0aW9uUGVyaW9kKzEwMDA7IC8vIGluY3JlYXNlIGRlbGF5IGJ5IDEgc2VjXG5cdFx0XHRcdGlmICh0aGlzLnJlY29ubmVjdGlvblBlcmlvZCA+IHRoaXMubWF4UmVjb25uZWN0aW9uUGVyaW9kKSB7XG5cdFx0XHRcdFx0dGhpcy5yZWNvbm5lY3Rpb25QZXJpb2Q9dGhpcy5tYXhSZWNvbm5lY3Rpb25QZXJpb2Q7IC8vIG1heCA1bWluXG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy53YXRjaFRlbnRhdGl2ZSA9IHNldFRpbWVvdXQoIF8gPT4ge1xuXHRcdFx0XHRcdHRoaXMud2F0Y2gob3B0aW9ucyk7XG5cdFx0XHRcdH0sIHRoaXMucmVjb25uZWN0aW9uUGVyaW9kKTsgLy8gdHJ5IGFnYWluIGxhdGVyXG5cdFx0XHR9KTtcblxuXHR9XG5cblx0Ly8gQ2xvc2Ugc3Vic2NyaXB0aW9uIGlmIGFueVxuXHRfY2xvc2VTdWJzY3JpcHRpb24gKCkge1xuXHRcdGRlYnVnKCdJbiBjbG9zZVN1YnNjcmlwdGlvbicpO1xuXHRcdGlmICh0aGlzLnN1YnNjcmlwdGlvbiAhPSBudWxsKSB7XG5cdFx0XHR0aGlzLnN1YnNjcmlwdGlvbi5jbG9zZSgpO1xuXHRcdFx0dGhpcy5zdWJzY3JpcHRpb24gPSBudWxsO1xuXHRcdH1cblx0fVxuXG5cdHN0b3AgKCkge1xuXHRcdGRlYnVnKCdJbiBzdG9wJyk7XG5cdFx0dGhpcy5zdGF0ZSA9ICdzdG9wcGVkJztcblx0XHRpZiAodGhpcy53YXRjaFRlbnRhdGl2ZSAhPSBudWxsKSB7XG5cdFx0XHRjbGVhclRpbWVvdXQodGhpcy53YXRjaFRlbnRhdGl2ZSk7XG5cdFx0fVxuXHRcdHRoaXMuX2Nsb3NlU3Vic2NyaXB0aW9uKCk7XG5cdFx0dGhpcy5lbWl0KCdzdG9wJyk7XG5cdFx0dGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoKTtcblx0fVxuXG59XG5cbm1vZHVsZS5leHBvcnRzID0gV2F0Y2hlcjtcbiJdfQ==
