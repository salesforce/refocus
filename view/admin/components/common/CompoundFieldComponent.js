/**
 * view/admin/components/common/CompoundFieldComponent.js
 *
 * State manager for CompoundFields
 */

import React, { PropTypes, Component } from 'react';
import CompoundFields from './CompoundFields';
import ReactDOM from 'react-dom';

class CompoundFieldComponent extends Component {

  constructor(props) {
    super(props);
    this.addRowKey = this.addRowKey.bind(this);
    this.addRow = this.addRow.bind(this);
    this.remove = this.remove.bind(this);
    this.getJSON = this.getJSON.bind(this);
    this.state = {
      linkObjects: this.addRowKey(props.value),
    };
  }

  addRowKey(originalArr) {
    let withRowKeyArr = originalArr || [];
    for (let i = withRowKeyArr.length - 1; i >= 0; i--) {
      withRowKeyArr[i].rowKey = withRowKeyArr[i].id || Math.random();
    }
    return withRowKeyArr;
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      linkObjects: this.addRowKey(nextProps.value)
    });
  }

  getJSON() { // returns array representation of fieldSet data
    // ie. [ {name: NAME_HERE, value: VALUE_HERE},
    // {name: COOL_NAME, value: COOL_VALUE}, ...]
    const fieldSet = ReactDOM.findDOMNode(this.refs.fieldSet);
    let dataArr = [];
    let tempObj = {};
    const rows = fieldSet.getElementsByClassName('slds-form-element__row');
    // for each row, make new object
    for (let j = rows.length - 1; j >= 0; j--) {
      const innerInputs = rows[j].getElementsByTagName('input');
      // loop through all fields per row
      for (let k = innerInputs.length - 1; k >= 0; k--) {
        tempObj[innerInputs[k].name] = innerInputs[k].value;
      }
      dataArr.push(tempObj);
      tempObj = {}; // reset
    }
    return dataArr;
  }

  addRow() { // set up a new row with the proper data
    const { fields } = this.props;
    const rowOutput = {};

    for (let j = fields.length - 1; j >= 0; j--) {
      rowOutput[fields[j]] = '';
    }
    // tmeporarily save fieldSet
    const linkObjects = this.addRowKey(this.getJSON());
    linkObjects.push(rowOutput);

    this.setState({
      linkObjects: linkObjects
    });
  }

  remove(rowKey) {
    const linkObjects = this.state.linkObjects.filter((obj) => {
      return rowKey !== obj.rowKey;
    });

    this.setState({
      linkObjects: linkObjects
    });
  }

  render() {
    return (
      <fieldset name={ this.props.name } className='slds-form--compound'>
          <CompoundFields ref='fieldSet'
          linkObjects={this.state.linkObjects || []}
          {...this.props}
          onRemove={this.remove}
          onAddRow={this.addRow}
          />
      </fieldset>
    );
  }
}

CompoundFieldComponent.PropTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.array,
  fields: PropTypes.array,
  disabled: PropTypes.bool,
};

export default CompoundFieldComponent;
