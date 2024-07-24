module.exports = {
    up: (queryInterface, Sequelize) => {
      return queryInterface.createTable("Tasks", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        text: {
          type: Sequelize.STRING,
          allowNull: true, // Alterado para permitir valores nulos
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true, // Defina como true ou false, dependendo se a descrição é opcional
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        companyId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: "Companies",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
      });
    },

    down: (queryInterface) => {
      return queryInterface.dropTable("Tasks");
    },
  };
