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
    if (!roomType) return (null);
    const buttons = (
      <div className='slds-panel__section slds-border_bottom slds-border_top'>
        <div className='slds-media__body'>
          <div className='slds-button-group slds-m-top_small' role='group'>
            <button
              disabled={ true }
              className='slds-button slds-button_neutral'>
                Edit
              </button>
          </div>
        </div>
      </div>
    );
    const panel = (
      <div className='slds-panel__section'>
        <h3 className='slds-text-heading_small slds-m-bottom_medium'>Room Type Information</h3>
        <ul>
          {this.createPanelItem('Name', roomType.name)}
          {this.createPanelItem('Enabled', String(roomType.isEnabled))}
          {this.createPanelItem('Bots', String(roomType.bots))}
          {this.createPanelItem('Created At', moment(roomType.createdAt).format('LLL'))}
          {this.createPanelItem('Updated At', moment(roomType.updatedAt).format('LLL'))}
        </ul>
      </div>
    );
    return (
      <div className='slds-form slds-form_stacked slds-grow slds-scrollable_y'>
        {buttons}
        {panel}
      </div>
    );
  }

  createPanelItem(label, value) {
    return (<li className='slds-form-element slds-hint-parent slds-border_bottom'>
      <span className='slds-form-element__label'>{label}</span>
      <div className='slds-form-element__control'>
        <span className='slds-form-element__static'>{value}</span>
      </div>
    </li>);
  }
}

RoomTypeComponent.propTypes = {
  roomType: PropTypes.object,
};

export default RoomTypeComponent;
