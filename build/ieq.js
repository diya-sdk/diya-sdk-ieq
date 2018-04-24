(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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
	var debug = require('debug')('ieq');
	var util = require('util');
	var Watcher = require('./watcher.js');
	var formatTime = require('./timecontrol.js').formatTime;

	var DiyaSelector = void 0;
	try {
		// For browsers - d1 already defined
		DiyaSelector = d1.DiyaSelector;
	} catch (error) {
		if (error.name === 'ReferenceError') {
			// For nodejs - define d1
			var _d = require('diya-sdk');
			DiyaSelector = _d.DiyaSelector;
		} else {
			throw error;
		}
	}

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
  	   time: all 3 time criteria should not be defined at the same time. (range would be given up) [Usage : start + end, or start + range, or end + range]
  	     start: {[null],time} (null means most recent) // stored a UTC in ms (num)
  	     end: {[null], time} (null means most oldest) // stored as UTC in ms (num)
  	     range: {[null], time} (range of time(positive) ) // in s (num)
  	     sampling: {[null] or String} it could be "second", "minute", "week", "month", "year" - maximized server side to 10k samples by security
  	   robots: {ArrayOf ID or ["all"]}
  	   places: {ArrayOf ID or ["all"]}
  	 operator: {[last], max, moy, sd} - deprecated
  	 ...
  		 sensors : {[null] or ArrayOf SensorName}
  */
		this.dataConfig = {
			criteria: {
				time: {
					start: null,
					end: null,
					range: null // in s
				},
				robots: null,
				places: null
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
  *			robots:[FLOAT, ...],
  *			places:[FLOAT, ...],
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
  * Set robots criteria.
  *	@param {Array[Int]} robotIds list of robots Ids
  * Get robots criteria.
  *	@return {Array[Int]} list of robots Ids
  */
	IEQ.prototype.DataRobotIds = function (robotIds) {
		if (robotIds != null) {
			this.dataConfig.criteria.robots = robotIds;
			return this;
		} else {
			return this.dataConfig.criteria.robots;
		}
	};
	/**
  * Depends on placeIds
  * Set places criteria.
  *	@param {Array[Int]} placeIds list of places Ids
  * Get places criteria.
  *	@return {Array[Int]} list of places Ids
  */
	IEQ.prototype.DataPlaceIds = function (placeIds) {
		if (placeIds != null) {
			this.dataConfig.criteria.placeId = placeIds;
			return this;
		} else return this.dataConfig.criteria.places;
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
		if (csvConfig && typeof csvConfig.lang != "string") csvConfig.lang = undefined;

		var dataConfig = JSON.stringify({
			criteria: {
				time: { start: formatTime(csvConfig.startTime), end: formatTime(csvConfig.endTime), sampling: csvConfig.timeSample },
				places: [],
				robots: []
			},
			sensors: csvConfig.sensorNames,
			sampling: csvConfig.nlines,
			lang: csvConfig.lang
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
		console.warn('This function will be deprecated. Please use "getIeqData" instead.');
		this.getIeqData(dataConfig, callback);
	};

	/**
  * Request Ieq Data (used for example to make heatmap)
   * @param {Object} dataConfig config for data request
   * @param {callback} callback: called after update
   */
	IEQ.prototype.getIeqData = function (dataConfig, callback) {
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
		console.warn('This function will be deprecated. Please use "getIeqData" instead.');
		// this.getDataMapData(dataConfig, callback)
		this.getIeqData(dataConfig, callback);
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
					/* update data id */
					dataModel[n].id = n;
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
						indexRange: data[n].indexRange
					};
					dataModel[n].time = this._coder.from(data[n].time, 'b64', 8);
					dataModel[n].data = data[n].data != null ? this._coder.from(data[n].data, 'b64', 4) : data[n].avg != null ? this._coder.from(data[n].avg.d, 'b64', 4) : null;
					dataModel[n].qualityIndex = data[n].data != null ? this._coder.from(data[n].index, 'b64', 4) : data[n].avg != null ? this._coder.from(data[n].avg.i, 'b64', 4) : null;
					dataModel[n].robotId = this._coder.from(data[n].robotId, 'b64', 4);
					if (dataModel[n].robotId != null) {
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

					if (data[n].avg != null) dataModel[n].avg = {
						d: this._coder.from(data[n].avg.d, 'b64', 4),
						i: this._coder.from(data[n].avg.i, 'b64', 4)
					};
					if (data[n].min != null) dataModel[n].min = {
						d: this._coder.from(data[n].min.d, 'b64', 4),
						i: this._coder.from(data[n].min.i, 'b64', 4)
					};
					if (data[n].max != null) dataModel[n].max = {
						d: this._coder.from(data[n].max.d, 'b64', 4),
						i: this._coder.from(data[n].max.i, 'b64', 4)
					};
					if (data[n].stddev != null) dataModel[n].stddev = {
						d: this._coder.from(data[n].stddev.d, 'b64', 4),
						i: this._coder.from(data[n].stddev.i, 'b64', 4)
					};
					if (data[n].stddev != null) dataModel[n].stddev = {
						d: this._coder.from(data[n].stddev.d, 'b64', 4),
						i: this._coder.from(data[n].stddev.i, 'b64', 4)
					};
					if (data[n].x != null) dataModel[n].x = this._coder.from(data[n].x, 'b64', 4);
					if (data[n].y != null) dataModel[n].y = this._coder.from(data[n].y, 'b64', 4);
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

},{"./timecontrol.js":10,"./watcher.js":11,"debug":1,"diya-sdk":undefined,"util":8}],10:[function(require,module,exports){
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
try {
	if (window != null) {
		Promise = window.Promise;
	} else {
		Promise = require('bluebird');
	}
} catch (e) {
	debug(e);
	Promise = require('bluebird');
}

'use strict';

var StopCondition = function (_Error) {
	_inherits(StopCondition, _Error);

	function StopCondition(msg) {
		_classCallCheck(this, StopCondition);

		var _this = _possibleConstructorReturn(this, (StopCondition.__proto__ || Object.getPrototypeOf(StopCondition)).call(this, msg));

		_this.name = 'StopCondition';
		return _this;
	}

	return StopCondition;
}(Error);

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
			if (_config.robots.length > 0) {
				debug('Selection of robot is not implemented yet');
			}
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZGVidWcvc3JjL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvZGVidWcvc3JjL2RlYnVnLmpzIiwibm9kZV9tb2R1bGVzL2V2ZW50ZW1pdHRlcjMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbXMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3V0aWwvbm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvdXRpbC9zdXBwb3J0L2lzQnVmZmVyQnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy91dGlsL3V0aWwuanMiLCJzcmMvaWVxLmpzIiwic3JjL3RpbWVjb250cm9sLmpzIiwic3JjL3dhdGNoZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDekxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMU1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2VEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7QUMxa0JBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQXdCQTs7Ozs7Ozs7Ozs7OztBQWNBLENBQUMsWUFBWTtBQUNaLEtBQU0sUUFBUSxRQUFRLE9BQVIsRUFBaUIsS0FBakIsQ0FBZDtBQUNBLEtBQUksT0FBTyxRQUFRLE1BQVIsQ0FBWDtBQUNBLEtBQUksVUFBVSxRQUFRLGNBQVIsQ0FBZDtBQUNBLEtBQUksYUFBYSxRQUFRLGtCQUFSLEVBQTRCLFVBQTdDOztBQUVBLEtBQUkscUJBQUo7QUFDQSxLQUFJO0FBQ0g7QUFDQSxpQkFBZSxHQUFH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KGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIi8qKlxuICogVGhpcyBpcyB0aGUgd2ViIGJyb3dzZXIgaW1wbGVtZW50YXRpb24gb2YgYGRlYnVnKClgLlxuICpcbiAqIEV4cG9zZSBgZGVidWcoKWAgYXMgdGhlIG1vZHVsZS5cbiAqL1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2RlYnVnJyk7XG5leHBvcnRzLmxvZyA9IGxvZztcbmV4cG9ydHMuZm9ybWF0QXJncyA9IGZvcm1hdEFyZ3M7XG5leHBvcnRzLnNhdmUgPSBzYXZlO1xuZXhwb3J0cy5sb2FkID0gbG9hZDtcbmV4cG9ydHMudXNlQ29sb3JzID0gdXNlQ29sb3JzO1xuZXhwb3J0cy5zdG9yYWdlID0gJ3VuZGVmaW5lZCcgIT0gdHlwZW9mIGNocm9tZVxuICAgICAgICAgICAgICAgJiYgJ3VuZGVmaW5lZCcgIT0gdHlwZW9mIGNocm9tZS5zdG9yYWdlXG4gICAgICAgICAgICAgICAgICA/IGNocm9tZS5zdG9yYWdlLmxvY2FsXG4gICAgICAgICAgICAgICAgICA6IGxvY2Fsc3RvcmFnZSgpO1xuXG4vKipcbiAqIENvbG9ycy5cbiAqL1xuXG5leHBvcnRzLmNvbG9ycyA9IFtcbiAgJ2xpZ2h0c2VhZ3JlZW4nLFxuICAnZm9yZXN0Z3JlZW4nLFxuICAnZ29sZGVucm9kJyxcbiAgJ2RvZGdlcmJsdWUnLFxuICAnZGFya29yY2hpZCcsXG4gICdjcmltc29uJ1xuXTtcblxuLyoqXG4gKiBDdXJyZW50bHkgb25seSBXZWJLaXQtYmFzZWQgV2ViIEluc3BlY3RvcnMsIEZpcmVmb3ggPj0gdjMxLFxuICogYW5kIHRoZSBGaXJlYnVnIGV4dGVuc2lvbiAoYW55IEZpcmVmb3ggdmVyc2lvbikgYXJlIGtub3duXG4gKiB0byBzdXBwb3J0IFwiJWNcIiBDU1MgY3VzdG9taXphdGlvbnMuXG4gKlxuICogVE9ETzogYWRkIGEgYGxvY2FsU3RvcmFnZWAgdmFyaWFibGUgdG8gZXhwbGljaXRseSBlbmFibGUvZGlzYWJsZSBjb2xvcnNcbiAqL1xuXG5mdW5jdGlvbiB1c2VDb2xvcnMoKSB7XG4gIC8vIE5COiBJbiBhbiBFbGVjdHJvbiBwcmVsb2FkIHNjcmlwdCwgZG9jdW1lbnQgd2lsbCBiZSBkZWZpbmVkIGJ1dCBub3QgZnVsbHlcbiAgLy8gaW5pdGlhbGl6ZWQuIFNpbmNlIHdlIGtub3cgd2UncmUgaW4gQ2hyb21lLCB3ZSdsbCBqdXN0IGRldGVjdCB0aGlzIGNhc2VcbiAgLy8gZXhwbGljaXRseVxuICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LnByb2Nlc3MgJiYgd2luZG93LnByb2Nlc3MudHlwZSA9PT0gJ3JlbmRlcmVyJykge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gaXMgd2Via2l0PyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8xNjQ1OTYwNi8zNzY3NzNcbiAgLy8gZG9jdW1lbnQgaXMgdW5kZWZpbmVkIGluIHJlYWN0LW5hdGl2ZTogaHR0cHM6Ly9naXRodWIuY29tL2ZhY2Vib29rL3JlYWN0LW5hdGl2ZS9wdWxsLzE2MzJcbiAgcmV0dXJuICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnICYmIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCAmJiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUgJiYgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLldlYmtpdEFwcGVhcmFuY2UpIHx8XG4gICAgLy8gaXMgZmlyZWJ1Zz8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMzk4MTIwLzM3Njc3M1xuICAgICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuY29uc29sZSAmJiAod2luZG93LmNvbnNvbGUuZmlyZWJ1ZyB8fCAod2luZG93LmNvbnNvbGUuZXhjZXB0aW9uICYmIHdpbmRvdy5jb25zb2xlLnRhYmxlKSkpIHx8XG4gICAgLy8gaXMgZmlyZWZveCA+PSB2MzE/XG4gICAgLy8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9Ub29scy9XZWJfQ29uc29sZSNTdHlsaW5nX21lc3NhZ2VzXG4gICAgKHR5cGVvZiBuYXZpZ2F0b3IgIT09ICd1bmRlZmluZWQnICYmIG5hdmlnYXRvci51c2VyQWdlbnQgJiYgbmF2aWdhdG9yLnVzZXJBZ2VudC50b0xvd2VyQ2FzZSgpLm1hdGNoKC9maXJlZm94XFwvKFxcZCspLykgJiYgcGFyc2VJbnQoUmVnRXhwLiQxLCAxMCkgPj0gMzEpIHx8XG4gICAgLy8gZG91YmxlIGNoZWNrIHdlYmtpdCBpbiB1c2VyQWdlbnQganVzdCBpbiBjYXNlIHdlIGFyZSBpbiBhIHdvcmtlclxuICAgICh0eXBlb2YgbmF2aWdhdG9yICE9PSAndW5kZWZpbmVkJyAmJiBuYXZpZ2F0b3IudXNlckFnZW50ICYmIG5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKS5tYXRjaCgvYXBwbGV3ZWJraXRcXC8oXFxkKykvKSk7XG59XG5cbi8qKlxuICogTWFwICVqIHRvIGBKU09OLnN0cmluZ2lmeSgpYCwgc2luY2Ugbm8gV2ViIEluc3BlY3RvcnMgZG8gdGhhdCBieSBkZWZhdWx0LlxuICovXG5cbmV4cG9ydHMuZm9ybWF0dGVycy5qID0gZnVuY3Rpb24odikge1xuICB0cnkge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSh2KTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgcmV0dXJuICdbVW5leHBlY3RlZEpTT05QYXJzZUVycm9yXTogJyArIGVyci5tZXNzYWdlO1xuICB9XG59O1xuXG5cbi8qKlxuICogQ29sb3JpemUgbG9nIGFyZ3VtZW50cyBpZiBlbmFibGVkLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZm9ybWF0QXJncyhhcmdzKSB7XG4gIHZhciB1c2VDb2xvcnMgPSB0aGlzLnVzZUNvbG9ycztcblxuICBhcmdzWzBdID0gKHVzZUNvbG9ycyA/ICclYycgOiAnJylcbiAgICArIHRoaXMubmFtZXNwYWNlXG4gICAgKyAodXNlQ29sb3JzID8gJyAlYycgOiAnICcpXG4gICAgKyBhcmdzWzBdXG4gICAgKyAodXNlQ29sb3JzID8gJyVjICcgOiAnICcpXG4gICAgKyAnKycgKyBleHBvcnRzLmh1bWFuaXplKHRoaXMuZGlmZik7XG5cbiAgaWYgKCF1c2VDb2xvcnMpIHJldHVybjtcblxuICB2YXIgYyA9ICdjb2xvcjogJyArIHRoaXMuY29sb3I7XG4gIGFyZ3Muc3BsaWNlKDEsIDAsIGMsICdjb2xvcjogaW5oZXJpdCcpXG5cbiAgLy8gdGhlIGZpbmFsIFwiJWNcIiBpcyBzb21ld2hhdCB0cmlja3ksIGJlY2F1c2UgdGhlcmUgY291bGQgYmUgb3RoZXJcbiAgLy8gYXJndW1lbnRzIHBhc3NlZCBlaXRoZXIgYmVmb3JlIG9yIGFmdGVyIHRoZSAlYywgc28gd2UgbmVlZCB0b1xuICAvLyBmaWd1cmUgb3V0IHRoZSBjb3JyZWN0IGluZGV4IHRvIGluc2VydCB0aGUgQ1NTIGludG9cbiAgdmFyIGluZGV4ID0gMDtcbiAgdmFyIGxhc3RDID0gMDtcbiAgYXJnc1swXS5yZXBsYWNlKC8lW2EtekEtWiVdL2csIGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgaWYgKCclJScgPT09IG1hdGNoKSByZXR1cm47XG4gICAgaW5kZXgrKztcbiAgICBpZiAoJyVjJyA9PT0gbWF0Y2gpIHtcbiAgICAgIC8vIHdlIG9ubHkgYXJlIGludGVyZXN0ZWQgaW4gdGhlICpsYXN0KiAlY1xuICAgICAgLy8gKHRoZSB1c2VyIG1heSBoYXZlIHByb3ZpZGVkIHRoZWlyIG93bilcbiAgICAgIGxhc3RDID0gaW5kZXg7XG4gICAgfVxuICB9KTtcblxuICBhcmdzLnNwbGljZShsYXN0QywgMCwgYyk7XG59XG5cbi8qKlxuICogSW52b2tlcyBgY29uc29sZS5sb2coKWAgd2hlbiBhdmFpbGFibGUuXG4gKiBOby1vcCB3aGVuIGBjb25zb2xlLmxvZ2AgaXMgbm90IGEgXCJmdW5jdGlvblwiLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gbG9nKCkge1xuICAvLyB0aGlzIGhhY2tlcnkgaXMgcmVxdWlyZWQgZm9yIElFOC85LCB3aGVyZVxuICAvLyB0aGUgYGNvbnNvbGUubG9nYCBmdW5jdGlvbiBkb2Vzbid0IGhhdmUgJ2FwcGx5J1xuICByZXR1cm4gJ29iamVjdCcgPT09IHR5cGVvZiBjb25zb2xlXG4gICAgJiYgY29uc29sZS5sb2dcbiAgICAmJiBGdW5jdGlvbi5wcm90b3R5cGUuYXBwbHkuY2FsbChjb25zb2xlLmxvZywgY29uc29sZSwgYXJndW1lbnRzKTtcbn1cblxuLyoqXG4gKiBTYXZlIGBuYW1lc3BhY2VzYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZXNwYWNlc1xuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gc2F2ZShuYW1lc3BhY2VzKSB7XG4gIHRyeSB7XG4gICAgaWYgKG51bGwgPT0gbmFtZXNwYWNlcykge1xuICAgICAgZXhwb3J0cy5zdG9yYWdlLnJlbW92ZUl0ZW0oJ2RlYnVnJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGV4cG9ydHMuc3RvcmFnZS5kZWJ1ZyA9IG5hbWVzcGFjZXM7XG4gICAgfVxuICB9IGNhdGNoKGUpIHt9XG59XG5cbi8qKlxuICogTG9hZCBgbmFtZXNwYWNlc2AuXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSByZXR1cm5zIHRoZSBwcmV2aW91c2x5IHBlcnNpc3RlZCBkZWJ1ZyBtb2Rlc1xuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gbG9hZCgpIHtcbiAgdmFyIHI7XG4gIHRyeSB7XG4gICAgciA9IGV4cG9ydHMuc3RvcmFnZS5kZWJ1ZztcbiAgfSBjYXRjaChlKSB7fVxuXG4gIC8vIElmIGRlYnVnIGlzbid0IHNldCBpbiBMUywgYW5kIHdlJ3JlIGluIEVsZWN0cm9uLCB0cnkgdG8gbG9hZCAkREVCVUdcbiAgaWYgKCFyICYmIHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiAnZW52JyBpbiBwcm9jZXNzKSB7XG4gICAgciA9IHByb2Nlc3MuZW52LkRFQlVHO1xuICB9XG5cbiAgcmV0dXJuIHI7XG59XG5cbi8qKlxuICogRW5hYmxlIG5hbWVzcGFjZXMgbGlzdGVkIGluIGBsb2NhbFN0b3JhZ2UuZGVidWdgIGluaXRpYWxseS5cbiAqL1xuXG5leHBvcnRzLmVuYWJsZShsb2FkKCkpO1xuXG4vKipcbiAqIExvY2Fsc3RvcmFnZSBhdHRlbXB0cyB0byByZXR1cm4gdGhlIGxvY2Fsc3RvcmFnZS5cbiAqXG4gKiBUaGlzIGlzIG5lY2Vzc2FyeSBiZWNhdXNlIHNhZmFyaSB0aHJvd3NcbiAqIHdoZW4gYSB1c2VyIGRpc2FibGVzIGNvb2tpZXMvbG9jYWxzdG9yYWdlXG4gKiBhbmQgeW91IGF0dGVtcHQgdG8gYWNjZXNzIGl0LlxuICpcbiAqIEByZXR1cm4ge0xvY2FsU3RvcmFnZX1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIGxvY2Fsc3RvcmFnZSgpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gd2luZG93LmxvY2FsU3RvcmFnZTtcbiAgfSBjYXRjaCAoZSkge31cbn1cbiIsIlxuLyoqXG4gKiBUaGlzIGlzIHRoZSBjb21tb24gbG9naWMgZm9yIGJvdGggdGhlIE5vZGUuanMgYW5kIHdlYiBicm93c2VyXG4gKiBpbXBsZW1lbnRhdGlvbnMgb2YgYGRlYnVnKClgLlxuICpcbiAqIEV4cG9zZSBgZGVidWcoKWAgYXMgdGhlIG1vZHVsZS5cbiAqL1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVEZWJ1Zy5kZWJ1ZyA9IGNyZWF0ZURlYnVnWydkZWZhdWx0J10gPSBjcmVhdGVEZWJ1ZztcbmV4cG9ydHMuY29lcmNlID0gY29lcmNlO1xuZXhwb3J0cy5kaXNhYmxlID0gZGlzYWJsZTtcbmV4cG9ydHMuZW5hYmxlID0gZW5hYmxlO1xuZXhwb3J0cy5lbmFibGVkID0gZW5hYmxlZDtcbmV4cG9ydHMuaHVtYW5pemUgPSByZXF1aXJlKCdtcycpO1xuXG4vKipcbiAqIFRoZSBjdXJyZW50bHkgYWN0aXZlIGRlYnVnIG1vZGUgbmFtZXMsIGFuZCBuYW1lcyB0byBza2lwLlxuICovXG5cbmV4cG9ydHMubmFtZXMgPSBbXTtcbmV4cG9ydHMuc2tpcHMgPSBbXTtcblxuLyoqXG4gKiBNYXAgb2Ygc3BlY2lhbCBcIiVuXCIgaGFuZGxpbmcgZnVuY3Rpb25zLCBmb3IgdGhlIGRlYnVnIFwiZm9ybWF0XCIgYXJndW1lbnQuXG4gKlxuICogVmFsaWQga2V5IG5hbWVzIGFyZSBhIHNpbmdsZSwgbG93ZXIgb3IgdXBwZXItY2FzZSBsZXR0ZXIsIGkuZS4gXCJuXCIgYW5kIFwiTlwiLlxuICovXG5cbmV4cG9ydHMuZm9ybWF0dGVycyA9IHt9O1xuXG4vKipcbiAqIFByZXZpb3VzIGxvZyB0aW1lc3RhbXAuXG4gKi9cblxudmFyIHByZXZUaW1lO1xuXG4vKipcbiAqIFNlbGVjdCBhIGNvbG9yLlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVzcGFjZVxuICogQHJldHVybiB7TnVtYmVyfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gc2VsZWN0Q29sb3IobmFtZXNwYWNlKSB7XG4gIHZhciBoYXNoID0gMCwgaTtcblxuICBmb3IgKGkgaW4gbmFtZXNwYWNlKSB7XG4gICAgaGFzaCAgPSAoKGhhc2ggPDwgNSkgLSBoYXNoKSArIG5hbWVzcGFjZS5jaGFyQ29kZUF0KGkpO1xuICAgIGhhc2ggfD0gMDsgLy8gQ29udmVydCB0byAzMmJpdCBpbnRlZ2VyXG4gIH1cblxuICByZXR1cm4gZXhwb3J0cy5jb2xvcnNbTWF0aC5hYnMoaGFzaCkgJSBleHBvcnRzLmNvbG9ycy5sZW5ndGhdO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIGRlYnVnZ2VyIHdpdGggdGhlIGdpdmVuIGBuYW1lc3BhY2VgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lc3BhY2VcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBjcmVhdGVEZWJ1ZyhuYW1lc3BhY2UpIHtcblxuICBmdW5jdGlvbiBkZWJ1ZygpIHtcbiAgICAvLyBkaXNhYmxlZD9cbiAgICBpZiAoIWRlYnVnLmVuYWJsZWQpIHJldHVybjtcblxuICAgIHZhciBzZWxmID0gZGVidWc7XG5cbiAgICAvLyBzZXQgYGRpZmZgIHRpbWVzdGFtcFxuICAgIHZhciBjdXJyID0gK25ldyBEYXRlKCk7XG4gICAgdmFyIG1zID0gY3VyciAtIChwcmV2VGltZSB8fCBjdXJyKTtcbiAgICBzZWxmLmRpZmYgPSBtcztcbiAgICBzZWxmLnByZXYgPSBwcmV2VGltZTtcbiAgICBzZWxmLmN1cnIgPSBjdXJyO1xuICAgIHByZXZUaW1lID0gY3VycjtcblxuICAgIC8vIHR1cm4gdGhlIGBhcmd1bWVudHNgIGludG8gYSBwcm9wZXIgQXJyYXlcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIGFyZ3NbaV0gPSBhcmd1bWVudHNbaV07XG4gICAgfVxuXG4gICAgYXJnc1swXSA9IGV4cG9ydHMuY29lcmNlKGFyZ3NbMF0pO1xuXG4gICAgaWYgKCdzdHJpbmcnICE9PSB0eXBlb2YgYXJnc1swXSkge1xuICAgICAgLy8gYW55dGhpbmcgZWxzZSBsZXQncyBpbnNwZWN0IHdpdGggJU9cbiAgICAgIGFyZ3MudW5zaGlmdCgnJU8nKTtcbiAgICB9XG5cbiAgICAvLyBhcHBseSBhbnkgYGZvcm1hdHRlcnNgIHRyYW5zZm9ybWF0aW9uc1xuICAgIHZhciBpbmRleCA9IDA7XG4gICAgYXJnc1swXSA9IGFyZ3NbMF0ucmVwbGFjZSgvJShbYS16QS1aJV0pL2csIGZ1bmN0aW9uKG1hdGNoLCBmb3JtYXQpIHtcbiAgICAgIC8vIGlmIHdlIGVuY291bnRlciBhbiBlc2NhcGVkICUgdGhlbiBkb24ndCBpbmNyZWFzZSB0aGUgYXJyYXkgaW5kZXhcbiAgICAgIGlmIChtYXRjaCA9PT0gJyUlJykgcmV0dXJuIG1hdGNoO1xuICAgICAgaW5kZXgrKztcbiAgICAgIHZhciBmb3JtYXR0ZXIgPSBleHBvcnRzLmZvcm1hdHRlcnNbZm9ybWF0XTtcbiAgICAgIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgZm9ybWF0dGVyKSB7XG4gICAgICAgIHZhciB2YWwgPSBhcmdzW2luZGV4XTtcbiAgICAgICAgbWF0Y2ggPSBmb3JtYXR0ZXIuY2FsbChzZWxmLCB2YWwpO1xuXG4gICAgICAgIC8vIG5vdyB3ZSBuZWVkIHRvIHJlbW92ZSBgYXJnc1tpbmRleF1gIHNpbmNlIGl0J3MgaW5saW5lZCBpbiB0aGUgYGZvcm1hdGBcbiAgICAgICAgYXJncy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICBpbmRleC0tO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG1hdGNoO1xuICAgIH0pO1xuXG4gICAgLy8gYXBwbHkgZW52LXNwZWNpZmljIGZvcm1hdHRpbmcgKGNvbG9ycywgZXRjLilcbiAgICBleHBvcnRzLmZvcm1hdEFyZ3MuY2FsbChzZWxmLCBhcmdzKTtcblxuICAgIHZhciBsb2dGbiA9IGRlYnVnLmxvZyB8fCBleHBvcnRzLmxvZyB8fCBjb25zb2xlLmxvZy5iaW5kKGNvbnNvbGUpO1xuICAgIGxvZ0ZuLmFwcGx5KHNlbGYsIGFyZ3MpO1xuICB9XG5cbiAgZGVidWcubmFtZXNwYWNlID0gbmFtZXNwYWNlO1xuICBkZWJ1Zy5lbmFibGVkID0gZXhwb3J0cy5lbmFibGVkKG5hbWVzcGFjZSk7XG4gIGRlYnVnLnVzZUNvbG9ycyA9IGV4cG9ydHMudXNlQ29sb3JzKCk7XG4gIGRlYnVnLmNvbG9yID0gc2VsZWN0Q29sb3IobmFtZXNwYWNlKTtcblxuICAvLyBlbnYtc3BlY2lmaWMgaW5pdGlhbGl6YXRpb24gbG9naWMgZm9yIGRlYnVnIGluc3RhbmNlc1xuICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGV4cG9ydHMuaW5pdCkge1xuICAgIGV4cG9ydHMuaW5pdChkZWJ1Zyk7XG4gIH1cblxuICByZXR1cm4gZGVidWc7XG59XG5cbi8qKlxuICogRW5hYmxlcyBhIGRlYnVnIG1vZGUgYnkgbmFtZXNwYWNlcy4gVGhpcyBjYW4gaW5jbHVkZSBtb2Rlc1xuICogc2VwYXJhdGVkIGJ5IGEgY29sb24gYW5kIHdpbGRjYXJkcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZXNwYWNlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBlbmFibGUobmFtZXNwYWNlcykge1xuICBleHBvcnRzLnNhdmUobmFtZXNwYWNlcyk7XG5cbiAgZXhwb3J0cy5uYW1lcyA9IFtdO1xuICBleHBvcnRzLnNraXBzID0gW107XG5cbiAgdmFyIHNwbGl0ID0gKHR5cGVvZiBuYW1lc3BhY2VzID09PSAnc3RyaW5nJyA/IG5hbWVzcGFjZXMgOiAnJykuc3BsaXQoL1tcXHMsXSsvKTtcbiAgdmFyIGxlbiA9IHNwbGl0Lmxlbmd0aDtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgaWYgKCFzcGxpdFtpXSkgY29udGludWU7IC8vIGlnbm9yZSBlbXB0eSBzdHJpbmdzXG4gICAgbmFtZXNwYWNlcyA9IHNwbGl0W2ldLnJlcGxhY2UoL1xcKi9nLCAnLio/Jyk7XG4gICAgaWYgKG5hbWVzcGFjZXNbMF0gPT09ICctJykge1xuICAgICAgZXhwb3J0cy5za2lwcy5wdXNoKG5ldyBSZWdFeHAoJ14nICsgbmFtZXNwYWNlcy5zdWJzdHIoMSkgKyAnJCcpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZXhwb3J0cy5uYW1lcy5wdXNoKG5ldyBSZWdFeHAoJ14nICsgbmFtZXNwYWNlcyArICckJykpO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIERpc2FibGUgZGVidWcgb3V0cHV0LlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZGlzYWJsZSgpIHtcbiAgZXhwb3J0cy5lbmFibGUoJycpO1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ2l2ZW4gbW9kZSBuYW1lIGlzIGVuYWJsZWQsIGZhbHNlIG90aGVyd2lzZS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZW5hYmxlZChuYW1lKSB7XG4gIHZhciBpLCBsZW47XG4gIGZvciAoaSA9IDAsIGxlbiA9IGV4cG9ydHMuc2tpcHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICBpZiAoZXhwb3J0cy5za2lwc1tpXS50ZXN0KG5hbWUpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIGZvciAoaSA9IDAsIGxlbiA9IGV4cG9ydHMubmFtZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICBpZiAoZXhwb3J0cy5uYW1lc1tpXS50ZXN0KG5hbWUpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIENvZXJjZSBgdmFsYC5cbiAqXG4gKiBAcGFyYW0ge01peGVkfSB2YWxcbiAqIEByZXR1cm4ge01peGVkfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gY29lcmNlKHZhbCkge1xuICBpZiAodmFsIGluc3RhbmNlb2YgRXJyb3IpIHJldHVybiB2YWwuc3RhY2sgfHwgdmFsLm1lc3NhZ2U7XG4gIHJldHVybiB2YWw7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBoYXMgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5XG4gICwgcHJlZml4ID0gJ34nO1xuXG4vKipcbiAqIENvbnN0cnVjdG9yIHRvIGNyZWF0ZSBhIHN0b3JhZ2UgZm9yIG91ciBgRUVgIG9iamVjdHMuXG4gKiBBbiBgRXZlbnRzYCBpbnN0YW5jZSBpcyBhIHBsYWluIG9iamVjdCB3aG9zZSBwcm9wZXJ0aWVzIGFyZSBldmVudCBuYW1lcy5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBFdmVudHMoKSB7fVxuXG4vL1xuLy8gV2UgdHJ5IHRvIG5vdCBpbmhlcml0IGZyb20gYE9iamVjdC5wcm90b3R5cGVgLiBJbiBzb21lIGVuZ2luZXMgY3JlYXRpbmcgYW5cbi8vIGluc3RhbmNlIGluIHRoaXMgd2F5IGlzIGZhc3RlciB0aGFuIGNhbGxpbmcgYE9iamVjdC5jcmVhdGUobnVsbClgIGRpcmVjdGx5LlxuLy8gSWYgYE9iamVjdC5jcmVhdGUobnVsbClgIGlzIG5vdCBzdXBwb3J0ZWQgd2UgcHJlZml4IHRoZSBldmVudCBuYW1lcyB3aXRoIGFcbi8vIGNoYXJhY3RlciB0byBtYWtlIHN1cmUgdGhhdCB0aGUgYnVpbHQtaW4gb2JqZWN0IHByb3BlcnRpZXMgYXJlIG5vdFxuLy8gb3ZlcnJpZGRlbiBvciB1c2VkIGFzIGFuIGF0dGFjayB2ZWN0b3IuXG4vL1xuaWYgKE9iamVjdC5jcmVhdGUpIHtcbiAgRXZlbnRzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgLy9cbiAgLy8gVGhpcyBoYWNrIGlzIG5lZWRlZCBiZWNhdXNlIHRoZSBgX19wcm90b19fYCBwcm9wZXJ0eSBpcyBzdGlsbCBpbmhlcml0ZWQgaW5cbiAgLy8gc29tZSBvbGQgYnJvd3NlcnMgbGlrZSBBbmRyb2lkIDQsIGlQaG9uZSA1LjEsIE9wZXJhIDExIGFuZCBTYWZhcmkgNS5cbiAgLy9cbiAgaWYgKCFuZXcgRXZlbnRzKCkuX19wcm90b19fKSBwcmVmaXggPSBmYWxzZTtcbn1cblxuLyoqXG4gKiBSZXByZXNlbnRhdGlvbiBvZiBhIHNpbmdsZSBldmVudCBsaXN0ZW5lci5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBUaGUgbGlzdGVuZXIgZnVuY3Rpb24uXG4gKiBAcGFyYW0ge01peGVkfSBjb250ZXh0IFRoZSBjb250ZXh0IHRvIGludm9rZSB0aGUgbGlzdGVuZXIgd2l0aC5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29uY2U9ZmFsc2VdIFNwZWNpZnkgaWYgdGhlIGxpc3RlbmVyIGlzIGEgb25lLXRpbWUgbGlzdGVuZXIuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBFRShmbiwgY29udGV4dCwgb25jZSkge1xuICB0aGlzLmZuID0gZm47XG4gIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gIHRoaXMub25jZSA9IG9uY2UgfHwgZmFsc2U7XG59XG5cbi8qKlxuICogTWluaW1hbCBgRXZlbnRFbWl0dGVyYCBpbnRlcmZhY2UgdGhhdCBpcyBtb2xkZWQgYWdhaW5zdCB0aGUgTm9kZS5qc1xuICogYEV2ZW50RW1pdHRlcmAgaW50ZXJmYWNlLlxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICogQGFwaSBwdWJsaWNcbiAqL1xuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSBuZXcgRXZlbnRzKCk7XG4gIHRoaXMuX2V2ZW50c0NvdW50ID0gMDtcbn1cblxuLyoqXG4gKiBSZXR1cm4gYW4gYXJyYXkgbGlzdGluZyB0aGUgZXZlbnRzIGZvciB3aGljaCB0aGUgZW1pdHRlciBoYXMgcmVnaXN0ZXJlZFxuICogbGlzdGVuZXJzLlxuICpcbiAqIEByZXR1cm5zIHtBcnJheX1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZXZlbnROYW1lcyA9IGZ1bmN0aW9uIGV2ZW50TmFtZXMoKSB7XG4gIHZhciBuYW1lcyA9IFtdXG4gICAgLCBldmVudHNcbiAgICAsIG5hbWU7XG5cbiAgaWYgKHRoaXMuX2V2ZW50c0NvdW50ID09PSAwKSByZXR1cm4gbmFtZXM7XG5cbiAgZm9yIChuYW1lIGluIChldmVudHMgPSB0aGlzLl9ldmVudHMpKSB7XG4gICAgaWYgKGhhcy5jYWxsKGV2ZW50cywgbmFtZSkpIG5hbWVzLnB1c2gocHJlZml4ID8gbmFtZS5zbGljZSgxKSA6IG5hbWUpO1xuICB9XG5cbiAgaWYgKE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMpIHtcbiAgICByZXR1cm4gbmFtZXMuY29uY2F0KE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMoZXZlbnRzKSk7XG4gIH1cblxuICByZXR1cm4gbmFtZXM7XG59O1xuXG4vKipcbiAqIFJldHVybiB0aGUgbGlzdGVuZXJzIHJlZ2lzdGVyZWQgZm9yIGEgZ2l2ZW4gZXZlbnQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8U3ltYm9sfSBldmVudCBUaGUgZXZlbnQgbmFtZS5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gZXhpc3RzIE9ubHkgY2hlY2sgaWYgdGhlcmUgYXJlIGxpc3RlbmVycy5cbiAqIEByZXR1cm5zIHtBcnJheXxCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbiBsaXN0ZW5lcnMoZXZlbnQsIGV4aXN0cykge1xuICB2YXIgZXZ0ID0gcHJlZml4ID8gcHJlZml4ICsgZXZlbnQgOiBldmVudFxuICAgICwgYXZhaWxhYmxlID0gdGhpcy5fZXZlbnRzW2V2dF07XG5cbiAgaWYgKGV4aXN0cykgcmV0dXJuICEhYXZhaWxhYmxlO1xuICBpZiAoIWF2YWlsYWJsZSkgcmV0dXJuIFtdO1xuICBpZiAoYXZhaWxhYmxlLmZuKSByZXR1cm4gW2F2YWlsYWJsZS5mbl07XG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBhdmFpbGFibGUubGVuZ3RoLCBlZSA9IG5ldyBBcnJheShsKTsgaSA8IGw7IGkrKykge1xuICAgIGVlW2ldID0gYXZhaWxhYmxlW2ldLmZuO1xuICB9XG5cbiAgcmV0dXJuIGVlO1xufTtcblxuLyoqXG4gKiBDYWxscyBlYWNoIG9mIHRoZSBsaXN0ZW5lcnMgcmVnaXN0ZXJlZCBmb3IgYSBnaXZlbiBldmVudC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xTeW1ib2x9IGV2ZW50IFRoZSBldmVudCBuYW1lLlxuICogQHJldHVybnMge0Jvb2xlYW59IGB0cnVlYCBpZiB0aGUgZXZlbnQgaGFkIGxpc3RlbmVycywgZWxzZSBgZmFsc2VgLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24gZW1pdChldmVudCwgYTEsIGEyLCBhMywgYTQsIGE1KSB7XG4gIHZhciBldnQgPSBwcmVmaXggPyBwcmVmaXggKyBldmVudCA6IGV2ZW50O1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW2V2dF0pIHJldHVybiBmYWxzZTtcblxuICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW2V2dF1cbiAgICAsIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGhcbiAgICAsIGFyZ3NcbiAgICAsIGk7XG5cbiAgaWYgKGxpc3RlbmVycy5mbikge1xuICAgIGlmIChsaXN0ZW5lcnMub25jZSkgdGhpcy5yZW1vdmVMaXN0ZW5lcihldmVudCwgbGlzdGVuZXJzLmZuLCB1bmRlZmluZWQsIHRydWUpO1xuXG4gICAgc3dpdGNoIChsZW4pIHtcbiAgICAgIGNhc2UgMTogcmV0dXJuIGxpc3RlbmVycy5mbi5jYWxsKGxpc3RlbmVycy5jb250ZXh0KSwgdHJ1ZTtcbiAgICAgIGNhc2UgMjogcmV0dXJuIGxpc3RlbmVycy5mbi5jYWxsKGxpc3RlbmVycy5jb250ZXh0LCBhMSksIHRydWU7XG4gICAgICBjYXNlIDM6IHJldHVybiBsaXN0ZW5lcnMuZm4uY2FsbChsaXN0ZW5lcnMuY29udGV4dCwgYTEsIGEyKSwgdHJ1ZTtcbiAgICAgIGNhc2UgNDogcmV0dXJuIGxpc3RlbmVycy5mbi5jYWxsKGxpc3RlbmVycy5jb250ZXh0LCBhMSwgYTIsIGEzKSwgdHJ1ZTtcbiAgICAgIGNhc2UgNTogcmV0dXJuIGxpc3RlbmVycy5mbi5jYWxsKGxpc3RlbmVycy5jb250ZXh0LCBhMSwgYTIsIGEzLCBhNCksIHRydWU7XG4gICAgICBjYXNlIDY6IHJldHVybiBsaXN0ZW5lcnMuZm4uY2FsbChsaXN0ZW5lcnMuY29udGV4dCwgYTEsIGEyLCBhMywgYTQsIGE1KSwgdHJ1ZTtcbiAgICB9XG5cbiAgICBmb3IgKGkgPSAxLCBhcmdzID0gbmV3IEFycmF5KGxlbiAtMSk7IGkgPCBsZW47IGkrKykge1xuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgfVxuXG4gICAgbGlzdGVuZXJzLmZuLmFwcGx5KGxpc3RlbmVycy5jb250ZXh0LCBhcmdzKTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgbGVuZ3RoID0gbGlzdGVuZXJzLmxlbmd0aFxuICAgICAgLCBqO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAobGlzdGVuZXJzW2ldLm9uY2UpIHRoaXMucmVtb3ZlTGlzdGVuZXIoZXZlbnQsIGxpc3RlbmVyc1tpXS5mbiwgdW5kZWZpbmVkLCB0cnVlKTtcblxuICAgICAgc3dpdGNoIChsZW4pIHtcbiAgICAgICAgY2FzZSAxOiBsaXN0ZW5lcnNbaV0uZm4uY2FsbChsaXN0ZW5lcnNbaV0uY29udGV4dCk7IGJyZWFrO1xuICAgICAgICBjYXNlIDI6IGxpc3RlbmVyc1tpXS5mbi5jYWxsKGxpc3RlbmVyc1tpXS5jb250ZXh0LCBhMSk7IGJyZWFrO1xuICAgICAgICBjYXNlIDM6IGxpc3RlbmVyc1tpXS5mbi5jYWxsKGxpc3RlbmVyc1tpXS5jb250ZXh0LCBhMSwgYTIpOyBicmVhaztcbiAgICAgICAgY2FzZSA0OiBsaXN0ZW5lcnNbaV0uZm4uY2FsbChsaXN0ZW5lcnNbaV0uY29udGV4dCwgYTEsIGEyLCBhMyk7IGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGlmICghYXJncykgZm9yIChqID0gMSwgYXJncyA9IG5ldyBBcnJheShsZW4gLTEpOyBqIDwgbGVuOyBqKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaiAtIDFdID0gYXJndW1lbnRzW2pdO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGxpc3RlbmVyc1tpXS5mbi5hcHBseShsaXN0ZW5lcnNbaV0uY29udGV4dCwgYXJncyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEFkZCBhIGxpc3RlbmVyIGZvciBhIGdpdmVuIGV2ZW50LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfFN5bWJvbH0gZXZlbnQgVGhlIGV2ZW50IG5hbWUuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBUaGUgbGlzdGVuZXIgZnVuY3Rpb24uXG4gKiBAcGFyYW0ge01peGVkfSBbY29udGV4dD10aGlzXSBUaGUgY29udGV4dCB0byBpbnZva2UgdGhlIGxpc3RlbmVyIHdpdGguXG4gKiBAcmV0dXJucyB7RXZlbnRFbWl0dGVyfSBgdGhpc2AuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gb24oZXZlbnQsIGZuLCBjb250ZXh0KSB7XG4gIHZhciBsaXN0ZW5lciA9IG5ldyBFRShmbiwgY29udGV4dCB8fCB0aGlzKVxuICAgICwgZXZ0ID0gcHJlZml4ID8gcHJlZml4ICsgZXZlbnQgOiBldmVudDtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1tldnRdKSB0aGlzLl9ldmVudHNbZXZ0XSA9IGxpc3RlbmVyLCB0aGlzLl9ldmVudHNDb3VudCsrO1xuICBlbHNlIGlmICghdGhpcy5fZXZlbnRzW2V2dF0uZm4pIHRoaXMuX2V2ZW50c1tldnRdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlIHRoaXMuX2V2ZW50c1tldnRdID0gW3RoaXMuX2V2ZW50c1tldnRdLCBsaXN0ZW5lcl07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZCBhIG9uZS10aW1lIGxpc3RlbmVyIGZvciBhIGdpdmVuIGV2ZW50LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfFN5bWJvbH0gZXZlbnQgVGhlIGV2ZW50IG5hbWUuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBUaGUgbGlzdGVuZXIgZnVuY3Rpb24uXG4gKiBAcGFyYW0ge01peGVkfSBbY29udGV4dD10aGlzXSBUaGUgY29udGV4dCB0byBpbnZva2UgdGhlIGxpc3RlbmVyIHdpdGguXG4gKiBAcmV0dXJucyB7RXZlbnRFbWl0dGVyfSBgdGhpc2AuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbiBvbmNlKGV2ZW50LCBmbiwgY29udGV4dCkge1xuICB2YXIgbGlzdGVuZXIgPSBuZXcgRUUoZm4sIGNvbnRleHQgfHwgdGhpcywgdHJ1ZSlcbiAgICAsIGV2dCA9IHByZWZpeCA/IHByZWZpeCArIGV2ZW50IDogZXZlbnQ7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbZXZ0XSkgdGhpcy5fZXZlbnRzW2V2dF0gPSBsaXN0ZW5lciwgdGhpcy5fZXZlbnRzQ291bnQrKztcbiAgZWxzZSBpZiAoIXRoaXMuX2V2ZW50c1tldnRdLmZuKSB0aGlzLl9ldmVudHNbZXZ0XS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZSB0aGlzLl9ldmVudHNbZXZ0XSA9IFt0aGlzLl9ldmVudHNbZXZ0XSwgbGlzdGVuZXJdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgdGhlIGxpc3RlbmVycyBvZiBhIGdpdmVuIGV2ZW50LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfFN5bWJvbH0gZXZlbnQgVGhlIGV2ZW50IG5hbWUuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBPbmx5IHJlbW92ZSB0aGUgbGlzdGVuZXJzIHRoYXQgbWF0Y2ggdGhpcyBmdW5jdGlvbi5cbiAqIEBwYXJhbSB7TWl4ZWR9IGNvbnRleHQgT25seSByZW1vdmUgdGhlIGxpc3RlbmVycyB0aGF0IGhhdmUgdGhpcyBjb250ZXh0LlxuICogQHBhcmFtIHtCb29sZWFufSBvbmNlIE9ubHkgcmVtb3ZlIG9uZS10aW1lIGxpc3RlbmVycy5cbiAqIEByZXR1cm5zIHtFdmVudEVtaXR0ZXJ9IGB0aGlzYC5cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbiByZW1vdmVMaXN0ZW5lcihldmVudCwgZm4sIGNvbnRleHQsIG9uY2UpIHtcbiAgdmFyIGV2dCA9IHByZWZpeCA/IHByZWZpeCArIGV2ZW50IDogZXZlbnQ7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbZXZ0XSkgcmV0dXJuIHRoaXM7XG4gIGlmICghZm4pIHtcbiAgICBpZiAoLS10aGlzLl9ldmVudHNDb3VudCA9PT0gMCkgdGhpcy5fZXZlbnRzID0gbmV3IEV2ZW50cygpO1xuICAgIGVsc2UgZGVsZXRlIHRoaXMuX2V2ZW50c1tldnRdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgdmFyIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1tldnRdO1xuXG4gIGlmIChsaXN0ZW5lcnMuZm4pIHtcbiAgICBpZiAoXG4gICAgICAgICBsaXN0ZW5lcnMuZm4gPT09IGZuXG4gICAgICAmJiAoIW9uY2UgfHwgbGlzdGVuZXJzLm9uY2UpXG4gICAgICAmJiAoIWNvbnRleHQgfHwgbGlzdGVuZXJzLmNvbnRleHQgPT09IGNvbnRleHQpXG4gICAgKSB7XG4gICAgICBpZiAoLS10aGlzLl9ldmVudHNDb3VudCA9PT0gMCkgdGhpcy5fZXZlbnRzID0gbmV3IEV2ZW50cygpO1xuICAgICAgZWxzZSBkZWxldGUgdGhpcy5fZXZlbnRzW2V2dF07XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGZvciAodmFyIGkgPSAwLCBldmVudHMgPSBbXSwgbGVuZ3RoID0gbGlzdGVuZXJzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoXG4gICAgICAgICAgIGxpc3RlbmVyc1tpXS5mbiAhPT0gZm5cbiAgICAgICAgfHwgKG9uY2UgJiYgIWxpc3RlbmVyc1tpXS5vbmNlKVxuICAgICAgICB8fCAoY29udGV4dCAmJiBsaXN0ZW5lcnNbaV0uY29udGV4dCAhPT0gY29udGV4dClcbiAgICAgICkge1xuICAgICAgICBldmVudHMucHVzaChsaXN0ZW5lcnNbaV0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vXG4gICAgLy8gUmVzZXQgdGhlIGFycmF5LCBvciByZW1vdmUgaXQgY29tcGxldGVseSBpZiB3ZSBoYXZlIG5vIG1vcmUgbGlzdGVuZXJzLlxuICAgIC8vXG4gICAgaWYgKGV2ZW50cy5sZW5ndGgpIHRoaXMuX2V2ZW50c1tldnRdID0gZXZlbnRzLmxlbmd0aCA9PT0gMSA/IGV2ZW50c1swXSA6IGV2ZW50cztcbiAgICBlbHNlIGlmICgtLXRoaXMuX2V2ZW50c0NvdW50ID09PSAwKSB0aGlzLl9ldmVudHMgPSBuZXcgRXZlbnRzKCk7XG4gICAgZWxzZSBkZWxldGUgdGhpcy5fZXZlbnRzW2V2dF07XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVtb3ZlIGFsbCBsaXN0ZW5lcnMsIG9yIHRob3NlIG9mIHRoZSBzcGVjaWZpZWQgZXZlbnQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8U3ltYm9sfSBbZXZlbnRdIFRoZSBldmVudCBuYW1lLlxuICogQHJldHVybnMge0V2ZW50RW1pdHRlcn0gYHRoaXNgLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbiByZW1vdmVBbGxMaXN0ZW5lcnMoZXZlbnQpIHtcbiAgdmFyIGV2dDtcblxuICBpZiAoZXZlbnQpIHtcbiAgICBldnQgPSBwcmVmaXggPyBwcmVmaXggKyBldmVudCA6IGV2ZW50O1xuICAgIGlmICh0aGlzLl9ldmVudHNbZXZ0XSkge1xuICAgICAgaWYgKC0tdGhpcy5fZXZlbnRzQ291bnQgPT09IDApIHRoaXMuX2V2ZW50cyA9IG5ldyBFdmVudHMoKTtcbiAgICAgIGVsc2UgZGVsZXRlIHRoaXMuX2V2ZW50c1tldnRdO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aGlzLl9ldmVudHMgPSBuZXcgRXZlbnRzKCk7XG4gICAgdGhpcy5fZXZlbnRzQ291bnQgPSAwO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vL1xuLy8gQWxpYXMgbWV0aG9kcyBuYW1lcyBiZWNhdXNlIHBlb3BsZSByb2xsIGxpa2UgdGhhdC5cbi8vXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXI7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbjtcblxuLy9cbi8vIFRoaXMgZnVuY3Rpb24gZG9lc24ndCBhcHBseSBhbnltb3JlLlxuLy9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24gc2V0TWF4TGlzdGVuZXJzKCkge1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8vXG4vLyBFeHBvc2UgdGhlIHByZWZpeC5cbi8vXG5FdmVudEVtaXR0ZXIucHJlZml4ZWQgPSBwcmVmaXg7XG5cbi8vXG4vLyBBbGxvdyBgRXZlbnRFbWl0dGVyYCB0byBiZSBpbXBvcnRlZCBhcyBtb2R1bGUgbmFtZXNwYWNlLlxuLy9cbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbi8vXG4vLyBFeHBvc2UgdGhlIG1vZHVsZS5cbi8vXG5pZiAoJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiBtb2R1bGUpIHtcbiAgbW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG59XG4iLCIvKipcbiAqIEhlbHBlcnMuXG4gKi9cblxudmFyIHMgPSAxMDAwO1xudmFyIG0gPSBzICogNjA7XG52YXIgaCA9IG0gKiA2MDtcbnZhciBkID0gaCAqIDI0O1xudmFyIHkgPSBkICogMzY1LjI1O1xuXG4vKipcbiAqIFBhcnNlIG9yIGZvcm1hdCB0aGUgZ2l2ZW4gYHZhbGAuXG4gKlxuICogT3B0aW9uczpcbiAqXG4gKiAgLSBgbG9uZ2AgdmVyYm9zZSBmb3JtYXR0aW5nIFtmYWxzZV1cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xOdW1iZXJ9IHZhbFxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICogQHRocm93cyB7RXJyb3J9IHRocm93IGFuIGVycm9yIGlmIHZhbCBpcyBub3QgYSBub24tZW1wdHkgc3RyaW5nIG9yIGEgbnVtYmVyXG4gKiBAcmV0dXJuIHtTdHJpbmd8TnVtYmVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbCwgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdmFyIHR5cGUgPSB0eXBlb2YgdmFsO1xuICBpZiAodHlwZSA9PT0gJ3N0cmluZycgJiYgdmFsLmxlbmd0aCA+IDApIHtcbiAgICByZXR1cm4gcGFyc2UodmFsKTtcbiAgfSBlbHNlIGlmICh0eXBlID09PSAnbnVtYmVyJyAmJiBpc05hTih2YWwpID09PSBmYWxzZSkge1xuICAgIHJldHVybiBvcHRpb25zLmxvbmcgPyBmbXRMb25nKHZhbCkgOiBmbXRTaG9ydCh2YWwpO1xuICB9XG4gIHRocm93IG5ldyBFcnJvcihcbiAgICAndmFsIGlzIG5vdCBhIG5vbi1lbXB0eSBzdHJpbmcgb3IgYSB2YWxpZCBudW1iZXIuIHZhbD0nICtcbiAgICAgIEpTT04uc3RyaW5naWZ5KHZhbClcbiAgKTtcbn07XG5cbi8qKlxuICogUGFyc2UgdGhlIGdpdmVuIGBzdHJgIGFuZCByZXR1cm4gbWlsbGlzZWNvbmRzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIHBhcnNlKHN0cikge1xuICBzdHIgPSBTdHJpbmcoc3RyKTtcbiAgaWYgKHN0ci5sZW5ndGggPiAxMDApIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIG1hdGNoID0gL14oKD86XFxkKyk/XFwuP1xcZCspICoobWlsbGlzZWNvbmRzP3xtc2Vjcz98bXN8c2Vjb25kcz98c2Vjcz98c3xtaW51dGVzP3xtaW5zP3xtfGhvdXJzP3xocnM/fGh8ZGF5cz98ZHx5ZWFycz98eXJzP3x5KT8kL2kuZXhlYyhcbiAgICBzdHJcbiAgKTtcbiAgaWYgKCFtYXRjaCkge1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgbiA9IHBhcnNlRmxvYXQobWF0Y2hbMV0pO1xuICB2YXIgdHlwZSA9IChtYXRjaFsyXSB8fCAnbXMnKS50b0xvd2VyQ2FzZSgpO1xuICBzd2l0Y2ggKHR5cGUpIHtcbiAgICBjYXNlICd5ZWFycyc6XG4gICAgY2FzZSAneWVhcic6XG4gICAgY2FzZSAneXJzJzpcbiAgICBjYXNlICd5cic6XG4gICAgY2FzZSAneSc6XG4gICAgICByZXR1cm4gbiAqIHk7XG4gICAgY2FzZSAnZGF5cyc6XG4gICAgY2FzZSAnZGF5JzpcbiAgICBjYXNlICdkJzpcbiAgICAgIHJldHVybiBuICogZDtcbiAgICBjYXNlICdob3Vycyc6XG4gICAgY2FzZSAnaG91cic6XG4gICAgY2FzZSAnaHJzJzpcbiAgICBjYXNlICdocic6XG4gICAgY2FzZSAnaCc6XG4gICAgICByZXR1cm4gbiAqIGg7XG4gICAgY2FzZSAnbWludXRlcyc6XG4gICAgY2FzZSAnbWludXRlJzpcbiAgICBjYXNlICdtaW5zJzpcbiAgICBjYXNlICdtaW4nOlxuICAgIGNhc2UgJ20nOlxuICAgICAgcmV0dXJuIG4gKiBtO1xuICAgIGNhc2UgJ3NlY29uZHMnOlxuICAgIGNhc2UgJ3NlY29uZCc6XG4gICAgY2FzZSAnc2Vjcyc6XG4gICAgY2FzZSAnc2VjJzpcbiAgICBjYXNlICdzJzpcbiAgICAgIHJldHVybiBuICogcztcbiAgICBjYXNlICdtaWxsaXNlY29uZHMnOlxuICAgIGNhc2UgJ21pbGxpc2Vjb25kJzpcbiAgICBjYXNlICdtc2Vjcyc6XG4gICAgY2FzZSAnbXNlYyc6XG4gICAgY2FzZSAnbXMnOlxuICAgICAgcmV0dXJuIG47XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuLyoqXG4gKiBTaG9ydCBmb3JtYXQgZm9yIGBtc2AuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IG1zXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBmbXRTaG9ydChtcykge1xuICBpZiAobXMgPj0gZCkge1xuICAgIHJldHVybiBNYXRoLnJvdW5kKG1zIC8gZCkgKyAnZCc7XG4gIH1cbiAgaWYgKG1zID49IGgpIHtcbiAgICByZXR1cm4gTWF0aC5yb3VuZChtcyAvIGgpICsgJ2gnO1xuICB9XG4gIGlmIChtcyA+PSBtKSB7XG4gICAgcmV0dXJuIE1hdGgucm91bmQobXMgLyBtKSArICdtJztcbiAgfVxuICBpZiAobXMgPj0gcykge1xuICAgIHJldHVybiBNYXRoLnJvdW5kKG1zIC8gcykgKyAncyc7XG4gIH1cbiAgcmV0dXJuIG1zICsgJ21zJztcbn1cblxuLyoqXG4gKiBMb25nIGZvcm1hdCBmb3IgYG1zYC5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gbXNcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIGZtdExvbmcobXMpIHtcbiAgcmV0dXJuIHBsdXJhbChtcywgZCwgJ2RheScpIHx8XG4gICAgcGx1cmFsKG1zLCBoLCAnaG91cicpIHx8XG4gICAgcGx1cmFsKG1zLCBtLCAnbWludXRlJykgfHxcbiAgICBwbHVyYWwobXMsIHMsICdzZWNvbmQnKSB8fFxuICAgIG1zICsgJyBtcyc7XG59XG5cbi8qKlxuICogUGx1cmFsaXphdGlvbiBoZWxwZXIuXG4gKi9cblxuZnVuY3Rpb24gcGx1cmFsKG1zLCBuLCBuYW1lKSB7XG4gIGlmIChtcyA8IG4pIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKG1zIDwgbiAqIDEuNSkge1xuICAgIHJldHVybiBNYXRoLmZsb29yKG1zIC8gbikgKyAnICcgKyBuYW1lO1xuICB9XG4gIHJldHVybiBNYXRoLmNlaWwobXMgLyBuKSArICcgJyArIG5hbWUgKyAncyc7XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRPbmNlTGlzdGVuZXIgPSBub29wO1xuXG5wcm9jZXNzLmxpc3RlbmVycyA9IGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiBbXSB9XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgICAgY29uc3RydWN0b3I6IHtcbiAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59IGVsc2Uge1xuICAvLyBvbGQgc2Nob29sIHNoaW0gZm9yIG9sZCBicm93c2Vyc1xuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICBUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlXG4gICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKVxuICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQnVmZmVyKGFyZykge1xuICByZXR1cm4gYXJnICYmIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnXG4gICAgJiYgdHlwZW9mIGFyZy5jb3B5ID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5maWxsID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5yZWFkVUludDggPT09ICdmdW5jdGlvbic7XG59IiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciBmb3JtYXRSZWdFeHAgPSAvJVtzZGolXS9nO1xuZXhwb3J0cy5mb3JtYXQgPSBmdW5jdGlvbihmKSB7XG4gIGlmICghaXNTdHJpbmcoZikpIHtcbiAgICB2YXIgb2JqZWN0cyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBvYmplY3RzLnB1c2goaW5zcGVjdChhcmd1bWVudHNbaV0pKTtcbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdHMuam9pbignICcpO1xuICB9XG5cbiAgdmFyIGkgPSAxO1xuICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgdmFyIGxlbiA9IGFyZ3MubGVuZ3RoO1xuICB2YXIgc3RyID0gU3RyaW5nKGYpLnJlcGxhY2UoZm9ybWF0UmVnRXhwLCBmdW5jdGlvbih4KSB7XG4gICAgaWYgKHggPT09ICclJScpIHJldHVybiAnJSc7XG4gICAgaWYgKGkgPj0gbGVuKSByZXR1cm4geDtcbiAgICBzd2l0Y2ggKHgpIHtcbiAgICAgIGNhc2UgJyVzJzogcmV0dXJuIFN0cmluZyhhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWQnOiByZXR1cm4gTnVtYmVyKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclaic6XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGFyZ3NbaSsrXSk7XG4gICAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgICByZXR1cm4gJ1tDaXJjdWxhcl0nO1xuICAgICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4geDtcbiAgICB9XG4gIH0pO1xuICBmb3IgKHZhciB4ID0gYXJnc1tpXTsgaSA8IGxlbjsgeCA9IGFyZ3NbKytpXSkge1xuICAgIGlmIChpc051bGwoeCkgfHwgIWlzT2JqZWN0KHgpKSB7XG4gICAgICBzdHIgKz0gJyAnICsgeDtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyICs9ICcgJyArIGluc3BlY3QoeCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBzdHI7XG59O1xuXG5cbi8vIE1hcmsgdGhhdCBhIG1ldGhvZCBzaG91bGQgbm90IGJlIHVzZWQuXG4vLyBSZXR1cm5zIGEgbW9kaWZpZWQgZnVuY3Rpb24gd2hpY2ggd2FybnMgb25jZSBieSBkZWZhdWx0LlxuLy8gSWYgLS1uby1kZXByZWNhdGlvbiBpcyBzZXQsIHRoZW4gaXQgaXMgYSBuby1vcC5cbmV4cG9ydHMuZGVwcmVjYXRlID0gZnVuY3Rpb24oZm4sIG1zZykge1xuICAvLyBBbGxvdyBmb3IgZGVwcmVjYXRpbmcgdGhpbmdzIGluIHRoZSBwcm9jZXNzIG9mIHN0YXJ0aW5nIHVwLlxuICBpZiAoaXNVbmRlZmluZWQoZ2xvYmFsLnByb2Nlc3MpKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGV4cG9ydHMuZGVwcmVjYXRlKGZuLCBtc2cpLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfVxuXG4gIGlmIChwcm9jZXNzLm5vRGVwcmVjYXRpb24gPT09IHRydWUpIHtcbiAgICByZXR1cm4gZm47XG4gIH1cblxuICB2YXIgd2FybmVkID0gZmFsc2U7XG4gIGZ1bmN0aW9uIGRlcHJlY2F0ZWQoKSB7XG4gICAgaWYgKCF3YXJuZWQpIHtcbiAgICAgIGlmIChwcm9jZXNzLnRocm93RGVwcmVjYXRpb24pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gICAgICB9IGVsc2UgaWYgKHByb2Nlc3MudHJhY2VEZXByZWNhdGlvbikge1xuICAgICAgICBjb25zb2xlLnRyYWNlKG1zZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKG1zZyk7XG4gICAgICB9XG4gICAgICB3YXJuZWQgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIHJldHVybiBkZXByZWNhdGVkO1xufTtcblxuXG52YXIgZGVidWdzID0ge307XG52YXIgZGVidWdFbnZpcm9uO1xuZXhwb3J0cy5kZWJ1Z2xvZyA9IGZ1bmN0aW9uKHNldCkge1xuICBpZiAoaXNVbmRlZmluZWQoZGVidWdFbnZpcm9uKSlcbiAgICBkZWJ1Z0Vudmlyb24gPSBwcm9jZXNzLmVudi5OT0RFX0RFQlVHIHx8ICcnO1xuICBzZXQgPSBzZXQudG9VcHBlckNhc2UoKTtcbiAgaWYgKCFkZWJ1Z3Nbc2V0XSkge1xuICAgIGlmIChuZXcgUmVnRXhwKCdcXFxcYicgKyBzZXQgKyAnXFxcXGInLCAnaScpLnRlc3QoZGVidWdFbnZpcm9uKSkge1xuICAgICAgdmFyIHBpZCA9IHByb2Nlc3MucGlkO1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG1zZyA9IGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cyk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJyVzICVkOiAlcycsIHNldCwgcGlkLCBtc2cpO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHt9O1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVidWdzW3NldF07XG59O1xuXG5cbi8qKlxuICogRWNob3MgdGhlIHZhbHVlIG9mIGEgdmFsdWUuIFRyeXMgdG8gcHJpbnQgdGhlIHZhbHVlIG91dFxuICogaW4gdGhlIGJlc3Qgd2F5IHBvc3NpYmxlIGdpdmVuIHRoZSBkaWZmZXJlbnQgdHlwZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBUaGUgb2JqZWN0IHRvIHByaW50IG91dC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIG9wdGlvbnMgb2JqZWN0IHRoYXQgYWx0ZXJzIHRoZSBvdXRwdXQuXG4gKi9cbi8qIGxlZ2FjeTogb2JqLCBzaG93SGlkZGVuLCBkZXB0aCwgY29sb3JzKi9cbmZ1bmN0aW9uIGluc3BlY3Qob2JqLCBvcHRzKSB7XG4gIC8vIGRlZmF1bHQgb3B0aW9uc1xuICB2YXIgY3R4ID0ge1xuICAgIHNlZW46IFtdLFxuICAgIHN0eWxpemU6IHN0eWxpemVOb0NvbG9yXG4gIH07XG4gIC8vIGxlZ2FjeS4uLlxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSAzKSBjdHguZGVwdGggPSBhcmd1bWVudHNbMl07XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDQpIGN0eC5jb2xvcnMgPSBhcmd1bWVudHNbM107XG4gIGlmIChpc0Jvb2xlYW4ob3B0cykpIHtcbiAgICAvLyBsZWdhY3kuLi5cbiAgICBjdHguc2hvd0hpZGRlbiA9IG9wdHM7XG4gIH0gZWxzZSBpZiAob3B0cykge1xuICAgIC8vIGdvdCBhbiBcIm9wdGlvbnNcIiBvYmplY3RcbiAgICBleHBvcnRzLl9leHRlbmQoY3R4LCBvcHRzKTtcbiAgfVxuICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gIGlmIChpc1VuZGVmaW5lZChjdHguc2hvd0hpZGRlbikpIGN0eC5zaG93SGlkZGVuID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguZGVwdGgpKSBjdHguZGVwdGggPSAyO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmNvbG9ycykpIGN0eC5jb2xvcnMgPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jdXN0b21JbnNwZWN0KSkgY3R4LmN1c3RvbUluc3BlY3QgPSB0cnVlO1xuICBpZiAoY3R4LmNvbG9ycykgY3R4LnN0eWxpemUgPSBzdHlsaXplV2l0aENvbG9yO1xuICByZXR1cm4gZm9ybWF0VmFsdWUoY3R4LCBvYmosIGN0eC5kZXB0aCk7XG59XG5leHBvcnRzLmluc3BlY3QgPSBpbnNwZWN0O1xuXG5cbi8vIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQU5TSV9lc2NhcGVfY29kZSNncmFwaGljc1xuaW5zcGVjdC5jb2xvcnMgPSB7XG4gICdib2xkJyA6IFsxLCAyMl0sXG4gICdpdGFsaWMnIDogWzMsIDIzXSxcbiAgJ3VuZGVybGluZScgOiBbNCwgMjRdLFxuICAnaW52ZXJzZScgOiBbNywgMjddLFxuICAnd2hpdGUnIDogWzM3LCAzOV0sXG4gICdncmV5JyA6IFs5MCwgMzldLFxuICAnYmxhY2snIDogWzMwLCAzOV0sXG4gICdibHVlJyA6IFszNCwgMzldLFxuICAnY3lhbicgOiBbMzYsIDM5XSxcbiAgJ2dyZWVuJyA6IFszMiwgMzldLFxuICAnbWFnZW50YScgOiBbMzUsIDM5XSxcbiAgJ3JlZCcgOiBbMzEsIDM5XSxcbiAgJ3llbGxvdycgOiBbMzMsIDM5XVxufTtcblxuLy8gRG9uJ3QgdXNlICdibHVlJyBub3QgdmlzaWJsZSBvbiBjbWQuZXhlXG5pbnNwZWN0LnN0eWxlcyA9IHtcbiAgJ3NwZWNpYWwnOiAnY3lhbicsXG4gICdudW1iZXInOiAneWVsbG93JyxcbiAgJ2Jvb2xlYW4nOiAneWVsbG93JyxcbiAgJ3VuZGVmaW5lZCc6ICdncmV5JyxcbiAgJ251bGwnOiAnYm9sZCcsXG4gICdzdHJpbmcnOiAnZ3JlZW4nLFxuICAnZGF0ZSc6ICdtYWdlbnRhJyxcbiAgLy8gXCJuYW1lXCI6IGludGVudGlvbmFsbHkgbm90IHN0eWxpbmdcbiAgJ3JlZ2V4cCc6ICdyZWQnXG59O1xuXG5cbmZ1bmN0aW9uIHN0eWxpemVXaXRoQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgdmFyIHN0eWxlID0gaW5zcGVjdC5zdHlsZXNbc3R5bGVUeXBlXTtcblxuICBpZiAoc3R5bGUpIHtcbiAgICByZXR1cm4gJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVswXSArICdtJyArIHN0ciArXG4gICAgICAgICAgICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMV0gKyAnbSc7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHN0eWxpemVOb0NvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHJldHVybiBzdHI7XG59XG5cblxuZnVuY3Rpb24gYXJyYXlUb0hhc2goYXJyYXkpIHtcbiAgdmFyIGhhc2ggPSB7fTtcblxuICBhcnJheS5mb3JFYWNoKGZ1bmN0aW9uKHZhbCwgaWR4KSB7XG4gICAgaGFzaFt2YWxdID0gdHJ1ZTtcbiAgfSk7XG5cbiAgcmV0dXJuIGhhc2g7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0VmFsdWUoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzKSB7XG4gIC8vIFByb3ZpZGUgYSBob29rIGZvciB1c2VyLXNwZWNpZmllZCBpbnNwZWN0IGZ1bmN0aW9ucy5cbiAgLy8gQ2hlY2sgdGhhdCB2YWx1ZSBpcyBhbiBvYmplY3Qgd2l0aCBhbiBpbnNwZWN0IGZ1bmN0aW9uIG9uIGl0XG4gIGlmIChjdHguY3VzdG9tSW5zcGVjdCAmJlxuICAgICAgdmFsdWUgJiZcbiAgICAgIGlzRnVuY3Rpb24odmFsdWUuaW5zcGVjdCkgJiZcbiAgICAgIC8vIEZpbHRlciBvdXQgdGhlIHV0aWwgbW9kdWxlLCBpdCdzIGluc3BlY3QgZnVuY3Rpb24gaXMgc3BlY2lhbFxuICAgICAgdmFsdWUuaW5zcGVjdCAhPT0gZXhwb3J0cy5pbnNwZWN0ICYmXG4gICAgICAvLyBBbHNvIGZpbHRlciBvdXQgYW55IHByb3RvdHlwZSBvYmplY3RzIHVzaW5nIHRoZSBjaXJjdWxhciBjaGVjay5cbiAgICAgICEodmFsdWUuY29uc3RydWN0b3IgJiYgdmFsdWUuY29uc3RydWN0b3IucHJvdG90eXBlID09PSB2YWx1ZSkpIHtcbiAgICB2YXIgcmV0ID0gdmFsdWUuaW5zcGVjdChyZWN1cnNlVGltZXMsIGN0eCk7XG4gICAgaWYgKCFpc1N0cmluZyhyZXQpKSB7XG4gICAgICByZXQgPSBmb3JtYXRWYWx1ZShjdHgsIHJldCwgcmVjdXJzZVRpbWVzKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIC8vIFByaW1pdGl2ZSB0eXBlcyBjYW5ub3QgaGF2ZSBwcm9wZXJ0aWVzXG4gIHZhciBwcmltaXRpdmUgPSBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSk7XG4gIGlmIChwcmltaXRpdmUpIHtcbiAgICByZXR1cm4gcHJpbWl0aXZlO1xuICB9XG5cbiAgLy8gTG9vayB1cCB0aGUga2V5cyBvZiB0aGUgb2JqZWN0LlxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHZhbHVlKTtcbiAgdmFyIHZpc2libGVLZXlzID0gYXJyYXlUb0hhc2goa2V5cyk7XG5cbiAgaWYgKGN0eC5zaG93SGlkZGVuKSB7XG4gICAga2V5cyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHZhbHVlKTtcbiAgfVxuXG4gIC8vIElFIGRvZXNuJ3QgbWFrZSBlcnJvciBmaWVsZHMgbm9uLWVudW1lcmFibGVcbiAgLy8gaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L2llL2R3dzUyc2J0KHY9dnMuOTQpLmFzcHhcbiAgaWYgKGlzRXJyb3IodmFsdWUpXG4gICAgICAmJiAoa2V5cy5pbmRleE9mKCdtZXNzYWdlJykgPj0gMCB8fCBrZXlzLmluZGV4T2YoJ2Rlc2NyaXB0aW9uJykgPj0gMCkpIHtcbiAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgLy8gU29tZSB0eXBlIG9mIG9iamVjdCB3aXRob3V0IHByb3BlcnRpZXMgY2FuIGJlIHNob3J0Y3V0dGVkLlxuICBpZiAoa2V5cy5sZW5ndGggPT09IDApIHtcbiAgICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgIHZhciBuYW1lID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tGdW5jdGlvbicgKyBuYW1lICsgJ10nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH1cbiAgICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKERhdGUucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAnZGF0ZScpO1xuICAgIH1cbiAgICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIGJhc2UgPSAnJywgYXJyYXkgPSBmYWxzZSwgYnJhY2VzID0gWyd7JywgJ30nXTtcblxuICAvLyBNYWtlIEFycmF5IHNheSB0aGF0IHRoZXkgYXJlIEFycmF5XG4gIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgIGFycmF5ID0gdHJ1ZTtcbiAgICBicmFjZXMgPSBbJ1snLCAnXSddO1xuICB9XG5cbiAgLy8gTWFrZSBmdW5jdGlvbnMgc2F5IHRoYXQgdGhleSBhcmUgZnVuY3Rpb25zXG4gIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgIHZhciBuID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgYmFzZSA9ICcgW0Z1bmN0aW9uJyArIG4gKyAnXSc7XG4gIH1cblxuICAvLyBNYWtlIFJlZ0V4cHMgc2F5IHRoYXQgdGhleSBhcmUgUmVnRXhwc1xuICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGRhdGVzIHdpdGggcHJvcGVydGllcyBmaXJzdCBzYXkgdGhlIGRhdGVcbiAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgRGF0ZS5wcm90b3R5cGUudG9VVENTdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGVycm9yIHdpdGggbWVzc2FnZSBmaXJzdCBzYXkgdGhlIGVycm9yXG4gIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICBpZiAoa2V5cy5sZW5ndGggPT09IDAgJiYgKCFhcnJheSB8fCB2YWx1ZS5sZW5ndGggPT0gMCkpIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArIGJyYWNlc1sxXTtcbiAgfVxuXG4gIGlmIChyZWN1cnNlVGltZXMgPCAwKSB7XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbT2JqZWN0XScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG5cbiAgY3R4LnNlZW4ucHVzaCh2YWx1ZSk7XG5cbiAgdmFyIG91dHB1dDtcbiAgaWYgKGFycmF5KSB7XG4gICAgb3V0cHV0ID0gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cyk7XG4gIH0gZWxzZSB7XG4gICAgb3V0cHV0ID0ga2V5cy5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSk7XG4gICAgfSk7XG4gIH1cblxuICBjdHguc2Vlbi5wb3AoKTtcblxuICByZXR1cm4gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKSB7XG4gIGlmIChpc1VuZGVmaW5lZCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCd1bmRlZmluZWQnLCAndW5kZWZpbmVkJyk7XG4gIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICB2YXIgc2ltcGxlID0gJ1xcJycgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkucmVwbGFjZSgvXlwifFwiJC9nLCAnJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJykgKyAnXFwnJztcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoc2ltcGxlLCAnc3RyaW5nJyk7XG4gIH1cbiAgaWYgKGlzTnVtYmVyKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ251bWJlcicpO1xuICBpZiAoaXNCb29sZWFuKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ2Jvb2xlYW4nKTtcbiAgLy8gRm9yIHNvbWUgcmVhc29uIHR5cGVvZiBudWxsIGlzIFwib2JqZWN0XCIsIHNvIHNwZWNpYWwgY2FzZSBoZXJlLlxuICBpZiAoaXNOdWxsKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ251bGwnLCAnbnVsbCcpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEVycm9yKHZhbHVlKSB7XG4gIHJldHVybiAnWycgKyBFcnJvci5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgKyAnXSc7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cykge1xuICB2YXIgb3V0cHV0ID0gW107XG4gIGZvciAodmFyIGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYgKGhhc093blByb3BlcnR5KHZhbHVlLCBTdHJpbmcoaSkpKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIFN0cmluZyhpKSwgdHJ1ZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXQucHVzaCgnJyk7XG4gICAgfVxuICB9XG4gIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBpZiAoIWtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAga2V5LCB0cnVlKSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KSB7XG4gIHZhciBuYW1lLCBzdHIsIGRlc2M7XG4gIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHZhbHVlLCBrZXkpIHx8IHsgdmFsdWU6IHZhbHVlW2tleV0gfTtcbiAgaWYgKGRlc2MuZ2V0KSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlci9TZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoIWhhc093blByb3BlcnR5KHZpc2libGVLZXlzLCBrZXkpKSB7XG4gICAgbmFtZSA9ICdbJyArIGtleSArICddJztcbiAgfVxuICBpZiAoIXN0cikge1xuICAgIGlmIChjdHguc2Vlbi5pbmRleE9mKGRlc2MudmFsdWUpIDwgMCkge1xuICAgICAgaWYgKGlzTnVsbChyZWN1cnNlVGltZXMpKSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIHJlY3Vyc2VUaW1lcyAtIDEpO1xuICAgICAgfVxuICAgICAgaWYgKHN0ci5pbmRleE9mKCdcXG4nKSA+IC0xKSB7XG4gICAgICAgIGlmIChhcnJheSkge1xuICAgICAgICAgIHN0ciA9IHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKS5zdWJzdHIoMik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3RyID0gJ1xcbicgKyBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbQ2lyY3VsYXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKGlzVW5kZWZpbmVkKG5hbWUpKSB7XG4gICAgaWYgKGFycmF5ICYmIGtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuICAgIG5hbWUgPSBKU09OLnN0cmluZ2lmeSgnJyArIGtleSk7XG4gICAgaWYgKG5hbWUubWF0Y2goL15cIihbYS16QS1aX11bYS16QS1aXzAtOV0qKVwiJC8pKSB7XG4gICAgICBuYW1lID0gbmFtZS5zdWJzdHIoMSwgbmFtZS5sZW5ndGggLSAyKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnbmFtZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvKF5cInxcIiQpL2csIFwiJ1wiKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnc3RyaW5nJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5hbWUgKyAnOiAnICsgc3RyO1xufVxuXG5cbmZ1bmN0aW9uIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKSB7XG4gIHZhciBudW1MaW5lc0VzdCA9IDA7XG4gIHZhciBsZW5ndGggPSBvdXRwdXQucmVkdWNlKGZ1bmN0aW9uKHByZXYsIGN1cikge1xuICAgIG51bUxpbmVzRXN0Kys7XG4gICAgaWYgKGN1ci5pbmRleE9mKCdcXG4nKSA+PSAwKSBudW1MaW5lc0VzdCsrO1xuICAgIHJldHVybiBwcmV2ICsgY3VyLnJlcGxhY2UoL1xcdTAwMWJcXFtcXGRcXGQ/bS9nLCAnJykubGVuZ3RoICsgMTtcbiAgfSwgMCk7XG5cbiAgaWYgKGxlbmd0aCA+IDYwKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArXG4gICAgICAgICAgIChiYXNlID09PSAnJyA/ICcnIDogYmFzZSArICdcXG4gJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBvdXRwdXQuam9pbignLFxcbiAgJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBicmFjZXNbMV07XG4gIH1cblxuICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArICcgJyArIG91dHB1dC5qb2luKCcsICcpICsgJyAnICsgYnJhY2VzWzFdO1xufVxuXG5cbi8vIE5PVEU6IFRoZXNlIHR5cGUgY2hlY2tpbmcgZnVuY3Rpb25zIGludGVudGlvbmFsbHkgZG9uJ3QgdXNlIGBpbnN0YW5jZW9mYFxuLy8gYmVjYXVzZSBpdCBpcyBmcmFnaWxlIGFuZCBjYW4gYmUgZWFzaWx5IGZha2VkIHdpdGggYE9iamVjdC5jcmVhdGUoKWAuXG5mdW5jdGlvbiBpc0FycmF5KGFyKSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KGFyKTtcbn1cbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5cbmZ1bmN0aW9uIGlzQm9vbGVhbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJztcbn1cbmV4cG9ydHMuaXNCb29sZWFuID0gaXNCb29sZWFuO1xuXG5mdW5jdGlvbiBpc051bGwoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbCA9IGlzTnVsbDtcblxuZnVuY3Rpb24gaXNOdWxsT3JVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsT3JVbmRlZmluZWQgPSBpc051bGxPclVuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlcjtcblxuZnVuY3Rpb24gaXNTdHJpbmcoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3RyaW5nJztcbn1cbmV4cG9ydHMuaXNTdHJpbmcgPSBpc1N0cmluZztcblxuZnVuY3Rpb24gaXNTeW1ib2woYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3ltYm9sJztcbn1cbmV4cG9ydHMuaXNTeW1ib2wgPSBpc1N5bWJvbDtcblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbmV4cG9ydHMuaXNVbmRlZmluZWQgPSBpc1VuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNSZWdFeHAocmUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KHJlKSAmJiBvYmplY3RUb1N0cmluZyhyZSkgPT09ICdbb2JqZWN0IFJlZ0V4cF0nO1xufVxuZXhwb3J0cy5pc1JlZ0V4cCA9IGlzUmVnRXhwO1xuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdDtcblxuZnVuY3Rpb24gaXNEYXRlKGQpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGQpICYmIG9iamVjdFRvU3RyaW5nKGQpID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5leHBvcnRzLmlzRGF0ZSA9IGlzRGF0ZTtcblxuZnVuY3Rpb24gaXNFcnJvcihlKSB7XG4gIHJldHVybiBpc09iamVjdChlKSAmJlxuICAgICAgKG9iamVjdFRvU3RyaW5nKGUpID09PSAnW29iamVjdCBFcnJvcl0nIHx8IGUgaW5zdGFuY2VvZiBFcnJvcik7XG59XG5leHBvcnRzLmlzRXJyb3IgPSBpc0Vycm9yO1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG5cbmZ1bmN0aW9uIGlzUHJpbWl0aXZlKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnYm9vbGVhbicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdudW1iZXInIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3RyaW5nJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCcgfHwgIC8vIEVTNiBzeW1ib2xcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICd1bmRlZmluZWQnO1xufVxuZXhwb3J0cy5pc1ByaW1pdGl2ZSA9IGlzUHJpbWl0aXZlO1xuXG5leHBvcnRzLmlzQnVmZmVyID0gcmVxdWlyZSgnLi9zdXBwb3J0L2lzQnVmZmVyJyk7XG5cbmZ1bmN0aW9uIG9iamVjdFRvU3RyaW5nKG8pIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKTtcbn1cblxuXG5mdW5jdGlvbiBwYWQobikge1xuICByZXR1cm4gbiA8IDEwID8gJzAnICsgbi50b1N0cmluZygxMCkgOiBuLnRvU3RyaW5nKDEwKTtcbn1cblxuXG52YXIgbW9udGhzID0gWydKYW4nLCAnRmViJywgJ01hcicsICdBcHInLCAnTWF5JywgJ0p1bicsICdKdWwnLCAnQXVnJywgJ1NlcCcsXG4gICAgICAgICAgICAgICdPY3QnLCAnTm92JywgJ0RlYyddO1xuXG4vLyAyNiBGZWIgMTY6MTk6MzRcbmZ1bmN0aW9uIHRpbWVzdGFtcCgpIHtcbiAgdmFyIGQgPSBuZXcgRGF0ZSgpO1xuICB2YXIgdGltZSA9IFtwYWQoZC5nZXRIb3VycygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0TWludXRlcygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0U2Vjb25kcygpKV0uam9pbignOicpO1xuICByZXR1cm4gW2QuZ2V0RGF0ZSgpLCBtb250aHNbZC5nZXRNb250aCgpXSwgdGltZV0uam9pbignICcpO1xufVxuXG5cbi8vIGxvZyBpcyBqdXN0IGEgdGhpbiB3cmFwcGVyIHRvIGNvbnNvbGUubG9nIHRoYXQgcHJlcGVuZHMgYSB0aW1lc3RhbXBcbmV4cG9ydHMubG9nID0gZnVuY3Rpb24oKSB7XG4gIGNvbnNvbGUubG9nKCclcyAtICVzJywgdGltZXN0YW1wKCksIGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cykpO1xufTtcblxuXG4vKipcbiAqIEluaGVyaXQgdGhlIHByb3RvdHlwZSBtZXRob2RzIGZyb20gb25lIGNvbnN0cnVjdG9yIGludG8gYW5vdGhlci5cbiAqXG4gKiBUaGUgRnVuY3Rpb24ucHJvdG90eXBlLmluaGVyaXRzIGZyb20gbGFuZy5qcyByZXdyaXR0ZW4gYXMgYSBzdGFuZGFsb25lXG4gKiBmdW5jdGlvbiAobm90IG9uIEZ1bmN0aW9uLnByb3RvdHlwZSkuIE5PVEU6IElmIHRoaXMgZmlsZSBpcyB0byBiZSBsb2FkZWRcbiAqIGR1cmluZyBib290c3RyYXBwaW5nIHRoaXMgZnVuY3Rpb24gbmVlZHMgdG8gYmUgcmV3cml0dGVuIHVzaW5nIHNvbWUgbmF0aXZlXG4gKiBmdW5jdGlvbnMgYXMgcHJvdG90eXBlIHNldHVwIHVzaW5nIG5vcm1hbCBKYXZhU2NyaXB0IGRvZXMgbm90IHdvcmsgYXNcbiAqIGV4cGVjdGVkIGR1cmluZyBib290c3RyYXBwaW5nIChzZWUgbWlycm9yLmpzIGluIHIxMTQ5MDMpLlxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gd2hpY2ggbmVlZHMgdG8gaW5oZXJpdCB0aGVcbiAqICAgICBwcm90b3R5cGUuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBzdXBlckN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gdG8gaW5oZXJpdCBwcm90b3R5cGUgZnJvbS5cbiAqL1xuZXhwb3J0cy5pbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5cbmV4cG9ydHMuX2V4dGVuZCA9IGZ1bmN0aW9uKG9yaWdpbiwgYWRkKSB7XG4gIC8vIERvbid0IGRvIGFueXRoaW5nIGlmIGFkZCBpc24ndCBhbiBvYmplY3RcbiAgaWYgKCFhZGQgfHwgIWlzT2JqZWN0KGFkZCkpIHJldHVybiBvcmlnaW47XG5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhZGQpO1xuICB2YXIgaSA9IGtleXMubGVuZ3RoO1xuICB3aGlsZSAoaS0tKSB7XG4gICAgb3JpZ2luW2tleXNbaV1dID0gYWRkW2tleXNbaV1dO1xuICB9XG4gIHJldHVybiBvcmlnaW47XG59O1xuXG5mdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApO1xufVxuIiwiLypcbiAqIENvcHlyaWdodCA6IFBhcnRuZXJpbmcgMy4wICgyMDA3LTIwMTYpXG4gKiBBdXRob3IgOiBTeWx2YWluIE1haMOpIDxzeWx2YWluLm1haGVAcGFydG5lcmluZy5mcj5cbiAqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiBkaXlhLXNkay5cbiAqXG4gKiBkaXlhLXNkayBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb24sIGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBkaXlhLXNkayBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZVxuICogYWxvbmcgd2l0aCBkaXlhLXNkay4gIElmIG5vdCwgc2VlIDxodHRwOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG5cblxuXG5cbi8qIG1heWEtY2xpZW50XG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQsIFBhcnRuZXJpbmcgUm9ib3RpY3MsIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGxpYnJhcnkgaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yXG4gKiBtb2RpZnkgaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyB2ZXJzaW9uXG4gKlx0My4wIG9mIHRoZSBMaWNlbnNlLiBUaGlzIGxpYnJhcnkgaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGVcbiAqIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuXG4gKiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSXG4gKiBQVVJQT1NFLiBTZWUgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpY1xuICogTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgbGlicmFyeS5cbiAqL1xuXG5cbihmdW5jdGlvbiAoKSB7XG5cdGNvbnN0IGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgnaWVxJyk7XG5cdHZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpO1xuXHR2YXIgV2F0Y2hlciA9IHJlcXVpcmUoJy4vd2F0Y2hlci5qcycpO1xuXHR2YXIgZm9ybWF0VGltZSA9IHJlcXVpcmUoJy4vdGltZWNvbnRyb2wuanMnKS5mb3JtYXRUaW1lO1xuXG5cdGxldCBEaXlhU2VsZWN0b3I7XG5cdHRyeSB7XG5cdFx0Ly8gRm9yIGJyb3dzZXJzIC0gZDEgYWxyZWFkeSBkZWZpbmVkXG5cdFx0RGl5YVNlbGVjdG9yID0gZDEuRGl5YVNlbGVjdG9yO1xuXHR9XG5cdGNhdGNoIChlcnJvcikge1xuXHRcdGlmIChlcnJvci5uYW1lID09PSAnUmVmZXJlbmNlRXJyb3InKSB7XG5cdFx0XHQvLyBGb3Igbm9kZWpzIC0gZGVmaW5lIGQxXG5cdFx0XHRjb25zdCBkMSA9IHJlcXVpcmUoJ2RpeWEtc2RrJyk7XG5cdFx0XHREaXlhU2VsZWN0b3IgPSBkMS5EaXlhU2VsZWN0b3I7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRocm93IGVycm9yO1xuXHRcdH1cblx0fVxuXG5cdCd1c2Ugc3RyaWN0JztcblxuXG5cblxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXHQvLy8vLy8vLy8vLy8vLy8vLy8vIExvZ2dpbmcgdXRpbGl0eSBtZXRob2RzIC8vLy8vLy8vLy8vLy8vLy8vL1xuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cdC8qKlxuXHQgKiBJRVEgQVBJIGhhbmRsZXJcblx0ICovXG5cdGZ1bmN0aW9uIElFUShzZWxlY3Rvcikge1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHR0aGlzLnNlbGVjdG9yID0gc2VsZWN0b3I7XG5cdFx0dGhpcy5kYXRhTW9kZWwgPSB7fTtcblx0XHR0aGlzLl9jb2RlciA9IHNlbGVjdG9yLmVuY29kZSgpO1xuXHRcdHRoaXMud2F0Y2hlcnMgPSBbXTtcblxuXHRcdC8qKiogc3RydWN0dXJlIG9mIGRhdGEgY29uZmlnLiBbXSBtZWFucyBkZWZhdWx0IHZhbHVlICoqKlxuXHRcdFx0IGNyaXRlcmlhIDpcblx0XHRcdCAgIHRpbWU6IGFsbCAzIHRpbWUgY3JpdGVyaWEgc2hvdWxkIG5vdCBiZSBkZWZpbmVkIGF0IHRoZSBzYW1lIHRpbWUuIChyYW5nZSB3b3VsZCBiZSBnaXZlbiB1cCkgW1VzYWdlIDogc3RhcnQgKyBlbmQsIG9yIHN0YXJ0ICsgcmFuZ2UsIG9yIGVuZCArIHJhbmdlXVxuXHRcdFx0ICAgICBzdGFydDoge1tudWxsXSx0aW1lfSAobnVsbCBtZWFucyBtb3N0IHJlY2VudCkgLy8gc3RvcmVkIGEgVVRDIGluIG1zIChudW0pXG5cdFx0XHQgICAgIGVuZDoge1tudWxsXSwgdGltZX0gKG51bGwgbWVhbnMgbW9zdCBvbGRlc3QpIC8vIHN0b3JlZCBhcyBVVEMgaW4gbXMgKG51bSlcblx0XHRcdCAgICAgcmFuZ2U6IHtbbnVsbF0sIHRpbWV9IChyYW5nZSBvZiB0aW1lKHBvc2l0aXZlKSApIC8vIGluIHMgKG51bSlcblx0XHRcdCAgICAgc2FtcGxpbmc6IHtbbnVsbF0gb3IgU3RyaW5nfSBpdCBjb3VsZCBiZSBcInNlY29uZFwiLCBcIm1pbnV0ZVwiLCBcIndlZWtcIiwgXCJtb250aFwiLCBcInllYXJcIiAtIG1heGltaXplZCBzZXJ2ZXIgc2lkZSB0byAxMGsgc2FtcGxlcyBieSBzZWN1cml0eVxuXHRcdFx0ICAgcm9ib3RzOiB7QXJyYXlPZiBJRCBvciBbXCJhbGxcIl19XG5cdFx0XHQgICBwbGFjZXM6IHtBcnJheU9mIElEIG9yIFtcImFsbFwiXX1cblx0XHRcdCBvcGVyYXRvcjoge1tsYXN0XSwgbWF4LCBtb3ksIHNkfSAtIGRlcHJlY2F0ZWRcblx0XHRcdCAuLi5cblxuXHRcdFx0IHNlbnNvcnMgOiB7W251bGxdIG9yIEFycmF5T2YgU2Vuc29yTmFtZX1cblx0XHQqL1xuXHRcdHRoaXMuZGF0YUNvbmZpZyA9IHtcblx0XHRcdGNyaXRlcmlhOiB7XG5cdFx0XHRcdHRpbWU6IHtcblx0XHRcdFx0XHRzdGFydDogbnVsbCxcblx0XHRcdFx0XHRlbmQ6IG51bGwsXG5cdFx0XHRcdFx0cmFuZ2U6IG51bGwgLy8gaW4gc1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRyb2JvdHM6IG51bGwsXG5cdFx0XHRcdHBsYWNlczogbnVsbFxuXHRcdFx0fSxcblx0XHRcdG9wZXJhdG9yOiAnbGFzdCcsXG5cdFx0XHRzZW5zb3JzOiBudWxsLFxuXHRcdFx0c2FtcGxpbmc6IG51bGwgLy9zYW1wbGluZ1xuXHRcdH07XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXHQvKipcblx0ICogR2V0IGRhdGFNb2RlbCA6XG5cdCAqIHtcblx0ICpcdFwic2Vuc2V1clhYXCI6IHtcblx0ICpcdFx0XHRkYXRhOltGTE9BVCwgLi4uXSxcblx0ICpcdFx0XHR0aW1lOltGTE9BVCwgLi4uXSxcblx0ICpcdFx0XHRyb2JvdHM6W0ZMT0FULCAuLi5dLFxuXHQgKlx0XHRcdHBsYWNlczpbRkxPQVQsIC4uLl0sXG5cdCAqXHRcdFx0cXVhbGl0eUluZGV4OltGTE9BVCwgLi4uXSxcblx0ICpcdFx0XHRyYW5nZTogW0ZMT0FULCBGTE9BVF0sXG5cdCAqXHRcdFx0dW5pdDogc3RyaW5nLFxuXHQgKlx0XHRsYWJlbDogc3RyaW5nXG5cdCAqXHRcdH0sXG5cdCAqXHQgLi4uIChcInNlbnNldXJzWVlcIilcblx0ICogfVxuXHQgKi9cblx0SUVRLnByb3RvdHlwZS5nZXREYXRhTW9kZWwgPSBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuZGF0YU1vZGVsO1xuXHR9O1xuXHRJRVEucHJvdG90eXBlLmdldERhdGFSYW5nZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5kYXRhTW9kZWwucmFuZ2U7XG5cdH07XG5cblx0LyoqXG5cdCAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhQ29uZmlnIGNvbmZpZyBmb3IgZGF0YSByZXF1ZXN0XG5cdCAqIGlmIGRhdGFDb25maWcgaXMgZGVmaW5lIDogc2V0IGFuZCByZXR1cm4gdGhpc1xuXHQgKlx0IEByZXR1cm4ge0lFUX0gdGhpc1xuXHQgKiBlbHNlXG5cdCAqXHQgQHJldHVybiB7T2JqZWN0fSBjdXJyZW50IGRhdGFDb25maWdcblx0ICovXG5cdElFUS5wcm90b3R5cGUuRGF0YUNvbmZpZyA9IGZ1bmN0aW9uIChuZXdEYXRhQ29uZmlnKSB7XG5cdFx0aWYgKG5ld0RhdGFDb25maWcgIT0gbnVsbCkge1xuXHRcdFx0dGhpcy5kYXRhQ29uZmlnID1uZXdEYXRhQ29uZmlnO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLmRhdGFDb25maWc7XG5cdFx0fVxuXHR9O1xuXHQvKipcblx0ICogVE8gQkUgSU1QTEVNRU5URUQgOiBvcGVyYXRvciBtYW5hZ2VtZW50IGluIEROLUlFUVxuXHQgKiBAcGFyYW0gIHtTdHJpbmd9XHQgbmV3T3BlcmF0b3IgOiB7W2xhc3RdLCBtYXgsIG1veSwgc2R9XG5cdCAqIEByZXR1cm4ge0lFUX0gdGhpcyAtIGNoYWluYWJsZVxuXHQgKiBTZXQgb3BlcmF0b3IgY3JpdGVyaWEuXG5cdCAqIERlcGVuZHMgb24gbmV3T3BlcmF0b3Jcblx0ICpcdEBwYXJhbSB7U3RyaW5nfSBuZXdPcGVyYXRvclxuXHQgKlx0QHJldHVybiB0aGlzXG5cdCAqIEdldCBvcGVyYXRvciBjcml0ZXJpYS5cblx0ICpcdEByZXR1cm4ge1N0cmluZ30gb3BlcmF0b3Jcblx0ICovXG5cdElFUS5wcm90b3R5cGUuRGF0YU9wZXJhdG9yID0gZnVuY3Rpb24gKG5ld09wZXJhdG9yKSB7XG5cdFx0aWYgKG5ld09wZXJhdG9yICE9IG51bGwpIHtcblx0XHRcdHRoaXMuZGF0YUNvbmZpZy5vcGVyYXRvciA9IG5ld09wZXJhdG9yO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLmRhdGFDb25maWcub3BlcmF0b3I7XG5cdFx0fVxuXHR9O1xuXHQvKipcblx0ICogRGVwZW5kcyBvbiBudW1TYW1wbGVzXG5cdCAqIEBwYXJhbSB7aW50fSBudW1iZXIgb2Ygc2FtcGxlcyBpbiBkYXRhTW9kZWxcblx0ICogaWYgZGVmaW5lZCA6IHNldCBudW1iZXIgb2Ygc2FtcGxlc1xuXHQgKlx0QHJldHVybiB7SUVRfSB0aGlzXG5cdCAqIGVsc2Vcblx0ICpcdEByZXR1cm4ge2ludH0gbnVtYmVyIG9mIHNhbXBsZXNcblx0ICoqL1xuXHRJRVEucHJvdG90eXBlLkRhdGFTYW1wbGluZyA9IGZ1bmN0aW9uIChudW1TYW1wbGVzKSB7XG5cdFx0aWYgKG51bVNhbXBsZXMgIT0gbnVsbCkge1xuXHRcdFx0dGhpcy5kYXRhQ29uZmlnLnNhbXBsaW5nID0gbnVtU2FtcGxlcztcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5kYXRhQ29uZmlnLnNhbXBsaW5nO1xuXHRcdH1cblx0fTtcblx0LyoqXG5cdCAqIFNldCBvciBnZXQgZGF0YSB0aW1lIGNyaXRlcmlhIHN0YXJ0IGFuZCBlbmQuXG5cdCAqIElmIHBhcmFtIGRlZmluZWRcblx0ICpcdEBwYXJhbSB7RGF0ZX0gbmV3VGltZVN0YXJ0IC8vIG1heSBiZSBudWxsXG5cdCAqXHRAcGFyYW0ge0RhdGV9IG5ld1RpbWVFbmQgLy8gbWF5IGJlIG51bGxcblx0ICpcdEByZXR1cm4ge0lFUX0gdGhpc1xuXHQgKiBJZiBubyBwYXJhbSBkZWZpbmVkOlxuXHQgKlx0QHJldHVybiB7T2JqZWN0fSBUaW1lIG9iamVjdDogZmllbGRzIHN0YXJ0IGFuZCBlbmQuXG5cdCAqL1xuXHRJRVEucHJvdG90eXBlLkRhdGFUaW1lID0gZnVuY3Rpb24gKG5ld1RpbWVTdGFydCwgbmV3VGltZUVuZCwgbmV3UmFuZ2UpIHtcblx0XHRpZiAobmV3VGltZVN0YXJ0ICE9IG51bGwgfHwgbmV3VGltZUVuZCAhPSBudWxsIHx8IG5ld1JhbmdlICE9IG51bGwpIHtcblx0XHRcdHRoaXMuZGF0YUNvbmZpZy5jcml0ZXJpYS50aW1lLnN0YXJ0ID0gZm9ybWF0VGltZShuZXdUaW1lU3RhcnQpO1xuXHRcdFx0dGhpcy5kYXRhQ29uZmlnLmNyaXRlcmlhLnRpbWUuZW5kID0gZm9ybWF0VGltZShuZXdUaW1lRW5kKTtcblx0XHRcdHRoaXMuZGF0YUNvbmZpZy5jcml0ZXJpYS50aW1lLnJhbmdlID0gbmV3UmFuZ2U7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0c3RhcnQ6IG5ldyBEYXRlKHRoaXMuZGF0YUNvbmZpZy5jcml0ZXJpYS50aW1lLnN0YXJ0KSxcblx0XHRcdFx0ZW5kOiBuZXcgRGF0ZSh0aGlzLmRhdGFDb25maWcuY3JpdGVyaWEudGltZS5lbmQpLFxuXHRcdFx0XHRyYW5nZTogbmV3IERhdGUodGhpcy5kYXRhQ29uZmlnLmNyaXRlcmlhLnRpbWUucmFuZ2UpXG5cdFx0XHR9O1xuXHRcdH1cblx0fTtcblx0LyoqXG5cdCAqIERlcGVuZHMgb24gcm9ib3RJZHNcblx0ICogU2V0IHJvYm90cyBjcml0ZXJpYS5cblx0ICpcdEBwYXJhbSB7QXJyYXlbSW50XX0gcm9ib3RJZHMgbGlzdCBvZiByb2JvdHMgSWRzXG5cdCAqIEdldCByb2JvdHMgY3JpdGVyaWEuXG5cdCAqXHRAcmV0dXJuIHtBcnJheVtJbnRdfSBsaXN0IG9mIHJvYm90cyBJZHNcblx0ICovXG5cdElFUS5wcm90b3R5cGUuRGF0YVJvYm90SWRzID0gZnVuY3Rpb24gKHJvYm90SWRzKSB7XG5cdFx0aWYgKHJvYm90SWRzICE9IG51bGwpIHtcblx0XHRcdHRoaXMuZGF0YUNvbmZpZy5jcml0ZXJpYS5yb2JvdHMgPSByb2JvdElkcztcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5kYXRhQ29uZmlnLmNyaXRlcmlhLnJvYm90cztcblx0XHR9XG5cdH07XG5cdC8qKlxuXHQgKiBEZXBlbmRzIG9uIHBsYWNlSWRzXG5cdCAqIFNldCBwbGFjZXMgY3JpdGVyaWEuXG5cdCAqXHRAcGFyYW0ge0FycmF5W0ludF19IHBsYWNlSWRzIGxpc3Qgb2YgcGxhY2VzIElkc1xuXHQgKiBHZXQgcGxhY2VzIGNyaXRlcmlhLlxuXHQgKlx0QHJldHVybiB7QXJyYXlbSW50XX0gbGlzdCBvZiBwbGFjZXMgSWRzXG5cdCAqL1xuXHRJRVEucHJvdG90eXBlLkRhdGFQbGFjZUlkcyA9IGZ1bmN0aW9uIChwbGFjZUlkcykge1xuXHRcdGlmIChwbGFjZUlkcyAhPSBudWxsKSB7XG5cdFx0XHR0aGlzLmRhdGFDb25maWcuY3JpdGVyaWEucGxhY2VJZCA9IHBsYWNlSWRzO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXHRcdGVsc2Vcblx0XHRcdHJldHVybiB0aGlzLmRhdGFDb25maWcuY3JpdGVyaWEucGxhY2VzO1xuXHR9O1xuXHQvKipcblx0ICogR2V0IGRhdGEgYnkgc2Vuc29yIG5hbWUuXG5cdCAqXHRAcGFyYW0ge0FycmF5W1N0cmluZ119IHNlbnNvck5hbWUgbGlzdCBvZiBzZW5zb3JzXG5cdCAqL1xuXG5cblxuXHRJRVEucHJvdG90eXBlLmdldERhdGFCeU5hbWUgPSBmdW5jdGlvbiAoc2Vuc29yTmFtZXMpIHtcblx0XHR2YXIgZGF0YT1bXTtcblx0XHRmb3IodmFyIG4gaW4gc2Vuc29yTmFtZXMpIHtcblx0XHRcdGRhdGEucHVzaCh0aGlzLmRhdGFNb2RlbFtzZW5zb3JOYW1lc1tuXV0pO1xuXHRcdH1cblx0XHRyZXR1cm4gZGF0YTtcblx0fTtcblxuXHQvKipcblx0ICogVXBkYXRlIGRhdGEgZ2l2ZW4gZGF0YUNvbmZpZy5cblx0ICogQHBhcmFtIHtmdW5jfSBjYWxsYmFjayA6IGNhbGxlZCBhZnRlciB1cGRhdGVcblx0ICogQHBhcmFtIHtvYmplY3R9IGRhdGFDb25maWc6IGRhdGEgdG8gY29uZmlnIHJlcXVlc3Rcblx0ICogVE9ETyBVU0UgUFJPTUlTRVxuXHQgKi9cblxuXHRJRVEucHJvdG90eXBlLnVwZGF0ZURhdGEgPSBmdW5jdGlvbiAoY2FsbGJhY2ssIGRhdGFDb25maWcpIHtcblx0XHR0aGlzLl91cGRhdGVEYXRhKGNhbGxiYWNrLCBkYXRhQ29uZmlnLCBcIkRhdGFSZXF1ZXN0XCIpXG5cdH07XG5cblx0LyoqXG5cdCAqIFVwZGF0ZSBkYXRhIGdpdmVuIGRhdGFDb25maWcuXG5cdCAqIEBwYXJhbSB7ZnVuY30gY2FsbGJhY2sgOiBjYWxsZWQgYWZ0ZXIgdXBkYXRlXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhQ29uZmlnOiBkYXRhIHRvIGNvbmZpZyByZXF1ZXN0XG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBmdW5jTmFtZTogbmFtZSBvZiByZXF1ZXN0ZWQgZnVuY3Rpb24gaW4gZGl5YS1ub2RlLWllcS4gRGVmYXVsdDogXCJEYXRhUmVxdWVzdFwiLlxuXHQgKiBUT0RPIFVTRSBQUk9NSVNFXG5cdCAqL1xuXG5cdElFUS5wcm90b3R5cGUuX3VwZGF0ZURhdGEgPSBmdW5jdGlvbiAoY2FsbGJhY2ssIGRhdGFDb25maWcsIGZ1bmNOYW1lKSB7XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdGlmIChkYXRhQ29uZmlnKVxuXHRcdFx0dGhpcy5EYXRhQ29uZmlnKGRhdGFDb25maWcpO1xuXG5cdFx0dGhpcy5zZWxlY3Rvci5yZXF1ZXN0KHtcblx0XHRcdHNlcnZpY2U6IFwiaWVxXCIsXG5cdFx0XHRmdW5jOiBmdW5jTmFtZSxcblx0XHRcdGRhdGE6IHtkYXRhOiBKU09OLnN0cmluZ2lmeSh0aGF0LmRhdGFDb25maWcpfSxcdFx0Ly9cdHR5cGU6XCJzcGxSZXFcIixcblx0XHRcdG9iajp7XG5cdFx0XHRcdHBhdGg6ICcvZnIvcGFydG5lcmluZy9JZXEnLFxuXHRcdFx0XHRpbnRlcmZhY2U6IFwiZnIucGFydG5lcmluZy5JZXFcIlxuXHRcdFx0fVxuXHRcdH0sIGZ1bmN0aW9uIChkbklkLCBlcnIsIGRhdGEpIHtcblx0XHRcdGRhdGEgPSBKU09OLnBhcnNlKGRhdGEpO1xuXHRcdFx0aWYgKGVyciAhPSBudWxsKSB7XG5cdFx0XHRcdGlmICh0eXBlb2YgZXJyID09IFwic3RyaW5nXCIpIGRlYnVnKFwiUmVjdiBlcnI6IFwiKyBlcnIpO1xuXHRcdFx0XHRlbHNlIGlmICh0eXBlb2YgZXJyID09IFwib2JqZWN0XCIgJiYgdHlwZW9mIGVyci5uYW1lID09ICdzdHJpbmcnKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2sobnVsbCwgZXJyLm5hbWUpO1xuXHRcdFx0XHRcdGlmICh0eXBlb2YgZXJyLm1lc3NhZ2U9PVwic3RyaW5nXCIpIGRlYnVnKGVyci5tZXNzYWdlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRjYWxsYmFjayh0aGF0Ll9nZXREYXRhTW9kZWxGcm9tUmVjdihkYXRhKSk7IC8vIGNhbGxiYWNrIGZ1bmNcblx0XHR9KTtcblx0fTtcblxuXHRJRVEucHJvdG90eXBlLl9pc0RhdGFNb2RlbFdpdGhOYU4gPSBmdW5jdGlvbiAoKSB7XG5cdFx0dmFyIGRhdGFNb2RlbE5hTj1mYWxzZTtcblx0XHR2YXIgc2Vuc29yTmFuO1xuXHRcdGZvcih2YXIgbiBpbiB0aGlzLmRhdGFNb2RlbCkge1xuXHRcdFx0c2Vuc29yTmFuID0gdGhpcy5kYXRhTW9kZWxbbl0uZGF0YS5yZWR1Y2UoZnVuY3Rpb24gKG5hblByZXMsIGQpIHtcblx0XHRcdFx0cmV0dXJuIG5hblByZXMgJiYgaXNOYU4oZCk7XG5cdFx0XHR9LCBmYWxzZSk7XG5cdFx0XHRkYXRhTW9kZWxOYU4gPSBkYXRhTW9kZWxOYU4gJiYgc2Vuc29yTmFuO1xuXHRcdFx0ZGVidWcobitcIiB3aXRoIG5hbiA6IFwiK3NlbnNvck5hbitcIiAoXCIrZGF0YU1vZGVsTmFOK1wiKSAvIFwiK3RoaXMuZGF0YU1vZGVsW25dLmRhdGEubGVuZ3RoKTtcblx0XHR9XG5cdH07XG5cblx0SUVRLnByb3RvdHlwZS5nZXRDb25maW5lbWVudExldmVsID0gZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLmNvbmZpbmVtZW50O1xuXHR9O1xuXG5cdElFUS5wcm90b3R5cGUuZ2V0QWlyUXVhbGl0eUxldmVsID0gZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLmFpclF1YWxpdHk7XG5cdH07XG5cblx0SUVRLnByb3RvdHlwZS5nZXRFbnZRdWFsaXR5TGV2ZWwgPSBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuZW52UXVhbGl0eTtcblx0fTtcblxuXG5cblx0LyoqXG5cdCAqIFVwZGF0ZSBpbnRlcm5hbCBtb2RlbCB3aXRoIHJlY2VpdmVkIGRhdGFcblx0ICogQHBhcmFtICBjb25maWcgZGF0YSB0byBjb25maWd1cmUgc3Vic2NyaXB0aW9uXG5cdCAqIEBwYXJhbSAgY2FsbGJhY2sgY2FsbGVkIG9uIGFuc3dlcnMgKEBwYXJhbSA6IGRhdGFNb2RlbClcblx0ICogQHJldHVybiB3YXRjaGVyIGNyZWF0ZWQgd2F0Y2hlclxuXHQgKi9cblx0SUVRLnByb3RvdHlwZS53YXRjaCA9IGZ1bmN0aW9uIChjb25maWcsIGNhbGxiYWNrKSB7XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXG5cdFx0Ly8gZG8gbm90IGNyZWF0ZSB3YXRjaGVyIHdpdGhvdXQgYSBjYWxsYmFja1xuXHRcdGlmICggY2FsbGJhY2s9PW51bGwgfHwgdHlwZW9mIGNhbGxiYWNrICE9PSAnZnVuY3Rpb24nKSByZXR1cm4gbnVsbDtcblxuXHRcdGxldCB3YXRjaGVyID0gbmV3IFdhdGNoZXIodGhpcy5zZWxlY3RvciwgY29uZmlnKTtcblxuXHRcdC8vIGFkZCB3YXRjaGVyIGluIHdhdGNoZXIgbGlzdFxuXHRcdHRoaXMud2F0Y2hlcnMucHVzaCh3YXRjaGVyKTtcblxuXHRcdHdhdGNoZXIub24oJ2RhdGEnLCBkYXRhID0+IHtcblx0XHRcdGNhbGxiYWNrKHRoYXQuX2dldERhdGFNb2RlbEZyb21SZWN2KGRhdGEpKTtcblx0XHR9KTtcblx0XHR3YXRjaGVyLm9uKCdzdG9wJywgdGhpcy5fcmVtb3ZlV2F0Y2hlcik7XG5cblx0XHRyZXR1cm4gd2F0Y2hlcjtcblx0fTtcblxuXHQvKipcblx0ICogQ2FsbGJhY2sgdG8gcmVtb3ZlIHdhdGNoZXIgZnJvbSBsaXN0XG5cdCAqIEBwYXJhbSB3YXRjaGVyIHRvIGJlIHJlbW92ZWRcblx0ICovXG5cdElFUS5wcm90b3R5cGUuX3JlbW92ZVdhdGNoZXIgPSBmdW5jdGlvbiAod2F0Y2hlcikge1xuXHRcdC8vIGZpbmQgYW5kIHJlbW92ZSB3YXRjaGVyIGluIGxpc3Rcblx0XHR0aGlzLndhdGNoZXJzLmZpbmQoIChlbCwgaWQsIHdhdGNoZXJzKSA9PiB7XG5cdFx0XHRpZiAod2F0Y2hlciA9PT0gZWwpIHtcblx0XHRcdFx0d2F0Y2hlcnMuc3BsaWNlKGlkLCAxKTsgLy8gcmVtb3ZlXG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0pXG5cdH07XG5cblx0LyoqXG5cdCAqIFN0b3AgYWxsIHdhdGNoZXJzXG5cdCAqL1xuXHRJRVEucHJvdG90eXBlLmNsb3NlU3Vic2NyaXB0aW9ucyA9IGZ1bmN0aW9uICgpIHtcblx0XHRjb25zb2xlLndhcm4oJ0RlcHJlY2F0ZWQgZnVuY3Rpb24gdXNlIHN0b3BXYXRjaGVycyBpbnN0ZWFkJyk7XG5cdFx0dGhpcy5zdG9wV2F0Y2hlcnMoKTtcblx0fTtcblx0SUVRLnByb3RvdHlwZS5zdG9wV2F0Y2hlcnMgPSBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy53YXRjaGVycy5mb3JFYWNoKCB3YXRjaGVyID0+IHtcblx0XHRcdC8vIHJlbW92ZSBsaXN0ZW5lciBvbiBzdG9wIGV2ZW50IHRvIGF2b2lkIHB1cmdpbmcgd2F0Y2hlcnMgdHdpY2Vcblx0XHRcdHdhdGNoZXIucmVtb3ZlTGlzdGVuZXIoJ3N0b3AnLCB0aGlzLl9yZW1vdmVXYXRjaGVyKTtcblx0XHRcdHdhdGNoZXIuc3RvcCgpO1xuXHRcdH0pO1xuXHRcdHRoaXMud2F0Y2hlcnMgPVtdO1xuXHR9O1xuXG5cdC8qKlxuXHQqIFJlcXVlc3QgRGF0YSB0byBtYWtlIENTViBmaWxlXG5cdFx0KiBAcGFyYW0ge29iamVjdH0gY3N2Q29uZmlnIHBhcmFtczpcblx0XHQqIEBwYXJhbSB7bGlzdH0gY3N2Q29uZmlnLnNlbnNvck5hbWVzIDogbGlzdCBvZiBzZW5zb3IgYW5kIGluZGV4IG5hbWVzXG5cdFx0KiBAcGFyYW0ge251bWJlcn0gY3N2Q29uZmlnLl9zdGFydFRpbWU6IHRpbWVzdGFtcCBvZiBiZWdpbm5pbmcgdGltZVxuXHRcdCogQHBhcmFtIHtudW1iZXJ9IGNzdkNvbmZpZy5fZW5kVGltZTogdGltZXN0YW1wIG9mIGVuZCB0aW1lXG5cdFx0KiBAcGFyYW0ge3N0cmluZ30gY3N2Q29uZmlnLnRpbWVTYW1wbGU6IHRpbWVpbnRlcnZhbCBmb3IgZGF0YS4gUGFyYW1ldGVyczogXCJzZWNvbmRcIiwgXCJtaW51dGVcIiwgXCJob3VyXCIsIFwiZGF5XCIsIFwid2Vla1wiLCBcIm1vbnRoXCJcblx0XHQqIEBwYXJhbSB7bnVtYmVyfSBjc3ZDb25maWcuX25saW5lczogbWF4aW11bSBudW1iZXIgb2YgbGluZXMgcmVxdWVzdGVkXG5cdFx0KiBAcGFyYW0ge2NhbGxiYWNrfSBjYWxsYmFjazogY2FsbGVkIGFmdGVyIHVwZGF0ZSAoQHBhcmFtIHVybCB0byBkb3dubG9hZCBjc3YgZmlsZSlcblx0Ki9cblx0SUVRLnByb3RvdHlwZS5nZXRDU1ZEYXRhID0gZnVuY3Rpb24gKGNzdkNvbmZpZywgY2FsbGJhY2spIHtcblxuXHRcdHZhciB0aGF0ID0gdGhpcztcblxuXHRcdGlmIChjc3ZDb25maWcgJiYgdHlwZW9mIGNzdkNvbmZpZy5ubGluZXMgIT0gXCJudW1iZXJcIiApIGNzdkNvbmZpZy5ubGluZXMgPSB1bmRlZmluZWQ7XG5cdFx0aWYgKGNzdkNvbmZpZyAmJiB0eXBlb2YgY3N2Q29uZmlnLmxhbmcgIT0gXCJzdHJpbmdcIiApIGNzdkNvbmZpZy5sYW5nID0gdW5kZWZpbmVkO1xuXG5cdFx0dmFyIGRhdGFDb25maWcgPUpTT04uc3RyaW5naWZ5KHtcblx0XHRcdGNyaXRlcmlhOiB7XG5cdFx0XHRcdHRpbWU6IHsgc3RhcnQ6IGZvcm1hdFRpbWUoY3N2Q29uZmlnLnN0YXJ0VGltZSksIGVuZDogZm9ybWF0VGltZShjc3ZDb25maWcuZW5kVGltZSksIHNhbXBsaW5nOmNzdkNvbmZpZy50aW1lU2FtcGxlfSxcblx0XHRcdFx0cGxhY2VzOiBbXSxcblx0XHRcdFx0cm9ib3RzOiBbXVxuXHRcdFx0fSxcblx0XHRcdHNlbnNvcnM6IGNzdkNvbmZpZy5zZW5zb3JOYW1lcyxcblx0XHRcdHNhbXBsaW5nOiBjc3ZDb25maWcubmxpbmVzLFxuXHRcdFx0bGFuZzogY3N2Q29uZmlnLmxhbmdcblx0XHR9KTtcblxuXHRcdHRoaXMuc2VsZWN0b3IucmVxdWVzdCh7XG5cdFx0XHRzZXJ2aWNlOiBcImllcVwiLFxuXHRcdFx0ZnVuYzogXCJDc3ZEYXRhUmVxdWVzdFwiLFxuXHRcdFx0ZGF0YToge2RhdGE6IGRhdGFDb25maWd9LFxuXHRcdFx0Ly9cdHR5cGU6XCJzcGxSZXFcIixcblx0XHRcdG9iajp7XG5cdFx0XHRcdHBhdGg6ICcvZnIvcGFydG5lcmluZy9JZXEnLFxuXHRcdFx0XHRpbnRlcmZhY2U6IFwiZnIucGFydG5lcmluZy5JZXFcIlxuXHRcdFx0fVxuXHRcdH0sIGZ1bmN0aW9uIChkbklkLCBlcnIsIGRhdGEpIHtcblx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0aWYgKHR5cGVvZiBlcnIgPT1cInN0cmluZ1wiKSBkZWJ1ZyhcIlJlY3YgZXJyOiBcIisgZXJyKTtcblx0XHRcdFx0ZWxzZSBpZiAodHlwZW9mIGVyciA9PSBcIm9iamVjdFwiICYmIHR5cGVvZiBlcnIubmFtZSA9PSdzdHJpbmcnKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2sobnVsbCwgZXJyLm5hbWUpO1xuXHRcdFx0XHRcdGlmICh0eXBlb2YgZXJyLm1lc3NhZ2U9PVwic3RyaW5nXCIpIGRlYnVnKGVyci5tZXNzYWdlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRjYWxsYmFjayhkYXRhKTtcblx0XHR9KTtcblx0fTtcblxuXG5cblx0LyoqXG5cdCAqIFJlcXVlc3QgRGF0YSB0byBtYWtlIGRhdGEgbWFwXG5cdCAgKiBAcGFyYW0ge09iamVjdH0gZGF0YUNvbmZpZyBjb25maWcgZm9yIGRhdGEgcmVxdWVzdFxuXHQgICogQHBhcmFtIHtjYWxsYmFja30gY2FsbGJhY2s6IGNhbGxlZCBhZnRlciB1cGRhdGVcblx0ICAqL1xuXHRJRVEucHJvdG90eXBlLmdldERhdGFNYXBEYXRhID0gZnVuY3Rpb24gKGRhdGFDb25maWcsIGNhbGxiYWNrKSB7XG5cdFx0Y29uc29sZS53YXJuKCdUaGlzIGZ1bmN0aW9uIHdpbGwgYmUgZGVwcmVjYXRlZC4gUGxlYXNlIHVzZSBcImdldEllcURhdGFcIiBpbnN0ZWFkLicpO1xuXHRcdHRoaXMuZ2V0SWVxRGF0YShkYXRhQ29uZmlnLCBjYWxsYmFjayk7XG5cdH07XG5cblx0LyoqXG5cdCAqIFJlcXVlc3QgSWVxIERhdGEgKHVzZWQgZm9yIGV4YW1wbGUgdG8gbWFrZSBoZWF0bWFwKVxuXHQgICogQHBhcmFtIHtPYmplY3R9IGRhdGFDb25maWcgY29uZmlnIGZvciBkYXRhIHJlcXVlc3Rcblx0ICAqIEBwYXJhbSB7Y2FsbGJhY2t9IGNhbGxiYWNrOiBjYWxsZWQgYWZ0ZXIgdXBkYXRlXG5cdCAgKi9cblx0SUVRLnByb3RvdHlwZS5nZXRJZXFEYXRhID0gZnVuY3Rpb24gKGRhdGFDb25maWcsIGNhbGxiYWNrKSB7XG5cdFx0dGhpcy5fdXBkYXRlRGF0YShjYWxsYmFjaywgZGF0YUNvbmZpZywgXCJEYXRhUmVxdWVzdFwiKTtcblx0fTtcblxuXG5cdC8qKlxuXHQgKiBSZXF1ZXN0IERhdGEgdG8gbWFrZSBoZWF0bWFwXG5cdCAgKiBAcGFyYW0ge2xpc3R9IHNlbnNvck5hbWVzIDogbGlzdCBvZiBzZW5zb3IgYW5kIGluZGV4IG5hbWVzXG5cdCAgKiBAcGFyYW0ge29iamVjdH0gdGltZTogb2JqZWN0IGNvbnRhaW5pbmcgdGltZXN0YW1wcyBmb3IgYmVnaW4gYW5kIGVuZCBvZiBkYXRhIGZvciBoZWF0bWFwXG5cdCAgKiBAcGFyYW0ge3N0cmluZ30gc2FtcGxlOiB0aW1laW50ZXJ2YWwgZm9yIGRhdGEuIFBhcmFtZXRlcnM6IFwic2Vjb25kXCIsIFwibWludXRlXCIsIFwiaG91clwiLCBcImRheVwiLCBcIndlZWtcIiwgXCJtb250aFwiXG5cdCAgKiBAcGFyYW0ge2NhbGxiYWNrfSBjYWxsYmFjazogY2FsbGVkIGFmdGVyIHVwZGF0ZVxuXHQgICogQGRlcHJlY2F0ZWQgV2lsbCBiZSBkZXByZWNhdGVkIGluIGZ1dHVyZSB2ZXJzaW9uLiBQbGVhc2UgdXNlIFwiZ2V0RGF0YU1hcERhdGFcIiBpbnN0ZWFkLlxuXG5cdCAgKi9cblx0SUVRLnByb3RvdHlwZS5nZXRIZWF0TWFwRGF0YSA9IGZ1bmN0aW9uIChzZW5zb3JOYW1lcywgdGltZSwgc2FtcGxlLCBjYWxsYmFjaykge1xuXHRcdHZhciBkYXRhQ29uZmlnID0ge1xuXHRcdFx0Y3JpdGVyaWE6IHtcblx0XHRcdFx0dGltZToge3N0YXJ0OiBmb3JtYXRUaW1lKHRpbWUuc3RhcnRFcG9jaCksIGVuZDogZm9ybWF0VGltZSh0aW1lLmVuZEVwb2NoKSwgc2FtcGxpbmc6IHNhbXBsZX0sXG5cdFx0XHRcdHBsYWNlczogW10sXG5cdFx0XHRcdHJvYm90czogW11cblx0XHRcdH0sXG5cdFx0XHRzZW5zb3JzOiBzZW5zb3JOYW1lc1xuXHRcdH07XG5cdFx0Y29uc29sZS53YXJuKCdUaGlzIGZ1bmN0aW9uIHdpbGwgYmUgZGVwcmVjYXRlZC4gUGxlYXNlIHVzZSBcImdldEllcURhdGFcIiBpbnN0ZWFkLicpO1xuXHRcdC8vIHRoaXMuZ2V0RGF0YU1hcERhdGEoZGF0YUNvbmZpZywgY2FsbGJhY2spXG5cdFx0dGhpcy5nZXRJZXFEYXRhKGRhdGFDb25maWcsIGNhbGxiYWNrKTtcblx0fTtcblxuXHQvKipcblx0ICogVXBkYXRlIGludGVybmFsIG1vZGVsIHdpdGggcmVjZWl2ZWQgZGF0YVxuXHQgKiBAcGFyYW0gIHtPYmplY3R9IGRhdGEgZGF0YSByZWNlaXZlZCBmcm9tIERpeWFOb2RlIGJ5IHdlYnNvY2tldFxuXHQgKiBAcmV0dXJuIHtbdHlwZV19XHRcdFtkZXNjcmlwdGlvbl1cblx0ICovXG5cdElFUS5wcm90b3R5cGUuX2dldERhdGFNb2RlbEZyb21SZWN2ID0gZnVuY3Rpb24gKGRhdGEpIHtcblx0XHR2YXIgZGF0YU1vZGVsID0gbnVsbDtcblx0XHRkZWJ1ZygnR2V0RGF0YU1vZGVsJywgZGF0YSk7XG5cdFx0aWYgKGRhdGEgIT0gbnVsbCkge1xuXHRcdFx0Zm9yICh2YXIgbiBpbiBkYXRhKSB7XG5cdFx0XHRcdGlmIChuICE9IFwiaGVhZGVyXCIgJiYgbiAhPSBcImVyclwiKSB7XG5cblx0XHRcdFx0XHRpZiAoZGF0YVtuXS5lcnIgJiYgZGF0YVtuXS5lcnIuc3QgPiAwKSB7XG5cdFx0XHRcdFx0XHRkZWJ1ZyhuK1wiIHdhcyBpbiBlcnJvcjogXCIrZGF0YVtuXS5lcnIubXNnKTtcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICghZGF0YU1vZGVsKVxuXHRcdFx0XHRcdFx0ZGF0YU1vZGVsPXt9O1xuXG5cdFx0XHRcdFx0aWYgKCFkYXRhTW9kZWxbbl0pIHtcblx0XHRcdFx0XHRcdGRhdGFNb2RlbFtuXT17fTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0LyogdXBkYXRlIGRhdGEgaWQgKi9cblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0uaWQgPSBuO1xuXHRcdFx0XHRcdC8qIHVwZGF0ZSBkYXRhIGFic29sdXRlIHJhbmdlICovXG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnJhbmdlPWRhdGFbbl0ucmFuZ2U7XG5cdFx0XHRcdFx0LyogdXBkYXRlIGRhdGEgcmFuZ2UgKi9cblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0udGltZVJhbmdlPWRhdGFbbl0udGltZVJhbmdlO1xuXHRcdFx0XHRcdC8qIHVwZGF0ZSBkYXRhIGxhYmVsICovXG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLmxhYmVsPWRhdGFbbl0ubGFiZWw7XG5cdFx0XHRcdFx0LyogdXBkYXRlIGRhdGEgdW5pdCAqL1xuXHRcdFx0XHRcdGRhdGFNb2RlbFtuXS51bml0PWRhdGFbbl0udW5pdDtcblx0XHRcdFx0XHQvKiB1cGRhdGUgZGF0YSBwcmVjaXNpb24gKi9cblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0ucHJlY2lzaW9uPWRhdGFbbl0ucHJlY2lzaW9uO1xuXHRcdFx0XHRcdC8qIHVwZGF0ZSBkYXRhIGNhdGVnb3JpZXMgKi9cblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0uY2F0ZWdvcnk9ZGF0YVtuXS5jYXRlZ29yeTtcblx0XHRcdFx0XHQvKiBzdWdnZXN0ZWQgeSBkaXNwbGF5IHJhbmdlICovXG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnpvb21SYW5nZSA9IFswLCAxMDBdO1xuXHRcdFx0XHRcdC8vIHVwZGF0ZSBzZW5zb3IgY29uZm9ydCByYW5nZVxuXHRcdFx0XHRcdGRhdGFNb2RlbFtuXS5jb25mb3J0UmFuZ2UgPSBkYXRhW25dLmNvbmZvcnRSYW5nZTtcblxuXHRcdFx0XHRcdC8qIHVwZGF0ZSBkYXRhIGluZGV4UmFuZ2UgKi9cblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0ucXVhbGl0eUNvbmZpZz17XG5cdFx0XHRcdFx0XHRpbmRleFJhbmdlOiBkYXRhW25dLmluZGV4UmFuZ2Vcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdGRhdGFNb2RlbFtuXS50aW1lID0gdGhpcy5fY29kZXIuZnJvbShkYXRhW25dLnRpbWUsICdiNjQnLCA4KTtcblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0uZGF0YSA9IChkYXRhW25dLmRhdGEgIT0gbnVsbClcblx0XHRcdFx0XHRcdD8gdGhpcy5fY29kZXIuZnJvbShkYXRhW25dLmRhdGEsICdiNjQnLCA0KVxuXHRcdFx0XHRcdFx0OiAoKGRhdGFbbl0uYXZnICE9IG51bGwpXG5cdFx0XHRcdFx0XHQgICA/IHRoaXMuX2NvZGVyLmZyb20oZGF0YVtuXS5hdmcuZCwgJ2I2NCcsIDQpXG5cdFx0XHRcdFx0XHQgICA6IG51bGwpO1xuXHRcdFx0XHRcdGRhdGFNb2RlbFtuXS5xdWFsaXR5SW5kZXggPSAoZGF0YVtuXS5kYXRhICE9IG51bGwpXG5cdFx0XHRcdFx0XHQ/IHRoaXMuX2NvZGVyLmZyb20oZGF0YVtuXS5pbmRleCwgJ2I2NCcsIDQpXG5cdFx0XHRcdFx0XHQ6ICgoZGF0YVtuXS5hdmcgIT0gbnVsbClcblx0XHRcdFx0XHRcdCAgID8gdGhpcy5fY29kZXIuZnJvbShkYXRhW25dLmF2Zy5pLCAnYjY0JywgNClcblx0XHRcdFx0XHRcdCAgIDogbnVsbCk7XG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnJvYm90SWQgPSB0aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0ucm9ib3RJZCwgJ2I2NCcsIDQpO1xuXHRcdFx0XHRcdGlmIChkYXRhTW9kZWxbbl0ucm9ib3RJZCAhPSBudWxsKSB7XG5cdFx0XHRcdFx0XHQvKiogZGljbyByb2JvdElkIC0+IHJvYm90TmFtZSAqKi9cblx0XHRcdFx0XHRcdHZhciBkaWNvUm9ib3QgPSB7fTtcblx0XHRcdFx0XHRcdGRhdGEuaGVhZGVyLnJvYm90cy5mb3JFYWNoKGZ1bmN0aW9uIChlbCkge1xuXHRcdFx0XHRcdFx0XHRkaWNvUm9ib3RbZWwuaWRdPWVsLm5hbWU7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdGRhdGFNb2RlbFtuXS5yb2JvdElkID0gZGF0YU1vZGVsW25dLnJvYm90SWQubWFwKGZ1bmN0aW9uIChlbCkge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gZGljb1JvYm90W2VsXTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGRhdGFNb2RlbFtuXS5wbGFjZUlkID0gdGhpcy5fY29kZXIuZnJvbShkYXRhW25dLnBsYWNlSWQsICdiNjQnLCA0KTtcblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0ueCA9IG51bGw7XG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnkgPSBudWxsO1xuXG5cdFx0XHRcdFx0aWYgKGRhdGFbbl0uYXZnICE9IG51bGwpXG5cdFx0XHRcdFx0XHRkYXRhTW9kZWxbbl0uYXZnID0ge1xuXHRcdFx0XHRcdFx0XHRkOiB0aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0uYXZnLmQsICdiNjQnLCA0KSxcblx0XHRcdFx0XHRcdFx0aTogdGhpcy5fY29kZXIuZnJvbShkYXRhW25dLmF2Zy5pLCAnYjY0JywgNClcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0aWYgKGRhdGFbbl0ubWluICE9IG51bGwpXG5cdFx0XHRcdFx0XHRkYXRhTW9kZWxbbl0ubWluID0ge1xuXHRcdFx0XHRcdFx0XHRkOiB0aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0ubWluLmQsICdiNjQnLCA0KSxcblx0XHRcdFx0XHRcdFx0aTogdGhpcy5fY29kZXIuZnJvbShkYXRhW25dLm1pbi5pLCAnYjY0JywgNClcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0aWYgKGRhdGFbbl0ubWF4ICE9IG51bGwpXG5cdFx0XHRcdFx0XHRkYXRhTW9kZWxbbl0ubWF4ID0ge1xuXHRcdFx0XHRcdFx0XHRkOiB0aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0ubWF4LmQsICdiNjQnLCA0KSxcblx0XHRcdFx0XHRcdFx0aTogdGhpcy5fY29kZXIuZnJvbShkYXRhW25dLm1heC5pLCAnYjY0JywgNClcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0aWYgKGRhdGFbbl0uc3RkZGV2ICE9IG51bGwpXG5cdFx0XHRcdFx0XHRkYXRhTW9kZWxbbl0uc3RkZGV2ID0ge1xuXHRcdFx0XHRcdFx0XHRkOiB0aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0uc3RkZGV2LmQsICdiNjQnLCA0KSxcblx0XHRcdFx0XHRcdFx0aTogdGhpcy5fY29kZXIuZnJvbShkYXRhW25dLnN0ZGRldi5pLCAnYjY0JywgNClcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0aWYgKGRhdGFbbl0uc3RkZGV2ICE9IG51bGwpXG5cdFx0XHRcdFx0XHRkYXRhTW9kZWxbbl0uc3RkZGV2ID0ge1xuXHRcdFx0XHRcdFx0XHRkOiB0aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0uc3RkZGV2LmQsICdiNjQnLCA0KSxcblx0XHRcdFx0XHRcdFx0aTogdGhpcy5fY29kZXIuZnJvbShkYXRhW25dLnN0ZGRldi5pLCAnYjY0JywgNClcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0aWYgKGRhdGFbbl0ueCAhPSBudWxsKVxuXHRcdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnggPSB0aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0ueCwgJ2I2NCcsIDQpO1xuXHRcdFx0XHRcdGlmIChkYXRhW25dLnkgIT0gbnVsbClcblx0XHRcdFx0XHRcdGRhdGFNb2RlbFtuXS55ID0gdGhpcy5fY29kZXIuZnJvbShkYXRhW25dLnksICdiNjQnLCA0KTtcblx0XHRcdFx0XHQvKipcblx0XHRcdFx0XHQgKiBjdXJyZW50IHF1YWxpdHkgOiB7J2InYWQsICdtJ2VkaXVtLCAnZydvb2R9XG5cdFx0XHRcdFx0ICogZXZvbHV0aW9uIDogeyd1J3AsICdkJ293biwgJ3MndGFibGV9XG5cdFx0XHRcdFx0ICogZXZvbHV0aW9uIHF1YWxpdHkgOiB7J2InZXR0ZXIsICd3J29yc2UsICdzJ2FtZX1cblx0XHRcdFx0XHQgKi9cblx0XHRcdFx0XHQvLy8gVE9ET1xuXHRcdFx0XHRcdGRhdGFNb2RlbFtuXS50cmVuZCA9ICdtc3MnO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdGRlYnVnKFwiTm8gRGF0YSB0byByZWFkIG9yIGhlYWRlciBpcyBtaXNzaW5nICFcIik7XG5cdFx0fVxuXHRcdC8qKiBsaXN0IHJvYm90cyAqKi9cblx0XHR0aGlzLmRhdGFNb2RlbCA9IGRhdGFNb2RlbDtcblx0XHRkZWJ1ZyhkYXRhTW9kZWwpO1xuXHRcdHJldHVybiBkYXRhTW9kZWw7XG5cdH07XG5cblxuXG5cdC8qKiBjcmVhdGUgSUVRIHNlcnZpY2UgKiovXG5cdERpeWFTZWxlY3Rvci5wcm90b3R5cGUuSUVRID0gZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiBuZXcgSUVRKHRoaXMpO1xuXHR9O1xufSkoKVxuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbi8qXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5jb25zdCBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJykoJ2llcTp0aW1lY29udHJvbCcpO1xuXG4ndXNlIHN0cmljdCc7XG5cblxuLyoqXG4gKiBDb252ZXJ0IHRpbWUgdG8gbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyBhcyB1c2VkIGluIElFUSBBUElcbiAqIEBwYXJhbSB7b2JqZWN0LHN0cmluZyxkYXRlLG51bWJlcn0gdGltZSAtIHRpbWUgdG8gYmUgZm9ybWF0dGVkXG4gKiBAcmV0dXJuIHtudW1iZXJ9IHRpbWUgLSBpbiBtc1xuICovXG5sZXQgZm9ybWF0VGltZSA9IGZ1bmN0aW9uICh0aW1lKSB7XG5cdHJldHVybiBuZXcgRGF0ZSh0aW1lKS5nZXRUaW1lKCk7XG59O1xuXG4vKipcbiAqIEdldCB0aW1lIHNhbXBsaW5nIGZyb20gdGltZSByYW5nZS5cbiAqIFNldCBzYW1wbGluZyBpcyBzdHJ1Y3R1cmUgcHJvdmlkZWQgaW4gcGFyYW1ldGVyXG4gKiBAcGFyYW0ge29iamVjdH0gdGltZSAtIHRpbWUgY3JpdGVyaWEgaS5lLiBkZWZpbmluZyByYW5nZVxuICogQHBhcmFtIHtudW1iZXJ9IG1heFNhbXBsZXMgLSBtYXggbnVtYmVyIG9mIHNhbXBsZXMgdG8gYmUgZGlzcGxheWVkXG4gKiBAcmV0dXJuIHtzdHJpbmd9IHRpbWVTYW1wbGluZyAtIGNvbXB1dGVkIHRpbWVTYW1wbGluZ1xuICovXG5sZXQgZ2V0VGltZVNhbXBsaW5nID0gZnVuY3Rpb24gKHRpbWUsIG1heFNhbXBsZXMpIHtcblx0Ly8gZG8gbm90aGluZyB3aXRob3V0IHRpbWUgYmVpbmcgZGVmaW5lZFxuXHRpZiAodGltZSA9PSBudWxsKSB7XG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0fVxuXHQvLyBkZWZhdWx0IG1heFNhbXBsZXNcblx0aWYgKG1heFNhbXBsZXMgPT0gbnVsbCkge1xuXHRcdG1heFNhbXBsZXMgPSAzMDA7XG5cdH1cblxuXHQvLyBhc3N1bWUgZGVmYXVsdCB0aW1lLnJhbmdlIGlzIDFcblx0bGV0IHJhbmdlID0gdGltZS5yYW5nZTtcblx0aWYgKHJhbmdlID09IG51bGwpIHtcblx0XHRyYW5nZSA9IDE7XG5cdH1cblxuXHQvLyByYW5nZSB1bml0IHRvIHNlY29uZHNcblx0bGV0IHRpbWVJblNlY29uZHMgPSB7XG5cdFx0XCJzZWNvbmRcIjogMSxcblx0XHRcIm1pbnV0ZVwiOiA2MCxcblx0XHRcImhvdXJcIjogMzYwMCxcblx0XHRcImRheVwiOiAyNCAqIDM2MDAsXG5cdFx0XCJ3ZWVrXCI6IDcgKiAyNCAqIDM2MDAsXG5cdFx0XCJtb250aFwiOiAzMCAqIDI0ICogMzYwMCxcblx0XHRcInllYXJcIjogMzY1ICogMjQgKiAzNjAwXG5cdH07XG5cblx0Ly8gb3JkZXJlZCB0aW1lIHRocmVzaG9sZHNcblx0bGV0IHNhbXBsaW5nVGhyZXNob2xkcyA9IFtcblx0XHR7dGhyZXNoOiBtYXhTYW1wbGVzLCBzYW1wbGluZzogXCJTZWNvbmRcIn0sXG5cdFx0e3RocmVzaDogbWF4U2FtcGxlcyo2MCwgc2FtcGxpbmc6IFwiTWludXRlXCJ9LFxuXHRcdHt0aHJlc2g6IG1heFNhbXBsZXMqMzYwMCwgc2FtcGxpbmc6IFwiSG91clwifSxcblx0XHR7dGhyZXNoOiBtYXhTYW1wbGVzKjI0KjM2MDAsIHNhbXBsaW5nOiBcIkRheVwifSxcblx0XHR7dGhyZXNoOiBtYXhTYW1wbGVzKjcqMjQqMzYwMCwgc2FtcGxpbmc6IFwiV2Vla1wifSxcblx0XHR7dGhyZXNoOiBtYXhTYW1wbGVzKjMwKjI0KjM2MDAsIHNhbXBsaW5nOiBcIk1vbnRoXCJ9XG5cdF07XG5cblx0bGV0IHRpbWVVbml0ID0gdGltZS5yYW5nZVVuaXQudG9Mb3dlckNhc2UoKTtcblx0bGV0IGxhc3QgPSB0aW1lVW5pdC5sZW5ndGgtMTtcblx0Ly8gcmVtb3ZlIHRyYWlsaW5nICdzJ1xuXHRpZiAodGltZVVuaXRbbGFzdF0gPT09ICdzJykge1xuXHRcdHRpbWVVbml0ID0gdGltZVVuaXQuc2xpY2UoMCwgbGFzdCk7XG5cdH1cblxuXHRsZXQgdGltZUluU2VjID0gcmFuZ2UgKiB0aW1lSW5TZWNvbmRzW3RpbWVVbml0XTtcblx0ZGVidWcoXCJ0aW1lSW5TZWM6IFwiICsgdGltZUluU2VjKTtcblxuXHRsZXQgdGltZVNhbXBsaW5nID0gXCJZZWFyXCI7IC8vIGRlZmF1bHQgc2FtcGxpbmdcblx0Ly8gZmluZCBzbWFsbGVzdCB0aHJlc2hvbGQgYWJvdmUgdGltZVNlYyB0byBkZXRlcm1pbmUgc2FtcGxpbmdcblx0c2FtcGxpbmdUaHJlc2hvbGRzLmZpbmQoIHNhbXBsaW5nVGhyZXNob2xkID0+IHtcblx0XHQvLyB1cGRhdGUgc2FtcGxpbmcgdW50aWwgZmlyc3QgdGhyZXNob2xkIGFib3ZlIHRpbWVTZWNcblx0XHR0aW1lU2FtcGxpbmcgPSBzYW1wbGluZ1RocmVzaG9sZC5zYW1wbGluZztcblx0XHRyZXR1cm4gdGltZUluU2VjIDwgc2FtcGxpbmdUaHJlc2hvbGQudGhyZXNoO1xuXHR9KTtcblxuXHRkZWJ1Zyh0aW1lU2FtcGxpbmcpO1xuXHRyZXR1cm4gdGltZVNhbXBsaW5nO1xufVxuXG4vLyBleHBvcnQgZnVuY3Rpb25zXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0Zm9ybWF0VGltZTogZm9ybWF0VGltZSxcblx0Z2V0VGltZVNhbXBsaW5nOiBnZXRUaW1lU2FtcGxpbmdcbn07XG4iLCJjb25zdCBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudGVtaXR0ZXIzJyk7XG5jb25zdCBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJykoJ2llcTp3YXRjaGVyJyk7XG5jb25zdCBkZWJ1Z0Vycm9yID0gcmVxdWlyZSgnZGVidWcnKSgnaWVxOndhdGNoZXI6ZXJyb3JzJyk7XG5jb25zdCBnZXRUaW1lU2FtcGxpbmcgPSByZXF1aXJlKCcuL3RpbWVjb250cm9sLmpzJykuZ2V0VGltZVNhbXBsaW5nO1xuXG4vLyBpbXBvcnQgUHJvbWlzZVxubGV0IFByb21pc2UgPSBudWxsO1xudHJ5e1xuXHRpZiAod2luZG93ICE9IG51bGwpIHtcblx0XHRQcm9taXNlID0gd2luZG93LlByb21pc2U7XG5cdH0gZWxzZSB7XG5cdFx0UHJvbWlzZSA9IHJlcXVpcmUoJ2JsdWViaXJkJyk7XG5cdH1cbn1jYXRjaChlKXtcblx0ZGVidWcoZSk7XG5cdFByb21pc2UgPSByZXF1aXJlKCdibHVlYmlyZCcpO1xufVxuXG4ndXNlIHN0cmljdCc7XG5cbmNsYXNzIFN0b3BDb25kaXRpb24gZXh0ZW5kcyBFcnJvciB7XG5cdGNvbnN0cnVjdG9yKG1zZykge1xuXHRcdHN1cGVyKG1zZyk7XG5cdFx0dGhpcy5uYW1lPSdTdG9wQ29uZGl0aW9uJ1xuXHR9XG59XG5cbi8vIGRlZmF1bHQgYW5kIG1heCBudW1iZXIgb2Ygc2FtcGxlcyBmb3IgdGhlIHByb3ZpZGVkIHRpbWUgcmFuZ2VcbmxldCBNQVhTQU1QTElORyA9IDMwMDtcblxuY2xhc3MgV2F0Y2hlciBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG5cdC8qKlxuXHQgKiBAcGFyYW0gZW1pdCBlbWl0IGRhdGEgKG1hbmRhdG9yeSlcblx0ICogQHBhcmFtIGNvbmZpZyB0byBnZXQgZGF0YSBmcm9tIHNlcnZlclxuXHQgKi9cblx0Y29uc3RydWN0b3IgKHNlbGVjdG9yLCBfY29uZmlnKSB7XG5cdFx0c3VwZXIoKTtcblxuXHRcdHRoaXMuc2VsZWN0b3IgPSBzZWxlY3Rvcjtcblx0XHR0aGlzLnN0YXRlID0gJ3J1bm5pbmcnO1xuXG5cdFx0dGhpcy5yZWNvbm5lY3Rpb25QZXJpb2QgPSAwOyAvLyBpbml0aWFsIHBlcmlvZCBiZXR3ZWVuIHJlY29ubmVjdGlvbnNcblx0XHR0aGlzLm1heFJlY29ubmVjdGlvblBlcmlvZCA9IDMwMDAwMDsgLy8gbWF4IDUgbWluXG5cblx0XHQvKiogaW5pdGlhbGlzZSBvcHRpb25zIGZvciByZXF1ZXN0ICoqL1xuXHRcdGxldCBvcHRpb25zID0ge1xuXHRcdFx0Y3JpdGVyaWE6IHtcblx0XHRcdFx0dGltZToge31cblx0XHRcdH0sXG5cdFx0XHRvcGVyYXRvcnM6IFsnYXZnJywgJ21pbicsICdtYXgnLCAnc3RkZGV2J10sXG5cdFx0fTtcblx0XHRpZiAoX2NvbmZpZy5yb2JvdHMgaW5zdGFuY2VvZiBBcnJheSkge1xuXHRcdFx0b3B0aW9ucy5jcml0ZXJpYS5yb2JvdHMgPSBfY29uZmlnLnJvYm90cztcblx0XHRcdGlmIChfY29uZmlnLnJvYm90cy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdGRlYnVnKCdTZWxlY3Rpb24gb2Ygcm9ib3QgaXMgbm90IGltcGxlbWVudGVkIHlldCcpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAoX2NvbmZpZy50aW1lUmFuZ2UgIT0gbnVsbCAmJiB0eXBlb2YgX2NvbmZpZy50aW1lUmFuZ2UgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRvcHRpb25zLmNyaXRlcmlhLnRpbWUucmFuZ2VVbml0ID0gX2NvbmZpZy50aW1lUmFuZ2U7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG9wdGlvbnMuY3JpdGVyaWEudGltZS5yYW5nZVVuaXQgPSAnaG91cnMnO1xuXHRcdH1cblx0XHRpZiAoX2NvbmZpZy5jYXRlZ29yeSAhPSBudWxsICYmIHR5cGVvZiBfY29uZmlnLmNhdGVnb3J5ID09PSAnc3RyaW5nJykge1xuXHRcdFx0b3B0aW9ucy5jYXRlZ29yeSA9IF9jb25maWcuY2F0ZWdvcnk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG9wdGlvbnMuY2F0ZWdvcnkgPSAnaWVxJztcblx0XHR9XG5cdFx0aWYgKF9jb25maWcuc2FtcGxpbmcgIT0gbnVsbCAmJiB0eXBlb2YgX2NvbmZpZy5zYW1wbGluZyA9PT0gJ251bWJlcicpIHtcblx0XHRcdG9wdGlvbnMuc2FtcGxpbmcgPSBfY29uZmlnLnNhbXBsaW5nO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRvcHRpb25zLnNhbXBsaW5nID0gTUFYU0FNUExJTkc7XG5cdFx0fVxuXHRcdGlmIChvcHRpb25zLnNhbXBsaW5nID4gTUFYU0FNUExJTkcpIHtcblx0XHRcdG9wdGlvbnMuc2FtcGxpbmcgPSAzMDA7XG5cdFx0fVxuXHRcdG9wdGlvbnMuY3JpdGVyaWEudGltZS5zYW1wbGluZyA9IGdldFRpbWVTYW1wbGluZyhvcHRpb25zLmNyaXRlcmlhLnRpbWUsIG9wdGlvbnMuc2FtcGxpbmcpO1xuXG5cdFx0dGhpcy5vcHRpb25zID0gb3B0aW9ucztcblx0XHRkZWJ1ZyhvcHRpb25zKTtcblxuXHRcdHRoaXMud2F0Y2gob3B0aW9ucyk7IC8vIHN0YXJ0IHdhdGNoZXJcblx0fVxuXG5cdHdhdGNoIChvcHRpb25zKSB7XG5cdFx0ZGVidWcoJ2luIHdhdGNoJyk7XG5cdFx0bmV3IFByb21pc2UoIChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdC8vIFJlcXVlc3QgaGlzdG9yeSBkYXRhIGJlZm9yZSBzdWJzY3JpYmluZ1xuXHRcdFx0dGhpcy5zZWxlY3Rvci5yZXF1ZXN0KHtcblx0XHRcdFx0c2VydmljZTogXCJpZXFcIixcblx0XHRcdFx0ZnVuYzogXCJEYXRhUmVxdWVzdFwiLFxuXHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0ZGF0YTogSlNPTi5zdHJpbmdpZnkob3B0aW9ucylcblx0XHRcdFx0fSxcblx0XHRcdFx0b2JqOntcblx0XHRcdFx0XHRwYXRoOiAnL2ZyL3BhcnRuZXJpbmcvSWVxJyxcblx0XHRcdFx0XHRpbnRlcmZhY2U6IFwiZnIucGFydG5lcmluZy5JZXFcIlxuXHRcdFx0XHR9LFxuXHRcdFx0fSwgKGRuSWQsIGVyciwgZGF0YVN0cmluZykgPT4ge1xuXHRcdFx0XHRpZiAoZXJyICE9IG51bGwpICB7XG5cdFx0XHRcdFx0cmVqZWN0KGVycik7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICh0aGlzLnN0YXRlID09PSAnc3RvcHBlZCcpIHtcblx0XHRcdFx0XHRyZWplY3QobmV3IFN0b3BDb25kaXRpb24oKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZGVidWcoJ1JlcXVlc3Q6ZW1pdERhdGEnKTtcblx0XHRcdFx0bGV0IGRhdGEgPSBKU09OLnBhcnNlKGRhdGFTdHJpbmcpO1xuXHRcdFx0XHR0aGlzLmVtaXQoJ2RhdGEnLCBkYXRhKTtcblx0XHRcdFx0cmVzb2x2ZSgpO1xuXHRcdFx0fSk7XG5cdFx0fSlcblx0XHRcdC50aGVuKCBfID0+IHtcblx0XHRcdFx0Ly8gc3Vic2NyaWJlIHRvIHNpZ25hbFxuXHRcdFx0XHRkZWJ1ZygnU3Vic2NyaWJpbmcnKTtcblx0XHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlICggKHJlc29sdmUsIHJlamVjdCkgPT4gIHtcblx0XHRcdFx0XHR0aGlzLnN1YnNjcmlwdGlvbiA9IHRoaXMuc2VsZWN0b3Iuc3Vic2NyaWJlKHtcblx0XHRcdFx0XHRcdHNlcnZpY2U6IFwiaWVxXCIsXG5cdFx0XHRcdFx0XHRmdW5jOiBvcHRpb25zLmNyaXRlcmlhLnRpbWUuc2FtcGxpbmcsXG5cdFx0XHRcdFx0XHRkYXRhOiB7ZGF0YTogb3B0aW9uc30sXG5cdFx0XHRcdFx0XHRvYmo6e1xuXHRcdFx0XHRcdFx0XHRwYXRoOiAnL2ZyL3BhcnRuZXJpbmcvSWVxJyxcblx0XHRcdFx0XHRcdFx0aW50ZXJmYWNlOiBcImZyLnBhcnRuZXJpbmcuSWVxXCJcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9LCAoZG5kLCBlcnIsIGRhdGEpID0+IHtcblx0XHRcdFx0XHRcdGlmIChlcnIgIT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0XHRyZWplY3QoZXJyKTtcblx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZGVidWcoJ1NpZ25hbDplbWl0RGF0YScpO1xuXHRcdFx0XHRcdFx0ZGF0YSA9IEpTT04ucGFyc2UoZGF0YSk7XG5cdFx0XHRcdFx0XHR0aGlzLmVtaXQoJ2RhdGEnLCBkYXRhKTtcblxuXHRcdFx0XHRcdFx0dGhpcy5yZWNvbm5lY3Rpb25QZXJpb2Q9MDsgLy8gcmVzZXQgcGVyaW9kIG9uIHN1YnNjcmlwdGlvbiByZXF1ZXN0c1xuXHRcdFx0XHRcdFx0cmVzb2x2ZSgpO1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0pXG5cdFx0XHR9KVxuXHRcdFx0LmNhdGNoKCBlcnIgPT4ge1xuXHRcdFx0XHRpZiAoZXJyLm5hbWUgPT09ICdTdG9wQ29uZGl0aW9uJykgeyAvLyB3YXRjaGVyIHN0b3BwZWQgOiBkbyBub3RoaW5nXG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIHRyeSB0byByZXN0YXJ0IGxhdGVyXG5cdFx0XHRcdGRlYnVnRXJyb3IoXCJXYXRjaElFUVJlY3ZFcnI6XCIsIGVycik7XG5cdFx0XHRcdHRoaXMuX2Nsb3NlU3Vic2NyaXB0aW9uKCk7IC8vIHNob3VsZCBub3QgYmUgbmVjZXNzYXJ5XG5cdFx0XHRcdHRoaXMucmVjb25uZWN0aW9uUGVyaW9kID0gdGhpcy5yZWNvbm5lY3Rpb25QZXJpb2QrMTAwMDsgLy8gaW5jcmVhc2UgZGVsYXkgYnkgMSBzZWNcblx0XHRcdFx0aWYgKHRoaXMucmVjb25uZWN0aW9uUGVyaW9kID4gdGhpcy5tYXhSZWNvbm5lY3Rpb25QZXJpb2QpIHtcblx0XHRcdFx0XHR0aGlzLnJlY29ubmVjdGlvblBlcmlvZD10aGlzLm1heFJlY29ubmVjdGlvblBlcmlvZDsgLy8gbWF4IDVtaW5cblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLndhdGNoVGVudGF0aXZlID0gc2V0VGltZW91dCggXyA9PiB7XG5cdFx0XHRcdFx0dGhpcy53YXRjaChvcHRpb25zKTtcblx0XHRcdFx0fSwgdGhpcy5yZWNvbm5lY3Rpb25QZXJpb2QpOyAvLyB0cnkgYWdhaW4gbGF0ZXJcblx0XHRcdH0pO1xuXG5cdH1cblxuXHQvLyBDbG9zZSBzdWJzY3JpcHRpb24gaWYgYW55XG5cdF9jbG9zZVN1YnNjcmlwdGlvbiAoKSB7XG5cdFx0ZGVidWcoJ0luIGNsb3NlU3Vic2NyaXB0aW9uJyk7XG5cdFx0aWYgKHRoaXMuc3Vic2NyaXB0aW9uICE9IG51bGwpIHtcblx0XHRcdHRoaXMuc3Vic2NyaXB0aW9uLmNsb3NlKCk7XG5cdFx0XHR0aGlzLnN1YnNjcmlwdGlvbiA9IG51bGw7XG5cdFx0fVxuXHR9XG5cblx0c3RvcCAoKSB7XG5cdFx0ZGVidWcoJ0luIHN0b3AnKTtcblx0XHR0aGlzLnN0YXRlID0gJ3N0b3BwZWQnO1xuXHRcdGlmICh0aGlzLndhdGNoVGVudGF0aXZlICE9IG51bGwpIHtcblx0XHRcdGNsZWFyVGltZW91dCh0aGlzLndhdGNoVGVudGF0aXZlKTtcblx0XHR9XG5cdFx0dGhpcy5fY2xvc2VTdWJzY3JpcHRpb24oKTtcblx0XHR0aGlzLmVtaXQoJ3N0b3AnKTtcblx0XHR0aGlzLnJlbW92ZUFsbExpc3RlbmVycygpO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gV2F0Y2hlcjtcbiJdfQ==
