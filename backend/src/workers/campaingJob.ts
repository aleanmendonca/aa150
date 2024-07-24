import {SandboxedJob, Worker} from 'bullmq';
import Campaign from "../models/Campaign";
import {Error, Op} from "sequelize";
import {logger} from "../utils/logger";
import moment from "moment/moment";
import * as Sentry from "@sentry/node";
import ContactList from "../models/ContactList";
import ContactListItem from "../models/ContactListItem";
import Whatsapp from "../models/Whatsapp";
import CampaignShipping from "../models/CampaignShipping";
import {campaignQueue, parseToMilliseconds, randomValue} from "../queues";
import {isArray, isEmpty, isNil} from "lodash";
import {addSeconds, differenceInSeconds} from "date-fns";
import GetWhatsappWbot from "../helpers/GetWhatsappWbot";
import path from "path";
import ShowFileService from "../services/FileServices/ShowService";
import {getMessageOptions} from "../services/WbotServices/SendWhatsAppMedia";
import {getIO} from "../libs/socket";
import CampaignSetting from "../models/CampaignSetting";
import {SendPresenceStatus} from "../helpers/SendPresenceStatus";

interface ProcessCampaignData {
  id: number;
  delay: number;
}

interface PrepareContactData {
  contactId: number;
  campaignId: number;
  delay: number;
  variables: any[];
}

interface DispatchCampaignData {
  campaignId: number;
  campaignShippingId: number;
  contactListItemId: number;
}

export default class CampaingJob {

  constructor(queueName, connection) {
    const campaignWorker = new Worker(queueName, async (job) =>{
      if (job.name == "VerifyCampaigns") {
        await this.handleVerifyCampaigns(job);
      } else if (job.name == "ProcessCampaign") {
        await this.handleProcessCampaign(job);
      } else if (job.name == "PrepareContact") {
        await this.handlePrepareContact(job);
      } else if (job.name == "DispatchCampaign") {
        await this.handleDispatchCampaign(job);
      }
    }, {
      useWorkerThreads: false,
      concurrency: 100,
      connection,
      removeOnFail: {count: 0},
    });

    campaignWorker.on("completed", async (job) => {
      logger.info(`Job ${job.name} (${job.id}) completed`);
    });

    campaignWorker.on("failed", async (job, err) => {
      logger.error(`Job ${job.name} failed with error: ${err.message}`);
    });

  }
  private async getContact(id: number) {
    return ContactListItem.findByPk(id, {
      attributes: ["id", "name", "number", "email"]
    });
  }

  public async handlePrepareContact(job: { data: PrepareContactData; }) {
    try {
      const {contactId, campaignId, delay, variables} = job.data;
      const campaign = await this.getCampaign(campaignId);
      const contact = await this.getContact(contactId);

      const campaignShipping: any = {};
      campaignShipping.number = contact.number;
      campaignShipping.contactId = contactId;
      campaignShipping.campaignId = campaignId;

      const messages = this.getCampaignValidMessages(campaign);
      if (messages.length) {
        const radomIndex = randomValue(0, messages.length);
        const message = this.getProcessedMessage(
          messages[radomIndex],
          variables,
          contact
        );
        campaignShipping.message = `\u200c ${message}`;
      }

      if (campaign.confirmation) {
        const confirmationMessages =
          this.getCampaignValidConfirmationMessages(campaign);
        if (confirmationMessages.length) {
          const radomIndex = randomValue(0, confirmationMessages.length);
          const message = this.getProcessedMessage(
            confirmationMessages[radomIndex],
            variables,
            contact
          );
          campaignShipping.confirmationMessage = `\u200c ${message}`;
        }
      }

      const [record, created] = await CampaignShipping.findOrCreate({
        where: {
          campaignId: campaignShipping.campaignId,
          contactId: campaignShipping.contactId
        },
        defaults: campaignShipping
      });

      if (
        !created &&
        record.deliveredAt === null &&
        record.confirmationRequestedAt === null
      ) {
        record.set(campaignShipping);
        await record.save();
      }

      if (
        record.deliveredAt === null &&
        record.confirmationRequestedAt === null
      ) {
        const nextJob = await campaignQueue.add(
          "DispatchCampaign",
          {
            campaignId: campaign.id,
            campaignShippingId: record.id,
            contactListItemId: contactId
          },
          {
            removeOnComplete: true,
            delay
          }
        );

        await record.update({jobId: nextJob.id});
      }

      await this.verifyAndFinalizeCampaign(campaign);
    } catch (err: unknown) {
      Sentry.captureException(err);
      logger.error(`campaignQueue -> PrepareContact -> error: ${(err as Error).message}`);
    }
  }

