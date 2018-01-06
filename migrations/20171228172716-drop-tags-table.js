/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */
'use strict';
module.exports = {
  up(qi) {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return qi.createTable('users', { id: Sequelize.INTEGER });
    */
    return qi.sequelize.transaction(() => qi.dropTable('Tags'));
  },

  down(qi, Sequelize) { // no-op
    // /*
    //   Add reverting commands here.
    //   Return a promise to correctly handle asynchronicity.

    //   Example:
    //   return qi.dropTable('users');
    // */
    return qi.sequelize.transaction(() => qi.createTable('Tags', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      isDeleted: {
        type: Sequelize.BIGINT,
        defaultValue: 0,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: 'nameAndAssociationId',
      },
      associatedModelName: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Name of the associated model.',
      },
      associationId: {
        type: Sequelize.UUID,
        allowNull: false,
        comment: 'Foriegn Key for the model',
        unique: 'nameAndAssociationId',
      },
    }))
    .then(() => qi.addIndex('Tags',
      ['name', 'isDeleted', 'associationId'], { indicesType: 'UNIQUE' }));
  },
};
