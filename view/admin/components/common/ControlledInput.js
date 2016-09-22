/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/admin/components/common/ControlledInput.js
 *
 * Controlled input, for use by forms
 * Usage:
 * <ControlledInput name={variable_name} value={variable_name} />
 */

import React from 'react';

class ControlledInput extends React.Component {
  constructor(props) {
    super(props);
    this.onChange = this.onChange.bind(this);
    this.state = {
      name: props.name,
      value: props.value,
    };
  }

  componentWillReceiveProps(nextProps) {
    if (this.state.name !== nextProps.name) {
      this.setState({ name: nextProps.name });
    } else if (this.state.value !== nextProps.value) {
      this.setState({ value: nextProps.value });
    }
  }

  onChange(event) {
    this.setState({ value: event.target.value });
  }

  render() {
    return (
      <div className='slds-form-element__control'>
        <input
        type='text'
        className='slds-input'
        name={this.state.name}
        value={this.state.value}
        onChange={this.onChange}
        />
      </div>
    );
  }
}

ControlledInput.propTypes = {
  name: React.PropTypes.string.isRequired,
  value: React.PropTypes.string,
};

export default ControlledInput;
