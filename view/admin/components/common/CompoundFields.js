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

class CompoundFields extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    const { name, disabled, fields, linkObjects } = this.props;
    let formFields = [];
    let rowOutput = [];
    // each linkObject is one row
    for (let i = linkObjects.length - 1; i >= 0; i--) {
      // loop through all fields per row
      for (let j = fields.length - 1; j >= 0; j--) {
        rowOutput.push(
          <div className='slds-form-element slds-size--1-of-2'>
            <label className='slds-form-element__label'>{ fields[j] }</label>
            { disabled ?
              <span>{ linkObjects[i][fields[j]] }</span> :
              <ControlledInput className='slds-input'
                type='text'
                name={ fields[j] }
                value={ linkObjects[i][fields[j]] }
              />
            }
          </div>
        )
      }
      // onClick trashCan button, remove the row from the state to re-render
      formFields.push(
        <div key={ linkObjects[i].rowKey } className='slds-form-element__row'>
          {rowOutput}
          { !disabled &&
            <div
            className='slds-grid slds-grid--vertical-align-end slds-m-left--x-small'>
            <button
              className='slds-button slds-button--destructive'
              onClick={ this.props.onRemove.bind(null, linkObjects[i].rowKey) }>
              <svg aria-hidden='true' className='slds-icon slds-icon--x-small'>
                <use xlinkHref='../static/icons/utility-sprite/svg/symbols.svg#delete'></use>
              </svg>
              </button>
            </div>
          }
        </div>
      );
      rowOutput = []; // reset
    }
    return (
      <div className='form-element__group'>
        { formFields.length ? formFields : <p>None</p> }
        { !disabled && <button type='button'
          className='slds-button slds-button--neutral slds-not-selected'
          onClick={ this.props.onAddRow }>
            <span>Add New</span>
          </button>
        }
      </div>
    );
  }
}

CompoundFields.PropTypes = {
  onRemove: PropTypes.func,
  onAddRow: PropTypes.func,
  name: PropTypes.string.isRequired,
};

export default CompoundFields;
