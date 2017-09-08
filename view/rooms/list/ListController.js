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
import moment from 'moment';

class ListController extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const rooms = this.props.rooms !== undefined ? this.props.rooms : [];
    rooms.sort((a, b) => {
      return moment(b.updatedAt) - moment(a.updatedAt);
    });
    const roomTypes = this.props.roomTypes !== undefined ? this.props.roomTypes : [];
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
                <th scope="col">
                  <div className="slds-truncate" title="create">Created At</div>
                </th>
                <th scope="col">
                  <div className="slds-truncate" title="updated">Update At</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => {
                const roomType = roomTypes.filter((rt) => rt.id === room.type);
                return <tr>
                  <td><a href={'/rooms/'+room.id}>{room.id}</a></td>
                  <td><a href={'/rooms/'+room.id}>{room.name}</a></td>
                  <td>{roomType[0].name}</td>
                  <td>{room.active ? 'True' : 'False'}</td>
                  <td>{moment(room.createdAt).format('LLL')}</td>
                  <td>{moment(room.updatedAt).format('LLL')}</td>
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
  roomTypes: PropTypes.object,
};

export default ListController;
