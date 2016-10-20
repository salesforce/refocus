/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/perspective/PerspectiveController.js
 *
 * Manages perspective page state.
 * Passes on data to CreatePerspective
 */
import React, { PropTypes } from 'react';
import CreatePerspective from './CreatePerspective';
import Dropdown from '../admin/components/common/Dropdown';
import request from 'superagent';
const u = require('../utils');

class PerspectiveController extends React.Component {
  constructor(props) {
    super(props);
    this.sendResource = this.sendResource.bind(this);
    this.state = {
      showCreatePanel: false,
      showEditPanel: false,
    };
  }
  sendResource(verb, formObj, errCallback) {
    new Promise((resolve, reject) => {
      request(verb, '/v1/perspectives')
      .set('Content-Type', 'application/json')
      .set('Authorization', u.getCookie('Authorization'))
      .send(JSON.stringify(formObj))
      .end((error, response) => {
        error ? reject(error) : resolve(response.body);
      });
    }).then((res) => {
      window.location.href = '/perspectivesBeta/' + res.name;
    })
    .catch((err) => {
      errCallback(err);
    });
  }
  goToUrl(event) {
    window.location.href = '/perspectivesBeta/' + event.target.textContent;
  }
  openCreatePanel() {
    this.setState({ showCreatePanel: true });
  }
  cancelForm() {
    this.setState({ showCreatePanel: false });
  }

  render() {
    const { values, stateObject } = this.props;
    console.log('values', values)
    let persNames = [];
    if (values && values.perspectives) {
      persNames = values.perspectives.map((persObject) => {
        return persObject.name;
      });
    }
    // to hide perspective name on createPerspective modal,
    // set perspectives key to value empty
    const createPerspectiveVal = JSON.parse(JSON.stringify(stateObject));
    createPerspectiveVal.perspectives = '';
    return (
      <div>
        <Dropdown
          defaultValue={ values.name }
          allOptionsLabel='All Perspectives'
          placeholderText='Search Perspectives'
          options={ persNames }
          showSearchIcon={ true }
          onAddNewButton={ values.lenses ? this.openCreatePanel.bind(this) : undefined }
          onClickItem={ this.goToUrl.bind(this) }
          newButtonText='New Perspective'
        />
        { this.state.showCreatePanel && <CreatePerspective
          cancelCreate={ this.cancelForm.bind(this) }
          values={ values }
          stateObject={ createPerspectiveVal }
          sendResource={ this.sendResource }
        /> }
      </div>
    );
  }
}

PerspectiveController.PropTypes = {
  values: PropTypes.object,
  stateObject: PropTypes.object,
};

export default PerspectiveController;
