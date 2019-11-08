/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * cache/statusCalculation.js
 */
'use strict'; // eslint-disable-line strict
const redisStore = require('./sampleStore');
const Status = require('../db/constants').statuses;
const keyType = redisStore.constants.objectType;
const statusPrecedence = {
  OK: 1,
  Info: 2,
  Warning: 3,
  Critical: 4,
};

module.exports = {
  getAspectRanges,
  preprocessOverlaps,
  setRanges,
  prepareValue,
  calculateStatus,
};

/**
 * Convert aspect object to array of ranges
 *
 * @param  {Object} aspect - aspect object, with range fields
 * @returns {Array<Object>} - array of ranges, in ascending order
 */
function getAspectRanges(aspect) {
  const ranges = {
    Critical: aspect.criticalRange,
    Warning: aspect.warningRange,
    Info: aspect.infoRange,
    OK: aspect.okRange,
  };

  return Object.entries(ranges)
  .filter(([status, range]) => range)
  .map(([status, range]) => Range(status, range))
  .sort((r1, r2) =>
    r1.min === r2.min ? r1.max > r2.max : r1.min > r2.min
  );
}

/**
 * Send redis commands to set keys for the given ranges
 *
 * @param  {Object} redisOps - batched or unbatched redisOps object
 * @param  {Array<Object>} ranges - sorted, non-overlapping list of aspect ranges
 * @param  {String} aspName - aspect name
 * @returns {Promise}
 */
function setRanges(redisOps, ranges, aspName) {
  const setKey = redisStore.toKey(keyType.aspRanges, aspName);

  return redisOps.batchCmds()
  .map(ranges, (batch, range) =>
    batch
    .zadd(setKey, range.min, getRangeKey('min', range.status, range.min))
    .zadd(setKey, range.max, getRangeKey('max', range.status, range.max))
  )
  .exec();
}

/**
 * Get set members for a given range
 *
 * @param  {String} type - "min" or "max"
 * @param  {String} status - "Critical"/"Warning"/"Info"/"OK"
 * @param  {String} score - range score
 * @returns {Object} - { minKey, maxKey }
 */
function getRangeKey(type, status, score) {
  const order = (type === 'min') ? 0 : 1; // min comes before max
  return `${order}:${type}:${status}:${score}`;
}

/**
 * Convert a sample value to a number or a non-ranged status.
 *
 * @param  {String} value - sample value
 * @returns {Number} - value
 * @throws {Error} - if value cannot be converted to a number
 */
function prepareValue(value) {
  // Invalid if value is not a non-empty string!
  if (typeof value !== 'string' || value.length === 0) {
    throw Error(Status.Invalid);
  }

  // "Timeout" special case
  if (value === Status.Timeout) {
    throw Error(Status.Timeout);
  }

  // Boolean value type: Case-insensitive 'true'
  if (value.toLowerCase() === 'true') {
    value = 1;
  } else if (value.toLowerCase() === 'false') {
    // Boolean value type: Case-insensitive 'false'
    value = 0;
  } else {
    value = Number(value);
  }

  // If not true|false|Timeout, then value must be convertible to number!
  if (isNaN(value)) {
    throw Error(Status.Invalid);
  }

  return value;
}

/**
 * Calculate the sample status based on this value and the existing ranges sorted set.
 *
 * @param  {Object} redisOps - batched or unbatched redisOps object
 * @param  {String} sampleName - sample name
 * @param  {Number} value - sample value
 * @returns {String} - resulting status
 */
function calculateStatus(redisOps, sampleName, value) {
  const aspName = sampleName.split('|')[1];
  const key = redisStore.toKey(keyType.aspRanges, aspName);

  try {
    value = prepareValue(value);
  } catch (err) {
    return redisOps.returnValue(err.message);
  }

  return redisOps.transform((batch) => (
      batch.zrangebyscore(key, value, '+inf', 'WITHSCORES', 'LIMIT', 0, 1)
    ), ([member, score]) => {
      if (member) {
        score = Number(score);
        const [precedence, rangeType, status] = member.split(':'); // jscs:ignore
        if (rangeType === 'max') {
          return status;
        } else if (rangeType === 'min' && value === score) {
          return status;
        }
      }

      return Status.Invalid;
    });
}

