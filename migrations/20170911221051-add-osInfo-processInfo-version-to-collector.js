'use strict'; // eslint-disable-line strict
const TBL = 'Collectors';

module.exports = {
  up(qi, Sequelize) {
    return qi.sequelize.transaction(() =>
      qi.addColumn(TBL, 'osInfo', {
        type: Sequelize.JSONB,
        allowNull: true,
      })
      .then(() => qi.addColumn(TBL, 'processInfo', {
        type: Sequelize.JSONB,
        allowNull: true,
      }))
      .then(() => qi.addColumn(TBL, 'version', {
        type: Sequelize.STRING,
        defaultValue: '0.0.0',
        allowNull: false,
      })));
  },

  down(qi) {
    return qi.sequelize.transaction(() =>
      qi.removeColumn(TBL, 'osInfo')
      .then(() => qi.removeColumn(TBL, 'processInfo'))
      .then(() => qi.removeColumn(TBL, 'version')));
  },
};
