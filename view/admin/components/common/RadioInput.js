/**
 * view/admin/components/common/RadioInput.js
 *
 * Renders radio group. Controlled React component.
 * Given default value, checks the appropriate radio button.
 */

import React, { PropTypes } from 'react';

const RadioInput = React.createClass({
  propTypes: {
    name: PropTypes.string,
    disabled: PropTypes.bool,
    radioButtonVals: PropTypes.object,
    value: PropTypes.array, // two numbers.
  },
  getDefaultProps: function() {
    return {
      radioButtonVals: { 'N/A': [2, 2], 'False': [0, 0], 'True': [1, 1] },
    };
  },
  getInitialState: function() {
    return {
      checkedValue: this.props.value.join(','),
    };
  },
  componentWillReceiveProps: function(nextProps) {
    this.setState({
      checkedValue: nextProps.value.join(','),
    });
  },
  handleOptionChange: function (changeEvent) {
    this.setState({
      checkedValue: changeEvent.target.value,
    });
  },
  render: function() {
    const { name, disabled, value, radioButtonVals } = this.props;
    if (typeof value[0] === 'string' && disabled) {
      return <p>Invalid</p>;
    } else {
      const radioButtons = [];
      const inputProps = {
        type: 'radio',
        name: name,
        disabled: disabled,
        onChange: this.handleOptionChange,
      };

      for (let key in radioButtonVals) {
        // need join array vals as radio button value has to be string
        inputProps.value = radioButtonVals[key],
        inputProps.checked = this.state.checkedValue === radioButtonVals[key].join(','),

        radioButtons.push(
          <label className='slds-radio' key={name + key}>
            <input {...inputProps}
            />
            <span className='slds-radio--faux'></span>
            <span className='slds-form-element__label'>{ key }</span>
          </label>
          );
      }
      return <div className='slds-form-element__control'>
        { radioButtons }
      </div>;
    }
  }
});

export default RadioInput;