  private async verifyAndFinalizeCampaign(campaign) {
    const {contacts} = campaign.contactList;

    const count1 = contacts.length;
    const count2 = await CampaignShipping.count({
      where: {
        campaignId: campaign.id,
        deliveredAt: {
          [Op.not]: null
        }
      }
    });

    if (count1 === count2) {
      await campaign.update({status: "FINALIZADA", completedAt: moment()});
    }

    const io = getIO();
    io
      .to(`company-${campaign.companyId}-mainchannel`)
      .emit(`company-${campaign.companyId}-campaign`, {
        action: "update",
        record: campaign
      });
  }

  private calculateDelay(index, baseDelay, longerIntervalAfter, greaterInterval, messageInterval) {
    const diffSeconds = differenceInSeconds(baseDelay, new Date());
    if (index > longerIntervalAfter) {
      return diffSeconds * 1000 + greaterInterval
    } else {
      return diffSeconds * 1000 + messageInterval
    }
  }

  private getCampaignValidConfirmationMessages(campaign) {
    const messages = [];

    if (
      !isEmpty(campaign.confirmationMessage1) &&
      !isNil(campaign.confirmationMessage1)
    ) {
      messages.push(campaign.confirmationMessage1);
    }

    if (
      !isEmpty(campaign.confirmationMessage2) &&
      !isNil(campaign.confirmationMessage2)
    ) {
      messages.push(campaign.confirmationMessage2);
    }

    if (
      !isEmpty(campaign.confirmationMessage3) &&
      !isNil(campaign.confirmationMessage3)
    ) {
      messages.push(campaign.confirmationMessage3);
    }

    if (
      !isEmpty(campaign.confirmationMessage4) &&
      !isNil(campaign.confirmationMessage4)
    ) {
      messages.push(campaign.confirmationMessage4);
    }

    if (
      !isEmpty(campaign.confirmationMessage5) &&
      !isNil(campaign.confirmationMessage5)
    ) {
      messages.push(campaign.confirmationMessage5);
    }

    return messages;
  }

