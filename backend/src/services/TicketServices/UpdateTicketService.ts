import moment from "moment";
import * as Sentry from "@sentry/node";
import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";
import SetTicketMessagesAsRead from "../../helpers/SetTicketMessagesAsRead";
import {getIO} from "../../libs/socket";
import Ticket from "../../models/Ticket";
import Setting from "../../models/Setting";
import Queue from "../../models/Queue";
import ShowTicketService from "./ShowTicketService";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import FindOrCreateATicketTrakingService from "./FindOrCreateATicketTrakingService";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import {verifyMessage} from "../WbotServices/wbotMessageListener";
import ListSettingsServiceOne from "../SettingServices/ListSettingsServiceOne";
import ShowUserService from "../UserServices/ShowUserService";
import {isNil} from "lodash";
import Whatsapp from "../../models/Whatsapp";
import {Op} from "sequelize";
import AppError from "../../errors/AppError";
import {Server} from "socket.io";
import {SendPresenceStatus} from "../../helpers/SendPresenceStatus";
import {getWbot} from "../../libs/wbot";

interface TicketData {
  status?: string;
  userId?: number | null;
  queueId?: number | null;
  amountUsedBotQueues?: number | null;
  unreadMessages?: number | null;
  chatbot?: boolean;
  sendFarewellMessage?: boolean | null
  queueOptionId?: number;
  whatsappId?: string;
  useIntegration?: boolean;
  integrationId?: number | null;
  promptId?: number | null;
}

interface Request {
  ticketData: TicketData;
  ticketId: string | number;
  companyId?: number | undefined;
  tokenData?: {
    id: string;
    username: string;
    profile: string;
    super: boolean;
    companyId: number;
    iat: number;
    exp: number;
  } | undefined;
}

interface Response {
  ticket: Ticket;
  oldStatus: string;
  oldUserId: number | undefined;
}

let completionMessageControl: any[] = [];

