/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/admin/components/common/DataTable.js
 *
 * Given row properties and data, renders table
 */

import React, { Component, PropTypes } from 'react';
import { Link } from 'react-router';

class DataTable extends Component {
  render() {
    const { resource, doDelete,
      parentAbsolutePath, results, columnMetadata } = this.props;
    let headersArr = [];
    let rowsArr = [];
    let rowData = [];

    for (let i = 0; i <columnMetadata.length; i++) {
      headersArr.push(
        <th
        scope='col'
        key={ columnMetadata[i].columnName }>
          { columnMetadata[i].displayName }
        </th>
      );
    }
    for (let i = results.length - 1; i >= 0; i--) {
      for (let key in columnMetadata) {
        // ie. name, absolutePath
        const customOutput = columnMetadata[key].customOutput;
        const readOnly = columnMetadata[key].readOnly;
        const resourceKey = columnMetadata[key].columnName;
        const key = results[i].id + key;
        if (customOutput) {
          if (customOutput === 'link') {
            const value = results[i][resourceKey];
            rowData.push( // create child button for subject
              <th scope='col' key={ key }>
                <Link to={ '/' + resource +  '/' + value }>{ value }</Link>
              </th>
            );
          } else if (customOutput === 'checkbox' && readOnly) {
            const checked = results[i][resourceKey]; // boolean
            const inputOpts = {
              name: resourceKey,
              type: 'checkbox',
              defaultValue: checked,
              disabled: true,
              defaultChecked: checked,
            };
            rowData.push( // create child button for subject
              <th scope='col' key={ key }>
                <input {...inputOpts} />
              </th>
            );
          }
        } else if (resourceKey === 'Actions') {
          {/* Disable editing subjects/samples/aspects in UI
          // conditionally show delete
          const addChildLink = <Link
            to={'/' + resource + '/new?parentAbsolutePath=' + results[i].absolutePath}>
            Add Child
          </Link>;
          const links = <span>{ parentAbsolutePath && addChildLink}{' '}{' '}{
            !results[i].childCount && <button
              className='slds-button'
              onClick={doDelete.bind(this, results[i].id)}
            >DELETE</button>
          }</span>;
           */}
          const links = <span></span>;
          rowData.push( // create child button for subject
            <th scope='col' key={ key }>{ links }</th>
          );
        } else if (!columnMetadata.customOutput) {
          rowData.push(
            <th scope='col' key={ key }>{ results[i][resourceKey] }</th>
          );
        } else {
          rowData.push(
            <th scope='col' key={ key }>{ ' ' }</th>
          );
        }
      }
      rowsArr.push(
        <tr
        className='slds-text-heading--label'
        key={ results[i].id }>
          {rowData}
        </tr>
      );
      // reset
      rowData = [];
    }
    return (
    <table
      className='slds-table slds-table--bordered slds-table--cell-buffer slds-no-row-hover'>
      <thead>
        <tr className='slds-text-heading--label'>
          { headersArr }
        </tr>
      </thead>
      <tbody>
        { rowsArr }
      </tbody>
    </table>
    );
  }
}

DataTable.propTypes = {
  resource: PropTypes.string.isRequired,
  doDelete: PropTypes.func,
  parentAbsolutePath: PropTypes.string,
  results: PropTypes.array.isRequired,
  columnMetadata: PropTypes.array.isRequired,
};

export default DataTable;
