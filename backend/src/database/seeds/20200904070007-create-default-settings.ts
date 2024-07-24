import { QueryInterface } from "sequelize";
import { hash } from "bcryptjs";

module.exports = {
    up: (queryInterface: QueryInterface) => {
        return queryInterface.sequelize.transaction(async t => {
            return Promise.all([
                queryInterface.bulkInsert(
                    "Settings",
                    [
                        {
                            key: "chatBotType",
                            value: "text",
                            companyId: 1,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        },
                        {
                          key: "allowSignup",
                          value: "enabled",
                          companyId: 1,
                          createdAt: new Date(),
                          updatedAt: new Date()
                      },
                        {
                            key: "userRating",
                            value: "disabled",
                            companyId: 1,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        },
                        {
                            key: "scheduleType",
                            value: "queue",
                            companyId: 1,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        },
                        {
                            key: "CheckMsgIsGroup",
                            value: "enabled",
                            companyId: 1,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        },
                        {
                            key:"call",
                            value: "disabled",
                            companyId: 1,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        },
                        {
                          key: "sendGreetingAccepted",
                          value: "disabled",
                          companyId: 1,
                          createdAt: new Date(),
                          updatedAt: new Date(),

                        },
                        {
                          key: "sendMsgTransfTicket",
                          value: "disabled",
                          companyId: 1,
                          createdAt: new Date(),
                          updatedAt: new Date(),

                                    },
                        {
                            key: "sendTransferAlert",
                            value: "enabled",
                            companyId: 1,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        },

                    {
                        key: "primaryColorLight",
                        value: "#00a0ff",
                        companyId: 1,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    },
                    {
                        key: "primaryColorDark",
                        value: "#FFFFFF",
                        companyId: 1,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    },
                    {
                      key: "whatsAppLibVersion",
                      value: "2, 2413, 1",
                      companyId: 1,
                      createdAt: new Date(),
                      updatedAt: new Date()
                  },
                    ],
                    { transaction: t }
                )
            ]);
        });
    },

    down: async (queryInterface: QueryInterface) => {
        return queryInterface.bulkDelete("Settings", {});
    }
};
