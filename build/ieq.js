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
	var DiyaSelector = d1.DiyaSelector;

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

},{"./v1/connector.js":5,"./v2/connector.js":7}],3:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZXZlbnRlbWl0dGVyMy9pbmRleC5qcyIsInNyYy9pZXEuanMiLCJzcmMvc3RvcENvbmRpdGlvbkVycm9yLmpzIiwic3JjL3RpbWVjb250cm9sLmpzIiwic3JjL3YxL2Nvbm5lY3Rvci5qcyIsInNyYy92MS93YXRjaGVyLmpzIiwic3JjL3YyL2Nvbm5lY3Rvci5qcyIsInNyYy92Mi93YXRjaGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdlRBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBbUJBLElBQU0sY0FBYyxRQUFRLG1CQUFSLENBQXBCO0FBQ0EsSUFBTSxjQUFjLFFBQVEsbUJBQVIsQ0FBcEI7O0FBRUMsYUFBWTtBQUNaLEtBQU0sZUFBZSxHQUFHLFlBQXhCOztBQUVBO0FBQ0EsY0FBYSxTQUFiLENBQXVCLEdBQXZCLEdBQTZCLFlBQVk7QUFBQTs7QUFDeEMsU0FBTyxJQUFJLE9BQUosQ0FBWSxVQUFDLE9BQUQsRUFBVSxNQUFWLEVBQXFCO0FBQ3ZDLFNBQUssT0FBTCxDQUFhO0FBQ1osYUFBUyxLQURHO0FBRVosVUFBUztBQUZHLElBQWIsRUFHRyxVQUFDLE1BQUQsRUFBUyxHQUFULEVBQWMsSUFBZCxFQUF1QjtBQUN6QixRQUFJLE9BQU8sSUFBWCxFQUFpQjtBQUNoQixhQUFRLElBQVI7QUFDQSxLQUZELE1BRU87QUFDTixZQUFPLEdBQVA7QUFDQTtBQUNELElBVEQ7QUFVQSxHQVhNLEVBWU4sSUFaTSxDQVlELFVBQUMsSUFBRCxFQUFVO0FBQ2YsT0FBSSxTQUFTLENBQWIsRUFBZ0I7QUFDZixXQUFPLElBQUksV0FBSixDQUFnQixLQUFoQixDQUFQO0FBQ0E7QUFDRCxTQUFNLElBQUksS0FBSixDQUFVLDhCQUFWLENBQU47QUFDQSxHQWpCTSxFQWtCTixLQWxCTSxDQWtCQSxVQUFDLEdBQUQsRUFBUztBQUNmLE9BQUksSUFBSSxRQUFKLENBQWEsd0RBQWIsQ0FBSixFQUE0RTtBQUMzRSxXQUFPLElBQUksV0FBSixDQUFnQixLQUFoQixDQUFQO0FBQ0E7QUFDRCxTQUFNLElBQUksS0FBSixDQUFVLEdBQVYsQ0FBTjtBQUNBLEdBdkJNLENBQVA7QUF3QkEsRUF6QkQ7QUEwQkEsQ0E5QkEsR0FBRDs7Ozs7Ozs7Ozs7SUN0Qk0sYTs7O0FBQ0wsd0JBQWEsR0FBYixFQUFrQjtBQUFBOztBQUFBLDRIQUNYLEdBRFc7O0FBRWpCLFFBQUssSUFBTCxHQUFZLGVBQVo7QUFGaUI7QUFHakI7OztFQUowQixLOztBQU01QixPQUFPLE9BQVAsR0FBaUIsYUFBakI7OztBQ05BOztBQUVBOzs7Ozs7QUFLQSxJQUFNLGFBQWEsU0FBYixVQUFhLENBQVUsSUFBVixFQUFnQjtBQUNsQyxRQUFPLElBQUksSUFBSixDQUFTLElBQVQsRUFBZSxPQUFmLEVBQVA7QUFDQSxDQUZEOztBQUlBOzs7Ozs7O0FBT0EsSUFBTSxrQkFBa0IsU0FBbEIsZUFBa0IsQ0FBVSxJQUFWLEVBQWdCLFdBQWhCLEVBQTZCO0FBQ3BELEtBQUksYUFBYSxXQUFqQjtBQUNBO0FBQ0EsS0FBSSxRQUFRLElBQVosRUFBa0I7QUFDakIsU0FBTyxTQUFQO0FBQ0E7QUFDRDtBQUNBLEtBQUksY0FBYyxJQUFsQixFQUF3QjtBQUN2QixlQUFhLEdBQWI7QUFDQTs7QUFFRDtBQUNBLEtBQUksUUFBUSxLQUFLLEtBQWpCO0FBQ0EsS0FBSSxTQUFTLElBQWIsRUFBbUI7QUFDbEIsVUFBUSxDQUFSO0FBQ0E7O0FBRUQ7QUFDQSxLQUFNLGdCQUFnQjtBQUNyQixVQUFRLENBRGE7QUFFckIsVUFBUSxFQUZhO0FBR3JCLFFBQVEsSUFIYTtBQUlyQixPQUFRLEtBQUssSUFKUTtBQUtyQixRQUFRLElBQUksRUFBSixHQUFTLElBTEk7QUFNckIsU0FBUSxLQUFLLEVBQUwsR0FBVSxJQU5HO0FBT3JCLFFBQVEsTUFBTSxFQUFOLEdBQVc7O0FBR3BCO0FBVnNCLEVBQXRCLENBV0EsSUFBTSxxQkFBcUIsQ0FDMUIsRUFBRSxRQUFRLFVBQVYsRUFBc0IsVUFBVSxRQUFoQyxFQUQwQixFQUUxQixFQUFFLFFBQVEsYUFBYSxFQUF2QixFQUEyQixVQUFVLFFBQXJDLEVBRjBCLEVBRzFCLEVBQUUsUUFBUSxhQUFhLElBQXZCLEVBQTZCLFVBQVUsTUFBdkMsRUFIMEIsRUFJMUIsRUFBRSxRQUFRLGFBQWEsRUFBYixHQUFrQixJQUE1QixFQUFrQyxVQUFVLEtBQTVDLEVBSjBCLEVBSzFCLEVBQUUsUUFBUSxhQUFhLENBQWIsR0FBaUIsRUFBakIsR0FBc0IsSUFBaEMsRUFBc0MsVUFBVSxNQUFoRCxFQUwwQixFQU0xQixFQUFFLFFBQVEsYUFBYSxFQUFiLEdBQWtCLEVBQWxCLEdBQXVCLElBQWpDLEVBQXVDLFVBQVUsT0FBakQsRUFOMEIsQ0FBM0I7O0FBU0EsS0FBSSxXQUFXLEtBQUssU0FBTCxDQUFlLFdBQWYsRUFBZjtBQUNBLEtBQU0sT0FBTyxTQUFTLE1BQVQsR0FBa0IsQ0FBL0I7QUFDQTtBQUNBLEtBQUksU0FBUyxJQUFULE1BQW1CLEdBQXZCLEVBQTRCO0FBQzNCLGFBQVcsU0FBUyxLQUFULENBQWUsQ0FBZixFQUFrQixJQUFsQixDQUFYO0FBQ0E7O0FBRUQsS0FBTSxZQUFZLFFBQVEsY0FBYyxRQUFkLENBQTFCOztBQUVBLEtBQUksZUFBZSxNQUFuQixDQS9Db0QsQ0ErQzFCO0FBQzFCO0FBQ0Esb0JBQW1CLElBQW5CLENBQXdCLFVBQUMsaUJBQUQsRUFBdUI7QUFDOUM7QUFDQSxpQkFBZSxrQkFBa0IsUUFBakM7QUFDQSxTQUFPLFlBQVksa0JBQWtCLE1BQXJDO0FBQ0EsRUFKRDs7QUFNQSxRQUFPLFlBQVA7QUFDQSxDQXhERDs7QUEwREE7QUFDQSxPQUFPLE9BQVAsR0FBaUI7QUFDaEIsdUJBRGdCO0FBRWhCO0FBRmdCLENBQWpCOzs7QUM3RUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBb0JBOzs7Ozs7Ozs7Ozs7O0FBYUE7Ozs7Ozs7O0FBRUEsSUFBTSxZQUFhLFFBQVEsa0JBQVIsQ0FBbkI7QUFDQSxJQUFNLGFBQWEsUUFBUSxtQkFBUixFQUE2QixVQUFoRDs7SUFFTSxXO0FBQ0wsc0JBQWEsUUFBYixFQUF1QjtBQUFBOztBQUN0QixPQUFLLFFBQUwsR0FBZ0IsUUFBaEI7QUFDQSxPQUFLLFNBQUwsR0FBaUIsRUFBakI7QUFDQSxPQUFLLE1BQUwsR0FBYyxTQUFTLE1BQVQsRUFBZDtBQUNBLE9BQUssUUFBTCxHQUFnQixFQUFoQjs7QUFFQTs7Ozs7Ozs7Ozs7OztBQWNBLE9BQUssVUFBTCxHQUFrQjtBQUNqQixhQUFVO0FBQ1QsVUFBTTtBQUNMLFlBQU8sSUFERjtBQUVMLFVBQU8sSUFGRjtBQUdMLFlBQU8sSUFIRixDQUdPO0FBSFAsS0FERztBQU1ULFlBQVEsSUFOQztBQU9ULFlBQVE7QUFQQyxJQURPO0FBVWpCLGFBQVUsTUFWTztBQVdqQixZQUFVLElBWE87QUFZakIsYUFBVSxJQVpPLENBWUY7QUFaRSxHQUFsQjs7QUFlQSxTQUFPLElBQVA7QUFDQTs7Ozt3Q0FFc0I7QUFDdEIsVUFBTztBQUNOLFVBQVcsb0JBREw7QUFFTixlQUFXO0FBRkwsSUFBUDtBQUlBOzs7cUNBRW1CO0FBQ25CLFVBQU87QUFDTixVQUFXLG9CQURMO0FBRU4sZUFBVztBQUZMLElBQVA7QUFJQTs7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7OztpQ0FnQmdCO0FBQ2YsVUFBTyxLQUFLLFNBQVo7QUFDQTs7O2lDQUVlO0FBQ2YsVUFBTyxLQUFLLFNBQUwsQ0FBZSxLQUF0QjtBQUNBOztBQUVEOzs7Ozs7Ozs7OzZCQU9ZLGEsRUFBZTtBQUMxQixPQUFJLGlCQUFpQixJQUFyQixFQUEyQjtBQUMxQixTQUFLLFVBQUwsR0FBa0IsYUFBbEI7QUFDQSxXQUFPLElBQVA7QUFDQTtBQUNELFVBQU8sS0FBSyxVQUFaO0FBQ0E7O0FBRUQ7Ozs7Ozs7Ozs7Ozs7OytCQVdjLFcsRUFBYTtBQUMxQixPQUFJLGVBQWUsSUFBbkIsRUFBeUI7QUFDeEIsU0FBSyxVQUFMLENBQWdCLFFBQWhCLEdBQTJCLFdBQTNCO0FBQ0EsV0FBTyxJQUFQO0FBQ0E7QUFDRCxVQUFPLEtBQUssVUFBTCxDQUFnQixRQUF2QjtBQUNBOztBQUVEOzs7Ozs7Ozs7OzsrQkFRYyxVLEVBQVk7QUFDekIsT0FBSSxjQUFjLElBQWxCLEVBQXdCO0FBQ3ZCLFNBQUssVUFBTCxDQUFnQixRQUFoQixHQUEyQixVQUEzQjtBQUNBLFdBQU8sSUFBUDtBQUNBO0FBQ0QsVUFBTyxLQUFLLFVBQUwsQ0FBZ0IsUUFBdkI7QUFDQTs7QUFFRDs7Ozs7Ozs7Ozs7OzJCQVNVLFksRUFBYyxVLEVBQVksUSxFQUFVO0FBQzdDLE9BQUksZ0JBQWdCLElBQWhCLElBQXdCLGNBQWMsSUFBdEMsSUFBOEMsWUFBWSxJQUE5RCxFQUFvRTtBQUNuRSxTQUFLLFVBQUwsQ0FBZ0IsUUFBaEIsQ0FBeUIsSUFBekIsQ0FBOEIsS0FBOUIsR0FBc0MsV0FBVyxZQUFYLENBQXRDO0FBQ0EsU0FBSyxVQUFMLENBQWdCLFFBQWhCLENBQXlCLElBQXpCLENBQThCLEdBQTlCLEdBQW9DLFdBQVcsVUFBWCxDQUFwQztBQUNBLFNBQUssVUFBTCxDQUFnQixRQUFoQixDQUF5QixJQUF6QixDQUE4QixLQUE5QixHQUFzQyxRQUF0QztBQUNBLFdBQU8sSUFBUDtBQUNBO0FBQ0QsVUFBTztBQUNOLFdBQU8sSUFBSSxJQUFKLENBQVMsS0FBSyxVQUFMLENBQWdCLFFBQWhCLENBQXlCLElBQXpCLENBQThCLEtBQXZDLENBREQ7QUFFTixTQUFPLElBQUksSUFBSixDQUFTLEtBQUssVUFBTCxDQUFnQixRQUFoQixDQUF5QixJQUF6QixDQUE4QixHQUF2QyxDQUZEO0FBR04sV0FBTyxJQUFJLElBQUosQ0FBUyxLQUFLLFVBQUwsQ0FBZ0IsUUFBaEIsQ0FBeUIsSUFBekIsQ0FBOEIsS0FBdkM7QUFIRCxJQUFQO0FBS0E7O0FBRUQ7Ozs7Ozs7Ozs7K0JBT2MsUSxFQUFVO0FBQ3ZCLE9BQUksWUFBWSxJQUFoQixFQUFzQjtBQUNyQixTQUFLLFVBQUwsQ0FBZ0IsUUFBaEIsQ0FBeUIsTUFBekIsR0FBa0MsUUFBbEM7QUFDQSxXQUFPLElBQVA7QUFDQTtBQUNELFVBQU8sS0FBSyxVQUFMLENBQWdCLFFBQWhCLENBQXlCLE1BQWhDO0FBQ0E7O0FBRUQ7Ozs7Ozs7Ozs7K0JBT2MsUSxFQUFVO0FBQ3ZCLE9BQUksWUFBWSxJQUFoQixFQUFzQjtBQUNyQixTQUFLLFVBQUwsQ0FBZ0IsUUFBaEIsQ0FBeUIsT0FBekIsR0FBbUMsUUFBbkM7QUFDQSxXQUFPLElBQVA7QUFDQTtBQUNELFVBQU8sS0FBSyxVQUFMLENBQWdCLFFBQWhCLENBQXlCLE1BQWhDO0FBQ0E7O0FBRUQ7Ozs7Ozs7Z0NBSWUsVyxFQUFhO0FBQzNCLE9BQU0sT0FBTyxFQUFiO0FBQ0EsUUFBSyxJQUFNLENBQVgsSUFBZ0IsV0FBaEIsRUFBNkI7QUFDNUIsU0FBSyxJQUFMLENBQVUsS0FBSyxTQUFMLENBQWUsWUFBWSxDQUFaLENBQWYsQ0FBVjtBQUNBO0FBQ0QsVUFBTyxJQUFQO0FBQ0E7O0FBRUQ7Ozs7Ozs7Ozs2QkFNWSxRLEVBQVUsVSxFQUFZO0FBQ2pDLFFBQUssV0FBTCxDQUFpQixRQUFqQixFQUEyQixVQUEzQixFQUF1QyxhQUF2QztBQUNBOztBQUVEOzs7Ozs7Ozs7OzhCQU9hLFEsRUFBVSxVLEVBQVksUSxFQUFVO0FBQUE7O0FBQzVDLE9BQUksVUFBSixFQUFnQjtBQUNmLFNBQUssVUFBTCxDQUFnQixVQUFoQjtBQUNBO0FBQ0QsUUFBSyxRQUFMLENBQWMsT0FBZCxDQUFzQjtBQUNyQixhQUFTLEtBRFk7QUFFckIsVUFBUyxRQUZZO0FBR3JCLFVBQVMsRUFBRSxNQUFNLEtBQUssU0FBTCxDQUFlLEtBQUssVUFBcEIsQ0FBUixFQUhZLEVBR2dDO0FBQ3JELFNBQVMsS0FBSyxtQkFBTDtBQUpZLElBQXRCLEVBS0csVUFBQyxJQUFELEVBQU8sR0FBUCxFQUFZLEtBQVosRUFBc0I7QUFDeEIsUUFBTSxPQUFPLEtBQUssS0FBTCxDQUFXLEtBQVgsQ0FBYjtBQUNBLFFBQUksT0FBTyxJQUFYLEVBQWlCO0FBQ2hCLFNBQUksUUFBTyxHQUFQLHlDQUFPLEdBQVAsT0FBZSxRQUFmLElBQTJCLE9BQU8sSUFBSSxJQUFYLEtBQW9CLFFBQW5ELEVBQTZEO0FBQzVELGVBQVMsSUFBVCxFQUFlLElBQUksSUFBbkI7QUFDQTtBQUNEO0FBQ0E7QUFDRCxhQUFTLE1BQUsscUJBQUwsQ0FBMkIsSUFBM0IsQ0FBVCxFQVJ3QixDQVFtQjtBQUMzQyxJQWREO0FBZUE7Ozt3Q0FFc0I7QUFDdEIsVUFBTyxLQUFLLFdBQVo7QUFDQTs7O3VDQUVxQjtBQUNyQixVQUFPLEtBQUssVUFBWjtBQUNBOzs7dUNBRXFCO0FBQ3JCLFVBQU8sS0FBSyxVQUFaO0FBQ0E7O0FBRUQ7Ozs7Ozs7Ozt3QkFNTyxNLEVBQVEsUSxFQUFVO0FBQUE7O0FBQ3hCO0FBQ0EsT0FBSSxZQUFZLElBQVosSUFBb0IsT0FBTyxRQUFQLEtBQW9CLFVBQTVDLEVBQXdEO0FBQ3ZELFdBQU8sSUFBUDtBQUNBOztBQUVELE9BQU0sVUFBVSxLQUFLLGFBQUwsQ0FBbUIsTUFBbkIsQ0FBaEI7O0FBRUE7QUFDQSxRQUFLLFFBQUwsQ0FBYyxJQUFkLENBQW1CLE9BQW5COztBQUVBLFdBQVEsRUFBUixDQUFXLE1BQVgsRUFBbUIsVUFBQyxJQUFELEVBQVU7QUFDNUIsYUFBUyxPQUFLLHFCQUFMLENBQTJCLElBQTNCLENBQVQ7QUFDQSxJQUZEO0FBR0EsV0FBUSxFQUFSLENBQVcsTUFBWCxFQUFtQixLQUFLLGNBQXhCOztBQUVBLFVBQU8sT0FBUDtBQUNBOzs7Z0NBRWMsTSxFQUFRO0FBQ3RCLFVBQU8sSUFBSSxTQUFKLENBQWMsS0FBSyxRQUFuQixFQUE2QixNQUE3QixDQUFQO0FBQ0E7O0FBRUQ7Ozs7Ozs7aUNBSWdCLE8sRUFBUztBQUN4QjtBQUNBLFFBQUssUUFBTCxDQUFjLElBQWQsQ0FBbUIsVUFBQyxFQUFELEVBQUssRUFBTCxFQUFTLFFBQVQsRUFBc0I7QUFDeEMsUUFBSSxZQUFZLEVBQWhCLEVBQW9CO0FBQ25CLGNBQVMsTUFBVCxDQUFnQixFQUFoQixFQUFvQixDQUFwQixFQURtQixDQUNJO0FBQ3ZCLFlBQU8sSUFBUDtBQUNBO0FBQ0QsV0FBTyxLQUFQO0FBQ0EsSUFORDtBQU9BOztBQUVEOzs7Ozs7dUNBR3NCO0FBQ3JCLFdBQVEsSUFBUixDQUFhLDhDQUFiO0FBQ0EsUUFBSyxZQUFMO0FBQ0E7OztpQ0FFZTtBQUFBOztBQUNmLFFBQUssUUFBTCxDQUFjLE9BQWQsQ0FBc0IsVUFBQyxPQUFELEVBQWE7QUFDbEM7QUFDQSxZQUFRLGNBQVIsQ0FBdUIsTUFBdkIsRUFBK0IsT0FBSyxjQUFwQztBQUNBLFlBQVEsSUFBUjtBQUNBLElBSkQ7QUFLQSxRQUFLLFFBQUwsR0FBZ0IsRUFBaEI7QUFDQTs7QUFFRDs7Ozs7Ozs7Ozs7Ozs2QkFVWSxVLEVBQVksUSxFQUFVO0FBQ2pDLE9BQU0sWUFBWSxVQUFsQjtBQUNBLE9BQUksYUFBYSxPQUFPLFVBQVUsTUFBakIsS0FBNEIsUUFBN0MsRUFBdUQ7QUFDdEQsY0FBVSxNQUFWLEdBQW1CLFNBQW5CO0FBQ0E7QUFDRCxPQUFJLGFBQWEsT0FBTyxVQUFVLElBQWpCLEtBQTBCLFFBQTNDLEVBQXFEO0FBQ3BELGNBQVUsSUFBVixHQUFpQixTQUFqQjtBQUNBOztBQUVELE9BQU0sYUFBYSxLQUFLLFNBQUwsQ0FBZTtBQUNqQyxjQUFVO0FBQ1QsV0FBUSxFQUFFLE9BQU8sV0FBVyxVQUFVLFNBQXJCLENBQVQsRUFBMEMsS0FBSyxXQUFXLFVBQVUsT0FBckIsQ0FBL0MsRUFBOEUsVUFBVSxVQUFVLFVBQWxHLEVBREM7QUFFVCxhQUFRLEVBRkM7QUFHVCxhQUFRO0FBSEMsS0FEdUI7QUFNakMsYUFBVSxVQUFVLFdBTmE7QUFPakMsY0FBVSxVQUFVLE1BUGE7QUFRakMsVUFBVSxVQUFVO0FBUmEsSUFBZixDQUFuQjs7QUFXQSxRQUFLLFFBQUwsQ0FBYyxPQUFkLENBQXNCO0FBQ3JCLGFBQVMsS0FEWTtBQUVyQixVQUFTLGdCQUZZO0FBR3JCLFVBQVMsRUFBRSxNQUFNLFVBQVIsRUFIWTtBQUlyQjtBQUNBLFNBQVMsS0FBSyxnQkFBTDtBQUxZLElBQXRCLEVBTUcsVUFBQyxJQUFELEVBQU8sR0FBUCxFQUFZLElBQVosRUFBcUI7QUFDdkIsUUFBSSxHQUFKLEVBQVM7QUFDUixTQUFJLFFBQU8sR0FBUCx5Q0FBTyxHQUFQLE9BQWUsUUFBZixJQUEyQixPQUFPLElBQUksSUFBWCxLQUFvQixRQUFuRCxFQUE2RDtBQUM1RCxlQUFTLElBQVQsRUFBZSxJQUFJLElBQW5CO0FBQ0E7QUFDRDtBQUNBO0FBQ0QsYUFBUyxJQUFUO0FBQ0EsSUFkRDtBQWVBOztBQUVEOzs7Ozs7OztpQ0FLZ0IsVSxFQUFZLFEsRUFBVTtBQUNyQyxXQUFRLElBQVIsQ0FBYSxvRUFBYjtBQUNBLFFBQUssVUFBTCxDQUFnQixVQUFoQixFQUE0QixRQUE1QjtBQUNBOztBQUVEOzs7Ozs7Ozs2QkFLWSxVLEVBQVksUSxFQUFVO0FBQ2pDLFFBQUssV0FBTCxDQUFpQixRQUFqQixFQUEyQixVQUEzQixFQUF1QyxhQUF2QztBQUNBOztBQUVEOzs7Ozs7Ozs7OztpQ0FRZ0IsVyxFQUFhLEksRUFBTSxNLEVBQVEsUSxFQUFVO0FBQ3BELE9BQU0sYUFBYTtBQUNsQixjQUFVO0FBQ1QsV0FBUSxFQUFFLE9BQU8sV0FBVyxLQUFLLFVBQWhCLENBQVQsRUFBc0MsS0FBSyxXQUFXLEtBQUssUUFBaEIsQ0FBM0MsRUFBc0UsVUFBVSxNQUFoRixFQURDO0FBRVQsYUFBUSxFQUZDO0FBR1QsYUFBUTtBQUhDLEtBRFE7QUFNbEIsYUFBUztBQU5TLElBQW5CO0FBUUEsV0FBUSxJQUFSLENBQWEsb0VBQWI7QUFDQTtBQUNBLFFBQUssVUFBTCxDQUFnQixVQUFoQixFQUE0QixRQUE1QjtBQUNBOztBQUVEOzs7Ozs7Ozt3Q0FLdUIsSSxFQUFNO0FBQzVCLE9BQUksWUFBWSxJQUFoQjtBQUNBLE9BQUksUUFBUSxJQUFaLEVBQWtCO0FBQ2pCLFNBQUssSUFBTSxDQUFYLElBQWdCLElBQWhCLEVBQXNCO0FBQ3JCLFNBQUksTUFBTSxRQUFOLElBQWtCLE1BQU0sS0FBNUIsRUFBbUM7QUFDbEMsVUFBSSxLQUFLLENBQUwsRUFBUSxHQUFSLElBQWUsSUFBZixJQUF1QixLQUFLLENBQUwsRUFBUSxHQUFSLENBQVksRUFBWixHQUFpQixDQUE1QyxFQUErQztBQUM5QztBQUNBOztBQUVELFVBQUksQ0FBQyxTQUFMLEVBQWdCO0FBQ2YsbUJBQVksRUFBWjtBQUNBOztBQUVELFVBQUksQ0FBQyxVQUFVLENBQVYsQ0FBTCxFQUFtQjtBQUNsQixpQkFBVSxDQUFWLElBQWUsRUFBZjtBQUNBO0FBQ0Q7QUFDQSxnQkFBVSxDQUFWLEVBQWEsRUFBYixHQUFrQixDQUFsQjtBQUNBO0FBQ0EsZ0JBQVUsQ0FBVixFQUFhLEtBQWIsR0FBcUIsS0FBSyxDQUFMLEVBQVEsS0FBN0I7QUFDQTtBQUNBLGdCQUFVLENBQVYsRUFBYSxTQUFiLEdBQXlCLEtBQUssQ0FBTCxFQUFRLFNBQWpDO0FBQ0E7QUFDQSxnQkFBVSxDQUFWLEVBQWEsS0FBYixHQUFxQixLQUFLLENBQUwsRUFBUSxLQUE3QjtBQUNBO0FBQ0EsZ0JBQVUsQ0FBVixFQUFhLElBQWIsR0FBb0IsS0FBSyxDQUFMLEVBQVEsSUFBNUI7QUFDQTtBQUNBLGdCQUFVLENBQVYsRUFBYSxTQUFiLEdBQXlCLEtBQUssQ0FBTCxFQUFRLFNBQWpDO0FBQ0E7QUFDQSxnQkFBVSxDQUFWLEVBQWEsUUFBYixHQUF3QixLQUFLLENBQUwsRUFBUSxRQUFoQztBQUNBO0FBQ0EsZ0JBQVUsQ0FBVixFQUFhLFNBQWIsR0FBeUIsQ0FBQyxDQUFELEVBQUksR0FBSixDQUF6QjtBQUNBO0FBQ0EsZ0JBQVUsQ0FBVixFQUFhLFlBQWIsR0FBNEIsS0FBSyxDQUFMLEVBQVEsWUFBcEM7O0FBRUE7QUFDQSxnQkFBVSxDQUFWLEVBQWEsYUFBYixHQUE2QixFQUFFLFlBQVksS0FBSyxDQUFMLEVBQVEsVUFBdEIsRUFBN0I7QUFDQSxnQkFBVSxDQUFWLEVBQWEsSUFBYixHQUFvQixLQUFLLE1BQUwsQ0FBWSxJQUFaLENBQWlCLEtBQUssQ0FBTCxFQUFRLElBQXpCLEVBQStCLEtBQS9CLEVBQXNDLENBQXRDLENBQXBCO0FBQ0EsZ0JBQVUsQ0FBVixFQUFhLElBQWIsR0FBb0IsS0FBSyxDQUFMLEVBQVEsSUFBUixJQUFnQixJQUFoQixHQUNqQixLQUFLLE1BQUwsQ0FBWSxJQUFaLENBQWlCLEtBQUssQ0FBTCxFQUFRLElBQXpCLEVBQStCLEtBQS9CLEVBQXNDLENBQXRDLENBRGlCLEdBRWpCLEtBQUssQ0FBTCxFQUFRLEdBQVIsSUFBZSxJQUFmLEdBQ0csS0FBSyxNQUFMLENBQVksSUFBWixDQUFpQixLQUFLLENBQUwsRUFBUSxHQUFSLENBQVksQ0FBN0IsRUFBZ0MsS0FBaEMsRUFBdUMsQ0FBdkMsQ0FESCxHQUVHLElBSk47QUFLQSxnQkFBVSxDQUFWLEVBQWEsWUFBYixHQUE0QixLQUFLLENBQUwsRUFBUSxJQUFSLElBQWdCLElBQWhCLEdBQ3pCLEtBQUssTUFBTCxDQUFZLElBQVosQ0FBaUIsS0FBSyxDQUFMLEVBQVEsS0FBekIsRUFBZ0MsS0FBaEMsRUFBdUMsQ0FBdkMsQ0FEeUIsR0FFekIsS0FBSyxDQUFMLEVBQVEsR0FBUixJQUFlLElBQWYsR0FDRyxLQUFLLE1BQUwsQ0FBWSxJQUFaLENBQWlCLEtBQUssQ0FBTCxFQUFRLEdBQVIsQ0FBWSxDQUE3QixFQUFnQyxLQUFoQyxFQUF1QyxDQUF2QyxDQURILEdBRUcsSUFKTjtBQUtBLGdCQUFVLENBQVYsRUFBYSxPQUFiLEdBQXVCLEtBQUssTUFBTCxDQUFZLElBQVosQ0FBaUIsS0FBSyxDQUFMLEVBQVEsT0FBekIsRUFBa0MsS0FBbEMsRUFBeUMsQ0FBekMsQ0FBdkI7QUFDQSxVQUFJLFVBQVUsQ0FBVixFQUFhLE9BQWIsSUFBd0IsSUFBNUIsRUFBa0M7QUFBQTtBQUNqQztBQUNBLFlBQU0sWUFBWSxFQUFsQjtBQUNBLGFBQUssTUFBTCxDQUFZLE1BQVosQ0FBbUIsT0FBbkIsQ0FBMkIsVUFBQyxFQUFELEVBQVE7QUFDbEMsbUJBQVUsR0FBRyxFQUFiLElBQW1CLEdBQUcsSUFBdEI7QUFDQSxTQUZEO0FBR0Esa0JBQVUsQ0FBVixFQUFhLE9BQWIsR0FBdUIsVUFBVSxDQUFWLEVBQWEsT0FBYixDQUFxQixHQUFyQixDQUF5QixVQUFDLEVBQUQsRUFBUTtBQUN2RCxnQkFBTyxVQUFVLEVBQVYsQ0FBUDtBQUNBLFNBRnNCLENBQXZCO0FBTmlDO0FBU2pDOztBQUVELGdCQUFVLENBQVYsRUFBYSxPQUFiLEdBQXVCLEtBQUssTUFBTCxDQUFZLElBQVosQ0FBaUIsS0FBSyxDQUFMLEVBQVEsT0FBekIsRUFBa0MsS0FBbEMsRUFBeUMsQ0FBekMsQ0FBdkI7QUFDQSxnQkFBVSxDQUFWLEVBQWEsQ0FBYixHQUFpQixJQUFqQjtBQUNBLGdCQUFVLENBQVYsRUFBYSxDQUFiLEdBQWlCLElBQWpCOztBQUVBLFVBQUksS0FBSyxDQUFMLEVBQVEsR0FBUixJQUFlLElBQW5CLEVBQXlCO0FBQ3hCLGlCQUFVLENBQVYsRUFBYSxHQUFiLEdBQW1CO0FBQ2xCLFdBQUcsS0FBSyxNQUFMLENBQVksSUFBWixDQUFpQixLQUFLLENBQUwsRUFBUSxHQUFSLENBQVksQ0FBN0IsRUFBZ0MsS0FBaEMsRUFBdUMsQ0FBdkMsQ0FEZTtBQUVsQixXQUFHLEtBQUssTUFBTCxDQUFZLElBQVosQ0FBaUIsS0FBSyxDQUFMLEVBQVEsR0FBUixDQUFZLENBQTdCLEVBQWdDLEtBQWhDLEVBQXVDLENBQXZDO0FBRmUsUUFBbkI7QUFJQTtBQUNELFVBQUksS0FBSyxDQUFMLEVBQVEsR0FBUixJQUFlLElBQW5CLEVBQXlCO0FBQ3hCLGlCQUFVLENBQVYsRUFBYSxHQUFiLEdBQW1CO0FBQ2xCLFdBQUcsS0FBSyxNQUFMLENBQVksSUFBWixDQUFpQixLQUFLLENBQUwsRUFBUSxHQUFSLENBQVksQ0FBN0IsRUFBZ0MsS0FBaEMsRUFBdUMsQ0FBdkMsQ0FEZTtBQUVsQixXQUFHLEtBQUssTUFBTCxDQUFZLElBQVosQ0FBaUIsS0FBSyxDQUFMLEVBQVEsR0FBUixDQUFZLENBQTdCLEVBQWdDLEtBQWhDLEVBQXVDLENBQXZDO0FBRmUsUUFBbkI7QUFJQTtBQUNELFVBQUksS0FBSyxDQUFMLEVBQVEsR0FBUixJQUFlLElBQW5CLEVBQXlCO0FBQ3hCLGlCQUFVLENBQVYsRUFBYSxHQUFiLEdBQW1CO0FBQ2xCLFdBQUcsS0FBSyxNQUFMLENBQVksSUFBWixDQUFpQixLQUFLLENBQUwsRUFBUSxHQUFSLENBQVksQ0FBN0IsRUFBZ0MsS0FBaEMsRUFBdUMsQ0FBdkMsQ0FEZTtBQUVsQixXQUFHLEtBQUssTUFBTCxDQUFZLElBQVosQ0FBaUIsS0FBSyxDQUFMLEVBQVEsR0FBUixDQUFZLENBQTdCLEVBQWdDLEtBQWhDLEVBQXVDLENBQXZDO0FBRmUsUUFBbkI7QUFJQTtBQUNELFVBQUksS0FBSyxDQUFMLEVBQVEsTUFBUixJQUFrQixJQUF0QixFQUE0QjtBQUMzQixpQkFBVSxDQUFWLEVBQWEsTUFBYixHQUFzQjtBQUNyQixXQUFHLEtBQUssTUFBTCxDQUFZLElBQVosQ0FBaUIsS0FBSyxDQUFMLEVBQVEsTUFBUixDQUFlLENBQWhDLEVBQW1DLEtBQW5DLEVBQTBDLENBQTFDLENBRGtCO0FBRXJCLFdBQUcsS0FBSyxNQUFMLENBQVksSUFBWixDQUFpQixLQUFLLENBQUwsRUFBUSxNQUFSLENBQWUsQ0FBaEMsRUFBbUMsS0FBbkMsRUFBMEMsQ0FBMUM7QUFGa0IsUUFBdEI7QUFJQTtBQUNELFVBQUksS0FBSyxDQUFMLEVBQVEsTUFBUixJQUFrQixJQUF0QixFQUE0QjtBQUMzQixpQkFBVSxDQUFWLEVBQWEsTUFBYixHQUFzQjtBQUNyQixXQUFHLEtBQUssTUFBTCxDQUFZLElBQVosQ0FBaUIsS0FBSyxDQUFMLEVBQVEsTUFBUixDQUFlLENBQWhDLEVBQW1DLEtBQW5DLEVBQTBDLENBQTFDLENBRGtCO0FBRXJCLFdBQUcsS0FBSyxNQUFMLENBQVksSUFBWixDQUFpQixLQUFLLENBQUwsRUFBUSxNQUFSLENBQWUsQ0FBaEMsRUFBbUMsS0FBbkMsRUFBMEMsQ0FBMUM7QUFGa0IsUUFBdEI7QUFJQTtBQUNELFVBQUksS0FBSyxDQUFMLEVBQVEsQ0FBUixJQUFhLElBQWpCLEVBQXVCO0FBQ3RCLGlCQUFVLENBQVYsRUFBYSxDQUFiLEdBQWlCLEtBQUssTUFBTCxDQUFZLElBQVosQ0FBaUIsS0FBSyxDQUFMLEVBQVEsQ0FBekIsRUFBNEIsS0FBNUIsRUFBbUMsQ0FBbkMsQ0FBakI7QUFDQTtBQUNELFVBQUksS0FBSyxDQUFMLEVBQVEsQ0FBUixJQUFhLElBQWpCLEVBQXVCO0FBQ3RCLGlCQUFVLENBQVYsRUFBYSxDQUFiLEdBQWlCLEtBQUssTUFBTCxDQUFZLElBQVosQ0FBaUIsS0FBSyxDQUFMLEVBQVEsQ0FBekIsRUFBNEIsS0FBNUIsRUFBbUMsQ0FBbkMsQ0FBakI7QUFDQTtBQUNEOzs7OztBQUtBO0FBQ0EsZ0JBQVUsQ0FBVixFQUFhLEtBQWIsR0FBcUIsS0FBckI7QUFDQTtBQUNEO0FBQ0Q7QUFDRDtBQUNBLFFBQUssU0FBTCxHQUFpQixTQUFqQjtBQUNBLFVBQU8sU0FBUDtBQUNBOzs7Ozs7QUFHRixPQUFPLE9BQVAsR0FBaUIsV0FBakI7OztBQ3RpQkE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBb0JBOzs7Ozs7Ozs7Ozs7O0FBYUE7Ozs7Ozs7Ozs7QUFFQSxJQUFNLGVBQWUsUUFBUSxlQUFSLENBQXJCOztBQUVBLElBQU0sWUFBWSxPQUFPLE1BQVAsS0FBa0IsV0FBcEM7QUFDQSxJQUFJLGdCQUFKO0FBQ0EsSUFBSSxDQUFDLFNBQUwsRUFBZ0I7QUFDZixXQUFVLFFBQVEsVUFBUixDQUFWO0FBQ0EsQ0FGRCxNQUVPO0FBQ04sV0FBVSxPQUFPLE9BQWpCO0FBQ0E7QUFDRCxJQUFNLGdCQUFrQixRQUFRLDBCQUFSLENBQXhCO0FBQ0EsSUFBTSxrQkFBa0IsUUFBUSxtQkFBUixFQUE2QixlQUFyRDs7QUFFQTtBQUNBLElBQU0sY0FBYyxHQUFwQjs7SUFFTSxTOzs7QUFDTDs7OztBQUlBLG9CQUFhLFFBQWIsRUFBdUIsT0FBdkIsRUFBZ0M7QUFBQTs7QUFBQTs7QUFHL0IsUUFBSyxRQUFMLEdBQWdCLFFBQWhCO0FBQ0EsUUFBSyxLQUFMLEdBQWEsU0FBYjs7QUFFQSxRQUFLLGtCQUFMLEdBQTBCLENBQTFCLENBTitCLENBTUg7QUFDNUIsUUFBSyxxQkFBTCxHQUE2QixNQUE3QixDQVArQixDQU9LOztBQUVwQztBQUNBLE1BQU0sVUFBVTtBQUNmLGFBQVcsRUFBRSxNQUFNLEVBQVIsRUFESTtBQUVmLGNBQVcsQ0FBQyxLQUFELEVBQVEsS0FBUixFQUFlLEtBQWYsRUFBc0IsUUFBdEI7QUFGSSxHQUFoQjtBQUlBLE1BQUksUUFBUSxNQUFSLFlBQTBCLEtBQTlCLEVBQXFDO0FBQ3BDLFdBQVEsUUFBUixDQUFpQixNQUFqQixHQUEwQixRQUFRLE1BQWxDO0FBQ0E7QUFDRCxNQUFJLFFBQVEsU0FBUixJQUFxQixJQUFyQixJQUE2QixPQUFPLFFBQVEsU0FBZixLQUE2QixRQUE5RCxFQUF3RTtBQUN2RSxXQUFRLFFBQVIsQ0FBaUIsSUFBakIsQ0FBc0IsU0FBdEIsR0FBa0MsUUFBUSxTQUExQztBQUNBLEdBRkQsTUFFTztBQUNOLFdBQVEsUUFBUixDQUFpQixJQUFqQixDQUFzQixTQUF0QixHQUFrQyxPQUFsQztBQUNBO0FBQ0QsTUFBSSxRQUFRLFFBQVIsSUFBb0IsSUFBcEIsSUFBNEIsT0FBTyxRQUFRLFFBQWYsS0FBNEIsUUFBNUQsRUFBc0U7QUFDckUsV0FBUSxRQUFSLEdBQW1CLFFBQVEsUUFBM0I7QUFDQSxHQUZELE1BRU87QUFDTixXQUFRLFFBQVIsR0FBbUIsS0FBbkI7QUFDQTtBQUNELE1BQUksUUFBUSxRQUFSLElBQW9CLElBQXBCLElBQTRCLE9BQU8sUUFBUSxRQUFmLEtBQTRCLFFBQTVELEVBQXNFO0FBQ3JFLFdBQVEsUUFBUixHQUFtQixRQUFRLFFBQTNCO0FBQ0EsR0FGRCxNQUVPO0FBQ04sV0FBUSxRQUFSLEdBQW1CLFdBQW5CO0FBQ0E7QUFDRCxNQUFJLFFBQVEsUUFBUixHQUFtQixXQUF2QixFQUFvQztBQUNuQyxXQUFRLFFBQVIsR0FBbUIsR0FBbkI7QUFDQTtBQUNELFVBQVEsUUFBUixDQUFpQixJQUFqQixDQUFzQixRQUF0QixHQUFpQyxnQkFBZ0IsUUFBUSxRQUFSLENBQWlCLElBQWpDLEVBQXVDLFFBQVEsUUFBL0MsQ0FBakM7O0FBRUEsUUFBSyxPQUFMLEdBQWUsT0FBZjs7QUFFQSxRQUFLLEtBQUwsQ0FBVyxPQUFYLEVBdkMrQixDQXVDWDtBQXZDVztBQXdDL0I7Ozs7d0JBZ0JNLE8sRUFBUztBQUFBOztBQUNmLE9BQUksT0FBSixDQUFZLFVBQUMsT0FBRCxFQUFVLE1BQVYsRUFBcUI7QUFDaEM7QUFDQSxXQUFLLFFBQUwsQ0FBYyxPQUFkLENBQXNCO0FBQ3JCLGNBQVMsS0FEWTtBQUVyQixXQUFTLGFBRlk7QUFHckIsV0FBUyxFQUFFLE1BQU0sS0FBSyxTQUFMLENBQWUsT0FBZixDQUFSLEVBSFk7QUFJckIsVUFBUyxPQUFLLG9CQUFMO0FBSlksS0FBdEIsRUFLRyxVQUFDLElBQUQsRUFBTyxHQUFQLEVBQVksVUFBWixFQUEyQjtBQUM3QixTQUFJLE9BQU8sSUFBWCxFQUFpQjtBQUNoQixhQUFPLEdBQVA7QUFDQTtBQUNBO0FBQ0QsU0FBSSxPQUFLLEtBQUwsS0FBZSxTQUFuQixFQUE4QjtBQUM3QixhQUFPLElBQUksYUFBSixFQUFQO0FBQ0E7QUFDRCxTQUFNLE9BQU8sS0FBSyxLQUFMLENBQVcsVUFBWCxDQUFiO0FBQ0EsWUFBSyxJQUFMLENBQVUsTUFBVixFQUFrQixJQUFsQjtBQUNBO0FBQ0EsS0FoQkQ7QUFpQkEsSUFuQkQsRUFvQkMsSUFwQkQsQ0FvQk0sWUFBTTtBQUNYO0FBQ0EsV0FBTyxJQUFJLE9BQUosQ0FBWSxVQUFDLE9BQUQsRUFBVSxNQUFWLEVBQXFCO0FBQ3ZDLFlBQUssWUFBTCxHQUFvQixPQUFLLFFBQUwsQ0FBYyxTQUFkLENBQXdCO0FBQzNDLGVBQVMsS0FEa0M7QUFFM0MsWUFBUyxRQUFRLFFBQVIsQ0FBaUIsSUFBakIsQ0FBc0IsUUFGWTtBQUczQyxZQUFTLEVBQUUsTUFBTSxPQUFSLEVBSGtDO0FBSTNDLFdBQVMsT0FBSyxpQkFBTDtBQUprQyxNQUF4QixFQUtqQixVQUFDLEdBQUQsRUFBTSxHQUFOLEVBQVcsS0FBWCxFQUFxQjtBQUN2QixVQUFJLE9BQU8sS0FBWDtBQUNBLFVBQUksT0FBTyxJQUFYLEVBQWlCO0FBQ2hCLGNBQU8sR0FBUDtBQUNBO0FBQ0E7QUFDRCxhQUFPLEtBQUssS0FBTCxDQUFXLElBQVgsQ0FBUDtBQUNBLGFBQUssSUFBTCxDQUFVLE1BQVYsRUFBa0IsSUFBbEI7O0FBRUEsYUFBSyxrQkFBTCxHQUEwQixDQUExQixDQVR1QixDQVNLO0FBQzVCO0FBQ0EsTUFoQm1CLENBQXBCO0FBaUJBLEtBbEJNLENBQVA7QUFtQkEsSUF6Q0QsRUEwQ0MsS0ExQ0QsQ0EwQ08sVUFBQyxHQUFELEVBQVM7QUFDZixRQUFJLElBQUksSUFBSixLQUFhLGVBQWpCLEVBQWtDO0FBQUU7QUFDbkM7QUFDQTtBQUNEO0FBQ0EsV0FBSyxrQkFBTCxHQUxlLENBS1c7QUFDMUIsV0FBSyxrQkFBTCxHQUEwQixPQUFLLGtCQUFMLEdBQTBCLElBQXBELENBTmUsQ0FNMEM7QUFDekQsUUFBSSxPQUFLLGtCQUFMLEdBQTBCLE9BQUsscUJBQW5DLEVBQTBEO0FBQ3pELFlBQUssa0JBQUwsR0FBMEIsT0FBSyxxQkFBL0IsQ0FEeUQsQ0FDSjtBQUNyRDtBQUNELFdBQUssY0FBTCxHQUFzQixXQUFXLFlBQU07QUFDdEMsWUFBSyxLQUFMLENBQVcsT0FBWDtBQUNBLEtBRnFCLEVBRW5CLE9BQUssa0JBRmMsQ0FBdEIsQ0FWZSxDQVlhO0FBQzVCLElBdkREO0FBd0RBOztBQUVEOzs7O3VDQUNzQjtBQUNyQixPQUFJLEtBQUssWUFBTCxJQUFxQixJQUF6QixFQUErQjtBQUM5QixTQUFLLFlBQUwsQ0FBa0IsS0FBbEI7QUFDQSxTQUFLLFlBQUwsR0FBb0IsSUFBcEI7QUFDQTtBQUNEOzs7eUJBRU87QUFDUCxRQUFLLEtBQUwsR0FBYSxTQUFiO0FBQ0EsT0FBSSxLQUFLLGNBQUwsSUFBdUIsSUFBM0IsRUFBaUM7QUFDaEMsaUJBQWEsS0FBSyxjQUFsQjtBQUNBO0FBQ0QsUUFBSyxrQkFBTDtBQUNBLFFBQUssSUFBTCxDQUFVLE1BQVY7QUFDQSxRQUFLLGtCQUFMO0FBQ0E7Ozt5Q0F6RjhCO0FBQzlCLFVBQU87QUFDTixVQUFXLG9CQURMO0FBRU4sZUFBVztBQUZMLElBQVA7QUFJQTs7O3NDQUUyQjtBQUMzQixVQUFPO0FBQ04sVUFBVyxvQkFETDtBQUVOLGVBQVc7QUFGTCxJQUFQO0FBSUE7Ozs7RUEzRHNCLFk7O0FBMkl4QixPQUFPLE9BQVAsR0FBaUIsU0FBakI7OztBQzdMQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFvQkE7Ozs7Ozs7Ozs7Ozs7QUFhQTs7Ozs7Ozs7OztBQUVBLElBQU0sWUFBYyxRQUFRLGtCQUFSLENBQXBCO0FBQ0EsSUFBTSxjQUFjLFFBQVEsb0JBQVIsQ0FBcEI7O0lBRU0sVzs7O0FBQ0wsdUJBQWEsUUFBYixFQUF1QjtBQUFBOztBQUFBOztBQUFBLDBIQUNoQixRQURnQjs7QUFFdEIsVUFBSyxRQUFMLEdBQWdCLFFBQWhCO0FBQ0E7QUFDQTs7OzswQ0FFc0I7QUFDdEIsYUFBTztBQUNOLDZDQUF3QyxVQUFVLGNBQVYsQ0FBeUIsS0FBSyxRQUFMLENBQWMsV0FBZCxDQUEwQixJQUExQixFQUF6QixDQURsQztBQUVOLG1CQUFXO0FBRkwsT0FBUDtBQUlBOzs7dUNBRW1CO0FBQ25CLGFBQU87QUFDTiw2Q0FBd0MsVUFBVSxjQUFWLENBQXlCLEtBQUssUUFBTCxDQUFjLFdBQWQsQ0FBMEIsSUFBMUIsRUFBekIsQ0FEbEM7QUFFTixtQkFBVztBQUZMLE9BQVA7QUFJQTs7O2tDQUVjLE0sRUFBUTtBQUN0QixhQUFPLElBQUksU0FBSixDQUFjLEtBQUssUUFBbkIsRUFBNkIsTUFBN0IsQ0FBUDtBQUNBOzs7O0VBdkJ3QixXOztBQTBCMUIsT0FBTyxPQUFQLEdBQWlCLFdBQWpCOzs7QUNoRUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBb0JBOzs7Ozs7Ozs7Ozs7O0FBYUE7Ozs7Ozs7Ozs7QUFFQSxJQUFNLFlBQVksUUFBUSxrQkFBUixDQUFsQjs7SUFFTSxTOzs7QUFDTDs7OztBQUlBLHFCQUFhLFFBQWIsRUFBdUIsT0FBdkIsRUFBZ0M7QUFBQTs7QUFBQSxzSEFDekIsUUFEeUIsRUFDZixPQURlOztBQUUvQixVQUFLLFFBQUwsR0FBZ0IsUUFBaEI7QUFGK0I7QUFHL0I7Ozs7MkNBRXVCO0FBQ3ZCLGFBQU87QUFDTiw4Q0FBeUMsVUFBVSxjQUFWLENBQXlCLEtBQUssUUFBTCxDQUFjLFdBQWQsQ0FBMEIsSUFBMUIsRUFBekIsQ0FEbkM7QUFFTixtQkFBVztBQUZMLE9BQVA7QUFJQTs7O3dDQUVvQjtBQUNwQixhQUFPO0FBQ04sMkNBQXNDLFVBQVUsY0FBVixDQUF5QixLQUFLLFFBQUwsQ0FBYyxXQUFkLENBQTBCLElBQTFCLEVBQXpCLENBRGhDO0FBRU4sbUJBQVc7QUFGTCxPQUFQO0FBSUE7OzttQ0FFc0IsSyxFQUF3QjtBQUFBLFVBQWpCLFNBQWlCLHVFQUFMLEdBQUs7O0FBQzlDLGFBQU8sTUFBTSxLQUFOLENBQVksU0FBWixFQUF1QixHQUF2QixDQUEyQixVQUFDLENBQUQsRUFBTztBQUN4QyxlQUFPLEVBQUUsTUFBRixDQUFTLENBQVQsRUFBWSxXQUFaLEtBQTRCLEVBQUUsS0FBRixDQUFRLENBQVIsQ0FBbkM7QUFDQSxPQUZNLEVBRUosSUFGSSxDQUVDLEVBRkQsQ0FBUDtBQUdBOzs7O0VBNUJzQixTOztBQStCeEIsT0FBTyxPQUFQLEdBQWlCLFNBQWpCIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaGFzID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eVxuICAsIHByZWZpeCA9ICd+JztcblxuLyoqXG4gKiBDb25zdHJ1Y3RvciB0byBjcmVhdGUgYSBzdG9yYWdlIGZvciBvdXIgYEVFYCBvYmplY3RzLlxuICogQW4gYEV2ZW50c2AgaW5zdGFuY2UgaXMgYSBwbGFpbiBvYmplY3Qgd2hvc2UgcHJvcGVydGllcyBhcmUgZXZlbnQgbmFtZXMuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gRXZlbnRzKCkge31cblxuLy9cbi8vIFdlIHRyeSB0byBub3QgaW5oZXJpdCBmcm9tIGBPYmplY3QucHJvdG90eXBlYC4gSW4gc29tZSBlbmdpbmVzIGNyZWF0aW5nIGFuXG4vLyBpbnN0YW5jZSBpbiB0aGlzIHdheSBpcyBmYXN0ZXIgdGhhbiBjYWxsaW5nIGBPYmplY3QuY3JlYXRlKG51bGwpYCBkaXJlY3RseS5cbi8vIElmIGBPYmplY3QuY3JlYXRlKG51bGwpYCBpcyBub3Qgc3VwcG9ydGVkIHdlIHByZWZpeCB0aGUgZXZlbnQgbmFtZXMgd2l0aCBhXG4vLyBjaGFyYWN0ZXIgdG8gbWFrZSBzdXJlIHRoYXQgdGhlIGJ1aWx0LWluIG9iamVjdCBwcm9wZXJ0aWVzIGFyZSBub3Rcbi8vIG92ZXJyaWRkZW4gb3IgdXNlZCBhcyBhbiBhdHRhY2sgdmVjdG9yLlxuLy9cbmlmIChPYmplY3QuY3JlYXRlKSB7XG4gIEV2ZW50cy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gIC8vXG4gIC8vIFRoaXMgaGFjayBpcyBuZWVkZWQgYmVjYXVzZSB0aGUgYF9fcHJvdG9fX2AgcHJvcGVydHkgaXMgc3RpbGwgaW5oZXJpdGVkIGluXG4gIC8vIHNvbWUgb2xkIGJyb3dzZXJzIGxpa2UgQW5kcm9pZCA0LCBpUGhvbmUgNS4xLCBPcGVyYSAxMSBhbmQgU2FmYXJpIDUuXG4gIC8vXG4gIGlmICghbmV3IEV2ZW50cygpLl9fcHJvdG9fXykgcHJlZml4ID0gZmFsc2U7XG59XG5cbi8qKlxuICogUmVwcmVzZW50YXRpb24gb2YgYSBzaW5nbGUgZXZlbnQgbGlzdGVuZXIuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gVGhlIGxpc3RlbmVyIGZ1bmN0aW9uLlxuICogQHBhcmFtIHtNaXhlZH0gY29udGV4dCBUaGUgY29udGV4dCB0byBpbnZva2UgdGhlIGxpc3RlbmVyIHdpdGguXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvbmNlPWZhbHNlXSBTcGVjaWZ5IGlmIHRoZSBsaXN0ZW5lciBpcyBhIG9uZS10aW1lIGxpc3RlbmVyLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gRUUoZm4sIGNvbnRleHQsIG9uY2UpIHtcbiAgdGhpcy5mbiA9IGZuO1xuICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICB0aGlzLm9uY2UgPSBvbmNlIHx8IGZhbHNlO1xufVxuXG4vKipcbiAqIE1pbmltYWwgYEV2ZW50RW1pdHRlcmAgaW50ZXJmYWNlIHRoYXQgaXMgbW9sZGVkIGFnYWluc3QgdGhlIE5vZGUuanNcbiAqIGBFdmVudEVtaXR0ZXJgIGludGVyZmFjZS5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqIEBhcGkgcHVibGljXG4gKi9cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gbmV3IEV2ZW50cygpO1xuICB0aGlzLl9ldmVudHNDb3VudCA9IDA7XG59XG5cbi8qKlxuICogUmV0dXJuIGFuIGFycmF5IGxpc3RpbmcgdGhlIGV2ZW50cyBmb3Igd2hpY2ggdGhlIGVtaXR0ZXIgaGFzIHJlZ2lzdGVyZWRcbiAqIGxpc3RlbmVycy5cbiAqXG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmV2ZW50TmFtZXMgPSBmdW5jdGlvbiBldmVudE5hbWVzKCkge1xuICB2YXIgbmFtZXMgPSBbXVxuICAgICwgZXZlbnRzXG4gICAgLCBuYW1lO1xuXG4gIGlmICh0aGlzLl9ldmVudHNDb3VudCA9PT0gMCkgcmV0dXJuIG5hbWVzO1xuXG4gIGZvciAobmFtZSBpbiAoZXZlbnRzID0gdGhpcy5fZXZlbnRzKSkge1xuICAgIGlmIChoYXMuY2FsbChldmVudHMsIG5hbWUpKSBuYW1lcy5wdXNoKHByZWZpeCA/IG5hbWUuc2xpY2UoMSkgOiBuYW1lKTtcbiAgfVxuXG4gIGlmIChPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKSB7XG4gICAgcmV0dXJuIG5hbWVzLmNvbmNhdChPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKGV2ZW50cykpO1xuICB9XG5cbiAgcmV0dXJuIG5hbWVzO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gdGhlIGxpc3RlbmVycyByZWdpc3RlcmVkIGZvciBhIGdpdmVuIGV2ZW50LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfFN5bWJvbH0gZXZlbnQgVGhlIGV2ZW50IG5hbWUuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGV4aXN0cyBPbmx5IGNoZWNrIGlmIHRoZXJlIGFyZSBsaXN0ZW5lcnMuXG4gKiBAcmV0dXJucyB7QXJyYXl8Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24gbGlzdGVuZXJzKGV2ZW50LCBleGlzdHMpIHtcbiAgdmFyIGV2dCA9IHByZWZpeCA/IHByZWZpeCArIGV2ZW50IDogZXZlbnRcbiAgICAsIGF2YWlsYWJsZSA9IHRoaXMuX2V2ZW50c1tldnRdO1xuXG4gIGlmIChleGlzdHMpIHJldHVybiAhIWF2YWlsYWJsZTtcbiAgaWYgKCFhdmFpbGFibGUpIHJldHVybiBbXTtcbiAgaWYgKGF2YWlsYWJsZS5mbikgcmV0dXJuIFthdmFpbGFibGUuZm5dO1xuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gYXZhaWxhYmxlLmxlbmd0aCwgZWUgPSBuZXcgQXJyYXkobCk7IGkgPCBsOyBpKyspIHtcbiAgICBlZVtpXSA9IGF2YWlsYWJsZVtpXS5mbjtcbiAgfVxuXG4gIHJldHVybiBlZTtcbn07XG5cbi8qKlxuICogQ2FsbHMgZWFjaCBvZiB0aGUgbGlzdGVuZXJzIHJlZ2lzdGVyZWQgZm9yIGEgZ2l2ZW4gZXZlbnQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8U3ltYm9sfSBldmVudCBUaGUgZXZlbnQgbmFtZS5cbiAqIEByZXR1cm5zIHtCb29sZWFufSBgdHJ1ZWAgaWYgdGhlIGV2ZW50IGhhZCBsaXN0ZW5lcnMsIGVsc2UgYGZhbHNlYC5cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uIGVtaXQoZXZlbnQsIGExLCBhMiwgYTMsIGE0LCBhNSkge1xuICB2YXIgZXZ0ID0gcHJlZml4ID8gcHJlZml4ICsgZXZlbnQgOiBldmVudDtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1tldnRdKSByZXR1cm4gZmFsc2U7XG5cbiAgdmFyIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1tldnRdXG4gICAgLCBsZW4gPSBhcmd1bWVudHMubGVuZ3RoXG4gICAgLCBhcmdzXG4gICAgLCBpO1xuXG4gIGlmIChsaXN0ZW5lcnMuZm4pIHtcbiAgICBpZiAobGlzdGVuZXJzLm9uY2UpIHRoaXMucmVtb3ZlTGlzdGVuZXIoZXZlbnQsIGxpc3RlbmVycy5mbiwgdW5kZWZpbmVkLCB0cnVlKTtcblxuICAgIHN3aXRjaCAobGVuKSB7XG4gICAgICBjYXNlIDE6IHJldHVybiBsaXN0ZW5lcnMuZm4uY2FsbChsaXN0ZW5lcnMuY29udGV4dCksIHRydWU7XG4gICAgICBjYXNlIDI6IHJldHVybiBsaXN0ZW5lcnMuZm4uY2FsbChsaXN0ZW5lcnMuY29udGV4dCwgYTEpLCB0cnVlO1xuICAgICAgY2FzZSAzOiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQsIGExLCBhMiksIHRydWU7XG4gICAgICBjYXNlIDQ6IHJldHVybiBsaXN0ZW5lcnMuZm4uY2FsbChsaXN0ZW5lcnMuY29udGV4dCwgYTEsIGEyLCBhMyksIHRydWU7XG4gICAgICBjYXNlIDU6IHJldHVybiBsaXN0ZW5lcnMuZm4uY2FsbChsaXN0ZW5lcnMuY29udGV4dCwgYTEsIGEyLCBhMywgYTQpLCB0cnVlO1xuICAgICAgY2FzZSA2OiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQsIGExLCBhMiwgYTMsIGE0LCBhNSksIHRydWU7XG4gICAgfVxuXG4gICAgZm9yIChpID0gMSwgYXJncyA9IG5ldyBBcnJheShsZW4gLTEpOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgIH1cblxuICAgIGxpc3RlbmVycy5mbi5hcHBseShsaXN0ZW5lcnMuY29udGV4dCwgYXJncyk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIGxlbmd0aCA9IGxpc3RlbmVycy5sZW5ndGhcbiAgICAgICwgajtcblxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGxpc3RlbmVyc1tpXS5vbmNlKSB0aGlzLnJlbW92ZUxpc3RlbmVyKGV2ZW50LCBsaXN0ZW5lcnNbaV0uZm4sIHVuZGVmaW5lZCwgdHJ1ZSk7XG5cbiAgICAgIHN3aXRjaCAobGVuKSB7XG4gICAgICAgIGNhc2UgMTogbGlzdGVuZXJzW2ldLmZuLmNhbGwobGlzdGVuZXJzW2ldLmNvbnRleHQpOyBicmVhaztcbiAgICAgICAgY2FzZSAyOiBsaXN0ZW5lcnNbaV0uZm4uY2FsbChsaXN0ZW5lcnNbaV0uY29udGV4dCwgYTEpOyBicmVhaztcbiAgICAgICAgY2FzZSAzOiBsaXN0ZW5lcnNbaV0uZm4uY2FsbChsaXN0ZW5lcnNbaV0uY29udGV4dCwgYTEsIGEyKTsgYnJlYWs7XG4gICAgICAgIGNhc2UgNDogbGlzdGVuZXJzW2ldLmZuLmNhbGwobGlzdGVuZXJzW2ldLmNvbnRleHQsIGExLCBhMiwgYTMpOyBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBpZiAoIWFyZ3MpIGZvciAoaiA9IDEsIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0xKTsgaiA8IGxlbjsgaisrKSB7XG4gICAgICAgICAgICBhcmdzW2ogLSAxXSA9IGFyZ3VtZW50c1tqXTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsaXN0ZW5lcnNbaV0uZm4uYXBwbHkobGlzdGVuZXJzW2ldLmNvbnRleHQsIGFyZ3MpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBBZGQgYSBsaXN0ZW5lciBmb3IgYSBnaXZlbiBldmVudC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xTeW1ib2x9IGV2ZW50IFRoZSBldmVudCBuYW1lLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gVGhlIGxpc3RlbmVyIGZ1bmN0aW9uLlxuICogQHBhcmFtIHtNaXhlZH0gW2NvbnRleHQ9dGhpc10gVGhlIGNvbnRleHQgdG8gaW52b2tlIHRoZSBsaXN0ZW5lciB3aXRoLlxuICogQHJldHVybnMge0V2ZW50RW1pdHRlcn0gYHRoaXNgLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uIG9uKGV2ZW50LCBmbiwgY29udGV4dCkge1xuICB2YXIgbGlzdGVuZXIgPSBuZXcgRUUoZm4sIGNvbnRleHQgfHwgdGhpcylcbiAgICAsIGV2dCA9IHByZWZpeCA/IHByZWZpeCArIGV2ZW50IDogZXZlbnQ7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbZXZ0XSkgdGhpcy5fZXZlbnRzW2V2dF0gPSBsaXN0ZW5lciwgdGhpcy5fZXZlbnRzQ291bnQrKztcbiAgZWxzZSBpZiAoIXRoaXMuX2V2ZW50c1tldnRdLmZuKSB0aGlzLl9ldmVudHNbZXZ0XS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZSB0aGlzLl9ldmVudHNbZXZ0XSA9IFt0aGlzLl9ldmVudHNbZXZ0XSwgbGlzdGVuZXJdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGQgYSBvbmUtdGltZSBsaXN0ZW5lciBmb3IgYSBnaXZlbiBldmVudC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xTeW1ib2x9IGV2ZW50IFRoZSBldmVudCBuYW1lLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gVGhlIGxpc3RlbmVyIGZ1bmN0aW9uLlxuICogQHBhcmFtIHtNaXhlZH0gW2NvbnRleHQ9dGhpc10gVGhlIGNvbnRleHQgdG8gaW52b2tlIHRoZSBsaXN0ZW5lciB3aXRoLlxuICogQHJldHVybnMge0V2ZW50RW1pdHRlcn0gYHRoaXNgLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24gb25jZShldmVudCwgZm4sIGNvbnRleHQpIHtcbiAgdmFyIGxpc3RlbmVyID0gbmV3IEVFKGZuLCBjb250ZXh0IHx8IHRoaXMsIHRydWUpXG4gICAgLCBldnQgPSBwcmVmaXggPyBwcmVmaXggKyBldmVudCA6IGV2ZW50O1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW2V2dF0pIHRoaXMuX2V2ZW50c1tldnRdID0gbGlzdGVuZXIsIHRoaXMuX2V2ZW50c0NvdW50Kys7XG4gIGVsc2UgaWYgKCF0aGlzLl9ldmVudHNbZXZ0XS5mbikgdGhpcy5fZXZlbnRzW2V2dF0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2UgdGhpcy5fZXZlbnRzW2V2dF0gPSBbdGhpcy5fZXZlbnRzW2V2dF0sIGxpc3RlbmVyXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVtb3ZlIHRoZSBsaXN0ZW5lcnMgb2YgYSBnaXZlbiBldmVudC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xTeW1ib2x9IGV2ZW50IFRoZSBldmVudCBuYW1lLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gT25seSByZW1vdmUgdGhlIGxpc3RlbmVycyB0aGF0IG1hdGNoIHRoaXMgZnVuY3Rpb24uXG4gKiBAcGFyYW0ge01peGVkfSBjb250ZXh0IE9ubHkgcmVtb3ZlIHRoZSBsaXN0ZW5lcnMgdGhhdCBoYXZlIHRoaXMgY29udGV4dC5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gb25jZSBPbmx5IHJlbW92ZSBvbmUtdGltZSBsaXN0ZW5lcnMuXG4gKiBAcmV0dXJucyB7RXZlbnRFbWl0dGVyfSBgdGhpc2AuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXIoZXZlbnQsIGZuLCBjb250ZXh0LCBvbmNlKSB7XG4gIHZhciBldnQgPSBwcmVmaXggPyBwcmVmaXggKyBldmVudCA6IGV2ZW50O1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW2V2dF0pIHJldHVybiB0aGlzO1xuICBpZiAoIWZuKSB7XG4gICAgaWYgKC0tdGhpcy5fZXZlbnRzQ291bnQgPT09IDApIHRoaXMuX2V2ZW50cyA9IG5ldyBFdmVudHMoKTtcbiAgICBlbHNlIGRlbGV0ZSB0aGlzLl9ldmVudHNbZXZ0XTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHZhciBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbZXZ0XTtcblxuICBpZiAobGlzdGVuZXJzLmZuKSB7XG4gICAgaWYgKFxuICAgICAgICAgbGlzdGVuZXJzLmZuID09PSBmblxuICAgICAgJiYgKCFvbmNlIHx8IGxpc3RlbmVycy5vbmNlKVxuICAgICAgJiYgKCFjb250ZXh0IHx8IGxpc3RlbmVycy5jb250ZXh0ID09PSBjb250ZXh0KVxuICAgICkge1xuICAgICAgaWYgKC0tdGhpcy5fZXZlbnRzQ291bnQgPT09IDApIHRoaXMuX2V2ZW50cyA9IG5ldyBFdmVudHMoKTtcbiAgICAgIGVsc2UgZGVsZXRlIHRoaXMuX2V2ZW50c1tldnRdO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBmb3IgKHZhciBpID0gMCwgZXZlbnRzID0gW10sIGxlbmd0aCA9IGxpc3RlbmVycy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgaWYgKFxuICAgICAgICAgICBsaXN0ZW5lcnNbaV0uZm4gIT09IGZuXG4gICAgICAgIHx8IChvbmNlICYmICFsaXN0ZW5lcnNbaV0ub25jZSlcbiAgICAgICAgfHwgKGNvbnRleHQgJiYgbGlzdGVuZXJzW2ldLmNvbnRleHQgIT09IGNvbnRleHQpXG4gICAgICApIHtcbiAgICAgICAgZXZlbnRzLnB1c2gobGlzdGVuZXJzW2ldKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvL1xuICAgIC8vIFJlc2V0IHRoZSBhcnJheSwgb3IgcmVtb3ZlIGl0IGNvbXBsZXRlbHkgaWYgd2UgaGF2ZSBubyBtb3JlIGxpc3RlbmVycy5cbiAgICAvL1xuICAgIGlmIChldmVudHMubGVuZ3RoKSB0aGlzLl9ldmVudHNbZXZ0XSA9IGV2ZW50cy5sZW5ndGggPT09IDEgPyBldmVudHNbMF0gOiBldmVudHM7XG4gICAgZWxzZSBpZiAoLS10aGlzLl9ldmVudHNDb3VudCA9PT0gMCkgdGhpcy5fZXZlbnRzID0gbmV3IEV2ZW50cygpO1xuICAgIGVsc2UgZGVsZXRlIHRoaXMuX2V2ZW50c1tldnRdO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBhbGwgbGlzdGVuZXJzLCBvciB0aG9zZSBvZiB0aGUgc3BlY2lmaWVkIGV2ZW50LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfFN5bWJvbH0gW2V2ZW50XSBUaGUgZXZlbnQgbmFtZS5cbiAqIEByZXR1cm5zIHtFdmVudEVtaXR0ZXJ9IGB0aGlzYC5cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24gcmVtb3ZlQWxsTGlzdGVuZXJzKGV2ZW50KSB7XG4gIHZhciBldnQ7XG5cbiAgaWYgKGV2ZW50KSB7XG4gICAgZXZ0ID0gcHJlZml4ID8gcHJlZml4ICsgZXZlbnQgOiBldmVudDtcbiAgICBpZiAodGhpcy5fZXZlbnRzW2V2dF0pIHtcbiAgICAgIGlmICgtLXRoaXMuX2V2ZW50c0NvdW50ID09PSAwKSB0aGlzLl9ldmVudHMgPSBuZXcgRXZlbnRzKCk7XG4gICAgICBlbHNlIGRlbGV0ZSB0aGlzLl9ldmVudHNbZXZ0XTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5fZXZlbnRzID0gbmV3IEV2ZW50cygpO1xuICAgIHRoaXMuX2V2ZW50c0NvdW50ID0gMDtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy9cbi8vIEFsaWFzIG1ldGhvZHMgbmFtZXMgYmVjYXVzZSBwZW9wbGUgcm9sbCBsaWtlIHRoYXQuXG4vL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmYgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUub247XG5cbi8vXG4vLyBUaGlzIGZ1bmN0aW9uIGRvZXNuJ3QgYXBwbHkgYW55bW9yZS5cbi8vXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uIHNldE1heExpc3RlbmVycygpIHtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vL1xuLy8gRXhwb3NlIHRoZSBwcmVmaXguXG4vL1xuRXZlbnRFbWl0dGVyLnByZWZpeGVkID0gcHJlZml4O1xuXG4vL1xuLy8gQWxsb3cgYEV2ZW50RW1pdHRlcmAgdG8gYmUgaW1wb3J0ZWQgYXMgbW9kdWxlIG5hbWVzcGFjZS5cbi8vXG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG4vL1xuLy8gRXhwb3NlIHRoZSBtb2R1bGUuXG4vL1xuaWYgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgbW9kdWxlKSB7XG4gIG1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xufVxuIiwiLypcbiAqIENvcHlyaWdodCA6IFBhcnRuZXJpbmcgMy4wICgyMDA3LTIwMjApXG4gKiBBdXRob3IgOiBQYXJ0bmVyaW5nIFJvYm90aWNzIDxzb2Z0d2FyZUBwYXJ0bmVyaW5nLmZyPlxuICpcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIGRpeWEtc2RrLlxuICpcbiAqIGRpeWEtc2RrIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbiwgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIGRpeWEtc2RrIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlXG4gKiBhbG9uZyB3aXRoIGRpeWEtc2RrLiAgSWYgbm90LCBzZWUgPGh0dHA6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5jb25zdCBDb25uZWN0b3JWMSA9IHJlcXVpcmUoJy4vdjEvY29ubmVjdG9yLmpzJylcbmNvbnN0IENvbm5lY3RvclYyID0gcmVxdWlyZSgnLi92Mi9jb25uZWN0b3IuanMnKTtcblxuKGZ1bmN0aW9uICgpIHtcblx0Y29uc3QgRGl5YVNlbGVjdG9yID0gZDEuRGl5YVNlbGVjdG9yXG5cblx0LyoqIGNyZWF0ZSBTdGF0dXMgc2VydmljZSAqICovXG5cdERpeWFTZWxlY3Rvci5wcm90b3R5cGUuSUVRID0gZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHR0aGlzLnJlcXVlc3Qoe1xuXHRcdFx0XHRzZXJ2aWNlOiAnaWVxJyxcblx0XHRcdFx0ZnVuYyAgIDogJ0dldEFQSVZlcnNpb24nXG5cdFx0XHR9LCAocGVlcklkLCBlcnIsIGRhdGEpID0+IHtcblx0XHRcdFx0aWYgKGVyciA9PSBudWxsKSB7XG5cdFx0XHRcdFx0cmVzb2x2ZShkYXRhKVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJlamVjdChlcnIpXG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0fSlcblx0XHQudGhlbigoZGF0YSkgPT4ge1xuXHRcdFx0aWYgKGRhdGEgPT09IDIpIHtcblx0XHRcdFx0cmV0dXJuIG5ldyBDb25uZWN0b3JWMih0aGlzKVxuXHRcdFx0fVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgaW5zdGFudGlhdGUgY29ubmVjdG9yJylcblx0XHR9KVxuXHRcdC5jYXRjaCgoZXJyKSA9PiB7XG5cdFx0XHRpZiAoZXJyLmluY2x1ZGVzKFwiTWV0aG9kICdHZXRBUElWZXJzaW9uJyBub3QgZm91bmQgaW4gaW50cm9zcGVjdGlvbiBkYXRhXCIpKSB7XG5cdFx0XHRcdHJldHVybiBuZXcgQ29ubmVjdG9yVjEodGhpcylcblx0XHRcdH1cblx0XHRcdHRocm93IG5ldyBFcnJvcihlcnIpXG5cdFx0fSlcblx0fVxufSgpKVxuIiwiY2xhc3MgU3RvcENvbmRpdGlvbiBleHRlbmRzIEVycm9yIHtcblx0Y29uc3RydWN0b3IgKG1zZykge1xuXHRcdHN1cGVyKG1zZylcblx0XHR0aGlzLm5hbWUgPSAnU3RvcENvbmRpdGlvbidcblx0fVxufVxubW9kdWxlLmV4cG9ydHMgPSBTdG9wQ29uZGl0aW9uXG4iLCIndXNlIHN0cmljdCdcblxuLyoqXG4gKiBDb252ZXJ0IHRpbWUgdG8gbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyBhcyB1c2VkIGluIElFUSBBUElcbiAqIEBwYXJhbSB7b2JqZWN0LHN0cmluZyxkYXRlLG51bWJlcn0gdGltZSAtIHRpbWUgdG8gYmUgZm9ybWF0dGVkXG4gKiBAcmV0dXJuIHtudW1iZXJ9IHRpbWUgLSBpbiBtc1xuICovXG5jb25zdCBmb3JtYXRUaW1lID0gZnVuY3Rpb24gKHRpbWUpIHtcblx0cmV0dXJuIG5ldyBEYXRlKHRpbWUpLmdldFRpbWUoKVxufVxuXG4vKipcbiAqIEdldCB0aW1lIHNhbXBsaW5nIGZyb20gdGltZSByYW5nZS5cbiAqIFNldCBzYW1wbGluZyBpcyBzdHJ1Y3R1cmUgcHJvdmlkZWQgaW4gcGFyYW1ldGVyXG4gKiBAcGFyYW0ge29iamVjdH0gdGltZSAtIHRpbWUgY3JpdGVyaWEgaS5lLiBkZWZpbmluZyByYW5nZVxuICogQHBhcmFtIHtudW1iZXJ9IG1heFNhbXBsZXMgLSBtYXggbnVtYmVyIG9mIHNhbXBsZXMgdG8gYmUgZGlzcGxheWVkXG4gKiBAcmV0dXJuIHtzdHJpbmd9IHRpbWVTYW1wbGluZyAtIGNvbXB1dGVkIHRpbWVTYW1wbGluZ1xuICovXG5jb25zdCBnZXRUaW1lU2FtcGxpbmcgPSBmdW5jdGlvbiAodGltZSwgX21heFNhbXBsZXMpIHtcblx0bGV0IG1heFNhbXBsZXMgPSBfbWF4U2FtcGxlc1xuXHQvLyBkbyBub3RoaW5nIHdpdGhvdXQgdGltZSBiZWluZyBkZWZpbmVkXG5cdGlmICh0aW1lID09IG51bGwpIHtcblx0XHRyZXR1cm4gdW5kZWZpbmVkXG5cdH1cblx0Ly8gZGVmYXVsdCBtYXhTYW1wbGVzXG5cdGlmIChtYXhTYW1wbGVzID09IG51bGwpIHtcblx0XHRtYXhTYW1wbGVzID0gMzAwXG5cdH1cblxuXHQvLyBhc3N1bWUgZGVmYXVsdCB0aW1lLnJhbmdlIGlzIDFcblx0bGV0IHJhbmdlID0gdGltZS5yYW5nZVxuXHRpZiAocmFuZ2UgPT0gbnVsbCkge1xuXHRcdHJhbmdlID0gMVxuXHR9XG5cblx0Ly8gcmFuZ2UgdW5pdCB0byBzZWNvbmRzXG5cdGNvbnN0IHRpbWVJblNlY29uZHMgPSB7XG5cdFx0c2Vjb25kOiAxLFxuXHRcdG1pbnV0ZTogNjAsXG5cdFx0aG91ciAgOiAzNjAwLFxuXHRcdGRheSAgIDogMjQgKiAzNjAwLFxuXHRcdHdlZWsgIDogNyAqIDI0ICogMzYwMCxcblx0XHRtb250aCA6IDMwICogMjQgKiAzNjAwLFxuXHRcdHllYXIgIDogMzY1ICogMjQgKiAzNjAwXG5cdH1cblxuXHQvLyBvcmRlcmVkIHRpbWUgdGhyZXNob2xkc1xuXHRjb25zdCBzYW1wbGluZ1RocmVzaG9sZHMgPSBbXG5cdFx0eyB0aHJlc2g6IG1heFNhbXBsZXMsIHNhbXBsaW5nOiAnU2Vjb25kJyB9LFxuXHRcdHsgdGhyZXNoOiBtYXhTYW1wbGVzICogNjAsIHNhbXBsaW5nOiAnTWludXRlJyB9LFxuXHRcdHsgdGhyZXNoOiBtYXhTYW1wbGVzICogMzYwMCwgc2FtcGxpbmc6ICdIb3VyJyB9LFxuXHRcdHsgdGhyZXNoOiBtYXhTYW1wbGVzICogMjQgKiAzNjAwLCBzYW1wbGluZzogJ0RheScgfSxcblx0XHR7IHRocmVzaDogbWF4U2FtcGxlcyAqIDcgKiAyNCAqIDM2MDAsIHNhbXBsaW5nOiAnV2VlaycgfSxcblx0XHR7IHRocmVzaDogbWF4U2FtcGxlcyAqIDMwICogMjQgKiAzNjAwLCBzYW1wbGluZzogJ01vbnRoJyB9XG5cdF1cblxuXHRsZXQgdGltZVVuaXQgPSB0aW1lLnJhbmdlVW5pdC50b0xvd2VyQ2FzZSgpXG5cdGNvbnN0IGxhc3QgPSB0aW1lVW5pdC5sZW5ndGggLSAxXG5cdC8vIHJlbW92ZSB0cmFpbGluZyAncydcblx0aWYgKHRpbWVVbml0W2xhc3RdID09PSAncycpIHtcblx0XHR0aW1lVW5pdCA9IHRpbWVVbml0LnNsaWNlKDAsIGxhc3QpXG5cdH1cblxuXHRjb25zdCB0aW1lSW5TZWMgPSByYW5nZSAqIHRpbWVJblNlY29uZHNbdGltZVVuaXRdXG5cblx0bGV0IHRpbWVTYW1wbGluZyA9ICdZZWFyJyAvLyBkZWZhdWx0IHNhbXBsaW5nXG5cdC8vIGZpbmQgc21hbGxlc3QgdGhyZXNob2xkIGFib3ZlIHRpbWVTZWMgdG8gZGV0ZXJtaW5lIHNhbXBsaW5nXG5cdHNhbXBsaW5nVGhyZXNob2xkcy5maW5kKChzYW1wbGluZ1RocmVzaG9sZCkgPT4ge1xuXHRcdC8vIHVwZGF0ZSBzYW1wbGluZyB1bnRpbCBmaXJzdCB0aHJlc2hvbGQgYWJvdmUgdGltZVNlY1xuXHRcdHRpbWVTYW1wbGluZyA9IHNhbXBsaW5nVGhyZXNob2xkLnNhbXBsaW5nXG5cdFx0cmV0dXJuIHRpbWVJblNlYyA8IHNhbXBsaW5nVGhyZXNob2xkLnRocmVzaFxuXHR9KVxuXG5cdHJldHVybiB0aW1lU2FtcGxpbmdcbn1cblxuLy8gZXhwb3J0IGZ1bmN0aW9uc1xubW9kdWxlLmV4cG9ydHMgPSB7XG5cdGZvcm1hdFRpbWUsXG5cdGdldFRpbWVTYW1wbGluZ1xufVxuIiwiLypcbiAqIENvcHlyaWdodCA6IFBhcnRuZXJpbmcgMy4wICgyMDA3LTIwMjApXG4gKiBBdXRob3IgOiBQYXJ0bmVyaW5nIFJvYm90aWNzIDxzb2Z0d2FyZUBwYXJ0bmVyaW5nLmZyPlxuICpcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIGRpeWEtc2RrLlxuICpcbiAqIGRpeWEtc2RrIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbiwgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIGRpeWEtc2RrIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlXG4gKiBhbG9uZyB3aXRoIGRpeWEtc2RrLiAgSWYgbm90LCBzZWUgPGh0dHA6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIG1heWEtY2xpZW50XG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQsIFBhcnRuZXJpbmcgUm9ib3RpY3MsIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGxpYnJhcnkgaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yXG4gKiBtb2RpZnkgaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyB2ZXJzaW9uXG4gKlx0My4wIG9mIHRoZSBMaWNlbnNlLiBUaGlzIGxpYnJhcnkgaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGVcbiAqIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuXG4gKiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSXG4gKiBQVVJQT1NFLiBTZWUgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpY1xuICogTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgbGlicmFyeS5cbiAqL1xuXG4ndXNlIHN0cmljdCdcblxuY29uc3QgV2F0Y2hlclYxICA9IHJlcXVpcmUoJy4uL3YxL3dhdGNoZXIuanMnKVxuY29uc3QgZm9ybWF0VGltZSA9IHJlcXVpcmUoJy4uL3RpbWVjb250cm9sLmpzJykuZm9ybWF0VGltZVxuXG5jbGFzcyBDb25uZWN0b3JWMSB7XG5cdGNvbnN0cnVjdG9yIChzZWxlY3Rvcikge1xuXHRcdHRoaXMuc2VsZWN0b3IgPSBzZWxlY3RvclxuXHRcdHRoaXMuZGF0YU1vZGVsID0ge31cblx0XHR0aGlzLl9jb2RlciA9IHNlbGVjdG9yLmVuY29kZSgpXG5cdFx0dGhpcy53YXRjaGVycyA9IFtdXG5cblx0XHQvKiogc3RydWN0dXJlIG9mIGRhdGEgY29uZmlnLiBbXSBtZWFucyBkZWZhdWx0IHZhbHVlICoqKlxuXHRcdFx0IGNyaXRlcmlhIDpcblx0XHRcdCAgIHRpbWU6IGFsbCAzIHRpbWUgY3JpdGVyaWEgc2hvdWxkIG5vdCBiZSBkZWZpbmVkIGF0IHRoZSBzYW1lIHRpbWUuIChyYW5nZSB3b3VsZCBiZSBnaXZlbiB1cCkgW1VzYWdlIDogc3RhcnQgKyBlbmQsIG9yIHN0YXJ0ICsgcmFuZ2UsIG9yIGVuZCArIHJhbmdlXVxuXHRcdFx0ICAgICBzdGFydDoge1tudWxsXSx0aW1lfSAobnVsbCBtZWFucyBtb3N0IHJlY2VudCkgLy8gc3RvcmVkIGEgVVRDIGluIG1zIChudW0pXG5cdFx0XHQgICAgIGVuZDoge1tudWxsXSwgdGltZX0gKG51bGwgbWVhbnMgbW9zdCBvbGRlc3QpIC8vIHN0b3JlZCBhcyBVVEMgaW4gbXMgKG51bSlcblx0XHRcdCAgICAgcmFuZ2U6IHtbbnVsbF0sIHRpbWV9IChyYW5nZSBvZiB0aW1lKHBvc2l0aXZlKSApIC8vIGluIHMgKG51bSlcblx0XHRcdCAgICAgc2FtcGxpbmc6IHtbbnVsbF0gb3IgU3RyaW5nfSBpdCBjb3VsZCBiZSBcInNlY29uZFwiLCBcIm1pbnV0ZVwiLCBcIndlZWtcIiwgXCJtb250aFwiLCBcInllYXJcIiAtIG1heGltaXplZCBzZXJ2ZXIgc2lkZSB0byAxMGsgc2FtcGxlcyBieSBzZWN1cml0eVxuXHRcdFx0ICAgcm9ib3RzOiB7QXJyYXlPZiBJRCBvciBbXCJhbGxcIl19XG5cdFx0XHQgICBwbGFjZXM6IHtBcnJheU9mIElEIG9yIFtcImFsbFwiXX1cblx0XHRcdCBvcGVyYXRvcjoge1tsYXN0XSwgbWF4LCBtb3ksIHNkfSAtIGRlcHJlY2F0ZWRcblx0XHRcdCAuLi5cblxuXHRcdFx0IHNlbnNvcnMgOiB7W251bGxdIG9yIEFycmF5T2YgU2Vuc29yTmFtZX1cblx0XHQqL1xuXHRcdHRoaXMuZGF0YUNvbmZpZyA9IHtcblx0XHRcdGNyaXRlcmlhOiB7XG5cdFx0XHRcdHRpbWU6IHtcblx0XHRcdFx0XHRzdGFydDogbnVsbCxcblx0XHRcdFx0XHRlbmQgIDogbnVsbCxcblx0XHRcdFx0XHRyYW5nZTogbnVsbCAvLyBpbiBzXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHJvYm90czogbnVsbCxcblx0XHRcdFx0cGxhY2VzOiBudWxsXG5cdFx0XHR9LFxuXHRcdFx0b3BlcmF0b3I6ICdsYXN0Jyxcblx0XHRcdHNlbnNvcnMgOiBudWxsLFxuXHRcdFx0c2FtcGxpbmc6IG51bGwgLy8gc2FtcGxpbmdcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpc1xuXHR9XG5cblx0Z2V0VXBkYXRlRGF0YU9iamVjdCAoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHBhdGggICAgIDogJy9mci9wYXJ0bmVyaW5nL0llcScsXG5cdFx0XHRpbnRlcmZhY2U6ICdmci5wYXJ0bmVyaW5nLkllcSdcblx0XHR9XG5cdH1cblxuXHRnZXRDc3ZEYXRhT2JqZWN0ICgpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0cGF0aCAgICAgOiAnL2ZyL3BhcnRuZXJpbmcvSWVxJyxcblx0XHRcdGludGVyZmFjZTogJ2ZyLnBhcnRuZXJpbmcuSWVxJ1xuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiBHZXQgZGF0YU1vZGVsIDpcblx0ICoge1xuXHQgKlx0XCJzZW5zZXVyWFhcIjoge1xuXHQgKlx0XHRcdGRhdGE6W0ZMT0FULCAuLi5dLFxuXHQgKlx0XHRcdHRpbWU6W0ZMT0FULCAuLi5dLFxuXHQgKlx0XHRcdHJvYm90czpbRkxPQVQsIC4uLl0sXG5cdCAqXHRcdFx0cGxhY2VzOltGTE9BVCwgLi4uXSxcblx0ICpcdFx0XHRxdWFsaXR5SW5kZXg6W0ZMT0FULCAuLi5dLFxuXHQgKlx0XHRcdHJhbmdlOiBbRkxPQVQsIEZMT0FUXSxcblx0ICpcdFx0XHR1bml0OiBzdHJpbmcsXG5cdCAqXHRcdGxhYmVsOiBzdHJpbmdcblx0ICpcdFx0fSxcblx0ICpcdCAuLi4gKFwic2Vuc2V1cnNZWVwiKVxuXHQgKiB9XG5cdCAqL1xuXHRnZXREYXRhTW9kZWwgKCkge1xuXHRcdHJldHVybiB0aGlzLmRhdGFNb2RlbFxuXHR9XG5cblx0Z2V0RGF0YVJhbmdlICgpIHtcblx0XHRyZXR1cm4gdGhpcy5kYXRhTW9kZWwucmFuZ2Vcblx0fVxuXG5cdC8qKlxuXHQgKiBAcGFyYW0ge09iamVjdH0gZGF0YUNvbmZpZyBjb25maWcgZm9yIGRhdGEgcmVxdWVzdFxuXHQgKiBpZiBkYXRhQ29uZmlnIGlzIGRlZmluZSA6IHNldCBhbmQgcmV0dXJuIHRoaXNcblx0ICogQHJldHVybiB7SUVRfSB0aGlzXG5cdCAqIGVsc2Vcblx0ICogQHJldHVybiB7T2JqZWN0fSBjdXJyZW50IGRhdGFDb25maWdcblx0ICovXG5cdERhdGFDb25maWcgKG5ld0RhdGFDb25maWcpIHtcblx0XHRpZiAobmV3RGF0YUNvbmZpZyAhPSBudWxsKSB7XG5cdFx0XHR0aGlzLmRhdGFDb25maWcgPSBuZXdEYXRhQ29uZmlnXG5cdFx0XHRyZXR1cm4gdGhpc1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcy5kYXRhQ29uZmlnXG5cdH1cblxuXHQvKipcblx0ICogVE8gQkUgSU1QTEVNRU5URUQgOiBvcGVyYXRvciBtYW5hZ2VtZW50IGluIEROLUlFUVxuXHQgKiBAcGFyYW0gIHtTdHJpbmd9XHQgbmV3T3BlcmF0b3IgOiB7W2xhc3RdLCBtYXgsIG1veSwgc2R9XG5cdCAqIEByZXR1cm4ge0lFUX0gdGhpcyAtIGNoYWluYWJsZVxuXHQgKiBTZXQgb3BlcmF0b3IgY3JpdGVyaWEuXG5cdCAqIERlcGVuZHMgb24gbmV3T3BlcmF0b3Jcblx0ICogQHBhcmFtIHtTdHJpbmd9IG5ld09wZXJhdG9yXG5cdCAqIEByZXR1cm4gdGhpc1xuXHQgKiBHZXQgb3BlcmF0b3IgY3JpdGVyaWEuXG5cdCAqIEByZXR1cm4ge1N0cmluZ30gb3BlcmF0b3Jcblx0ICovXG5cdERhdGFPcGVyYXRvciAobmV3T3BlcmF0b3IpIHtcblx0XHRpZiAobmV3T3BlcmF0b3IgIT0gbnVsbCkge1xuXHRcdFx0dGhpcy5kYXRhQ29uZmlnLm9wZXJhdG9yID0gbmV3T3BlcmF0b3Jcblx0XHRcdHJldHVybiB0aGlzXG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLmRhdGFDb25maWcub3BlcmF0b3Jcblx0fVxuXG5cdC8qKlxuXHQgKiBEZXBlbmRzIG9uIG51bVNhbXBsZXNcblx0ICogQHBhcmFtIHtpbnR9IG51bWJlciBvZiBzYW1wbGVzIGluIGRhdGFNb2RlbFxuXHQgKiBpZiBkZWZpbmVkIDogc2V0IG51bWJlciBvZiBzYW1wbGVzXG5cdCAqIEByZXR1cm4ge0lFUX0gdGhpc1xuXHQgKiBlbHNlXG5cdCAqIEByZXR1cm4ge2ludH0gbnVtYmVyIG9mIHNhbXBsZXNcblx0ICovXG5cdERhdGFTYW1wbGluZyAobnVtU2FtcGxlcykge1xuXHRcdGlmIChudW1TYW1wbGVzICE9IG51bGwpIHtcblx0XHRcdHRoaXMuZGF0YUNvbmZpZy5zYW1wbGluZyA9IG51bVNhbXBsZXNcblx0XHRcdHJldHVybiB0aGlzXG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLmRhdGFDb25maWcuc2FtcGxpbmdcblx0fVxuXG5cdC8qKlxuXHQgKiBTZXQgb3IgZ2V0IGRhdGEgdGltZSBjcml0ZXJpYSBzdGFydCBhbmQgZW5kLlxuXHQgKiBJZiBwYXJhbSBkZWZpbmVkXG5cdCAqIEBwYXJhbSB7RGF0ZX0gbmV3VGltZVN0YXJ0IC8vIG1heSBiZSBudWxsXG5cdCAqIEBwYXJhbSB7RGF0ZX0gbmV3VGltZUVuZCAvLyBtYXkgYmUgbnVsbFxuXHQgKiBAcmV0dXJuIHtJRVF9IHRoaXNcblx0ICogSWYgbm8gcGFyYW0gZGVmaW5lZDpcblx0ICogQHJldHVybiB7T2JqZWN0fSBUaW1lIG9iamVjdDogZmllbGRzIHN0YXJ0IGFuZCBlbmQuXG5cdCAqL1xuXHREYXRhVGltZSAobmV3VGltZVN0YXJ0LCBuZXdUaW1lRW5kLCBuZXdSYW5nZSkge1xuXHRcdGlmIChuZXdUaW1lU3RhcnQgIT0gbnVsbCB8fCBuZXdUaW1lRW5kICE9IG51bGwgfHwgbmV3UmFuZ2UgIT0gbnVsbCkge1xuXHRcdFx0dGhpcy5kYXRhQ29uZmlnLmNyaXRlcmlhLnRpbWUuc3RhcnQgPSBmb3JtYXRUaW1lKG5ld1RpbWVTdGFydClcblx0XHRcdHRoaXMuZGF0YUNvbmZpZy5jcml0ZXJpYS50aW1lLmVuZCA9IGZvcm1hdFRpbWUobmV3VGltZUVuZClcblx0XHRcdHRoaXMuZGF0YUNvbmZpZy5jcml0ZXJpYS50aW1lLnJhbmdlID0gbmV3UmFuZ2Vcblx0XHRcdHJldHVybiB0aGlzXG5cdFx0fVxuXHRcdHJldHVybiB7XG5cdFx0XHRzdGFydDogbmV3IERhdGUodGhpcy5kYXRhQ29uZmlnLmNyaXRlcmlhLnRpbWUuc3RhcnQpLFxuXHRcdFx0ZW5kICA6IG5ldyBEYXRlKHRoaXMuZGF0YUNvbmZpZy5jcml0ZXJpYS50aW1lLmVuZCksXG5cdFx0XHRyYW5nZTogbmV3IERhdGUodGhpcy5kYXRhQ29uZmlnLmNyaXRlcmlhLnRpbWUucmFuZ2UpXG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqIERlcGVuZHMgb24gcm9ib3RJZHNcblx0ICogU2V0IHJvYm90cyBjcml0ZXJpYS5cblx0ICogQHBhcmFtIHtBcnJheVtJbnRdfSByb2JvdElkcyBsaXN0IG9mIHJvYm90cyBJZHNcblx0ICogR2V0IHJvYm90cyBjcml0ZXJpYS5cblx0ICogQHJldHVybiB7QXJyYXlbSW50XX0gbGlzdCBvZiByb2JvdHMgSWRzXG5cdCAqL1xuXHREYXRhUm9ib3RJZHMgKHJvYm90SWRzKSB7XG5cdFx0aWYgKHJvYm90SWRzICE9IG51bGwpIHtcblx0XHRcdHRoaXMuZGF0YUNvbmZpZy5jcml0ZXJpYS5yb2JvdHMgPSByb2JvdElkc1xuXHRcdFx0cmV0dXJuIHRoaXNcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXMuZGF0YUNvbmZpZy5jcml0ZXJpYS5yb2JvdHNcblx0fVxuXG5cdC8qKlxuXHQgKiBEZXBlbmRzIG9uIHBsYWNlSWRzXG5cdCAqIFNldCBwbGFjZXMgY3JpdGVyaWEuXG5cdCAqIEBwYXJhbSB7QXJyYXlbSW50XX0gcGxhY2VJZHMgbGlzdCBvZiBwbGFjZXMgSWRzXG5cdCAqIEdldCBwbGFjZXMgY3JpdGVyaWEuXG5cdCAqIEByZXR1cm4ge0FycmF5W0ludF19IGxpc3Qgb2YgcGxhY2VzIElkc1xuXHQgKi9cblx0RGF0YVBsYWNlSWRzIChwbGFjZUlkcykge1xuXHRcdGlmIChwbGFjZUlkcyAhPSBudWxsKSB7XG5cdFx0XHR0aGlzLmRhdGFDb25maWcuY3JpdGVyaWEucGxhY2VJZCA9IHBsYWNlSWRzXG5cdFx0XHRyZXR1cm4gdGhpc1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcy5kYXRhQ29uZmlnLmNyaXRlcmlhLnBsYWNlc1xuXHR9XG5cblx0LyoqXG5cdCAqIEdldCBkYXRhIGJ5IHNlbnNvciBuYW1lLlxuXHQgKiBAcGFyYW0ge0FycmF5W1N0cmluZ119IHNlbnNvck5hbWUgbGlzdCBvZiBzZW5zb3JzXG5cdCAqL1xuXHRnZXREYXRhQnlOYW1lIChzZW5zb3JOYW1lcykge1xuXHRcdGNvbnN0IGRhdGEgPSBbXVxuXHRcdGZvciAoY29uc3QgbiBpbiBzZW5zb3JOYW1lcykge1xuXHRcdFx0ZGF0YS5wdXNoKHRoaXMuZGF0YU1vZGVsW3NlbnNvck5hbWVzW25dXSlcblx0XHR9XG5cdFx0cmV0dXJuIGRhdGFcblx0fVxuXG5cdC8qKlxuXHQgKiBVcGRhdGUgZGF0YSBnaXZlbiBkYXRhQ29uZmlnLlxuXHQgKiBAcGFyYW0ge2Z1bmN9IGNhbGxiYWNrIDogY2FsbGVkIGFmdGVyIHVwZGF0ZVxuXHQgKiBAcGFyYW0ge29iamVjdH0gZGF0YUNvbmZpZzogZGF0YSB0byBjb25maWcgcmVxdWVzdFxuXHQgKiBUT0RPIFVTRSBQUk9NSVNFXG5cdCAqL1xuXHR1cGRhdGVEYXRhIChjYWxsYmFjaywgZGF0YUNvbmZpZykge1xuXHRcdHRoaXMuX3VwZGF0ZURhdGEoY2FsbGJhY2ssIGRhdGFDb25maWcsICdEYXRhUmVxdWVzdCcpXG5cdH1cblxuXHQvKipcblx0ICogVXBkYXRlIGRhdGEgZ2l2ZW4gZGF0YUNvbmZpZy5cblx0ICogQHBhcmFtIHtmdW5jfSBjYWxsYmFjayA6IGNhbGxlZCBhZnRlciB1cGRhdGVcblx0ICogQHBhcmFtIHtvYmplY3R9IGRhdGFDb25maWc6IGRhdGEgdG8gY29uZmlnIHJlcXVlc3Rcblx0ICogQHBhcmFtIHtzdHJpbmd9IGZ1bmNOYW1lOiBuYW1lIG9mIHJlcXVlc3RlZCBmdW5jdGlvbiBpbiBkaXlhLW5vZGUtaWVxLiBEZWZhdWx0OiBcIkRhdGFSZXF1ZXN0XCIuXG5cdCAqIFRPRE8gVVNFIFBST01JU0Vcblx0ICovXG5cdF91cGRhdGVEYXRhIChjYWxsYmFjaywgZGF0YUNvbmZpZywgZnVuY05hbWUpIHtcblx0XHRpZiAoZGF0YUNvbmZpZykge1xuXHRcdFx0dGhpcy5EYXRhQ29uZmlnKGRhdGFDb25maWcpXG5cdFx0fVxuXHRcdHRoaXMuc2VsZWN0b3IucmVxdWVzdCh7XG5cdFx0XHRzZXJ2aWNlOiAnaWVxJyxcblx0XHRcdGZ1bmMgICA6IGZ1bmNOYW1lLFxuXHRcdFx0ZGF0YSAgIDogeyBkYXRhOiBKU09OLnN0cmluZ2lmeSh0aGlzLmRhdGFDb25maWcpIH0sXHRcdC8vXHR0eXBlOlwic3BsUmVxXCIsXG5cdFx0XHRvYmogICAgOiB0aGlzLmdldFVwZGF0ZURhdGFPYmplY3QoKVxuXHRcdH0sIChkbklkLCBlcnIsIF9kYXRhKSA9PiB7XG5cdFx0XHRjb25zdCBkYXRhID0gSlNPTi5wYXJzZShfZGF0YSlcblx0XHRcdGlmIChlcnIgIT0gbnVsbCkge1xuXHRcdFx0XHRpZiAodHlwZW9mIGVyciA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIGVyci5uYW1lID09PSAnc3RyaW5nJykge1xuXHRcdFx0XHRcdGNhbGxiYWNrKG51bGwsIGVyci5uYW1lKVxuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y2FsbGJhY2sodGhpcy5fZ2V0RGF0YU1vZGVsRnJvbVJlY3YoZGF0YSkpIC8vIGNhbGxiYWNrIGZ1bmNcblx0XHR9KVxuXHR9XG5cblx0Z2V0Q29uZmluZW1lbnRMZXZlbCAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuY29uZmluZW1lbnRcblx0fVxuXG5cdGdldEFpclF1YWxpdHlMZXZlbCAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuYWlyUXVhbGl0eVxuXHR9XG5cblx0Z2V0RW52UXVhbGl0eUxldmVsICgpIHtcblx0XHRyZXR1cm4gdGhpcy5lbnZRdWFsaXR5XG5cdH1cblxuXHQvKipcblx0ICogVXBkYXRlIGludGVybmFsIG1vZGVsIHdpdGggcmVjZWl2ZWQgZGF0YVxuXHQgKiBAcGFyYW0gIGNvbmZpZyBkYXRhIHRvIGNvbmZpZ3VyZSBzdWJzY3JpcHRpb25cblx0ICogQHBhcmFtICBjYWxsYmFjayBjYWxsZWQgb24gYW5zd2VycyAoQHBhcmFtIDogZGF0YU1vZGVsKVxuXHQgKiBAcmV0dXJuIHdhdGNoZXIgY3JlYXRlZCB3YXRjaGVyXG5cdCAqL1xuXHR3YXRjaCAoY29uZmlnLCBjYWxsYmFjaykge1xuXHRcdC8vIGRvIG5vdCBjcmVhdGUgd2F0Y2hlciB3aXRob3V0IGEgY2FsbGJhY2tcblx0XHRpZiAoY2FsbGJhY2sgPT0gbnVsbCB8fCB0eXBlb2YgY2FsbGJhY2sgIT09ICdmdW5jdGlvbicpIHtcblx0XHRcdHJldHVybiBudWxsXG5cdFx0fVxuXG5cdFx0Y29uc3Qgd2F0Y2hlciA9IHRoaXMuY3JlYXRlV2F0Y2hlcihjb25maWcpXG5cblx0XHQvLyBhZGQgd2F0Y2hlciBpbiB3YXRjaGVyIGxpc3Rcblx0XHR0aGlzLndhdGNoZXJzLnB1c2god2F0Y2hlcilcblxuXHRcdHdhdGNoZXIub24oJ2RhdGEnLCAoZGF0YSkgPT4ge1xuXHRcdFx0Y2FsbGJhY2sodGhpcy5fZ2V0RGF0YU1vZGVsRnJvbVJlY3YoZGF0YSkpXG5cdFx0fSlcblx0XHR3YXRjaGVyLm9uKCdzdG9wJywgdGhpcy5fcmVtb3ZlV2F0Y2hlcilcblxuXHRcdHJldHVybiB3YXRjaGVyXG5cdH1cblxuXHRjcmVhdGVXYXRjaGVyIChjb25maWcpIHtcblx0XHRyZXR1cm4gbmV3IFdhdGNoZXJWMSh0aGlzLnNlbGVjdG9yLCBjb25maWcpXG5cdH1cblxuXHQvKipcblx0ICogQ2FsbGJhY2sgdG8gcmVtb3ZlIHdhdGNoZXIgZnJvbSBsaXN0XG5cdCAqIEBwYXJhbSB3YXRjaGVyIHRvIGJlIHJlbW92ZWRcblx0ICovXG5cdF9yZW1vdmVXYXRjaGVyICh3YXRjaGVyKSB7XG5cdFx0Ly8gZmluZCBhbmQgcmVtb3ZlIHdhdGNoZXIgaW4gbGlzdFxuXHRcdHRoaXMud2F0Y2hlcnMuZmluZCgoZWwsIGlkLCB3YXRjaGVycykgPT4ge1xuXHRcdFx0aWYgKHdhdGNoZXIgPT09IGVsKSB7XG5cdFx0XHRcdHdhdGNoZXJzLnNwbGljZShpZCwgMSkgLy8gcmVtb3ZlXG5cdFx0XHRcdHJldHVybiB0cnVlXG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZmFsc2Vcblx0XHR9KVxuXHR9XG5cblx0LyoqXG5cdCAqIFN0b3AgYWxsIHdhdGNoZXJzXG5cdCAqL1xuXHRjbG9zZVN1YnNjcmlwdGlvbnMgKCkge1xuXHRcdGNvbnNvbGUud2FybignRGVwcmVjYXRlZCBmdW5jdGlvbiB1c2Ugc3RvcFdhdGNoZXJzIGluc3RlYWQnKVxuXHRcdHRoaXMuc3RvcFdhdGNoZXJzKClcblx0fVxuXG5cdHN0b3BXYXRjaGVycyAoKSB7XG5cdFx0dGhpcy53YXRjaGVycy5mb3JFYWNoKCh3YXRjaGVyKSA9PiB7XG5cdFx0XHQvLyByZW1vdmUgbGlzdGVuZXIgb24gc3RvcCBldmVudCB0byBhdm9pZCBwdXJnaW5nIHdhdGNoZXJzIHR3aWNlXG5cdFx0XHR3YXRjaGVyLnJlbW92ZUxpc3RlbmVyKCdzdG9wJywgdGhpcy5fcmVtb3ZlV2F0Y2hlcilcblx0XHRcdHdhdGNoZXIuc3RvcCgpXG5cdFx0fSlcblx0XHR0aGlzLndhdGNoZXJzID0gW11cblx0fVxuXG5cdC8qKlxuXHQgKiBSZXF1ZXN0IERhdGEgdG8gbWFrZSBDU1YgZmlsZVxuXHQgKiBAcGFyYW0ge29iamVjdH0gY3N2Q29uZmlnIHBhcmFtczpcblx0ICogQHBhcmFtIHtsaXN0fSBjc3ZDb25maWcuc2Vuc29yTmFtZXMgOiBsaXN0IG9mIHNlbnNvciBhbmQgaW5kZXggbmFtZXNcblx0ICogQHBhcmFtIHtudW1iZXJ9IGNzdkNvbmZpZy5fc3RhcnRUaW1lOiB0aW1lc3RhbXAgb2YgYmVnaW5uaW5nIHRpbWVcblx0ICogQHBhcmFtIHtudW1iZXJ9IGNzdkNvbmZpZy5fZW5kVGltZTogdGltZXN0YW1wIG9mIGVuZCB0aW1lXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBjc3ZDb25maWcudGltZVNhbXBsZTogdGltZWludGVydmFsIGZvciBkYXRhLiBQYXJhbWV0ZXJzOiBcInNlY29uZFwiLCBcIm1pbnV0ZVwiLCBcImhvdXJcIiwgXCJkYXlcIiwgXCJ3ZWVrXCIsIFwibW9udGhcIlxuXHQgKiBAcGFyYW0ge251bWJlcn0gY3N2Q29uZmlnLl9ubGluZXM6IG1heGltdW0gbnVtYmVyIG9mIGxpbmVzIHJlcXVlc3RlZFxuXHQgKiBAcGFyYW0ge2NhbGxiYWNrfSBjYWxsYmFjazogY2FsbGVkIGFmdGVyIHVwZGF0ZSAoQHBhcmFtIHVybCB0byBkb3dubG9hZCBjc3YgZmlsZSlcblx0ICovXG5cdGdldENTVkRhdGEgKF9jc3ZDb25maWcsIGNhbGxiYWNrKSB7XG5cdFx0Y29uc3QgY3N2Q29uZmlnID0gX2NzdkNvbmZpZ1xuXHRcdGlmIChjc3ZDb25maWcgJiYgdHlwZW9mIGNzdkNvbmZpZy5ubGluZXMgIT09ICdudW1iZXInKSB7XG5cdFx0XHRjc3ZDb25maWcubmxpbmVzID0gdW5kZWZpbmVkXG5cdFx0fVxuXHRcdGlmIChjc3ZDb25maWcgJiYgdHlwZW9mIGNzdkNvbmZpZy5sYW5nICE9PSAnc3RyaW5nJykge1xuXHRcdFx0Y3N2Q29uZmlnLmxhbmcgPSB1bmRlZmluZWRcblx0XHR9XG5cblx0XHRjb25zdCBkYXRhQ29uZmlnID0gSlNPTi5zdHJpbmdpZnkoe1xuXHRcdFx0Y3JpdGVyaWE6IHtcblx0XHRcdFx0dGltZSAgOiB7IHN0YXJ0OiBmb3JtYXRUaW1lKGNzdkNvbmZpZy5zdGFydFRpbWUpLCBlbmQ6IGZvcm1hdFRpbWUoY3N2Q29uZmlnLmVuZFRpbWUpLCBzYW1wbGluZzogY3N2Q29uZmlnLnRpbWVTYW1wbGUgfSxcblx0XHRcdFx0cGxhY2VzOiBbXSxcblx0XHRcdFx0cm9ib3RzOiBbXVxuXHRcdFx0fSxcblx0XHRcdHNlbnNvcnMgOiBjc3ZDb25maWcuc2Vuc29yTmFtZXMsXG5cdFx0XHRzYW1wbGluZzogY3N2Q29uZmlnLm5saW5lcyxcblx0XHRcdGxhbmcgICAgOiBjc3ZDb25maWcubGFuZ1xuXHRcdH0pXG5cblx0XHR0aGlzLnNlbGVjdG9yLnJlcXVlc3Qoe1xuXHRcdFx0c2VydmljZTogJ2llcScsXG5cdFx0XHRmdW5jICAgOiAnQ3N2RGF0YVJlcXVlc3QnLFxuXHRcdFx0ZGF0YSAgIDogeyBkYXRhOiBkYXRhQ29uZmlnIH0sXG5cdFx0XHQvL1x0dHlwZTpcInNwbFJlcVwiLFxuXHRcdFx0b2JqICAgIDogdGhpcy5nZXRDc3ZEYXRhT2JqZWN0KClcblx0XHR9LCAoZG5JZCwgZXJyLCBkYXRhKSA9PiB7XG5cdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdGlmICh0eXBlb2YgZXJyID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgZXJyLm5hbWUgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2sobnVsbCwgZXJyLm5hbWUpXG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjYWxsYmFjayhkYXRhKVxuXHRcdH0pXG5cdH1cblxuXHQvKipcblx0ICogUmVxdWVzdCBEYXRhIHRvIG1ha2UgZGF0YSBtYXBcblx0ICogQHBhcmFtIHtPYmplY3R9IGRhdGFDb25maWcgY29uZmlnIGZvciBkYXRhIHJlcXVlc3Rcblx0ICogQHBhcmFtIHtjYWxsYmFja30gY2FsbGJhY2s6IGNhbGxlZCBhZnRlciB1cGRhdGVcblx0ICovXG5cdGdldERhdGFNYXBEYXRhIChkYXRhQ29uZmlnLCBjYWxsYmFjaykge1xuXHRcdGNvbnNvbGUud2FybignVGhpcyBmdW5jdGlvbiB3aWxsIGJlIGRlcHJlY2F0ZWQuIFBsZWFzZSB1c2UgXCJnZXRJZXFEYXRhXCIgaW5zdGVhZC4nKVxuXHRcdHRoaXMuZ2V0SWVxRGF0YShkYXRhQ29uZmlnLCBjYWxsYmFjaylcblx0fVxuXG5cdC8qKlxuXHQgKiBSZXF1ZXN0IEllcSBEYXRhICh1c2VkIGZvciBleGFtcGxlIHRvIG1ha2UgaGVhdG1hcClcblx0ICogQHBhcmFtIHtPYmplY3R9IGRhdGFDb25maWcgY29uZmlnIGZvciBkYXRhIHJlcXVlc3Rcblx0ICogQHBhcmFtIHtjYWxsYmFja30gY2FsbGJhY2s6IGNhbGxlZCBhZnRlciB1cGRhdGVcblx0ICovXG5cdGdldEllcURhdGEgKGRhdGFDb25maWcsIGNhbGxiYWNrKSB7XG5cdFx0dGhpcy5fdXBkYXRlRGF0YShjYWxsYmFjaywgZGF0YUNvbmZpZywgJ0RhdGFSZXF1ZXN0Jylcblx0fVxuXG5cdC8qKlxuXHQgKiBSZXF1ZXN0IERhdGEgdG8gbWFrZSBoZWF0bWFwXG5cdCAqIEBwYXJhbSB7bGlzdH0gc2Vuc29yTmFtZXMgOiBsaXN0IG9mIHNlbnNvciBhbmQgaW5kZXggbmFtZXNcblx0ICogQHBhcmFtIHtvYmplY3R9IHRpbWU6IG9iamVjdCBjb250YWluaW5nIHRpbWVzdGFtcHMgZm9yIGJlZ2luIGFuZCBlbmQgb2YgZGF0YSBmb3IgaGVhdG1hcFxuXHQgKiBAcGFyYW0ge3N0cmluZ30gc2FtcGxlOiB0aW1laW50ZXJ2YWwgZm9yIGRhdGEuIFBhcmFtZXRlcnM6IFwic2Vjb25kXCIsIFwibWludXRlXCIsIFwiaG91clwiLCBcImRheVwiLCBcIndlZWtcIiwgXCJtb250aFwiXG5cdCAqIEBwYXJhbSB7Y2FsbGJhY2t9IGNhbGxiYWNrOiBjYWxsZWQgYWZ0ZXIgdXBkYXRlXG5cdCAqIEBkZXByZWNhdGVkIFdpbGwgYmUgZGVwcmVjYXRlZCBpbiBmdXR1cmUgdmVyc2lvbi4gUGxlYXNlIHVzZSBcImdldERhdGFNYXBEYXRhXCIgaW5zdGVhZC5cblx0ICovXG5cdGdldEhlYXRNYXBEYXRhIChzZW5zb3JOYW1lcywgdGltZSwgc2FtcGxlLCBjYWxsYmFjaykge1xuXHRcdGNvbnN0IGRhdGFDb25maWcgPSB7XG5cdFx0XHRjcml0ZXJpYToge1xuXHRcdFx0XHR0aW1lICA6IHsgc3RhcnQ6IGZvcm1hdFRpbWUodGltZS5zdGFydEVwb2NoKSwgZW5kOiBmb3JtYXRUaW1lKHRpbWUuZW5kRXBvY2gpLCBzYW1wbGluZzogc2FtcGxlIH0sXG5cdFx0XHRcdHBsYWNlczogW10sXG5cdFx0XHRcdHJvYm90czogW11cblx0XHRcdH0sXG5cdFx0XHRzZW5zb3JzOiBzZW5zb3JOYW1lc1xuXHRcdH1cblx0XHRjb25zb2xlLndhcm4oJ1RoaXMgZnVuY3Rpb24gd2lsbCBiZSBkZXByZWNhdGVkLiBQbGVhc2UgdXNlIFwiZ2V0SWVxRGF0YVwiIGluc3RlYWQuJylcblx0XHQvLyB0aGlzLmdldERhdGFNYXBEYXRhKGRhdGFDb25maWcsIGNhbGxiYWNrKVxuXHRcdHRoaXMuZ2V0SWVxRGF0YShkYXRhQ29uZmlnLCBjYWxsYmFjaylcblx0fVxuXG5cdC8qKlxuXHQgKiBVcGRhdGUgaW50ZXJuYWwgbW9kZWwgd2l0aCByZWNlaXZlZCBkYXRhXG5cdCAqIEBwYXJhbSAge09iamVjdH0gZGF0YSBkYXRhIHJlY2VpdmVkIGZyb20gRGl5YU5vZGUgYnkgd2Vic29ja2V0XG5cdCAqIEByZXR1cm4ge1t0eXBlXX1cdFx0W2Rlc2NyaXB0aW9uXVxuXHQgKi9cblx0X2dldERhdGFNb2RlbEZyb21SZWN2IChkYXRhKSB7XG5cdFx0bGV0IGRhdGFNb2RlbCA9IG51bGxcblx0XHRpZiAoZGF0YSAhPSBudWxsKSB7XG5cdFx0XHRmb3IgKGNvbnN0IG4gaW4gZGF0YSkge1xuXHRcdFx0XHRpZiAobiAhPT0gJ2hlYWRlcicgJiYgbiAhPT0gJ2VycicpIHtcblx0XHRcdFx0XHRpZiAoZGF0YVtuXS5lcnIgIT0gbnVsbCAmJiBkYXRhW25dLmVyci5zdCA+IDApIHtcblx0XHRcdFx0XHRcdGNvbnRpbnVlXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCFkYXRhTW9kZWwpIHtcblx0XHRcdFx0XHRcdGRhdGFNb2RlbCA9IHt9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCFkYXRhTW9kZWxbbl0pIHtcblx0XHRcdFx0XHRcdGRhdGFNb2RlbFtuXSA9IHt9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdC8qIHVwZGF0ZSBkYXRhIGlkICovXG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLmlkID0gblxuXHRcdFx0XHRcdC8qIHVwZGF0ZSBkYXRhIGFic29sdXRlIHJhbmdlICovXG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnJhbmdlID0gZGF0YVtuXS5yYW5nZVxuXHRcdFx0XHRcdC8qIHVwZGF0ZSBkYXRhIHJhbmdlICovXG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnRpbWVSYW5nZSA9IGRhdGFbbl0udGltZVJhbmdlXG5cdFx0XHRcdFx0LyogdXBkYXRlIGRhdGEgbGFiZWwgKi9cblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0ubGFiZWwgPSBkYXRhW25dLmxhYmVsXG5cdFx0XHRcdFx0LyogdXBkYXRlIGRhdGEgdW5pdCAqL1xuXHRcdFx0XHRcdGRhdGFNb2RlbFtuXS51bml0ID0gZGF0YVtuXS51bml0XG5cdFx0XHRcdFx0LyogdXBkYXRlIGRhdGEgcHJlY2lzaW9uICovXG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnByZWNpc2lvbiA9IGRhdGFbbl0ucHJlY2lzaW9uXG5cdFx0XHRcdFx0LyogdXBkYXRlIGRhdGEgY2F0ZWdvcmllcyAqL1xuXHRcdFx0XHRcdGRhdGFNb2RlbFtuXS5jYXRlZ29yeSA9IGRhdGFbbl0uY2F0ZWdvcnlcblx0XHRcdFx0XHQvKiBzdWdnZXN0ZWQgeSBkaXNwbGF5IHJhbmdlICovXG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnpvb21SYW5nZSA9IFswLCAxMDBdXG5cdFx0XHRcdFx0Ly8gdXBkYXRlIHNlbnNvciBjb25mb3J0IHJhbmdlXG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLmNvbmZvcnRSYW5nZSA9IGRhdGFbbl0uY29uZm9ydFJhbmdlXG5cblx0XHRcdFx0XHQvKiB1cGRhdGUgZGF0YSBpbmRleFJhbmdlICovXG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnF1YWxpdHlDb25maWcgPSB7IGluZGV4UmFuZ2U6IGRhdGFbbl0uaW5kZXhSYW5nZSB9XG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnRpbWUgPSB0aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0udGltZSwgJ2I2NCcsIDgpXG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLmRhdGEgPSBkYXRhW25dLmRhdGEgIT0gbnVsbFxuXHRcdFx0XHRcdFx0PyB0aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0uZGF0YSwgJ2I2NCcsIDQpXG5cdFx0XHRcdFx0XHQ6IGRhdGFbbl0uYXZnICE9IG51bGxcblx0XHRcdFx0XHRcdCAgID8gdGhpcy5fY29kZXIuZnJvbShkYXRhW25dLmF2Zy5kLCAnYjY0JywgNClcblx0XHRcdFx0XHRcdCAgIDogbnVsbFxuXHRcdFx0XHRcdGRhdGFNb2RlbFtuXS5xdWFsaXR5SW5kZXggPSBkYXRhW25dLmRhdGEgIT0gbnVsbFxuXHRcdFx0XHRcdFx0PyB0aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0uaW5kZXgsICdiNjQnLCA0KVxuXHRcdFx0XHRcdFx0OiBkYXRhW25dLmF2ZyAhPSBudWxsXG5cdFx0XHRcdFx0XHQgICA/IHRoaXMuX2NvZGVyLmZyb20oZGF0YVtuXS5hdmcuaSwgJ2I2NCcsIDQpXG5cdFx0XHRcdFx0XHQgICA6IG51bGxcblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0ucm9ib3RJZCA9IHRoaXMuX2NvZGVyLmZyb20oZGF0YVtuXS5yb2JvdElkLCAnYjY0JywgNClcblx0XHRcdFx0XHRpZiAoZGF0YU1vZGVsW25dLnJvYm90SWQgIT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0LyoqIGRpY28gcm9ib3RJZCAtPiByb2JvdE5hbWUgKiAqL1xuXHRcdFx0XHRcdFx0Y29uc3QgZGljb1JvYm90ID0ge31cblx0XHRcdFx0XHRcdGRhdGEuaGVhZGVyLnJvYm90cy5mb3JFYWNoKChlbCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRkaWNvUm9ib3RbZWwuaWRdID0gZWwubmFtZVxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdGRhdGFNb2RlbFtuXS5yb2JvdElkID0gZGF0YU1vZGVsW25dLnJvYm90SWQubWFwKChlbCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gZGljb1JvYm90W2VsXVxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0ucGxhY2VJZCA9IHRoaXMuX2NvZGVyLmZyb20oZGF0YVtuXS5wbGFjZUlkLCAnYjY0JywgNClcblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0ueCA9IG51bGxcblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0ueSA9IG51bGxcblxuXHRcdFx0XHRcdGlmIChkYXRhW25dLmF2ZyAhPSBudWxsKSB7XG5cdFx0XHRcdFx0XHRkYXRhTW9kZWxbbl0uYXZnID0ge1xuXHRcdFx0XHRcdFx0XHRkOiB0aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0uYXZnLmQsICdiNjQnLCA0KSxcblx0XHRcdFx0XHRcdFx0aTogdGhpcy5fY29kZXIuZnJvbShkYXRhW25dLmF2Zy5pLCAnYjY0JywgNClcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGRhdGFbbl0ubWluICE9IG51bGwpIHtcblx0XHRcdFx0XHRcdGRhdGFNb2RlbFtuXS5taW4gPSB7XG5cdFx0XHRcdFx0XHRcdGQ6IHRoaXMuX2NvZGVyLmZyb20oZGF0YVtuXS5taW4uZCwgJ2I2NCcsIDQpLFxuXHRcdFx0XHRcdFx0XHRpOiB0aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0ubWluLmksICdiNjQnLCA0KVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoZGF0YVtuXS5tYXggIT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0ZGF0YU1vZGVsW25dLm1heCA9IHtcblx0XHRcdFx0XHRcdFx0ZDogdGhpcy5fY29kZXIuZnJvbShkYXRhW25dLm1heC5kLCAnYjY0JywgNCksXG5cdFx0XHRcdFx0XHRcdGk6IHRoaXMuX2NvZGVyLmZyb20oZGF0YVtuXS5tYXguaSwgJ2I2NCcsIDQpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChkYXRhW25dLnN0ZGRldiAhPSBudWxsKSB7XG5cdFx0XHRcdFx0XHRkYXRhTW9kZWxbbl0uc3RkZGV2ID0ge1xuXHRcdFx0XHRcdFx0XHRkOiB0aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0uc3RkZGV2LmQsICdiNjQnLCA0KSxcblx0XHRcdFx0XHRcdFx0aTogdGhpcy5fY29kZXIuZnJvbShkYXRhW25dLnN0ZGRldi5pLCAnYjY0JywgNClcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGRhdGFbbl0uc3RkZGV2ICE9IG51bGwpIHtcblx0XHRcdFx0XHRcdGRhdGFNb2RlbFtuXS5zdGRkZXYgPSB7XG5cdFx0XHRcdFx0XHRcdGQ6IHRoaXMuX2NvZGVyLmZyb20oZGF0YVtuXS5zdGRkZXYuZCwgJ2I2NCcsIDQpLFxuXHRcdFx0XHRcdFx0XHRpOiB0aGlzLl9jb2Rlci5mcm9tKGRhdGFbbl0uc3RkZGV2LmksICdiNjQnLCA0KVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoZGF0YVtuXS54ICE9IG51bGwpIHtcblx0XHRcdFx0XHRcdGRhdGFNb2RlbFtuXS54ID0gdGhpcy5fY29kZXIuZnJvbShkYXRhW25dLngsICdiNjQnLCA0KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoZGF0YVtuXS55ICE9IG51bGwpIHtcblx0XHRcdFx0XHRcdGRhdGFNb2RlbFtuXS55ID0gdGhpcy5fY29kZXIuZnJvbShkYXRhW25dLnksICdiNjQnLCA0KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQvKipcblx0XHRcdFx0XHQgKiBjdXJyZW50IHF1YWxpdHkgOiB7J2InYWQsICdtJ2VkaXVtLCAnZydvb2R9XG5cdFx0XHRcdFx0ICogZXZvbHV0aW9uIDogeyd1J3AsICdkJ293biwgJ3MndGFibGV9XG5cdFx0XHRcdFx0ICogZXZvbHV0aW9uIHF1YWxpdHkgOiB7J2InZXR0ZXIsICd3J29yc2UsICdzJ2FtZX1cblx0XHRcdFx0XHQgKi9cblx0XHRcdFx0XHQvLyAvIFRPRE9cblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0udHJlbmQgPSAnbXNzJ1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHRcdC8qKiBsaXN0IHJvYm90cyAqICovXG5cdFx0dGhpcy5kYXRhTW9kZWwgPSBkYXRhTW9kZWxcblx0XHRyZXR1cm4gZGF0YU1vZGVsXG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDb25uZWN0b3JWMVxuIiwiLypcbiAqIENvcHlyaWdodCA6IFBhcnRuZXJpbmcgMy4wICgyMDA3LTIwMjApXG4gKiBBdXRob3IgOiBQYXJ0bmVyaW5nIFJvYm90aWNzIDxzb2Z0d2FyZUBwYXJ0bmVyaW5nLmZyPlxuICpcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIGRpeWEtc2RrLlxuICpcbiAqIGRpeWEtc2RrIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbiwgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIGRpeWEtc2RrIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlXG4gKiBhbG9uZyB3aXRoIGRpeWEtc2RrLiAgSWYgbm90LCBzZWUgPGh0dHA6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIG1heWEtY2xpZW50XG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQsIFBhcnRuZXJpbmcgUm9ib3RpY3MsIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGxpYnJhcnkgaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yXG4gKiBtb2RpZnkgaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyB2ZXJzaW9uXG4gKlx0My4wIG9mIHRoZSBMaWNlbnNlLiBUaGlzIGxpYnJhcnkgaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGVcbiAqIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuXG4gKiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSXG4gKiBQVVJQT1NFLiBTZWUgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpY1xuICogTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgbGlicmFyeS5cbiAqL1xuXG4ndXNlIHN0cmljdCdcblxuY29uc3QgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRlbWl0dGVyMycpXG5cbmNvbnN0IGlzQnJvd3NlciA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG5sZXQgUHJvbWlzZVxuaWYgKCFpc0Jyb3dzZXIpIHtcblx0UHJvbWlzZSA9IHJlcXVpcmUoJ2JsdWViaXJkJylcbn0gZWxzZSB7XG5cdFByb21pc2UgPSB3aW5kb3cuUHJvbWlzZVxufVxuY29uc3QgU3RvcENvbmRpdGlvbiAgID0gcmVxdWlyZSgnLi4vc3RvcENvbmRpdGlvbkVycm9yLmpzJylcbmNvbnN0IGdldFRpbWVTYW1wbGluZyA9IHJlcXVpcmUoJy4uL3RpbWVjb250cm9sLmpzJykuZ2V0VGltZVNhbXBsaW5nXG5cbi8vIGRlZmF1bHQgYW5kIG1heCBudW1iZXIgb2Ygc2FtcGxlcyBmb3IgdGhlIHByb3ZpZGVkIHRpbWUgcmFuZ2VcbmNvbnN0IE1BWFNBTVBMSU5HID0gMzAwXG5cbmNsYXNzIFdhdGNoZXJWMSBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG5cdC8qKlxuXHQgKiBAcGFyYW0gZW1pdCBlbWl0IGRhdGEgKG1hbmRhdG9yeSlcblx0ICogQHBhcmFtIGNvbmZpZyB0byBnZXQgZGF0YSBmcm9tIHNlcnZlclxuXHQgKi9cblx0Y29uc3RydWN0b3IgKHNlbGVjdG9yLCBfY29uZmlnKSB7XG5cdFx0c3VwZXIoKVxuXG5cdFx0dGhpcy5zZWxlY3RvciA9IHNlbGVjdG9yXG5cdFx0dGhpcy5zdGF0ZSA9ICdydW5uaW5nJ1xuXG5cdFx0dGhpcy5yZWNvbm5lY3Rpb25QZXJpb2QgPSAwIC8vIGluaXRpYWwgcGVyaW9kIGJldHdlZW4gcmVjb25uZWN0aW9uc1xuXHRcdHRoaXMubWF4UmVjb25uZWN0aW9uUGVyaW9kID0gMzAwMDAwIC8vIG1heCA1IG1pblxuXG5cdFx0LyoqIGluaXRpYWxpc2Ugb3B0aW9ucyBmb3IgcmVxdWVzdCAqICovXG5cdFx0Y29uc3Qgb3B0aW9ucyA9IHtcblx0XHRcdGNyaXRlcmlhIDogeyB0aW1lOiB7fSB9LFxuXHRcdFx0b3BlcmF0b3JzOiBbJ2F2ZycsICdtaW4nLCAnbWF4JywgJ3N0ZGRldiddXG5cdFx0fVxuXHRcdGlmIChfY29uZmlnLnJvYm90cyBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdFx0XHRvcHRpb25zLmNyaXRlcmlhLnJvYm90cyA9IF9jb25maWcucm9ib3RzXG5cdFx0fVxuXHRcdGlmIChfY29uZmlnLnRpbWVSYW5nZSAhPSBudWxsICYmIHR5cGVvZiBfY29uZmlnLnRpbWVSYW5nZSA9PT0gJ3N0cmluZycpIHtcblx0XHRcdG9wdGlvbnMuY3JpdGVyaWEudGltZS5yYW5nZVVuaXQgPSBfY29uZmlnLnRpbWVSYW5nZVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRvcHRpb25zLmNyaXRlcmlhLnRpbWUucmFuZ2VVbml0ID0gJ2hvdXJzJ1xuXHRcdH1cblx0XHRpZiAoX2NvbmZpZy5jYXRlZ29yeSAhPSBudWxsICYmIHR5cGVvZiBfY29uZmlnLmNhdGVnb3J5ID09PSAnc3RyaW5nJykge1xuXHRcdFx0b3B0aW9ucy5jYXRlZ29yeSA9IF9jb25maWcuY2F0ZWdvcnlcblx0XHR9IGVsc2Uge1xuXHRcdFx0b3B0aW9ucy5jYXRlZ29yeSA9ICdpZXEnXG5cdFx0fVxuXHRcdGlmIChfY29uZmlnLnNhbXBsaW5nICE9IG51bGwgJiYgdHlwZW9mIF9jb25maWcuc2FtcGxpbmcgPT09ICdudW1iZXInKSB7XG5cdFx0XHRvcHRpb25zLnNhbXBsaW5nID0gX2NvbmZpZy5zYW1wbGluZ1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRvcHRpb25zLnNhbXBsaW5nID0gTUFYU0FNUExJTkdcblx0XHR9XG5cdFx0aWYgKG9wdGlvbnMuc2FtcGxpbmcgPiBNQVhTQU1QTElORykge1xuXHRcdFx0b3B0aW9ucy5zYW1wbGluZyA9IDMwMFxuXHRcdH1cblx0XHRvcHRpb25zLmNyaXRlcmlhLnRpbWUuc2FtcGxpbmcgPSBnZXRUaW1lU2FtcGxpbmcob3B0aW9ucy5jcml0ZXJpYS50aW1lLCBvcHRpb25zLnNhbXBsaW5nKVxuXG5cdFx0dGhpcy5vcHRpb25zID0gb3B0aW9uc1xuXG5cdFx0dGhpcy53YXRjaChvcHRpb25zKSAvLyBzdGFydCB3YXRjaGVyXG5cdH1cblxuXHRzdGF0aWMgZ2V0RGF0YVJlcXVlc3RPYmplY3QgKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRwYXRoICAgICA6ICcvZnIvcGFydG5lcmluZy9JZXEnLFxuXHRcdFx0aW50ZXJmYWNlOiAnZnIucGFydG5lcmluZy5JZXEnXG5cdFx0fVxuXHR9XG5cblx0c3RhdGljIGdldEZpcmVEYXRhT2JqZWN0ICgpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0cGF0aCAgICAgOiAnL2ZyL3BhcnRuZXJpbmcvSWVxJyxcblx0XHRcdGludGVyZmFjZTogJ2ZyLnBhcnRuZXJpbmcuSWVxJ1xuXHRcdH1cblx0fVxuXG5cdHdhdGNoIChvcHRpb25zKSB7XG5cdFx0bmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0Ly8gUmVxdWVzdCBoaXN0b3J5IGRhdGEgYmVmb3JlIHN1YnNjcmliaW5nXG5cdFx0XHR0aGlzLnNlbGVjdG9yLnJlcXVlc3Qoe1xuXHRcdFx0XHRzZXJ2aWNlOiAnaWVxJyxcblx0XHRcdFx0ZnVuYyAgIDogJ0RhdGFSZXF1ZXN0Jyxcblx0XHRcdFx0ZGF0YSAgIDogeyBkYXRhOiBKU09OLnN0cmluZ2lmeShvcHRpb25zKSB9LFxuXHRcdFx0XHRvYmogICAgOiB0aGlzLmdldERhdGFSZXF1ZXN0T2JqZWN0KClcblx0XHRcdH0sIChkbklkLCBlcnIsIGRhdGFTdHJpbmcpID0+IHtcblx0XHRcdFx0aWYgKGVyciAhPSBudWxsKSB7XG5cdFx0XHRcdFx0cmVqZWN0KGVycilcblx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAodGhpcy5zdGF0ZSA9PT0gJ3N0b3BwZWQnKSB7XG5cdFx0XHRcdFx0cmVqZWN0KG5ldyBTdG9wQ29uZGl0aW9uKCkpXG5cdFx0XHRcdH1cblx0XHRcdFx0Y29uc3QgZGF0YSA9IEpTT04ucGFyc2UoZGF0YVN0cmluZylcblx0XHRcdFx0dGhpcy5lbWl0KCdkYXRhJywgZGF0YSlcblx0XHRcdFx0cmVzb2x2ZSgpXG5cdFx0XHR9KVxuXHRcdH0pXG5cdFx0LnRoZW4oKCkgPT4ge1xuXHRcdFx0Ly8gc3Vic2NyaWJlIHRvIHNpZ25hbFxuXHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdFx0dGhpcy5zdWJzY3JpcHRpb24gPSB0aGlzLnNlbGVjdG9yLnN1YnNjcmliZSh7XG5cdFx0XHRcdFx0c2VydmljZTogJ2llcScsXG5cdFx0XHRcdFx0ZnVuYyAgIDogb3B0aW9ucy5jcml0ZXJpYS50aW1lLnNhbXBsaW5nLFxuXHRcdFx0XHRcdGRhdGEgICA6IHsgZGF0YTogb3B0aW9ucyB9LFxuXHRcdFx0XHRcdG9iaiAgICA6IHRoaXMuZ2V0RmlyZURhdGFPYmplY3QoKVxuXHRcdFx0XHR9LCAoZG5kLCBlcnIsIF9kYXRhKSA9PiB7XG5cdFx0XHRcdFx0bGV0IGRhdGEgPSBfZGF0YVxuXHRcdFx0XHRcdGlmIChlcnIgIT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0cmVqZWN0KGVycilcblx0XHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRkYXRhID0gSlNPTi5wYXJzZShkYXRhKVxuXHRcdFx0XHRcdHRoaXMuZW1pdCgnZGF0YScsIGRhdGEpXG5cblx0XHRcdFx0XHR0aGlzLnJlY29ubmVjdGlvblBlcmlvZCA9IDAgLy8gcmVzZXQgcGVyaW9kIG9uIHN1YnNjcmlwdGlvbiByZXF1ZXN0c1xuXHRcdFx0XHRcdHJlc29sdmUoKVxuXHRcdFx0XHR9KVxuXHRcdFx0fSlcblx0XHR9KVxuXHRcdC5jYXRjaCgoZXJyKSA9PiB7XG5cdFx0XHRpZiAoZXJyLm5hbWUgPT09ICdTdG9wQ29uZGl0aW9uJykgeyAvLyB3YXRjaGVyIHN0b3BwZWQgOiBkbyBub3RoaW5nXG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Ly8gdHJ5IHRvIHJlc3RhcnQgbGF0ZXJcblx0XHRcdHRoaXMuX2Nsb3NlU3Vic2NyaXB0aW9uKCkgLy8gc2hvdWxkIG5vdCBiZSBuZWNlc3Nhcnlcblx0XHRcdHRoaXMucmVjb25uZWN0aW9uUGVyaW9kID0gdGhpcy5yZWNvbm5lY3Rpb25QZXJpb2QgKyAxMDAwIC8vIGluY3JlYXNlIGRlbGF5IGJ5IDEgc2VjXG5cdFx0XHRpZiAodGhpcy5yZWNvbm5lY3Rpb25QZXJpb2QgPiB0aGlzLm1heFJlY29ubmVjdGlvblBlcmlvZCkge1xuXHRcdFx0XHR0aGlzLnJlY29ubmVjdGlvblBlcmlvZCA9IHRoaXMubWF4UmVjb25uZWN0aW9uUGVyaW9kIC8vIG1heCA1bWluXG5cdFx0XHR9XG5cdFx0XHR0aGlzLndhdGNoVGVudGF0aXZlID0gc2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHRcdHRoaXMud2F0Y2gob3B0aW9ucylcblx0XHRcdH0sIHRoaXMucmVjb25uZWN0aW9uUGVyaW9kKSAvLyB0cnkgYWdhaW4gbGF0ZXJcblx0XHR9KVxuXHR9XG5cblx0Ly8gQ2xvc2Ugc3Vic2NyaXB0aW9uIGlmIGFueVxuXHRfY2xvc2VTdWJzY3JpcHRpb24gKCkge1xuXHRcdGlmICh0aGlzLnN1YnNjcmlwdGlvbiAhPSBudWxsKSB7XG5cdFx0XHR0aGlzLnN1YnNjcmlwdGlvbi5jbG9zZSgpXG5cdFx0XHR0aGlzLnN1YnNjcmlwdGlvbiA9IG51bGxcblx0XHR9XG5cdH1cblxuXHRzdG9wICgpIHtcblx0XHR0aGlzLnN0YXRlID0gJ3N0b3BwZWQnXG5cdFx0aWYgKHRoaXMud2F0Y2hUZW50YXRpdmUgIT0gbnVsbCkge1xuXHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMud2F0Y2hUZW50YXRpdmUpXG5cdFx0fVxuXHRcdHRoaXMuX2Nsb3NlU3Vic2NyaXB0aW9uKClcblx0XHR0aGlzLmVtaXQoJ3N0b3AnKVxuXHRcdHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKClcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFdhdGNoZXJWMVxuIiwiLypcbiAqIENvcHlyaWdodCA6IFBhcnRuZXJpbmcgMy4wICgyMDA3LTIwMjApXG4gKiBBdXRob3IgOiBQYXJ0bmVyaW5nIFJvYm90aWNzIDxzb2Z0d2FyZUBwYXJ0bmVyaW5nLmZyPlxuICpcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIGRpeWEtc2RrLlxuICpcbiAqIGRpeWEtc2RrIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbiwgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIGRpeWEtc2RrIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlXG4gKiBhbG9uZyB3aXRoIGRpeWEtc2RrLiAgSWYgbm90LCBzZWUgPGh0dHA6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIG1heWEtY2xpZW50XG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQsIFBhcnRuZXJpbmcgUm9ib3RpY3MsIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGxpYnJhcnkgaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yXG4gKiBtb2RpZnkgaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyB2ZXJzaW9uXG4gKlx0My4wIG9mIHRoZSBMaWNlbnNlLiBUaGlzIGxpYnJhcnkgaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGVcbiAqIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuXG4gKiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSXG4gKiBQVVJQT1NFLiBTZWUgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpY1xuICogTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgbGlicmFyeS5cbiAqL1xuXG4ndXNlIHN0cmljdCdcblxuY29uc3QgV2F0Y2hlclYyICAgPSByZXF1aXJlKCcuLi92Mi93YXRjaGVyLmpzJylcbmNvbnN0IENvbm5lY3RvclYxID0gcmVxdWlyZSgnLi4vdjEvY29ubmVjdG9yLmpzJylcblxuY2xhc3MgQ29ubmVjdG9yVjIgZXh0ZW5kcyBDb25uZWN0b3JWMSB7XG5cdGNvbnN0cnVjdG9yIChzZWxlY3Rvcikge1xuXHRcdHN1cGVyKHNlbGVjdG9yKVxuXHRcdHRoaXMuc2VsZWN0b3IgPSBzZWxlY3RvclxuXHRcdHJldHVybiB0aGlzXG5cdH1cblxuXHRnZXRVcGRhdGVEYXRhT2JqZWN0ICgpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0cGF0aCAgICAgOiBgL2ZyL3BhcnRuZXJpbmcvSWVxL1VwZGF0ZS8ke1dhdGNoZXJWMi5mb3JtYXRQZWVyTmFtZSh0aGlzLnNlbGVjdG9yLl9jb25uZWN0aW9uLnNlbGYoKSl9YCxcblx0XHRcdGludGVyZmFjZTogJ2ZyLnBhcnRuZXJpbmcuSWVxLlVwZGF0ZSdcblx0XHR9XG5cdH1cblxuXHRnZXRDc3ZEYXRhT2JqZWN0ICgpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0cGF0aCAgICAgOiBgL2ZyL3BhcnRuZXJpbmcvSWVxL0V4cG9ydC8ke1dhdGNoZXJWMi5mb3JtYXRQZWVyTmFtZSh0aGlzLnNlbGVjdG9yLl9jb25uZWN0aW9uLnNlbGYoKSl9YCxcblx0XHRcdGludGVyZmFjZTogJ2ZyLnBhcnRuZXJpbmcuSWVxLkV4cG9ydCdcblx0XHR9XG5cdH1cblxuXHRjcmVhdGVXYXRjaGVyIChjb25maWcpIHtcblx0XHRyZXR1cm4gbmV3IFdhdGNoZXJWMih0aGlzLnNlbGVjdG9yLCBjb25maWcpXG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDb25uZWN0b3JWMlxuIiwiLypcbiAqIENvcHlyaWdodCA6IFBhcnRuZXJpbmcgMy4wICgyMDA3LTIwMjApXG4gKiBBdXRob3IgOiBQYXJ0bmVyaW5nIFJvYm90aWNzIDxzb2Z0d2FyZUBwYXJ0bmVyaW5nLmZyPlxuICpcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIGRpeWEtc2RrLlxuICpcbiAqIGRpeWEtc2RrIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbiwgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIGRpeWEtc2RrIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlXG4gKiBhbG9uZyB3aXRoIGRpeWEtc2RrLiAgSWYgbm90LCBzZWUgPGh0dHA6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIG1heWEtY2xpZW50XG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQsIFBhcnRuZXJpbmcgUm9ib3RpY3MsIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGxpYnJhcnkgaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yXG4gKiBtb2RpZnkgaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyB2ZXJzaW9uXG4gKlx0My4wIG9mIHRoZSBMaWNlbnNlLiBUaGlzIGxpYnJhcnkgaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGVcbiAqIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuXG4gKiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSXG4gKiBQVVJQT1NFLiBTZWUgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpY1xuICogTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgbGlicmFyeS5cbiAqL1xuXG4ndXNlIHN0cmljdCdcblxuY29uc3QgV2F0Y2hlclYxID0gcmVxdWlyZSgnLi4vdjEvd2F0Y2hlci5qcycpXG5cbmNsYXNzIFdhdGNoZXJWMiBleHRlbmRzIFdhdGNoZXJWMSB7XG5cdC8qKlxuXHQgKiBAcGFyYW0gZW1pdCBlbWl0IGRhdGEgKG1hbmRhdG9yeSlcblx0ICogQHBhcmFtIGNvbmZpZyB0byBnZXQgZGF0YSBmcm9tIHNlcnZlclxuXHQgKi9cblx0Y29uc3RydWN0b3IgKHNlbGVjdG9yLCBfY29uZmlnKSB7XG5cdFx0c3VwZXIoc2VsZWN0b3IsIF9jb25maWcpXG5cdFx0dGhpcy5zZWxlY3RvciA9IHNlbGVjdG9yXG5cdH1cblxuXHRnZXREYXRhUmVxdWVzdE9iamVjdCAoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHBhdGggICAgIDogYC9mci9wYXJ0bmVyaW5nL0llcS9SZXF1ZXN0LyR7V2F0Y2hlclYyLmZvcm1hdFBlZXJOYW1lKHRoaXMuc2VsZWN0b3IuX2Nvbm5lY3Rpb24uc2VsZigpKX1gLFxuXHRcdFx0aW50ZXJmYWNlOiAnZnIucGFydG5lcmluZy5JZXEuUmVxdWVzdCdcblx0XHR9XG5cdH1cblxuXHRnZXRGaXJlRGF0YU9iamVjdCAoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHBhdGggICAgIDogYC9mci9wYXJ0bmVyaW5nL0llcS9GaXJlLyR7V2F0Y2hlclYyLmZvcm1hdFBlZXJOYW1lKHRoaXMuc2VsZWN0b3IuX2Nvbm5lY3Rpb24uc2VsZigpKX1gLFxuXHRcdFx0aW50ZXJmYWNlOiAnZnIucGFydG5lcmluZy5JZXEuRmlyZSdcblx0XHR9XG5cdH1cblxuXHRzdGF0aWMgZm9ybWF0UGVlck5hbWUgKGlucHV0LCBkZWxpbWl0ZXIgPSAnLScpIHtcblx0XHRyZXR1cm4gaW5wdXQuc3BsaXQoZGVsaW1pdGVyKS5tYXAoKHMpID0+IHtcblx0XHRcdHJldHVybiBzLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcy5zbGljZSgxKVxuXHRcdH0pLmpvaW4oJycpXG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBXYXRjaGVyVjJcbiJdfQ==
