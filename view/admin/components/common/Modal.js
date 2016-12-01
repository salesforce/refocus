/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/admin/components/common/Modal.js
 *
 * Renders a open modal. Takes components as the children parameter
 */

import React, { PropTypes } from 'react';

// props: need onClose, onSave handlers
class Modal extends React.Component {
  render() {
    const {
      title,
      onSave,
      onHide,
      primaryBtnTxt,
      children,
      notificationBox
    } = this.props;
    return (
      <div>
        <div
          className='slds-modal slds-fade-in-open'
          aria-hidden='false'
          role='dialog'>
            <div className='slds-modal__container'>
                <div className='slds-modal__header'>
                    <button
                      onClick={onHide}
                      className={'slds-button slds-button--icon-inverse' +
                      ' slds-modal__close'}>
                        <svg aria-hidden='true'
                          className={'slds-button__icon' +
                          ' slds-button__icon--large'}>
                          <use xlinkHref={'../static/icons/' +
                            'action-sprite/svg/symbols.svg#close'}></use>
                        </svg>
                        <span className='slds-assistive-text'>Close</span>
                    </button>
                    <h2 className='slds-text-heading--medium'>{title}</h2>
                </div>
                { notificationBox }
                <div className='slds-modal__content slds-p-around--medium'>
                  {children}
                </div>
                <div className='slds-modal__footer'>
                    <button
                      onClick={onHide}
                      className='slds-button slds-button--neutral cancelButton'
                    >Cancel</button>
                    <button
                      className={'slds-button slds-button--neutral' +
                      ' slds-button--brand'}
                      onClick={onSave}
                    >{primaryBtnTxt || 'Save'}</button>
                </div>
            </div>
          </div>
        <div className='slds-backdrop slds-backdrop--open'></div>
      </div>
    );
  }
}

Modal.propTypes = {
  notificationBox: PropTypes.node,
  title: PropTypes.string,
  cancelUrl: PropTypes.string,
  onSave: PropTypes.func,
  onHide: PropTypes.func,
  primaryBtnTxt: PropTypes.string,
  children: React.PropTypes.element,
};

export default Modal;
