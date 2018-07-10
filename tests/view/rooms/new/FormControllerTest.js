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

const _ = require('lodash');
import { expect } from 'chai';
import FormController from '../../../../view/rooms/new/FormController.js';
const app = require('../../../../view/rooms/new/app.js')();

describe('tests/view/rooms/new/FormController.js, Create Room =>', () => {
  const originalDateNowFunction = Date.now;
  const STAR_WAR_RELEASE_DATE = 259800699;

  before(() => {
    Date.now = () => STAR_WAR_RELEASE_DATE;
  });

  after(() => {
    Date.now = originalDateNowFunction;
  });

  it('Fail, No parameters', () => {
    const params = app.getPathVariables('http://refocus/rooms/new/');
    const output = {
      name: '',
      roomType: '',
      active: true,
      externalId: null,
      settings: {},
      bots: [],
    };
    expect(_.isEqual(params, output)).to.equal(true);
  });

  it('Ok, Get name from parameters', () => {
    const params = app.getPathVariables('http://refocus/rooms/new/?name=test');
    const output = {
      name: 'test',
      roomType: '',
      active: true,
      externalId: null,
      settings: {},
      bots: [],
    };
    expect(_.isEqual(params, output)).to.equal(true);
  });

  it('Ok, Get name from path', () => {
    const params = app.getPathVariables(
      'http://refocus/rooms/new/test/?name=test1'
    );
    const output = {
      name: 'test',
      roomType: '',
      active: true,
      externalId: null,
      settings: {},
      bots: [],
    };
    expect(_.isEqual(params, output)).to.equal(true);
  });

  it('Ok, Get type from parameters', () => {
    const params = app.getPathVariables('http://refocus/rooms/new/?' +
      'roomType=roomTypeId');
    const output = {
      name: '',
      roomType: 'roomTypeId',
      active: true,
      externalId: null,
      settings: {},
      bots: [],
    };
    expect(_.isEqual(params, output)).to.equal(true);
  });

  it('Ok, Get active from parameters', () => {
    const params = app.getPathVariables('http://refocus/rooms/new/?' +
      'active=false');
    const output = {
      name: '',
      roomType: '',
      active: false,
      externalId: null,
      settings: {},
      bots: [],
    };
    expect(_.isEqual(params, output)).to.equal(true);
  });

  it('Ok, Get externalId from parameters', () => {
    const params = app.getPathVariables('http://refocus/rooms/new/?' +
      'externalId=00000');
    const output = {
      name: '',
      roomType: '',
      active: true,
      externalId: '00000',
      settings: {},
      bots: [],
    };
    expect(_.isEqual(params, output)).to.equal(true);
  });

  it('Ok, Get settings from parameters', () => {
    const params = app.getPathVariables('http://refocus/rooms/new/?' +
      'settings={"test":"test"}');
    const output = {
      name: '',
      roomType: '',
      active: true,
      externalId: null,
      settings: { test: 'test' },
      bots: [],
    };
    expect(_.isEqual(params, output)).to.equal(true);
  });

  it('Fail, Get settings from parameters', () => {
    const params = app.getPathVariables('http://refocus/rooms/new/?' +
      'settings={test:"test"}');
    const output = {
      name: '',
      roomType: '',
      active: true,
      externalId: null,
      settings: {},
      bots: [],
    };
    expect(_.isEqual(params, output)).to.equal(true);
  });

  it('Ok, Get bots from parameters', () => {
    const params = app.getPathVariables('http://refocus/rooms/new/?' +
      'bots=Bot1,Bot2');
    const output = {
      name: '',
      roomType: '',
      active: true,
      externalId: null,
      settings: {},
      bots: ['Bot1', 'Bot2'],
    };
    expect(_.isEqual(params, output)).to.equal(true);
  });

  it('Form Controller Name', () => {
    const parameters = app.getPathVariables('http://refocus/rooms/new/?' +
      'name=name');
    const form = ReactTestUtils.renderIntoDocument(
      <FormController
        name={parameters.name}
        type={parameters.type}
        active={parameters.active}
        externalId={parameters.externalId}
        settings={parameters.settings}
        bots={parameters.bots}
      />
    );

    const renderedDOM = ReactTestUtils.scryRenderedDOMComponentsWithTag(
      form,
      'input'
    );

    renderedDOM.forEach((dom) => {
      if (dom.id === 'nameInput') {
        expect(dom.value).to.equal(parameters.name);
      }
    });
  });

  it('Form Controller Active', () => {
    const paramaters = app.getPathVariables('http://refocus/rooms/new/?' +
      'active=true');
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
      if (dom.id === 'activeInput') {
        expect(dom.checked).to.equal(true);
      }
    });
  });

  it('Form Controller Inactive', () => {
    const paramaters = app.getPathVariables('http://refocus/rooms/new/?' +
      'active=false');
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
      if (dom.id === 'inactiveInput') {
        expect(dom.checked).to.equal(true);
      }
    });
  });

  it('Form Controller externalId', () => {
    const paramaters = app.getPathVariables('http://refocus/rooms/new/?' +
      'externalId=00000');
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
      if (dom.id === 'externalIdInput') {
        expect(dom.value).to.equal(paramaters.externalId);
      }
    });
  });

  it('Form Controller Bots', () => {
    const paramaters = app.getPathVariables('http://refocus/rooms/new/?' +
      'bots=bot1,bot2');
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
      if (dom.id === 'botsInput') {
        expect(_.isEqual(dom.value.split(','), paramaters.bots)).to.equal(true);
      }
    });
  });

  it('Form Controller Settings', () => {
    const paramaters = app.getPathVariables('http://refocus/rooms/new/?' +
      'settings={test:"test"}');
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
      if (dom.id === 'botsInput') {
        expect(_.isEqual(dom.value, paramaters.settings)).to.equal(true);
      }
    });
  });

  it('Must create a default name when empty name and autoNaming=true',
    () => {
      const params = app.getPathVariables('http://refocus/rooms/new/?' +
            'autoNaming=true');
      expect(params.name).to.contain('AUTO_GENERATED_259800699');
    });

  it('Must NOT create a default name when there is name and autoNaming=true',
      () => {
        const params = app.getPathVariables('http://refocus/rooms/new/' +
            'FOO_BAR?autoNaming=true');
        expect(params.name).to.contain('FOO_BAR_259800699');
      });

  it('Must NOT create a default name when there is path name, autoNaming=true',
    () => {
      const params = app.getPathVariables('http://refocus/rooms/new/?' +
          'name=FOO_BAR&autoNaming=true');
      expect(params.name).to.contain('FOO_BAR_259800699');
    });

  it('Must NOT create a default name when there is name and autoNaming=false',
      () => {
        const params = app.getPathVariables('http://refocus/rooms/new/?' +
              'name=FOO_BAR&autoNaming=false');
        expect(params.name).to.contain('FOO_BAR');
      });

  it('Must NOT create a default name when auto naming is false', () => {
    const params = app.getPathVariables('http://refocus/rooms/new/?' +
            'autoNaming=false');
    expect(params.name).to.be.empty;
  });

  it('Must not create a default name when auto naming is not set', () => {
    const params = app.getPathVariables('http://refocus/rooms/new/');
    expect(params.name).to.be.empty;
  });

  it('Must not create a default name when autoNaming is invalid', () => {
    const params = app.getPathVariables('http://refocus/rooms/new/?' +
        'autoNaming=blah');
    expect(params.name).to.be.empty;
  });
});
