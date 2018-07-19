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
const redisClient = require('../cache/redisCache').client.sampleStore;
const redisStore = require('../cache/sampleStore');
const logger = require('winston');
const featureToggles = require('feature-toggles');
const Op = require('sequelize').Op;
const eventName = {
  add: 'refocus.internal.realtime.subject.add',
  upd: 'refocus.internal.realtime.subject.update',
  del: 'refocus.internal.realtime.subject.remove',
};
const filters = [
  'aspectFilter',
  'subjectTagFilter',
  'aspectTagFilter',
  'statusFilter',
];
const botAbsolutePath = '/Bots';

/**
 * A function to see if an object is a subject object or not. It returns true
 * if an object passed has 'parentAbsolutePath' as one of its property.
 * @param  {Object}  obj - An object instance
 * @returns {Boolean} - returns true if the object has the property
 * "parentAbsolutePath"
 */
function isThisSubject(obj) {
  return obj.hasOwnProperty('parentAbsolutePath');
}

/**
 * Transforms and returns the stringified object.
 * If the key, i.e. the event type, ends with "update", then return the
 * stringified object with the specified key as the property and the given
 * object as the value of a "new" property.
 * If the key is the sample "no change" event, then the sample object to be
 * emitted should only have name and updatedAt attributes.
 * Otherwise, return the stringified object with the specified key as the
 * property name and the given object as the value.
 *
 * @param {String} key - The key of the returned object, i.e. the event type.
 * @param {Object} obj - The object to return.
 * @returns {String} - The stringified object nested inside the key (and also
 *  nested inside "new" if the event is an "update").
 */
function getNewObjAsString(key, obj) {
  const wrappedObj = {};
  if (key.endsWith('update')) {
    wrappedObj[key] = { new: obj };
  } else if (key === constants.events.sample.nc) {
    wrappedObj[key] = {
      name: obj.name,
      updatedAt: obj.updatedAt,
      aspect: {
        name: obj.aspect.name,
        timeout: obj.aspect.timeout, // needed by lens
      },
    };
  } else {
    wrappedObj[key] = obj;
  }

  return JSON.stringify(wrappedObj);
}

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
    return key === eventName.del ? messgObj.old : messgObj.new;
  }

  // If event is subject add then send the new subject so that namespace
  // filter can send the add event to perspectives
  if (key === eventName.add && messgObj.new) {
    return messgObj.new;
  }

  return messgObj;
}

/**
 * A function that checks if atleast one element of an array is present in a
 * set and returns true if present.
 * @param  {Set}  filterValueSet - A set of strings contaning filter values
 * @param  {Array}  objValueArr - A any array of strings  contaning obj values
 * @returns {Boolean} - returns true if any of the elements of the obj value
 * array is found in the filter value set
 */
function isPresent(filterValueSet, objValueArr) {
  for (let i = 0; i < objValueArr.length; i++) {
    if (filterValueSet.has(objValueArr[i])) {
      return true;
    }
  }

  return false;
}

/**
 * The filterString is used to extract the filterType and filter values and
 * the object is compared against the extracted filter to check if the field
 * of the object matches the filter criteria.
 * @param  {String} filterString - String of the form filterType=values.
 * @param  {String|Array} objValues - The values of the object, that is to be
 * matched against a filter criteria
 * @returns {Boolean} - true if the object matches the filter criteria, false
 * otherwise.
 */
function applyFilter(filterString, objValues) {
  const objValueArr = [];
  if (objValues && Array.isArray(objValues)) {
    objValues.forEach((obj) => {
      objValueArr.push(obj);
    });
  } else {
    objValueArr.push(objValues);
  }

  /*
   * The filter string is of the form filterType=values. For example,
   * an aspect filterString will be of the form INCLUDE=Temperature,Humidity
   * where temperature and humidity are the aspects and INCLUDE is the
   * filterType
   */
  if (filterString) {
    const filterComponents =
      filterString.split(constants.fieldTypeFieldSeparator);

    /*
     * When the filters are not set the size of the filterComponents array is
     * less than 2 and we are returning true,
     *
     */
    if (filterComponents.length < 2) {
      return true;
    }

    // filter type is either INCLUDE or EXCLUDE
    const filterType = filterComponents[0];

    /*
     * field values is an empty string('') when any of the filters are not
     * set in the perspective
     */
    const filterValues = filterComponents[1];
    const filterValueSet = new Set(filterValues.split(constants
                                                  .valuesSeparator));

    if (filterType === constants.filterTypeInclude) {
      /*
       * If any of the values in the objValueArr is found in the filterValueSet
       * return true.
       */
      return isPresent(filterValueSet, objValueArr);
    }

    /*
     * if any of the values in the objValueArr is found in the filterValueSet
     * return false
     */
    return !isPresent(filterValueSet, objValueArr);
  }

  return true;
}

