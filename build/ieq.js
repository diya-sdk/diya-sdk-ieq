(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
'use strict';

/*
 * Copyright : Partnering 3.0 (2007-2020)
 * Author : Partnering Robotics <software@partnering.fr>
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
var ConnectorV1 = require('./v1/connector.js');
var ConnectorV2 = require('./v2/connector.js');

(function () {
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

	/** create Status service * */
	DiyaSelector.prototype.IEQ = function () {
		var _this = this;

		return new Promise(function (resolve, reject) {
			_this.request({
				service: 'ieq',
				func: 'GetAPIVersion'
			}, function (peerId, err, data) {
				if (err == null) {
					resolve(data);
				} else {
					reject(err);
				}
			});
		}).then(function (data) {
			if (data === 2) {
				return new ConnectorV2(_this);
			}
			throw new Error('Cannot instantiate connector');
		}).catch(function (err) {
			if (err.includes("Method 'GetAPIVersion' not found in introspection data")) {
				return new ConnectorV1(_this);
			}
			throw new Error(err);
		});
	};
})();

},{"./v1/connector.js":5,"./v2/connector.js":7,"diya-sdk":undefined}],3:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

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

module.exports = StopCondition;

},{}],4:[function(require,module,exports){
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
var getTimeSampling = function getTimeSampling(time, _maxSamples) {
	var maxSamples = _maxSamples;
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
		second: 1,
		minute: 60,
		hour: 3600,
		day: 24 * 3600,
		week: 7 * 24 * 3600,
		month: 30 * 24 * 3600,
		year: 365 * 24 * 3600

		// ordered time thresholds
	};var samplingThresholds = [{ thresh: maxSamples, sampling: 'Second' }, { thresh: maxSamples * 60, sampling: 'Minute' }, { thresh: maxSamples * 3600, sampling: 'Hour' }, { thresh: maxSamples * 24 * 3600, sampling: 'Day' }, { thresh: maxSamples * 7 * 24 * 3600, sampling: 'Week' }, { thresh: maxSamples * 30 * 24 * 3600, sampling: 'Month' }];

	var timeUnit = time.rangeUnit.toLowerCase();
	var last = timeUnit.length - 1;
	// remove trailing 's'
	if (timeUnit[last] === 's') {
		timeUnit = timeUnit.slice(0, last);
	}

	var timeInSec = range * timeInSeconds[timeUnit];

	var timeSampling = 'Year'; // default sampling
	// find smallest threshold above timeSec to determine sampling
	samplingThresholds.find(function (samplingThreshold) {
		// update sampling until first threshold above timeSec
		timeSampling = samplingThreshold.sampling;
		return timeInSec < samplingThreshold.thresh;
	});

	return timeSampling;
};

// export functions
module.exports = {
	formatTime: formatTime,
	getTimeSampling: getTimeSampling
};

},{}],5:[function(require,module,exports){
/*
 * Copyright : Partnering 3.0 (2007-2020)
 * Author : Partnering Robotics <software@partnering.fr>
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

'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var WatcherV1 = require('../v1/watcher.js');
var formatTime = require('../timecontrol.js').formatTime;

var ConnectorV1 = function () {
	function ConnectorV1(selector) {
		_classCallCheck(this, ConnectorV1);

		this.selector = selector;
		this.dataModel = {};
		this._coder = selector.encode();
		this.watchers = [];

		/** structure of data config. [] means default value ***
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
			sampling: null // sampling
		};

		return this;
	}

	_createClass(ConnectorV1, [{
		key: 'getUpdateDataObject',
		value: function getUpdateDataObject() {
			return {
				path: '/fr/partnering/Ieq',
				interface: 'fr.partnering.Ieq'
			};
		}
	}, {
		key: 'getCsvDataObject',
		value: function getCsvDataObject() {
			return {
				path: '/fr/partnering/Ieq',
				interface: 'fr.partnering.Ieq'
			};
		}

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

	}, {
		key: 'getDataModel',
		value: function getDataModel() {
			return this.dataModel;
		}
	}, {
		key: 'getDataRange',
		value: function getDataRange() {
			return this.dataModel.range;
		}

		/**
   * @param {Object} dataConfig config for data request
   * if dataConfig is define : set and return this
   * @return {IEQ} this
   * else
   * @return {Object} current dataConfig
   */

	}, {
		key: 'DataConfig',
		value: function DataConfig(newDataConfig) {
			if (newDataConfig != null) {
				this.dataConfig = newDataConfig;
				return this;
			}
			return this.dataConfig;
		}

		/**
   * TO BE IMPLEMENTED : operator management in DN-IEQ
   * @param  {String}	 newOperator : {[last], max, moy, sd}
   * @return {IEQ} this - chainable
   * Set operator criteria.
   * Depends on newOperator
   * @param {String} newOperator
   * @return this
   * Get operator criteria.
   * @return {String} operator
   */

	}, {
		key: 'DataOperator',
		value: function DataOperator(newOperator) {
			if (newOperator != null) {
				this.dataConfig.operator = newOperator;
				return this;
			}
			return this.dataConfig.operator;
		}

		/**
   * Depends on numSamples
   * @param {int} number of samples in dataModel
   * if defined : set number of samples
   * @return {IEQ} this
   * else
   * @return {int} number of samples
   */

	}, {
		key: 'DataSampling',
		value: function DataSampling(numSamples) {
			if (numSamples != null) {
				this.dataConfig.sampling = numSamples;
				return this;
			}
			return this.dataConfig.sampling;
		}

		/**
   * Set or get data time criteria start and end.
   * If param defined
   * @param {Date} newTimeStart // may be null
   * @param {Date} newTimeEnd // may be null
   * @return {IEQ} this
   * If no param defined:
   * @return {Object} Time object: fields start and end.
   */

	}, {
		key: 'DataTime',
		value: function DataTime(newTimeStart, newTimeEnd, newRange) {
			if (newTimeStart != null || newTimeEnd != null || newRange != null) {
				this.dataConfig.criteria.time.start = formatTime(newTimeStart);
				this.dataConfig.criteria.time.end = formatTime(newTimeEnd);
				this.dataConfig.criteria.time.range = newRange;
				return this;
			}
			return {
				start: new Date(this.dataConfig.criteria.time.start),
				end: new Date(this.dataConfig.criteria.time.end),
				range: new Date(this.dataConfig.criteria.time.range)
			};
		}

		/**
   * Depends on robotIds
   * Set robots criteria.
   * @param {Array[Int]} robotIds list of robots Ids
   * Get robots criteria.
   * @return {Array[Int]} list of robots Ids
   */

	}, {
		key: 'DataRobotIds',
		value: function DataRobotIds(robotIds) {
			if (robotIds != null) {
				this.dataConfig.criteria.robots = robotIds;
				return this;
			}
			return this.dataConfig.criteria.robots;
		}

		/**
   * Depends on placeIds
   * Set places criteria.
   * @param {Array[Int]} placeIds list of places Ids
   * Get places criteria.
   * @return {Array[Int]} list of places Ids
   */

	}, {
		key: 'DataPlaceIds',
		value: function DataPlaceIds(placeIds) {
			if (placeIds != null) {
				this.dataConfig.criteria.placeId = placeIds;
				return this;
			}
			return this.dataConfig.criteria.places;
		}

		/**
   * Get data by sensor name.
   * @param {Array[String]} sensorName list of sensors
   */

	}, {
		key: 'getDataByName',
		value: function getDataByName(sensorNames) {
			var data = [];
			for (var n in sensorNames) {
				data.push(this.dataModel[sensorNames[n]]);
			}
			return data;
		}

		/**
   * Update data given dataConfig.
   * @param {func} callback : called after update
   * @param {object} dataConfig: data to config request
   * TODO USE PROMISE
   */

	}, {
		key: 'updateData',
		value: function updateData(callback, dataConfig) {
			this._updateData(callback, dataConfig, 'DataRequest');
		}

		/**
   * Update data given dataConfig.
   * @param {func} callback : called after update
   * @param {object} dataConfig: data to config request
   * @param {string} funcName: name of requested function in diya-node-ieq. Default: "DataRequest".
   * TODO USE PROMISE
   */

	}, {
		key: '_updateData',
		value: function _updateData(callback, dataConfig, funcName) {
			var _this = this;

			if (dataConfig) {
				this.DataConfig(dataConfig);
			}
			this.selector.request({
				service: 'ieq',
				func: funcName,
				data: { data: JSON.stringify(this.dataConfig) }, //	type:"splReq",
				obj: this.getUpdateDataObject()
			}, function (dnId, err, _data) {
				var data = JSON.parse(_data);
				if (err != null) {
					if ((typeof err === 'undefined' ? 'undefined' : _typeof(err)) === 'object' && typeof err.name === 'string') {
						callback(null, err.name);
					}
					return;
				}
				callback(_this._getDataModelFromRecv(data)); // callback func
			});
		}
	}, {
		key: 'getConfinementLevel',
		value: function getConfinementLevel() {
			return this.confinement;
		}
	}, {
		key: 'getAirQualityLevel',
		value: function getAirQualityLevel() {
			return this.airQuality;
		}
	}, {
		key: 'getEnvQualityLevel',
		value: function getEnvQualityLevel() {
			return this.envQuality;
		}

		/**
   * Update internal model with received data
   * @param  config data to configure subscription
   * @param  callback called on answers (@param : dataModel)
   * @return watcher created watcher
   */

	}, {
		key: 'watch',
		value: function watch(config, callback) {
			var _this2 = this;

			// do not create watcher without a callback
			if (callback == null || typeof callback !== 'function') {
				return null;
			}

			var watcher = this.createWatcher(config);

			// add watcher in watcher list
			this.watchers.push(watcher);

			watcher.on('data', function (data) {
				callback(_this2._getDataModelFromRecv(data));
			});
			watcher.on('stop', this._removeWatcher);

			return watcher;
		}
	}, {
		key: 'createWatcher',
		value: function createWatcher(config) {
			return new WatcherV1(this.selector, config);
		}

		/**
   * Callback to remove watcher from list
   * @param watcher to be removed
   */

	}, {
		key: '_removeWatcher',
		value: function _removeWatcher(watcher) {
			// find and remove watcher in list
			this.watchers.find(function (el, id, watchers) {
				if (watcher === el) {
					watchers.splice(id, 1); // remove
					return true;
				}
				return false;
			});
		}

		/**
   * Stop all watchers
   */

	}, {
		key: 'closeSubscriptions',
		value: function closeSubscriptions() {
			console.warn('Deprecated function use stopWatchers instead');
			this.stopWatchers();
		}
	}, {
		key: 'stopWatchers',
		value: function stopWatchers() {
			var _this3 = this;

			this.watchers.forEach(function (watcher) {
				// remove listener on stop event to avoid purging watchers twice
				watcher.removeListener('stop', _this3._removeWatcher);
				watcher.stop();
			});
			this.watchers = [];
		}

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

	}, {
		key: 'getCSVData',
		value: function getCSVData(_csvConfig, callback) {
			var csvConfig = _csvConfig;
			if (csvConfig && typeof csvConfig.nlines !== 'number') {
				csvConfig.nlines = undefined;
			}
			if (csvConfig && typeof csvConfig.lang !== 'string') {
				csvConfig.lang = undefined;
			}

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
				service: 'ieq',
				func: 'CsvDataRequest',
				data: { data: dataConfig },
				//	type:"splReq",
				obj: this.getCsvDataObject()
			}, function (dnId, err, data) {
				if (err) {
					if ((typeof err === 'undefined' ? 'undefined' : _typeof(err)) === 'object' && typeof err.name === 'string') {
						callback(null, err.name);
					}
					return;
				}
				callback(data);
			});
		}

		/**
   * Request Data to make data map
   * @param {Object} dataConfig config for data request
   * @param {callback} callback: called after update
   */

	}, {
		key: 'getDataMapData',
		value: function getDataMapData(dataConfig, callback) {
			console.warn('This function will be deprecated. Please use "getIeqData" instead.');
			this.getIeqData(dataConfig, callback);
		}

		/**
   * Request Ieq Data (used for example to make heatmap)
   * @param {Object} dataConfig config for data request
   * @param {callback} callback: called after update
   */

	}, {
		key: 'getIeqData',
		value: function getIeqData(dataConfig, callback) {
			this._updateData(callback, dataConfig, 'DataRequest');
		}

		/**
   * Request Data to make heatmap
   * @param {list} sensorNames : list of sensor and index names
   * @param {object} time: object containing timestamps for begin and end of data for heatmap
   * @param {string} sample: timeinterval for data. Parameters: "second", "minute", "hour", "day", "week", "month"
   * @param {callback} callback: called after update
   * @deprecated Will be deprecated in future version. Please use "getDataMapData" instead.
   */

	}, {
		key: 'getHeatMapData',
		value: function getHeatMapData(sensorNames, time, sample, callback) {
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
		}

		/**
   * Update internal model with received data
   * @param  {Object} data data received from DiyaNode by websocket
   * @return {[type]}		[description]
   */

	}, {
		key: '_getDataModelFromRecv',
		value: function _getDataModelFromRecv(data) {
			var dataModel = null;
			if (data != null) {
				for (var n in data) {
					if (n !== 'header' && n !== 'err') {
						if (data[n].err != null && data[n].err.st > 0) {
							continue;
						}

						if (!dataModel) {
							dataModel = {};
						}

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
						dataModel[n].qualityConfig = { indexRange: data[n].indexRange };
						dataModel[n].time = this._coder.from(data[n].time, 'b64', 8);
						dataModel[n].data = data[n].data != null ? this._coder.from(data[n].data, 'b64', 4) : data[n].avg != null ? this._coder.from(data[n].avg.d, 'b64', 4) : null;
						dataModel[n].qualityIndex = data[n].data != null ? this._coder.from(data[n].index, 'b64', 4) : data[n].avg != null ? this._coder.from(data[n].avg.i, 'b64', 4) : null;
						dataModel[n].robotId = this._coder.from(data[n].robotId, 'b64', 4);
						if (dataModel[n].robotId != null) {
							(function () {
								/** dico robotId -> robotName * */
								var dicoRobot = {};
								data.header.robots.forEach(function (el) {
									dicoRobot[el.id] = el.name;
								});
								dataModel[n].robotId = dataModel[n].robotId.map(function (el) {
									return dicoRobot[el];
								});
							})();
						}

						dataModel[n].placeId = this._coder.from(data[n].placeId, 'b64', 4);
						dataModel[n].x = null;
						dataModel[n].y = null;

						if (data[n].avg != null) {
							dataModel[n].avg = {
								d: this._coder.from(data[n].avg.d, 'b64', 4),
								i: this._coder.from(data[n].avg.i, 'b64', 4)
							};
						}
						if (data[n].min != null) {
							dataModel[n].min = {
								d: this._coder.from(data[n].min.d, 'b64', 4),
								i: this._coder.from(data[n].min.i, 'b64', 4)
							};
						}
						if (data[n].max != null) {
							dataModel[n].max = {
								d: this._coder.from(data[n].max.d, 'b64', 4),
								i: this._coder.from(data[n].max.i, 'b64', 4)
							};
						}
						if (data[n].stddev != null) {
							dataModel[n].stddev = {
								d: this._coder.from(data[n].stddev.d, 'b64', 4),
								i: this._coder.from(data[n].stddev.i, 'b64', 4)
							};
						}
						if (data[n].stddev != null) {
							dataModel[n].stddev = {
								d: this._coder.from(data[n].stddev.d, 'b64', 4),
								i: this._coder.from(data[n].stddev.i, 'b64', 4)
							};
						}
						if (data[n].x != null) {
							dataModel[n].x = this._coder.from(data[n].x, 'b64', 4);
						}
						if (data[n].y != null) {
							dataModel[n].y = this._coder.from(data[n].y, 'b64', 4);
						}
						/**
       * current quality : {'b'ad, 'm'edium, 'g'ood}
       * evolution : {'u'p, 'd'own, 's'table}
       * evolution quality : {'b'etter, 'w'orse, 's'ame}
       */
						// / TODO
						dataModel[n].trend = 'mss';
					}
				}
			}
			/** list robots * */
			this.dataModel = dataModel;
			return dataModel;
		}
	}]);

	return ConnectorV1;
}();

