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

const WatcherV1 = require('../v1/watcher.js')

class WatcherV2 extends WatcherV1 {
	/**
	 * @param emit emit data (mandatory)
	 * @param config to get data from server
	 */
	constructor (selector, _config) {
		super(selector, _config)
		this.selector = selector
	}

	getDataRequestObject () {
		return {
			path     : `/fr/partnering/Ieq/Request/${WatcherV2.formatPeerName(this.selector._connection.self())}`,
			interface: 'fr.partnering.Ieq.Request'
		}
	}

	getFireDataObject () {
		return {
			path     : `/fr/partnering/Ieq/Fire/${WatcherV2.formatPeerName(this.selector._connection.self())}`,
			interface: 'fr.partnering.Ieq.Fire'
		}
	}

	static formatPeerName (input, delimiter = '-') {
		return input.split(delimiter).map((s) => {
			return s.charAt(0).toUpperCase() + s.slice(1)
		}).join('')
	}
}

module.exports = WatcherV2
