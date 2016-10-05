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
    return queryInterface.sequelize.transaction((t) => {
      return queryInterface.sequelize.query('SELECT * FROM "Tags" where "associatedModelName"=?',
       { replacements: ['Subject'], type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then((subjTags) => {
          subjTags.forEach((subjTag) => {
            const a = [subjTag.name];
            queryInterface.sequelize.query('UPDATE "Subjects" SET "tags" = tags || $1 where id = $2',
              { bind: [a, subjTag.associationId], type: queryInterface.sequelize.QueryTypes.UPDATE });
          });
        }).then(() => {
          return queryInterface.sequelize.query('SELECT * FROM "Tags" where "associatedModelName"=?',
           { replacements: ['Aspect'], type: queryInterface.sequelize.QueryTypes.SELECT }
            ).then((subjTags) => {
              subjTags.forEach((subjTag) => {
                const arr = [subjTag.name];
                return queryInterface.sequelize.query('UPDATE "Aspects" SET "tags" = tags || $1 where id = $2',
                  { bind: [arr, subjTag.associationId], type: queryInterface.sequelize.QueryTypes.UPDATE });
              });
            });
        });
    });
  },
  down: function (queryInterface, Sequelize) {
    // /*
    //   Add reverting commands here.
    //   Return a promise to correctly handle asynchronicity.

    //   Example:
    //   return queryInterface.dropTable('users');
    // */
    return queryInterface.sequelize.transaction((t) => {
      const arr = [];
      return queryInterface.sequelize.query('UPDATE "Subjects" SET "tags" = $1',
        { bind: [arr], type: queryInterface.sequelize.QueryTypes.UPDATE
        }).then(() => {
          return queryInterface.sequelize.query('UPDATE "Aspects" SET "tags" = $1',
          { bind: [arr], type: queryInterface.sequelize.QueryTypes.UPDATE
          });
        });
    });
  },
};
