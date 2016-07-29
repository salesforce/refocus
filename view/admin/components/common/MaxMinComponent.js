/**
 * view/admin/components/common/MaxMinComponent.js
 *
 * Renders different range selectors, depending on aspectRnage.
 */

import React, { PropTypes } from 'react';
import MaxMinInputComponent from './MaxMinInputComponent';
import RadioInput from './RadioInput';

class MaxMinComponent extends React.Component {

  render(){
    const { name, value, disabled,
      aspectRangeFormat,
      defaultAspectRange } = this.props;
    let output = '';
    const defaultOutput = <p>None</p>;
    const _value = value || defaultAspectRange;
    if (aspectRangeFormat === 'BOOLEAN') {
      output = <RadioInput
        name={ name }
        value={ _value }
        disabled={ disabled }
      />;
    } else if (aspectRangeFormat === 'NUMERIC') {
      output = <MaxMinInputComponent
        name={ name }
        value={ _value }
        disabled={ disabled }
      />;
    } else if (aspectRangeFormat === 'PERCENT') {
      // if value is defined, check range of min, max
      // otherwise use defaultAspectRange
      const outputValPercent = (
        (value && typeof value[0] !== 'string') &&
        (_value[0] <= 1 && _value[0] >= 0) &&
        (_value[1] <= 1 && _value[1] >= 0)
        ) ?
        [_value[0] * 100,
          _value[1] * 100
        ] : defaultAspectRange;

      output = <MaxMinInputComponent
        name={ name }
        value={ outputValPercent }
        disabled={ disabled }
      />;
    }
    return output || defaultOutput;
  }
}

MaxMinComponent.propTypes = {
  name: PropTypes.string,
  value: PropTypes.array,
  disabled: PropTypes.bool,
  defaultAspectRange: PropTypes.array,
  aspectRangeFormat: PropTypes.string,
};

export default MaxMinComponent;
