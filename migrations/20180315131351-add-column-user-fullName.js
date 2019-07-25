'use strict';

module.exports = {
  up(qi, Sequelize) {
    return qi.addColumn('Users', 'fullName', {
      type: Sequelize.STRING(60),
      defaultValue: null,
    });
  },

  down(qi, Sequelize) {
    return qi.removeColumn('Users', 'fullName');
  },
};
