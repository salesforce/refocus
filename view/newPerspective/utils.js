/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */
/**
 * view/perspective/utils.js
 *
 * JSON config for CreatePerspective.js
 * Includes all config for resources that need special treatment
 */

/**
 * Generate the filter string for the hierarchy API GET.
 *
 * @param {Object} p - The perspective object
 * @returns {String} - The query string created generated based on the
 *  perspective filters
 */
function getFilterQuery(p) {
  let q = '';

  if (p.aspectFilter && p.aspectFilter.length) {
    const sign = p.aspectFilterType === 'INCLUDE' ? '' : '-';
    q += 'aspect' + '=' + sign +
        p.aspectFilter.join().replace(/,/g, ',' + sign);
  }

  if (p.aspectTagFilter && p.aspectTagFilter.length) {
    if (q) {
      q += '&';
    }

    const sign = p.aspectTagFilterType === 'INCLUDE' ? '' : '-';
    q += 'aspectTags' + '=' + sign +
        p.aspectTagFilter.join().replace(/,/g, ',' + sign);
  }

  if (p.subjectTagFilter && p.subjectTagFilter.length) {
    if (q) {
      q += '&';
    }

    const sign = p.subjectTagFilterType === 'INCLUDE' ? '' : '-';
    q += 'subjectTags' + '=' + sign +
        p.subjectTagFilter.join().replace(/,/g, ',' + sign);
  }

  if (p.statusFilter.length) {
    if (q) {
      q += '&';
    }

    const sign = p.statusFilterType === 'INCLUDE' ? '' : '-';
    q += 'status' + '=' + sign +
        p.statusFilter.join().replace(/,/g, ',' + sign);
  }

  return q.length ? ('?' + q) : q;
} // getFilterQuery

/**
 * Given array of objects, returns array of strings or primitives
 * of arrayOfObjects[i][field].
 *
 * @param {String} field The field of each value to return
 * @param {array} arrayOfObjects The array of objects to
 * get new array from
 * @returns {Array} The array of strings or primitives
 */
function getArray(field, arrayOfObjects) {
  let arr = [];
  if (!arrayOfObjects) {
    return arr;
  }

  for (let i = 0; i < arrayOfObjects.length; i++) {
    arr.push(arrayOfObjects[i][field]);
  }
  return arr;
}

/**
 *  Ie. 'thisStringIsGood' --> This String Is Good
 * @param {String} string The string to split
 * @returns {String} The converted string, includes spaces.
 */
function convertCamelCase(string) {

  // insert a space before all caps
  // then uppercase the first character
  return string
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => {
      return str.toUpperCase();
    });
}

/**
 * Given array of objects, returns array without
 * the input elements
 *
 * @param {Array} arr The array to filter from
 * @param {String} removeThis The elem to remove from array.
 * Multiple elements may be removed
 * get new array from
 * @returns {Array} The array of strings or primitives
 */
function filteredArray(arr, removeThis) {
  return arr.filter((elem) => elem && elem !== removeThis);
}

/**
 * Returns array of objects with tags
 * @param {Array} array The array of reosurces to get tags from.
 * @returns {Object} array of tags
 */
function getTagsFromResources(array) {
  // get all tags
  let cumulativeArr = [];
  for (let i = array.length - 1; i >= 0; i--) {
    if (array[i].tags && array[i].tags.length) {
      cumulativeArr.push(...array[i].tags);
    }
  }

  return cumulativeArr.filter((item, pos) => {
    return cumulativeArr.indexOf(item) !== pos;
  });
}

/**
 * Return array of items that are from one array and
 * not in another
 *
 * @param {Array} options Return a subset of this
 * @param {Array} value Array of data to exclude
 * @returns {Array} Contains items from options
 */
function getOptions(options, value) {
  let leftovers = []; // populate from options
  if (Array.isArray(value)) {
    for (let i = options.length - 1; i >= 0; i--) {
      if (value.indexOf(options[i]) < 0) {
        leftovers.push(options[i]);
      }
    }
  }

  return leftovers;
}

/**
 * Returns config object for the key in values array.
 *
 * @param {Array} values Data to get resource config.
 * From props
 * @param {String} key The key of the resource, in values array
 * @param {Array} value Update state to this value
 * @returns {Object} The resource configuration object
 */
