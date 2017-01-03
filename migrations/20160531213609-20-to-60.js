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
    return qi.changeColumn('Subjects', 'name', {
      type: Sequelize.STRING(60),
      allowNull: false,
      validate: {
        is: /^[0-9a-z_-]+$/i,
      },
    })
    .then(() => qi.changeColumn('Aspects', 'name', {
      type: Sequelize.STRING(60),
      allowNull: false,
      validate: {
        is: /^[0-9a-z_-]+$/i,
      },
    }))
    .then(() => qi.changeColumn('Tags', 'name', {
      type: Sequelize.STRING(60),
      allowNull: false,
      validate: {
        is: /^[0-9a-z_-]+$/i,
      },
    }));
  },

  down(qi, Sequelize) {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return qi.dropTable('users');
    */
    return qi.changeColumn('Subjects', 'name', {
      type: Sequelize.STRING(20),
      allowNull: false,
      validate: {
        is: /^[0-9a-z_-]+$/i,
      },
    })
    .then(() => qi.changeColumn('Aspects', 'name', {
      type: Sequelize.STRING(20),
      allowNull: false,
      validate: {
        is: /^[0-9a-z_-]+$/i,
      },
    }))
    .then(() => qi.changeColumn('Tags', 'name', {
      type: Sequelize.STRING(20),
      allowNull: false,
      validate: {
        is: /^[0-9a-z_-]+$/i,
      },
    }));
  },
};
