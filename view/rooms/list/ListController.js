/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/rooms/ListController.js
 *
 * Manages perspective page state.
 * Passes on data to CreatePerspective
 */
import React, { PropTypes } from 'react';
import request from 'superagent';
const u = require('../../utils');

class ListController extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { values } = this.props;
    return (
      <div className="slds-grid">
        <table className="slds-table slds-table--bordered slds-table-cell-buffer">
          <thead>
            <tr className="slds-text-title--caps">
              <th scope="col">
                <div className="slds-truncate" title="roomID">ID</div>
              </th>
              <th scope="col">
                <div className="slds-truncate" title="roomName">Name</div>
              </th>
              <th scope="col">
                <div className="slds-truncate" title="type">Type</div>
              </th>
              <th scope="col">
                <div className="slds-truncate" title="active">Active</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {values.map((room) => {
              return <tr>
                <td><a href={'/rooms/'+room.id}>{room.id}</a></td>
                <td><a href={'/rooms/'+room.id}>{room.name}</a></td>
                <td>{room.type}</td>
                <td>{room.active ? 'True' : 'False'}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    );
  }
}

ListController.PropTypes = {
  // contains perspective, subjects, ...
  values: PropTypes.object,
};

export default ListController;
