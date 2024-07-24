import {
  WASocket,
  BinaryNode,
  Contact as BContact,
} from "@whiskeysockets/baileys";
import * as Sentry from "@sentry/node";

import {Op} from "sequelize";
// import { getIO } from "../../libs/socket";
import {Store} from "../../libs/store";
import Contact from "../../models/Contact";
import Setting from "../../models/Setting";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import {logger} from "../../utils/logger";
import createOrUpdateBaileysService from "../BaileysServices/CreateOrUpdateBaileysService";
import CreateMessageService from "../MessageServices/CreateMessageService";
import {SendPresenceStatus} from "../../helpers/SendPresenceStatus";

type Session = WASocket & {
  id?: number;
  store?: Store;
};

interface IContact {
  contacts: BContact[];
}

let messageControl: any[] = [];


const wbotMonitor = async (
  wbot: Session,
  whatsapp: Whatsapp,
  companyId: number
): Promise<void> => {

  try {
    wbot.ws.on("CB:call", async (node: BinaryNode) => {
      const content = node.content[0] as any;

      if (content.tag === "offer") {
        const {from, id} = node.attrs;

      }

      if (content.tag === "terminate") {
        const sendMsgCall = await Setting.findOne({
          where: {key: "call", companyId},
        });

        //if messageControl has a value, it means that the message was already sent


        if (sendMsgCall.value === "disabled") {

          if (messageControl.length > 5000)
            messageControl = [];

          var lastMessage = messageControl.find((element) => element.from === node.attrs.from);
          if (!lastMessage || (lastMessage && new Date().getTime() - lastMessage.time >= 1000 * 60 * 5)) {

            await SendPresenceStatus(wbot, node.attrs.from);

            await wbot.sendMessage(node.attrs.from, {
              text:
                "*Mensagem Automática:*\n\nAs chamadas de voz e vídeo estão desabilitas para esse WhatsApp, favor enviar uma mensagem de texto. Obrigado",
            });

            if (lastMessage) {
              lastMessage = null;
              messageControl = messageControl.filter((element) => element.from !== node.attrs.from);
            }
          }

          if (!lastMessage) {
            messageControl.push(
              {
                from: node.attrs.from, time: new Date().getTime()
              });
          }

          const number = node.attrs.from.replace(/\D/g, "");

          const contact = await Contact.findOne({
            where: {companyId, number},
          });

          const ticket = await Ticket.findOne({
            where: {
              contactId: contact.id,
              whatsappId: wbot.id,
              status: "open",
              companyId
            },
          });
          // se não existir o ticket não faz nada.
          if (!ticket) return;

          const date = new Date();
          const hours = date.getHours();
          const minutes = date.getMinutes();

          const body = `Chamada de voz/vídeo perdida às ${hours}:${minutes}`;
          const messageData = {
            id: content.attrs["call-id"],
            ticketId: ticket.id,
            contactId: contact.id,
            body,
            fromMe: false,
            mediaType: "call_log",
            read: true,
            quotedMsgId: null,
            ack: 1,
          };
          if (typeof body != "string") {
            console.trace("body is not a string", body);
          }
          await ticket.update({
            lastMessage: body,
          });


          if (ticket.status === "closed") {
            await ticket.update({
              status: "pending",
            });
          }

          return CreateMessageService({messageData,ticket, companyId: companyId});
        }
      }
    });

    wbot.ev.on("contacts.upsert", async (contacts: BContact[]) => {

      await createOrUpdateBaileysService({
        whatsappId: whatsapp.id,
        contacts,
      });
    });

  } catch (err) {
    Sentry.captureException(err);
    logger.error(err);
  }
};

export default wbotMonitor;
