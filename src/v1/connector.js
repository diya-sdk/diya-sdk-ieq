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

const WatcherV1  = require('../v1/watcher.js')
const formatTime = require('../timecontrol.js').formatTime

class ConnectorV1 {
	constructor (selector) {
		this.selector = selector
		this.dataModel = {}
		this._coder = selector.encode()
		this.watchers = []

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
					end  : null,
					range: null // in s
				},
				robots: null,
				places: null
			},
			operator: 'last',
			sensors : null,
			sampling: null // sampling
		}

		return this
	}

	getUpdateDataObject () {
		return {
			path     : '/fr/partnering/Ieq',
			interface: 'fr.partnering.Ieq'
		}
	}

	getCsvDataObject () {
		return {
			path     : '/fr/partnering/Ieq',
			interface: 'fr.partnering.Ieq'
		}
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
	getDataModel () {
		return this.dataModel
	}

	getDataRange () {
		return this.dataModel.range
	}

	/**
	 * @param {Object} dataConfig config for data request
	 * if dataConfig is define : set and return this
	 * @return {IEQ} this
	 * else
	 * @return {Object} current dataConfig
	 */
	DataConfig (newDataConfig) {
		if (newDataConfig != null) {
			this.dataConfig = newDataConfig
			return this
		}
		return this.dataConfig
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
	DataOperator (newOperator) {
		if (newOperator != null) {
			this.dataConfig.operator = newOperator
			return this
		}
		return this.dataConfig.operator
	}

	/**
	 * Depends on numSamples
	 * @param {int} number of samples in dataModel
	 * if defined : set number of samples
	 * @return {IEQ} this
	 * else
	 * @return {int} number of samples
	 */
	DataSampling (numSamples) {
		if (numSamples != null) {
			this.dataConfig.sampling = numSamples
			return this
		}
		return this.dataConfig.sampling
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
	DataTime (newTimeStart, newTimeEnd, newRange) {
		if (newTimeStart != null || newTimeEnd != null || newRange != null) {
			this.dataConfig.criteria.time.start = formatTime(newTimeStart)
			this.dataConfig.criteria.time.end = formatTime(newTimeEnd)
			this.dataConfig.criteria.time.range = newRange
			return this
		}
		return {
			start: new Date(this.dataConfig.criteria.time.start),
			end  : new Date(this.dataConfig.criteria.time.end),
			range: new Date(this.dataConfig.criteria.time.range)
		}
	}

	/**
	 * Depends on robotIds
	 * Set robots criteria.
	 * @param {Array[Int]} robotIds list of robots Ids
	 * Get robots criteria.
	 * @return {Array[Int]} list of robots Ids
	 */
	DataRobotIds (robotIds) {
		if (robotIds != null) {
			this.dataConfig.criteria.robots = robotIds
			return this
		}
		return this.dataConfig.criteria.robots
	}

	/**
	 * Depends on placeIds
	 * Set places criteria.
	 * @param {Array[Int]} placeIds list of places Ids
	 * Get places criteria.
	 * @return {Array[Int]} list of places Ids
	 */
	DataPlaceIds (placeIds) {
		if (placeIds != null) {
			this.dataConfig.criteria.placeId = placeIds
			return this
		}
		return this.dataConfig.criteria.places
	}

	/**
	 * Get data by sensor name.
	 * @param {Array[String]} sensorName list of sensors
	 */
	getDataByName (sensorNames) {
		const data = []
		for (const n in sensorNames) {
			data.push(this.dataModel[sensorNames[n]])
		}
		return data
	}

	/**
	 * Update data given dataConfig.
	 * @param {func} callback : called after update
	 * @param {object} dataConfig: data to config request
	 * TODO USE PROMISE
	 */
	updateData (callback, dataConfig) {
		this._updateData(callback, dataConfig, 'DataRequest')
	}

	/**
	 * Update data given dataConfig.
	 * @param {func} callback : called after update
	 * @param {object} dataConfig: data to config request
	 * @param {string} funcName: name of requested function in diya-node-ieq. Default: "DataRequest".
	 * TODO USE PROMISE
	 */
	_updateData (callback, dataConfig, funcName) {
		if (dataConfig) {
			this.DataConfig(dataConfig)
		}
		this.selector.request({
			service: 'ieq',
			func   : funcName,
			data   : { data: JSON.stringify(this.dataConfig) },		//	type:"splReq",
			obj    : this.getUpdateDataObject()
		}, (dnId, err, _data) => {
			const data = JSON.parse(_data)
			if (err != null) {
				if (typeof err === 'object' && typeof err.name === 'string') {
					callback(null, err.name)
				}
				return
			}
			callback(this._getDataModelFromRecv(data)) // callback func
		})
	}

	getConfinementLevel () {
		return this.confinement
	}

	getAirQualityLevel () {
		return this.airQuality
	}

	getEnvQualityLevel () {
		return this.envQuality
	}

	/**
	 * Update internal model with received data
	 * @param  config data to configure subscription
	 * @param  callback called on answers (@param : dataModel)
	 * @return watcher created watcher
	 */
	watch (config, callback) {
		// do not create watcher without a callback
		if (callback == null || typeof callback !== 'function') {
			return null
		}

		const watcher = this.createWatcher(config)

		// add watcher in watcher list
		this.watchers.push(watcher)

		watcher.on('data', (data) => {
			callback(this._getDataModelFromRecv(data))
		})
		watcher.on('stop', this._removeWatcher)

		return watcher
	}

	createWatcher (config) {
		return new WatcherV1(this.selector, config)
	}

	/**
	 * Callback to remove watcher from list
	 * @param watcher to be removed
	 */
	_removeWatcher (watcher) {
		// find and remove watcher in list
		this.watchers.find((el, id, watchers) => {
			if (watcher === el) {
				watchers.splice(id, 1) // remove
				return true
			}
			return false
		})
	}

	/**
	 * Stop all watchers
	 */
	closeSubscriptions () {
		console.warn('Deprecated function use stopWatchers instead')
		this.stopWatchers()
	}

	stopWatchers () {
		this.watchers.forEach((watcher) => {
			// remove listener on stop event to avoid purging watchers twice
			watcher.removeListener('stop', this._removeWatcher)
			watcher.stop()
		})
		this.watchers = []
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
	getCSVData (_csvConfig, callback) {
		const csvConfig = _csvConfig
		if (csvConfig && typeof csvConfig.nlines !== 'number') {
			csvConfig.nlines = undefined
		}
		if (csvConfig && typeof csvConfig.lang !== 'string') {
			csvConfig.lang = undefined
		}

		const dataConfig = JSON.stringify({
			criteria: {
				time  : { start: formatTime(csvConfig.startTime), end: formatTime(csvConfig.endTime), sampling: csvConfig.timeSample },
				places: [],
				robots: []
			},
			sensors : csvConfig.sensorNames,
			sampling: csvConfig.nlines,
			lang    : csvConfig.lang
		})

		this.selector.request({
			service: 'ieq',
			func   : 'CsvDataRequest',
			data   : { data: dataConfig },
			//	type:"splReq",
			obj    : this.getCsvDataObject()
		}, (dnId, err, data) => {
			if (err) {
				if (typeof err === 'object' && typeof err.name === 'string') {
					callback(null, err.name)
				}
				return
			}
			callback(data)
		})
	}

	/**
	 * Request Data to make data map
	 * @param {Object} dataConfig config for data request
	 * @param {callback} callback: called after update
	 */
	getDataMapData (dataConfig, callback) {
		console.warn('This function will be deprecated. Please use "getIeqData" instead.')
		this.getIeqData(dataConfig, callback)
	}

	/**
	 * Request Ieq Data (used for example to make heatmap)
	 * @param {Object} dataConfig config for data request
	 * @param {callback} callback: called after update
	 */
	getIeqData (dataConfig, callback) {
		this._updateData(callback, dataConfig, 'DataRequest')
	}

	/**
	 * Request Data to make heatmap
	 * @param {list} sensorNames : list of sensor and index names
	 * @param {object} time: object containing timestamps for begin and end of data for heatmap
	 * @param {string} sample: timeinterval for data. Parameters: "second", "minute", "hour", "day", "week", "month"
	 * @param {callback} callback: called after update
	 * @deprecated Will be deprecated in future version. Please use "getDataMapData" instead.
	 */
	getHeatMapData (sensorNames, time, sample, callback) {
		const dataConfig = {
			criteria: {
				time  : { start: formatTime(time.startEpoch), end: formatTime(time.endEpoch), sampling: sample },
				places: [],
				robots: []
			},
			sensors: sensorNames
		}
		console.warn('This function will be deprecated. Please use "getIeqData" instead.')
		// this.getDataMapData(dataConfig, callback)
		this.getIeqData(dataConfig, callback)
	}

	/**
	 * Update internal model with received data
	 * @param  {Object} data data received from DiyaNode by websocket
	 * @return {[type]}		[description]
	 */
	_getDataModelFromRecv (data) {
		let dataModel = null
		if (data != null) {
			for (const n in data) {
				if (n !== 'header' && n !== 'err') {
					if (data[n].err != null && data[n].err.st > 0) {
						continue
					}

					if (!dataModel) {
						dataModel = {}
					}

					if (!dataModel[n]) {
						dataModel[n] = {}
					}
					/* update data id */
					dataModel[n].id = n
					/* update data absolute range */
					dataModel[n].range = data[n].range
					/* update data range */
					dataModel[n].timeRange = data[n].timeRange
					/* update data label */
					dataModel[n].label = data[n].label
					/* update data unit */
					dataModel[n].unit = data[n].unit
					/* update data precision */
					dataModel[n].precision = data[n].precision
					/* update data categories */
					dataModel[n].category = data[n].category
					/* suggested y display range */
					dataModel[n].zoomRange = [0, 100]
					// update sensor confort range
					dataModel[n].confortRange = data[n].confortRange

					/* update data indexRange */
					dataModel[n].qualityConfig = { indexRange: data[n].indexRange }
					dataModel[n].time = this._coder.from(data[n].time, 'b64', 8)
					dataModel[n].data = data[n].data != null
						? this._coder.from(data[n].data, 'b64', 4)
						: data[n].avg != null
						   ? this._coder.from(data[n].avg.d, 'b64', 4)
						   : null
					dataModel[n].qualityIndex = data[n].data != null
						? this._coder.from(data[n].index, 'b64', 4)
						: data[n].avg != null
						   ? this._coder.from(data[n].avg.i, 'b64', 4)
						   : null
					dataModel[n].robotId = this._coder.from(data[n].robotId, 'b64', 4)
					if (dataModel[n].robotId != null) {
						/** dico robotId -> robotName * */
						const dicoRobot = {}
						data.header.robots.forEach((el) => {
							dicoRobot[el.id] = el.name
						})
						dataModel[n].robotId = dataModel[n].robotId.map((el) => {
							return dicoRobot[el]
						})
					}

					dataModel[n].placeId = this._coder.from(data[n].placeId, 'b64', 4)
					dataModel[n].x = null
					dataModel[n].y = null

					if (data[n].avg != null) {
						dataModel[n].avg = {
							d: this._coder.from(data[n].avg.d, 'b64', 4),
							i: this._coder.from(data[n].avg.i, 'b64', 4)
						}
					}
					if (data[n].min != null) {
						dataModel[n].min = {
							d: this._coder.from(data[n].min.d, 'b64', 4),
							i: this._coder.from(data[n].min.i, 'b64', 4)
						}
					}
					if (data[n].max != null) {
						dataModel[n].max = {
							d: this._coder.from(data[n].max.d, 'b64', 4),
							i: this._coder.from(data[n].max.i, 'b64', 4)
						}
					}
					if (data[n].stddev != null) {
						dataModel[n].stddev = {
							d: this._coder.from(data[n].stddev.d, 'b64', 4),
							i: this._coder.from(data[n].stddev.i, 'b64', 4)
						}
					}
					if (data[n].stddev != null) {
						dataModel[n].stddev = {
							d: this._coder.from(data[n].stddev.d, 'b64', 4),
							i: this._coder.from(data[n].stddev.i, 'b64', 4)
						}
					}
					if (data[n].x != null) {
						dataModel[n].x = this._coder.from(data[n].x, 'b64', 4)
					}
					if (data[n].y != null) {
						dataModel[n].y = this._coder.from(data[n].y, 'b64', 4)
					}
					/**
					 * current quality : {'b'ad, 'm'edium, 'g'ood}
					 * evolution : {'u'p, 'd'own, 's'table}
					 * evolution quality : {'b'etter, 'w'orse, 's'ame}
					 */
					// / TODO
					dataModel[n].trend = 'mss'
				}
			}
		}
		/** list robots * */
		this.dataModel = dataModel
		return dataModel
	}
}

module.exports = ConnectorV1