module.exports = ConnectorV1;

},{"../timecontrol.js":4,"../v1/watcher.js":6}],6:[function(require,module,exports){
/*
 * Copyright : Partnering 3.0 (2007-2020)
 * Author : Partnering Robotics <software@partnering.fr>
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

'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('eventemitter3');

var isBrowser = typeof window !== 'undefined';
var Promise = void 0;
if (!isBrowser) {
	Promise = require('bluebird');
} else {
	Promise = window.Promise;
}
var StopCondition = require('../stopConditionError.js');
var getTimeSampling = require('../timecontrol.js').getTimeSampling;

// default and max number of samples for the provided time range
var MAXSAMPLING = 300;

var WatcherV1 = function (_EventEmitter) {
	_inherits(WatcherV1, _EventEmitter);

	/**
  * @param emit emit data (mandatory)
  * @param config to get data from server
  */
	function WatcherV1(selector, _config) {
		_classCallCheck(this, WatcherV1);

		var _this = _possibleConstructorReturn(this, (WatcherV1.__proto__ || Object.getPrototypeOf(WatcherV1)).call(this));

		_this.selector = selector;
		_this.state = 'running';

		_this.reconnectionPeriod = 0; // initial period between reconnections
		_this.maxReconnectionPeriod = 300000; // max 5 min

		/** initialise options for request * */
		var options = {
			criteria: { time: {} },
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

		_this.options = options;

		_this.watch(options); // start watcher
		return _this;
	}

	_createClass(WatcherV1, [{
		key: 'watch',
		value: function watch(options) {
			var _this2 = this;

			new Promise(function (resolve, reject) {
				// Request history data before subscribing
				_this2.selector.request({
					service: 'ieq',
					func: 'DataRequest',
					data: { data: JSON.stringify(options) },
					obj: _this2.getDataRequestObject()
				}, function (dnId, err, dataString) {
					if (err != null) {
						reject(err);
						return;
					}
					if (_this2.state === 'stopped') {
						reject(new StopCondition());
					}
					var data = JSON.parse(dataString);
					_this2.emit('data', data);
					resolve();
				});
			}).then(function () {
				// subscribe to signal
				return new Promise(function (resolve, reject) {
					_this2.subscription = _this2.selector.subscribe({
						service: 'ieq',
						func: options.criteria.time.sampling,
						data: { data: options },
						obj: _this2.getFireDataObject()
					}, function (dnd, err, _data) {
						var data = _data;
						if (err != null) {
							reject(err);
							return;
						}
						data = JSON.parse(data);
						_this2.emit('data', data);

						_this2.reconnectionPeriod = 0; // reset period on subscription requests
						resolve();
					});
				});
			}).catch(function (err) {
				if (err.name === 'StopCondition') {
					// watcher stopped : do nothing
					return;
				}
				// try to restart later
				_this2._closeSubscription(); // should not be necessary
				_this2.reconnectionPeriod = _this2.reconnectionPeriod + 1000; // increase delay by 1 sec
				if (_this2.reconnectionPeriod > _this2.maxReconnectionPeriod) {
					_this2.reconnectionPeriod = _this2.maxReconnectionPeriod; // max 5min
				}
				_this2.watchTentative = setTimeout(function () {
					_this2.watch(options);
				}, _this2.reconnectionPeriod); // try again later
			});
		}

		// Close subscription if any

	}, {
		key: '_closeSubscription',
		value: function _closeSubscription() {
			if (this.subscription != null) {
				this.subscription.close();
				this.subscription = null;
			}
		}
	}, {
		key: 'stop',
		value: function stop() {
			this.state = 'stopped';
			if (this.watchTentative != null) {
				clearTimeout(this.watchTentative);
			}
			this._closeSubscription();
			this.emit('stop');
			this.removeAllListeners();
		}
	}], [{
		key: 'getDataRequestObject',
		value: function getDataRequestObject() {
			return {
				path: '/fr/partnering/Ieq',
				interface: 'fr.partnering.Ieq'
			};
		}
	}, {
		key: 'getFireDataObject',
		value: function getFireDataObject() {
			return {
				path: '/fr/partnering/Ieq',
				interface: 'fr.partnering.Ieq'
			};
		}
	}]);

	return WatcherV1;
}(EventEmitter);

module.exports = WatcherV1;

},{"../stopConditionError.js":3,"../timecontrol.js":4,"bluebird":undefined,"eventemitter3":1}],7:[function(require,module,exports){
/*
 * Copyright : Partnering 3.0 (2007-2020)
 * Author : Partnering Robotics <software@partnering.fr>
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

'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var WatcherV2 = require('../v2/watcher.js');
var ConnectorV1 = require('../v1/connector.js');

var ConnectorV2 = function (_ConnectorV) {
  _inherits(ConnectorV2, _ConnectorV);

  function ConnectorV2(selector) {
    var _ret;

    _classCallCheck(this, ConnectorV2);

    var _this = _possibleConstructorReturn(this, (ConnectorV2.__proto__ || Object.getPrototypeOf(ConnectorV2)).call(this, selector));

    _this.selector = selector;
    return _ret = _this, _possibleConstructorReturn(_this, _ret);
  }

  _createClass(ConnectorV2, [{
    key: 'getUpdateDataObject',
    value: function getUpdateDataObject() {
      return {
        path: '/fr/partnering/Ieq/Update/' + WatcherV2.formatPeerName(this.selector._connection.self()),
        interface: 'fr.partnering.Ieq.Update'
      };
    }
  }, {
    key: 'getCsvDataObject',
    value: function getCsvDataObject() {
      return {
        path: '/fr/partnering/Ieq/Export/' + WatcherV2.formatPeerName(this.selector._connection.self()),
        interface: 'fr.partnering.Ieq.Export'
      };
    }
  }, {
    key: 'createWatcher',
    value: function createWatcher(config) {
      return new WatcherV2(this.selector, config);
    }
  }]);

  return ConnectorV2;
}(ConnectorV1);

module.exports = ConnectorV2;

},{"../v1/connector.js":5,"../v2/watcher.js":8}],8:[function(require,module,exports){
/*
 * Copyright : Partnering 3.0 (2007-2020)
 * Author : Partnering Robotics <software@partnering.fr>
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

'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var WatcherV1 = require('../v1/watcher.js');

var WatcherV2 = function (_WatcherV) {
  _inherits(WatcherV2, _WatcherV);

  /**
   * @param emit emit data (mandatory)
   * @param config to get data from server
   */
  function WatcherV2(selector, _config) {
    _classCallCheck(this, WatcherV2);

    var _this = _possibleConstructorReturn(this, (WatcherV2.__proto__ || Object.getPrototypeOf(WatcherV2)).call(this, selector, _config));

    _this.selector = selector;
    return _this;
  }

  _createClass(WatcherV2, [{
    key: 'getDataRequestObject',
    value: function getDataRequestObject() {
      return {
        path: '/fr/partnering/Ieq/Request/' + WatcherV2.formatPeerName(this.selector._connection.self()),
        interface: 'fr.partnering.Ieq.Request'
      };
    }
  }, {
    key: 'getFireDataObject',
    value: function getFireDataObject() {
      return {
        path: '/fr/partnering/Ieq/Fire/' + WatcherV2.formatPeerName(this.selector._connection.self()),
        interface: 'fr.partnering.Ieq.Fire'
      };
    }
  }], [{
    key: 'formatPeerName',
    value: function formatPeerName(input) {
      var delimiter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '-';

      return input.split(delimiter).map(function (s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
      }).join('');
    }
  }]);

  return WatcherV2;
}(WatcherV1);

module.exports = WatcherV2;

},{"../v1/watcher.js":6}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZXZlbnRlbWl0dGVyMy9pbmRleC5qcyIsInNyYy9pZXEuanMiLCJzcmMvc3RvcENvbmRpdGlvbkVycm9yLmpzIiwic3JjL3RpbWVjb250cm9sLmpzIiwic3JjL3YxL2Nvbm5lY3Rvci5qcyIsInNyYy92MS93YXRjaGVyLmpzIiwic3JjL3YyL2Nvbm5lY3Rvci5qcyIsInNyYy92Mi93YXRjaGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdlRBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBbUJBLElBQU0sY0FBYyxRQUFRLG1CQUFSLENBQXBCO0FBQ0EsSUFBTSxjQUFjLFFBQVEsbUJBQVIsQ0FBcEI7O0FBRUMsYUFBWTtBQUNaLEtBQUkscUJBQUo7QUFDQSxLQUFJO0FBQ0g7QUFDQSxpQkFBZSxHQUFHLFlBQWxCO0FBQ0EsRUFIRCxDQUlBLE9BQU8sS0FBUCxFQUFjO0FBQ2IsTUFBSSxNQUFNLElBQU4sS0FBZSxnQkFBbkIsRUFBcUM7QUFDcEM7QUFDQSxPQUFNLEtBQUssUUFBUSxVQUFSLENBQVg7QUFDQSxrQkFBZSxHQUFHLFlBQWxCO0FBQ0EsR0FKRCxNQUlPO0FBQ04sU0FBTSxLQUFOO0FBQ0E7QUFDRDs7QUFFRDs7QUFFQTtBQUNBLGNBQWEsU0FBYixDQUF1QixHQUF2QixHQUE2QixZQUFZO0FBQUE7O0FBQ3hDLFNBQU8sSUFBSSxPQUFKLENBQVksVUFBQyxPQUFELEVBQVUsTUFBVixFQUFxQjtBQUN2QyxTQUFLLE9BQUwsQ0FBYTtBQUNaLGFBQVMsS0FERztBQUVaLFVBQVM7QUFGRyxJQUFiLEVBR0csVUFBQyxNQUFELEVBQVMsR0FBVCxFQUFjLElBQWQsRUFBdUI7QUFDekIsUUFBSSxPQUFPLElBQVgsRUFBaUI7QUFDaEIsYUFBUSxJQUFSO0FBQ0EsS0FGRCxNQUVPO0FBQ04sWUFBTyxHQUFQO0FBQ0E7QUFDRCxJQVREO0FBVUEsR0FYTSxFQVlOLElBWk0sQ0FZRCxVQUFDLElBQUQsRUFBVTtBQUNmLE9BQUksU0FBUyxDQUFiLEVBQWdCO0FBQ2YsV0FBTyxJQUFJLFdBQUosQ0FBZ0IsS0FBaEIsQ0FBUDtBQUNBO0FBQ0QsU0FBTSxJQUFJLEtBQUosQ0FBVSw4QkFBVixDQUFOO0FBQ0EsR0FqQk0sRUFrQk4sS0FsQk0sQ0FrQkEsVUFBQyxHQUFELEVBQVM7QUFDZixPQUFJLElBQUksUUFBSixDQUFhLHdEQUFiLENBQUosRUFBNEU7QUFDM0UsV0FBTyxJQUFJLFdBQUosQ0FBZ0IsS0FBaEIsQ0FBUDtBQUNBO0FBQ0QsU0FBTSxJQUFJLEtBQUosQ0FBVSxHQUFWLENBQU47QUFDQSxHQXZCTSxDQUFQO0FBd0JBLEVBekJEO0FBMEJBLENBN0NBLEdBQUQ7Ozs7Ozs7Ozs7O0lDdEJNLGE7OztBQUNMLHdCQUFhLEdBQWIsRUFBa0I7QUFBQTs7QUFBQSw0SEFDWCxHQURXOztBQUVqQixRQUFLLElBQUwsR0FBWSxlQUFaO0FBRmlCO0FBR2pCOzs7RUFKMEIsSzs7QUFNNUIsT0FBTyxPQUFQLEdBQWlCLGFBQWpCOzs7QUNOQTs7QUFFQTs7Ozs7O0FBS0EsSUFBTSxhQUFhLFNBQWIsVUFBYSxDQUFVLElBQVYsRUFBZ0I7QUFDbEMsUUFBTyxJQUFJLElBQUosQ0FBUyxJQUFULEVBQWUsT0FBZixFQUFQO0FBQ0EsQ0FGRDs7QUFJQTs7Ozs7OztBQU9BLElBQU0sa0JBQWtCLFNBQWxCLGVBQWtCLENBQVUsSUFBVixFQUFnQixXQUFoQixFQUE2QjtBQUNwRCxLQUFJLGFBQWEsV0FBakI7QUFDQTtBQUNBLEtBQUksUUFBUSxJQUFaLEVBQWtCO0FBQ2pCLFNBQU8sU0FBUDtBQUNBO0FBQ0Q7QUFDQSxLQUFJLGNBQWMsSUFBbEIsRUFBd0I7QUFDdkIsZUFBYSxHQUFiO0FBQ0E7O0FBRUQ7QUFDQSxLQUFJLFFBQVEsS0FBSyxLQUFqQjtBQUNBLEtBQUksU0FBUyxJQUFiLEVBQW1CO0FBQ2xCLFVBQVEsQ0FBUjtBQUNBOztBQUVEO0FBQ0EsS0FBTSxnQkFBZ0I7QUFDckIsVUFBUSxDQURhO0FBRXJCLFVBQVEsRUFGYTtBQUdyQixRQUFRLElBSGE7QUFJckIsT0FBUSxLQUFLLElBSlE7QUFLckIsUUFBUSxJQUFJLEVBQUosR0FBUyxJQUxJO0FBTXJCLFNBQVEsS0FBSyxFQUFMLEdBQVUsSUFORztBQU9yQixRQUFRLE1BQU0sRUFBTixHQUFXOztBQUdwQjtBQVZzQixFQUF0QixDQVdBLElBQU0scUJBQXFCLENBQzFCLEVBQUUsUUFBUSxVQUFWLEVBQXNCLFVBQVUsUUFBaEMsRUFEMEIsRUFFMUIsRUFBRSxRQUFRLGFBQWEsRUFBdkIsRUFBMkIsVUFBVSxRQUFyQyxFQUYwQixFQUcxQixFQUFFLFFBQVEsYUFBYSxJQUF2QixFQUE2QixVQUFVLE1BQXZDLEVBSDBCLEVBSTFCLEVBQUUsUUFBUSxhQUFhLEVBQWIsR0FBa0IsSUFBNUIsRUFBa0MsVUFBVSxLQUE1QyxFQUowQixFQUsxQixFQUFFLFFBQVEsYUFBYSxDQUFiLEdBQWlCLEVBQWpCLEdBQXNCLElBQWhDLEVBQXNDLFVBQVUsTUFBaEQsRUFMMEIsRUFNMUIsRUFBRSxRQUFRLGFBQWEsRUFBYixHQUFrQixFQUFsQixHQUF1QixJQUFqQyxFQUF1QyxVQUFVLE9BQWpELEVBTjBCLENBQTNCOztBQVNBLEtBQUksV0FBVyxLQUFLLFNBQUwsQ0FBZSxXQUFmLEVBQWY7QUFDQSxLQUFNLE9BQU8sU0FBUyxNQUFULEdBQWtCLENBQS9CO0FBQ0E7QUFDQSxLQUFJLFNBQVMsSUFBVCxNQUFtQixHQUF2QixFQUE0QjtBQUMzQixhQUFXLFNBQVMsS0FBVCxDQUFlLENBQWYsRUFBa0IsSUFBbEIsQ0FBWDtBQUNBOztBQUVELEtBQU0sWUFBWSxRQUFRLGNBQWMsUUFBZCxDQUExQjs7QUFFQSxLQUFJLGVBQWUsTUFBbkIsQ0EvQ29ELENBK0MxQjtBQUMxQjtBQUNBLG9CQUFtQixJQUFuQixDQUF3QixVQUFDLGlCQUFELEVBQXVCO0FBQzlDO0FBQ0EsaUJBQWUsa0JBQWtCLFFBQWpDO0FBQ0EsU0FBTyxZQUFZLGtCQUFrQixNQUFyQztBQUNBLEVBSkQ7O0FBTUEsUUFBTyxZQUFQO0FBQ0EsQ0F4REQ7O0FBMERBO0FBQ0EsT0FBTyxPQUFQLEdBQWlCO0FBQ2hCLHVCQURnQjtBQUVoQjtBQUZnQixDQUFqQjs7O0FDN0VBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQW9CQTs7Ozs7Ozs7Ozs7OztBQWFBOzs7Ozs7OztBQUVBLElBQU0sWUFBYSxRQUFRLGtCQUFSLENBQW5CO0FBQ0EsSUFBTSxhQUFhLFFBQVEsbUJBQVIsRUFBNkIsVUFBaEQ7O0lBRU0sVztBQUNMLHNCQUFhLFFBQWIsRUFBdUI7QUFBQTs7QUFDdEIsT0FBSyxRQUFMLEdBQWdCLFFBQWhCO0FBQ0EsT0FBSyxTQUFMLEdBQWlCLEVBQWpCO0FBQ0EsT0FBSyxNQUFMLEdBQWMsU0FBUyxNQUFULEVBQWQ7QUFDQSxPQUFLLFFBQUwsR0FBZ0IsRUFBaEI7O0FBRUE7Ozs7Ozs7Ozs7Ozs7QUFjQSxPQUFLLFVBQUwsR0FBa0I7QUFDakIsYUFBVTtBQUNULFVBQU07QUFDTCxZQUFPLElBREY7QUFFTCxVQUFPLElBRkY7QUFHTCxZQUFPLElBSEYsQ0FHTztBQUhQLEtBREc7QUFNVCxZQUFRLElBTkM7QUFPVCxZQUFRO0FBUEMsSUFETztBQVVqQixhQUFVLE1BVk87QUFXakIsWUFBVSxJQVhPO0FBWWpCLGFBQVUsSUFaTyxDQVlGO0FBWkUsR0FBbEI7O0FBZUEsU0FBTyxJQUFQO0FBQ0E7Ozs7d0NBRXNCO0FBQ3RCLFVBQU87QUFDTixVQUFXLG9CQURMO0FBRU4sZUFBVztBQUZMLElBQVA7QUFJQTs7O3FDQUVtQjtBQUNuQixVQUFPO0FBQ04sVUFBVyxvQkFETDtBQUVOLGVBQVc7QUFGTCxJQUFQO0FBSUE7O0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7aUNBZ0JnQjtBQUNmLFVBQU8sS0FBSyxTQUFaO0FBQ0E7OztpQ0FFZTtBQUNmLFVBQU8sS0FBSyxTQUFMLENBQWUsS0FBdEI7QUFDQTs7QUFFRDs7Ozs7Ozs7Ozs2QkFPWSxhLEVBQWU7QUFDMUIsT0FBSSxpQkFBaUIsSUFBckIsRUFBMkI7QUFDMUIsU0FBSyxVQUFMLEdBQWtCLGFBQWxCO0FBQ0EsV0FBTyxJQUFQO0FBQ0E7QUFDRCxVQUFPLEtBQUssVUFBWjtBQUNBOztBQUVEOzs7Ozs7Ozs7Ozs7OzsrQkFXYyxXLEVBQWE7QUFDMUIsT0FBSSxlQUFlLElBQW5CLEVBQXlCO0FBQ3hCLFNBQUssVUFBTCxDQUFnQixRQUFoQixHQUEyQixXQUEzQjtBQUNBLFdBQU8sSUFBUDtBQUNBO0FBQ0QsVUFBTyxLQUFLLFVBQUwsQ0FBZ0IsUUFBdkI7QUFDQTs7QUFFRDs7Ozs7Ozs7Ozs7K0JBUWMsVSxFQUFZO0FBQ3pCLE9BQUksY0FBYyxJQUFsQixFQUF3QjtBQUN2QixTQUFLLFVBQUwsQ0FBZ0IsUUFBaEIsR0FBMkIsVUFBM0I7QUFDQSxXQUFPLElBQVA7QUFDQTtBQUNELFVBQU8sS0FBSyxVQUFMLENBQWdCLFFBQXZCO0FBQ0E7O0FBRUQ7Ozs7Ozs7Ozs7OzsyQkFTVSxZLEVBQWMsVSxFQUFZLFEsRUFBVTtBQUM3QyxPQUFJLGdCQUFnQixJQUFoQixJQUF3QixjQUFjLElBQXRDLElBQThDLFlBQVksSUFBOUQsRUFBb0U7QUFDbkUsU0FBSyxVQUFMLENBQWdCLFFBQWhCLENBQXlCLElBQXpCLENBQThCLEtBQTlCLEdBQXNDLFdBQVcsWUFBWCxDQUF0QztBQUNBLFNBQUssVUFBTCxDQUFnQixRQUFoQixDQUF5QixJQUF6QixDQUE4QixHQUE5QixHQUFvQyxXQUFXLFVBQVgsQ0FBcEM7QUFDQSxTQUFLLFVBQUwsQ0FBZ0IsUUFBaEIsQ0FBeUIsSUFBekIsQ0FBOEIsS0FBOUIsR0FBc0MsUUFBdEM7QUFDQSxXQUFPLElBQVA7QUFDQTtBQUNELFVBQU87QUFDTixXQUFPLElBQUksSUFBSixDQUFTLEtBQUssVUFBTCxDQUFnQixRQUFoQixDQUF5QixJQUF6QixDQUE4QixLQUF2QyxDQUREO0FBRU4sU0FBTyxJQUFJLElBQUosQ0FBUyxLQUFLLFVBQUwsQ0FBZ0IsUUFBaEIsQ0FBeUIsSUFBekIsQ0FBOEIsR0FBdkMsQ0FGRDtBQUdOLFdBQU8sSUFBSSxJQUFKLENBQVMsS0FBSyxVQUFMLENBQWdCLFFBQWhCLENBQXlCLElBQXpCLENBQThCLEtBQXZDO0FBSEQsSUFBUDtBQUtBOztBQUVEOzs7Ozs7Ozs7OytCQU9jLFEsRUFBVTtBQUN2QixPQUFJLFlBQVksSUFBaEIsRUFBc0I7QUFDckIsU0FBSyxVQUFMLENBQWdCLFFBQWhCLENBQXlCLE1BQXpCLEdBQWtDLFFBQWxDO0FBQ0EsV0FBTyxJQUFQO0FBQ0E7QUFDRCxVQUFPLEtBQUssVUFBTCxDQUFnQixRQUFoQixDQUF5QixNQUFoQztBQUNBOztBQUVEOzs7Ozs7Ozs7OytCQU9jLFEsRUFBVTtBQUN2QixPQUFJLFlBQVksSUFBaEIsRUFBc0I7QUFDckIsU0FBSyxVQUFMLENBQWdCLFFBQWhCLENBQXlCLE9BQXpCLEdBQW1DLFFBQW5DO0FBQ0EsV0FBTyxJQUFQO0FBQ0E7QUFDRCxVQUFPLEtBQUssVUFBTCxDQUFnQixRQUFoQixDQUF5QixNQUFoQztBQUNBOztBQUVEOzs7Ozs7O2dDQUllLFcsRUFBYTtBQUMzQixPQUFNLE9BQU8sRUFBYjtBQUNBLFFBQUssSUFBTSxDQUFYLElBQWdCLFdBQWhCLEVBQTZCO0FBQzVCLFNBQUssSUFBTCxDQUFVLEtBQUssU0FBTCxDQUFlLFlBQVksQ0FBWixDQUFmLENBQVY7QUFDQTtBQUNELFVBQU8sSUFBUDtBQUNBOztBQUVEOzs7Ozs7Ozs7NkJBTVksUSxFQUFVLFUsRUFBWTtBQUNqQyxRQUFLLFdBQUwsQ0FBaUIsUUFBakIsRUFBMkIsVUFBM0IsRUFBdUMsYUFBdkM7QUFDQTs7QUFFRDs7Ozs7Ozs7Ozs4QkFPYSxRLEVBQVUsVSxFQUFZLFEsRUFBVTtBQUFBOztBQUM1QyxPQUFJLFVBQUosRUFBZ0I7QUFDZixTQUFLLFVBQUwsQ0FBZ0IsVUFBaEI7QUFDQTtBQUNELFFBQUssUUFBTCxDQUFjLE9BQWQsQ0FBc0I7QUFDckIsYUFBUyxLQURZO0FBRXJCLFVBQVMsUUFGWTtBQUdyQixVQUFTLEVBQUUsTUFBTSxLQUFLLFNBQUwsQ0FBZSxLQUFLLFVBQXBCLENBQVIsRUFIWSxFQUdnQztBQUNyRCxTQUFTLEtBQUssbUJBQUw7QUFKWSxJQUF0QixFQUtHLFVBQUMsSUFBRCxFQUFPLEdBQVAsRUFBWSxLQUFaLEVBQXNCO0FBQ3hCLFFBQU0sT0FBTyxLQUFLLEtBQUwsQ0FBVyxLQUFYLENBQWI7QUFDQSxRQUFJLE9BQU8sSUFBWCxFQUFpQjtBQUNoQixTQUFJLFFBQU8sR0FBUCx5Q0FBTyxHQUFQLE9BQWUsUUFBZixJQUEyQixPQUFPLElBQUksSUFBWCxLQUFvQixRQUFuRCxFQUE2RDtBQUM1RCxlQUFTLElBQVQsRUFBZSxJQUFJLElBQW5CO0FBQ0E7QUFDRDtBQUNBO0FBQ0QsYUFBUyxNQUFLLHFCQUFMLENBQTJCLElBQTNCLENBQVQsRUFSd0IsQ0FRbUI7QUFDM0MsSUFkRDtBQWVBOzs7d0NBRXNCO0FBQ3RCLFVBQU8sS0FBSyxXQUFaO0FBQ0E7Ozt1Q0FFcUI7QUFDckIsVUFBTyxLQUFLLFVBQVo7QUFDQTs7O3VDQUVxQjtBQUNyQixVQUFPLEtBQUssVUFBWjtBQUNBOztBQUVEOzs7Ozs7Ozs7d0JBTU8sTSxFQUFRLFEsRUFBVTtBQUFBOztBQUN4QjtBQUNBLE9BQUksWUFBWSxJQUFaLElBQW9CLE9BQU8sUUFBUCxLQUFvQixVQUE1QyxFQUF3RDtBQUN2RCxXQUFPLElBQVA7QUFDQTs7QUFFRCxPQUFNLFVBQVUsS0FBSyxhQUFMLENBQW1CLE1BQW5CLENBQWhCOztBQUVBO0FBQ0EsUUFBSyxRQUFMLENBQWMsSUFBZCxDQUFtQixPQUFuQjs7QUFFQSxXQUFRLEVBQVIsQ0FBVyxNQUFYLEVBQW1CLFVBQUMsSUFBRCxFQUFVO0FBQzVCLGFBQVMsT0FBSyxxQkFBTCxDQUEyQixJQUEzQixDQUFUO0FBQ0EsSUFGRDtBQUdBLFdBQVEsRUFBUixDQUFXLE1BQVgsRUFBbUIsS0FBSyxjQUF4Qjs7QUFFQSxVQUFPLE9BQVA7QUFDQTs7O2dDQUVjLE0sRUFBUTtBQUN0QixVQUFPLElBQUksU0FBSixDQUFjLEtBQUssUUFBbkIsRUFBNkIsTUFBN0IsQ0FBUDtBQUNBOztBQUVEOzs7Ozs7O2lDQUlnQixPLEVBQVM7QUFDeEI7QUFDQSxRQUFLLFFBQUwsQ0FBYyxJQUFkLENBQW1CLFVBQUMsRUFBRCxFQUFLLEVBQUwsRUFBUyxRQUFULEVBQXNCO0FBQ3hDLFFBQUksWUFBWSxFQUFoQixFQUFvQjtBQUNuQixjQUFTLE1BQVQsQ0FBZ0IsRUFBaEIsRUFBb0IsQ0FBcEIsRUFEbUIsQ0FDSTtBQUN2QixZQUFPLElBQVA7QUFDQTtBQUNELFdBQU8sS0FBUDtBQUNBLElBTkQ7QUFPQTs7QUFFRDs7Ozs7O3VDQUdzQjtBQUNyQixXQUFRLElBQVIsQ0FBYSw4Q0FBYjtBQUNBLFFBQUssWUFBTDtBQUNBOzs7aUNBRWU7QUFBQTs7QUFDZixRQUFLLFFBQUwsQ0FBYyxPQUFkLENBQXNCLFVBQUMsT0FBRCxFQUFhO0FBQ2xDO0FBQ0EsWUFBUSxjQUFSLENBQXVCLE1BQXZCLEVBQStCLE9BQUssY0FBcEM7QUFDQSxZQUFRLElBQVI7QUFDQSxJQUpEO0FBS0EsUUFBSyxRQUFMLEdBQWdCLEVBQWhCO0FBQ0E7O0FBRUQ7Ozs7Ozs7Ozs7Ozs7NkJBVVksVSxFQUFZLFEsRUFBVTtBQUNqQyxPQUFNLFlBQVksVUFBbEI7QUFDQSxPQUFJLGFBQWEsT0FBTyxVQUFVLE1BQWpCLEtBQTRCLFFBQTdDLEVBQXVEO0FBQ3RELGNBQVUsTUFBVixHQUFtQixTQUFuQjtBQUNBO0FBQ0QsT0FBSSxhQUFhLE9BQU8sVUFBVSxJQUFqQixLQUEwQixRQUEzQyxFQUFxRDtBQUNwRCxjQUFVLElBQVYsR0FBaUIsU0FBakI7QUFDQTs7QUFFRCxPQUFNLGFBQWEsS0FBSyxTQUFMLENBQWU7QUFDakMsY0FBVTtBQUNULFdBQVEsRUFBRSxPQUFPLFdBQVcsVUFBVSxTQUFyQixDQUFULEVBQTBDLEtBQUssV0FBVyxVQUFVLE9BQXJCLENBQS9DLEVBQThFLFVBQVUsVUFBVSxVQUFsRyxFQURDO0FBRVQsYUFBUSxFQUZDO0FBR1QsYUFBUTtBQUhDLEtBRHVCO0FBTWpDLGFBQVUsVUFBVSxXQU5hO0FBT2pDLGNBQVUsVUFBVSxNQVBhO0FBUWpDLFVBQVUsVUFBVTtBQVJhLElBQWYsQ0FBbkI7O0FBV0EsUUFBSyxRQUFMLENBQWMsT0FBZCxDQUFzQjtBQUNyQixhQUFTLEtBRFk7QUFFckIsVUFBUyxnQkFGWTtBQUdyQixVQUFTLEVBQUUsTUFBTSxVQUFSLEVBSFk7QUFJckI7QUFDQSxTQUFTLEtBQUssZ0JBQUw7QUFMWSxJQUF0QixFQU1HLFVBQUMsSUFBRCxFQUFPLEdBQVAsRUFBWSxJQUFaLEVBQXFCO0FBQ3ZCLFFBQUksR0FBSixFQUFTO0FBQ1IsU0FBSSxRQUFPLEdBQVAseUNBQU8sR0FBUCxPQUFlLFFBQWYsSUFBMkIsT0FBTyxJQUFJLElBQVgsS0FBb0IsUUFBbkQsRUFBNkQ7QUFDNUQsZUFBUyxJQUFULEVBQWUsSUFBSSxJQUFuQjtBQUNBO0FBQ0Q7QUFDQTtBQUNELGFBQVMsSUFBVDtBQUNBLElBZEQ7QUFlQTs7QUFFRDs7Ozs7Ozs7aUNBS2dCLFUsRUFBWSxRLEVBQVU7QUFDckMsV0FBUSxJQUFSLENBQWEsb0VBQWI7QUFDQSxRQUFLLFVBQUwsQ0FBZ0IsVUFBaEIsRUFBNEIsUUFBNUI7QUFDQTs7QUFFRDs7Ozs7Ozs7NkJBS1ksVSxFQUFZLFEsRUFBVTtBQUNqQyxRQUFLLFdBQUwsQ0FBaUIsUUFBakIsRUFBMkIsVUFBM0IsRUFBdUMsYUFBdkM7QUFDQTs7QUFFRDs7Ozs7Ozs7Ozs7aUNBUWdCLFcsRUFBYSxJLEVBQU0sTSxFQUFRLFEsRUFBVTtBQUNwRCxPQUFNLGFBQWE7QUFDbEIsY0FBVTtBQUNULFdBQVEsRUFBRSxPQUFPLFdBQVcsS0FBSyxVQUFoQixDQUFULEVBQXNDLEtBQUssV0FBVyxLQUFLLFFBQWhCLENBQTNDLEVBQXNFLFVBQVUsTUFBaEYsRUFEQztBQUVULGFBQVEsRUFGQztBQUdULGFBQVE7QUFIQyxLQURRO0FBTWxCLGFBQVM7QUFOUyxJQUFuQjtBQVFBLFdBQVEsSUFBUixDQUFhLG9FQUFiO0FBQ0E7QUFDQSxRQUFLLFVBQUwsQ0FBZ0IsVUFBaEIsRUFBNEIsUUFBNUI7QUFDQTs7QUFFRDs7Ozs7Ozs7d0NBS3VCLEksRUFBTTtBQUM1QixPQUFJLFlBQVksSUFBaEI7QUFDQSxPQUFJLFFBQVEsSUFBWixFQUFrQjtBQUNqQixTQUFLLElBQU0sQ0FBWCxJQUFnQixJQUFoQixFQUFzQjtBQUNyQixTQUFJLE1BQU0sUUFBTixJQUFrQixNQUFNLEtBQTVCLEVBQW1DO0FBQ2xDLFVBQUksS0FBSyxDQUFMLEVBQVEsR0FBUixJQUFlLElBQWYsSUFBdUIsS0FBSyxDQUFMLEVBQVEsR0FBUixDQUFZLEVBQVosR0FBaUIsQ0FBNUMsRUFBK0M7QUFDOUM7QUFDQTs7QUFFRCxVQUFJLENBQUMsU0FBTCxFQUFnQjtBQUNmLG1CQUFZLEVBQVo7QUFDQTs7QUFFRCxVQUFJLENBQUMsVUFBVSxDQUFWLENBQUwsRUFBbUI7QUFDbEIsaUJBQVUsQ0FBVixJQUFlLEVBQWY7QUFDQTtBQUNEO0FBQ0EsZ0JBQVUsQ0FBVixFQUFhLEVBQWIsR0FBa0IsQ0FBbEI7QUFDQTtBQUNBLGdCQUFVLENBQVYsRUFBYSxLQUFiLEdBQXFCLEtBQUssQ0FBTCxFQUFRLEtBQTdCO0FBQ0E7QUFDQSxnQkFBVSxDQUFWLEVBQWEsU0FBYixHQUF5QixLQUFLLENBQUwsRUFBUSxTQUFqQztBQUNBO0FBQ0EsZ0JBQVUsQ0FBVixFQUFhLEtBQWIsR0FBcUIsS0FBSyxDQUFMLEVBQVEsS0FBN0I7QUFDQTtBQUNBLGdCQUFVLENBQVYsRUFBYSxJQUFiLEdBQW9CLEtBQUssQ0FBTCxFQUFRLElBQTVCO0FBQ0E7QUFDQSxnQkFBVSxDQUFWLEVBQWEsU0FBYixHQUF5QixLQUFLLENBQUwsRUFBUSxTQUFqQztBQUNBO0FBQ0EsZ0JBQVUsQ0FBVixFQUFhLFFBQWIsR0FBd0IsS0FBSyxDQUFMLEVBQVEsUUFBaEM7QUFDQTtBQUNBLGdCQUFVLENBQVYsRUFBYSxTQUFiLEdBQXlCLENBQUMsQ0FBRCxFQUFJLEdBQUosQ0FBekI7QUFDQTtBQUNBLGdCQUFVLENBQVYsRUFBYSxZQUFiLEdBQTRCLEtBQUssQ0FBTCxFQUFRLFlBQXBDOztBQUVBO0FBQ0EsZ0JBQVUsQ0FBVixFQUFhLGFBQWIsR0FBNkIsRUFBRSxZQUFZLEtBQUssQ0FBTCxFQUFRLFVBQXRCLEVBQTdCO0FBQ0EsZ0JBQVUsQ0FBVixFQUFhLElBQWIsR0FBb0IsS0FBSyxNQUFMLENBQVksSUFBWixDQUFpQixLQUFLLENBQUwsRUFBUSxJQUF6QixFQUErQixLQUEvQixFQUFzQyxDQUF0QyxDQUFwQjtBQUNBLGdCQUFVLENBQVYsRUFBYSxJQUFiLEdBQW9CLEtBQUssQ0FBTCxFQUFRLElBQVIsSUFBZ0IsSUFBaEIsR0FDakIsS0FBSyxNQUFMLENBQVksSUFBWixDQUFpQixLQUFLLENBQUwsRUFBUSxJQUF6QixFQUErQixLQUEvQixFQUFzQyxDQUF0QyxDQURpQixHQUVqQixLQUFLLENBQUwsRUFBUSxHQUFSLElBQWUsSUFBZixHQUNHLEtBQUssTUFBTCxDQUFZLElBQVosQ0FBaUIsS0FBSyxDQUFMLEVBQVEsR0FBUixDQUFZLENBQTdCLEVBQWdDLEtBQWhDLEVBQXVDLENBQXZDLENBREgsR0FFRyxJQUpOO0FBS0EsZ0JBQVUsQ0FBVixFQUFhLFlBQWIsR0FBNEIsS0FBSyxDQUFMLEVBQVEsSUFBUixJQUFnQixJQUFoQixHQUN6QixLQUFLLE1BQUwsQ0FBWSxJQUFaLENBQWlCLEtBQUssQ0FBTCxFQUFRLEtBQXpCLEVBQWdDLEtBQWhDLEVBQXVDLENBQXZDLENBRHlCLEdBRXpCLEtBQUssQ0FBTCxFQUFRLEdBQVIsSUFBZSxJQUFmLEdBQ0csS0FBSyxNQUFMLENBQVksSUFBWixDQUFpQixLQUFLLENBQUwsRUFBUSxHQUFSLENBQVksQ0FBN0IsRUFBZ0MsS0FBaEMsRUFBdUMsQ0FBdkMsQ0FESCxHQUVHLElBSk47QUFLQSxnQkFBVSxDQUFWLEVBQWEsT0FBYixHQUF1QixLQUFLLE1BQUwsQ0FBWSxJQUFaLENBQWlCLEtBQUssQ0FBTCxFQUFRLE9BQXpCLEVBQWtDLEtBQWxDLEVBQXlDLENBQXpDLENBQXZCO0FBQ0EsVUFBSSxVQUFVLENBQVYsRUFBYSxPQUFiLElBQXdCLElBQTVCLEVBQWtDO0FBQUE7QUFDakM7QUFDQSxZQUFNLFlBQVksRUFBbEI7QUFDQSxhQUFLLE1BQUwsQ0FBWSxNQUFaLENBQW1CLE9BQW5CLENBQTJCLFVBQUMsRUFBRCxFQUFRO0FBQ2xDLG1CQUFVLEdBQUcsRUFBYixJQUFtQixHQUFHLElBQXRCO0FBQ0EsU0FGRDtBQUdBLGtCQUFVLENBQVYsRUFBYSxPQUFiLEdBQXVCLFVBQVUsQ0FBVixFQUFhLE9BQWIsQ0FBcUIsR0FBckIsQ0FBeUIsVUFBQyxFQUFELEVBQVE7QUFDdkQsZ0JBQU8sVUFBVSxFQUFWLENBQVA7QUFDQSxTQUZzQixDQUF2QjtBQU5pQztBQVNqQzs7QUFFRCxnQkFBVSxDQUFWLEVBQWEsT0FBYixHQUF1QixLQUFLLE1BQUwsQ0FBWSxJQUFaLENBQWlCLEtBQUssQ0FBTCxFQUFRLE9BQXpCLEVBQWtDLEtBQWxDLEVBQXlDLENBQXpDLENBQXZCO0FBQ0EsZ0JBQVUsQ0FBVixFQUFhLENBQWIsR0FBaUIsSUFBakI7QUFDQSxnQkFBVSxDQUFWLEVBQWEsQ0FBYixHQUFpQixJQUFqQjs7QUFFQSxVQUFJLEtBQUssQ0FBTCxFQUFRLEdBQVIsSUFBZSxJQUFuQixFQUF5QjtBQUN4QixpQkFBVSxDQUFWLEVBQWEsR0FBYixHQUFtQjtBQUNsQixXQUFHLEtBQUssTUFBTCxDQUFZLElBQVosQ0FBaUIsS0FBSyxDQUFMLEVBQVEsR0FBUixDQUFZLENBQTdCLEVBQWdDLEtBQWhDLEVBQXVDLENBQXZDLENBRGU7QUFFbEIsV0FBRyxLQUFLLE1BQUwsQ0FBWSxJQUFaLENBQWlCLEtBQUssQ0FBTCxFQUFRLEdBQVIsQ0FBWSxDQUE3QixFQUFnQyxLQUFoQyxFQUF1QyxDQUF2QztBQUZlLFFBQW5CO0FBSUE7QUFDRCxVQUFJLEtBQUssQ0FBTCxFQUFRLEdBQVIsSUFBZSxJQUFuQixFQUF5QjtBQUN4QixpQkFBVSxDQUFWLEVBQWEsR0FBYixHQUFtQjtBQUNsQixXQUFHLEtBQUssTUFBTCxDQUFZLElBQVosQ0FBaUIsS0FBSyxDQUFMLEVBQVEsR0FBUixDQUFZLENBQTdCLEVBQWdDLEtBQWhDLEVBQXVDLENBQXZDLENBRGU7QUFFbEIsV0FBRyxLQUFLLE1BQUwsQ0FBWSxJQUFaLENBQWlCLEtBQUssQ0FBTCxFQUFRLEdBQVIsQ0FBWSxDQUE3QixFQUFnQyxLQUFoQyxFQUF1QyxDQUF2QztBQUZlLFFBQW5CO0FBSUE7QUFDRCxVQUFJLEtBQUssQ0FBTCxFQUFRLEdBQVIsSUFBZSxJQUFuQixFQUF5QjtBQUN4QixpQkFBVSxDQUFWLEVBQWEsR0FBYixHQUFtQjtBQUNsQixXQUFHLEtBQUssTUFBTCxDQUFZLElBQVosQ0FBaUIsS0FBSyxDQUFMLEVBQVEsR0FBUixDQUFZLENBQTdCLEVBQWdDLEtBQWhDLEVBQXVDLENBQXZDLENBRGU7QUFFbEIsV0FBRyxLQUFLLE1BQUwsQ0FBWSxJQUFaLENBQWlCLEtBQUssQ0FBTCxFQUFRLEdBQVIsQ0FBWSxDQUE3QixFQUFnQyxLQUFoQyxFQUF1QyxDQUF2QztBQUZlLFFBQW5CO0FBSUE7QUFDRCxVQUFJLEtBQUssQ0FBTCxFQUFRLE1BQVIsSUFBa0IsSUFBdEIsRUFBNEI7QUFDM0IsaUJBQVUsQ0FBVixFQUFhLE1BQWIsR0FBc0I7QUFDckIsV0FBRyxLQUFLLE1BQUwsQ0FBWSxJQUFaLENBQWlCLEtBQUssQ0FBTCxFQUFRLE1BQVIsQ0FBZSxDQUFoQyxFQUFtQyxLQUFuQyxFQUEwQyxDQUExQyxDQURrQjtBQUVyQixXQUFHLEtBQUssTUFBTCxDQUFZLElBQVosQ0FBaUIsS0FBSyxDQUFMLEVBQVEsTUFBUixDQUFlLENBQWhDLEVBQW1DLEtBQW5DLEVBQTBDLENBQTFDO0FBRmtCLFFBQXRCO0FBSUE7QUFDRCxVQUFJLEtBQUssQ0FBTCxFQUFRLE1BQVIsSUFBa0IsSUFBdEIsRUFBNEI7QUFDM0IsaUJBQVUsQ0FBVixFQUFhLE1BQWIsR0FBc0I7QUFDckIsV0FBRyxLQUFLLE1BQUwsQ0FBWSxJQUFaLENBQWlCLEtBQUssQ0FBTCxFQUFRLE1BQVIsQ0FBZSxDQUFoQyxFQUFtQyxLQUFuQyxFQUEwQyxDQUExQyxDQURrQjtBQUVyQixXQUFHLEtBQUssTUFBTCxDQUFZLElBQVosQ0FBaUIsS0FBSyxDQUFMLEVBQVEsTUFBUixDQUFlLENBQWhDLEVBQW1DLEtBQW5DLEVBQTBDLENBQTFDO0FBRmtCLFFBQXRCO0FBSUE7QUFDRCxVQUFJLEtBQUssQ0FBTCxFQUFRLENBQVIsSUFBYSxJQUFqQixFQUF1QjtBQUN0QixpQkFBVSxDQUFWLEVBQWEsQ0FBYixHQUFpQixLQUFLLE1BQUwsQ0FBWSxJQUFaLENBQWlCLEtBQUssQ0FBTCxFQUFRLENBQXpCLEVBQTRCLEtBQTVCLEVBQW1DLENBQW5DLENBQWpCO0FBQ0E7QUFDRCxVQUFJLEtBQUssQ0FBTCxFQUFRLENBQVIsSUFBYSxJQUFqQixFQUF1QjtBQUN0QixpQkFBVSxDQUFWLEVBQWEsQ0FBYixHQUFpQixLQUFLLE1BQUwsQ0FBWSxJQUFaLENBQWlCLEtBQUssQ0FBTCxFQUFRLENBQXpCLEVBQTRCLEtBQTVCLEVBQW1DLENBQW5DLENBQWpCO0FBQ0E7QUFDRDs7Ozs7QUFLQTtBQUNBLGdCQUFVLENBQVYsRUFBYSxLQUFiLEdBQXFCLEtBQXJCO0FBQ0E7QUFDRDtBQUNEO0FBQ0Q7QUFDQSxRQUFLLFNBQUwsR0FBaUIsU0FBakI7QUFDQSxVQUFPLFNBQVA7QUFDQTs7Ozs7O0FBR0YsT0FBTyxPQUFQLEdBQWlCLFdBQWpCOzs7QUN0aUJBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQW9CQTs7Ozs7Ozs7Ozs7OztBQWFBOzs7Ozs7Ozs7O0FBRUEsSUFBTSxlQUFlLFFBQVEsZUFBUixDQUFyQjs7QUFFQSxJQUFNLFlBQVksT0FBTyxNQUFQLEtBQWtCLFdBQXBDO0FBQ0EsSUFBSSxnQkFBSjtBQUNBLElBQUksQ0FBQyxTQUFMLEVBQWdCO0FBQ2YsV0FBVSxRQUFRLFVBQVIsQ0FBVjtBQUNBLENBRkQsTUFFTztBQUNOLFdBQVUsT0FBTyxPQUFqQjtBQUNBO0FBQ0QsSUFBTSxnQkFBa0IsUUFBUSwwQkFBUixDQUF4QjtBQUNBLElBQU0sa0JBQWtCLFFBQVEsbUJBQVIsRUFBNkIsZUFBckQ7O0FBRUE7QUFDQSxJQUFNLGNBQWMsR0FBcEI7O0lBRU0sUzs7O0FBQ0w7Ozs7QUFJQSxvQkFBYSxRQUFiLEVBQXVCLE9BQXZCLEVBQWdDO0FBQUE7O0FBQUE7O0FBRy9CLFFBQUssUUFBTCxHQUFnQixRQUFoQjtBQUNBLFFBQUssS0FBTCxHQUFhLFNBQWI7O0FBRUEsUUFBSyxrQkFBTCxHQUEwQixDQUExQixDQU4rQixDQU1IO0FBQzVCLFFBQUsscUJBQUwsR0FBNkIsTUFBN0IsQ0FQK0IsQ0FPSzs7QUFFcEM7QUFDQSxNQUFNLFVBQVU7QUFDZixhQUFXLEVBQUUsTUFBTSxFQUFSLEVBREk7QUFFZixjQUFXLENBQUMsS0FBRCxFQUFRLEtBQVIsRUFBZSxLQUFmLEVBQXNCLFFBQXRCO0FBRkksR0FBaEI7QUFJQSxNQUFJLFFBQVEsTUFBUixZQUEwQixLQUE5QixFQUFxQztBQUNwQyxXQUFRLFFBQVIsQ0FBaUIsTUFBakIsR0FBMEIsUUFBUSxNQUFsQztBQUNBO0FBQ0QsTUFBSSxRQUFRLFNBQVIsSUFBcUIsSUFBckIsSUFBNkIsT0FBTyxRQUFRLFNBQWYsS0FBNkIsUUFBOUQsRUFBd0U7QUFDdkUsV0FBUSxRQUFSLENBQWlCLElBQWpCLENBQXNCLFNBQXRCLEdBQWtDLFFBQVEsU0FBMUM7QUFDQSxHQUZELE1BRU87QUFDTixXQUFRLFFBQVIsQ0FBaUIsSUFBakIsQ0FBc0IsU0FBdEIsR0FBa0MsT0FBbEM7QUFDQTtBQUNELE1BQUksUUFBUSxRQUFSLElBQW9CLElBQXBCLElBQTRCLE9BQU8sUUFBUSxRQUFmLEtBQTRCLFFBQTVELEVBQXNFO0FBQ3JFLFdBQVEsUUFBUixHQUFtQixRQUFRLFFBQTNCO0FBQ0EsR0FGRCxNQUVPO0FBQ04sV0FBUSxRQUFSLEdBQW1CLEtBQW5CO0FBQ0E7QUFDRCxNQUFJLFFBQVEsUUFBUixJQUFvQixJQUFwQixJQUE0QixPQUFPLFFBQVEsUUFBZixLQUE0QixRQUE1RCxFQUFzRTtBQUNyRSxXQUFRLFFBQVIsR0FBbUIsUUFBUSxRQUEzQjtBQUNBLEdBRkQsTUFFTztBQUNOLFdBQVEsUUFBUixHQUFtQixXQUFuQjtBQUNBO0FBQ0QsTUFBSSxRQUFRLFFBQVIsR0FBbUIsV0FBdkIsRUFBb0M7QUFDbkMsV0FBUSxRQUFSLEdBQW1CLEdBQW5CO0FBQ0E7QUFDRCxVQUFRLFFBQVIsQ0FBaUIsSUFBakIsQ0FBc0IsUUFBdEIsR0FBaUMsZ0JBQWdCLFFBQVEsUUFBUixDQUFpQixJQUFqQyxFQUF1QyxRQUFRLFFBQS9DLENBQWpDOztBQUVBLFFBQUssT0FBTCxHQUFlLE9BQWY7O0FBRUEsUUFBSyxLQUFMLENBQVcsT0FBWCxFQXZDK0IsQ0F1Q1g7QUF2Q1c7QUF3Qy9COzs7O3dCQWdCTSxPLEVBQVM7QUFBQTs7QUFDZixPQUFJLE9BQUosQ0FBWSxVQUFDLE9BQUQsRUFBVSxNQUFWLEVBQXFCO0FBQ2hDO0FBQ0EsV0FBSyxRQUFMLENBQWMsT0FBZCxDQUFzQjtBQUNyQixjQUFTLEtBRFk7QUFFckIsV0FBUyxhQUZZO0FBR3JCLFdBQVMsRUFBRSxNQUFNLEtBQUssU0FBTCxDQUFlLE9BQWYsQ0FBUixFQUhZO0FBSXJCLFVBQVMsT0FBSyxvQkFBTDtBQUpZLEtBQXRCLEVBS0csVUFBQyxJQUFELEVBQU8sR0FBUCxFQUFZLFVBQVosRUFBMkI7QUFDN0IsU0FBSSxPQUFPLElBQVgsRUFBaUI7QUFDaEIsYUFBTyxHQUFQO0FBQ0E7QUFDQTtBQUNELFNBQUksT0FBSyxLQUFMLEtBQWUsU0FBbkIsRUFBOEI7QUFDN0IsYUFBTyxJQUFJLGFBQUosRUFBUDtBQUNBO0FBQ0QsU0FBTSxPQUFPLEtBQUssS0FBTCxDQUFXLFVBQVgsQ0FBYjtBQUNBLFlBQUssSUFBTCxDQUFVLE1BQVYsRUFBa0IsSUFBbEI7QUFDQTtBQUNBLEtBaEJEO0FBaUJBLElBbkJELEVBb0JDLElBcEJELENBb0JNLFlBQU07QUFDWDtBQUNBLFdBQU8sSUFBSSxPQUFKLENBQVksVUFBQyxPQUFELEVBQVUsTUFBVixFQUFxQjtBQUN2QyxZQUFLLFlBQUwsR0FBb0IsT0FBSyxRQUFMLENBQWMsU0FBZCxDQUF3QjtBQUMzQyxlQUFTLEtBRGtDO0FBRTNDLFlBQVMsUUFBUSxRQUFSLENBQWlCLElBQWpCLENBQXNCLFFBRlk7QUFHM0MsWUFBUyxFQUFFLE1BQU0sT0FBUixFQUhrQztBQUkzQyxXQUFTLE9BQUssaUJBQUw7QUFKa0MsTUFBeEIsRUFLakIsVUFBQyxHQUFELEVBQU0sR0FBTixFQUFXLEtBQVgsRUFBcUI7QUFDdkIsVUFBSSxPQUFPLEtBQVg7QUFDQSxVQUFJLE9BQU8sSUFBWCxFQUFpQjtBQUNoQixjQUFPLEdBQVA7QUFDQTtBQUNBO0FBQ0QsYUFBTyxLQUFLLEtBQUwsQ0FBVyxJQUFYLENBQVA7QUFDQSxhQUFLLElBQUwsQ0FBVSxNQUFWLEVBQWtCLElBQWxCOztBQUVBLGFBQUssa0JBQUwsR0FBMEIsQ0FBMUIsQ0FUdUIsQ0FTSztBQUM1QjtBQUNBLE1BaEJtQixDQUFwQjtBQWlCQSxLQWxCTSxDQUFQO0FBbUJBLElBekNELEVBMENDLEtBMUNELENBMENPLFVBQUMsR0FBRCxFQUFTO0FBQ2YsUUFBSSxJQUFJLElBQUosS0FBYSxlQUFqQixFQUFrQztBQUFFO0FBQ25DO0FBQ0E7QUFDRDtBQUNBLFdBQUssa0JBQUwsR0FMZSxDQUtXO0FBQzFCLFdBQUssa0JBQUwsR0FBMEIsT0FBSyxrQkFBTCxHQUEwQixJQUFwRCxDQU5lLENBTTBDO0FBQ3pELFFBQUksT0FBSyxrQkFBTCxHQUEwQixPQUFLLHFCQUFuQyxFQUEwRDtBQUN6RCxZQUFLLGtCQUFMLEdBQTBCLE9BQUsscUJBQS9CLENBRHlELENBQ0o7QUFDckQ7QUFDRCxXQUFLLGNBQUwsR0FBc0IsV0FBVyxZQUFNO0FBQ3RDLFlBQUssS0FBTCxDQUFXLE9BQVg7QUFDQSxLQUZxQixFQUVuQixPQUFLLGtCQUZjLENBQXRCLENBVmUsQ0FZYTtBQUM1QixJQXZERDtBQXdEQTs7QUFFRDs7Ozt1Q0FDc0I7QUFDckIsT0FBSSxLQUFLLFlBQUwsSUFBcUIsSUFBekIsRUFBK0I7QUFDOUIsU0FBSyxZQUFMLENBQWtCLEtBQWxCO0FBQ0EsU0FBSyxZQUFMLEdBQW9CLElBQXBCO0FBQ0E7QUFDRDs7O3lCQUVPO0FBQ1AsUUFBSyxLQUFMLEdBQWEsU0FBYjtBQUNBLE9BQUksS0FBSyxjQUFMLElBQXVCLElBQTNCLEVBQWlDO0FBQ2hDLGlCQUFhLEtBQUssY0FBbEI7QUFDQTtBQUNELFFBQUssa0JBQUw7QUFDQSxRQUFLLElBQUwsQ0FBVSxNQUFWO0FBQ0EsUUFBSyxrQkFBTDtBQUNBOzs7eUNBekY4QjtBQUM5QixVQUFPO0FBQ04sVUFBVyxvQkFETDtBQUVOLGVBQVc7QUFGTCxJQUFQO0FBSUE7OztzQ0FFMkI7QUFDM0IsVUFBTztBQUNOLFVBQVcsb0JBREw7QUFFTixlQUFXO0FBRkwsSUFBUDtBQUlBOzs7O0VBM0RzQixZOztBQTJJeEIsT0FBTyxPQUFQLEdBQWlCLFNBQWpCOzs7QUM3TEE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBb0JBOzs7Ozs7Ozs7Ozs7O0FBYUE7Ozs7Ozs7Ozs7QUFFQSxJQUFNLFlBQWMsUUFBUSxrQkFBUixDQUFwQjtBQUNBLElBQU0sY0FBYyxRQUFRLG9CQUFSLENBQXBCOztJQUVNLFc7OztBQUNMLHVCQUFhLFFBQWIsRUFBdUI7QUFBQTs7QUFBQTs7QUFBQSwwSEFDaEIsUUFEZ0I7O0FBRXRCLFVBQUssUUFBTCxHQUFnQixRQUFoQjtBQUNBO0FBQ0E7Ozs7MENBRXNCO0FBQ3RCLGFBQU87QUFDTiw2Q0FBd0MsVUFBVSxjQUFWLENBQXlCLEtBQUssUUFBTCxDQUFjLFdBQWQsQ0FBMEIsSUFBMUIsRUFBekIsQ0FEbEM7QUFFTixtQkFBVztBQUZMLE9BQVA7QUFJQTs7O3VDQUVtQjtBQUNuQixhQUFPO0FBQ04sNkNBQXdDLFVBQVUsY0FBVixDQUF5QixLQUFLLFFBQUwsQ0FBYyxXQUFkLENBQTBCLElBQTFCLEVBQXpCLENBRGxDO0FBRU4sbUJBQVc7QUFGTCxPQUFQO0FBSUE7OztrQ0FFYyxNLEVBQVE7QUFDdEIsYUFBTyxJQUFJLFNBQUosQ0FBYyxLQUFLLFFBQW5CLEVBQTZCLE1BQTdCLENBQVA7QUFDQTs7OztFQXZCd0IsVzs7QUEwQjFCLE9BQU8sT0FBUCxHQUFpQixXQUFqQjs7O0FDaEVBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQW9CQTs7Ozs7Ozs7Ozs7OztBQWFBOzs7Ozs7Ozs7O0FBRUEsSUFBTSxZQUFZLFFBQVEsa0JBQVIsQ0FBbEI7O0lBRU0sUzs7O0FBQ0w7Ozs7QUFJQSxxQkFBYSxRQUFiLEVBQXVCLE9BQXZCLEVBQWdDO0FBQUE7O0FBQUEsc0hBQ3pCLFFBRHlCLEVBQ2YsT0FEZTs7QUFFL0IsVUFBSyxRQUFMLEdBQWdCLFFBQWhCO0FBRitCO0FBRy9COzs7OzJDQUV1QjtBQUN2QixhQUFPO0FBQ04sOENBQXlDLFVBQVUsY0FBVixDQUF5QixLQUFLLFFBQUwsQ0FBYyxXQUFkLENBQTBCLElBQTFCLEVBQXpCLENBRG5DO0FBRU4sbUJBQVc7QUFGTCxPQUFQO0FBSUE7Ozt3Q0FFb0I7QUFDcEIsYUFBTztBQUNOLDJDQUFzQyxVQUFVLGNBQVYsQ0FBeUIsS0FBSyxRQUFMLENBQWMsV0FBZCxDQUEwQixJQUExQixFQUF6QixDQURoQztBQUVOLG1CQUFXO0FBRkwsT0FBUDtBQUlBOzs7bUNBRXNCLEssRUFBd0I7QUFBQSxVQUFqQixTQUFpQix1RUFBTCxHQUFLOztBQUM5QyxhQUFPLE1BQU0sS0FBTixDQUFZLFNBQVosRUFBdUIsR0FBdkIsQ0FBMkIsVUFBQyxDQUFELEVBQU87QUFDeEMsZUFBTyxFQUFFLE1BQUYsQ0FBUyxDQUFULEVBQVksV0FBWixLQUE0QixFQUFFLEtBQUYsQ0FBUSxDQUFSLENBQW5DO0FBQ0EsT0FGTSxFQUVKLElBRkksQ0FFQyxFQUZELENBQVA7QUFHQTs7OztFQTVCc0IsUzs7QUErQnhCLE9BQU8sT0FBUCxHQUFpQixTQUFqQiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIid1c2Ugc3RyaWN0JztcblxudmFyIGhhcyA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHlcbiAgLCBwcmVmaXggPSAnfic7XG5cbi8qKlxuICogQ29uc3RydWN0b3IgdG8gY3JlYXRlIGEgc3RvcmFnZSBmb3Igb3VyIGBFRWAgb2JqZWN0cy5cbiAqIEFuIGBFdmVudHNgIGluc3RhbmNlIGlzIGEgcGxhaW4gb2JqZWN0IHdob3NlIHByb3BlcnRpZXMgYXJlIGV2ZW50IG5hbWVzLlxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIEV2ZW50cygpIHt9XG5cbi8vXG4vLyBXZSB0cnkgdG8gbm90IGluaGVyaXQgZnJvbSBgT2JqZWN0LnByb3RvdHlwZWAuIEluIHNvbWUgZW5naW5lcyBjcmVhdGluZyBhblxuLy8gaW5zdGFuY2UgaW4gdGhpcyB3YXkgaXMgZmFzdGVyIHRoYW4gY2FsbGluZyBgT2JqZWN0LmNyZWF0ZShudWxsKWAgZGlyZWN0bHkuXG4vLyBJZiBgT2JqZWN0LmNyZWF0ZShudWxsKWAgaXMgbm90IHN1cHBvcnRlZCB3ZSBwcmVmaXggdGhlIGV2ZW50IG5hbWVzIHdpdGggYVxuLy8gY2hhcmFjdGVyIHRvIG1ha2Ugc3VyZSB0aGF0IHRoZSBidWlsdC1pbiBvYmplY3QgcHJvcGVydGllcyBhcmUgbm90XG4vLyBvdmVycmlkZGVuIG9yIHVzZWQgYXMgYW4gYXR0YWNrIHZlY3Rvci5cbi8vXG5pZiAoT2JqZWN0LmNyZWF0ZSkge1xuICBFdmVudHMucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAvL1xuICAvLyBUaGlzIGhhY2sgaXMgbmVlZGVkIGJlY2F1c2UgdGhlIGBfX3Byb3RvX19gIHByb3BlcnR5IGlzIHN0aWxsIGluaGVyaXRlZCBpblxuICAvLyBzb21lIG9sZCBicm93c2VycyBsaWtlIEFuZHJvaWQgNCwgaVBob25lIDUuMSwgT3BlcmEgMTEgYW5kIFNhZmFyaSA1LlxuICAvL1xuICBpZiAoIW5ldyBFdmVudHMoKS5fX3Byb3RvX18pIHByZWZpeCA9IGZhbHNlO1xufVxuXG4vKipcbiAqIFJlcHJlc2VudGF0aW9uIG9mIGEgc2luZ2xlIGV2ZW50IGxpc3RlbmVyLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIFRoZSBsaXN0ZW5lciBmdW5jdGlvbi5cbiAqIEBwYXJhbSB7TWl4ZWR9IGNvbnRleHQgVGhlIGNvbnRleHQgdG8gaW52b2tlIHRoZSBsaXN0ZW5lciB3aXRoLlxuICogQHBhcmFtIHtCb29sZWFufSBbb25jZT1mYWxzZV0gU3BlY2lmeSBpZiB0aGUgbGlzdGVuZXIgaXMgYSBvbmUtdGltZSBsaXN0ZW5lci5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIEVFKGZuLCBjb250ZXh0LCBvbmNlKSB7XG4gIHRoaXMuZm4gPSBmbjtcbiAgdGhpcy5jb250ZXh0ID0gY29udGV4dDtcbiAgdGhpcy5vbmNlID0gb25jZSB8fCBmYWxzZTtcbn1cblxuLyoqXG4gKiBNaW5pbWFsIGBFdmVudEVtaXR0ZXJgIGludGVyZmFjZSB0aGF0IGlzIG1vbGRlZCBhZ2FpbnN0IHRoZSBOb2RlLmpzXG4gKiBgRXZlbnRFbWl0dGVyYCBpbnRlcmZhY2UuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAYXBpIHB1YmxpY1xuICovXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IG5ldyBFdmVudHMoKTtcbiAgdGhpcy5fZXZlbnRzQ291bnQgPSAwO1xufVxuXG4vKipcbiAqIFJldHVybiBhbiBhcnJheSBsaXN0aW5nIHRoZSBldmVudHMgZm9yIHdoaWNoIHRoZSBlbWl0dGVyIGhhcyByZWdpc3RlcmVkXG4gKiBsaXN0ZW5lcnMuXG4gKlxuICogQHJldHVybnMge0FycmF5fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5ldmVudE5hbWVzID0gZnVuY3Rpb24gZXZlbnROYW1lcygpIHtcbiAgdmFyIG5hbWVzID0gW11cbiAgICAsIGV2ZW50c1xuICAgICwgbmFtZTtcblxuICBpZiAodGhpcy5fZXZlbnRzQ291bnQgPT09IDApIHJldHVybiBuYW1lcztcblxuICBmb3IgKG5hbWUgaW4gKGV2ZW50cyA9IHRoaXMuX2V2ZW50cykpIHtcbiAgICBpZiAoaGFzLmNhbGwoZXZlbnRzLCBuYW1lKSkgbmFtZXMucHVzaChwcmVmaXggPyBuYW1lLnNsaWNlKDEpIDogbmFtZSk7XG4gIH1cblxuICBpZiAoT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scykge1xuICAgIHJldHVybiBuYW1lcy5jb25jYXQoT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhldmVudHMpKTtcbiAgfVxuXG4gIHJldHVybiBuYW1lcztcbn07XG5cbi8qKlxuICogUmV0dXJuIHRoZSBsaXN0ZW5lcnMgcmVnaXN0ZXJlZCBmb3IgYSBnaXZlbiBldmVudC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xTeW1ib2x9IGV2ZW50IFRoZSBldmVudCBuYW1lLlxuICogQHBhcmFtIHtCb29sZWFufSBleGlzdHMgT25seSBjaGVjayBpZiB0aGVyZSBhcmUgbGlzdGVuZXJzLlxuICogQHJldHVybnMge0FycmF5fEJvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uIGxpc3RlbmVycyhldmVudCwgZXhpc3RzKSB7XG4gIHZhciBldnQgPSBwcmVmaXggPyBwcmVmaXggKyBldmVudCA6IGV2ZW50XG4gICAgLCBhdmFpbGFibGUgPSB0aGlzLl9ldmVudHNbZXZ0XTtcblxuICBpZiAoZXhpc3RzKSByZXR1cm4gISFhdmFpbGFibGU7XG4gIGlmICghYXZhaWxhYmxlKSByZXR1cm4gW107XG4gIGlmIChhdmFpbGFibGUuZm4pIHJldHVybiBbYXZhaWxhYmxlLmZuXTtcblxuICBmb3IgKHZhciBpID0gMCwgbCA9IGF2YWlsYWJsZS5sZW5ndGgsIGVlID0gbmV3IEFycmF5KGwpOyBpIDwgbDsgaSsrKSB7XG4gICAgZWVbaV0gPSBhdmFpbGFibGVbaV0uZm47XG4gIH1cblxuICByZXR1cm4gZWU7XG59O1xuXG4vKipcbiAqIENhbGxzIGVhY2ggb2YgdGhlIGxpc3RlbmVycyByZWdpc3RlcmVkIGZvciBhIGdpdmVuIGV2ZW50LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfFN5bWJvbH0gZXZlbnQgVGhlIGV2ZW50IG5hbWUuXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gYHRydWVgIGlmIHRoZSBldmVudCBoYWQgbGlzdGVuZXJzLCBlbHNlIGBmYWxzZWAuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbiBlbWl0KGV2ZW50LCBhMSwgYTIsIGEzLCBhNCwgYTUpIHtcbiAgdmFyIGV2dCA9IHByZWZpeCA/IHByZWZpeCArIGV2ZW50IDogZXZlbnQ7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbZXZ0XSkgcmV0dXJuIGZhbHNlO1xuXG4gIHZhciBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbZXZ0XVxuICAgICwgbGVuID0gYXJndW1lbnRzLmxlbmd0aFxuICAgICwgYXJnc1xuICAgICwgaTtcblxuICBpZiAobGlzdGVuZXJzLmZuKSB7XG4gICAgaWYgKGxpc3RlbmVycy5vbmNlKSB0aGlzLnJlbW92ZUxpc3RlbmVyKGV2ZW50LCBsaXN0ZW5lcnMuZm4sIHVuZGVmaW5lZCwgdHJ1ZSk7XG5cbiAgICBzd2l0Y2ggKGxlbikge1xuICAgICAgY2FzZSAxOiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQpLCB0cnVlO1xuICAgICAgY2FzZSAyOiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQsIGExKSwgdHJ1ZTtcbiAgICAgIGNhc2UgMzogcmV0dXJuIGxpc3RlbmVycy5mbi5jYWxsKGxpc3RlbmVycy5jb250ZXh0LCBhMSwgYTIpLCB0cnVlO1xuICAgICAgY2FzZSA0OiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQsIGExLCBhMiwgYTMpLCB0cnVlO1xuICAgICAgY2FzZSA1OiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQsIGExLCBhMiwgYTMsIGE0KSwgdHJ1ZTtcbiAgICAgIGNhc2UgNjogcmV0dXJuIGxpc3RlbmVycy5mbi5jYWxsKGxpc3RlbmVycy5jb250ZXh0LCBhMSwgYTIsIGEzLCBhNCwgYTUpLCB0cnVlO1xuICAgIH1cblxuICAgIGZvciAoaSA9IDEsIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0xKTsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICB9XG5cbiAgICBsaXN0ZW5lcnMuZm4uYXBwbHkobGlzdGVuZXJzLmNvbnRleHQsIGFyZ3MpO1xuICB9IGVsc2Uge1xuICAgIHZhciBsZW5ndGggPSBsaXN0ZW5lcnMubGVuZ3RoXG4gICAgICAsIGo7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChsaXN0ZW5lcnNbaV0ub25jZSkgdGhpcy5yZW1vdmVMaXN0ZW5lcihldmVudCwgbGlzdGVuZXJzW2ldLmZuLCB1bmRlZmluZWQsIHRydWUpO1xuXG4gICAgICBzd2l0Y2ggKGxlbikge1xuICAgICAgICBjYXNlIDE6IGxpc3RlbmVyc1tpXS5mbi5jYWxsKGxpc3RlbmVyc1tpXS5jb250ZXh0KTsgYnJlYWs7XG4gICAgICAgIGNhc2UgMjogbGlzdGVuZXJzW2ldLmZuLmNhbGwobGlzdGVuZXJzW2ldLmNvbnRleHQsIGExKTsgYnJlYWs7XG4gICAgICAgIGNhc2UgMzogbGlzdGVuZXJzW2ldLmZuLmNhbGwobGlzdGVuZXJzW2ldLmNvbnRleHQsIGExLCBhMik7IGJyZWFrO1xuICAgICAgICBjYXNlIDQ6IGxpc3RlbmVyc1tpXS5mbi5jYWxsKGxpc3RlbmVyc1tpXS5jb250ZXh0LCBhMSwgYTIsIGEzKTsgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgaWYgKCFhcmdzKSBmb3IgKGogPSAxLCBhcmdzID0gbmV3IEFycmF5KGxlbiAtMSk7IGogPCBsZW47IGorKykge1xuICAgICAgICAgICAgYXJnc1tqIC0gMV0gPSBhcmd1bWVudHNbal07XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGlzdGVuZXJzW2ldLmZuLmFwcGx5KGxpc3RlbmVyc1tpXS5jb250ZXh0LCBhcmdzKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogQWRkIGEgbGlzdGVuZXIgZm9yIGEgZ2l2ZW4gZXZlbnQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8U3ltYm9sfSBldmVudCBUaGUgZXZlbnQgbmFtZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIFRoZSBsaXN0ZW5lciBmdW5jdGlvbi5cbiAqIEBwYXJhbSB7TWl4ZWR9IFtjb250ZXh0PXRoaXNdIFRoZSBjb250ZXh0IHRvIGludm9rZSB0aGUgbGlzdGVuZXIgd2l0aC5cbiAqIEByZXR1cm5zIHtFdmVudEVtaXR0ZXJ9IGB0aGlzYC5cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBmdW5jdGlvbiBvbihldmVudCwgZm4sIGNvbnRleHQpIHtcbiAgdmFyIGxpc3RlbmVyID0gbmV3IEVFKGZuLCBjb250ZXh0IHx8IHRoaXMpXG4gICAgLCBldnQgPSBwcmVmaXggPyBwcmVmaXggKyBldmVudCA6IGV2ZW50O1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW2V2dF0pIHRoaXMuX2V2ZW50c1tldnRdID0gbGlzdGVuZXIsIHRoaXMuX2V2ZW50c0NvdW50Kys7XG4gIGVsc2UgaWYgKCF0aGlzLl9ldmVudHNbZXZ0XS5mbikgdGhpcy5fZXZlbnRzW2V2dF0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2UgdGhpcy5fZXZlbnRzW2V2dF0gPSBbdGhpcy5fZXZlbnRzW2V2dF0sIGxpc3RlbmVyXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkIGEgb25lLXRpbWUgbGlzdGVuZXIgZm9yIGEgZ2l2ZW4gZXZlbnQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8U3ltYm9sfSBldmVudCBUaGUgZXZlbnQgbmFtZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIFRoZSBsaXN0ZW5lciBmdW5jdGlvbi5cbiAqIEBwYXJhbSB7TWl4ZWR9IFtjb250ZXh0PXRoaXNdIFRoZSBjb250ZXh0IHRvIGludm9rZSB0aGUgbGlzdGVuZXIgd2l0aC5cbiAqIEByZXR1cm5zIHtFdmVudEVtaXR0ZXJ9IGB0aGlzYC5cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uIG9uY2UoZXZlbnQsIGZuLCBjb250ZXh0KSB7XG4gIHZhciBsaXN0ZW5lciA9IG5ldyBFRShmbiwgY29udGV4dCB8fCB0aGlzLCB0cnVlKVxuICAgICwgZXZ0ID0gcHJlZml4ID8gcHJlZml4ICsgZXZlbnQgOiBldmVudDtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1tldnRdKSB0aGlzLl9ldmVudHNbZXZ0XSA9IGxpc3RlbmVyLCB0aGlzLl9ldmVudHNDb3VudCsrO1xuICBlbHNlIGlmICghdGhpcy5fZXZlbnRzW2V2dF0uZm4pIHRoaXMuX2V2ZW50c1tldnRdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlIHRoaXMuX2V2ZW50c1tldnRdID0gW3RoaXMuX2V2ZW50c1tldnRdLCBsaXN0ZW5lcl07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSB0aGUgbGlzdGVuZXJzIG9mIGEgZ2l2ZW4gZXZlbnQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8U3ltYm9sfSBldmVudCBUaGUgZXZlbnQgbmFtZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIE9ubHkgcmVtb3ZlIHRoZSBsaXN0ZW5lcnMgdGhhdCBtYXRjaCB0aGlzIGZ1bmN0aW9uLlxuICogQHBhcmFtIHtNaXhlZH0gY29udGV4dCBPbmx5IHJlbW92ZSB0aGUgbGlzdGVuZXJzIHRoYXQgaGF2ZSB0aGlzIGNvbnRleHQuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IG9uY2UgT25seSByZW1vdmUgb25lLXRpbWUgbGlzdGVuZXJzLlxuICogQHJldHVybnMge0V2ZW50RW1pdHRlcn0gYHRoaXNgLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uIHJlbW92ZUxpc3RlbmVyKGV2ZW50LCBmbiwgY29udGV4dCwgb25jZSkge1xuICB2YXIgZXZ0ID0gcHJlZml4ID8gcHJlZml4ICsgZXZlbnQgOiBldmVudDtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1tldnRdKSByZXR1cm4gdGhpcztcbiAgaWYgKCFmbikge1xuICAgIGlmICgtLXRoaXMuX2V2ZW50c0NvdW50ID09PSAwKSB0aGlzLl9ldmVudHMgPSBuZXcgRXZlbnRzKCk7XG4gICAgZWxzZSBkZWxldGUgdGhpcy5fZXZlbnRzW2V2dF07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW2V2dF07XG5cbiAgaWYgKGxpc3RlbmVycy5mbikge1xuICAgIGlmIChcbiAgICAgICAgIGxpc3RlbmVycy5mbiA9PT0gZm5cbiAgICAgICYmICghb25jZSB8fCBsaXN0ZW5lcnMub25jZSlcbiAgICAgICYmICghY29udGV4dCB8fCBsaXN0ZW5lcnMuY29udGV4dCA9PT0gY29udGV4dClcbiAgICApIHtcbiAgICAgIGlmICgtLXRoaXMuX2V2ZW50c0NvdW50ID09PSAwKSB0aGlzLl9ldmVudHMgPSBuZXcgRXZlbnRzKCk7XG4gICAgICBlbHNlIGRlbGV0ZSB0aGlzLl9ldmVudHNbZXZ0XTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGV2ZW50cyA9IFtdLCBsZW5ndGggPSBsaXN0ZW5lcnMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChcbiAgICAgICAgICAgbGlzdGVuZXJzW2ldLmZuICE9PSBmblxuICAgICAgICB8fCAob25jZSAmJiAhbGlzdGVuZXJzW2ldLm9uY2UpXG4gICAgICAgIHx8IChjb250ZXh0ICYmIGxpc3RlbmVyc1tpXS5jb250ZXh0ICE9PSBjb250ZXh0KVxuICAgICAgKSB7XG4gICAgICAgIGV2ZW50cy5wdXNoKGxpc3RlbmVyc1tpXSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy9cbiAgICAvLyBSZXNldCB0aGUgYXJyYXksIG9yIHJlbW92ZSBpdCBjb21wbGV0ZWx5IGlmIHdlIGhhdmUgbm8gbW9yZSBsaXN0ZW5lcnMuXG4gICAgLy9cbiAgICBpZiAoZXZlbnRzLmxlbmd0aCkgdGhpcy5fZXZlbnRzW2V2dF0gPSBldmVudHMubGVuZ3RoID09PSAxID8gZXZlbnRzWzBdIDogZXZlbnRzO1xuICAgIGVsc2UgaWYgKC0tdGhpcy5fZXZlbnRzQ291bnQgPT09IDApIHRoaXMuX2V2ZW50cyA9IG5ldyBFdmVudHMoKTtcbiAgICBlbHNlIGRlbGV0ZSB0aGlzLl9ldmVudHNbZXZ0XTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgYWxsIGxpc3RlbmVycywgb3IgdGhvc2Ugb2YgdGhlIHNwZWNpZmllZCBldmVudC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xTeW1ib2x9IFtldmVudF0gVGhlIGV2ZW50IG5hbWUuXG4gKiBAcmV0dXJucyB7RXZlbnRFbWl0dGVyfSBgdGhpc2AuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uIHJlbW92ZUFsbExpc3RlbmVycyhldmVudCkge1xuICB2YXIgZXZ0O1xuXG4gIGlmIChldmVudCkge1xuICAgIGV2dCA9IHByZWZpeCA/IHByZWZpeCArIGV2ZW50IDogZXZlbnQ7XG4gICAgaWYgKHRoaXMuX2V2ZW50c1tldnRdKSB7XG4gICAgICBpZiAoLS10aGlzLl9ldmVudHNDb3VudCA9PT0gMCkgdGhpcy5fZXZlbnRzID0gbmV3IEV2ZW50cygpO1xuICAgICAgZWxzZSBkZWxldGUgdGhpcy5fZXZlbnRzW2V2dF07XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRoaXMuX2V2ZW50cyA9IG5ldyBFdmVudHMoKTtcbiAgICB0aGlzLl9ldmVudHNDb3VudCA9IDA7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vXG4vLyBBbGlhcyBtZXRob2RzIG5hbWVzIGJlY2F1c2UgcGVvcGxlIHJvbGwgbGlrZSB0aGF0LlxuLy9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lcjtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uO1xuXG4vL1xuLy8gVGhpcyBmdW5jdGlvbiBkb2Vzbid0IGFwcGx5IGFueW1vcmUuXG4vL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbiBzZXRNYXhMaXN0ZW5lcnMoKSB7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLy9cbi8vIEV4cG9zZSB0aGUgcHJlZml4LlxuLy9cbkV2ZW50RW1pdHRlci5wcmVmaXhlZCA9IHByZWZpeDtcblxuLy9cbi8vIEFsbG93IGBFdmVudEVtaXR0ZXJgIHRvIGJlIGltcG9ydGVkIGFzIG1vZHVsZSBuYW1lc3BhY2UuXG4vL1xuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuLy9cbi8vIEV4cG9zZSB0aGUgbW9kdWxlLlxuLy9cbmlmICgndW5kZWZpbmVkJyAhPT0gdHlwZW9mIG1vZHVsZSkge1xuICBtb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcbn1cbiIsIi8qXG4gKiBDb3B5cmlnaHQgOiBQYXJ0bmVyaW5nIDMuMCAoMjAwNy0yMDIwKVxuICogQXV0aG9yIDogUGFydG5lcmluZyBSb2JvdGljcyA8c29mdHdhcmVAcGFydG5lcmluZy5mcj5cbiAqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiBkaXlhLXNkay5cbiAqXG4gKiBkaXlhLXNkayBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb24sIGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBkaXlhLXNkayBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZVxuICogYWxvbmcgd2l0aCBkaXlhLXNkay4gIElmIG5vdCwgc2VlIDxodHRwOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuY29uc3QgQ29ubmVjdG9yVjEgPSByZXF1aXJlKCcuL3YxL2Nvbm5lY3Rvci5qcycpXG5jb25zdCBDb25uZWN0b3JWMiA9IHJlcXVpcmUoJy4vdjIvY29ubmVjdG9yLmpzJyk7XG5cbihmdW5jdGlvbiAoKSB7XG5cdGxldCBEaXlhU2VsZWN0b3I7XG5cdHRyeSB7XG5cdFx0Ly8gRm9yIGJyb3dzZXJzIC0gZDEgYWxyZWFkeSBkZWZpbmVkXG5cdFx0RGl5YVNlbGVjdG9yID0gZDEuRGl5YVNlbGVjdG9yO1xuXHR9XG5cdGNhdGNoIChlcnJvcikge1xuXHRcdGlmIChlcnJvci5uYW1lID09PSAnUmVmZXJlbmNlRXJyb3InKSB7XG5cdFx0XHQvLyBGb3Igbm9kZWpzIC0gZGVmaW5lIGQxXG5cdFx0XHRjb25zdCBkMSA9IHJlcXVpcmUoJ2RpeWEtc2RrJyk7XG5cdFx0XHREaXlhU2VsZWN0b3IgPSBkMS5EaXlhU2VsZWN0b3I7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRocm93IGVycm9yO1xuXHRcdH1cblx0fVxuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHQvKiogY3JlYXRlIFN0YXR1cyBzZXJ2aWNlICogKi9cblx0RGl5YVNlbGVjdG9yLnByb3RvdHlwZS5JRVEgPSBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdHRoaXMucmVxdWVzdCh7XG5cdFx0XHRcdHNlcnZpY2U6ICdpZXEnLFxuXHRcdFx0XHRmdW5jICAgOiAnR2V0QVBJVmVyc2lvbidcblx0XHRcdH0sIChwZWVySWQsIGVyciwgZGF0YSkgPT4ge1xuXHRcdFx0XHRpZiAoZXJyID09IG51bGwpIHtcblx0XHRcdFx0XHRyZXNvbHZlKGRhdGEpXG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cmVqZWN0KGVycilcblx0XHRcdFx0fVxuXHRcdFx0fSlcblx0XHR9KVxuXHRcdC50aGVuKChkYXRhKSA9PiB7XG5cdFx0XHRpZiAoZGF0YSA9PT0gMikge1xuXHRcdFx0XHRyZXR1cm4gbmV3IENvbm5lY3RvclYyKHRoaXMpXG5cdFx0XHR9XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBpbnN0YW50aWF0ZSBjb25uZWN0b3InKVxuXHRcdH0pXG5cdFx0LmNhdGNoKChlcnIpID0+IHtcblx0XHRcdGlmIChlcnIuaW5jbHVkZXMoXCJNZXRob2QgJ0dldEFQSVZlcnNpb24nIG5vdCBmb3VuZCBpbiBpbnRyb3NwZWN0aW9uIGRhdGFcIikpIHtcblx0XHRcdFx0cmV0dXJuIG5ldyBDb25uZWN0b3JWMSh0aGlzKVxuXHRcdFx0fVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKGVycilcblx0XHR9KVxuXHR9XG59KCkpXG4iLCJjbGFzcyBTdG9wQ29uZGl0aW9uIGV4dGVuZHMgRXJyb3Ige1xuXHRjb25zdHJ1Y3RvciAobXNnKSB7XG5cdFx0c3VwZXIobXNnKVxuXHRcdHRoaXMubmFtZSA9ICdTdG9wQ29uZGl0aW9uJ1xuXHR9XG59XG5tb2R1bGUuZXhwb3J0cyA9IFN0b3BDb25kaXRpb25cbiIsIid1c2Ugc3RyaWN0J1xuXG4vKipcbiAqIENvbnZlcnQgdGltZSB0byBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIGFzIHVzZWQgaW4gSUVRIEFQSVxuICogQHBhcmFtIHtvYmplY3Qsc3RyaW5nLGRhdGUsbnVtYmVyfSB0aW1lIC0gdGltZSB0byBiZSBmb3JtYXR0ZWRcbiAqIEByZXR1cm4ge251bWJlcn0gdGltZSAtIGluIG1zXG4gKi9cbmNvbnN0IGZvcm1hdFRpbWUgPSBmdW5jdGlvbiAodGltZSkge1xuXHRyZXR1cm4gbmV3IERhdGUodGltZSkuZ2V0VGltZSgpXG59XG5cbi8qKlxuICogR2V0IHRpbWUgc2FtcGxpbmcgZnJvbSB0aW1lIHJhbmdlLlxuICogU2V0IHNhbXBsaW5nIGlzIHN0cnVjdHVyZSBwcm92aWRlZCBpbiBwYXJhbWV0ZXJcbiAqIEBwYXJhbSB7b2JqZWN0fSB0aW1lIC0gdGltZSBjcml0ZXJpYSBpLmUuIGRlZmluaW5nIHJhbmdlXG4gKiBAcGFyYW0ge251bWJlcn0gbWF4U2FtcGxlcyAtIG1heCBudW1iZXIgb2Ygc2FtcGxlcyB0byBiZSBkaXNwbGF5ZWRcbiAqIEByZXR1cm4ge3N0cmluZ30gdGltZVNhbXBsaW5nIC0gY29tcHV0ZWQgdGltZVNhbXBsaW5nXG4gKi9cbmNvbnN0IGdldFRpbWVTYW1wbGluZyA9IGZ1bmN0aW9uICh0aW1lLCBfbWF4U2FtcGxlcykge1xuXHRsZXQgbWF4U2FtcGxlcyA9IF9tYXhTYW1wbGVzXG5cdC8vIGRvIG5vdGhpbmcgd2l0aG91dCB0aW1lIGJlaW5nIGRlZmluZWRcblx0aWYgKHRpbWUgPT0gbnVsbCkge1xuXHRcdHJldHVybiB1bmRlZmluZWRcblx0fVxuXHQvLyBkZWZhdWx0IG1heFNhbXBsZXNcblx0aWYgKG1heFNhbXBsZXMgPT0gbnVsbCkge1xuXHRcdG1heFNhbXBsZXMgPSAzMDBcblx0fVxuXG5cdC8vIGFzc3VtZSBkZWZhdWx0IHRpbWUucmFuZ2UgaXMgMVxuXHRsZXQgcmFuZ2UgPSB0aW1lLnJhbmdlXG5cdGlmIChyYW5nZSA9PSBudWxsKSB7XG5cdFx0cmFuZ2UgPSAxXG5cdH1cblxuXHQvLyByYW5nZSB1bml0IHRvIHNlY29uZHNcblx0Y29uc3QgdGltZUluU2Vjb25kcyA9IHtcblx0XHRzZWNvbmQ6IDEsXG5cdFx0bWludXRlOiA2MCxcblx0XHRob3VyICA6IDM2MDAsXG5cdFx0ZGF5ICAgOiAyNCAqIDM2MDAsXG5cdFx0d2VlayAgOiA3ICogMjQgKiAzNjAwLFxuXHRcdG1vbnRoIDogMzAgKiAyNCAqIDM2MDAsXG5cdFx0eWVhciAgOiAzNjUgKiAyNCAqIDM2MDBcblx0fVxuXG5cdC8vIG9yZGVyZWQgdGltZSB0aHJlc2hvbGRzXG5cdGNvbnN0IHNhbXBsaW5nVGhyZXNob2xkcyA9IFtcblx0XHR7IHRocmVzaDogbWF4U2FtcGxlcywgc2FtcGxpbmc6ICdTZWNvbmQnIH0sXG5cdFx0eyB0aHJlc2g6IG1heFNhbXBsZXMgKiA2MCwgc2FtcGxpbmc6ICdNaW51dGUnIH0sXG5cdFx0eyB0aHJlc2g6IG1heFNhbXBsZXMgKiAzNjAwLCBzYW1wbGluZzogJ0hvdXInIH0sXG5cdFx0eyB0aHJlc2g6IG1heFNhbXBsZXMgKiAyNCAqIDM2MDAsIHNhbXBsaW5nOiAnRGF5JyB9LFxuXHRcdHsgdGhyZXNoOiBtYXhTYW1wbGVzICogNyAqIDI0ICogMzYwMCwgc2FtcGxpbmc6ICdXZWVrJyB9LFxuXHRcdHsgdGhyZXNoOiBtYXhTYW1wbGVzICogMzAgKiAyNCAqIDM2MDAsIHNhbXBsaW5nOiAnTW9udGgnIH1cblx0XVxuXG5cdGxldCB0aW1lVW5pdCA9IHRpbWUucmFuZ2VVbml0LnRvTG93ZXJDYXNlKClcblx0Y29uc3QgbGFzdCA9IHRpbWVVbml0Lmxlbmd0aCAtIDFcblx0Ly8gcmVtb3ZlIHRyYWlsaW5nICdzJ1xuXHRpZiAodGltZVVuaXRbbGFzdF0gPT09ICdzJykge1xuXHRcdHRpbWVVbml0ID0gdGltZVVuaXQuc2xpY2UoMCwgbGFzdClcblx0fVxuXG5cdGNvbnN0IHRpbWVJblNlYyA9IHJhbmdlICogdGltZUluU2Vjb25kc1t0aW1lVW5pdF1cblxuXHRsZXQgdGltZVNhbXBsaW5nID0gJ1llYXInIC8vIGRlZmF1bHQgc2FtcGxpbmdcblx0Ly8gZmluZCBzbWFsbGVzdCB0aHJlc2hvbGQgYWJvdmUgdGltZVNlYyB0byBkZXRlcm1pbmUgc2FtcGxpbmdcblx0c2FtcGxpbmdUaHJlc2hvbGRzLmZpbmQoKHNhbXBsaW5nVGhyZXNob2xkKSA9PiB7XG5cdFx0Ly8gdXBkYXRlIHNhbXBsaW5nIHVudGlsIGZpcnN0IHRocmVzaG9sZCBhYm92ZSB0aW1lU2VjXG5cdFx0dGltZVNhbXBsaW5nID0gc2FtcGxpbmdUaHJlc2hvbGQuc2FtcGxpbmdcblx0XHRyZXR1cm4gdGltZUluU2VjIDwgc2FtcGxpbmdUaHJlc2hvbGQudGhyZXNoXG5cdH0pXG5cblx0cmV0dXJuIHRpbWVTYW1wbGluZ1xufVxuXG4vLyBleHBvcnQgZnVuY3Rpb25zXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0Zm9ybWF0VGltZSxcblx0Z2V0VGltZVNhbXBsaW5nXG59XG4iLCIvKlxuICogQ29weXJpZ2h0IDogUGFydG5lcmluZyAzLjAgKDIwMDctMjAyMClcbiAqIEF1dGhvciA6IFBhcnRuZXJpbmcgUm9ib3RpY3MgPHNvZnR3YXJlQHBhcnRuZXJpbmcuZnI+XG4gKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgZGl5YS1zZGsuXG4gKlxuICogZGl5YS1zZGsgaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uLCBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogZGl5YS1zZGsgaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2VcbiAqIGFsb25nIHdpdGggZGl5YS1zZGsuICBJZiBub3QsIHNlZSA8aHR0cDovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogbWF5YS1jbGllbnRcbiAqIENvcHlyaWdodCAoYykgMjAxNCwgUGFydG5lcmluZyBSb2JvdGljcywgQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgbGlicmFyeSBpcyBmcmVlIHNvZnR3YXJlOyB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3JcbiAqIG1vZGlmeSBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWNcbiAqIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5IHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IHZlcnNpb25cbiAqXHQzLjAgb2YgdGhlIExpY2Vuc2UuIFRoaXMgbGlicmFyeSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZVxuICogdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCwgYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW5cbiAqIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVJcbiAqIFBVUlBPU0UuIFNlZSB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljXG4gKiBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBsaWJyYXJ5LlxuICovXG5cbid1c2Ugc3RyaWN0J1xuXG5jb25zdCBXYXRjaGVyVjEgID0gcmVxdWlyZSgnLi4vdjEvd2F0Y2hlci5qcycpXG5jb25zdCBmb3JtYXRUaW1lID0gcmVxdWlyZSgnLi4vdGltZWNvbnRyb2wuanMnKS5mb3JtYXRUaW1lXG5cbmNsYXNzIENvbm5lY3RvclYxIHtcblx0Y29uc3RydWN0b3IgKHNlbGVjdG9yKSB7XG5cdFx0dGhpcy5zZWxlY3RvciA9IHNlbGVjdG9yXG5cdFx0dGhpcy5kYXRhTW9kZWwgPSB7fVxuXHRcdHRoaXMuX2NvZGVyID0gc2VsZWN0b3IuZW5jb2RlKClcblx0XHR0aGlzLndhdGNoZXJzID0gW11cblxuXHRcdC8qKiBzdHJ1Y3R1cmUgb2YgZGF0YSBjb25maWcuIFtdIG1lYW5zIGRlZmF1bHQgdmFsdWUgKioqXG5cdFx0XHQgY3JpdGVyaWEgOlxuXHRcdFx0ICAgdGltZTogYWxsIDMgdGltZSBjcml0ZXJpYSBzaG91bGQgbm90IGJlIGRlZmluZWQgYXQgdGhlIHNhbWUgdGltZS4gKHJhbmdlIHdvdWxkIGJlIGdpdmVuIHVwKSBbVXNhZ2UgOiBzdGFydCArIGVuZCwgb3Igc3RhcnQgKyByYW5nZSwgb3IgZW5kICsgcmFuZ2VdXG5cdFx0XHQgICAgIHN0YXJ0OiB7W251bGxdLHRpbWV9IChudWxsIG1lYW5zIG1vc3QgcmVjZW50KSAvLyBzdG9yZWQgYSBVVEMgaW4gbXMgKG51bSlcblx0XHRcdCAgICAgZW5kOiB7W251bGxdLCB0aW1lfSAobnVsbCBtZWFucyBtb3N0IG9sZGVzdCkgLy8gc3RvcmVkIGFzIFVUQyBpbiBtcyAobnVtKVxuXHRcdFx0ICAgICByYW5nZToge1tudWxsXSwgdGltZX0gKHJhbmdlIG9mIHRpbWUocG9zaXRpdmUpICkgLy8gaW4gcyAobnVtKVxuXHRcdFx0ICAgICBzYW1wbGluZzoge1tudWxsXSBvciBTdHJpbmd9IGl0IGNvdWxkIGJlIFwic2Vjb25kXCIsIFwibWludXRlXCIsIFwid2Vla1wiLCBcIm1vbnRoXCIsIFwieWVhclwiIC0gbWF4aW1pemVkIHNlcnZlciBzaWRlIHRvIDEwayBzYW1wbGVzIGJ5IHNlY3VyaXR5XG5cdFx0XHQgICByb2JvdHM6IHtBcnJheU9mIElEIG9yIFtcImFsbFwiXX1cblx0XHRcdCAgIHBsYWNlczoge0FycmF5T2YgSUQgb3IgW1wiYWxsXCJdfVxuXHRcdFx0IG9wZXJhdG9yOiB7W2xhc3RdLCBtYXgsIG1veSwgc2R9IC0gZGVwcmVjYXRlZFxuXHRcdFx0IC4uLlxuXG5cdFx0XHQgc2Vuc29ycyA6IHtbbnVsbF0gb3IgQXJyYXlPZiBTZW5zb3JOYW1lfVxuXHRcdCovXG5cdFx0dGhpcy5kYXRhQ29uZmlnID0ge1xuXHRcdFx0Y3JpdGVyaWE6IHtcblx0XHRcdFx0dGltZToge1xuXHRcdFx0XHRcdHN0YXJ0OiBudWxsLFxuXHRcdFx0XHRcdGVuZCAgOiBudWxsLFxuXHRcdFx0XHRcdHJhbmdlOiBudWxsIC8vIGluIHNcblx0XHRcdFx0fSxcblx0XHRcdFx0cm9ib3RzOiBudWxsLFxuXHRcdFx0XHRwbGFjZXM6IG51bGxcblx0XHRcdH0sXG5cdFx0XHRvcGVyYXRvcjogJ2xhc3QnLFxuXHRcdFx0c2Vuc29ycyA6IG51bGwsXG5cdFx0XHRzYW1wbGluZzogbnVsbCAvLyBzYW1wbGluZ1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzXG5cdH1cblxuXHRnZXRVcGRhdGVEYXRhT2JqZWN0ICgpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0cGF0aCAgICAgOiAnL2ZyL3BhcnRuZXJpbmcvSWVxJyxcblx0XHRcdGludGVyZmFjZTogJ2ZyLnBhcnRuZXJpbmcuSWVxJ1xuXHRcdH1cblx0fVxuXG5cdGdldENzdkRhdGFPYmplY3QgKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRwYXRoICAgICA6ICcvZnIvcGFydG5lcmluZy9JZXEnLFxuXHRcdFx0aW50ZXJmYWNlOiAnZnIucGFydG5lcmluZy5JZXEnXG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqIEdldCBkYXRhTW9kZWwgOlxuXHQgKiB7XG5cdCAqXHRcInNlbnNldXJYWFwiOiB7XG5cdCAqXHRcdFx0ZGF0YTpbRkxPQVQsIC4uLl0sXG5cdCAqXHRcdFx0dGltZTpbRkxPQVQsIC4uLl0sXG5cdCAqXHRcdFx0cm9ib3RzOltGTE9BVCwgLi4uXSxcblx0ICpcdFx0XHRwbGFjZXM6W0ZMT0FULCAuLi5dLFxuXHQgKlx0XHRcdHF1YWxpdHlJbmRleDpbRkxPQVQsIC4uLl0sXG5cdCAqXHRcdFx0cmFuZ2U6IFtGTE9BVCwgRkxPQVRdLFxuXHQgKlx0XHRcdHVuaXQ6IHN0cmluZyxcblx0ICpcdFx0bGFiZWw6IHN0cmluZ1xuXHQgKlx0XHR9LFxuXHQgKlx0IC4uLiAoXCJzZW5zZXVyc1lZXCIpXG5cdCAqIH1cblx0ICovXG5cdGdldERhdGFNb2RlbCAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuZGF0YU1vZGVsXG5cdH1cblxuXHRnZXREYXRhUmFuZ2UgKCkge1xuXHRcdHJldHVybiB0aGlzLmRhdGFNb2RlbC5yYW5nZVxuXHR9XG5cblx0LyoqXG5cdCAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhQ29uZmlnIGNvbmZpZyBmb3IgZGF0YSByZXF1ZXN0XG5cdCAqIGlmIGRhdGFDb25maWcgaXMgZGVmaW5lIDogc2V0IGFuZCByZXR1cm4gdGhpc1xuXHQgKiBAcmV0dXJuIHtJRVF9IHRoaXNcblx0ICogZWxzZVxuXHQgKiBAcmV0dXJuIHtPYmplY3R9IGN1cnJlbnQgZGF0YUNvbmZpZ1xuXHQgKi9cblx0RGF0YUNvbmZpZyAobmV3RGF0YUNvbmZpZykge1xuXHRcdGlmIChuZXdEYXRhQ29uZmlnICE9IG51bGwpIHtcblx0XHRcdHRoaXMuZGF0YUNvbmZpZyA9IG5ld0RhdGFDb25maWdcblx0XHRcdHJldHVybiB0aGlzXG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLmRhdGFDb25maWdcblx0fVxuXG5cdC8qKlxuXHQgKiBUTyBCRSBJTVBMRU1FTlRFRCA6IG9wZXJhdG9yIG1hbmFnZW1lbnQgaW4gRE4tSUVRXG5cdCAqIEBwYXJhbSAge1N0cmluZ31cdCBuZXdPcGVyYXRvciA6IHtbbGFzdF0sIG1heCwgbW95LCBzZH1cblx0ICogQHJldHVybiB7SUVRfSB0aGlzIC0gY2hhaW5hYmxlXG5cdCAqIFNldCBvcGVyYXRvciBjcml0ZXJpYS5cblx0ICogRGVwZW5kcyBvbiBuZXdPcGVyYXRvclxuXHQgKiBAcGFyYW0ge1N0cmluZ30gbmV3T3BlcmF0b3Jcblx0ICogQHJldHVybiB0aGlzXG5cdCAqIEdldCBvcGVyYXRvciBjcml0ZXJpYS5cblx0ICogQHJldHVybiB7U3RyaW5nfSBvcGVyYXRvclxuXHQgKi9cblx0RGF0YU9wZXJhdG9yIChuZXdPcGVyYXRvcikge1xuXHRcdGlmIChuZXdPcGVyYXRvciAhPSBudWxsKSB7XG5cdFx0XHR0aGlzLmRhdGFDb25maWcub3BlcmF0b3IgPSBuZXdPcGVyYXRvclxuXHRcdFx0cmV0dXJuIHRoaXNcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXMuZGF0YUNvbmZpZy5vcGVyYXRvclxuXHR9XG5cblx0LyoqXG5cdCAqIERlcGVuZHMgb24gbnVtU2FtcGxlc1xuXHQgKiBAcGFyYW0ge2ludH0gbnVtYmVyIG9mIHNhbXBsZXMgaW4gZGF0YU1vZGVsXG5cdCAqIGlmIGRlZmluZWQgOiBzZXQgbnVtYmVyIG9mIHNhbXBsZXNcblx0ICogQHJldHVybiB7SUVRfSB0aGlzXG5cdCAqIGVsc2Vcblx0ICogQHJldHVybiB7aW50fSBudW1iZXIgb2Ygc2FtcGxlc1xuXHQgKi9cblx0RGF0YVNhbXBsaW5nIChudW1TYW1wbGVzKSB7XG5cdFx0aWYgKG51bVNhbXBsZXMgIT0gbnVsbCkge1xuXHRcdFx0dGhpcy5kYXRhQ29uZmlnLnNhbXBsaW5nID0gbnVtU2FtcGxlc1xuXHRcdFx0cmV0dXJuIHRoaXNcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXMuZGF0YUNvbmZpZy5zYW1wbGluZ1xuXHR9XG5cblx0LyoqXG5cdCAqIFNldCBvciBnZXQgZGF0YSB0aW1lIGNyaXRlcmlhIHN0YXJ0IGFuZCBlbmQuXG5cdCAqIElmIHBhcmFtIGRlZmluZWRcblx0ICogQHBhcmFtIHtEYXRlfSBuZXdUaW1lU3RhcnQgLy8gbWF5IGJlIG51bGxcblx0ICogQHBhcmFtIHtEYXRlfSBuZXdUaW1lRW5kIC8vIG1heSBiZSBudWxsXG5cdCAqIEByZXR1cm4ge0lFUX0gdGhpc1xuXHQgKiBJZiBubyBwYXJhbSBkZWZpbmVkOlxuXHQgKiBAcmV0dXJuIHtPYmplY3R9IFRpbWUgb2JqZWN0OiBmaWVsZHMgc3RhcnQgYW5kIGVuZC5cblx0ICovXG5cdERhdGFUaW1lIChuZXdUaW1lU3RhcnQsIG5ld1RpbWVFbmQsIG5ld1JhbmdlKSB7XG5cdFx0aWYgKG5ld1RpbWVTdGFydCAhPSBudWxsIHx8IG5ld1RpbWVFbmQgIT0gbnVsbCB8fCBuZXdSYW5nZSAhPSBudWxsKSB7XG5cdFx0XHR0aGlzLmRhdGFDb25maWcuY3JpdGVyaWEudGltZS5zdGFydCA9IGZvcm1hdFRpbWUobmV3VGltZVN0YXJ0KVxuXHRcdFx0dGhpcy5kYXRhQ29uZmlnLmNyaXRlcmlhLnRpbWUuZW5kID0gZm9ybWF0VGltZShuZXdUaW1lRW5kKVxuXHRcdFx0dGhpcy5kYXRhQ29uZmlnLmNyaXRlcmlhLnRpbWUucmFuZ2UgPSBuZXdSYW5nZVxuXHRcdFx0cmV0dXJuIHRoaXNcblx0XHR9XG5cdFx0cmV0dXJuIHtcblx0XHRcdHN0YXJ0OiBuZXcgRGF0ZSh0aGlzLmRhdGFDb25maWcuY3JpdGVyaWEudGltZS5zdGFydCksXG5cdFx0XHRlbmQgIDogbmV3IERhdGUodGhpcy5kYXRhQ29uZmlnLmNyaXRlcmlhLnRpbWUuZW5kKSxcblx0XHRcdHJhbmdlOiBuZXcgRGF0ZSh0aGlzLmRhdGFDb25maWcuY3JpdGVyaWEudGltZS5yYW5nZSlcblx0XHR9XG5cdH1cblxuXHQvKipcblx0ICogRGVwZW5kcyBvbiByb2JvdElkc1xuXHQgKiBTZXQgcm9ib3RzIGNyaXRlcmlhLlxuXHQgKiBAcGFyYW0ge0FycmF5W0ludF19IHJvYm90SWRzIGxpc3Qgb2Ygcm9ib3RzIElkc1xuXHQgKiBHZXQgcm9ib3RzIGNyaXRlcmlhLlxuXHQgKiBAcmV0dXJuIHtBcnJheVtJbnRdfSBsaXN0IG9mIHJvYm90cyBJZHNcblx0ICovXG5cdERhdGFSb2JvdElkcyAocm9ib3RJZHMpIHtcblx0XHRpZiAocm9ib3RJZHMgIT0gbnVsbCkge1xuXHRcdFx0dGhpcy5kYXRhQ29uZmlnLmNyaXRlcmlhLnJvYm90cyA9IHJvYm90SWRzXG5cdFx0XHRyZXR1cm4gdGhpc1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcy5kYXRhQ29uZmlnLmNyaXRlcmlhLnJvYm90c1xuXHR9XG5cblx0LyoqXG5cdCAqIERlcGVuZHMgb24gcGxhY2VJZHNcblx0ICogU2V0IHBsYWNlcyBjcml0ZXJpYS5cblx0ICogQHBhcmFtIHtBcnJheVtJbnRdfSBwbGFjZUlkcyBsaXN0IG9mIHBsYWNlcyBJZHNcblx0ICogR2V0IHBsYWNlcyBjcml0ZXJpYS5cblx0ICogQHJldHVybiB7QXJyYXlbSW50XX0gbGlzdCBvZiBwbGFjZXMgSWRzXG5cdCAqL1xuXHREYXRhUGxhY2VJZHMgKHBsYWNlSWRzKSB7XG5cdFx0aWYgKHBsYWNlSWRzICE9IG51bGwpIHtcblx0XHRcdHRoaXMuZGF0YUNvbmZpZy5jcml0ZXJpYS5wbGFjZUlkID0gcGxhY2VJZHNcblx0XHRcdHJldHVybiB0aGlzXG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLmRhdGFDb25maWcuY3JpdGVyaWEucGxhY2VzXG5cdH1cblxuXHQvKipcblx0ICogR2V0IGRhdGEgYnkgc2Vuc29yIG5hbWUuXG5cdCAqIEBwYXJhbSB7QXJyYXlbU3RyaW5nXX0gc2Vuc29yTmFtZSBsaXN0IG9mIHNlbnNvcnNcblx0ICovXG5cdGdldERhdGFCeU5hbWUgKHNlbnNvck5hbWVzKSB7XG5cdFx0Y29uc3QgZGF0YSA9IFtdXG5cdFx0Zm9yIChjb25zdCBuIGluIHNlbnNvck5hbWVzKSB7XG5cdFx0XHRkYXRhLnB1c2godGhpcy5kYXRhTW9kZWxbc2Vuc29yTmFtZXNbbl1dKVxuXHRcdH1cblx0XHRyZXR1cm4gZGF0YVxuXHR9XG5cblx0LyoqXG5cdCAqIFVwZGF0ZSBkYXRhIGdpdmVuIGRhdGFDb25maWcuXG5cdCAqIEBwYXJhbSB7ZnVuY30gY2FsbGJhY2sgOiBjYWxsZWQgYWZ0ZXIgdXBkYXRlXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhQ29uZmlnOiBkYXRhIHRvIGNvbmZpZyByZXF1ZXN0XG5cdCAqIFRPRE8gVVNFIFBST01JU0Vcblx0ICovXG5cdHVwZGF0ZURhdGEgKGNhbGxiYWNrLCBkYXRhQ29uZmlnKSB7XG5cdFx0dGhpcy5fdXBkYXRlRGF0YShjYWxsYmFjaywgZGF0YUNvbmZpZywgJ0RhdGFSZXF1ZXN0Jylcblx0fVxuXG5cdC8qKlxuXHQgKiBVcGRhdGUgZGF0YSBnaXZlbiBkYXRhQ29uZmlnLlxuXHQgKiBAcGFyYW0ge2Z1bmN9IGNhbGxiYWNrIDogY2FsbGVkIGFmdGVyIHVwZGF0ZVxuXHQgKiBAcGFyYW0ge29iamVjdH0gZGF0YUNvbmZpZzogZGF0YSB0byBjb25maWcgcmVxdWVzdFxuXHQgKiBAcGFyYW0ge3N0cmluZ30gZnVuY05hbWU6IG5hbWUgb2YgcmVxdWVzdGVkIGZ1bmN0aW9uIGluIGRpeWEtbm9kZS1pZXEuIERlZmF1bHQ6IFwiRGF0YVJlcXVlc3RcIi5cblx0ICogVE9ETyBVU0UgUFJPTUlTRVxuXHQgKi9cblx0X3VwZGF0ZURhdGEgKGNhbGxiYWNrLCBkYXRhQ29uZmlnLCBmdW5jTmFtZSkge1xuXHRcdGlmIChkYXRhQ29uZmlnKSB7XG5cdFx0XHR0aGlzLkRhdGFDb25maWcoZGF0YUNvbmZpZylcblx0XHR9XG5cdFx0dGhpcy5zZWxlY3Rvci5yZXF1ZXN0KHtcblx0XHRcdHNlcnZpY2U6ICdpZXEnLFxuXHRcdFx0ZnVuYyAgIDogZnVuY05hbWUsXG5cdFx0XHRkYXRhICAgOiB7IGRhdGE6IEpTT04uc3RyaW5naWZ5KHRoaXMuZGF0YUNvbmZpZykgfSxcdFx0Ly9cdHR5cGU6XCJzcGxSZXFcIixcblx0XHRcdG9iaiAgICA6IHRoaXMuZ2V0VXBkYXRlRGF0YU9iamVjdCgpXG5cdFx0fSwgKGRuSWQsIGVyciwgX2RhdGEpID0+IHtcblx0XHRcdGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKF9kYXRhKVxuXHRcdFx0aWYgKGVyciAhPSBudWxsKSB7XG5cdFx0XHRcdGlmICh0eXBlb2YgZXJyID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgZXJyLm5hbWUgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2sobnVsbCwgZXJyLm5hbWUpXG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjYWxsYmFjayh0aGlzLl9nZXREYXRhTW9kZWxGcm9tUmVjdihkYXRhKSkgLy8gY2FsbGJhY2sgZnVuY1xuXHRcdH0pXG5cdH1cblxuXHRnZXRDb25maW5lbWVudExldmVsICgpIHtcblx0XHRyZXR1cm4gdGhpcy5jb25maW5lbWVudFxuXHR9XG5cblx0Z2V0QWlyUXVhbGl0eUxldmVsICgpIHtcblx0XHRyZXR1cm4gdGhpcy5haXJRdWFsaXR5XG5cdH1cblxuXHRnZXRFbnZRdWFsaXR5TGV2ZWwgKCkge1xuXHRcdHJldHVybiB0aGlzLmVudlF1YWxpdHlcblx0fVxuXG5cdC8qKlxuXHQgKiBVcGRhdGUgaW50ZXJuYWwgbW9kZWwgd2l0aCByZWNlaXZlZCBkYXRhXG5cdCAqIEBwYXJhbSAgY29uZmlnIGRhdGEgdG8gY29uZmlndXJlIHN1YnNjcmlwdGlvblxuXHQgKiBAcGFyYW0gIGNhbGxiYWNrIGNhbGxlZCBvbiBhbnN3ZXJzIChAcGFyYW0gOiBkYXRhTW9kZWwpXG5cdCAqIEByZXR1cm4gd2F0Y2hlciBjcmVhdGVkIHdhdGNoZXJcblx0ICovXG5cdHdhdGNoIChjb25maWcsIGNhbGxiYWNrKSB7XG5cdFx0Ly8gZG8gbm90IGNyZWF0ZSB3YXRjaGVyIHdpdGhvdXQgYSBjYWxsYmFja1xuXHRcdGlmIChjYWxsYmFjayA9PSBudWxsIHx8IHR5cGVvZiBjYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0cmV0dXJuIG51bGxcblx0XHR9XG5cblx0XHRjb25zdCB3YXRjaGVyID0gdGhpcy5jcmVhdGVXYXRjaGVyKGNvbmZpZylcblxuXHRcdC8vIGFkZCB3YXRjaGVyIGluIHdhdGNoZXIgbGlzdFxuXHRcdHRoaXMud2F0Y2hlcnMucHVzaCh3YXRjaGVyKVxuXG5cdFx0d2F0Y2hlci5vbignZGF0YScsIChkYXRhKSA9PiB7XG5cdFx0XHRjYWxsYmFjayh0aGlzLl9nZXREYXRhTW9kZWxGcm9tUmVjdihkYXRhKSlcblx0XHR9KVxuXHRcdHdhdGNoZXIub24oJ3N0b3AnLCB0aGlzLl9yZW1vdmVXYXRjaGVyKVxuXG5cdFx0cmV0dXJuIHdhdGNoZXJcblx0fVxuXG5cdGNyZWF0ZVdhdGNoZXIgKGNvbmZpZykge1xuXHRcdHJldHVybiBuZXcgV2F0Y2hlclYxKHRoaXMuc2VsZWN0b3IsIGNvbmZpZylcblx0fVxuXG5cdC8qKlxuXHQgKiBDYWxsYmFjayB0byByZW1vdmUgd2F0Y2hlciBmcm9tIGxpc3Rcblx0ICogQHBhcmFtIHdhdGNoZXIgdG8gYmUgcmVtb3ZlZFxuXHQgKi9cblx0X3JlbW92ZVdhdGNoZXIgKHdhdGNoZXIpIHtcblx0XHQvLyBmaW5kIGFuZCByZW1vdmUgd2F0Y2hlciBpbiBsaXN0XG5cdFx0dGhpcy53YXRjaGVycy5maW5kKChlbCwgaWQsIHdhdGNoZXJzKSA9PiB7XG5cdFx0XHRpZiAod2F0Y2hlciA9PT0gZWwpIHtcblx0XHRcdFx0d2F0Y2hlcnMuc3BsaWNlKGlkLCAxKSAvLyByZW1vdmVcblx0XHRcdFx0cmV0dXJuIHRydWVcblx0XHRcdH1cblx0XHRcdHJldHVybiBmYWxzZVxuXHRcdH0pXG5cdH1cblxuXHQvKipcblx0ICogU3RvcCBhbGwgd2F0Y2hlcnNcblx0ICovXG5cdGNsb3NlU3Vic2NyaXB0aW9ucyAoKSB7XG5cdFx0Y29uc29sZS53YXJuKCdEZXByZWNhdGVkIGZ1bmN0aW9uIHVzZSBzdG9wV2F0Y2hlcnMgaW5zdGVhZCcpXG5cdFx0dGhpcy5zdG9wV2F0Y2hlcnMoKVxuXHR9XG5cblx0c3RvcFdhdGNoZXJzICgpIHtcblx0XHR0aGlzLndhdGNoZXJzLmZvckVhY2goKHdhdGNoZXIpID0+IHtcblx0XHRcdC8vIHJlbW92ZSBsaXN0ZW5lciBvbiBzdG9wIGV2ZW50IHRvIGF2b2lkIHB1cmdpbmcgd2F0Y2hlcnMgdHdpY2Vcblx0XHRcdHdhdGNoZXIucmVtb3ZlTGlzdGVuZXIoJ3N0b3AnLCB0aGlzLl9yZW1vdmVXYXRjaGVyKVxuXHRcdFx0d2F0Y2hlci5zdG9wKClcblx0XHR9KVxuXHRcdHRoaXMud2F0Y2hlcnMgPSBbXVxuXHR9XG5cblx0LyoqXG5cdCAqIFJlcXVlc3QgRGF0YSB0byBtYWtlIENTViBmaWxlXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBjc3ZDb25maWcgcGFyYW1zOlxuXHQgKiBAcGFyYW0ge2xpc3R9IGNzdkNvbmZpZy5zZW5zb3JOYW1lcyA6IGxpc3Qgb2Ygc2Vuc29yIGFuZCBpbmRleCBuYW1lc1xuXHQgKiBAcGFyYW0ge251bWJlcn0gY3N2Q29uZmlnLl9zdGFydFRpbWU6IHRpbWVzdGFtcCBvZiBiZWdpbm5pbmcgdGltZVxuXHQgKiBAcGFyYW0ge251bWJlcn0gY3N2Q29uZmlnLl9lbmRUaW1lOiB0aW1lc3RhbXAgb2YgZW5kIHRpbWVcblx0ICogQHBhcmFtIHtzdHJpbmd9IGNzdkNvbmZpZy50aW1lU2FtcGxlOiB0aW1laW50ZXJ2YWwgZm9yIGRhdGEuIFBhcmFtZXRlcnM6IFwic2Vjb25kXCIsIFwibWludXRlXCIsIFwiaG91clwiLCBcImRheVwiLCBcIndlZWtcIiwgXCJtb250aFwiXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSBjc3ZDb25maWcuX25saW5lczogbWF4aW11bSBudW1iZXIgb2YgbGluZXMgcmVxdWVzdGVkXG5cdCAqIEBwYXJhbSB7Y2FsbGJhY2t9IGNhbGxiYWNrOiBjYWxsZWQgYWZ0ZXIgdXBkYXRlIChAcGFyYW0gdXJsIHRvIGRvd25sb2FkIGNzdiBmaWxlKVxuXHQgKi9cblx0Z2V0Q1NWRGF0YSAoX2NzdkNvbmZpZywgY2FsbGJhY2spIHtcblx0XHRjb25zdCBjc3ZDb25maWcgPSBfY3N2Q29uZmlnXG5cdFx0aWYgKGNzdkNvbmZpZyAmJiB0eXBlb2YgY3N2Q29uZmlnLm5saW5lcyAhPT0gJ251bWJlcicpIHtcblx0XHRcdGNzdkNvbmZpZy5ubGluZXMgPSB1bmRlZmluZWRcblx0XHR9XG5cdFx0aWYgKGNzdkNvbmZpZyAmJiB0eXBlb2YgY3N2Q29uZmlnLmxhbmcgIT09ICdzdHJpbmcnKSB7XG5cdFx0XHRjc3ZDb25maWcubGFuZyA9IHVuZGVmaW5lZFxuXHRcdH1cblxuXHRcdGNvbnN0IGRhdGFDb25maWcgPSBKU09OLnN0cmluZ2lmeSh7XG5cdFx0XHRjcml0ZXJpYToge1xuXHRcdFx0XHR0aW1lICA6IHsgc3RhcnQ6IGZvcm1hdFRpbWUoY3N2Q29uZmlnLnN0YXJ0VGltZSksIGVuZDogZm9ybWF0VGltZShjc3ZDb25maWcuZW5kVGltZSksIHNhbXBsaW5nOiBjc3ZDb25maWcudGltZVNhbXBsZSB9LFxuXHRcdFx0XHRwbGFjZXM6IFtdLFxuXHRcdFx0XHRyb2JvdHM6IFtdXG5cdFx0XHR9LFxuXHRcdFx0c2Vuc29ycyA6IGNzdkNvbmZpZy5zZW5zb3JOYW1lcyxcblx0XHRcdHNhbXBsaW5nOiBjc3ZDb25maWcubmxpbmVzLFxuXHRcdFx0bGFuZyAgICA6IGNzdkNvbmZpZy5sYW5nXG5cdFx0fSlcblxuXHRcdHRoaXMuc2VsZWN0b3IucmVxdWVzdCh7XG5cdFx0XHRzZXJ2aWNlOiAnaWVxJyxcblx0XHRcdGZ1bmMgICA6ICdDc3ZEYXRhUmVxdWVzdCcsXG5cdFx0XHRkYXRhICAgOiB7IGRhdGE6IGRhdGFDb25maWcgfSxcblx0XHRcdC8vXHR0eXBlOlwic3BsUmVxXCIsXG5cdFx0XHRvYmogICAgOiB0aGlzLmdldENzdkRhdGFPYmplY3QoKVxuXHRcdH0sIChkbklkLCBlcnIsIGRhdGEpID0+IHtcblx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0aWYgKHR5cGVvZiBlcnIgPT09ICdvYmplY3QnICYmIHR5cGVvZiBlcnIubmFtZSA9PT0gJ3N0cmluZycpIHtcblx0XHRcdFx0XHRjYWxsYmFjayhudWxsLCBlcnIubmFtZSlcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNhbGxiYWNrKGRhdGEpXG5cdFx0fSlcblx0fVxuXG5cdC8qKlxuXHQgKiBSZXF1ZXN0IERhdGEgdG8gbWFrZSBkYXRhIG1hcFxuXHQgKiBAcGFyYW0ge09iamVjdH0gZGF0YUNvbmZpZyBjb25maWcgZm9yIGRhdGEgcmVxdWVzdFxuXHQgKiBAcGFyYW0ge2NhbGxiYWNrfSBjYWxsYmFjazogY2FsbGVkIGFmdGVyIHVwZGF0ZVxuXHQgKi9cblx0Z2V0RGF0YU1hcERhdGEgKGRhdGFDb25maWcsIGNhbGxiYWNrKSB7XG5cdFx0Y29uc29sZS53YXJuKCdUaGlzIGZ1bmN0aW9uIHdpbGwgYmUgZGVwcmVjYXRlZC4gUGxlYXNlIHVzZSBcImdldEllcURhdGFcIiBpbnN0ZWFkLicpXG5cdFx0dGhpcy5nZXRJZXFEYXRhKGRhdGFDb25maWcsIGNhbGxiYWNrKVxuXHR9XG5cblx0LyoqXG5cdCAqIFJlcXVlc3QgSWVxIERhdGEgKHVzZWQgZm9yIGV4YW1wbGUgdG8gbWFrZSBoZWF0bWFwKVxuXHQgKiBAcGFyYW0ge09iamVjdH0gZGF0YUNvbmZpZyBjb25maWcgZm9yIGRhdGEgcmVxdWVzdFxuXHQgKiBAcGFyYW0ge2NhbGxiYWNrfSBjYWxsYmFjazogY2FsbGVkIGFmdGVyIHVwZGF0ZVxuXHQgKi9cblx0Z2V0SWVxRGF0YSAoZGF0YUNvbmZpZywgY2FsbGJhY2spIHtcblx0XHR0aGlzLl91cGRhdGVEYXRhKGNhbGxiYWNrLCBkYXRhQ29uZmlnLCAnRGF0YVJlcXVlc3QnKVxuXHR9XG5cblx0LyoqXG5cdCAqIFJlcXVlc3QgRGF0YSB0byBtYWtlIGhlYXRtYXBcblx0ICogQHBhcmFtIHtsaXN0fSBzZW5zb3JOYW1lcyA6IGxpc3Qgb2Ygc2Vuc29yIGFuZCBpbmRleCBuYW1lc1xuXHQgKiBAcGFyYW0ge29iamVjdH0gdGltZTogb2JqZWN0IGNvbnRhaW5pbmcgdGltZXN0YW1wcyBmb3IgYmVnaW4gYW5kIGVuZCBvZiBkYXRhIGZvciBoZWF0bWFwXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBzYW1wbGU6IHRpbWVpbnRlcnZhbCBmb3IgZGF0YS4gUGFyYW1ldGVyczogXCJzZWNvbmRcIiwgXCJtaW51dGVcIiwgXCJob3VyXCIsIFwiZGF5XCIsIFwid2Vla1wiLCBcIm1vbnRoXCJcblx0ICogQHBhcmFtIHtjYWxsYmFja30gY2FsbGJhY2s6IGNhbGxlZCBhZnRlciB1cGRhdGVcblx0ICogQGRlcHJlY2F0ZWQgV2lsbCBiZSBkZXByZWNhdGVkIGluIGZ1dHVyZSB2ZXJzaW9uLiBQbGVhc2UgdXNlIFwiZ2V0RGF0YU1hcERhdGFcIiBpbnN0ZWFkLlxuXHQgKi9cblx0Z2V0SGVhdE1hcERhdGEgKHNlbnNvck5hbWVzLCB0aW1lLCBzYW1wbGUsIGNhbGxiYWNrKSB7XG5cdFx0Y29uc3QgZGF0YUNvbmZpZyA9IHtcblx0XHRcdGNyaXRlcmlhOiB7XG5cdFx0XHRcdHRpbWUgIDogeyBzdGFydDogZm9ybWF0VGltZSh0aW1lLnN0YXJ0RXBvY2gpLCBlbmQ6IGZvcm1hdFRpbWUodGltZS5lbmRFcG9jaCksIHNhbXBsaW5nOiBzYW1wbGUgfSxcblx0XHRcdFx0cGxhY2VzOiBbXSxcblx0XHRcdFx0cm9ib3RzOiBbXVxuXHRcdFx0fSxcblx0XHRcdHNlbnNvcnM6IHNlbnNvck5hbWVzXG5cdFx0fVxuXHRcdGNvbnNvbGUud2FybignVGhpcyBmdW5jdGlvbiB3aWxsIGJlIGRlcHJlY2F0ZWQuIFBsZWFzZSB1c2UgXCJnZXRJZXFEYXRhXCIgaW5zdGVhZC4nKVxuXHRcdC8vIHRoaXMuZ2V0RGF0YU1hcERhdGEoZGF0YUNvbmZpZywgY2FsbGJhY2spXG5cdFx0dGhpcy5nZXRJZXFEYXRhKGRhdGFDb25maWcsIGNhbGxiYWNrKVxuXHR9XG5cblx0LyoqXG5cdCAqIFVwZGF0ZSBpbnRlcm5hbCBtb2RlbCB3aXRoIHJlY2VpdmVkIGRhdGFcblx0ICogQHBhcmFtICB7T2JqZWN0fSBkYXRhIGRhdGEgcmVjZWl2ZWQgZnJvbSBEaXlhTm9kZSBieSB3ZWJzb2NrZXRcblx0ICogQHJldHVybiB7W3R5cGVdfVx0XHRbZGVzY3JpcHRpb25dXG5cdCAqL1xuXHRfZ2V0RGF0YU1vZGVsRnJvbVJlY3YgKGRhdGEpIHtcblx0XHRsZXQgZGF0YU1vZGVsID0gbnVsbFxuXHRcdGlmIChkYXRhICE9IG51bGwpIHtcblx0XHRcdGZvciAoY29uc3QgbiBpbiBkYXRhKSB7XG5cdFx0XHRcdGlmIChuICE9PSAnaGVhZGVyJyAmJiBuICE9PSAnZXJyJykge1xuXHRcdFx0XHRcdGlmIChkYXRhW25dLmVyciAhPSBudWxsICYmIGRhdGFbbl0uZXJyLnN0ID4gMCkge1xuXHRcdFx0XHRcdFx0Y29udGludWVcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIWRhdGFNb2RlbCkge1xuXHRcdFx0XHRcdFx0ZGF0YU1vZGVsID0ge31cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIWRhdGFNb2RlbFtuXSkge1xuXHRcdFx0XHRcdFx0ZGF0YU1vZGVsW25dID0ge31cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0LyogdXBkYXRlIGRhdGEgaWQgKi9cblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0uaWQgPSBuXG5cdFx0XHRcdFx0LyogdXBkYXRlIGRhdGEgYWJzb2x1dGUgcmFuZ2UgKi9cblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0ucmFuZ2UgPSBkYXRhW25dLnJhbmdlXG5cdFx0XHRcdFx0LyogdXBkYXRlIGRhdGEgcmFuZ2UgKi9cblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0udGltZVJhbmdlID0gZGF0YVtuXS50aW1lUmFuZ2Vcblx0XHRcdFx0XHQvKiB1cGRhdGUgZGF0YSBsYWJlbCAqL1xuXHRcdFx0XHRcdGRhdGFNb2RlbFtuXS5sYWJlbCA9IGRhdGFbbl0ubGFiZWxcblx0XHRcdFx0XHQvKiB1cGRhdGUgZGF0YSB1bml0ICovXG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnVuaXQgPSBkYXRhW25dLnVuaXRcblx0XHRcdFx0XHQvKiB1cGRhdGUgZGF0YSBwcmVjaXNpb24gKi9cblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0ucHJlY2lzaW9uID0gZGF0YVtuXS5wcmVjaXNpb25cblx0XHRcdFx0XHQvKiB1cGRhdGUgZGF0YSBjYXRlZ29yaWVzICovXG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLmNhdGVnb3J5ID0gZGF0YVtuXS5jYXRlZ29yeVxuXHRcdFx0XHRcdC8qIHN1Z2dlc3RlZCB5IGRpc3BsYXkgcmFuZ2UgKi9cblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0uem9vbVJhbmdlID0gWzAsIDEwMF1cblx0XHRcdFx0XHQvLyB1cGRhdGUgc2Vuc29yIGNvbmZvcnQgcmFuZ2Vcblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0uY29uZm9ydFJhbmdlID0gZGF0YVtuXS5jb25mb3J0UmFuZ2VcblxuXHRcdFx0XHRcdC8qIHVwZGF0ZSBkYXRhIGluZGV4UmFuZ2UgKi9cblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0ucXVhbGl0eUNvbmZpZyA9IHsgaW5kZXhSYW5nZTogZGF0YVtuXS5pbmRleFJhbmdlIH1cblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0udGltZSA9IHRoaXMuX2NvZGVyLmZyb20oZGF0YVtuXS50aW1lLCAnYjY0JywgOClcblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0uZGF0YSA9IGRhdGFbbl0uZGF0YSAhPSBudWxsXG5cdFx0XHRcdFx0XHQ/IHRoaXMuX2NvZGVyLmZyb20oZGF0YVtuXS5kYXRhLCAnYjY0JywgNClcblx0XHRcdFx0XHRcdDogZGF0YVtuXS5hdmcgIT0gbnVsbFxuXHRcdFx0XHRcdFx0ICAgPyB0aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0uYXZnLmQsICdiNjQnLCA0KVxuXHRcdFx0XHRcdFx0ICAgOiBudWxsXG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnF1YWxpdHlJbmRleCA9IGRhdGFbbl0uZGF0YSAhPSBudWxsXG5cdFx0XHRcdFx0XHQ/IHRoaXMuX2NvZGVyLmZyb20oZGF0YVtuXS5pbmRleCwgJ2I2NCcsIDQpXG5cdFx0XHRcdFx0XHQ6IGRhdGFbbl0uYXZnICE9IG51bGxcblx0XHRcdFx0XHRcdCAgID8gdGhpcy5fY29kZXIuZnJvbShkYXRhW25dLmF2Zy5pLCAnYjY0JywgNClcblx0XHRcdFx0XHRcdCAgIDogbnVsbFxuXHRcdFx0XHRcdGRhdGFNb2RlbFtuXS5yb2JvdElkID0gdGhpcy5fY29kZXIuZnJvbShkYXRhW25dLnJvYm90SWQsICdiNjQnLCA0KVxuXHRcdFx0XHRcdGlmIChkYXRhTW9kZWxbbl0ucm9ib3RJZCAhPSBudWxsKSB7XG5cdFx0XHRcdFx0XHQvKiogZGljbyByb2JvdElkIC0+IHJvYm90TmFtZSAqICovXG5cdFx0XHRcdFx0XHRjb25zdCBkaWNvUm9ib3QgPSB7fVxuXHRcdFx0XHRcdFx0ZGF0YS5oZWFkZXIucm9ib3RzLmZvckVhY2goKGVsKSA9PiB7XG5cdFx0XHRcdFx0XHRcdGRpY29Sb2JvdFtlbC5pZF0gPSBlbC5uYW1lXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnJvYm90SWQgPSBkYXRhTW9kZWxbbl0ucm9ib3RJZC5tYXAoKGVsKSA9PiB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBkaWNvUm9ib3RbZWxdXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGRhdGFNb2RlbFtuXS5wbGFjZUlkID0gdGhpcy5fY29kZXIuZnJvbShkYXRhW25dLnBsYWNlSWQsICdiNjQnLCA0KVxuXHRcdFx0XHRcdGRhdGFNb2RlbFtuXS54ID0gbnVsbFxuXHRcdFx0XHRcdGRhdGFNb2RlbFtuXS55ID0gbnVsbFxuXG5cdFx0XHRcdFx0aWYgKGRhdGFbbl0uYXZnICE9IG51bGwpIHtcblx0XHRcdFx0XHRcdGRhdGFNb2RlbFtuXS5hdmcgPSB7XG5cdFx0XHRcdFx0XHRcdGQ6IHRoaXMuX2NvZGVyLmZyb20oZGF0YVtuXS5hdmcuZCwgJ2I2NCcsIDQpLFxuXHRcdFx0XHRcdFx0XHRpOiB0aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0uYXZnLmksICdiNjQnLCA0KVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoZGF0YVtuXS5taW4gIT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0ZGF0YU1vZGVsW25dLm1pbiA9IHtcblx0XHRcdFx0XHRcdFx0ZDogdGhpcy5fY29kZXIuZnJvbShkYXRhW25dLm1pbi5kLCAnYjY0JywgNCksXG5cdFx0XHRcdFx0XHRcdGk6IHRoaXMuX2NvZGVyLmZyb20oZGF0YVtuXS5taW4uaSwgJ2I2NCcsIDQpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChkYXRhW25dLm1heCAhPSBudWxsKSB7XG5cdFx0XHRcdFx0XHRkYXRhTW9kZWxbbl0ubWF4ID0ge1xuXHRcdFx0XHRcdFx0XHRkOiB0aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0ubWF4LmQsICdiNjQnLCA0KSxcblx0XHRcdFx0XHRcdFx0aTogdGhpcy5fY29kZXIuZnJvbShkYXRhW25dLm1heC5pLCAnYjY0JywgNClcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGRhdGFbbl0uc3RkZGV2ICE9IG51bGwpIHtcblx0XHRcdFx0XHRcdGRhdGFNb2RlbFtuXS5zdGRkZXYgPSB7XG5cdFx0XHRcdFx0XHRcdGQ6IHRoaXMuX2NvZGVyLmZyb20oZGF0YVtuXS5zdGRkZXYuZCwgJ2I2NCcsIDQpLFxuXHRcdFx0XHRcdFx0XHRpOiB0aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0uc3RkZGV2LmksICdiNjQnLCA0KVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoZGF0YVtuXS5zdGRkZXYgIT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnN0ZGRldiA9IHtcblx0XHRcdFx0XHRcdFx0ZDogdGhpcy5fY29kZXIuZnJvbShkYXRhW25dLnN0ZGRldi5kLCAnYjY0JywgNCksXG5cdFx0XHRcdFx0XHRcdGk6IHRoaXMuX2NvZGVyLmZyb20oZGF0YVtuXS5zdGRkZXYuaSwgJ2I2NCcsIDQpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChkYXRhW25dLnggIT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnggPSB0aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0ueCwgJ2I2NCcsIDQpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChkYXRhW25dLnkgIT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnkgPSB0aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0ueSwgJ2I2NCcsIDQpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdC8qKlxuXHRcdFx0XHRcdCAqIGN1cnJlbnQgcXVhbGl0eSA6IHsnYidhZCwgJ20nZWRpdW0sICdnJ29vZH1cblx0XHRcdFx0XHQgKiBldm9sdXRpb24gOiB7J3UncCwgJ2Qnb3duLCAncyd0YWJsZX1cblx0XHRcdFx0XHQgKiBldm9sdXRpb24gcXVhbGl0eSA6IHsnYidldHRlciwgJ3cnb3JzZSwgJ3MnYW1lfVxuXHRcdFx0XHRcdCAqL1xuXHRcdFx0XHRcdC8vIC8gVE9ET1xuXHRcdFx0XHRcdGRhdGFNb2RlbFtuXS50cmVuZCA9ICdtc3MnXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0LyoqIGxpc3Qgcm9ib3RzICogKi9cblx0XHR0aGlzLmRhdGFNb2RlbCA9IGRhdGFNb2RlbFxuXHRcdHJldHVybiBkYXRhTW9kZWxcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENvbm5lY3RvclYxXG4iLCIvKlxuICogQ29weXJpZ2h0IDogUGFydG5lcmluZyAzLjAgKDIwMDctMjAyMClcbiAqIEF1dGhvciA6IFBhcnRuZXJpbmcgUm9ib3RpY3MgPHNvZnR3YXJlQHBhcnRuZXJpbmcuZnI+XG4gKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgZGl5YS1zZGsuXG4gKlxuICogZGl5YS1zZGsgaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uLCBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogZGl5YS1zZGsgaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2VcbiAqIGFsb25nIHdpdGggZGl5YS1zZGsuICBJZiBub3QsIHNlZSA8aHR0cDovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogbWF5YS1jbGllbnRcbiAqIENvcHlyaWdodCAoYykgMjAxNCwgUGFydG5lcmluZyBSb2JvdGljcywgQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgbGlicmFyeSBpcyBmcmVlIHNvZnR3YXJlOyB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3JcbiAqIG1vZGlmeSBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWNcbiAqIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5IHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IHZlcnNpb25cbiAqXHQzLjAgb2YgdGhlIExpY2Vuc2UuIFRoaXMgbGlicmFyeSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZVxuICogdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCwgYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW5cbiAqIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVJcbiAqIFBVUlBPU0UuIFNlZSB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljXG4gKiBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBsaWJyYXJ5LlxuICovXG5cbid1c2Ugc3RyaWN0J1xuXG5jb25zdCBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudGVtaXR0ZXIzJylcblxuY29uc3QgaXNCcm93c2VyID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbmxldCBQcm9taXNlXG5pZiAoIWlzQnJvd3Nlcikge1xuXHRQcm9taXNlID0gcmVxdWlyZSgnYmx1ZWJpcmQnKVxufSBlbHNlIHtcblx0UHJvbWlzZSA9IHdpbmRvdy5Qcm9taXNlXG59XG5jb25zdCBTdG9wQ29uZGl0aW9uICAgPSByZXF1aXJlKCcuLi9zdG9wQ29uZGl0aW9uRXJyb3IuanMnKVxuY29uc3QgZ2V0VGltZVNhbXBsaW5nID0gcmVxdWlyZSgnLi4vdGltZWNvbnRyb2wuanMnKS5nZXRUaW1lU2FtcGxpbmdcblxuLy8gZGVmYXVsdCBhbmQgbWF4IG51bWJlciBvZiBzYW1wbGVzIGZvciB0aGUgcHJvdmlkZWQgdGltZSByYW5nZVxuY29uc3QgTUFYU0FNUExJTkcgPSAzMDBcblxuY2xhc3MgV2F0Y2hlclYxIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcblx0LyoqXG5cdCAqIEBwYXJhbSBlbWl0IGVtaXQgZGF0YSAobWFuZGF0b3J5KVxuXHQgKiBAcGFyYW0gY29uZmlnIHRvIGdldCBkYXRhIGZyb20gc2VydmVyXG5cdCAqL1xuXHRjb25zdHJ1Y3RvciAoc2VsZWN0b3IsIF9jb25maWcpIHtcblx0XHRzdXBlcigpXG5cblx0XHR0aGlzLnNlbGVjdG9yID0gc2VsZWN0b3Jcblx0XHR0aGlzLnN0YXRlID0gJ3J1bm5pbmcnXG5cblx0XHR0aGlzLnJlY29ubmVjdGlvblBlcmlvZCA9IDAgLy8gaW5pdGlhbCBwZXJpb2QgYmV0d2VlbiByZWNvbm5lY3Rpb25zXG5cdFx0dGhpcy5tYXhSZWNvbm5lY3Rpb25QZXJpb2QgPSAzMDAwMDAgLy8gbWF4IDUgbWluXG5cblx0XHQvKiogaW5pdGlhbGlzZSBvcHRpb25zIGZvciByZXF1ZXN0ICogKi9cblx0XHRjb25zdCBvcHRpb25zID0ge1xuXHRcdFx0Y3JpdGVyaWEgOiB7IHRpbWU6IHt9IH0sXG5cdFx0XHRvcGVyYXRvcnM6IFsnYXZnJywgJ21pbicsICdtYXgnLCAnc3RkZGV2J11cblx0XHR9XG5cdFx0aWYgKF9jb25maWcucm9ib3RzIGluc3RhbmNlb2YgQXJyYXkpIHtcblx0XHRcdG9wdGlvbnMuY3JpdGVyaWEucm9ib3RzID0gX2NvbmZpZy5yb2JvdHNcblx0XHR9XG5cdFx0aWYgKF9jb25maWcudGltZVJhbmdlICE9IG51bGwgJiYgdHlwZW9mIF9jb25maWcudGltZVJhbmdlID09PSAnc3RyaW5nJykge1xuXHRcdFx0b3B0aW9ucy5jcml0ZXJpYS50aW1lLnJhbmdlVW5pdCA9IF9jb25maWcudGltZVJhbmdlXG5cdFx0fSBlbHNlIHtcblx0XHRcdG9wdGlvbnMuY3JpdGVyaWEudGltZS5yYW5nZVVuaXQgPSAnaG91cnMnXG5cdFx0fVxuXHRcdGlmIChfY29uZmlnLmNhdGVnb3J5ICE9IG51bGwgJiYgdHlwZW9mIF9jb25maWcuY2F0ZWdvcnkgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRvcHRpb25zLmNhdGVnb3J5ID0gX2NvbmZpZy5jYXRlZ29yeVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRvcHRpb25zLmNhdGVnb3J5ID0gJ2llcSdcblx0XHR9XG5cdFx0aWYgKF9jb25maWcuc2FtcGxpbmcgIT0gbnVsbCAmJiB0eXBlb2YgX2NvbmZpZy5zYW1wbGluZyA9PT0gJ251bWJlcicpIHtcblx0XHRcdG9wdGlvbnMuc2FtcGxpbmcgPSBfY29uZmlnLnNhbXBsaW5nXG5cdFx0fSBlbHNlIHtcblx0XHRcdG9wdGlvbnMuc2FtcGxpbmcgPSBNQVhTQU1QTElOR1xuXHRcdH1cblx0XHRpZiAob3B0aW9ucy5zYW1wbGluZyA+IE1BWFNBTVBMSU5HKSB7XG5cdFx0XHRvcHRpb25zLnNhbXBsaW5nID0gMzAwXG5cdFx0fVxuXHRcdG9wdGlvbnMuY3JpdGVyaWEudGltZS5zYW1wbGluZyA9IGdldFRpbWVTYW1wbGluZyhvcHRpb25zLmNyaXRlcmlhLnRpbWUsIG9wdGlvbnMuc2FtcGxpbmcpXG5cblx0XHR0aGlzLm9wdGlvbnMgPSBvcHRpb25zXG5cblx0XHR0aGlzLndhdGNoKG9wdGlvbnMpIC8vIHN0YXJ0IHdhdGNoZXJcblx0fVxuXG5cdHN0YXRpYyBnZXREYXRhUmVxdWVzdE9iamVjdCAoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHBhdGggICAgIDogJy9mci9wYXJ0bmVyaW5nL0llcScsXG5cdFx0XHRpbnRlcmZhY2U6ICdmci5wYXJ0bmVyaW5nLkllcSdcblx0XHR9XG5cdH1cblxuXHRzdGF0aWMgZ2V0RmlyZURhdGFPYmplY3QgKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRwYXRoICAgICA6ICcvZnIvcGFydG5lcmluZy9JZXEnLFxuXHRcdFx0aW50ZXJmYWNlOiAnZnIucGFydG5lcmluZy5JZXEnXG5cdFx0fVxuXHR9XG5cblx0d2F0Y2ggKG9wdGlvbnMpIHtcblx0XHRuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHQvLyBSZXF1ZXN0IGhpc3RvcnkgZGF0YSBiZWZvcmUgc3Vic2NyaWJpbmdcblx0XHRcdHRoaXMuc2VsZWN0b3IucmVxdWVzdCh7XG5cdFx0XHRcdHNlcnZpY2U6ICdpZXEnLFxuXHRcdFx0XHRmdW5jICAgOiAnRGF0YVJlcXVlc3QnLFxuXHRcdFx0XHRkYXRhICAgOiB7IGRhdGE6IEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpIH0sXG5cdFx0XHRcdG9iaiAgICA6IHRoaXMuZ2V0RGF0YVJlcXVlc3RPYmplY3QoKVxuXHRcdFx0fSwgKGRuSWQsIGVyciwgZGF0YVN0cmluZykgPT4ge1xuXHRcdFx0XHRpZiAoZXJyICE9IG51bGwpIHtcblx0XHRcdFx0XHRyZWplY3QoZXJyKVxuXHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICh0aGlzLnN0YXRlID09PSAnc3RvcHBlZCcpIHtcblx0XHRcdFx0XHRyZWplY3QobmV3IFN0b3BDb25kaXRpb24oKSlcblx0XHRcdFx0fVxuXHRcdFx0XHRjb25zdCBkYXRhID0gSlNPTi5wYXJzZShkYXRhU3RyaW5nKVxuXHRcdFx0XHR0aGlzLmVtaXQoJ2RhdGEnLCBkYXRhKVxuXHRcdFx0XHRyZXNvbHZlKClcblx0XHRcdH0pXG5cdFx0fSlcblx0XHQudGhlbigoKSA9PiB7XG5cdFx0XHQvLyBzdWJzY3JpYmUgdG8gc2lnbmFsXG5cdFx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0XHR0aGlzLnN1YnNjcmlwdGlvbiA9IHRoaXMuc2VsZWN0b3Iuc3Vic2NyaWJlKHtcblx0XHRcdFx0XHRzZXJ2aWNlOiAnaWVxJyxcblx0XHRcdFx0XHRmdW5jICAgOiBvcHRpb25zLmNyaXRlcmlhLnRpbWUuc2FtcGxpbmcsXG5cdFx0XHRcdFx0ZGF0YSAgIDogeyBkYXRhOiBvcHRpb25zIH0sXG5cdFx0XHRcdFx0b2JqICAgIDogdGhpcy5nZXRGaXJlRGF0YU9iamVjdCgpXG5cdFx0XHRcdH0sIChkbmQsIGVyciwgX2RhdGEpID0+IHtcblx0XHRcdFx0XHRsZXQgZGF0YSA9IF9kYXRhXG5cdFx0XHRcdFx0aWYgKGVyciAhPSBudWxsKSB7XG5cdFx0XHRcdFx0XHRyZWplY3QoZXJyKVxuXHRcdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGRhdGEgPSBKU09OLnBhcnNlKGRhdGEpXG5cdFx0XHRcdFx0dGhpcy5lbWl0KCdkYXRhJywgZGF0YSlcblxuXHRcdFx0XHRcdHRoaXMucmVjb25uZWN0aW9uUGVyaW9kID0gMCAvLyByZXNldCBwZXJpb2Qgb24gc3Vic2NyaXB0aW9uIHJlcXVlc3RzXG5cdFx0XHRcdFx0cmVzb2x2ZSgpXG5cdFx0XHRcdH0pXG5cdFx0XHR9KVxuXHRcdH0pXG5cdFx0LmNhdGNoKChlcnIpID0+IHtcblx0XHRcdGlmIChlcnIubmFtZSA9PT0gJ1N0b3BDb25kaXRpb24nKSB7IC8vIHdhdGNoZXIgc3RvcHBlZCA6IGRvIG5vdGhpbmdcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHQvLyB0cnkgdG8gcmVzdGFydCBsYXRlclxuXHRcdFx0dGhpcy5fY2xvc2VTdWJzY3JpcHRpb24oKSAvLyBzaG91bGQgbm90IGJlIG5lY2Vzc2FyeVxuXHRcdFx0dGhpcy5yZWNvbm5lY3Rpb25QZXJpb2QgPSB0aGlzLnJlY29ubmVjdGlvblBlcmlvZCArIDEwMDAgLy8gaW5jcmVhc2UgZGVsYXkgYnkgMSBzZWNcblx0XHRcdGlmICh0aGlzLnJlY29ubmVjdGlvblBlcmlvZCA+IHRoaXMubWF4UmVjb25uZWN0aW9uUGVyaW9kKSB7XG5cdFx0XHRcdHRoaXMucmVjb25uZWN0aW9uUGVyaW9kID0gdGhpcy5tYXhSZWNvbm5lY3Rpb25QZXJpb2QgLy8gbWF4IDVtaW5cblx0XHRcdH1cblx0XHRcdHRoaXMud2F0Y2hUZW50YXRpdmUgPSBzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdFx0dGhpcy53YXRjaChvcHRpb25zKVxuXHRcdFx0fSwgdGhpcy5yZWNvbm5lY3Rpb25QZXJpb2QpIC8vIHRyeSBhZ2FpbiBsYXRlclxuXHRcdH0pXG5cdH1cblxuXHQvLyBDbG9zZSBzdWJzY3JpcHRpb24gaWYgYW55XG5cdF9jbG9zZVN1YnNjcmlwdGlvbiAoKSB7XG5cdFx0aWYgKHRoaXMuc3Vic2NyaXB0aW9uICE9IG51bGwpIHtcblx0XHRcdHRoaXMuc3Vic2NyaXB0aW9uLmNsb3NlKClcblx0XHRcdHRoaXMuc3Vic2NyaXB0aW9uID0gbnVsbFxuXHRcdH1cblx0fVxuXG5cdHN0b3AgKCkge1xuXHRcdHRoaXMuc3RhdGUgPSAnc3RvcHBlZCdcblx0XHRpZiAodGhpcy53YXRjaFRlbnRhdGl2ZSAhPSBudWxsKSB7XG5cdFx0XHRjbGVhclRpbWVvdXQodGhpcy53YXRjaFRlbnRhdGl2ZSlcblx0XHR9XG5cdFx0dGhpcy5fY2xvc2VTdWJzY3JpcHRpb24oKVxuXHRcdHRoaXMuZW1pdCgnc3RvcCcpXG5cdFx0dGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoKVxuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gV2F0Y2hlclYxXG4iLCIvKlxuICogQ29weXJpZ2h0IDogUGFydG5lcmluZyAzLjAgKDIwMDctMjAyMClcbiAqIEF1dGhvciA6IFBhcnRuZXJpbmcgUm9ib3RpY3MgPHNvZnR3YXJlQHBhcnRuZXJpbmcuZnI+XG4gKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgZGl5YS1zZGsuXG4gKlxuICogZGl5YS1zZGsgaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uLCBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogZGl5YS1zZGsgaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2VcbiAqIGFsb25nIHdpdGggZGl5YS1zZGsuICBJZiBub3QsIHNlZSA8aHR0cDovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogbWF5YS1jbGllbnRcbiAqIENvcHlyaWdodCAoYykgMjAxNCwgUGFydG5lcmluZyBSb2JvdGljcywgQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgbGlicmFyeSBpcyBmcmVlIHNvZnR3YXJlOyB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3JcbiAqIG1vZGlmeSBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWNcbiAqIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5IHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IHZlcnNpb25cbiAqXHQzLjAgb2YgdGhlIExpY2Vuc2UuIFRoaXMgbGlicmFyeSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZVxuICogdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCwgYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW5cbiAqIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVJcbiAqIFBVUlBPU0UuIFNlZSB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljXG4gKiBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBsaWJyYXJ5LlxuICovXG5cbid1c2Ugc3RyaWN0J1xuXG5jb25zdCBXYXRjaGVyVjIgICA9IHJlcXVpcmUoJy4uL3YyL3dhdGNoZXIuanMnKVxuY29uc3QgQ29ubmVjdG9yVjEgPSByZXF1aXJlKCcuLi92MS9jb25uZWN0b3IuanMnKVxuXG5jbGFzcyBDb25uZWN0b3JWMiBleHRlbmRzIENvbm5lY3RvclYxIHtcblx0Y29uc3RydWN0b3IgKHNlbGVjdG9yKSB7XG5cdFx0c3VwZXIoc2VsZWN0b3IpXG5cdFx0dGhpcy5zZWxlY3RvciA9IHNlbGVjdG9yXG5cdFx0cmV0dXJuIHRoaXNcblx0fVxuXG5cdGdldFVwZGF0ZURhdGFPYmplY3QgKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRwYXRoICAgICA6IGAvZnIvcGFydG5lcmluZy9JZXEvVXBkYXRlLyR7V2F0Y2hlclYyLmZvcm1hdFBlZXJOYW1lKHRoaXMuc2VsZWN0b3IuX2Nvbm5lY3Rpb24uc2VsZigpKX1gLFxuXHRcdFx0aW50ZXJmYWNlOiAnZnIucGFydG5lcmluZy5JZXEuVXBkYXRlJ1xuXHRcdH1cblx0fVxuXG5cdGdldENzdkRhdGFPYmplY3QgKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRwYXRoICAgICA6IGAvZnIvcGFydG5lcmluZy9JZXEvRXhwb3J0LyR7V2F0Y2hlclYyLmZvcm1hdFBlZXJOYW1lKHRoaXMuc2VsZWN0b3IuX2Nvbm5lY3Rpb24uc2VsZigpKX1gLFxuXHRcdFx0aW50ZXJmYWNlOiAnZnIucGFydG5lcmluZy5JZXEuRXhwb3J0J1xuXHRcdH1cblx0fVxuXG5cdGNyZWF0ZVdhdGNoZXIgKGNvbmZpZykge1xuXHRcdHJldHVybiBuZXcgV2F0Y2hlclYyKHRoaXMuc2VsZWN0b3IsIGNvbmZpZylcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENvbm5lY3RvclYyXG4iLCIvKlxuICogQ29weXJpZ2h0IDogUGFydG5lcmluZyAzLjAgKDIwMDctMjAyMClcbiAqIEF1dGhvciA6IFBhcnRuZXJpbmcgUm9ib3RpY3MgPHNvZnR3YXJlQHBhcnRuZXJpbmcuZnI+XG4gKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgZGl5YS1zZGsuXG4gKlxuICogZGl5YS1zZGsgaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uLCBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogZGl5YS1zZGsgaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2VcbiAqIGFsb25nIHdpdGggZGl5YS1zZGsuICBJZiBub3QsIHNlZSA8aHR0cDovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogbWF5YS1jbGllbnRcbiAqIENvcHlyaWdodCAoYykgMjAxNCwgUGFydG5lcmluZyBSb2JvdGljcywgQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgbGlicmFyeSBpcyBmcmVlIHNvZnR3YXJlOyB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3JcbiAqIG1vZGlmeSBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWNcbiAqIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5IHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IHZlcnNpb25cbiAqXHQzLjAgb2YgdGhlIExpY2Vuc2UuIFRoaXMgbGlicmFyeSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZVxuICogdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCwgYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW5cbiAqIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVJcbiAqIFBVUlBPU0UuIFNlZSB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljXG4gKiBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBsaWJyYXJ5LlxuICovXG5cbid1c2Ugc3RyaWN0J1xuXG5jb25zdCBXYXRjaGVyVjEgPSByZXF1aXJlKCcuLi92MS93YXRjaGVyLmpzJylcblxuY2xhc3MgV2F0Y2hlclYyIGV4dGVuZHMgV2F0Y2hlclYxIHtcblx0LyoqXG5cdCAqIEBwYXJhbSBlbWl0IGVtaXQgZGF0YSAobWFuZGF0b3J5KVxuXHQgKiBAcGFyYW0gY29uZmlnIHRvIGdldCBkYXRhIGZyb20gc2VydmVyXG5cdCAqL1xuXHRjb25zdHJ1Y3RvciAoc2VsZWN0b3IsIF9jb25maWcpIHtcblx0XHRzdXBlcihzZWxlY3RvciwgX2NvbmZpZylcblx0XHR0aGlzLnNlbGVjdG9yID0gc2VsZWN0b3Jcblx0fVxuXG5cdGdldERhdGFSZXF1ZXN0T2JqZWN0ICgpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0cGF0aCAgICAgOiBgL2ZyL3BhcnRuZXJpbmcvSWVxL1JlcXVlc3QvJHtXYXRjaGVyVjIuZm9ybWF0UGVlck5hbWUodGhpcy5zZWxlY3Rvci5fY29ubmVjdGlvbi5zZWxmKCkpfWAsXG5cdFx0XHRpbnRlcmZhY2U6ICdmci5wYXJ0bmVyaW5nLkllcS5SZXF1ZXN0J1xuXHRcdH1cblx0fVxuXG5cdGdldEZpcmVEYXRhT2JqZWN0ICgpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0cGF0aCAgICAgOiBgL2ZyL3BhcnRuZXJpbmcvSWVxL0ZpcmUvJHtXYXRjaGVyVjIuZm9ybWF0UGVlck5hbWUodGhpcy5zZWxlY3Rvci5fY29ubmVjdGlvbi5zZWxmKCkpfWAsXG5cdFx0XHRpbnRlcmZhY2U6ICdmci5wYXJ0bmVyaW5nLkllcS5GaXJlJ1xuXHRcdH1cblx0fVxuXG5cdHN0YXRpYyBmb3JtYXRQZWVyTmFtZSAoaW5wdXQsIGRlbGltaXRlciA9ICctJykge1xuXHRcdHJldHVybiBpbnB1dC5zcGxpdChkZWxpbWl0ZXIpLm1hcCgocykgPT4ge1xuXHRcdFx0cmV0dXJuIHMuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzLnNsaWNlKDEpXG5cdFx0fSkuam9pbignJylcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFdhdGNoZXJWMlxuIl19
