import * as Sentry from "@sentry/node";
import {Job, Queue as BullQueue, Worker} from "bullmq";
import {MessageData, SendMessage} from "./helpers/SendMessage";
import Whatsapp from "./models/Whatsapp";
import {logger} from "./utils/logger";
import moment from "moment";
import Contact from "./models/Contact";
import {Error, Op, Sequelize} from "sequelize";


import {getIO} from "./libs/socket";

import User from "./models/User";
import Company from "./models/Company";
import Plan from "./models/Plan";
import Ticket from "./models/Ticket";


import {ClosedAllOpenTickets} from "./services/WbotServices/wbotClosedTickets";
import Invoices from "./models/Invoices";
import {
  getBodyMessage,
  handleMessage,
  handleMsgAck,
  verifyCampaignMessageAndCloseTicket,
  verifyRecentCampaign
} from "./services/WbotServices/wbotMessageListener";
import {getWbot} from "./libs/wbot";
import {WAMessageUpdate, WASocket} from "@whiskeysockets/baileys";
import MarkDeleteWhatsAppMessage from "./services/WbotServices/MarkDeleteWhatsAppMessage";
import Redis from "ioredis";
import CampaingJob from "./workers/campaingJob";
import ScheduledMessageJob from "./workers/scheduledMessageJob";


const connection = {
  port: parseInt(process.env.REDIS_PORT), // Redis port
  host: process.env.REDIS_HOST || "127.0.0.1", // Redis host
  password: process.env.REDIS_PASSWORD,
}

const limiterMax = process.env.REDIS_OPT_LIMITER_MAX || 1;
const limiterDuration = process.env.REDIS_OPT_LIMITER_DURATION || 3000;
const redis = new Redis(process.env.REDIS_URI);


export const userMonitor = new BullQueue("UserMonitor", {connection});

export const generalMonitor = new BullQueue("GeneralMonitor", {connection});

export const messageQueue = new BullQueue("MessageQueue", {connection});
export const queueMonitor = new BullQueue("QueueMonitor", {connection});

export const scheduleMonitor = new BullQueue("ScheduleMonitor", {connection});

export const campaignQueue = new BullQueue("CampaignQueue", {connection});


async function handleVerifyQueueOld(job) {
  logger.info("Buscando atendimentos perdidos nas filas");
  try {
    const companies = await Company.findAll({
      attributes: ['id', 'name'],
      where: {
        status: true,
        dueDate: {
          [Op.gt]: Sequelize.literal('CURRENT_DATE')
        }
      },
      include: [
        {
          model: Whatsapp, attributes: ["id", "name", "status", "timeSendQueue", "sendIdQueue"], where: {
            timeSendQueue: {
              [Op.gt]: 0
            }
          }
        },
      ]
    });

    companies.map(async c => {
      c.whatsapps.map(async w => {

        if (w.status === "CONNECTED") {

          var companyId = c.id;

          const moveQueue = w.timeSendQueue ? w.timeSendQueue : 0;
          const moveQueueId = w.sendIdQueue;
          const moveQueueTime = moveQueue;
          const idQueue = moveQueueId;
          const timeQueue = moveQueueTime;

          if (moveQueue > 0) {

            if (!isNaN(idQueue) && Number.isInteger(idQueue) && !isNaN(timeQueue) && Number.isInteger(timeQueue)) {

              const tempoPassado = moment().subtract(timeQueue, "minutes").utc().format();
              // const tempoAgora = moment().utc().format();

              const {count, rows: tickets} = await Ticket.findAndCountAll({
                where: {
                  status: "pending",
                  queueId: null,
                  companyId: companyId,
                  whatsappId: w.id,
                  updatedAt: {
                    [Op.lt]: tempoPassado
                  }
                },
                include: [
                  {
                    model: Contact,
                    as: "contact",
                    attributes: ["id", "name", "number", "email", "profilePicUrl"],
                    include: ["extraInfo"]
                  }
                ]
              });

              if (count > 0) {
                tickets.map(async ticket => {
                  await ticket.update({
                    queueId: idQueue
                  });

                  await ticket.reload();

                  const io = getIO();
                  io.to(`company-${ticket.companyId}-${ticket.status}`)
                    .to(`company-${ticket.companyId}-notification`)

                    .to(ticket.id.toString())
                    .emit(`company-${companyId}-ticket`, {
                      action: "update",
                      ticket,
                      ticketId: ticket.id
                    });

                  /*io.to("pending").emit(`company-${companyId}-ticket`, {
                    action: "update",
                    ticket,
                  });
*/

                  logger.info(`Atendimento Perdido: ${ticket.id} - Empresa: ${companyId}`);
                });
              } else {
                logger.info(`Nenhum atendimento perdido encontrado - Empresa: ${companyId}`);
              }
            } else {
              logger.info(`Condição não respeitada - Empresa: ${companyId}`);
            }
          }
        }
      });
    });
  } catch (e: any) {
    Sentry.captureException(e);
    logger.error("SearchForQueue -> VerifyQueue: error" + e);
    throw e;
  }
};

async function handleVerifyQueue(job) {
  logger.info("Buscando atendimentos perdidos nas filas");
  try {
    const companies = await Company.findAll({
      attributes: ['id', 'name'],
      where: {
        status: true,
        dueDate: {
          [Op.gt]: Sequelize.literal('CURRENT_DATE')
        }
      },
      include: [
        {
          model: Whatsapp,
          attributes: ["id", "name", "status", "timeSendQueue", "sendIdQueue"],
          where: {
            timeSendQueue: {
              [Op.gt]: 0
            }
          }
        },
      ]
    });

    companies.map(async c => {
      c.whatsapps.map(async w => {
        if (w.status === "CONNECTED") {
          const companyId = c.id;
          const moveQueue = w.timeSendQueue ? w.timeSendQueue : 0;
          const moveQueueId = w.sendIdQueue;
          const moveQueueTime = moveQueue;
          const idQueue = moveQueueId;
          const timeQueue = moveQueueTime;

          if (moveQueue > 0 && !isNaN(idQueue) && Number.isInteger(idQueue) && !isNaN(timeQueue) && Number.isInteger(timeQueue)) {
            const tempoPassado = moment().subtract(timeQueue, "minutes").utc().format();

            const { count, rows: tickets } = await Ticket.findAndCountAll({
              where: {
                status: "pending",
                queueId: null,
                companyId: companyId,
                whatsappId: w.id,
                updatedAt: {
                  [Op.lt]: tempoPassado
                }
              },
              include: [
                {
                  model: Contact,
                  as: "contact",
                  attributes: ["id", "name", "number", "email", "profilePicUrl"],
                  include: ["extraInfo"]
                }
              ]
            });

            if (count > 0) {
              tickets.map(async ticket => {
                await ticket.update({
                  queueId: idQueue
                });

                await ticket.reload();

                const io = getIO();
                io.to(`company-${ticket.companyId}-${ticket.status}`)
                  .to(`company-${ticket.companyId}-notification`)
                  .to(ticket.id.toString())
                  .emit(`company-${companyId}-ticket`, {
                    action: "update",
                    ticket,
                    ticketId: ticket.id
                  });

                logger.info(`Atendimento Perdido: ${ticket.id} - Empresa: ${companyId}`);
              });
            } else {
              logger.info(`Nenhum atendimento perdido encontrado - Empresa: ${companyId}`);
            }
          } else {
            logger.info(`Condição não respeitada - Empresa: ${companyId}`);
          }
        }
      });
    });
  } catch (error) {
    console.error(error);
  }
}