const UpdateTicketService = async ({
                                     ticketData,
                                     ticketId,
                                     tokenData,
                                     companyId,
                                   }: Request): Promise<Response> => {


  try {
    if (!companyId && !tokenData) {
      console.trace("Need companyId or tokenData");
      throw new Error("Need companyId or tokenData");
    }
    if (tokenData) {
      companyId = tokenData.companyId;
    }
    let {status} = ticketData;
    let {queueId, userId, whatsappId, sendFarewellMessage} = ticketData;


    if (sendFarewellMessage === undefined || sendFarewellMessage == null) {
      sendFarewellMessage = true;
    }
    let chatbot: boolean | null = ticketData.chatbot || false;
    let queueOptionId: number | null = ticketData.queueOptionId || null;
    let promptId: number | null = ticketData.promptId || null;
    let useIntegration: boolean | null = ticketData.useIntegration || false;
    let integrationId: number | null = ticketData.integrationId || null;

    const io = getIO();

    const key = "userRating";
    const setting = await Setting.findOne({
      where: {
        companyId,
        key
      }
    });

    let ticket = await ShowTicketService(ticketId, companyId);

    if (tokenData && ticket.status !== "pending") {
      if (tokenData.profile !== "admin" && ticket.userId !== parseInt(tokenData.id)) {

        console.trace("Apenas o usuário ativo do ticket ou o Admin podem fazer alterações no ticket");
        throw new AppError("Apenas o usuário ativo do ticket ou o Admin podem fazer alterações no ticket");
      }
    }

    const ticketTraking = await FindOrCreateATicketTrakingService({
      ticketId,
      companyId,
      whatsappId: ticket.whatsappId
    });

    if (isNil(whatsappId)) {
      whatsappId = ticket.whatsappId.toString();
    }

    if (status == "closed" || status == "open") {
      //console.log(status);
      await SetTicketMessagesAsRead(ticket);
    }
    const oldStatus = ticket.status;
    const oldUserId = ticket.user?.id;
    const oldQueueId = ticket.queueId;

    if (oldStatus === "closed" || Number(whatsappId) !== ticket.whatsappId) {

      await CheckContactOpenTickets(ticket.contact.id, whatsappId);
      chatbot = null;
      queueOptionId = null;
    }

    if (status !== undefined && ["closed"].indexOf(status) > -1) {
      const {complationMessage, ratingMessage} = await ShowWhatsAppService(
        ticket.whatsappId,
        companyId
      );

      if (setting?.value === "enabled" && sendFarewellMessage && !ticket.isGroup) {
        if (ticketTraking.ratingAt == null && !ticket.isGroup) {
          const ratingTxt = ratingMessage || "";
          let bodyRatingMessage = `\u200e${ratingTxt}\n\n`;
          bodyRatingMessage +=
            "Digite de 1 à 5 para qualificar nosso atendimento:\n" +
            "*1* - _Muito Insatisfeito_\n" +
            "*2* - _Insatisfeito_\n" +
            "*3* - _Moderadamente Satisfeito_\n" +
            "*4* - _Satisfeito_\n" +
            "*5* - _Muito Satisfeito_\n";

          await SendPresenceStatus(getWbot(ticket.whatsappId), `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`);
          await SendWhatsAppMessage({body: bodyRatingMessage, ticket});

          await ticketTraking.update({
            rated: false,
            ratingAt: moment().toDate()
          });


          await ticket.update({
            amountUsedBotQueues: ticketData.amountUsedBotQueues || 0,
            status,
            unreadMessages: ticketData.unreadMessages || 0,
            queueId,
            userId,
            whatsappId,
            chatbot,
            queueOptionId
          });

          io
            .to(`company-${ticket.companyId}-open`)
            .to(ticketId.toString())
            .emit(`company-${ticket.companyId}-ticket`, {
              action: "delete",
              ticketId: ticket.id
            });

          return {ticket, oldStatus, oldUserId};
        }
        ticketTraking.ratingAt = moment().toDate();
        ticketTraking.rated = false;
      }

      if (completionMessageControl.length >= 2500)
        completionMessageControl = [];

      if (!isNil(complationMessage) && complationMessage !== "" && sendFarewellMessage && !ticket.isGroup) {
        let lastMessage = completionMessageControl.find((o) => o.ticketId === ticket.id || o.dest === ticket.contact.number);
        if (!lastMessage || (lastMessage && lastMessage.time + (1000 * 60 * 30) < new Date().getTime())) {
          if (lastMessage) {
            completionMessageControl = completionMessageControl.filter((o) => o.ticketId !== ticket.id);
            lastMessage = null;
          }

          const body = `\u200e${complationMessage}`;
          await SendPresenceStatus(getWbot(ticket.whatsappId), `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`);

          await SendWhatsAppMessage({body, ticket});
        }

        if (!lastMessage) {
          completionMessageControl.push({ticketId: ticket.id, dest: ticket.contact.number, time: new Date().getTime()});
        }
      }
     // console.trace('update!')

      await ticket.update({
        promptId: null,
        integrationId: null,
        useIntegration: false,
        typebotStatus: false,
        typebotSessionId: null
      })

      ticketTraking.finishedAt = moment().toDate();
      ticketTraking.whatsappId = ticket.whatsappId;
      ticketTraking.userId = ticket.userId;

      /*    queueId = null;
            userId = null; */
    }

    if (queueId !== undefined && queueId !== null) {
      ticketTraking.queuedAt = moment().toDate();
    }

    const settingsTransfTicket = await ListSettingsServiceOne({companyId: companyId, key: "sendMsgTransfTicket"});
    const queue = await Queue.findByPk(queueId);

    if (settingsTransfTicket?.value === "enabled") {
      // Mensagem de transferencia da FILA
      if (oldQueueId !== queueId && oldUserId === userId && !isNil(oldQueueId) && !isNil(queueId)) {

        const wbot = await GetTicketWbot(ticket);
        const msgtxt = "*Mensagem automática*:\nVocê foi transferido para o departamento *" + queue?.name + "*\naguarde, já vamos te atender!";


        await SendPresenceStatus(wbot, `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`);

        const queueChangedMessage = await wbot.sendMessage(
          `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          {
            text: msgtxt
          }
        );
        await verifyMessage(queueChangedMessage, ticket, ticket.contact);
      } else
        // Mensagem de transferencia do ATENDENTE
      if (oldUserId !== userId && oldQueueId === queueId && !isNil(oldUserId) && !isNil(userId)) {
        const wbot = await GetTicketWbot(ticket);
        const nome = await ShowUserService(ticketData.userId);

        const msgtxt = `*Mensagem automática*:\nFoi transferido para o atendente *${nome.name}* por ${tokenData.username} em ${moment().format("DD/MM/YYYY HH:mm:ss")}\nAguarde, já vamos te atender!`;
        await SendPresenceStatus(wbot, `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`);
        const queueChangedMessage = await wbot.sendMessage(
          `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          {
            text: msgtxt
          }
        );
        await verifyMessage(queueChangedMessage, ticket, ticket.contact);
      } else
        // Mensagem de transferencia do ATENDENTE e da FILA
      if (oldUserId !== userId && !isNil(oldUserId) && !isNil(userId) && oldQueueId !== queueId && !isNil(oldQueueId) && !isNil(queueId)) {
        const wbot = await GetTicketWbot(ticket);
        const nome = await ShowUserService(ticketData.userId);
        const previousUser = await ShowUserService(oldUserId); // Obter o nome do atendente anterior
        const msgtxt = `*Mensagem automática*:\nVocê foi transferido para o departamento *${queue?.name}* e contará com a presença de *${nome.name}* transferido por ${tokenData.username} em ${moment().format("DD/MM/YYYY HH:mm:ss")}\naguarde, já vamos te atender!`;
        await SendPresenceStatus(wbot, `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`);

        const queueChangedMessage = await wbot.sendMessage(
          `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          {
            text: msgtxt
          }
        );
        await verifyMessage(queueChangedMessage, ticket, ticket.contact);

        // Mensagem para o atendente atual
        const currentUser = await ShowUserService(userId);
        const msgToCurrentUser = `*Mensagem automática*:\nO atendente anterior *${previousUser.name}* transferiu o ticket para você, *${nome.name}*, em ${moment().format("DD/MM/YYYY HH:mm:ss")}\naguarde, já vamos te atender!`;
        await SendPresenceStatus(wbot, `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`);

        const currentUserMessage = await wbot.sendMessage(
          `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          {
            text: msgToCurrentUser
          }
        );
        await verifyMessage(currentUserMessage, ticket, ticket.contact);
      } else if (oldUserId !== undefined && isNil(userId) && oldQueueId !== queueId && !isNil(queueId)) {

        const wbot = await GetTicketWbot(ticket);
        const msgtxt = "*Mensagem automática*:\nVocê foi transferido para o departamento *" + queue?.name + "*\naguarde, já vamos te atender!";
        await SendPresenceStatus(wbot, `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`);

        const queueChangedMessage = await wbot.sendMessage(
          `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          {
            text: msgtxt
          }
        );
        await verifyMessage(queueChangedMessage, ticket, ticket.contact);
      }
    }

    var isQueueTransfer = oldQueueId !== queueId;

    if (queue) {
      if (isQueueTransfer && queue.newTicketOnTransfer) {

        status = "closed";
      }
    }

    await ticket.update({
      amountUsedBotQueues: ticketData.amountUsedBotQueues || 0,
      status,
      unreadMessages: ticketData.unreadMessages || 0,
      queueId,
      userId,
      whatsappId,
      chatbot,
      queueOptionId
    });

    await ticket.reload();

    if (queue && isQueueTransfer && queue.newTicketOnTransfer && !ticket.chatbot && !ticket.useIntegration) {


      io
        .to(`company-${ticket.companyId}-${oldStatus}`)
        .to(`queue-${ticket.queueId}-${oldStatus}`)
        .emit(`company-${companyId}-ticket`, {
          action: "delete",
          ticketId: ticket.id
        });


      io.to(`company-${ticket.companyId}-${ticket.status}`)
        .to(`company-${ticket.companyId}-notification`)
        .to(`queue-${ticket.queueId}-notification`)
        .to(`queue-${ticket.queueId}-${ticket.status}`)
        .to(ticketId.toString())
        .emit(`company-${companyId}-ticket`, {
          action: "update",
          ticket
        });

      //create new ticket and close the old one.

      ticket = await Ticket.create({
        companyId: companyId,
        contactId: ticket.contactId,
        userId: userId,
        queueId: queueId,
        status: "pending",
        whatsappId: ticket.whatsappId,
        chatbot: chatbot,
        queueOptionId: queueOptionId,
        promptId: promptId,
        useIntegration: useIntegration,
        integrationId: integrationId,
        amountUsedBotQueues: 0,
        unreadMessages: 0,
      });

    }
    status = ticket.status;

    if (status !== undefined && ["pending"].indexOf(status) > -1) {
      ticketTraking.update({
        whatsappId,
        queuedAt: moment().toDate(),
        startedAt: null,
        userId: null
      });
      io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-ticket`, {
        action: "removeFromList",
        ticketId: ticket?.id
      });
    }

    if (status !== undefined && ["open"].indexOf(status) > -1) {
      ticketTraking.update({
        startedAt: moment().toDate(),
        ratingAt: null,
        rated: false,
        whatsappId,
        userId: ticket.userId
      });
      io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-ticket`, {
        action: "removeFromList",
        ticketId: ticket?.id
      });
      io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-ticket`, {
        action: "updateUnread",
        ticketId: ticket?.id
      });
    }

    await ticketTraking.save();


    if (ticket.status !== oldStatus || ticket.user?.id !== oldUserId || isQueueTransfer) {

      io
        .to(`company-${ticket.companyId}-${oldStatus}`)
        .to(`queue-${ticket.queueId}-${oldStatus}`)
        .to(`company-${ticket.companyId}-notification`)
        .to(`queue-${ticket.queueId}-notification`)
        .to(ticketId.toString())
        .emit(`company-${companyId}-ticket`, {
          action: "delete",
          ticketId: ticket.id
        });

    }

    if (ticket.status != "closed") {
      io.to(`company-${ticket.companyId}-${ticket.status}`)
        .to(`company-${ticket.companyId}-notification`)
        .to(`queue-${ticket.queueId}-notification`)
        .to(`queue-${ticket.queueId}-${ticket.status}`)
        .to(ticketId.toString())
        .emit(`company-${companyId}-ticket`, {
          action: "update",
          ticket
        });
    }
    return {ticket, oldStatus, oldUserId};
  } catch (err) {
    console.trace(err);
    Sentry.captureException(err);
  }
};

export default UpdateTicketService;

export const notifyUpdate = (io: Server, ticket: Ticket, ticketId: number, companyId: number) => {
  io.to(`company-${ticket.companyId}-${ticket.status}`)
    .to(`company-${ticket.companyId}-notification`)
    .to(ticketId.toString())
    .emit(`company-${companyId}-ticket`, {
      action: "update",
      ticket
    });
}