/**
 * The decision to emit an object over a namespace identified by the nspComponents
 * variable happens here. The nspComponents are decoded to various filters and the
 * filters are compared with the obj to decide whether this object should be
 * emitted over the namespace identified by the nspComponents variable
 * @param  {String} nspComponents - array of namespace strings for filtering
 * @param  {Object} obj - Object that is to be emitted to the client
 * @returns {Boolean} - true if this obj is to be emitted over this namespace
 * identified by this namespace string.
 */
function perspectiveEmit(nspComponents, obj) {
  const aspectFilter = nspComponents[constants.aspectFilterIndex];
  const subjectTagFilter = nspComponents[constants.subjectTagFilterIndex];
  const aspectTagFilter = nspComponents[constants.aspectTagFilterIndex];
  const statusFilter = nspComponents[constants.statusFilterIndex];

  /*
   * When none of the filters are set, the nspComponent just has the
   * subjectAbsolutePath in it, so we do not have to check for the filter
   * conditions and we just need to return true.
  */
  if (nspComponents.length < 2) {
    return true;
  }

  /*
   * if this is a subject object, just apply the subjectTagFilter and return
   * the results
   */
  if (isThisSubject(obj)) {
    return applyFilter(subjectTagFilter, obj.tags);
  }

  // apply all the filters and return the result
  return applyFilter(aspectFilter, obj.aspect.name) &&
    applyFilter(subjectTagFilter, obj.subject.tags) &&
    applyFilter(aspectTagFilter, obj.aspect.tags) &&
    applyFilter(statusFilter, obj.status);
}

/**
 * The decision to emit an object over a namespace identified by the nspComponents
 * variable happens here. The nspComponents are decoded to various filters and the
 * filters are compared with the obj to decide whether this object should be
 * emitted over the namespace identified by the nspComponents variable
 * @param {String} nspComponents - array of namespace strings for filtering
 * @param {Object} obj - Object that is to be emitted to the client
 * @param {Object} pubOpts - Options for client and channel to publish with.
 * @returns {Boolean} - true if this obj is to be emitted over this namespace
 * identified by this namespace string.
 */
function botEmit(nspComponents, obj, pubOpts) {
  if (pubOpts) {
    const objFilter = nspComponents[pubOpts.filterIndex];
    return applyFilter(objFilter, obj[pubOpts.filterField]);
  }

  return false;
}

/**
 * Splits up the nspString into its components and decides if it is a bot or a
 * perspective that needs to be emitted.
 *
 * @param {String} nspString - A namespace string, that identifies a
 *  socketio namespace
 * @param {Object} obj - Object that is to be emitted to the client
 * @param {Object} pubOpts - Options for client and channel to publish with.
 * @returns {Boolean} - true if this obj is to be emitted over this namespace
 *  identified by this namespace string.
 */
function shouldIEmitThisObj(nspString, obj, pubOpts) {
  // Extract all the components which make up a namespace.
  const nspComponents = nspString.split(constants.filterSeperator);
  const absPathNsp = nspComponents[constants.asbPathIndex];
  const absolutePathObj = '/' + obj.absolutePath;

  /*
   * Note: we are using `str1.indexOf(str2) === 0` here instead of the more
   * intuitve `str1.startsWith(str2)` because performance tested better.
   */
  if (absolutePathObj.indexOf(absPathNsp) === 0) {
    return perspectiveEmit(nspComponents, obj);
  }

  if (absPathNsp === botAbsolutePath) {
    return botEmit(nspComponents, obj, pubOpts);
  }

  return false;
}

/**
 * When passed a perspective object, it returns a namespace string based on the
 * fields set in the prespective object. A namespace string is of the format
 * subjectAbsolutePath&aspectFilterType=aspectNames&
 * subjectTagFilterType=subjectTags&aspectTagFilterType=aspectTags&
 * statusFilterType=statusFilter.
 * NOTE: It looks like socketIO is not able to send data over namespace
 * containing ',' and a combination of '&|' characters.
 * @param  {Instance} inst - Perspective object
 * @returns {String} - namespace string.
 */
function getPerspectiveNamespaceString(inst) {
  let namespace = '/';
  if (inst.rootSubject) {
    namespace += inst.rootSubject;
  }

  for (let i = 0; i < filters.length; i++) {
    if (inst[filters[i]] && inst[filters[i]].length) {
      namespace += constants.filterSeperator + inst[filters[i] + 'Type'] +
              constants.fieldTypeFieldSeparator +
              inst[filters[i]].join(constants.valuesSeparator);
    } else {
      namespace += constants.filterSeperator + inst[filters[i] + 'Type'];
    }
  }

  return namespace;
}

