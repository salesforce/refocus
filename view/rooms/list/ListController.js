/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/rooms/list/ListController.js
 *
 * Manages List View page state.
 * Receives parameters from Rooms and RoomTypes
 */
import React from 'react';
import PropTypes from 'prop-types'
import moment from 'moment';
import camelCase from 'camelcase';

class ListController extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {
      pageTitle,
      pageDescription,
      tableHeaders,
      tableRows,
      rooms,
      roomTypes
    } = this.props;

    const objectCount = rooms.length > 0 ? rooms.length : roomTypes.length;

    // rooms.sort((a, b) => moment(b.updatedAt) - moment(a.updatedAt));

    // if (rooms.length > 0) {
    //   return this.renderRooms(rooms, roomTypes);
    // } else {
    //   return this.renderRoomTypes(roomTypes);
    // }

    return (
      <div>
        <div className="slds-page-header">
          <div className="slds-media">
            <div className="slds-media__body">
              <h1 className="slds-page-header__title slds-truncate slds-align-middle"
                title={camelCase(pageTitle)}>
                {pageTitle}
              </h1>
              <p className="slds-text-body_small slds-line-height_reset">
                {pageDescription}{objectCount}
              </p>
            </div>
          </div>
        </div>
        <div>
          <table className="slds-table slds-table--bordered slds-table-cell-buffer">
            <thead>
              <tr className="slds-text-title--caps">
                {tableHeaders.map(header => {
                  const key = camelCase(header);
                  return <th scope="col" key={key}>
                    <div className="slds-truncate" title={key}>{header}</div>
                  </th>;
                })}
              </tr>
            </thead>
            <tbody>
              {tableRows.map(row => {
                return <tr key={row.id}>
                    <td>{row.name}</td>
                  </tr>
                })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  renderRooms(rooms, roomTypes) {
    return (
      <div>
        <div className="slds-page-header">
          <div className="slds-media">
            <div className="slds-media__body">
              <h1 className="slds-page-header__title slds-truncate slds-align-middle"
                title="Refocus Rooms">
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
            <tbody>
              {rooms.map((room) => {
                const roomType = roomTypes.filter((rt) => rt.id === room.type);
                const { id } = room;
                return <tr>
                  <td><a href={'/rooms/' + id}>{id}</a></td>
                  <td><a href={'/rooms/' + id}>{room.name}</a></td>
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

  renderRoomTypes(roomTypes) {
    return (
      <div>
        <div className="slds-page-header">
          <div className="slds-media">
            <div className="slds-media__body">
              <h1 className="slds-page-header__title slds-truncate slds-align-middle"
                title="Refocus Room Types">
                Refocus Room Types
              </h1>
              <p className="slds-text-body_small slds-line-height_reset">
                Number of Room Types: {roomTypes.length}
              </p>
            </div>
          </div>
        </div>
        <div>
          <table className="slds-table slds-table--bordered slds-table-cell-buffer">
            <thead>
              <tr className="slds-text-title--caps">
                <th scope="col">
                  <div className="slds-truncate" title="roomTypeID">ID</div>
                </th>
                <th scope="col">
                  <div className="slds-truncate" title="roomTypeName">Name</div>
                </th>
                <th scope="col">
                  <div className="slds-truncate" title="isEnabled">Enabled</div>
                </th>
                <th scope="col">
                  <div className="slds-truncate" title="bots">Bots</div>
                </th>
                <th scope="col">
                  <div className="slds-truncate" title="create">Created At</div>
                </th>
                <th scope="col">
                  <div className="slds-truncate" title="updated">Updated At</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {roomTypes.map(roomType => {
                const roomColumn = (<tr>
                  <td>{roomType.id}</td>
                  <td>{roomType.name}</td>
                  <td>{roomType.isEnabled ? 'True' : 'False'}</td>
                  <td>{roomType.bots}</td>
                  <td>{moment(roomType.createdAt).format('LLL')}</td>
                  <td>{moment(roomType.updatedAt).format('LLL')}</td>
                </tr>);
                return roomColumn;
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}

ListController.PropTypes = {
  pageTitle: PropTypes.string,
  pageDescription: PropTypes.string,
  tableHeaders: PropTypes.array,
  tableRows: PropTypes.array,
  rooms: PropTypes.object,
  roomTypes: PropTypes.object,
};

ListController.defaultProps = {
  pageTitle: 'List View',
  pageDescription: 'Number of rows: ',
  tableHeaders: [],
  tableRows: [],
  rooms: [],
  roomTypes: []
}

export default ListController;
