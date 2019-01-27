'use strict';
const validateAspectStatusRanges = require('../db/helpers/aspectUtils')
                                    .validateAspectStatusRanges;
const Aspect = require('../db/index').Aspect;

module.exports = {
  up(qi /* , Sequelize */) {
    /* If valueType is BOOLEAN or PERCENT and the current ranges wouldn't
     validate with new rules, change the valueType to NUMERIC.
     If valueType is NUMERIC, update invalid range with MIN and MAX NUMBER
     wherever applicable. */
    return qi.sequelize.transaction(() => {
      const aspQuery = 'SELECT * from "Aspects"';
      return qi.sequelize.query(aspQuery, {
        type: qi.sequelize.QueryTypes.SELECT,
      }).then((aspects) => {
        const promisesArr = [];
        aspects.forEach((asp) => {
          try {
            validateAspectStatusRanges(asp);
          } catch (err) {
            // if numeric, the only possible exception will be invalid range
            if (asp.valueType === 'NUMERIC') {
              const statusRangeMap = new Map();
              statusRangeMap.set('criticalRange', asp.criticalRange);
              statusRangeMap.set('warningRange', asp.warningRange);
              statusRangeMap.set('infoRange', asp.infoRange);
              statusRangeMap.set('okRange', asp.okRange);
              const updateObj = {};
              for (const [key, value] of statusRangeMap.entries()) {
                if (value && value[0] < Number.MIN_SAFE_INTEGER) {
                  updateObj[key] = [Number.MIN_SAFE_INTEGER, value[1]];
                }

                if (value && value[1] > Number.MAX_SAFE_INTEGER) {
                  updateObj[key] = [value[0], Number.MAX_SAFE_INTEGER];
                }
              }

              if (updateObj) {
                promisesArr.push(
                  Aspect.update(updateObj, { where: { id: asp.id } })
                );
              }
            } else { // for all other exceptions, change valuetype to numeric
              promisesArr.push(Aspect.update(
                { valueType: 'NUMERIC' }, { where: { id: asp.id } }
              ));
            }
          }
        });

        // waits for all promises to resolve or reject
        return Promise.all(
          promisesArr.map((p) => p.catch(() => undefined))
        );
      });
    });
  },

  // Not required to change the aspect rows back to previous vaueType.
  down: (queryInterface, Sequelize) => Promise.resolve(),
};
