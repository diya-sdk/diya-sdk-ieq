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

const WatcherV2   = require('../v2/watcher.js')
const ConnectorV1 = require('../v1/connector.js')

class ConnectorV2 extends ConnectorV1 {
	constructor (selector) {
		super(selector)
		this.selector = selector
		return this
	}

	getUpdateDataObject () {
		return {
			path     : `/fr/partnering/Ieq/Update/${WatcherV2.formatPeerName(this.selector._connection.self())}`,
			interface: 'fr.partnering.Ieq.Update'
		}
	}

	getCsvDataObject () {
		return {
			path     : `/fr/partnering/Ieq/Export/${WatcherV2.formatPeerName(this.selector._connection.self())}`,
			interface: 'fr.partnering.Ieq.Export'
		}
	}

	createWatcher (config) {
		return new WatcherV2(this.selector, config)
	}
}

module.exports = ConnectorV2
