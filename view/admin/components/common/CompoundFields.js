/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/admin/components/common/CompoundFields.js
 *
 * Returns fieldset in read-only format or with inputs on edit format,
 * Given onAdd and onRemove handlers,
 * fieldset name, and field names and values.
 */

import React, { Component, PropTypes } from 'react';
import ControlledInput from './ControlledInput';
const ONE = 1;
const ZERO = 0;

class CompoundFields extends Component {

  render() {
    const { name, disabled, fields, linkObjects, arrayType,
      onChange, onAddRow, onRemove } = this.props;

    /**
     * Returns a populated array of DOM elements
     * @param {Array} formFields
     * @param {Array} rowOutput
     * @param {String or Array} key Identifiers
     * associated with this row
     */
    function addRowToOutput(formFields, rowOutput, key) {
      const newFields = formFields || [];
      newFields.push(
        <div
          key={ Array.isArray(key) ? key.join('') : key }
          className='slds-form-element__row'>
          { rowOutput }
          { !disabled &&
            <div
            className={'slds-grid slds-grid--vertical-align-end' +
            ' slds-m-left--x-small'}>
            <button
              type='button'
              className='slds-button slds-button--destructive'
              onClick={ onRemove.bind(null, key) }>
              <svg aria-hidden='true' className='slds-icon slds-icon--x-small'>
                <use xlinkHref={'../static/icons/' +
                'utility-sprite/svg/symbols.svg#delete'}></use>
              </svg>
            </button>
          </div>
          }
        </div>
      );
      return newFields;
    }

    /**
     * Takes in params to make a field DOM element
     * @param {Object} obj Contains necessary values
     * @returns {DOMElement} Input representation
     */
    function getField(obj) {
      // all property values are string,
      // except for fieldNum (Integer)
      // The label string is optional. Default
      // is no label, will include label if provided.
      const { fieldName, value, key, fieldNum, label } = obj;
      return <div
        className={ 'slds-form-element slds-size--1-of-' + fieldNum }
        key={ key }>
        { label &&
          <label className='slds-form-element__label'>{ label }</label>
        }
        { disabled ?
          <span>{ value }</span> :
          <ControlledInput
            onChange={ onChange.bind(null, key) }
            name={ fieldName }
            value={ value }
          />
        }
      </div>;
    }

    let rowOutput = [];
    let formFields = [];
    const fieldNum = fields.length;
    if (arrayType === 'string') {
      // linkObjects is still an array of objects
      for (let i = linkObjects.length - ONE; i >= ZERO; i--) {
        const { value, key } = linkObjects[i];
        // one field per row
        rowOutput = getField({
          fieldName: name,
          value,
          key,
          fieldNum: ONE,
        });
        formFields = addRowToOutput(formFields, rowOutput, key);
      }
    } else if (fieldNum) { // if there are fields to show
      let counter = linkObjects.length-ONE;
      let keysPerRow = [];
      while (counter > -ONE) {
        // each row is made up of fieldNum many linkObjects
        // PER ROW: add all fields
        for (let j = fieldNum - ONE; j >= ZERO; j--) {
          const { value, key } = linkObjects[counter];
          keysPerRow.push(key);
          rowOutput.push(
            getField({
              fieldName: fields[j],
              value,
              key,
              fieldNum,
              label: fields[j],
            })
          );
          counter -= ONE;
        }
        formFields = addRowToOutput(formFields, rowOutput, keysPerRow);
        keysPerRow = []; // reset
        rowOutput = []; // reset
      }
    }
    return (
      <div className='form-element__group'>
        { formFields.length ? formFields : <p>None</p> }
        { !disabled &&
          <button
            type='button'
            className='slds-button slds-button--neutral slds-not-selected'
            onClick={ onAddRow }>
            <span>Add New</span>
          </button>
        }
      </div>
    );
  }
}

CompoundFields.PropTypes = {
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onAddRow: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  arrayType: PropTypes.string,
  fields: PropTypes.arrayOf(React.PropTypes.string).isRequired,
  linkObjects: PropTypes.arrayOf(React.PropTypes.object).isRequired,
};

export default CompoundFields;
