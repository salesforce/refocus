/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/admin/components/common/RadioGroup.js
 *
 * Contains the page title, and any buttons
*/

import React, { PropTypes } from 'react';

class RadioGroup extends React.Component {
  render() {
    const { title, highlightFirst, onClick } = this.props;
    const defaultClassName = 'slds-button slds-size--1-of-2 browser-type slds-button--neutral';
    return (
      <div title={ title } className="slds-button-group slds-m-bottom--medium" role="group">
        <div className="slds-grid">
            <button
              onClick={ onClick }
              value={ true }
              className={ highlightFirst ? defaultClassName : defaultClassName + ' inactive'}>
                <span>Include</span>
            </button>
            <button
              onClick={ onClick }
              value={ false }
              className={ highlightFirst ? defaultClassName + ' inactive' : defaultClassName}>
                <span>Exclude</span>
            </button>
        </div>
        </div>
    );
  }
}

RadioGroup.propTypes = {
  onClick: PropTypes.func,
  title: PropTypes.string,
  highlightFirst: PropTypes.bool,
};

export default RadioGroup;

