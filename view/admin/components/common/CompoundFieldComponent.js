/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/admin/components/common/CompoundFieldComponent.js
 *
 * State manager for CompoundFields
 * Adds 'key' field for all fields, to ensure uniqueness
 *
 * Props:
 * name: the name of the fieldset ie. tags, relatedLinks
 * values: An array of values to show in inputs. Can be strings or objects.
 * type the type of values array. Can be string or object
 * String array means its one field per row.
 * Object array means multiple fields can be rendered per row.
 * fields: the fields to render. If empty array and type is object,
 * renders no fields.
 */

import React, { PropTypes, Component } from 'react';
import CompoundFields from './CompoundFields';

class CompoundFieldComponent extends Component {

  constructor(props) {
    super(props);
    // update state as input values change
    this.onChange = this.onChange.bind(this);
    this.onAddRow = this.onAddRow.bind(this);
    this.onRemove = this.onRemove.bind(this);
    this.processValues = this.processValues.bind(this);
    this.state = {
      linkObjects: this.processValues(props.values),
    };
  }

  /**
   * Updates state with new input values
   *
   * @param {String} key  The unique identifier in linkObjects.
   * @param {Object} inputObject The Includes the input's name
   * with the current value:
   * ie. { name: 'field_name', value: 'Salesforce' }
   */
  onChange(key, inputObject) {
    // find object by key, update value from changed input
    const newLinkObjects = this.state.linkObjects;
    // if fields parameter, update field in linkObjects
    newLinkObjects.map((object) => {
      if (object.key === key) {
        const { name, value } = inputObject;
        if (object.hasOwnProperty(name)) {
          object[name] = value;
        } else {
          object.value = value;
        }
      }
    });
    this.setState({ linkObjects: newLinkObjects });
  }

  /**
   * Returns an arary of objects to pass onto renderer.
   * Each object has 'key' and 'value' properties.
   *
   * @param {Array} values An array of either strings or objects.
   * @returns {Array} An array of fields to render, with
   * key and value properties.
   */
  processValues(values) {
    let newValues = [];
    if (!values || !values.length) {
      return newValues;
    }

    if (this.props.type === 'string') {
      values.map((string) => {
        newValues.push({
          value: string,
          key: String(Math.random()),
        });
      });
    } else {
      // input array contains objects,
      // each field is a separate object
      const { fields } = this.props;
      if (fields.length) {
        values.map((obj) => {
          fields.map((field) => {
            newValues.push({
              value: obj[field],
              key: obj.id || String(Math.random()),
            });
          });
        });
      }
    }
    return newValues;
  }

  componentWillReceiveProps(nextProps) {
    // check the type of array to process accordingly
    this.setState({
      linkObjects: this.processValues(nextProps.values),
    });
  }

  onAddRow() { // set up a new row with the proper data
    const { fields, values, type } = this.props;
    const newLinkObjects= this.state.linkObjects;

    /**
     * Adds row of empty values, updates state
     */
    function addObject() {
      let rowObject = {
        value: '',
        key: String(Math.random()), // add unique key
      };
      newLinkObjects.push(rowObject);
    }
    // add an empty field
    if (type === 'string') {
      addObject();
    } else {
      // add an empty field for each field in a row
      for (let j = fields.length - 1; j >= 0; j--) {
        addObject();
      }
    }

    this.setState({
      linkObjects: newLinkObjects
    });
  }

  /**
   * Updates state, on row removal
   * @param {String, or an array of strings}
   */
  onRemove(rowKey) {
    let { linkObjects } = this.state;
    let newLinkObjects = linkObjects;
    if (Array.isArray(rowKey)) {
      // remove objects whose key is in the passed in array
      newLinkObjects = linkObjects.filter((obj) => {
        return rowKey.indexOf(obj.key) === -1;
      });
    } else {
      newLinkObjects = linkObjects.filter((obj) => {
        return rowKey !== obj.key;
      });
    }

    this.setState({
      linkObjects: newLinkObjects,
    });
  }

  render() {
    const { name, disabled, fields, values, type } = this.props;
    const { linkObjects } = this.state;
    return (
      <fieldset
        name={ name }
        className='slds-form--compound'>
        <CompoundFields
          linkObjects={ linkObjects || [] }
          disabled={ disabled }
          name={ name }
          fields={ fields }
          arrayType={ type }
          onRemove={ this.onRemove }
          onAddRow={ this.onAddRow }
          onChange={ this.onChange }
        />
      </fieldset>
    );
  }
}

CompoundFieldComponent.PropTypes = {
  name: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  values: PropTypes.oneOfType([
    React.PropTypes.string,
    React.PropTypes.object,
  ]),
  fields: PropTypes.array,
  disabled: PropTypes.bool,
};

export default CompoundFieldComponent;
