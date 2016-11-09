/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/admin/utils/getFormData.js
 * Returns JSON representation of a given form and form metaData
 */

/**
 * Return JSON from inputs with boolean radio buttons
 * @param {Array} inputs The input DOM elements
 * @param {Object} jsonData Contains input names and values
 * @returns {Object} jsonData The updated input values
 */
const ONE = 1;
const ZERO = 0;

/**
 * Adds boolean data to array input
 * @param {Array} inputs Extract data from this array
 * @param {Array} jsonData Push results to this array
 * @returns {Array} Array with data from boolean UI
 */
function fromBooleanInput(inputs, jsonData) {
  for (let i = inputs.length - ONE; i >= ZERO; i--) {
    if (inputs[i].getAttribute('type') === 'radio') {
      if (inputs[i].checked) {
        const arr = inputs[i].value.split(',');
        let intArr = [];
        for (let j = ZERO; j < arr.length; j++) {
          intArr.push(parseInt(arr[j], 10));
        }
        jsonData[inputs[i].name] = intArr;
      }
    }
  }
  return jsonData;
}

/**
 * Return JSON from text inputs with _ in them
 * @param {Array} inputs The input DOM elements
 * @param {Object} jsonData Contains input names and values
 * @param  {Func} alterDataFunc Optional function to
 * alter input value.
 * @returns {Object} jsonData The updated input values
 */
function fromTextInput(inputs, jsonData, alterDataFunc) {
  // edit input text values, depending on name
  for (let i = ZERO; i < inputs.length; i++) {
    const name = inputs[i].name;
    const lastIndex = name.lastIndexOf('_');
    const key = name.substring(ZERO, lastIndex);
    // get the number after _
    const index = parseInt(name.substring(lastIndex+ONE, name.length), 10);

    if (inputs[i].getAttribute('type') === 'text' && key) {
      delete jsonData[name]; // ie. okRange_1
      const intVal = alterDataFunc ?
        alterDataFunc(inputs[i].value) : inputs[i].value;
      if (intVal) { // add to array only if value is truthy
        if (!jsonData[key]) {
          jsonData[key] = [];
        }
        jsonData[key][index] = intVal; // ie. 1, 2, 12.45
      }
    }
  }
  return jsonData;
}

/**
 *
 * @param {DOMElement} form The form to get inputs from
 * @param {String} aspectRangeFormat The format to get inputs by
 * @param {Object} propertyMetaData The metaData to group inputs by
 * @returns {Object} jsonData The JSON representation of form data
 */
function getFormData(form, aspectRangeFormat, propertyMetaData) {
  const inputs = form.getElementsByTagName('input');
  const selects = form.getElementsByTagName('select');
  const inputsAndSelects = [...inputs, ...selects];
  const jsonData = {};

  // for tags, relatedLinks
  let tempObj = {};
  const fieldSets = form.getElementsByTagName('fieldset');
  for (let i = fieldSets.length - ONE; i >= ZERO; i--) {
    const objName = fieldSets[i].name;
    let dataObject = {};
    dataObject[objName] = [];
    const rows = fieldSets[i].getElementsByClassName('slds-form-element__row');
    // for each row, make new object
    for (let j = rows.length - ONE; j >= ZERO; j--) {
      const innerInputs = rows[j].getElementsByTagName('input');
      // if there's one field per row,
      // check whether input name === fieldset name,
      // if so add input value to dataObject
      if (innerInputs.length === ONE && objName === innerInputs[ZERO].name) {
        dataObject[objName].push(innerInputs[ZERO].value);
      } else { // multi field row
        // loop through all fields per row
        for (let k = innerInputs.length - ONE; k >= ZERO; k--) {
          tempObj[innerInputs[k].name] = innerInputs[k].value;
        }
        dataObject[objName].push(tempObj);
      }
      tempObj = {}; // reset
    }
    // add fieldSet data to JSON
    jsonData[objName] = dataObject[objName];
  }
  // check propertyMetaData for customOutput,
  // if so, get value by customValueQuery
  for (let i = propertyMetaData.length - ONE; i >= ZERO; i--) {
    if (propertyMetaData[i].hasOwnProperty('customValueQuery')) {
      jsonData[propertyMetaData[i].propertyName] =
        eval(propertyMetaData[i].customValueQuery);
    }
  }

  for (let i = inputsAndSelects.length - ONE; i >= ZERO; i--) {
    // add all values together, wkthout duplicates
    if (inputsAndSelects[i].name &&
      !jsonData.hasOwnProperty(inputsAndSelects[i].name)) {
      // do not include radio button values
      jsonData[inputsAndSelects[i].name] = inputsAndSelects[i].value;
    }
  }

  if (aspectRangeFormat === 'BOOLEAN') {
    fromBooleanInput(inputs, jsonData);
  } else if (aspectRangeFormat === 'NUMERIC') {
    fromTextInput(inputs, jsonData, function(value) {
      return parseFloat(value);
    });
  } else if (aspectRangeFormat === 'PERCENT') {
    fromTextInput(inputs, jsonData, function(value) {
      return value/100;
    });
  }
  return jsonData;
}

export default getFormData;
