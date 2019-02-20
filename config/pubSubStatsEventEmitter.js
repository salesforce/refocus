/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /config/pubSubStatsEventEmitter.js
 *
 * Clock job will emit the "timesup" message
 * Web dynos will listen and dump
 */
const EventEmitter = require('events');
class PubSubStatsEventEmitter extends EventEmitter {};
module.exports = new PubSubStatsEventEmitter();
