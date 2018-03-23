'use strict';

module.exports = {
  up(qi, Sequelize) {
    return qi.addColumn('Bots', 'version', {
      type: Sequelize.STRING(10),
      defaultValue: null,
    });
  },

  down(qi, Sequelize) {
    return qi.removeColumn('Bots', 'version');
  },
};