async function handleCloseTicketsAutomatic() {
  const companies = await Company.findAll({
    where: {
      status: true
    }
  });
  companies.map(async c => {

    try {
      const companyId = c.id;
      await ClosedAllOpenTickets(companyId);
    } catch (e: any) {
      Sentry.captureException(e);
      logger.error("ClosedAllOpenTickets -> Verify: error", e.message);
      throw e;
    }

  });

}


async function messageUpdateJob(job) {

  const {data} = job;

  var companyId = data.companyId;

  var messageUpdate = data.messageUpdate;

  var whatsappId = data.whatsappId;

  const wbot = getWbot(data.whatsappId);


  for (const message of messageUpdate) {
    await (wbot as WASocket)!.readMessages([message.key])
    const msgUp = {...messageUpdate}
    if (msgUp['0']?.update.messageStubType === 1 && msgUp['0']?.key.remoteJid !== 'status@broadcast') {
      await MarkDeleteWhatsAppMessage(msgUp['0']?.key.remoteJid, null, msgUp['0']?.key.id, companyId)
    }
    await handleMsgAck(message, message.update.status);
  }
}

async function handleMessageJob(job) {

  const {data} = job;
  var messages = data.messages;
  var companyId = data.companyId;

  const wbot = getWbot(data.whatsappId);

  for (const message of messages) {


    await handleMessage(message, wbot, companyId);


    await verifyRecentCampaign(message, companyId);
    await verifyCampaignMessageAndCloseTicket(message, companyId);


    if (message.key.remoteJid?.endsWith("@g.us")) {
      //    console.log('is group?')
      await handleMsgAck(message, 2); //why?

    }
  }
}

async function handleSendMessage(job) {
  console.log('HANDLE SEND MESSAGE')
  try {
    const {data} = job;

    const whatsapp = await Whatsapp.findByPk(data.whatsappId);

    if (whatsapp == null) {
      throw new Error("Whatsapp não identificado");
    }

    const messageData: MessageData = data.data;


    await SendMessage(whatsapp, messageData);
  } catch (e: unknown) {
    Sentry.captureException(e);
    logger.error("MessageQueue -> SendMessage: error", (e as Error).message);
    throw e;
  }
}

export function parseToMilliseconds(seconds: number) {
  return seconds * 1000;
}

export async function sleep(seconds: number) {
  logger.info(
    `Sleep de ${seconds} segundos iniciado: ${moment().format("HH:mm:ss")}`
  );
  return new Promise(resolve => {
    setTimeout(() => {
      logger.info(
        `Sleep de ${seconds} segundos finalizado: ${moment().format(
          "HH:mm:ss"
        )}`
      );
      resolve(true);
    }, parseToMilliseconds(seconds));
  });
}

export function randomValue(min, max) {
  return Math.floor(Math.random() * max) + min;
}

async function handleLoginStatus() {
  console.log('handle login')
  const thresholdTime = new Date();
  thresholdTime.setMinutes(thresholdTime.getMinutes() - 5);

  await User.update({online: false}, {
    where: {
      updatedAt: {[Op.lt]: thresholdTime},
      online: true,
    },
  });

}


async function handleInvoiceCreate() {
  logger.info("Iniciando geração de boletos");


  const companies = await Company.findAll({
    where: {
      status: true
    }
  });
  companies.map(async c => {
    const {dueDate} = c;
    const startDate = new Date(dueDate).setHours(0, 0, 0, 0);
    // Fim do dia
    const endDate = new Date(dueDate).setHours(23, 59, 59, 999);
    const hoje = moment(moment()).format("DD/MM/yyyy");
    const vencimento = moment(dueDate).format("DD/MM/yyyy");

    const diff = moment(vencimento, "DD/MM/yyyy").diff(moment(hoje, "DD/MM/yyyy"));
    const dias = moment.duration(diff).asDays();

    if (dias < 20) {
      const plan = await Plan.findByPk(c.planId);

      let result = await Invoices.count({
        where: {
          companyId: c.id,
          dueDate: {
            [Op.like]: moment(dueDate).format("YYYY-MM-DD")
          }
        }
      });
      if (+result === 0) {
        const timestamp = moment().format();

        // eslint-disable-next-line no-shadow
        await Invoices.create({
          detail: plan.name,
          status: 'open',
          value: plan.value,
          updatedAt: timestamp,
          createdAt: timestamp,
          dueDate: moment(dueDate).format("YYYY-MM-DD"),
          companyId: c.id
        });
      }
    }
  });
}


