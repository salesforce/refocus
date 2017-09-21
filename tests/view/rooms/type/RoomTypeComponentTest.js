/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/rooms/types/RoomTypeComponentTest.js
 */

import React from 'react';
import ReactTestUtils from 'react-dom/test-utils';
import moment from 'moment';
import { expect } from 'chai';
import RoomTypeComponent from '../../../../view/rooms/type/RoomTypeComponent.js';

const ZERO = 0;
const ONE = 1;
const FIVE = 5;

describe('tests/view/rooms/type/RoomTypeComponentTest.js, Rendering =>', () => {
  it('no room type', () => {
    const roomTypeComponent = ReactTestUtils.renderIntoDocument(
      <RoomTypeComponent />
    );
    const renderedDOM = ReactTestUtils.scryRenderedDOMComponentsWithTag(
      roomTypeComponent,
      'li'
    );
    expect(renderedDOM.length).to.equal(ZERO);
  });

  it('simple Room Type', () => {
    const roomType = {
      id: '123',
      name: 'exampleRoomType',
      isEnabled: true,
      bots: ['bot1', 'bot2'],
      createdAt: moment(),
      updatedAt: moment(),
    };
    const roomTypeComponent = ReactTestUtils.renderIntoDocument(
      <RoomTypeComponent roomType={ roomType } />
    );
    const renderedDOM = ReactTestUtils.scryRenderedDOMComponentsWithTag(
      roomTypeComponent,
      'li'
    );
    expect(renderedDOM.length).to.equal(FIVE);
  });
});
