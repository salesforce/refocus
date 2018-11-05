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
const request = require('superagent');

class RoomTypeComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      edit: false,
      Name: this.props.roomType ? this.props.roomType.name : '',
      Enabled: this.props.roomType ? this.props.roomType.isEnabled : true,
      Bots: this.props.roomType ? this.props.roomType.bots : [],
      Settings: this.props.roomType ?
        JSON.stringify(this.props.roomType.settings, undefined, 2) : '',
      error: null,
    };
    this.editToggle = this.editToggle.bind(this);
    this.changeSettings = this.changeSettings.bind(this);
    this.changeBots = this.changeBots.bind(this);
    this.changeEnabled = this.changeEnabled.bind(this);
    this.changeName = this.changeName.bind(this);
    this.cancelToggle = this.cancelToggle.bind(this);
    this.errorBox = this.errorBox.bind(this);
    this.updateRoomType = this.updateRoomType.bind(this);
  }

  /**
   * Update roomType based on input fields current state
   */
  updateRoomType(){
    const req = request.patch(`/v1/roomTypes/${this.props.roomType.id}`);
    const obj = {};
    try {
      const obj = {
        name: this.state.Name,
        isEnabled: this.state.Enabled == 'true',
        bots:  Array.isArray(this.state.Bots) ?
          this.state.Bots : typeof this.state.Bots === 'string' ?
          this.state.Bots.split(',') : [],
        settings: JSON.parse(this.state.Settings),
      };
      req
        .send(obj)
        .end((error, res) => {
          if (error) {
            this.setState({ error: error.response.body.errors[0].message });
          } else {
            window.location.replace(`/rooms/types/${res.body.id}`);
          }
        });
    } catch (e) {
      this.setState({ error: e.message });
    }
  }

  /**
   * This toggles between edit modes and save modes
   * if in the save mode it will try to update the roomType
   */
  editToggle(){
    if (this.state.edit) {
      this.updateRoomType();
    } else {
      this.setState({ edit: !this.state.edit });
    }
  }

  /**
   * This removes all the changes the user made while in edit mode
   */
  cancelToggle(){
    this.setState({
      edit: false,
      Name: this.props.roomType.name,
      Enabled: this.props.roomType.isEnabled,
      Bots: this.props.roomType.bots,
      Settings: JSON.stringify(this.props.roomType.settings, undefined, 2),
      error: null,
    });
  }

  /**
   * Update Settings on each key stroke
   */
  changeSettings(event){
    this.setState({ Settings: event.target.value });
  }

  /**
   * Update Bots on each key stroke
   */
  changeBots(event){
    this.setState({ Bots: event.target.value });
  }

  /**
   * Update Enabled on each key stroke
   */
  changeEnabled(event){
    this.setState({ Enabled: event.target.value });
  }

  /**
   * Update Name on each key stroke
   */
  changeName(event){
    this.setState({ Name: event.target.value });
  }

  render() {
    const { roomType } = this.props;
    const { Name, Enabled, Bots, Settings } = this.state;

    // Display nothing is roomType not found
    if (!roomType) return (null);

    // Toggle between Edit Button and Save/Cancel Buttons
    const buttons = (
      <div className='slds-panel__section slds-border_bottom slds-border_top'>
        <div className='slds-media__body'>
          <div className='slds-button-group' role='group'>
            <button
              className='slds-button slds-button_neutral'
              onClick={() => this.editToggle()}>
                {this.state.edit ? 'Save' : 'Edit'}
              </button>
          </div>
          { this.state.edit &&
            <div className='slds-button-group' role='group'>
              <button
                className='slds-button slds-button_neutral'
                onClick={() => this.cancelToggle()}>
                  Cancel
                </button>
            </div>
          }
        </div>
      </div>
    );

    // View current roomType
    const staticPanel = (
      <div className='slds-panel__section'>
        <h3 className='slds-text-heading_small slds-m-bottom_medium'>Room Type Information</h3>
        <ul>
          {this.createPanelItem('Name', roomType.name)}
          {this.createPanelItem('Enabled', String(roomType.isEnabled))}
          {this.createPanelItem('Created At', moment(roomType.createdAt).format('LLL'))}
          {this.createPanelItem('Updated At', moment(roomType.updatedAt).format('LLL'))}
          {this.createPanelItem('Bots', String(roomType.bots))}
          {this.createSettingView('Settings', JSON.stringify(roomType.settings, undefined, 2))}
        </ul>
      </div>
    );

    // Edit Current roomType
    const editPanel = (
      <div className='slds-panel__section'>
        <h3 className='slds-text-heading_small slds-m-bottom_medium'>Room Type Information</h3>
        <ul>
          {this.createEditItem('Name', Name, this.changeName)}
          {this.createEditItem('Enabled', Enabled, this.changeEnabled)}
          {this.createPanelItem('Created At', moment(roomType.createdAt).format('LLL'))}
          {this.createPanelItem('Updated At', moment(roomType.updatedAt).format('LLL'))}
          {this.createEditItem('Bots', Bots, this.changeBots)}
          {this.createEditSetting('Settings', Settings, this.changeSettings)}
        </ul>
      </div>
    );

    // Get errors
    const errorMessage = this.state.error ? this.errorBox(this.state.error) : '';

    // Output
    return (
      <div className='slds-form slds-form_stacked slds-grow slds-scrollable_y'>
        {buttons}
        {errorMessage}
        {this.state.edit ? editPanel : staticPanel}
      </div>
    );
  }

  /**
   * Create Error Box is roomType wont load
   */
  errorBox(error){
    return (
      <div className='slds-page-header slds-page-header_vertical'>
        <div className="slds-notify slds-notify_toast slds-theme_info slds-theme--error" style={{ width: '98%' }}>
          <div className="slds-notify__content" style={{ width: '100%' }}>
            <h2 className="slds-text-heading_small">{ error }</h2>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Create input
   */
  createEditItem(label, value, changes) {
    return (<li className='slds-form-element slds-hint-parent slds-border_bottom'>
      <span className='slds-form-element__label'>{label}</span>
      <div className='slds-form-element__control'>
        <input
          id={label}
          type="text"
          className="slds-input"
          onChange={changes}
          value={value}/>
      </div>
    </li>);
  }

  /**
   * Create single line output
   */
  createPanelItem(label, value) {
    return (<li className='slds-form-element slds-hint-parent slds-border_bottom'>
      <span className='slds-form-element__label'>{label}</span>
      <div className='slds-form-element__control'>
        <span className='slds-form-element__static'>{value}</span>
      </div>
    </li>);
  }

  /**
   * Create Settings output
   */
  createSettingView(label, value) {
    if (value) {
      return (<li className='slds-form-element slds-hint-parent slds-border_bottom'>
        <span className='slds-form-element__label'>{label}</span>
        <div className='slds-form-element__control'>
          {value.split('\n').map((val) => {
            return (
              <div style={{maxWidth:'900px', overflowWrap: 'break-word'}}>
                {val.replace(/ /g, "\u00a0")} <br />
              </div>
            );
          })}
        </div>
      </li>);
    }
  }

  /**
   * Create Settings Edit Field
   */
  createEditSetting(label, value, changes) {
    if (value) {
      return (<li className='slds-form-element slds-hint-parent slds-border_bottom'>
        <span className='slds-form-element__label'>{label}</span>
        <div className='slds-form-element__control'>
          <textarea
            id={label}
            type="text"
            value={value}
            rows={value.split('\n').length}
            onChange={changes}
            style={{width:'900px'}}/>
        </div>
      </li>);
    }
  }
}

RoomTypeComponent.propTypes = {
  roomType: PropTypes.object,
};

export default RoomTypeComponent;
