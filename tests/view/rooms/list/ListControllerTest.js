/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/rooms/list/ListController.js
 */

import React from 'react';
import ReactTestUtils from 'react-dom/test-utils';
import moment from 'moment';
import { expect } from 'chai';
import ListController from '../../../../view/rooms/list/ListController.js';

const ZERO = 0;
const ONE = 1;

describe('tests/view/rooms/list/ListController.js, List View =>', () => {
  it('no table headers', () => {
    const listComponent = ReactTestUtils.renderIntoDocument(
      <ListController />
    );
    const renderedDOM = ReactTestUtils.scryRenderedDOMComponentsWithTag(
      listComponent,
      'th'
    );
    expect(renderedDOM.length).to.equal(ZERO);
  });

  it('2 table headers', () => {
    const headers = ['id', 'name'];
    const listComponent = ReactTestUtils.renderIntoDocument(
      <ListController tableHeaders={ headers } />
    );
    const renderedDOM = ReactTestUtils.scryRenderedDOMComponentsWithTag(
      listComponent,
      'th'
    );
    expect(renderedDOM.length).to.equal(headers.length);
    expect(ReactTestUtils.isDOMComponent(renderedDOM[ZERO])).to.be.true;
    expect(ReactTestUtils.isDOMComponent(renderedDOM[ONE])).to.be.true;
  });

  it('no table rows', () => {
    const listComponent = ReactTestUtils.renderIntoDocument(
      <ListController />
    );
    const renderedDOM = ReactTestUtils.scryRenderedDOMComponentsWithTag(
      listComponent,
      'td'
    );
    expect(renderedDOM.length).to.equal(ZERO);
  });

  it('2 table rows', () => {
    const headers = ['ID', 'Name', 'Type', 'Active',
      'Created At', 'Updated At'];
    const rows = [
      {
        id: '1',
        name: 'TestRoom',
        type: 'ID1',
        active: 'true',
        createdAt: moment().format(),
        updatedAt: moment().format(),
      },
      {
        id: '2',
        name: 'TestRoom2',
        type: 'ID1',
        active: 'true',
        createdAt: moment().format(),
        updatedAt: moment().format(),
      },
    ];

    const listComponent = ReactTestUtils.renderIntoDocument(
      <ListController
        tableHeaders={headers}
        tableRows={rows}
      />
    );
    const renderedDOM = ReactTestUtils.scryRenderedDOMComponentsWithTag(
      listComponent,
      'td'
    );
    expect(renderedDOM.length).to.equal(rows.length * headers.length);
  });
});
