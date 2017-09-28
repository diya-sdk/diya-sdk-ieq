const EventEmitter = require('eventemitter3');
const debug = require('debug')('Ieq:Watcher');
const debugError = require('debug')('Ieq:Watcher:Errors');

// import Promise
let Promise = null;
if( window!=null )  Promise = window.Promise;
else  Promise = require('bluebird');

'use strict';

class StopCondition extends Error {
	constructor(msg) {super(msg);this.name='StopCondition'}
};

class Watcher extends EventEmitter{
	/**
	 * @param emit emit data (mandatory)
	 * @param config to get data from server
	 */
	constructor(selector, config) {
		super();

		this.selector = selector;
		this.state='running';

		/** initialise config **/
		if( config==null ) config = {};
		if( config.timeRange==null ) config.timeRange = 'hours';
		if( config.category==null ) config.category = 'ieq'; /* category */
		if( config.sampling!=null ) config.sampling=500;
		this.config = config;

		this.reconnectionPeriod = 0; // initial period between reconnections
		this.maxReconnectionPeriod = 300000; // max 5 min

		this.watch(config); // start watcher
	};

	watch(config) {
		debug('in watch');
		new Promise( (resolve,reject) => {
			// Request history data before subscribing
			var requestConfig = {
				sampling: config.sampling,
				criteria: {
					time: {rangeUnit: config.timeRange},
					robots: config.robots
				},
				category: config.category,
				operators: ['avg','min','max','stddev']
			};
			this.selector.request({
				service: "ieq",
				func: "DataRequest",
				data: {data: JSON.stringify(requestConfig)},
				obj:{
					path: '/fr/partnering/Ieq',
					interface: "fr.partnering.Ieq"
				}
			}, (dnId, err, dataString) => {
				if( err!=null )  {
					reject(err);
					return;
				}
				if( this.state==='stopped' ) reject(new StopCondition())
				debug('Request:emitData');
				let data = JSON.parse(dataString);
				this.emit('data',data);
				resolve();
			});
		})
			.then( _ => {
				// TODO select signal according to timeRange

				// subscribe to signal
				debug('Subscribing')
				return new Promise ( (resolve,reject) =>  {
					this.subscription = this.selector.subscribe({
						service: "ieq",
						func: "Second",
						data: {data: config},
						obj:{
							path: '/fr/partnering/Ieq',
							interface: "fr.partnering.Ieq"
						}
					}, (dnd, err, data) => {
						if( err!=null )  {
							reject(err);
							return;
						}
						debug('Signal:emitData');
						data = JSON.parse(data);
						this.emit('data',data);

						this.reconnectionPeriod=0; // reset period on subscription requests
						resolve();
					});
				})
			})
			.catch( err => {
				if( err.name==='StopCondition' ) { // watcher stopped : do nothing
					return;
				}
				// try to restart later
				debugError("WatchIEQRecvErr:",err);
				this._closeSubscription(); // should not be necessary
				this.reconnectionPeriod = this.reconnectionPeriod+1000; // increase delay by 1 sec
				if(this.reconnectionPeriod > this.maxReconnectionPeriod)
					this.reconnectionPeriod=this.maxReconnectionPeriod; // max 5min
				this.watchTentative = setTimeout( _ => {
					this.watch(config);
				}, this.reconnectionPeriod); // try again later
			});

	};

	// Close subscription if any
	_closeSubscription() {
		debug('In closeSubscription');
		if( this.subscription!=null ) {
			this.subscription.close();
			this.subscription = null;
		}
	};

	stop() {
		debug('In stop');
		this.state = 'stopped';
		if( this.watchTentative!=null )
			clearTimeout(this.watchTentative);
		this._closeSubscription();
		this.emit('stop');
		this.removeAllListeners();
	}

}

module.exports = Watcher;
