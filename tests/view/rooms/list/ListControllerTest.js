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

 'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import ReactTestUtils from 'react-dom/test-utils';
import moment from 'moment';
import { expect } from 'chai';
import ListController from '../../../../view/rooms/list/ListController.js';

describe('tests/view/rooms/list/ListController.js, Configurable Parts of List View =>', () => {

  it('no table headers', () => {
    const listComponent = ReactTestUtils.renderIntoDocument(
      <ListController />
    );
    const renderedDOM = ReactTestUtils.scryRenderedDOMComponentsWithTag(
      listComponent,
      'th'
    );
    expect(renderedDOM.length).to.equal(0);
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
    expect(ReactTestUtils.isDOMComponent(renderedDOM[0])).to.be.true;
    expect(ReactTestUtils.isDOMComponent(renderedDOM[1])).to.be.true;
  });

  it('no table rows', () => {
    const listComponent = ReactTestUtils.renderIntoDocument(
      <ListController />
    );
    const renderedDOM = ReactTestUtils.scryRenderedDOMComponentsWithTag(
      listComponent,
      'td'
    );
    expect(renderedDOM.length).to.equal(0);
  });

  it('2 table rows', () => {
    const rows = [
      {
        id: '1',
        name: 'TestRoom',
        type: 'ID1',
        active: true,
        createdAt: moment(),
        updatedAt: moment(),
      },
      {
        id: '2',
        name: 'TestRoom2',
        type: 'ID1',
        active: true,
        createdAt: moment(),
        updatedAt: moment(),
      },
    ];

    const listComponent = ReactTestUtils.renderIntoDocument(
      <ListController
        tableRows={rows}
      />
    );
    const renderedDOM = ReactTestUtils.scryRenderedDOMComponentsWithTag(
      listComponent,
      'td'
    );
    const renderedDOM2 = ReactTestUtils.findRenderedDOMComponentWithClass(
      listComponent,
      'slds-text-body_small'
    );
    expect(renderedDOM.length).to.equal(rows.length);
    expect(renderedDOM2.textContent).to.contain(rows.length);
  });
});

// describe('tests/view/rooms/list/ListController.js, List of RoomTypes', () => {
//   const numOfColumns = 6;

//   it('no rooms types in list', () => {
//     const listComponent = TestUtils.renderIntoDocument(
//       <ListController />
//     );
//     const renderedDOM = TestUtils.scryRenderedDOMComponentsWithTag(
//       listComponent,
//       'td'
//     );
//     expect(renderedDOM.length).to.equal(0);
//   });

//   it('2 room types in list', () => {
//     const roomTypes = [
//       {
//         id: '1',
//         name: 'TestRoomType',
//         bots: ['bot1'],
//         isEnabled: true,
//         createdAt: moment(),
//         updatedAt: moment(),
//       },
//       {
//         id: '2',
//         name: 'TestRoomType2',
//         bots: ['bot1', 'bot2'],
//         isEnabled: true,
//         createdAt: moment(),
//         updatedAt: moment(),
//       },
//     ];

//     const listComponent = TestUtils.renderIntoDocument(
//       <ListController
//         roomTypes={ roomTypes }
//       />
//     );
//     const renderedDOM = TestUtils.scryRenderedDOMComponentsWithTag(
//       listComponent,
//       'td'
//     );
//     const renderedDOM2 = TestUtils.findRenderedDOMComponentWithClass(
//       listComponent,
//       'slds-text-body_small'
//     );
//     expect((renderedDOM.length) / numOfColumns).to.equal(roomTypes.length);
//     expect(renderedDOM2.textContent).to.contain(roomTypes.length);
//   });
// });
