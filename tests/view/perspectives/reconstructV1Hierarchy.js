/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/perspectives/reconstructV1Hierarchy.js
 */
const expect = require('chai').expect;
const utils = require('../../../view/perspective/utils');
const v1hierarchy = require('./v1hierarchy');
const v2hierarchy = require('./v2hierarchy');
const allAspects = require('./v2aspects');

describe('tests/view/perspectives/reconstructV1Hierarchy.js >', () => {
  it('hierarchy already had v1 shape', () => {
    const h = utils.reconstructV1Hierarchy(v1hierarchy, allAspects);
    expect(h).to.deep.equal(v1hierarchy);
  });

  it('reconstruct v1 hierarchy from v2 hierarchy', () => {
    const h = utils.reconstructV1Hierarchy(v2hierarchy, allAspects);
    expect(h).to.deep.equal(v1hierarchy);
  });

  it('aspect name case insensitivity', () => {
    const aspects = [
      {
        name: 'A1',
        timeout: '10m',
        id: '123-345',
      },
    ];
    const v2 = {
      absolutePath: 'a',
      children: [
        {
          absolutePath: 'a.b',
          samples: [
            {
              name: 'a.b|a1',
              value: '1',
            }
          ],
        },
        {
          absolutePath: 'a.c',
          samples: [
            {
              name: 'a.c|A1',
              value: '2',
            }
          ],
        },
      ],
    };

    const h = utils.reconstructV1Hierarchy(v2, aspects);
    expect(h).to.deep.equal({
      "absolutePath": "a",
      "children": [
        {
          "absolutePath": "a.b",
          "samples": [
            {
              "aspect": {
                "id": "123-345",
                "name": "A1",
                "timeout": "10m",
              },
              "aspectId": "123-345",
              "name": "a.b|a1",
              "value": "1",
            },
          ],
        },
        {
          "absolutePath": "a.c",
          "samples": [
            {
              "aspect": {
                "id": "123-345",
                "name": "A1",
                "timeout": "10m",
              },
              "aspectId": "123-345",
              "name": "a.c|A1",
              "value": "2",
            },
          ],
        },
      ],
    });
  });
});
