/**
 * view/admin/components/common/ErrorRender.js
 *
 * Returns a lightning-styled error field
 */

import React, { PropTypes } from 'react';

class ErrorRender extends React.Component {
  render() {
    return (
      <div className='slds-notify_container'>
        <div
          className='slds-notify slds-notify--alert slds-theme--error slds-theme--alert-texture'
          role='alert'>
          <button
            onClick={this.props.hide}
            className='slds-button slds-button--icon-inverse slds-notify__close'>
            <svg aria-hidden='true' className='slds-icon slds-icon--x-small'>
              <use xlinkHref='../icons/utility-sprite/svg/symbols.svg#close'></use>
            </svg>
            <span className='slds-assistive-text'>Close</span>
          </button>
          <span className='slds-assistive-text'>Error</span>
          <h2 className='error-text'>{this.props.error}</h2>
        </div>
      </div>
    );
  }
}

ErrorRender.propTypes = {
  hide: PropTypes.func.isRequired,
  error: PropTypes.string
};

export default ErrorRender;