  public async handleDispatchCampaign(job) {
    try {
      const {data} = job;
      const {campaignShippingId, campaignId}: DispatchCampaignData = data;
      const campaign = await this.getCampaign(campaignId);
      const wbot = await GetWhatsappWbot(campaign.whatsapp);

      if (!wbot) {
        logger.error(`campaignQueue -> DispatchCampaign -> error: wbot not found`);
        return;
      }

      if (!campaign.whatsapp) {
        logger.error(`campaignQueue -> DispatchCampaign -> error: whatsapp not found`);
        return;
      }

      if (!wbot?.user?.id) {
        logger.error(`campaignQueue -> DispatchCampaign -> error: wbot user not found`);
        return;
      }

      logger.info(
        `Disparo de campanha solicitado: Campanha=${campaignId};Registro=${campaignShippingId}`
      );

      const campaignShipping = await CampaignShipping.findByPk(
        campaignShippingId,
        {
          include: [{model: ContactListItem, as: "contact"}]
        }
      );

      const chatId = `${campaignShipping.number}@s.whatsapp.net`;

      let body = campaignShipping.message.trimEnd().trimStart();

      if (campaign.confirmation && campaignShipping.confirmation === null) {
        body = campaignShipping.confirmationMessage
      }

      await SendPresenceStatus(wbot, chatId);

      if (!isNil(campaign.fileListId)) {
        try {
          const publicFolder = path.resolve(__dirname, "..", "public", `company${campaign.companyId}`);
          const files = await ShowFileService(campaign.fileListId, campaign.companyId)
          const folder = path.resolve(publicFolder, "fileList", String(files.id))
          for (const [index, file] of files.options.entries()) {
            const options = await getMessageOptions(file.path, path.resolve(folder, file.path), file.name, campaign.companyId);
            await wbot.sendMessage(chatId, {...options});
          }
        } catch (error) {
          logger.info(error);
        }
      }

      if (campaign.mediaPath) {
        const publicFolder = path.resolve(__dirname, "..", `public/company${campaign.companyId}`);
        const filePath = path.join(publicFolder, campaign.mediaPath);


        const options = await getMessageOptions(campaign.mediaName, filePath, body, campaign.companyId);
        if (Object.keys(options).length) {
          await wbot.sendMessage(chatId, {...options});
        }
      } else {
        if (campaign.confirmation && campaignShipping.confirmation === null) {
          await wbot.sendMessage(chatId, {
            text: body
          });
          await campaignShipping.update({confirmationRequestedAt: moment()});
        } else {
          await wbot.sendMessage(chatId, {
            text: body
          });
        }
      }
      await campaignShipping.update({deliveredAt: moment()});

      await this.verifyAndFinalizeCampaign(campaign);

      const io = getIO();
      io
        .to(`company-${campaign.companyId}-mainchannel`)
        .emit(`company-${campaign.companyId}-campaign`, {
          action: "update",
          record: campaign
        });

      logger.info(
        `Campanha enviada para: Campanha=${campaignId};Contato=${campaignShipping.contact.name}`
      );
    } catch (err: unknown) {
      Sentry.captureException(err);
      logger.error((err as Error).message);
    }
  }

  private getCampaignValidMessages(campaign) {
    const messages = [];

    if (!isEmpty(campaign.message1) && !isNil(campaign.message1)) {
      messages.push(campaign.message1);
    }

    if (!isEmpty(campaign.message2) && !isNil(campaign.message2)) {
      messages.push(campaign.message2);
    }

    if (!isEmpty(campaign.message3) && !isNil(campaign.message3)) {
      messages.push(campaign.message3);
    }

    if (!isEmpty(campaign.message4) && !isNil(campaign.message4)) {
      messages.push(campaign.message4);
    }

    if (!isEmpty(campaign.message5) && !isNil(campaign.message5)) {
      messages.push(campaign.message5);
    }

    return messages;
  }

  private getProcessedMessage(msg: string, variables: any[], contact: any) {
    let finalMessage = msg;

    if (finalMessage.includes("{nome}")) {
      finalMessage = finalMessage.replace(/{nome}/g, contact.name);
    }

    if (finalMessage.includes("{email}")) {
      finalMessage = finalMessage.replace(/{email}/g, contact.email);
    }

    if (finalMessage.includes("{numero}")) {
      finalMessage = finalMessage.replace(/{numero}/g, contact.number);
    }

    variables.forEach(variable => {
      if (finalMessage.includes(`{${variable.key}}`)) {
        const regex = new RegExp(`{${variable.key}}`, "g");
        finalMessage = finalMessage.replace(regex, variable.value);
      }
    });

    return finalMessage;
  }

  private async getSettings(campaign) {
    const settings = await CampaignSetting.findAll({
      where: {companyId: campaign.companyId},
      attributes: ["key", "value"]
    });

    let messageInterval = 20;
    let longerIntervalAfter = 20;
    let greaterInterval = 60;
    let variables: any[] = [];

    settings.forEach(setting => {
      if (setting.key === "messageInterval") {
        messageInterval = JSON.parse(setting.value);
      }
      if (setting.key === "longerIntervalAfter") {
        longerIntervalAfter = JSON.parse(setting.value);
      }
      if (setting.key === "greaterInterval") {
        greaterInterval = JSON.parse(setting.value);
      }
      if (setting.key === "variables") {
        variables = JSON.parse(setting.value);
      }
    });

    return {
      messageInterval,
      longerIntervalAfter,
      greaterInterval,
      variables
    };
  }

