/**
 * view/admin/components/common/CheckBoxComponent.js
 *
 * Toggle-able, disable-able checkbox.
 */

import React, { Component, PropTypes } from 'react';

class CheckBoxComponent extends Component {
  constructor(props) {
    super(props);
    this.onClick = this.onClick.bind(this);

    // by default, checkbox is un-checked
    // by default, checkbox is editable
    this.state = {
      checked: props.checked || false,
      disabled: props.disabled || false,
    };
  }

  componentWillReceiveProps(newProps) {
    if (newProps.hasOwnProperty(('checked'))) {
      this.state = {
        checked: newProps.checked || false,
      };
    }
  }

  onClick() {
    this.setState({ checked: !this.state.checked });
  }

  render() {
    const inputAttributes = {
      type: 'checkbox',
      name: this.props.name,
      onClick: this.onClick,
      value: this.state.checked,
    };

    if (this.state.checked) {
      inputAttributes.checked = 'checked';
    }

    if (this.props.disabled) {
      inputAttributes.disabled = true;
    }

    return <input
      {... inputAttributes}
    />;
  }
}

CheckBoxComponent.propTypes = {
  checked: PropTypes.bool,
  disabled: PropTypes.bool.isRequired,
  name: PropTypes.string.isRequired,
};

export default CheckBoxComponent;
