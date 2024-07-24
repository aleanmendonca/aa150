'use strict';

import {QueryInterface, DataTypes} from "sequelize";

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn("Tags", "msgR", {
      type: DataTypes.TEXT,
      allowNull: true,
    }).then(() => {
      return queryInterface.addColumn("Tags", "rptDays", {
        allowNull: true,
        type: DataTypes.INTEGER
      });
    })
      .then(() => {
        return queryInterface.addColumn("Tags", "actCamp", {
          allowNull: true,
          type: DataTypes.INTEGER
        });
      }).then(() => {
        return queryInterface.addColumn("Schedules", "daysR", {
          type: DataTypes.INTEGER,
          allowNull: true,
        })
          .then(() => {
            return queryInterface.addColumn("Schedules", "campId", {
              allowNull: true,
              type: DataTypes.INTEGER
            });
          })
      })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn("Tags", "msgR")
      .then(() => {
        return queryInterface.removeColumn("Tags", "rptDays");
      })
      .then(() => {
        return queryInterface.removeColumn("Tags", "actCamp");
      }).then(() => {
        return queryInterface.removeColumn("Schedules", "daysR")
          .then(() => {
            return queryInterface.removeColumn("Schedules", "campId");
          })

      })
  }
};
