/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/rooms/new/FormController.js
 *
 * This component creates the form used to create a new room.
 */
import React from 'react';
import PropTypes from 'prop-types';
const request = require('superagent');
const _ = require('lodash');
const FIRST_ENTRY = 0;
const TAB_SPACING = 2;

class FormController extends React.Component {
  constructor(props) {
    super(props);
    this.state={
      name: this.props.name,
      type: this.props.type,
      types: [],
      active: this.props.active,
      externalId: this.props.externalId,
      settings: this.props.settings,
      JSONsettings: JSON.stringify(this.props.settings, undefined, TAB_SPACING),
      settingBorder: 'slds-textarea',
      bots: this.props.bots,
      botString: this.props.bots.toString(),
    };

    this.createRoom = this.createRoom.bind(this);
    this.setName = this.setName.bind(this);
    this.setType = this.setType.bind(this);
    this.setActive = this.setActive.bind(this);
    this.setExternalId = this.setExternalId.bind(this);
    this.setSettings = this.setSettings.bind(this);
    this.fixJson = this.fixJson.bind(this);
    this.setBots = this.setBots.bind(this);
    this.getAvailableRoomTypes();
  }

  getAvailableRoomTypes(){
    const req = request.get('/v1/roomTypes');
    req
      .end((error, res) => {
        if (error) {
          console.log('Error: ', error.response.text);
        } else {
          this.setState({ types: res.body });
          if (this.props.type !== '') {
            const result = res.body.filter((rt) => rt.id === this.props.type);
            if (_.isEqual(this.props.settings, {})) {
              this.setState(
                {
                  JSONsettings:
                    JSON.stringify(
                      result[FIRST_ENTRY].settings,
                      undefined,
                      TAB_SPACING
                    )
                }
              );
            }

            if (_.isEqual(this.props.bots, [])) {
              this.setState({ botString: result[FIRST_ENTRY].bots.toString() });
            }
          }
        }
      });
  }

  createRoom(){
    const req = request.post('/v1/rooms');
    const obj = {
      name: this.state.name,
      type: this.state.type,
      externalId: this.state.externalId,
      active: this.state.active,
      settings: JSON.parse(this.state.JSONsettings),
      bots: this.state.botString.split(','),
    };
    req
      .send(obj)
      .end((error, res) => {
        if (error) {
          if (error.response.text.includes('SequelizeUniqueConstraintError')) {
            window.location.href = `/rooms/${this.state.name}`;
          }
          console.log('Error: ', error.response.text);
        } else {
          window.location.replace(`/rooms/${res.body.id}`);
        }
      });
  }

  setName(event) {
    this.setState({ name: event.target.value });
  }

  setType(event) {
    const result = this.state.types.filter((rt) =>
      rt.id === event.target.value
    );
    this.setState({
      type: event.target.value,
      settings: result[FIRST_ENTRY].settings,
      bots: result[FIRST_ENTRY].bots,
      JSONsettings:
        JSON.stringify(result[FIRST_ENTRY].settings, undefined, TAB_SPACING),
      botString: result[FIRST_ENTRY].bots.toString(),
    });
  }

  setActive(event) {
    this.setState({ active: (event.target.value === 'Active') });
  }

  setExternalId(event) {
    this.setState({ externalId: event.target.value });
  }

  setSettings(event) {
    this.setState({ JSONsettings: event.target.value });
  }

  fixJson(event){
    try {
      this.setState({
        JSONsettings:
          JSON.stringify(JSON.parse(event.target.value), undefined, TAB_SPACING)
      });
      this.setState({ settingBorder: 'slds-textarea' });
    } catch (e) {
      this.setState({ settingBorder: 'slds-textarea slds-has-error' });
    }
  }

  setBots(event) {
    this.setState({ botString: event.target.value });
  }

