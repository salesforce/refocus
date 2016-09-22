/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/admin/components/common/MaxMinInputComponent.js
 *
 * Renders max and min range as two inputs.
 * Renders into spans, if form is not editable.
 */

import React, { PropTypes } from 'react';
import ControlledInput from './ControlledInput';

class MaxMinInputComponent extends React.Component {
  // TODO: refactor to take in array of name and values
  render() {
    const { name, value, disabled } = this.props;
    let output;
    if (typeof value[0] === 'string' && disabled) {
      output = <p>Invalid</p>;
    } else {
      output = <fieldset className='slds-form--compound'>
      <div className='slds-form-element__row'>
        <div className='slds-form-element slds-size--1-of-2'>
        <label className='slds-form-element__label'>Min</label>
        { disabled ?
          <span key={name + '_0'} >{ value[0] }</span> :
          <ControlledInput
          name={ name + '_0' }
          value={value[0].toString()}
          />
        }
      </div>

      <div className='slds-form-element slds-size--1-of-2'>
        <label className='slds-form-element__label'>Max</label>
        { disabled ?
          <span key={name + '_1'} >{ value[1] }</span> :
          <ControlledInput
          name={ name + '_1' }
          value={value[1].toString()}
          />
        }
      </div>
        </div>
    </fieldset>;
    }
    return output;
  }
}

MaxMinInputComponent.propTypes = {
  name: PropTypes.string,
  disabled: PropTypes.bool,
  value: PropTypes.array, // two numbers
};

export default MaxMinInputComponent;
