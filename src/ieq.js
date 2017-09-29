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
	const debug = require('debug')('ieq');

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
			this.dataConfig =newDataConfig;
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
		}
		else
			return this.dataConfig.criteria.place;
	};
	/**
	 * Get data by sensor name.
	 *	@param {Array[String]} sensorName list of sensors
	 */



	IEQ.prototype.getDataByName = function (sensorNames) {
		var data=[];
		for(var n in sensorNames) {
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
		this._updateData(callback, dataConfig, "DataRequest")
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
		if (dataConfig)
			this.DataConfig(dataConfig);

		this.selector.request({
			service: "ieq",
			func: funcName,
			data: {data: JSON.stringify(that.dataConfig)},		//	type:"splReq",
			obj:{
				path: '/fr/partnering/Ieq',
				interface: "fr.partnering.Ieq"
			}
		}, function (dnId, err, data) {
			data = JSON.parse(data);
			if (err != null) {
				if (typeof err == "string") debug("Recv err: "+ err);
				else if (typeof err == "object" && typeof err.name == 'string') {
					callback(null, err.name);
					if (typeof err.message=="string") debug(err.message);
				}
				return;
			}
			callback(that._getDataModelFromRecv(data)); // callback func
		});
	};

	IEQ.prototype._isDataModelWithNaN = function () {
		var dataModelNaN=false;
		var sensorNan;
		for(var n in this.dataModel) {
			sensorNan = this.dataModel[n].data.reduce(function (nanPres, d) {
				return nanPres && isNaN(d);
			}, false);
			dataModelNaN = dataModelNaN && sensorNan;
			debug(n+" with nan : "+sensorNan+" ("+dataModelNaN+") / "+this.dataModel[n].data.length);
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
		if ( callback==null || typeof callback !== 'function') return null;

		let watcher = new Watcher(this.selector, config);

		// add watcher in watcher list
		this.watchers.push(watcher);

		watcher.on('data', data => {
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
		this.watchers.find( (el, id, watchers) => {
			if (watcher === el) {
				watchers.splice(id, 1); // remove
				return true;
			}
			return false;
		})
	};

	/**
	 * Stop all watchers
	 */
	IEQ.prototype.closeSubscriptions = function () {
		console.warn('Deprecated function use stopWatchers instead');
		this.stopWatchers();
	};
	IEQ.prototype.stopWatchers = function () {
		this.watchers.forEach( watcher => {
			// remove listener on stop event to avoid purging watchers twice
			watcher.removeListener('stop', this._removeWatcher);
			watcher.stop();
		});
		this.watchers =[];
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

		if (csvConfig && typeof csvConfig.nlines != "number" ) csvConfig.nlines = undefined;

		var dataConfig =JSON.stringify({
			criteria: {
				time: { start: formatTime(csvConfig.startTime), end: formatTime(csvConfig.endTime), sampling:csvConfig.timeSample},
				places: [],
				robots: []
			},
			sensors: csvConfig.sensorNames,
			sampling: csvConfig.nlines
		});

		this.selector.request({
			service: "ieq",
			func: "CsvDataRequest",
			data: {data: dataConfig},
			//	type:"splReq",
			obj:{
				path: '/fr/partnering/Ieq',
				interface: "fr.partnering.Ieq"
			}
		}, function (dnId, err, data) {
			if (err) {
				if (typeof err =="string") debug("Recv err: "+ err);
				else if (typeof err == "object" && typeof err.name =='string') {
					callback(null, err.name);
					if (typeof err.message=="string") debug(err.message);
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
				time: {start: formatTime(time.startEpoch), end: formatTime(time.endEpoch), sampling: sample},
				places: [],
				robots: []
			},
			sensors: sensorNames
		};
		console.warn('This function will be deprecated. Please use "getDataMapData" instead.');
		this.getDataMapData(dataConfig, callback)
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
						debug(n+" was in error: "+data[n].err.msg);
						continue;
					}

					if (!dataModel)
						dataModel={};

					if (!dataModel[n]) {
						dataModel[n]={};
					}
					/* update data absolute range */
					dataModel[n].range=data[n].range;
					/* update data range */
					dataModel[n].timeRange=data[n].timeRange;
					/* update data label */
					dataModel[n].label=data[n].label;
					/* update data unit */
					dataModel[n].unit=data[n].unit;
					/* update data precision */
					dataModel[n].precision=data[n].precision;
					/* update data categories */
					dataModel[n].category=data[n].category;
					/* suggested y display range */
					dataModel[n].zoomRange = [0, 100];
					// update sensor confort range
					dataModel[n].confortRange = data[n].confortRange;

					/* update data indexRange */
					dataModel[n].qualityConfig={
						indexRange: data[n].indexRange
					};
					dataModel[n].time = this._coder.from(data[n].time, 'b64', 8);
					dataModel[n].data = (data[n].data != null)
						? this._coder.from(data[n].data, 'b64', 4)
						: ((data[n].avg != null)
						   ? this._coder.from(data[n].avg.d, 'b64', 4)
						   : null);
					dataModel[n].qualityIndex = (data[n].data != null)
						? this._coder.from(data[n].index, 'b64', 4)
						: ((data[n].avg != null)
						   ? this._coder.from(data[n].avg.i, 'b64', 4)
						   : null);
					dataModel[n].robotId = this._coder.from(data[n].robotId, 'b64', 4);
					if (dataModel[n].robotId != null) {
						/** dico robotId -> robotName **/
						var dicoRobot = {};
						data.header.robots.forEach(function (el) {
							dicoRobot[el.id]=el.name;
						});
						dataModel[n].robotId = dataModel[n].robotId.map(function (el) {
							return dicoRobot[el];
						});
					}

					dataModel[n].placeId = this._coder.from(data[n].placeId, 'b64', 4);
					dataModel[n].x = null;
					dataModel[n].y = null;

					if (data[n].avg != null)
						dataModel[n].avg = {
							d: this._coder.from(data[n].avg.d, 'b64', 4),
							i: this._coder.from(data[n].avg.i, 'b64', 4)
						};
					if (data[n].min != null)
						dataModel[n].min = {
							d: this._coder.from(data[n].min.d, 'b64', 4),
							i: this._coder.from(data[n].min.i, 'b64', 4)
						};
					if (data[n].max != null)
						dataModel[n].max = {
							d: this._coder.from(data[n].max.d, 'b64', 4),
							i: this._coder.from(data[n].max.i, 'b64', 4)
						};
					if (data[n].stddev != null)
						dataModel[n].stddev = {
							d: this._coder.from(data[n].stddev.d, 'b64', 4),
							i: this._coder.from(data[n].stddev.i, 'b64', 4)
						};
					if (data[n].stddev != null)
						dataModel[n].stddev = {
							d: this._coder.from(data[n].stddev.d, 'b64', 4),
							i: this._coder.from(data[n].stddev.i, 'b64', 4)
						};
					if (data[n].x != null)
						dataModel[n].x = this._coder.from(data[n].x, 'b64', 4);
					if (data[n].y != null)
						dataModel[n].y = this._coder.from(data[n].y, 'b64', 4);
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
})()
