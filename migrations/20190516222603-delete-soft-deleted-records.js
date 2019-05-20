/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * migrations/20190516222603-delete-soft-deleted-records.js
 *
 * This database migration permanently deletes all the soft-deleted records
 * from tables which had "paranoid" set to true. We do the deletes in small
 * batches so we don't risk too many locks or timeouts during the migration.
 *
 * (I'm mostly concerned about slowness in the Subjects table, since every
 * delete in that table also cascades to changes in the xref table maintained
 * by the sequelize-hierarchy module.)
 *
 * Note that the "down" function is a no-op -- we do not attempt to add the
 * soft-deleted records back in the event of migration failure.
 */
'use strict';
const Promise = require('bluebird');
const db = require('../db/index');
const LIM = 100;
const models = [
  db.Aspect,
  db.AuditEvent,
  db.Collector,
  db.CollectorGroup,
  db.Generator,
  db.GeneratorTemplate,
  db.GlobalConfig,
  db.Lens,
  db.Perspective,
  db.Profile,
  db.SSOConfig,
  db.Subject,
  db.Token,
  db.User,
];

function findAndDestroyModel(model) {
  const where = { isDeleted: { [db.Sequelize.Op.gt]: 0 } };
  const destroyOpts = {
    where,
    limit: LIM,
    force: true,
  };

  return model.scope(null)
    .count({ where })
    .then((ct) =>
      console.log(`[${model}] Found ${ct} soft-deleted records`))
    .then((ct) => Array.apply(null, { length: 1 + Math.ceil(ct / LIM) })
      .map(Number.call, Number))
    .then((arr) => {
      console.log(`[${model}] Need ${arr.length} "destroy..." iterations`);
      const destroySome = (i) => {
        console.log(`[${model}] destroySome(${i})`);
        return model.destroy(destroyOpts)
          .then((destroyed) =>
            console.log(`[${model}] Destroyed ${destroyed}`));
      };
      return arr.reduce((previousPromise, iterationNumber) => {
        console.log(`[${model}] In reduce iteration #${iterationNumber}`);
        return previousPromise.then(() => destroySome(iterationNumber));
      }, Promise.resolve(true));
    })
    .catch(console.error);
} // findAndDestroyModel

function findAndDestroy() {
  return Promise.all(models.map((m) => findAndDestroyModel(m)));
} // findAndDestroy

module.exports = {
  up: findAndDestroy,
  down: Promise.resolve,
};
