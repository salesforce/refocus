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
// import moment from 'moment';
// import camelCase from 'camelcase';
// import Parser from 'html-react-parser';

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
          <div className="slds-form-element slds-p-vertical_small">
            <label className="slds-form-element__label">Room Name</label>
            <div className="slds-form-element__control">
              <input
                type="text"
                className="slds-input"
                placeholder="A readable name for your room"/>
            </div>
          </div>
          <div className="slds-form-element__control slds-p-vertical_small">
            <span className="slds-form-element__legend slds-form-element__label">
              Is the room currently active?
            </span>
            <span className="slds-radio">
              <input type="radio" id="radio-3" name="options" value="on" />
              <label className="slds-radio__label">
                <span className="slds-radio_faux"></span>
                <span className="slds-form-element__label">Active</span>
              </label>
            </span>
            <span className="slds-radio">
              <input type="radio" id="radio-4" name="options" value="on" />
              <label className="slds-radio__label">
                <span className="slds-radio_faux"></span>
                <span className="slds-form-element__label">Inactive</span>
              </label>
            </span>
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

// FormController.defaultProps = {
//   name: '',
//   active: false,
//   externalId: '',
//   settings: {},
//   bots: [],
// };

export default FormController;
