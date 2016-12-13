/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */
/**
 * view/perspective/configCreatePerspective.js
 *
 * JSON config for CreatePerspective.js
 * Includes all config for resources that need special treatment
 */
/**
 * Given array of objects, returns array of strings or primitives
 * of values of the field key
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
    if (arrayOfObjects[i].isPublished) {
      arr.push(arrayOfObjects[i][field]);
    }
  }

  return arr;
}
/**
 * Returns config object for the key in values array.
 *
 * @param {Array} values Data to get resource config.
 * From props
 * @param {String} key The key of the resource, in values array
 * @param {Array} value Current state's values
 * @param {String} convertedText For resource config
 * @returns {Object} The resource configuration object
 */
function getConfig(values, key, value, convertedText) {
  const config = {};
  const ZERO = 0;
  if (key === 'subjects') {
    config.options = getArray('absolutePath', values[key]);
    config.placeholderText = 'Select a Subject...';
    config.isArray = false;
  } else if (key === 'lenses') {
    config.placeholderText = 'Select a Lens...';
    config.options = getArray('name', values[key]);
    config.isArray = false;
  } else if (key.slice(-6) === 'Filter') {
    // if key ends with Filter
    config.defaultValue = ''; // should be pills, not text
    config.allOptionsLabel = 'All ' +
      convertedText.replace(' Filter', '') + 's';
    config.isArray = true;
    if (key === 'aspectFilter') {
      config.options = getArray('name', values[key]);
      config.allOptionsLabel = 'All ' +
        convertedText.replace(' Filter', '') + ' Tags';
    } else if (key === 'statusFilter') {
      config.allOptionsLabel = 'All ' +
        convertedText.replace(' Filter', '') + 'es';
    }
    delete config.placeholderText;
    // remove value[i] if not in all appropriate values
    let notAllowedTags = [];
    for (let i = ZERO; i < value.length; i++) {
      if (!values[key] || values[key].indexOf(value[i]) < ZERO) {
        notAllowedTags.push(value[i]);
      }
    }
    if (notAllowedTags.length) {
      // remove from state
      const newVals = value.filter((item) => {
        return notAllowedTags.indexOf(item) < ZERO;
      });
      const errorMessage = ' ' + convertedText + ' ' +
        notAllowedTags.join(', ') + ' does not exist.';
      const stateRule = {
        error: errorMessage
      };
      stateRule[key] = newVals;
      this.setState(stateRule);
    }
  }

  return config;
}

export {
  getConfig,
  getArray
};
