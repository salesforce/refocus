/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * utils/aspectStoreUtil.js
 *
 * Assumes that there is a Set in Redis with key "samsto:subjects" and a Hash
 * in Redis for every subject which has samples, keyed like
 * "samsto:subjects:LOWERCASE_OF_SUBJECT_ABSOLUTE_PATH". Each Hash contains
 * the subject's samples: each field in the Hash is a lower-case aspect name,
 * with the value being the stringified sample.
 */
'use strict'; // eslint-disable-line strict
const r = require('../cache/redisCache').client;
const Aspect = require('../db').Aspect;
const PFX = 'refocache';
const SEP = ':';
const ASPECT_SET = PFX + SEP + 'aspects';

/**
 * Get subject absolute path from sample name.
 *
 * @param {String} name - The sample name.
 * @return {String} - The subject's absolute path.
 */
function getAbsolutePath(name) {
  return name.split('|')[0];
} // getAbsolutePath

/**
 * Removes the entire sample store.
 *
 * @returns {Promise} - Resolves to true or rejects on error.
 */
function purge() {
  console.log('the purge begins');
  console.log(`REDIS COMMAND: smembers ${ASPECT_SET}`);
  return r.smembersAsync(ASPECT_SET)
  .then((aspectKeys) => {
    console.log(`REDIS RESPONSE: ${aspectKeys}`);
    aspectKeys.push(ASPECT_SET);
    console.log(`REDIS COMMAND: del ${aspectKeys}`);
    return r.delAsync(aspectKeys);
  })
  .then((res) => {
    console.log(`REDIS RESPONSE: ${res}`);
    console.log('completed purge');
    return true;
  })
  .catch((err) => {
    console.error(err);
    throw err;
  });
} // purge

/**
 * Purges the sample store then populates it anew from the db.
 *
 * @returns {Promise} - Resolves to true or rejects on error.
 */
function init() {
  console.log('Initialize the aspect store');
  return purge()
  .then(() => Aspect.findAll())
  .then((aspects) => {
    const aspectKeys = new Set();
    const commands = [];
    console.log(`Found ${aspects.length} aspect to store in redis`);
    aspects.forEach((asp) => {
      const aspect = asp.get();
      const aspectkey = ASPECT_SET + SEP +
        getAbsolutePath(aspect.name).toLowerCase();
      aspectKeys.add(aspectkey);
      commands.push(['set', aspectkey, JSON.stringify(aspect)]);
    });
    commands.push(['sadd', ASPECT_SET, Array.from(aspectKeys)]);
    console.log('REDIS COMMANDS (BATCH):', commands);
    return r.batch(commands).execAsync();
  })
  .then((res) => {
    console.log('REDIS RESPONSES (BATCH):', res);
    console.log('Finished initializing the aspect store');
    return true;
  })
  .catch((err) => {
    console.error(err);
    throw err;
  });
} // init

module.exports = {
  init,
};
