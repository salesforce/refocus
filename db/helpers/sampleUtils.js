/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/helpers/sampleUtils.js
 *
 * Used by the Sample model to compute a sample's status.
 */
'use strict'; // eslint-disable-line strict
const constants = require('../constants');
const dbErrors = require('../dbErrors');
const fourByteBase = 2;
const fourByteExponent = 31;
const fourByteLimit = Math.pow(fourByteBase, fourByteExponent);
const neg = -1;
const negFourByteLimit = neg * fourByteLimit;
const HOURS_PER_DAY = 24;
const MINS_PER_HOUR = 60;
const SECS_PER_MIN = 60;
const MILLISECS_PER_SEC = 1000;

/**
 * Validates the range.
 *
 * @param {Array} range - The range to validate
 * @returns {Boolean} true if range is not null AND range is an array AND
 *  range array has two elements AND at least one of its two elements is not
 *  null
 */
function rangeOK(range) {
  return range !== null &&
    Array.isArray(range) &&
    range.length === 2 &&
    (range[0] !== null || range[1] !== null);
}

/**
 * Helps determine whether the value is in the range.
 *
 * @param {any} val - The value to test
 * @param {Array} range - The range to test
 * @returns {Boolean} true if the value is greater than or equal to the first
 *  element of the range array
 */
function gteLowerRange(val, range) {
  if (range[0] === null) {
    return val >= negFourByteLimit;
  }

  return val >= range[0];
}

/**
 * Helps determine whether the value is in the range.
 *
 * @param {any} val - The value to test
 * @param {Array} range - The range to test
 * @returns {Boolean} true if the value is less than or equal to the second
 *  element of the range array
 */
function lteUpperRange(val, range) {
  if (range[1] === null) {
    return val <= fourByteLimit;
  }

  return val <= range[1];
}

/**
 * Determines whether the value is in the range.
 *
 * @param {any} val - The value to test
 * @param {Array} range - The range to test
 * @returns {Boolean} true if the value is in the range
 */
function inRange(val, range) {
  return rangeOK(range) &&
    gteLowerRange(val, range) &&
    lteUpperRange(val, range);
}

/**
 * Computes status based on the value and the ranges defined in the associated
 * aspect.
 *
 * @param {Aspect} aspect - The associated aspect which provides the ranges are
 *  used to determine the status to assign
 * @param {String} value - The value to evaluate.
 * @returns {String} status, based on the value and the aspect status
 *  ranges
 */
function computeStatus(aspect, value) {
  // Invalid if no aspect or if value is not a non-empty string!
  if (!aspect || typeof value !== 'string' || value.length === 0) {
    return constants.statuses.Invalid;
  }

  // "Timeout" special case
  if (value === constants.statuses.Timeout) {
    return constants.statuses.Timeout;
  }

  let num;

  // Boolean value type: Case-insensitive 'true'
  if (value.toLowerCase() === 'true') {
    num = 1;
  } else if (value.toLowerCase() === 'false') {
    // Boolean value type: Case-insensitive 'false'
    num = 0;
  } else {
    num = Number(value);
  }

  // If not true|false|Timeout, then value must be convertible to number!
  if (isNaN(num)) {
    return constants.statuses.Invalid;
  }

  if (inRange(num, aspect.criticalRange)) {
    return constants.statuses.Critical;
  } else if (inRange(num, aspect.warningRange)) {
    return constants.statuses.Warning;
  } else if (inRange(num, aspect.infoRange)) {
    return constants.statuses.Info;
  } else if (inRange(num, aspect.okRange)) {
    return constants.statuses.OK;
  }

  return constants.statuses.Invalid;
} // computeStatus

/**
 * Parses a sample name into its separate parts, i.e. the subject absolute
 * path and the aspect name.
 *
 * @param {String} name - The sample name
 * @returns {Object} containing subject.absolutePath and aspect.name
 * @throws {ResourceNotFoundError} if the name cannot be split in two using
 *  constants.sampleNameSeparator
 */
function parseName(name) {
  const retval = {
    subject: {
      absolutePath: undefined,
    },
    aspect: {
      name: undefined,
    },
  };
  const arr = (name || '').split(constants.sampleNameSeparator);
  if (arr.length === 2) {
    retval.subject.absolutePath = arr[0];
    retval.aspect.name = arr[1];
    return retval;
  }

  const err = new dbErrors.ResourceNotFoundError();
  err.resourceType = 'Sample';
  err.resourceKey = name;
  throw err;
} // parseName

/**
 * Looks up the subject and aspect by name.
 *
 * @param {Sequelize} seq - A reference to Sequelize so we have access to the
 *  associated Subject and Aspect models as well as the Promise class
 * @param {String} sampleName - The sample name, which is a concatenation of
 *  the subject absolute path, constants.sampleNameSeparator and the aspect
 *  name
 * @param {Boolean} idsOnly - indicate whether to return the default scoped
 *  attributes for subject and aspect or just the id
 * @returns {Promise} which resolves to an object containing the sample and
 *  aspect, or rejects if either sample or aspect is not found
 * @throws {ResourceNotFoundError} if the sampleName cannot be split into its
 *  subject/aspect parts or if either the subject absolute path or aspect name
 *  cannot be found
 */
function getSubjectAndAspectBySampleName(seq, sampleName, idsOnly) {
  try {
    const parsedName = parseName(sampleName);
    const subjectFinder = {
      where: {
        absolutePath: {
          $iLike: parsedName.subject.absolutePath,
        },
      },
    };
    const aspectFinder = {
      where: {
        name: {
          $iLike: parsedName.aspect.name,
        },
      },
    };

    if (idsOnly) {
      subjectFinder.attributes = ['id'];
      aspectFinder.attributes = ['id'];
    }

    const retval = {};
    return new seq.Promise((resolve, reject) =>
      seq.models.Subject.findOne(subjectFinder)
      .then((s) => {
        if (s) {
          retval.subject = s;
        } else {
          const err = new dbErrors.ResourceNotFoundError();
          err.resourceType = 'Subject';
          err.resourceKey = parsedName.subject.absolutePath;
          throw err;
        }
      })
      .then(() => seq.models.Aspect.findOne(aspectFinder))
      .then((a) => {
        if (a) {
          retval.aspect = a;
        } else {
          const err = new dbErrors.ResourceNotFoundError();
          err.resourceType = 'Aspect';
          err.resourceKey = parsedName.aspect.name;
          throw err;
        }
      })
      .then(() => resolve(retval))
      .catch((err) => reject(err))
    );
  } catch (unparseable) {
    return new seq.Promise((resolve, reject) => reject(unparseable));
  }
} // getSubjectAndAspectBySampleName

/**
 * @param {String} now ISO formatted date.
 * @return {Boolean} whether the sample timed out
 */
function isTimedOut(timeout, now, updatedAt) {
  const dateNow = new Date(now);
  const unit = timeout.slice(-1)  // eslint-disable-line no-magic-numbers
               .toLowerCase();
  const num = timeout.substring(0, timeout.length - 1);
  let secs = 0;
  switch (unit) {
    case 's':
      secs = num;
      break;
    case 'm':
      secs = SECS_PER_MIN * num;
      break;
    case 'h':
      secs = MINS_PER_HOUR * SECS_PER_MIN * num;
      break;
    case 'd':
      secs = HOURS_PER_DAY * MINS_PER_HOUR * SECS_PER_MIN * num;
      break;
    default:
      secs = num;
  }
  const nowSecs = Math.round(dateNow.getTime() / MILLISECS_PER_SEC);
  const updatedAtSecs = Math.round(new Date(updatedAt).getTime() / MILLISECS_PER_SEC);
  if (secs < (nowSecs - updatedAtSecs)) {
    return true;
  }

  return false;
} // isTimedOut

module.exports = {
  computeStatus,
  getSubjectAndAspectBySampleName,
  isTimedOut,
}; // exports
