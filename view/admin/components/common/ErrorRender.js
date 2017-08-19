/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/admin/components/common/ErrorRender.js
 *
 * Returns a lightning-styled error field
 */

import React, { PropTypes } from 'react';

class ErrorRender extends React.Component {
  render() {
    const { displayRelative, hide, error } = this.props;
    const style = {
      position: displayRelative ?
        'relative' : 'fixed', // default fixed position.
    };
    return (
      <div className='slds-notify_container' style={ style }>
        <div
          className={'slds-notify slds-notify--alert' +
          ' slds-theme--error slds-theme--alert-texture'}
          role='alert'>
          <button
            onClick={ hide }
            className={'slds-button slds-button--icon-inverse' +
            ' slds-notify__close'}>
            <svg aria-hidden='true' className='slds-icon slds-icon--x-small'>
              <use
                xlinkHref={'../static/icons/utility-sprite/svg/' +
                'symbols.svg#close'}>
              </use>
            </svg>
            <span className='slds-assistive-text'>Close</span>
          </button>
          <span className='slds-assistive-text'>Error</span>
          <h2 className='error-text'>{ error }</h2>
        </div>
      </div>
    );
  }
}

ErrorRender.propTypes = {
  hide: PropTypes.func.isRequired,
  error: PropTypes.string,
  displayRelative: PropTypes.bool,
};

export default ErrorRender;
