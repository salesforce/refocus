/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */
'use strict';

module.exports = {
  up: function (qi, Sequelize) {
    return qi.sequelize.transaction(() => 
      qi.sequelize.query('UPDATE "Bots" SET "installedBy"='+
        '(SELECT id from "Users" WHERE email=\'admin@refocus.admin\');'
      )
    ).then(() =>
      qi.sequelize.query('UPDATE "RoomTypes" SET "createdBy"='+
        '(SELECT id from "Users" WHERE email=\'admin@refocus.admin\');'
      )
    ).then(() =>
      qi.sequelize.query('UPDATE "Rooms" SET "createdBy"='+
        '(SELECT id from "Users" WHERE email=\'admin@refocus.admin\');'
      )
    ).then(() =>
      qi.sequelize.query('UPDATE "BotData" SET "createdBy"='+
        '(SELECT id from "Users" WHERE email=\'admin@refocus.admin\');'
      )
    );
  },

  down: function (qi, Sequelize) {
    return qi.sequelize.transaction(() => 
      qi.sequelize.query('UPDATE "Bots" SET "installedBy"=NULL')
    ).then(() =>
      qi.sequelize.query('UPDATE "RoomTypes" SET "createdBy"=NULL')
    ).then(() =>
      qi.sequelize.query('UPDATE "Rooms" SET "createdBy"=NULL')
    ).then(() =>
      qi.sequelize.query('UPDATE "BotData" SET "createdBy"=NULL')
    );
  },
};
