/**
 * view/admin/components/common/MessageRender.js
 *
 * Returns a lightning-styled info field
 */

import React, { PropTypes } from 'react';

class MessageRender extends React.Component {
  render() {
    return (
      <div className='slds-notify_container'>
        <div
            className='slds-notify slds-notify--alert slds-theme--success slds-theme--alert-texture'
            role='alert'>
          <button
            onClick={this.props.hide}
            className='slds-button slds-button--icon-inverse slds-notify__close'>
            <svg aria-hidden='true' className='slds-icon slds-icon--x-small'>
              <use xlinkHref='../icons/utility-sprite/svg/symbols.svg#close'></use>
            </svg>
            <span className='slds-assistive-text'>Close</span>
          </button>
          <span className='slds-assistive-text'>Success</span>
          <h2>{ this.props.message}</h2>
        </div>
      </div>
    );
  }
}

MessageRender.propTypes = {
  hide: PropTypes.func.isRequired,
  message: PropTypes.string
};

export default MessageRender;
