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
      name: props.values.name, // perspective name
      isEditing: false,
      showCreatePanel: false,
      isCreating: false,
      showEditPanel: false,
    };
  }
  sendResource(verb, formObj, errCallback) {
    new Promise((resolve, reject) => {
      request(verb, formObj.url)
      .set('Content-Type', 'application/json')
      .set('Authorization', u.getCookie('Authorization'))
      .send(JSON.stringify(formObj))
      .end((error, response) => {
        error ? reject(error) : resolve(response.body);
      });
    }).then((res) => {
      window.location.href = '/perspectives/' + res.name;
    })
    .catch((err) => {
      errCallback(err);
    });
  }
  // TODO: test this is independent of onEdit
  openCreatePanel() {
    this.setState({ isEditing: false, isCreating: true, showCreatePanel: true });
  }
  cancelForm() {
    this.setState({ showCreatePanel: false });
  }

  onEdit(event) {
    // prevent the page from refreshing to another perspective
    event.preventDefault();
    // TODO: refactor to get from onclick handler, instead of through DOM
    const name = event.target.parentElement.parentElement.textContent;
    // update values according to name
    this.setState({ isEditing: true, name, showCreatePanel: true });
  }

  render() {
    const { values, params } = this.props;
    const { showCreatePanel, isEditing, name } = this.state;
    return (
      <div>
        <Dropdown
          defaultValue={ this.state.name }
          allOptionsLabel='All Perspectives'
          placeholderText='Search Perspectives'
          showEditIcon={ true }
          onEdit={ this.onEdit.bind(this) }
          options={ values.persNames }
          // if there's lenses, open modal
          onAddNewButton={ values.lenses && this.openCreatePanel.bind(this) }
          newButtonText='New Perspective'
          renderAsLink={ true }
        />
        { showCreatePanel && <CreatePerspective
          cancelCreate={ this.cancelForm.bind(this) }
          isEditing={ isEditing }
          values={ values }
          name={ name }
          params={ params }
          sendResource={ this.sendResource }
        /> }
      </div>
    );
  }
}

PerspectiveController.PropTypes = {
  // contains perspective, subjects, ...
  values: PropTypes.object,
};

export default PerspectiveController;
