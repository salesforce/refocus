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
 */
import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import camelCase from 'camelcase';
import Parser from 'html-react-parser';

class ListController extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {
      tableHeaders,
      tableRows,
    } = this.props;
    tableRows.sort((a, b) => moment(b.updatedAt) - moment(a.updatedAt));

    return (
      <div>
        <table className='slds-table slds-table--bordered slds-table-cell-buffer'>
          <thead>
            <tr className='slds-text-title--caps'>
              {tableHeaders.map(header => {
                const key = camelCase(header);
                return <th scope='col' key={key}>
                  <div className='slds-truncate' title={key}>{header}</div>
                </th>;
              })}
            </tr>
          </thead>
          <tbody>
            {tableRows.map(row => {
              const camelCaseHeaders = tableHeaders.map(header => camelCase(header));
              return <tr key={row.id}>
                {camelCaseHeaders.map(header =>
                  <td key={row.id + header}>
                    {Parser(row[header])}
                  </td>)}
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    );
  }
}

ListController.propTypes = {
  tableHeaders: PropTypes.array,
  tableRows: PropTypes.array,
};

ListController.defaultProps = {
  tableHeaders: [],
  tableRows: [],
};

export default ListController;