/**
 * Find all overlapping ranges, merging them together in-place to form new
 * non-overlapping ranges based on the status precedence
 *
 * @param  {Array<Object>} rangesToMerge - list of ranges, in ascending order.
 * @returns {Array<Object>} - list of ranges with no overlaps, in ascending order
 */
function preprocessOverlaps(rangesToMerge) {
  const mergedRanges = [];
  while (rangesToMerge.length) {
    const ranges = [rangesToMerge.shift(), rangesToMerge.shift()];
    const mergeResult = mergeOverlappingRanges(...ranges);

    let done;
    let next;
    if (mergeResult.length > 1) {
      [done, ...next] = mergeResult;
    } else if (mergeResult.length === 1) {
      [...next] = mergeResult;
    } else {
      [done] = ranges;
    }

    done && mergedRanges.push(done);
    next && rangesToMerge.unshift(...next);
  }

  return mergedRanges;
}

/**
 * Given two overlapping ranges, returns 1-3 non-overlapping ranges to
 * replace them, prioritized by status.
 *
 * @param  {Object} range1 - the range with the lower min value
 * @param  {Object} range2 - the range with the higher min value
 * @returns Array<Object>
 */
function mergeOverlappingRanges(range1, range2) {
  if (!range1 || !range2) return [];

  const range1Priority = statusPrecedence[range1.status];
  const range2Priority = statusPrecedence[range2.status];

  const encompassing = (range1.min <= range2.min)
                       && (range2.max <= range1.max);
  const overlapping = (range1.min < range2.min)
                      && (range1.max > range2.min)
                      && (range1.max < range2.max);
  const touching = !encompassing && (range1.max === range2.min);

  if (touching) {
    // for touching flat ranges, remove the range completely if it's lower priority
    if (range1.min === range1.max && range1Priority < range2Priority) {
      return [range2];
    } else if (range2.min === range2.max && range2Priority < range1Priority) {
      return [range1];
    }

    // remove the edge from the lower-priority range
    if (range1Priority < range2Priority) {
      range1.max = adjustDown(range1.max);
    } else {
      range2.min = adjustUp(range2.min);
    }

    return [range1, range2];
  } else if (overlapping) {
    // truncate lower-priority range
    if (range1Priority < range2Priority) {
      range1.max = adjustDown(range2.min);
    } else {
      range2.min = adjustUp(range1.max);
    }

    return [range1, range2];
  } else if (encompassing) {
    if (range1Priority < range2Priority) {
      // break up into three ranges
      const low = Range(range1.status, [range1.min, adjustDown(range2.min)]);
      const middle = Range(range2.status, [range2.min, range2.max]);
      const high = Range(range1.status, [adjustUp(range2.max), range1.max]);
      return [low, middle, high].filter(r => r.min <= r.max);
    } else {
      // remove range 2
      return [range1];
    }
  } else {
    // if not touching, overlapping, or encompassing, return ranges as-is.
    return [range1, range2];
  }
}

/**
 * Adjust the given value down by the smallest possible amount that is
 * representable in floating point
 *
 * @param  {Number} n
 * @returns {Number}
 */
function adjustDown(n) {
  let best = n;
  let adjustment = .1;
  let nextTry = n - adjustment;

  while (nextTry !== n) {
    best = nextTry;
    adjustment /= 10;
    nextTry = n - adjustment;
  }

  return best;
}

/**
 * Adjust the given value up by the smallest possible amount that is
 * representable in floating point
 *
 * @param  {Number} n
 * @returns {Number}
 */
function adjustUp(n) {
  let best = n;
  let adjustment = .1;
  let nextTry = n + adjustment;

  while (nextTry !== n) {
    best = nextTry;
    adjustment /= 10;
    nextTry = n + adjustment;
  }

  return best;
}

function Range(status, range) {
  return {
    status,
    min: range[0],
    max: range[1],
  };
}
