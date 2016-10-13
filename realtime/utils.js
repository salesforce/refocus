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
const constants = require('./constants');

/**
 * A function to see if an object is a subject object or not. It returns true
 * if an object passed has 'parentAbsolutePath' as one of its property.
 * @param  {Object}  obj - An object instance
 * @returns {Boolean} - returns true if the object has parentAbsolutePath has
 * one of its property.
 */
function isThisSubject(obj) {
  return obj.hasOwnProperty('parentAbsolutePath');
}

/**
 * The message object received from the redis channel, contains a "new" property
 * when a database instance is updated. This function check to see if the
 * message object contains a "new" property, if it does, it returns the new
 * object.
 * @param {Object}  messgObj - Message object received from the redis channel.
 * @returns {Object} - returns the parsed message object.
 */
function parseObject(messgObj) {
  if (messgObj.new) {
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
 * @param  {String} filterString - String of the form filterType|values.
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
    const filterComponents = filterString
                                .split(constants.fieldTypeFieldSeparator);

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
     * if any of the values in the objValueArr is found in the filterValueSet
     * return true
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
 * The decision to emit an object over a namespace identified by the nspString
 * variable happens here. The nspString is decoded to various filters and the
 * filters are compared with the obj to decide whether this object should be
 * emitted over the namespace identified by the nspString variable
 * @param  {String} nspString - A namespace string, that identifies a
 * socketio namespace
 * @param  {Object} obj - Object that is to be emitted to the client
 * @returns {Boolean} - true if this obj is to be emitted over this namespace
 * identified by this namespace string.
 */
function shouldIEmitThisObj(nspString, obj) {
  // extract all the components that makes up a namespace.
  const nspComponents = nspString.split(constants.filterSeperator);
  const absPathNsp = nspComponents[constants.asbPathIndex];
  const aspectFilter = nspComponents[constants.aspectFilterIndex];
  const subjectTagFilter = nspComponents[constants.subjectTagFilterIndex];
  const aspectTagFilter = nspComponents[constants.aspectTagFilterIndex];
  const statusFilter = nspComponents[constants.statusFilterIndex];

  // extract absolute path from the message object
  const absolutePathObj = '/' + obj.absolutePath;

  if ((absolutePathObj).startsWith(absPathNsp)) {
   /*
    * when none of the filters are set, the nspComponent just has the
    * subjectAbsolutePath in it, so we do not have to check for the
    * filter conditions and we just need to return true.
    */
    if (nspComponents.length < 2) {
      return true;
    }

    /*
     * if this is a subject object, just apply the subjcTagFilter and return
     * the results
     */
    if (isThisSubject(obj)) {
      return applyFilter(subjectTagFilter, obj.tags);
    }

    // apply all the filters and return the result
    return applyFilter(aspectFilter, obj.aspect.name) &&
      applyFilter(subjectTagFilter, obj.subject.tags) &&
      applyFilter(aspectTagFilter, obj.aspect.tags) &&
      applyFilter(statusFilter, obj.status) ;
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
function getNamespaceString(inst) {
  let namespace = '/';
  if (inst.rootSubject) {
    namespace += inst.rootSubject;
  }
  if (inst.aspectFilter) {
    namespace += constants.filterSeperator + inst.aspectFilterType +
                constants.fieldTypeFieldSeparator +
                inst.aspectFilter.join(constants.valuesSeparator);
  } else {
    namespace += constants.filterSeperator + inst.aspectFilterType;
  }
  if (inst.subjectTagFilter) {
    namespace += constants.filterSeperator + inst.subjectTagFilterType +
                constants.fieldTypeFieldSeparator +
                inst.subjectTagFilter.join(constants.valuesSeparator);
  } else {
    namespace += constants.filterSeperator + inst.subjectTagFilterType;
  }
  if (inst.aspectTagFilter) {
    namespace += constants.filterSeperator + inst.aspectTagFilterType +
                constants.fieldTypeFieldSeparator +
                inst.aspectTagFilter.join(constants.valuesSeparator);
  } else {
    namespace += constants.filterSeperator + inst.aspectTagFilterType;
  }
  if (inst.statusFilter) {
    namespace += constants.filterSeperator + inst.statusFilterType +
                constants.fieldTypeFieldSeparator +
                inst.statusFilter.join(constants.valuesSeparator);
  } else {
    namespace += constants.filterSeperator + inst.statusFilterType;
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
function initializeNamespace(inst, io) {
  const nspString = getNamespaceString(inst);
  io.of(nspString);
  return io;
}

module.exports = {

  getNamespaceString,
  initializeNamespace,
  parseObject,
  shouldIEmitThisObj,

}; // exports