  public async handleProcessCampaign(job) {
    try {
      const {id}: ProcessCampaignData = job.data;
      const campaign = await this.getCampaign(id);
      const settings = await this.getSettings(campaign);
      if (campaign) {
        const {contacts} = campaign.contactList;
        if (isArray(contacts)) {
          const contactData = contacts.map(contact => ({
            contactId: contact.id,
            campaignId: campaign.id,
            variables: settings.variables,
          }));

          // const baseDelay = job.data.delay || 0;
          const longerIntervalAfter = parseToMilliseconds(settings.longerIntervalAfter);
          const greaterInterval = parseToMilliseconds(settings.greaterInterval);
          const messageInterval = settings.messageInterval;

          let baseDelay = campaign.scheduledAt;

          const queuePromises = [];
          for (let i = 0; i < contactData.length; i++) {
            baseDelay = addSeconds(baseDelay, i > longerIntervalAfter ? greaterInterval : messageInterval);

            const {contactId, campaignId, variables} = contactData[i];
            const delay = this.calculateDelay(i, baseDelay, longerIntervalAfter, greaterInterval, messageInterval);
            const queuePromise = campaignQueue.add(
              "PrepareContact",
              {contactId, campaignId, variables, delay: delay + randomValue(100, 1500)},
              {removeOnComplete: true}
            );
            queuePromises.push(queuePromise);
            logger.info(`Registro enviado pra fila de disparo: Campanha=${campaign.id};Contato=${contacts[i].name};delay=${delay}`);
          }
          await Promise.all(queuePromises);
          await campaign.update({status: "EM_ANDAMENTO"});
        }
      }
    } catch (err: any) {
      logger.error(err);
      Sentry.captureException(err);
    }
  }


  public async handleVerifyCampaigns(job) {
    /**
     * @todo
     * Implementar filtro de campanhas
     */
    const oneHourFromNow = new Date(new Date().getTime() + 60 * 60 * 1000);

    let campaigns = await Campaign.findAll({
      where: {
        scheduledAt: {
          [Op.lte]: +oneHourFromNow
        },
        status: 'PROGRAMADA'
      },
      attributes: ['id', 'scheduledAt']
    });

    if (campaigns.length > 0)
      logger.info(`Campanhas encontradas: ${campaigns.length}`);

    for (let campaign of campaigns) {
      try {
        const now = moment();
        const scheduledAt = moment(campaign.scheduledAt);
        const delay = scheduledAt.diff(now, "milliseconds");
        logger.info(
          `Campanha enviada para a fila de processamento: Campanha=${campaign.id}, Delay Inicial=${delay}`
        );
        await campaignQueue.add(
          "ProcessCampaign",
          {
            id: campaign.id,
            delay
          }, {
            delay: delay,
            removeOnComplete: true
          }
        );

      } catch (err: any) {
        Sentry.captureException(err);
        return Promise.reject(new Error(err));
      }
    }
    return Promise.resolve({count: campaigns.length});

  }

  public async getCampaign(id: number) {
    return Campaign.findByPk(id, {
      include: [
        {
          model: ContactList,
          as: "contactList",
          attributes: ["id", "name"],
          include: [
            {
              model: ContactListItem,
              as: "contacts",
              attributes: ["id", "name", "number", "email", "isWhatsappValid"],
              where: {isWhatsappValid: true}
            }
          ]
        },
        {
          model: Whatsapp,
          as: "whatsapp",
          attributes: ["id", "name"]
        },
        {
          model: CampaignShipping,
          as: "shipping",
          include: [{model: ContactListItem, as: "contact"}]
        }
      ]
    });
  }

}
