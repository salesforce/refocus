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
                let minVal = value[0];
                let maxVal = value[1];

                if (value) {
                  if (value[0] < Number.MIN_SAFE_INTEGER ||
                    value[0] > Number.MAX_SAFE_INTEGER) {
                    minVal = Number.MIN_SAFE_INTEGER;
                  }

                  if (value[1] < Number.MIN_SAFE_INTEGER ||
                    value[1] > Number.MAX_SAFE_INTEGER) {
                    maxVal = Number.MAX_SAFE_INTEGER;
                  }

                  if (minVal !== value[0] || maxVal !== value[1]) {
                    updateObj[key] = [minVal, maxVal];
                  }
                }
              }

              if (Object.keys(updateObj).length !== 0) {
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
          promisesArr.map((p) => p.catch(() => Promise.resolve()))
        );
      });
    });
  },

  // Not required to change the aspect rows back to previous vaueType.
  down: (queryInterface, Sequelize) => Promise.resolve(),
};
