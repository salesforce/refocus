/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * realTime/utils.js
 */
'use strict'; // eslint-disable-line strict
const ip = require('ip');
const constants = require('./constants');
const redisStore = require('../cache/sampleStore');
const logger = require('@salesforce/refocus-logging-client');
const Op = require('sequelize').Op;
const subjectAttributesToAttach = ['absolutePath', 'name', 'tags'];
const ASPECT_INDEX = 0;
const SUBJECT_INDEX = 1;

/**
 * The message object received from the redis channel, contains a "new" property
 * when a database instance is updated. This function checks to see if the
 * message object contains a "new" property, if it does, it returns the new
 * object.
 * @param {Object}  messgObj - Message object received from the redis channel.
 * @returns {Object} - returns the parsed message object.
 */
function parseObject(messgObj, key) {
  // If event is subject delete then send the old subject so that namespace
  // filter can send the delete event to perspectives
  if (messgObj.new) {
    return key === constants.events.subject.del ? messgObj.old : messgObj.new;
  }

  // If event is subject add then send the new subject so that namespace
  // filter can send the add event to perspectives
  if (key === constants.events.subject.add && messgObj.new) {
    return messgObj.new;
  }

  return messgObj;
}

/**
 * Utility function checks an ip address against a whitelist.
 *
 * @param {String} addr - The address to test
 * @param {Array} whitelist - An array of arrays
 * @returns {Boolean} true if address is whitelisted
 * @throws {Error} if address is NOT whitelisted
 */
function isIpWhitelisted(addr, whitelist) {
  /*
   * if the whitelist passed is not defined or it is not an array, assume
   * that the ip address is whitelisted
   */
  if (!Array.isArray(whitelist)) {
    return true;
  }

  const thisAddr = ip.toLong(addr);
  const ok = whitelist.some((range) => {
    if (Array.isArray(range) && range.length === 2) {
      const lo = ip.toLong(range[0]);
      const hi = ip.toLong(range[1]);
      if (lo <= hi && thisAddr >= lo && thisAddr <= hi) {
        return true;
      }
    }

    return false;
  });

  if (ok) {
    return ok;
  }

  throw new Error(`IP address "${addr}" is not whitelisted`);
} // isIpWhitelisted

/**
 * When passed in a sample, its related subject and aspect is attached to the
 * sample. If useSampleStore is set to true, the subject ans aspect is fetched
 * for the cache instead of the database.
 * @param {Object} sample - The sample instance.
 * @param {Model} subjectModel - The database subject model.
 * @param {Model} aspectModel - The database aspect model.
 * @returns {Promise} - which resolves to a complete sample with its subject and
 *   aspect.
 */
function attachAspectSubject(sample, subjectModel, aspectModel) {
  // check if sample object contains name
  if (!sample.name || sample.name.indexOf('|') < 0) {
    logger.error('sample object does not contain name', JSON.stringify(sample));
    logger.verbose('from attachAspectSubject' + '\n' + new Error().stack);
    return Promise.resolve(null);
  }

  const nameParts = sample.name.split('|');
  const subAbsPath = nameParts[0];
  const aspName = nameParts[1];

  // Lookup by id is faster than case-insensitive ILIKE on absolutePath
  let subFinder;
  if (!sample.subject && subjectModel) {
    if (sample.subjectId) {
      subFinder = subjectModel.unscoped().findByPk(sample.subjectId, {
        attributes: subjectAttributesToAttach,
      });
    } else {
      subFinder = subjectModel.unscoped().findOne({
        where: {
          absolutePath: { [Op.iLike]: subAbsPath },
        },
        attributes: subjectAttributesToAttach,
      });
    }
  }

  // Lookup by id is faster than case-insensitive ILIKE on name
  let aspFinder;
  if (!sample.aspect && aspectModel) {
    if (sample.aspectId) {
      aspFinder = aspectModel.findByPk(sample.aspectId);
    } else {
      aspFinder = aspectModel.findOne({
        where: {
          name: { [Op.iLike]: aspName },
        },
      });
    }
  }

  if (sample.aspect) {
    redisStore.arrayObjsStringsToJson(
      sample.aspect,
      redisStore.constants.fieldsToStringify.aspect
    );
  }

  if (sample.subject) {
    redisStore.arrayObjsStringsToJson(
      sample.subject,
      redisStore.constants.fieldsToStringify.subject
    );
  }

  return Promise.all([
    sample.aspect ? sample.aspect : aspFinder,
    sample.subject ? sample.subject : subFinder,
  ])
  .then((response) => {
    let asp = response[ASPECT_INDEX];
    let sub = response[SUBJECT_INDEX];

    if (!sub) {
      const message = `Subject not found (${sample.subjectId || subAbsPath})`;
      throw new Error(message);
    }

    if (!asp) {
      const message = `Aspect not found (${sample.aspectId || aspName})`;
      throw new Error(message);
    }

    sub = sub.get ? sub.get() : sub;
    asp = asp.get ? asp.get() : asp;

    delete asp.writers;
    delete sub.writers;

    sample.aspect = asp;
    sample.subject = sub;

    /*
     * attach absolutePath field to the sample. This is done to simplify the
     * filtering done on the subject absolutePath
     */
    sample.absolutePath = subAbsPath;
    return sample;
  });
} // attachAspectSubject

module.exports = {
  attachAspectSubject,
  isIpWhitelisted,
  parseObject,
}; // exports
