/**
 * Copyright (c) 2017, salesforce.com, inc.
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

class ListController extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const rooms = this.props.rooms !== undefined ? this.props.rooms : [];
    return (
      <div>
        <div className="slds-page-header">
          <div className="slds-media">
            <div className="slds-media__body">
              <h1 className="slds-page-header__title slds-truncate slds-align-middle" title="Refocus Rooms">
                Refocus Rooms
              </h1>
              <p className="slds-text-body_small slds-line-height_reset">
                Number of rooms: {rooms.length}
              </p>
            </div>
          </div>
        </div>
        <div>
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
              {rooms.map((room) => {
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
      </div>
    );
  }
}

ListController.PropTypes = {
  rooms: PropTypes.object,
};

export default ListController;