export async function startQueueProcess() {

  logger.info("Iniciando processamento de filas");

  await userMonitor.add(
    "VerifyLoginStatus",
    {},
    {
      repeat: {every: 60000 * 5, key: "VerifyLoginStatus"},
      removeOnComplete: true, removeOnFail: true
    }
  );
  const handleLoginStatusWorker = new Worker(userMonitor.name, handleLoginStatus, {
    connection,
    removeOnFail: {count: 0},
  });

  handleLoginStatusWorker.on("completed", async (job) => {
    logger.info(`Job ${job.name} completed`);
  });


  await generalMonitor.add(
    "CloseTicketsAutomatic",
    {},
    {
      repeat: {every: 60 * 1000 * 5, key: "CloseTicketsAutomatic"},
      removeOnComplete: true, removeOnFail: true
    }
  );

  await generalMonitor.add(
    "InvoiceCreate",
    {},
    {
      repeat: {every: 60 * 1000 * 30, key: "InvoiceCreate"},
      removeOnComplete: true, removeOnFail: true
    }
  );

  const generalWorker = new Worker(generalMonitor.name, async (job: Job) => {
    if (job.name == "CloseTicketsAutomatic") {
      await handleCloseTicketsAutomatic();
    } else if (job.name == "InvoiceCreate") {
      await handleInvoiceCreate();
    }
  }, {
    connection,
    removeOnFail: {count: 0},
  });

  await campaignQueue.add(
    "VerifyCampaigns",
    {},
    {
      repeat: {every: 60 * 1000 * 5, key: "VerifyCampaigns"},
      removeOnComplete: true, removeOnFail: true
    }
  );


  new CampaingJob(campaignQueue.name, connection);


  const handleSendMessageWorker = new Worker(messageQueue.name, async (job) => {
    if (job.name == "HandleMessageJob") {
      await handleMessageJob(job)
    } else if (job.name == "MessageUpdateJob") {
      await messageUpdateJob(job)
    } else if (job.name == "SendMessage") {
      await handleSendMessage(job);
    }
  }, {
    connection,
    concurrency: 100,
    removeOnFail: {count: 0},
  });

  handleSendMessageWorker.on("completed", async (job) => {
    logger.info(`Job ${job.name} completed`);
  });

  handleSendMessageWorker.on("failed", async (job, err) => {
    logger.error(`Job ${job.name} failed with error: ${err.message}`);
  });


  await queueMonitor.add(
    "VerifyQueueStatus",
    {},
    {
      repeat: {every: 60 * 1000 * 2, key: 'VerifyQueueStatus'},
      removeOnComplete: true, removeOnFail: true
    }
  );


  const handleVerifyQueueWorker = new Worker(queueMonitor.name, async (job: Job) => {
    if (job.name == "VerifyQueueStatus") {
      await handleVerifyQueue(job);
    }
  }, {
    connection,
    removeOnFail: {count: 0},
  });

  handleVerifyQueueWorker.on("completed", async (job) => {
    logger.info(`Job ${job.id} completed`);
  });


  let scheduleMessageJob = new ScheduledMessageJob(scheduleMonitor, connection);

  await scheduleMessageJob.getQueue().add(
    "VerifySchedules",
    {},
    {
      repeat: {every: (60000 * 5), key: "verify"},
      removeOnComplete: true, removeOnFail: true
    }
  );


}