/**
 * When passed a room object, it returns a namespace string based on the
 * fields set in the room object.
 * @param  {Instance} inst - Room object
 * @returns {String} - namespace string.
 */
function getBotsNamespaceString(inst) {
  let namespace = botAbsolutePath;
  if (inst) {
    namespace += constants.filterSeperator + inst.name;
  }

  return namespace;
}

/**
 * Initializes a socketIO namespace based on the perspective object.
 * @param {Instance} inst - The perspective instance.
 * @param {Socket.io} io - The socketio's server side object
 * @returns {Set} - The socketio server side object with the namespaces
 * initialized
 */
function initializePerspectiveNamespace(inst, io) {
  const nspString = getPerspectiveNamespaceString(inst);
  io.of(nspString);
  return io;
}

/**
 * Initializes a socketIO namespace based on the bot object.
 * @param {Instance} inst - The perspective instance.
 * @param {Socket.io} io - The socketio's server side object
 * @returns {Set} - The socketio server side object with the namespaces
 * initialized
 */
function initializeBotNamespace(inst, io) {
  const nspString = getBotsNamespaceString(inst);
  io.of(nspString);
  return io;
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
    console.trace('from attachAspectSubject');
    return Promise.resolve(null);
  }

  let nameParts = sample.name.split('|');
  const subAbsPath = nameParts[0];
  const aspName = nameParts[1];
  let promiseArr = [];
  if (featureToggles.isFeatureEnabled('attachSubAspFromDB')) {
    const subOpts = {
      where: {
        absolutePath: { [Op.iLike]: subAbsPath },
      },
    };
    const aspOpts = {
      where: {
        name: { [Op.iLike]: aspName },
      },
    };
    let getAspectPromise;
    if (featureToggles.isFeatureEnabled('attachSubAspFromDBuseScopes')) {
      getAspectPromise =
        aspectModel.scope({ method: ['forRealTime', aspName] }).findOne();
    } else {
      getAspectPromise = sample.aspect ? Promise.resolve(sample.aspect) :
        aspectModel.findOne(aspOpts);
    }

    let getSubjectPromise;
    if (featureToggles.isFeatureEnabled('attachSubAspFromDBuseScopes')) {
      getSubjectPromise =
        subjectModel.scope({ method: ['forRealTime', subAbsPath] }).findOne();
    } else {
      getSubjectPromise = sample.subject ? Promise.resolve(sample.subject) :
        subjectModel.findOne(subOpts);
    }

    promiseArr = [getAspectPromise, getSubjectPromise];
  } else {
    const subKey = redisStore.toKey('subject', subAbsPath);
    const aspKey = redisStore.toKey('aspect', aspName);
    const getAspectPromise = sample.aspect ? Promise.resolve(sample.aspect) :
    redisClient.hgetallAsync(aspKey);
    const getSubjectPromise = sample.subject ? Promise.resolve(sample.subject) :
    redisClient.hgetallAsync(subKey);
    promiseArr = [getAspectPromise, getSubjectPromise];
  }

  return Promise.all(promiseArr)
  .then((response) => {
    let asp = response[0];
    let sub = response[1];
    if (featureToggles.isFeatureEnabled('attachSubAspFromDBuseScopes')) {
      asp = asp.dataValues ? asp.dataValues : asp;
      sub = sub.dataValues ? sub.dataValues : sub;
    } else {
      asp = asp.get ? asp.get() : asp;
      sub = sub.get ? sub.get() : sub;
    }

    delete asp.writers;
    delete sub.writers;

    sample.aspect = featureToggles.isFeatureEnabled('attachSubAspFromDB') ?
      asp : redisStore.arrayObjsStringsToJson(asp,
        redisStore.constants.fieldsToStringify.aspect);
    sample.subject = featureToggles.isFeatureEnabled('attachSubAspFromDB') ?
      sub : redisStore.arrayObjsStringsToJson(sub,
        redisStore.constants.fieldsToStringify.subject);
    /*
     * attach absolutePath field to the sample. This is done to simplify the
     * filtering done on the subject absolutePath
     */
    sample.absolutePath = subAbsPath;
    return sample;
  });
} // attachAspectSubject

module.exports = {
  applyFilter, // for testing only
  attachAspectSubject,
  getBotsNamespaceString,
  getNewObjAsString,
  getPerspectiveNamespaceString,
  initializeBotNamespace,
  initializePerspectiveNamespace,
  isIpWhitelisted,
  parseObject,
  shouldIEmitThisObj,
}; // exports
