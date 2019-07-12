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
const filters = [
  'aspectFilter',
  'subjectTagFilter',
  'aspectTagFilter',
  'statusFilter',
];
const botAbsolutePath = '/Bots';
const subjectAttributesToAttach = ['absolutePath', 'name', 'tags'];
const ASPECT_INDEX = 0;
const SUBJECT_INDEX = 1;
const ObjectType = {
  Aspect: 'Aspect',
  Sample: 'Sample',
  Subject: 'Subject',
};

/**
 * A function to see if an object is a subject/aspect/sample. It returns
 * "Subject" if an object passed has 'parentAbsolutePath' as one of its
 * properties, "Aspect" if has "timeout" attribute, otherwise assumes it is
 * Sample.
 *
 * @param  {Object}  obj - An object instance
 * @returns {String} - returns the object type
 */
function whatAmI(obj) {
  if (obj.hasOwnProperty('parentAbsolutePath')) return ObjectType.Subject;
  if (obj.hasOwnProperty('timeout')) return ObjectType.Aspect;
  return ObjectType.Sample;
} // whatAmI

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
      // aspect: {
      //   name: obj.aspect.name,
      //   timeout: obj.aspect.timeout, // needed by lens
      // },
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
 * Returns true if at least one element of the array is present in the set.
 *
 * @param  {Set}  filterValueSet - A set of strings contaning filter values
 * @param  {Array}  objValueArr - A any array of strings contaning obj values
 * @returns {Boolean} - returns true if any of the elements of the obj value
 *  array is found in the filter value set
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
 * The filterString is used to extract the filterType and filter values and the
 * object is compared against the extracted filter to check if the field of the
 * object matches the filter criteria.
 *
 * @param  {String} filterString - String of the form filterType=values.
 * @param  {String|Array} objValues - The values of the object to be matched
 *  against filter criteria (empty array if none)
 * @returns {Boolean} - true if the object matches the filter criteria
 */
function applyFilter(filterString, objValues = []) {
  // Short-circuit return true if there is no filterString
  if (!filterString) return true;

  /*
   * The filter string is a name-value pair of the form `filterType=values`.
   * For example, aspect filterString `INCLUDE=Temperature,Humidity` has
   * filterType `INCLUDE` and aspect values `Temperature` and `Humidity`.
   * The "value" part of the name-value pair will be empty if the filter is not
   * set in the perspective.
   */
  const nvp = filterString.split(constants.fieldTypeFieldSeparator);

  /*
   * Short-circuit return true if the filterString is not a name-value pair
   * with an "=" separator.
   */
  if (nvp.length < 2) return true;

  // Get filter type (INCLUDE/EXCLUDE). Short-circuit return true if invalid.
  const filterType = nvp[0];
  if (!constants.validFilterTypes.includes(filterType)) return true;

  const filterValueSet = new Set(nvp[1].split(constants.valuesSeparator));
  const objValuesArr = Array.isArray(objValues) ? objValues : [objValues];
  const valueIsPresent = isPresent(filterValueSet, objValuesArr);

  if (filterType === constants.filterTypeInclude) return valueIsPresent;
  return !valueIsPresent; // otherwise it's an EXCLUDE filter
} // applyFilter

/**
 * Returns true if this object should be emitted as a real-time event to a
 * namespace (representing a perspective) given the various filters passed in
 * here as nspComponents.
 *
 * @param  {String} nspComponents - array of namespace strings for filtering
 * @param  {Object} obj - Object that is to be emitted to the client
 * @returns {Boolean} - true if this obj is to be emitted based on the filters
 *  represented by the nspComponents
 */
function perspectiveEmit(nspComponents, obj) {
  /*
   * Note: I perf tested these individual assignments from the nspComponents
   * array vs. using destructuring assignment, and individual assigments was
   * 10x faster.
   */
  const aspectFilter = nspComponents[constants.aspectFilterIndex];
  const subjectTagFilter = nspComponents[constants.subjectTagFilterIndex];
  const aspectTagFilter = nspComponents[constants.aspectTagFilterIndex];
  const statusFilter = nspComponents[constants.statusFilterIndex];

  /*
   * When none of the filters are set, the nspComponent just has the
   * subjectAbsolutePath in it, so we do not have to check for the filter
   * conditions and we can just return true.
   */
  if (nspComponents.length < 2) return true;

  /*
   * If the obj is a subject, just apply the subjectTagFilter and return the
   * result.
   */
  const objectType = whatAmI(obj);
  if (objectType === ObjectType.Subject) {
    return applyFilter(subjectTagFilter, obj.tags);
  }

  if (objectType === ObjectType.Aspect) {
    return applyFilter(aspectFilter, obj.aspect.name) &&
      applyFilter(aspectTagFilter, obj.tags);
  }

  return applyFilter(aspectFilter, obj.aspect.name) &&
    applyFilter(subjectTagFilter, obj.subject.tags) &&
    applyFilter(aspectTagFilter, obj.aspect.tags) &&
    applyFilter(statusFilter, obj.status);
} // perspectiveEmit

// OLD - remove along with namespace toggles
/**
 * Returns true if this object should be emitted as a real-time event to a
 * namespace (representing a room) given the various filters passed in here
 * as nspComponents.
 *
 * @param {String} nspComponents - array of namespace strings for filtering
 * @param {Object} obj - Object that is to be emitted to the client
 * @param {Object} pubOpts - Options for client and channel to publish with.
 * @returns {Boolean} - true if this obj is to be emitted based on the filters
 *  represented by the nspComponents
 */
function botEmit(nspComponents, obj, pubOpts) {
  if (!pubOpts) return false;
  const objFilter = nspComponents[pubOpts.filterIndex];
  return applyFilter(objFilter, obj[pubOpts.filterField]);
} // botEmit

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

  // OLD - remove along with namespace toggles
  if (absPathNsp === botAbsolutePath) {
    return botEmit(nspComponents, obj, pubOpts);
  }

  return false;
}

// OLD - remove along with namespace toggles
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

// OLD - remove along with namespace toggles
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

// OLD - remove along with namespace toggles
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

// OLD - remove along with namespace toggles
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
