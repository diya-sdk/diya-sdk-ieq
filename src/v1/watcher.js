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

'use strict'

const EventEmitter = require('eventemitter3')

const isBrowser = typeof window !== 'undefined'
let Promise
if (!isBrowser) {
	Promise = require('bluebird')
} else {
	Promise = window.Promise
}
const StopCondition   = require('../stopConditionError.js')
const getTimeSampling = require('../timecontrol.js').getTimeSampling

// default and max number of samples for the provided time range
const MAXSAMPLING = 300

class WatcherV1 extends EventEmitter {
	/**
	 * @param emit emit data (mandatory)
	 * @param config to get data from server
	 */
	constructor (selector, _config) {
		super()

		this.selector = selector
		this.state = 'running'

		this.reconnectionPeriod = 0 // initial period between reconnections
		this.maxReconnectionPeriod = 300000 // max 5 min

		/** initialise options for request * */
		const options = {
			criteria : { time: {} },
			operators: ['avg', 'min', 'max', 'stddev']
		}
		if (_config.robots instanceof Array) {
			options.criteria.robots = _config.robots
		}
		if (_config.timeRange != null && typeof _config.timeRange === 'string') {
			options.criteria.time.rangeUnit = _config.timeRange
		} else {
			options.criteria.time.rangeUnit = 'hours'
		}
		if (_config.category != null && typeof _config.category === 'string') {
			options.category = _config.category
		} else {
			options.category = 'ieq'
		}
		if (_config.sampling != null && typeof _config.sampling === 'number') {
			options.sampling = _config.sampling
		} else {
			options.sampling = MAXSAMPLING
		}
		if (options.sampling > MAXSAMPLING) {
			options.sampling = 300
		}
		options.criteria.time.sampling = getTimeSampling(options.criteria.time, options.sampling)

		this.options = options

		this.watch(options) // start watcher
	}

	static getDataRequestObject () {
		return {
			path     : '/fr/partnering/Ieq',
			interface: 'fr.partnering.Ieq'
		}
	}

	static getFireDataObject () {
		return {
			path     : '/fr/partnering/Ieq',
			interface: 'fr.partnering.Ieq'
		}
	}

	watch (options) {
		new Promise((resolve, reject) => {
			// Request history data before subscribing
			this.selector.request({
				service: 'ieq',
				func   : 'DataRequest',
				data   : { data: JSON.stringify(options) },
				obj    : this.getDataRequestObject()
			}, (dnId, err, dataString) => {
				if (err != null) {
					reject(err)
					return
				}
				if (this.state === 'stopped') {
					reject(new StopCondition())
				}
				const data = JSON.parse(dataString)
				this.emit('data', data)
				resolve()
			})
		})
		.then(() => {
			// subscribe to signal
			return new Promise((resolve, reject) => {
				this.subscription = this.selector.subscribe({
					service: 'ieq',
					func   : options.criteria.time.sampling,
					data   : { data: options },
					obj    : this.getFireDataObject()
				}, (dnd, err, _data) => {
					let data = _data
					if (err != null) {
						reject(err)
						return
					}
					data = JSON.parse(data)
					this.emit('data', data)

					this.reconnectionPeriod = 0 // reset period on subscription requests
					resolve()
				})
			})
		})
		.catch((err) => {
			if (err.name === 'StopCondition') { // watcher stopped : do nothing
				return
			}
			// try to restart later
			this._closeSubscription() // should not be necessary
			this.reconnectionPeriod = this.reconnectionPeriod + 1000 // increase delay by 1 sec
			if (this.reconnectionPeriod > this.maxReconnectionPeriod) {
				this.reconnectionPeriod = this.maxReconnectionPeriod // max 5min
			}
			this.watchTentative = setTimeout(() => {
				this.watch(options)
			}, this.reconnectionPeriod) // try again later
		})
	}

	// Close subscription if any
	_closeSubscription () {
		if (this.subscription != null) {
			this.subscription.close()
			this.subscription = null
		}
	}

	stop () {
		this.state = 'stopped'
		if (this.watchTentative != null) {
			clearTimeout(this.watchTentative)
		}
		this._closeSubscription()
		this.emit('stop')
		this.removeAllListeners()
	}
}

module.exports = WatcherV1
