/**
 * view/admin/components/common/ExternalLinkComponent.js
 *
 * Renders external url in anchor tags on read-only, input on edit.
 */

import React, { Component, PropTypes } from 'react';
import ControlledInput from './ControlledInput';

class ExternalLinkComponent extends Component {
  render(){
    const { name, disabled, url } = this.props;
    const link = url ? <a href={url}>{url}</a> : <p>None</p>;
    const result = disabled ? link :
    <ControlledInput
      className='slds-input'
      type='text'
      name={ name }
      value={ url }
    />;

    return result;
  }
}

ExternalLinkComponent.PropTypes = {
  name: PropTypes.string,
  disabled: PropTypes.bool,
  url: PropTypes.string,
};

export default ExternalLinkComponent;
