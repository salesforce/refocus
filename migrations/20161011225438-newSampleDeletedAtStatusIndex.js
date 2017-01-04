/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */
const TBL = 'Samples';

module.exports = {
  up(qi /* , Sequelize */) {
    return qi.sequelize.transaction(() => qi.addIndex(TBL,
      ['deletedAt', 'status'], { indexName: 'SampleStatusDeletedAt' }));
  },

  down(qi /* , Sequelize */) {
    return qi.sequelize.transaction(() =>
      qi.removeIndex(TBL, 'SampleStatusDeletedAt'));
  },
};
