const EventEmitter = require('eventemitter3');
const debug = require('debug')('ieq:watcher');
const debugError = require('debug')('ieq:watcher:errors');
const getTimeSampling = require('./timecontrol.js').getTimeSampling;

// import Promise
let Promise = null;
if (window != null) {
	Promise = window.Promise;
} else {
	Promise = require('bluebird');
}

'use strict';

class StopCondition extends Error {
	constructor(msg) {
		super(msg);
		this.name='StopCondition'
	}
}

// default and max number of samples for the provided time range
let MAXSAMPLING = 300;

class Watcher extends EventEmitter {
	/**
	 * @param emit emit data (mandatory)
	 * @param config to get data from server
	 */
	constructor (selector, _config) {
		super();

		this.selector = selector;
		this.state = 'running';

		this.reconnectionPeriod = 0; // initial period between reconnections
		this.maxReconnectionPeriod = 300000; // max 5 min

		/** initialise options for request **/
		let options = {
			criteria: {
				time: {}
			},
			operators: ['avg', 'min', 'max', 'stddev'],
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

		this.options = options;
		debug(options);

		this.watch(options); // start watcher
	}

	watch (options) {
		debug('in watch');
		new Promise( (resolve, reject) => {
			// Request history data before subscribing
			this.selector.request({
				service: "ieq",
				func: "DataRequest",
				data: {
					data: JSON.stringify(options)
				},
				obj:{
					path: '/fr/partnering/Ieq',
					interface: "fr.partnering.Ieq"
				},
			}, (dnId, err, dataString) => {
				if (err != null)  {
					reject(err);
					return;
				}
				if (this.state === 'stopped') {
					reject(new StopCondition());
				}
				debug('Request:emitData');
				let data = JSON.parse(dataString);
				this.emit('data', data);
				resolve();
			});
		})
			.then( _ => {
				// subscribe to signal
				debug('Subscribing');
				return new Promise ( (resolve, reject) =>  {
					this.subscription = this.selector.subscribe({
						service: "ieq",
						func: options.criteria.time.sampling,
						data: {data: options},
						obj:{
							path: '/fr/partnering/Ieq',
							interface: "fr.partnering.Ieq"
						}
					}, (dnd, err, data) => {
						if (err != null) {
							reject(err);
							return;
						}
						debug('Signal:emitData');
						data = JSON.parse(data);
						this.emit('data', data);

						this.reconnectionPeriod=0; // reset period on subscription requests
						resolve();
					})
				})
			})
			.catch( err => {
				if (err.name === 'StopCondition') { // watcher stopped : do nothing
					return;
				}
				// try to restart later
				debugError("WatchIEQRecvErr:", err);
				this._closeSubscription(); // should not be necessary
				this.reconnectionPeriod = this.reconnectionPeriod+1000; // increase delay by 1 sec
				if (this.reconnectionPeriod > this.maxReconnectionPeriod) {
					this.reconnectionPeriod=this.maxReconnectionPeriod; // max 5min
				}
				this.watchTentative = setTimeout( _ => {
					this.watch(options);
				}, this.reconnectionPeriod); // try again later
			});

	}

	// Close subscription if any
	_closeSubscription () {
		debug('In closeSubscription');
		if (this.subscription != null) {
			this.subscription.close();
			this.subscription = null;
		}
	}

	stop () {
		debug('In stop');
		this.state = 'stopped';
		if (this.watchTentative != null) {
			clearTimeout(this.watchTentative);
		}
		this._closeSubscription();
		this.emit('stop');
		this.removeAllListeners();
	}
}

module.exports = Watcher;
