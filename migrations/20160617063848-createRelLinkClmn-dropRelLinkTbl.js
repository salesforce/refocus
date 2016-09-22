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
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.createTable('users', { id: Sequelize.INTEGER });
    */
    return queryInterface.addColumn(
      'Subjects',
      'relatedLinks',
      {
        type: Sequelize.ARRAY(Sequelize.JSON),
        allowNull: true,
        defaultValue: [],
      }
    )
    .then(() => {
      return queryInterface.addColumn(
        'Aspects',
        'relatedLinks',
        {
          type: Sequelize.ARRAY(Sequelize.JSON),
          allowNull: true,
          defaultValue: [],
        }
      );
    })
    .then(() => {
      return queryInterface.addColumn(
        'Samples',
        'relatedLinks',
        {
          type: Sequelize.ARRAY(Sequelize.JSON),
          allowNull: true,
          defaultValue: [],
        }
      );
    })
    .then(() => {
      return queryInterface.dropTable(
        'RelatedLinks'
      );
    });
  },
  down: function (queryInterface, Sequelize) {
    // /*
    //   Add reverting commands here.
    //   Return a promise to correctly handle asynchronicity.

    //   Example:
    //   return queryInterface.dropTable('users');
    // */
    return queryInterface.removeColumn(
      'Subjects',
      'relatedLinks'
    )
    .then(() => {
      return queryInterface.removeColumn(
        'Aspects',
        'relatedLinks'
      );
    })
    .then(() => {
      return queryInterface.removeColumn(
        'Samples',
        'relatedLinks'
      );
    })
    .then(() => {
      return queryInterface.createTable(
        'RelatedLinks',
        {
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
        }
      );
    })
    .then(() => queryInterface.addIndex(
      'RelatedLinks',
      ['name', 'isDeleted', 'associationId'],
      {
        indicesType: 'UNIQUE',
      }
    ));
  },
};
