/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */
'use strict';

module.exports = {
  up(qi, Sequelize) {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return qi.createTable('users', { id: Sequelize.INTEGER });
    */
    return qi.addColumn('Subjects', 'relatedLinks', {
      type: Sequelize.ARRAY(Sequelize.JSON),
      allowNull: true,
      defaultValue: [],
    })
    .then(() => qi.addColumn('Aspects', 'relatedLinks', {
      type: Sequelize.ARRAY(Sequelize.JSON),
      allowNull: true,
      defaultValue: [],
    }))
    .then(() => qi.addColumn('Samples', 'relatedLinks', {
      type: Sequelize.ARRAY(Sequelize.JSON),
      allowNull: true,
      defaultValue: [],
    }))
    .then(() => qi.dropTable('RelatedLinks'));
  },

  down(qi, Sequelize) {
    // /*
    //   Add reverting commands here.
    //   Return a promise to correctly handle asynchronicity.

    //   Example:
    //   return qi.dropTable('users');
    // */
    return qi.removeColumn('Subjects', 'relatedLinks')
    .then(() => qi.removeColumn('Aspects', 'relatedLinks'))
    .then(() => qi.removeColumn('Samples', 'relatedLinks'))
    .then(() => qi.createTable('RelatedLinks', {
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
      url: {
        type: Sequelize.STRING(4096),
      },
    }))
    .then(() => qi.addIndex('RelatedLinks',
      ['name', 'isDeleted', 'associationId'], { indicesType: 'UNIQUE' }));
  },
};
