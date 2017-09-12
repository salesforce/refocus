/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/roomTypes/ListController.js
 *
 */
import React, { PropTypes } from 'react';
import moment from 'moment';

class ListController extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const roomTypes = this.props.roomTypes !== undefined ? this.props.roomTypes : [];
    return (
      <div>
        <div className="slds-page-header">
          <div className="slds-media">
            <div className="slds-media__body">
              <h1 className="slds-page-header__title slds-truncate slds-align-middle" title="Refocus Room Types">
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
              {roomTypes.map((roomType) => {
                return <tr>
                  <td><a href={'/roomTypes/'+roomType.id}>{roomType.id}</a></td>
                  <td><a href={'/roomTypes/'+roomType.id}>{roomType.name}</a></td>
                  <td>{roomType.isEnabled ? 'True' : 'False'}</td>
                  <td>{roomType.bots}</td>
                  <td>{moment(roomType.createdAt).format('LLL')}</td>
                  <td>{moment(roomType.updatedAt).format('LLL')}</td>
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
  roomTypes: PropTypes.object
};

export default ListController;
