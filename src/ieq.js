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
const ConnectorV1 = require('./v1/connector.js')
const ConnectorV2 = require('./v2/connector.js');

(function () {
	let DiyaSelector;
	try {
		// For browsers - d1 already defined
		DiyaSelector = d1.DiyaSelector;
	}
	catch (error) {
		if (error.name === 'ReferenceError') {
			// For nodejs - define d1
			const d1 = require('diya-sdk');
			DiyaSelector = d1.DiyaSelector;
		} else {
			throw error;
		}
	}

	'use strict';

	/** create Status service * */
	DiyaSelector.prototype.IEQ = function () {
		return new Promise((resolve, reject) => {
			this.request({
				service: 'ieq',
				func   : 'GetAPIVersion'
			}, (peerId, err, data) => {
				if (err == null) {
					resolve(data)
				} else {
					reject(err)
				}
			})
		})
		.then((data) => {
			if (data === 2) {
				return new ConnectorV2(this)
			}
			throw new Error('Cannot instantiate connector')
		})
		.catch((err) => {
			if (err.includes("Method 'GetAPIVersion' not found in introspection data")) {
				return new ConnectorV1(this)
			}
			throw new Error(err)
		})
	}
}())
