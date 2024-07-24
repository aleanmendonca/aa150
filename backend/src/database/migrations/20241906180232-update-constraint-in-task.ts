module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.removeConstraint('Tasks', 'Tasks_companyId_fkey')
      .then(() => {
        return queryInterface.addConstraint('Tasks', {
          fields: ['companyId'],
          type: 'foreign key',
          name: 'Tasks_companyId_fkey',
          references: {
            table: 'Companies',
            field: 'id'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        });
      });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.removeConstraint('Tasks', 'Tasks_companyId_fkey')
      .then(() => {
        return queryInterface.addConstraint('Tasks', {
          fields: ['companyId'],
          type: 'foreign key',
          name: 'Tasks_companyId_fkey',
          references: {
            table: 'Companies',
            field: 'id'
          },
          onDelete: 'SET NULL', // or 'NO ACTION' based on original setting
          onUpdate: 'CASCADE'
        });
      });
  }
};
