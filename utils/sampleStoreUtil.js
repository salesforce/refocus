/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * utils/sampleStoreUtil.js
 *
 * Assumes that there is a Set in Redis with key "samsto:subjects" and a Hash
 * in Redis for every subject which has samples, keyed like
 * "samsto:subjects:LOWERCASE_OF_SUBJECT_ABSOLUTE_PATH". Each Hash contains
 * the subject's samples: each field in the Hash is a lower-case aspect name,
 * with the value being the stringified sample.
 */
'use strict'; // eslint-disable-line strict
const r = require('../cache/redisCache').client;
const Sample = require('../db').Sample;
const PFX = 'samsto';
const SEP = ':';
const SUBJECT_SET = PFX + SEP + 'subjects';
const SAMPLE_SET = PFX + SEP + 'samples';

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
  console.log(`REDIS COMMAND: smembers ${SUBJECT_SET}`);
  return r.smembersAsync(SUBJECT_SET)
  .then((subjectKeys) => {
    console.log(`REDIS RESPONSE: ${subjectKeys}`);
    subjectKeys.push(SUBJECT_SET);
    console.log(`REDIS COMMAND: del ${subjectKeys}`);
    return r.delAsync(subjectKeys);
  })
  .then((res) => {
    console.log(`REDIS RESPONSE: ${res}`);
    console.log(`REDIS COMMAND: smembers ${SAMPLE_SET}`);
    return r.smembersAsync(SAMPLE_SET);
  })
  .then((sampleKeys) => {
    console.log(`REDIS RESPONSE: ${sampleKeys}`);
    sampleKeys.push(SAMPLE_SET);
    console.log(`REDIS COMMAND: del ${sampleKeys}`);
    return r.delAsync(sampleKeys);
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
  console.log('Initialize the sample store');
  return purge()
  .then(() => Sample.findAll())
  .then((samples) => {
    const subjectKeys = new Set();
    const sampleKeys = new Set();
    const commands = [];
    console.log(`Found ${samples.length} samples to store in redis`);
    samples.forEach((i) => {
      const sample = i.get();
      const subkey = SUBJECT_SET + SEP +
        getAbsolutePath(sample.name).toLowerCase();
      subjectKeys.add(subkey);
      const samkey = sample.aspect.name.toLowerCase();
      delete sample.aspect;
      commands.push(['sadd', subkey, samkey]);

      // push each of the sample into its own hash map
      const sampleHashKey = SAMPLE_SET + SEP + sample.name.toLowerCase();
      const sampleFileds = Object.keys(sample);
      sampleKeys.add(sampleHashKey);
      sampleFileds.forEach((field) => {
        if (sample[field]) {

          // assuming we just need to stringify only the arrays.
          if (Array.isArray(sample[field])) {
            commands.push(['hset', sampleHashKey, field,
              JSON.stringify(sample[field])]);
          } else {
            commands.push(['hset', sampleHashKey, field, sample[field]]);
          }
        }

      });
    });
    commands.push(['sadd', SUBJECT_SET, Array.from(subjectKeys)]);
    commands.push(['sadd', SAMPLE_SET, Array.from(sampleKeys)]);
    console.log('REDIS COMMANDS (BATCH):', commands);
    return r.batch(commands).execAsync();
  })
  .then((res) => {
    console.log('REDIS RESPONSES (BATCH):', res);
    console.log('Finished initializing the sample store');
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
