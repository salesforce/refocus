/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction((t) => {
      return queryInterface.addIndex(
        'Subjects',
        [
          Sequelize.fn('lower', Sequelize.col('absolutePath')),
          'deletedAt',
          'isPublished',
        ],
        {
          indexName: 'SubjectAbsolutePathDeletedAtIsPublished',
        }
      );
    });
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction((t) => {
      return queryInterface.removeIndex('Subjects',
        'SubjectAbsolutePathDeletedAtIsPublished');
    });
  }
};
