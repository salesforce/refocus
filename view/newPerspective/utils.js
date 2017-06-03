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
function getValuesObject(request, getPerspectiveName, handleHierarchyEvent, handleLensDomEvent) {
  const statuses = require('../../api/v1/constants').statuses;
  const valuesObj = {
    name: '',
    perspective: {},
    persNames: [], //strings
    rootSubject: {},
    lens: {}, // includes library
    subjects: [], // { name: absolutePath, id }
    aspectTagFilter: [], // { name, id }
    aspectFilter: [], // strings
    subjectTagFilter: [], // strings
    lenses: [], // { name, id }
    statusFilter: Object.keys(statuses).sort(),
  };
  let hierarchyLoadEvent; // will be custom event
  let gotLens = false;

  // get the perspectives first,
  // in case url ends with /perspectives
  // and we need to get the first perspective by alphabetical order
  return request('/v1/perspectives')
  .then((response) => {

    // assign perspective-related values to the accumulator object
    valuesObj.persNames = response.body.map((perspective) => perspective.name).sort();

    // get the perspective name. If no perspective found, getPerspectiveName throws an error
    // and the rest won't be executed.
    valuesObj.name = getPerspectiveName(valuesObj.persNames);
    valuesObj.perspective = response.body.filter((perspective) => perspective.name === valuesObj.name)[0];

    // Whenever we get the response back with the hierarchy, we dispatch the
    // lens.hierarchyLoad event to the lens. (If we happen to get the hierarchy
    // back *before* the lens, hold onto it, wait for the lens, *then* dispatch the
    // lens.hierarchyLoad event *after* the lens.load event.)
    const getLens = request('/v1/lenses/' + valuesObj.perspective.lensId)
    .then((res) => {

      // hierarchyLoadEvent can be undefined or a custom event
      handleLensDomEvent(res, hierarchyLoadEvent);

      // if hierarchy is not loaded, set the lens received flag
      // to true, to dispatch lens load when hierarchy
      // is returned in getHierarchy
      gotLens = true;

      return res;
    });

    const filterString  = getFilterQuery(valuesObj.perspective);
    const getHierarchy = request('/v1/subjects/' +
      valuesObj.perspective.rootSubject + '/hierarchy' + filterString)
    .then((res) => {

      // if gotLens is false, hierarchyLoadEvent will be assigned.
      // otherwise dispatch the hierarchy event
      hierarchyLoadEvent = handleHierarchyEvent(res.body, gotLens);

      return res;
    });

    const promisesArr = [
      getLens,
      getHierarchy,
      request('/v1/lenses'),
      request('/v1/subjects?fields=isPublished,absolutePath,tags'),
      request('/v1/aspects?fields=isPublished,name,tags'),
    ];
    return Promise.all(promisesArr);
  })
  .then((responses) => {
    const lens = responses[0].body;
    const rootSubject = responses[1].body;
    const lenses = responses[2].body;
    const subjects = responses[3].body;
    const aspects = responses[4].body;

    // assign perspective-related values to the accumulator object
    valuesObj.lens = lens;
    valuesObj.rootSubject = rootSubject;

    // assign non-perspective values to the accumulator object
    valuesObj.subjects = getPublishedFromArr(subjects);
    valuesObj.subjectTagFilter = getTagsFromArrays(valuesObj.subjects);
    valuesObj.lenses = getPublishedFromArr(lenses);
    const publishedAspects = getPublishedFromArr(aspects);
    valuesObj.aspectFilter = publishedAspects.map((aspect) => aspect.name);
    valuesObj.aspectTagFilter = getTagsFromArrays(publishedAspects);

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
