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
function fromBooleanInput(inputs, jsonData) {
  for (let i = inputs.length - 1; i >= 0; i--) {
    if (inputs[i].getAttribute('type') === 'radio') {
      if (inputs[i].checked) {
        const arr = inputs[i].value.split(',');
        let intArr = [];
        for (let j = 0; j < arr.length; j++) {
          intArr.push(parseInt(arr[j]));
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
  for (let i = 0; i < inputs.length; i++) {
    const name = inputs[i].name;
    const lastIndex = name.lastIndexOf('_');
    const key = name.substring(0, lastIndex);
    // get the number after _
    const index = parseInt(name.substring(lastIndex+1, name.length));

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
  for (let i = fieldSets.length - 1; i >= 0; i--) {
    const objName = fieldSets[i].name;
    let dataObject = {};
    dataObject[objName] = [];
    const rows = fieldSets[i].getElementsByClassName('slds-form-element__row');
    // for each row, make new object
    for (let j = rows.length - 1; j >= 0; j--) {
      const innerInputs = rows[j].getElementsByTagName('input');
      // loop through all fields per row
      for (let k = innerInputs.length - 1; k >= 0; k--) {
        tempObj[innerInputs[k].name] = innerInputs[k].value;
      }
      dataObject[objName].push(tempObj);
      tempObj = {}; // reset
    }
    // add fieldSet data to JSON
    jsonData[objName] = dataObject[objName];
  }
  // check propertyMetaData for customOutput,
  // if so, get value by customValueQuery
  for (let i = propertyMetaData.length - 1; i >= 0; i--) {
    if (propertyMetaData[i].hasOwnProperty('customValueQuery')) {
      jsonData[propertyMetaData[i].propertyName] =
        eval(propertyMetaData[i].customValueQuery);
    }
  }

  for (let i = inputsAndSelects.length - 1; i >= 0; i--) {
    if (inputsAndSelects[i].name) {
      // do not include radio button values
      if (inputsAndSelects[i].getAttribute('type') !== 'radio') {
        jsonData[inputsAndSelects[i].name] = inputsAndSelects[i].value;
      }
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