  render() {
    return (
      <div>
        <div
          className="slds-page-header slds-page-header_vertical slds-theme_shade"
          style={{ paddingLeft: '1.5rem' }}>
          <div className="slds-grid">
            <div className="slds-cols slds-has-flexi-truncate">
              <div className="slds-media slds-no-space slds-grow">
                <div className="slds-media__body">
                  <div className="slds-form-element" style={{ float: 'right' }}>
                    <button
                      className="slds-button slds-button_neutral"
                      onClick={() => this.createRoom()}>
                      Create Room
                    </button>
                  </div>
                  <h1
                    className="slds-page-header__title slds-m-right--small slds-align-middle" id="title">
                    Create new room
                  </h1>
                  <p className="slds-text-body_small slds-line-height_reset"
                    id="subTitle">
                    Fill in data to create a new room.
                    Click "Create Room" when you are ready to create room
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="slds-p-around_large">
          <div className="slds-form slds-form_stacked">
            <div className="slds-text-heading_medium">
              New room attributes
            </div>
            <div className="slds-form-element slds-p-top_small">
              <label className="slds-form-element__label">
                <span className="slds-required">*</span>Room Name
              </label>
              <div className="slds-form-element__control">
                <input
                  id="nameInput"
                  type="text"
                  className="slds-input"
                  value={this.state.name}
                  onChange={this.setName}
                  placeholder="A readable name for your room"/>
              </div>
            </div>
            <div className="slds-form-element slds-p-top_small">
              <label className="slds-form-element__label">
                <span className="slds-required">*</span>Room Type
              </label>
              <div className="slds-form-element__control">
                <div className="slds-select_container">
                  <select
                    id="typeInput"
                    className="slds-select"
                    value={this.state.type}
                    onChange={this.setType}>
                    <option value="">Please select a Room Type</option>
                    {this.state.types.map((rt) => {
                      return (<option value={rt.id}>{rt.name}</option>);
                    })}
                  </select>
                </div>
              </div>
            </div>
            <div className="slds-form-element slds-p-top_small">
              <label className="slds-form-element__label">External ID</label>
              <div className="slds-form-element__control">
                <input
                  id="externalIdInput"
                  type="text"
                  className="slds-input"
                  value={this.state.externalId}
                  onChange={this.setExternalId}
                  placeholder="(Optional) Enter an External ID"/>
              </div>
            </div>
            <div className="slds-form-element slds-p-top_small">
              <span
                className="slds-form-element__legend slds-form-element__label">
                <span className="slds-required">*</span>Current State of Room
              </span>
              <div className="slds-form-element">
                <div
                  className="slds-form-element__control"
                  onChange={this.setActive}>
                  <input
                    id="activeInput"
                    type="radio"
                    value="Active"
                    name="active"
                    defaultChecked={this.state.active}/>
                      Active<br/>
                  <input
                    id="inactiveInput"
                    type="radio"
                    value="Inactive"
                    name="active"
                    defaultChecked={!this.state.active}/>
                      Inactive
                </div>
              </div>
            </div>
            <div className="slds-form-element slds-p-top_small">
              <label className="slds-form-element__label">Bots</label>
              <div className="slds-form-element__control">
                <input
                  id="botsInput"
                  type="text"
                  className="slds-input"
                  value={this.state.botString}
                  onChange={this.setBots}
                  placeholder="List of Bots needed in the room"/>
              </div>
            </div>
            <div className="slds-form-element slds-p-top_small">
              <label className="slds-form-element__label">Settings</label>
              <div className="slds-form-element__control">
                <textarea
                  id="settingsInput"
                  type="text"
                  className={this.state.settingBorder}
                  onBlur={this.fixJson}
                  value={this.state.JSONsettings}
                  onChange={this.setSettings}
                  rows={this.state.JSONsettings.split('\n').length}
                  placeholder=
                    "Object that contains all the settings for this room"/>
              </div>
            </div>
            <div className=
              "slds-form-element slds-p-top_small slds-text-align_center">
              <button
                className="slds-button slds-button_neutral"
                id="createNew"
                onClick={() => this.createRoom()}>
                Create Room
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

FormController.propTypes = {
  name: PropTypes.string,
  type: PropTypes.string,
  active: PropTypes.bool,
  externalId: PropTypes.string,
  settings: PropTypes.object,
  bots: PropTypes.array,
  autoNaming: PropTypes.bool,
};

FormController.defaultProps = {
  name: '',
  type: '',
  active: false,
  externalId: '',
  settings: {},
  bots: [],
  autoNaming: false,
};

export default FormController;
