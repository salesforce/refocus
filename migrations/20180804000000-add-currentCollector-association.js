'use strict';

/**
 * This migration is to change the Generator model. We now have the
 * Generator's currentCollector represented by an association, instead
 * of a string on the model. Under the hood, we need to add a foreign key
 * to the Generator model (collectorId), which references the id of the
 * Collector in the Collectors table that this Generator is assigned to.
 */

module.exports = {
  up: (qi, Sequelize) =>

    // add collectorId column to store foreign key
    qi.addColumn(
      'Generators',
      'collectorId',
      {
        type: Sequelize.UUID,
        allowNull: true,
      }
    )
    .then(() => {
      // find all generators that have a currentCollector
      const gensWithCurrentColl = 'SELECT * FROM "Generators" where "currentCollector" IS NOT NULL';
      return qi.sequelize.query(gensWithCurrentColl, {
        type: qi.sequelize.QueryTypes.SELECT,
      });
    })
    .then((generators) => {
      // get currentCollector object for each generator
      const updateGeneratorPromises = [];
      generators.forEach((gen) => {
        const genId = gen.id;
        const currCollName = gen.currentCollector;
        const collectors = 'SELECT * FROM "Collectors" where "name"=?';

        updateGeneratorPromises.push(
          qi.sequelize.query(collectors, {
            replacements: [currCollName],
            type: qi.sequelize.QueryTypes.SELECT,
          })
          .then((coll) => {
            // set the generator's 'collectorId' field to the id of the
            // currentCollector that it was assigned to
            const updateGen = 'UPDATE "Generators" SET "collectorId"=$1 WHERE "id"=$2';
            const collectorId = coll[0].id;
            qi.sequelize.query(updateGen, {
              bind: [collectorId, genId],
              type: qi.sequelize.QueryTypes.UPDATE,
            });
          })
        );
      });
      return Promise.all(updateGeneratorPromises);
    })
    .then(() => qi.removeColumn('Generators', 'currentCollector')),

  down: (qi, Sequelize) =>

    // add currentCollector column to store name
    qi.addColumn(
      'Generators',
      'currentCollector',
      {
        type: Sequelize.STRING(60), // length 60
        allowNull: true,
      }
    )
    .then(() => {
      // find all generators that have a currentCollector
      const gensWithCurrentColl = 'SELECT * FROM "Generators" where "collectorId" IS NOT NULL';
      return qi.sequelize.query(gensWithCurrentColl, {
        type: qi.sequelize.QueryTypes.SELECT,
      });
    })
    .then((generators) => {
      // get currentCollector object for each generator
      const updateGeneratorPromises = [];
      generators.forEach((gen) => {
        const genId = gen.id;
        const currCollId = gen.collectorId;
        const collectors = 'SELECT * FROM "Collectors" where "id"=?';

        updateGeneratorPromises.push(
          qi.sequelize.query(collectors, {
            replacements: [currCollId],
            type: qi.sequelize.QueryTypes.SELECT,
          })
          .then((coll) => {
            // set the generator's 'currentCollector' field to the id of the
            // collector that it was assigned to
            const updateGen = 'UPDATE "Generators" SET "currentCollector"=$1 WHERE "id"=$2';
            const collectorName = coll[0].name;
            qi.sequelize.query(updateGen, {
              bind: [collectorName, genId],
              type: qi.sequelize.QueryTypes.UPDATE,
            });
          })
        );
      });
      return Promise.all(updateGeneratorPromises);
    })
    .then(() => qi.removeColumn('Generators', 'collectorId')),
};
