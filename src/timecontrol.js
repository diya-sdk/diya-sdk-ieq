/***************************************************/
/*
/***************************************************/

const debug = require('debug')('ieq:timecontrol');

'use strict';


/**
 * Convert time to number of milliseconds as used in IEQ API
 * @param {object,string,date,number} time - time to be formatted
 * @return {number} time - in ms
 */
let formatTime = function (time) {
	return new Date(time).getTime();
};

/**
 * Get time sampling from time range.
 * Set sampling is structure provided in parameter
 * @param {object} time - time criteria i.e. defining range
 * @param {number} maxSamples - max number of samples to be displayed
 * @return {string} timeSampling - computed timeSampling
 */
let getTimeSampling = function (time, maxSamples) {
	// do nothing without time being defined
	if (time == null) {
		return undefined;
	}
	// default maxSamples
	if (maxSamples == null) {
		maxSamples = 300;
	}

	// assume default time.range is 1
	let range = time.range;
	if (range == null) {
		range = 1;
	}

	// range unit to seconds
	let timeInSeconds = {
		"second": 1,
		"minute": 60,
		"hour": 3600,
		"day": 24 * 3600,
		"week": 7 * 24 * 3600,
		"month": 30 * 24 * 3600,
		"year": 365 * 24 * 3600
	};

	// ordered time thresholds
	let samplingThresholds = [
		{thresh: maxSamples, sampling: "Second"},
		{thresh: maxSamples*60, sampling: "Minute"},
		{thresh: maxSamples*3600, sampling: "Hour"},
		{thresh: maxSamples*24*3600, sampling: "Day"},
		{thresh: maxSamples*7*24*3600, sampling: "Week"},
		{thresh: maxSamples*30*24*3600, sampling: "Month"}
	];

	let timeUnit = time.rangeUnit.toLowerCase();
	let last = timeUnit.length-1;
	// remove trailing 's'
	if (timeUnit[last] === 's') {
		timeUnit = timeUnit.slice(0, last);
	}

	let timeInSec = range * timeInSeconds[timeUnit];
	debug("timeInSec: " + timeInSec);

	let timeSampling = "Year"; // default sampling
	// find smallest threshold above timeSec to determine sampling
	samplingThresholds.find( samplingThreshold => {
		// update sampling until first threshold above timeSec
		timeSampling = samplingThreshold.sampling;
		return timeInSec < samplingThreshold.thresh;
	});

	debug(timeSampling);
	return timeSampling;
}

// export functions
module.exports = {
	formatTime: formatTime,
	getTimeSampling: getTimeSampling
};
