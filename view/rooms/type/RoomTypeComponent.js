/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/rooms/type/RoomTypeComponent.js
 *
 * Manages RoomType object page state.
 */
import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';

class RoomTypeComponent extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { roomType } = this.props;
    const buttons = (
      <div className='slds-panel__section slds-border_bottom'>
        <div className='slds-media__body'>
          <div className='slds-button-group slds-m-top_small' role='group'>
            <button className='slds-button slds-button_neutral'>Edit</button>
            <button className='slds-button slds-button_neutral'>Deactivate</button>
          </div>
        </div>
      </div>
    );
    const panel = (
      <div className='slds-panel__section'>
        <h3 className='slds-text-heading_small slds-m-bottom_medium'>Room Type Information</h3>
        <ul>
          <li className='slds-form-element slds-hint-parent slds-border_bottom'>
            <span className='slds-form-element__label'>Name</span>
            <div className='slds-form-element__control'>
              <span className='slds-form-element__static'>{roomType.name}</span>
            </div>
          </li>
          <li className='slds-form-element slds-hint-parent slds-border_bottom'>
            <span className='slds-form-element__label'>Enabled</span>
            <div className='slds-form-element__control'>
              <span className='slds-form-element__static'>{String(roomType.isEnabled)}</span>
            </div>
          </li>
          <li className='slds-form-element slds-hint-parent slds-border_bottom'>
            <span className='slds-form-element__label'>Bots</span>
            <div className='slds-form-element__control'>
              <span className='slds-form-element__static'>{String(roomType.bots)}</span>
            </div>
          </li>
          <li className='slds-form-element slds-hint-parent slds-border_bottom'>
            <span className='slds-form-element__label'>Created At</span>
            <div className='slds-form-element__control'>
              <span className='slds-form-element__static'>{moment(roomType.createdAt).format('LLL')}</span>
            </div>
          </li>
          <li className='slds-form-element slds-hint-parent slds-border_bottom'>
            <span className='slds-form-element__label'>Updated At</span>
            <div className='slds-form-element__control'>
              <span className='slds-form-element__static'>{moment(roomType.updatedAt).format('LLL')}</span>
            </div>
          </li>
        </ul>
      </div>
    );
    return (
      <div class='slds-form slds-form_stacked slds-grow slds-scrollable_y'>
        {panel}
      </div>
    );
  }
}

RoomTypeComponent.propTypes = {
  roomType: PropTypes.object,
};

export default RoomTypeComponent;
