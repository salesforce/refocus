/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/admin/components/common/RangeSelector.js
 *
 * Dropdown with pre-populated values.
 * OnChange, changes application state.
*/

import React, { PropTypes } from 'react';

const RangeSelector = React.createClass({
  propTypes: {
    name: PropTypes.string,
    aspectRangeFormat: PropTypes.string,
    disabled: PropTypes.bool,
    changeAspectRangeFormat: PropTypes.func,
    resetAspectRange: PropTypes.func,
  },
  // consider moving options to props
  getInitialState: function () {
    return {
      options: [
        { value: 'NUMERIC', name: 'NUMERIC' },
        { value: 'BOOLEAN', name: 'BOOLEAN' },
        { value: 'PERCENT', name: 'PERCENT' }
      ]
    };
  },
  onChange: function (e) {
    e.preventDefault();
    const _value = e.target.value;
    const { changeAspectRangeFormat, resetAspectRange } = this.props;
    changeAspectRangeFormat(_value);
    // use default aspect ranges
    resetAspectRange();
  },
  render: function () {
    const { disabled,
      aspectRangeFormat } = this.props;
    const selectOptions = {
      onChange: this.onChange,
      value: aspectRangeFormat
    };
    if (disabled) {
      selectOptions.disabled = true;
    }
    const createItem = function(item, key) {
      return <option key={key} value={item.value}>{item.name}</option>;
    };
    return (
      <div>
        <select name='valueType' { ...selectOptions } >
          {this.state.options.map(createItem)}
        </select>
      </div>
    );
  }
});

export default RangeSelector;
