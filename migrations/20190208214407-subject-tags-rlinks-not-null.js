'use strict';
const Subject = require('../db/index').Subject;
const constants = require('../db/constants');
const TBL = 'Subjects';

module.exports = {
  up: (qi, Sequelize) =>
    /* Get subjects with tags = null, update to [],
     * Get subjects with rlinks = null, update to [],
     * Update tags column to set allowNull: false,
     * update relatedLinks column to set allowNull: false */
    qi.sequelize.transaction(() => {
      const promisesArr = [];
      const subjTagQuery = 'SELECT * from "Subjects" where "tags" IS NULL';

      // get subjects with null tags
      return qi.sequelize.query(subjTagQuery, {
        type: qi.sequelize.QueryTypes.SELECT,
      }).then((subjects) => {
        subjects.forEach((subj) => {
          // update tags to empty array;
          promisesArr.push(Subject.update(
            { tags: [] }, { where: { id: subj.id } }
          ));
        });

        // get subjects with null relatedLinks
        const subjRlinksQuery =
          'SELECT * from "Subjects" where "relatedLinks" IS NULL';
        return qi.sequelize.query(subjRlinksQuery, {
          type: qi.sequelize.QueryTypes.SELECT,
        });
      })
      .then((subjects) => {
        subjects.forEach((subj) => {
          // update relatedLinks to empty array;
          promisesArr.push(Subject.update(
            { relatedLinks: [] }, { where: { id: subj.id } }
          ));
        });

        return Promise.all(promisesArr);
      })
      .then(() => qi.changeColumn(TBL, 'tags', { // update tags column
        type: Sequelize.ARRAY(
          Sequelize.STRING(constants.fieldlen.normalName)
        ),
        allowNull: false, // change to false
        defaultValue: constants.defaultArrayValue,
      }))

      // update relatedLinks column
      .then(() => qi.changeColumn(TBL, 'relatedLinks', {
        type: Sequelize.ARRAY(Sequelize.JSON),
        allowNull: false, // change to false
        defaultValue: constants.defaultJsonArrayValue,
      }));
    }),

  down: (qi, Sequelize) => qi.changeColumn(TBL, 'tags', {
    type: Sequelize.ARRAY(Sequelize.STRING(constants.fieldlen.normalName)),
    allowNull: true, // back to true
    defaultValue: constants.defaultArrayValue,
  })
  .then(() => qi.changeColumn(TBL, 'relatedLinks', {
    type: Sequelize.ARRAY(Sequelize.JSON),
    allowNull: true, // back to true
    defaultValue: constants.defaultJsonArrayValue,
  })),
};
