/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/*
 * view/admin/components/common/Pill.js
 *
 * Renders a lightning-style pill.
 * Icons and click handlers are optional.
 */

import React, { PropTypes } from 'react';

class Pill extends React.Component {
  render() {
    let outputPills = [];
    this.props.title.map((word, index) => {
      outputPills.push(<span className="slds-pill" key={ index }>
        { this.props.icon }
        <a href="javascript:void(0);"
          className="slds-pill__label"
          title={ word }>
          { word }
        </a>
        <button onClick={this.props.onRemove}
          className="slds-button slds-button--icon slds-pill__remove">
          <svg aria-hidden="true" className="slds-button__icon">
              <use xlinkHref="../static/icons/utility-sprite/svg/symbols.svg#close"></use>
          </svg>
          <span className="slds-assistive-text">Remove</span>
        </button>
      </span>
    );
  });
    return (
      <div className="slds-pill_container">
      { outputPills }
      </div>
    )
  }
}

Pill.propTypes = {
  icon: PropTypes.node,
  title: PropTypes.array.isRequired,
  onRemove: PropTypes.func.isRequired,
};

export default Pill;
