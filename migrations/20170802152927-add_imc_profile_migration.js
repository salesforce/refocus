module.exports = {
  up: function (qi, Sequelize) {
    return qi.addColumn('Profiles', 'botAccess', {
      type: Sequelize.ENUM('r', 'rw'),
      defaultValue: 'r',
    })
    .then(() => qi.addColumn('Profiles', 'eventAccess', {
      type: Sequelize.ENUM('r', 'rw'),
      defaultValue: 'r',
    }))
    .then(() => qi.addColumn('Profiles', 'roomAccess', {
      type: Sequelize.ENUM('r', 'rw'),
      defaultValue: 'rw',
    }))
    .then(() => qi.addColumn('Profiles', 'roomTypeAccess', {
      type: Sequelize.ENUM('r', 'rw'),
      defaultValue: 'r',
    }));
  },

  down: function (qi, Sequelize) {
    return qi.removeColumn('Profiles', 'botAccess')
    .then(() => qi.removeColumn('Profiles', 'eventAccess'))
    .then(() => qi.removeColumn('Profiles', 'roomAccess'))
    .then(() => qi.removeColumn('Profiles', 'roomTypeAccess'));
  },
};
