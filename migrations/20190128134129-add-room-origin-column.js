'use strict';
const TBL = 'Rooms';
module.exports = {
  up(qi, Sequelize) {
    return qi.addColumn(TBL, 'origin', {
      type: Sequelize.ENUM('auto_create', 'GUS', 'other', 'web'),
      default: 'other',
      allowNull: false,
    });
  },

  down(qi) {
    return qi.removeColumn(TBL, 'origin');
  },
};
