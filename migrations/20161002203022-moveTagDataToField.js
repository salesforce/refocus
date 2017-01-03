/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */
'use strict';

module.exports = {
  up(qi /* , Sequelize */) {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return qi.createTable('users', { id: Sequelize.INTEGER });
    */
    return qi.sequelize.transaction(() => {
      const tagQry = 'SELECT * FROM "Tags" where "associatedModelName"=?';
      return qi.sequelize.query(tagQry, {
        replacements: ['Subject'],
        type: qi.sequelize.QueryTypes.SELECT,
      })
      .then((subjTags) => {
        const subjectUpdateQry =
          'UPDATE "Subjects" SET "tags" = "tags" || $1 where id = $2';
        subjTags.forEach((subjTag) => {
          const arr = [];
          arr.push(subjTag.name);
          qi.sequelize.query(subjectUpdateQry, {
            bind: [arr, subjTag.associationId],
            type: qi.sequelize.QueryTypes.UPDATE,
          });
        });
      })
      .then(() => { // done to remove duplicate tags
        const subjectUpdateQry =
          'UPDATE "Subjects" SET "tags" = $1 where id = $2';
        return qi.sequelize.query('SELECT * FROM "Subjects"', {
          type: qi.sequelize.QueryTypes.SELECT,
        })
        .then((subjs) => subjs.forEach((subj) => {
          const uniqueTags = new Set(subj.tags);
          const arr = Array.from(uniqueTags);
          return qi.sequelize.query(subjectUpdateQry, {
            bind: [arr, subj.id],
            type: qi.sequelize.QueryTypes.UPDATE,
          });
        }));
      })
      .then(() => {
        const tagAssocQry =
          'SELECT * FROM "Tags" where "associatedModelName"=?';
        return qi.sequelize.query(tagAssocQry, {
          replacements: ['Aspect'],
          type: qi.sequelize.QueryTypes.SELECT,
        })
        .then((aspTags) => {
          const aspectUpdateQry =
            'UPDATE "Aspects" SET "tags" = "tags" || $1 where id = $2';
          aspTags.forEach((aspTag) => {
            const arr = [];
            arr.push(aspTag.name);
            return qi.sequelize.query(aspectUpdateQry, {
              bind: [arr, aspTag.associationId],
              type: qi.sequelize.QueryTypes.UPDATE,
            });
          });
        });
      })
      .then(() => qi.sequelize // remove duplicate tags
        .query('SELECT * FROM "Aspects"',
         { type: qi.sequelize.QueryTypes.SELECT })
        .then((subjs) => subjs.forEach((subj) => {
          const aspectUpdateQry =
            'UPDATE "Aspects" SET "tags" = $1 where id = $2';
          const uniqueTags = new Set(subj.tags);
          const arr = Array.from(uniqueTags);
          return qi.sequelize.query(aspectUpdateQry, {
            bind: [arr, subj.id],
            type: qi.sequelize.QueryTypes.UPDATE,
          });
        }))
      );
    });
  },

  down(qi /* , Sequelize */) {
    // /*
    //   Add reverting commands here.
    //   Return a promise to correctly handle asynchronicity.

    //   Example:
    //   return qi.dropTable('users');
    // */
    return qi.sequelize.transaction(() => {
      const arr = [];
      return qi.sequelize.query('UPDATE "Subjects" SET "tags" = $1', {
        bind: [arr],
        type: qi.sequelize.QueryTypes.UPDATE,
      })
      .then(() => qi.sequelize.query('UPDATE "Aspects" SET "tags" = $1', {
        bind: [arr],
        type: qi.sequelize.QueryTypes.UPDATE,
      }));
    });
  },
};
