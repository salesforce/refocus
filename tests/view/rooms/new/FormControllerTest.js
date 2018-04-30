/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/rooms/new/FormControllerTest.js
 */

import React from 'react';
import ReactTestUtils from 'react-dom/test-utils';
import moment from 'moment';
const _ = require('lodash');
import { expect } from 'chai';
import FormController from '../../../../view/rooms/new/FormController.js';
const app = require('../../../../view/rooms/new/app.js')();

const ZERO = 0;
const ONE = 1;

describe('tests/view/rooms/new/FormController.js, Create Room =>', () => {
  it('Fail, No parameters', () => {
    const params = app.getPathVariables('http://refocus/rooms/new/');
    const output = {
      name: '',
      type: '',
      active: true,
      externalId: '',
      settings: {},
      bots: []
    }
    expect(_.isEqual(params, output)).to.equal(true);
  });

  it('Ok, Get name from parameters', () => {
    const params = app.getPathVariables('http://refocus/rooms/new/?name=test');
    const output = {
      name: 'test',
      type: '',
      active: true,
      externalId: '',
      settings: {},
      bots: []
    }
    expect(_.isEqual(params, output)).to.equal(true);
  });

  it('Ok, Get name from path', () => {
    const params = app.getPathVariables('http://refocus/rooms/new/test/?name=test1');
    const output = {
      name: 'test',
      type: '',
      active: true,
      externalId: '',
      settings: {},
      bots: []
    }
    expect(_.isEqual(params, output)).to.equal(true);
  });

  it('Ok, Get type from parameters', () => {
    const params = app.getPathVariables('http://refocus/rooms/new/?roomType=roomTypeId');
    const output = {
      name: '',
      type: 'roomTypeId',
      active: true,
      externalId: '',
      settings: {},
      bots: []
    }
    expect(_.isEqual(params, output)).to.equal(true);
  });

   it('Ok, Get active from parameters', () => {
    const params = app.getPathVariables('http://refocus/rooms/new/?active=false');
    const output = {
      name: '',
      type: '',
      active: false,
      externalId: '',
      settings: {},
      bots: []
    }
    expect(_.isEqual(params, output)).to.equal(true);
  });

   it('Ok, Get externalId from parameters', () => {
    const params = app.getPathVariables('http://refocus/rooms/new/?externalId=00000');
    const output = {
      name: '',
      type: '',
      active: true,
      externalId: '00000',
      settings: {},
      bots: []
    }
    expect(_.isEqual(params, output)).to.equal(true);
  });

  it('Ok, Get settings from parameters', () => {
    const params = app.getPathVariables('http://refocus/rooms/new/?settings={"test":"test"}');
    const output = {
      name: '',
      type: '',
      active: true,
      externalId: '',
      settings: { "test":"test" },
      bots: []
    }
    expect(_.isEqual(params, output)).to.equal(true);
  });

  it('Fail, Get settings from parameters', () => {
    const params = app.getPathVariables('http://refocus/rooms/new/?settings={test:"test"}');
    const output = {
      name: '',
      type: '',
      active: true,
      externalId: '',
      settings: {},
      bots: []
    }
    expect(_.isEqual(params, output)).to.equal(true);
  });

  it('Ok, Get bots from parameters', () => {
    const params = app.getPathVariables('http://refocus/rooms/new/?bots=Bot1,Bot2');
    const output = {
      name: '',
      type: '',
      active: true,
      externalId: '',
      settings: {},
      bots: ['Bot1', 'Bot2']
    }
    expect(_.isEqual(params, output)).to.equal(true);
  });

  it('Form Controller Name', () => {
    const paramaters = app.getPathVariables('http://refocus/rooms/new/?name=name');
    const form = ReactTestUtils.renderIntoDocument(
      <FormController
        name={paramaters.name}
        type={paramaters.type}
        active={paramaters.active}
        externalId={paramaters.externalId}
        settings={paramaters.settings}
        bots={paramaters.bots}
      />
    );

    const renderedDOM = ReactTestUtils.scryRenderedDOMComponentsWithTag(
      form,
      'input'
    );

    renderedDOM.forEach((dom) => {
      if(dom.id === 'nameInput'){
        expect(dom.value).to.equal(paramaters.name);
      }
    });
  });

  it('Form Controller Active', () => {
    const paramaters = app.getPathVariables('http://refocus/rooms/new/?active=true');
    const form = ReactTestUtils.renderIntoDocument(
      <FormController
        name={paramaters.name}
        type={paramaters.type}
        active={paramaters.active}
        externalId={paramaters.externalId}
        settings={paramaters.settings}
        bots={paramaters.bots}
      />
    );

    const renderedDOM = ReactTestUtils.scryRenderedDOMComponentsWithTag(
      form,
      'input'
    );

    renderedDOM.forEach((dom) => {
      if(dom.id === 'activeInput'){
        expect(dom.checked).to.equal(true);
      }
    });
  });

  it('Form Controller Inactive', () => {
    const paramaters = app.getPathVariables('http://refocus/rooms/new/?active=false');
    const form = ReactTestUtils.renderIntoDocument(
      <FormController
        name={paramaters.name}
        type={paramaters.type}
        active={paramaters.active}
        externalId={paramaters.externalId}
        settings={paramaters.settings}
        bots={paramaters.bots}
      />
    );

    const renderedDOM = ReactTestUtils.scryRenderedDOMComponentsWithTag(
      form,
      'input'
    );

    renderedDOM.forEach((dom) => {
      if(dom.id === 'inactiveInput'){
        expect(dom.checked).to.equal(true);
      }
    });
  });

  it('Form Controller externalId', () => {
    const paramaters = app.getPathVariables('http://refocus/rooms/new/?externalId=00000');
    const form = ReactTestUtils.renderIntoDocument(
      <FormController
        name={paramaters.name}
        type={paramaters.type}
        active={paramaters.active}
        externalId={paramaters.externalId}
        settings={paramaters.settings}
        bots={paramaters.bots}
      />
    );

    const renderedDOM = ReactTestUtils.scryRenderedDOMComponentsWithTag(
      form,
      'input'
    );

    renderedDOM.forEach((dom) => {
      if(dom.id === 'externalIdInput'){
        expect(dom.value).to.equal(paramaters.externalId);
      }
    });
  });

  it('Form Controller Bots', () => {
    const paramaters = app.getPathVariables('http://refocus/rooms/new/?bots=bot1,bot2');
    const form = ReactTestUtils.renderIntoDocument(
      <FormController
        name={paramaters.name}
        type={paramaters.type}
        active={paramaters.active}
        externalId={paramaters.externalId}
        settings={paramaters.settings}
        bots={paramaters.bots}
      />
    );

    const renderedDOM = ReactTestUtils.scryRenderedDOMComponentsWithTag(
      form,
      'input'
    );

    renderedDOM.forEach((dom) => {
      if(dom.id === 'botsInput'){
        expect(_.isEqual(dom.value.split(','),paramaters.bots)).to.equal(true);
      }
    });
  });

  it('Form Controller Settings', () => {
    const paramaters = app.getPathVariables('http://refocus/rooms/new/?settings={test:"test"}');
    const form = ReactTestUtils.renderIntoDocument(
      <FormController
        name={paramaters.name}
        type={paramaters.type}
        active={paramaters.active}
        externalId={paramaters.externalId}
        settings={paramaters.settings}
        bots={paramaters.bots}
      />
    );

    const renderedDOM = ReactTestUtils.scryRenderedDOMComponentsWithTag(
      form,
      'textarea'
    );

    renderedDOM.forEach((dom) => {
      if(dom.id === 'botsInput'){
        expect(_.isEqual(dom.value,paramaters.settings)).to.equal(true);
      }
    });
  });
});