function getConfig(values, key, value) {
  const ZERO = 0;
  const options = getOptions(values[key] || [], value);
  const convertedText = convertCamelCase(key);
  let config = {
    title: key,
    options,
  };

  if (key === 'subjects') {
    config.placeholderText = 'Select a Subject...';
    let options = getArray('absolutePath', values[key]);
    config.options = filteredArray(options, value);
    config.isArray = false;
  } else if (key === 'lenses') {
    config.placeholderText = 'Select a Lens...';
    let options = getArray('name', values[key]);
    config.options = filteredArray(options, value);
    config.isArray = false;
  } else if (key.slice(-6) === 'Filter') {
    // if key ends with Filter
    config.defaultValue = ''; // should be pills, not text
    config.allOptionsLabel = 'All ' +
      convertedText.replace(' Filter', '') + 's';
    config.isArray = true;
    if (key === 'statusFilter') {
      config.allOptionsLabel = 'All ' +
        convertedText.replace(' Filter', '') + 'es';
    } else if (key === 'aspectFilter') {
      config.allOptionsLabel = 'All ' +
        convertedText.replace(' Filter', '') + 's';
      let options = getArray('name', values[key]);
      config.options = filteredArray(values[key], value);
    }

    delete config.placeholderText;
  }

  return config;
}

/**
 * Return array of unique tags
 * @param {Array} Objects with tags: [tag1, tag2, ...]
 * @returns {Array} contains unique tags
 */
function getTagsFromArrays(arr) {
  let tags = new Set();
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] && arr[i].tags && arr[i].tags.length) {
      tags = new Set([...tags, ...new Set(arr[i].tags)]);
    }
  }

  return [...tags].sort();
}

/**
 * Return only the published objects.
 * @param {Array} the array to filter from.
 * Contains objects with key isPublished
 * @returns {Array} with only objects containing isPublished: true
*/
function getPublishedFromArr(arr) {
  return arr.filter((elem) => elem.isPublished);
}

/**
 * Accumulates information to load the perspective dropdown,
 * and the edit/create perspective modal
 *
 * @param {Object} request Use supertest or superagent
 * @returns {Object} The accumulated values
 */
function getValuesObject(request, getPerspectiveName) {
  const statuses = require('../../api/v1/constants').statuses;
  const valuesObj = {
    subjects: [], // { name: absolutePath, id }
    aspectTagFilter: [], // { name, id }
    aspectFilter: [], // strings
    subjectTagFilter: [], // strings
    lenses: [], // { name, id }
    statusFilter: Object.keys(statuses).sort(),
    persNames: [], //strings
    rootSubject: {},
    lens: {}, // includes library
  };

  return request('/v1/perspectives')
  .then((res) => {
    valuesObj.persNames = res.body.map((perspective) => perspective.name).sort();
    valuesObj.name = getPerspectiveName(valuesObj.persNames);
    valuesObj.perspective = res.body.filter((perspective) => perspective.name === valuesObj.name)[0];

    // need to get the lens, as GET /lenses does not return the library
    return request('/v1/lenses/' + valuesObj.perspective.lensId);
  })
  .then((res) => {
    valuesObj.lens = res.body;
    return request('/v1/subjects');
  })
  .then((res) => {

    // set the published subjects
    valuesObj.subjects = getPublishedFromArr(res.body);
    valuesObj.subjectTagFilter = getTagsFromArrays(valuesObj.subjects);
    const filterString  = getFilterQuery(valuesObj.perspective);
    return request('/v1/subjects/' + valuesObj.perspective.rootSubject + '/hierarchy' + filterString);
  })
  .then((res) => {
    valuesObj.rootSubject = res.body;
    return request('/v1/lenses');
  })
  .then((res) => {
    valuesObj.lenses = getPublishedFromArr(res.body);
    return request('/v1/aspects')
  })
  .then((res) => {
    valuesObj.aspectFilter = getPublishedFromArr(res.body);
    valuesObj.aspectTagFilter = getTagsFromArrays(valuesObj.aspectFilter);
    return valuesObj;
  });
} // getValuesObject

module.exports =  {
  getValuesObject,
  getTagsFromArrays,
  getFilterQuery,
  getOptions, // for testing
  filteredArray,
  getConfig,
  getArray,
  getTagsFromResources,
  getPublishedFromArr,
};
