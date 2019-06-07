/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */
'use strict';

module.exports = {
  up: (qi, Seq) => qi.addColumn('Lenses', 'lensEventApiVersion', {
    type: Seq.INTEGER,
    allowNull: false,
    defaultValue: 1,
  }),
  down: (qi, Seq) => qi.removeColumn('Lenses', 'lensEventApiVersion'),
};
tests/api/v1/lenses/get.js
