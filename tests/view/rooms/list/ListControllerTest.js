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
import ReactDOM from 'react-dom';
import TestUtils from 'react-addons-test-utils';
import moment from 'moment';
import { expect } from 'chai';
import ListController from '../../../../view/rooms/components/ListController.js';


describe('tests/view/rooms/components/ListController.js, List of Rooms', () => {
  const numOfColumns = 6;

  it('no rooms in list', () => {
    const listComponent = TestUtils.renderIntoDocument(
      <ListController />
    );
    const renderedDOM = TestUtils.scryRenderedDOMComponentsWithTag(
      listComponent,
      'td'
    );
    expect(renderedDOM.length).to.equal(0);
  });

  it('2 rooms in list', () => {
    const rooms = [
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
    const roomTypes = [
      {
        id: 'ID1',
        name: 'RoomType',
      }
    ];
    const listComponent = TestUtils.renderIntoDocument(
      <ListController
        rooms={rooms}
        roomTypes={roomTypes}
      />
    );
    const renderedDOM = TestUtils.scryRenderedDOMComponentsWithTag(
      listComponent,
      'td'
    );
    const renderedDOM2 = TestUtils.findRenderedDOMComponentWithClass(
      listComponent,
      'slds-text-body_small'
    );
    expect((renderedDOM.length)/numOfColumns).to.equal(rooms.length);
    expect(renderedDOM2.textContent).to.contain(rooms.length);
  });
});
