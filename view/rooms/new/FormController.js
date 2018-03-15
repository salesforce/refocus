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
 *
 */
import React from 'react';
import PropTypes from 'prop-types';

class FormController extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="slds-p-around_large">
        <div className="slds-form slds-form_stacked">
          <div className="slds-text-heading_medium">
            New room attributes
          </div>
          <div className="slds-form-element slds-p-top_small">
            <label className="slds-form-element__label">Room Name</label>
            <div className="slds-form-element__control">
              <input
                type="text"
                className="slds-input"
                placeholder="A readable name for your room"/>
            </div>
          </div>
          <div className="slds-form-element slds-p-top_small">
            <label className="slds-form-element__label">External ID</label>
            <div className="slds-form-element__control">
              <input
                type="text"
                className="slds-input"
                placeholder="(Optional) Enter an External ID"/>
            </div>
          </div>
          <div className="slds-form-element__control slds-p-top_small">
            <span
              className="slds-form-element__legend slds-form-element__label">
              Is the room currently active?
            </span>
            <div className="slds-form-element">
              <label className="slds-checkbox_toggle slds-grid">
                <span className="slds-checkbox_faux_container">
                  <span className="slds-checkbox_faux">
                  </span>
                  <span className="slds-checkbox_on slds-text-align--center">
                    Active
                  </span>
                  <span className="slds-checkbox_off slds-text-align--center">
                    Inactive
                  </span>
                </span>
              </label>
            </div>
          </div>
          <div className="slds-form-element slds-p-top_small">
            <label className="slds-form-element__label">Bots</label>
            <div className="slds-form-element__control">
              <input
                type="text"
                className="slds-input"
                placeholder="List of Bots needed in the room"/>
            </div>
          </div>
          <div className="slds-form-element slds-p-top_small">
            <label className="slds-form-element__label">Settings</label>
            <div className="slds-form-element__control">
              <textarea
                type="text"
                className="slds-textarea"
                placeholder=
                  "Object that contains all the settings for this room"/>
            </div>
          </div>
          <div className=
            "slds-form-element slds-p-top_small slds-text-align_center">
            <button className="slds-button slds-button_neutral" id="createNew">
              Create Room
            </button>
          </div>
        </div>
      </div>
    );
  }
}

FormController.propTypes = {
  name: PropTypes.string,
  active: PropTypes.boolean,
  externalId: PropTypes.string,
  settings: PropTypes.object,
  bots: PropTypes.array,
};

export default FormController;
