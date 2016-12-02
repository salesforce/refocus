/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/admin/components/common/Forms.js
 *
 * Returns form component, given field labels, names, and values.
 */

import React from 'react';
import ControlledInput from './ControlledInput';

const ONE = 1;
const ZERO = 0;

/**
 * Given string, creates a label with content of that string
 * @param {string} displayName The label's content
 * @returns {label} the label DOM element, with the displayName param
 */
function createFormLabel(displayName) {
  return <label className='slds-form-element__label'>{displayName}</label>;
}

const Form = React.createClass({

  propTypes: {
    edit: React.PropTypes.bool,
    data: React.PropTypes.object,
    propertyMetaData: React.PropTypes.array,
    valueIfReadOnly: React.PropTypes.string,
    defaultAspectRange: React.PropTypes.array,
  },
  getDefaultProps() {
    return {
      data: {},
      defaultAspectRange: ['', ''],
      valueIfReadOnly: 'N/A',
      propertyMetaData: [],
      edit: false,
    };
  },
  getInitialState() {
    return { // default valueType
      aspectRangeFormat: this.props.data.valueType || 'BOOLEAN',
      useDefaultAspectRange: false,
    };
  },
  // @param { String } rangeFormat
  changeAspectRangeFormat(rangeFormat) {
    if (rangeFormat) {
      this.setState({
        aspectRangeFormat: rangeFormat
      });
    }
  },

  // if bool true, use default aspect range
  resetAspectRange() {
    if (!this.state.useDefaultAspectRange) {
      this.setState({
        useDefaultAspectRange: true
      });
    }
  },

  // reload the valueType dropdown with new props
  componentWillReceiveProps(nextProps){
    this.changeAspectRangeFormat(nextProps.data.valueType);
  },

  renderAsReadOnly(obj) {
    const value = (obj.value === null || obj.value === undefined) ?
      this.props.valueIfReadOnly :
      obj.value;
    return <p className='form-control-static'>{value}</p>;
  },

  renderAsInput(obj) {
    const val = obj.value;
    const value = (val && val !== this.props.valueIfReadOnly) ?
      val :
      '';
    return <ControlledInput name={obj.name} value={value}/>;
  },

  render() {
    const resource = this.props.data;
    if (!resource) {
      return <form></form>;
    }
    const { propertyMetaData, edit, defaultAspectRange } = this.props;
    const formFields = [];
    // changed to manual assignment, as Object.assign wasn't
    // working with functions
    const allFields = Object.assign({}, this.props);
    allFields.aspectRangeFormat = this.state.aspectRangeFormat;
    allFields.resetAspectRange = this.resetAspectRange;
    allFields.changeAspectRangeFormat = this.changeAspectRangeFormat;

    for (let i = ZERO; i < propertyMetaData.length; i++) {
      const defultValue = resource[propertyMetaData[i].propertyName];
      // if range field and useDefaultAspectRange, value is defaultAspectRange
      const value = (propertyMetaData[i].propertyName.indexOf('Range') > ZERO &&
        Array.isArray(defultValue) && this.state.useDefaultAspectRange) ?
        defaultAspectRange :
        defultValue;
      const obj = { name: propertyMetaData[i].propertyName, value };

      // what if needs more than name and value?
      // unit test this
      const propsFromForm = propertyMetaData[i].propsFromForm;
      if (propsFromForm && propsFromForm.length) {
        for (let j = propsFromForm.length - ONE; j >= ZERO; j--) {
          obj[propsFromForm[j]] = (
              propsFromForm.indexOf('Range') > ZERO &&
              this.state.useDefaultAspectRange
            ) ? defaultAspectRange : allFields[propsFromForm[j]];
        }
      }

      let fieldValue = '';
      // give value to custom renderer
      if (propertyMetaData[i].hasOwnProperty('customOutput')) {
        // does every field have a fieldvalue?
        fieldValue = propertyMetaData[i].customOutput(
          Object.assign({}, obj, { disabled: !edit })
        );
      } else {
        // if in edit mode, and field is readOnly, then render as readOnly
        const renderFieldFunc = (edit && !propertyMetaData[i].readOnly) ?
          this.renderAsInput :
          this.renderAsReadOnly;

        fieldValue = <div className='col-sm-10'>
          {renderFieldFunc(obj)}
        </div>;
      }

      const label = propertyMetaData[i].displayName;
      formFields.push(
        <div key={label} className='slds-form-element'>
          {createFormLabel(label)}
          {fieldValue}
        </div>
      );
    }

    return (
      <form className='form-horizontal'>
        {formFields}
      </form>
    );
  },
});

export default Form;
