import {WAMessage} from "@whiskeysockets/baileys";
import * as Sentry from "@sentry/node";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import _ from "lodash";
import formatBody from "../../helpers/Mustache";

interface Request {
  body: string;
  ticket: Ticket;
  quotedMsg?: Message;
  vCard?: any;
}

const SendWhatsAppMessage = async ({
                                     body,
                                     ticket,
                                     quotedMsg,
                                     vCard
                                   }: Request): Promise<WAMessage> => {
  let options = {};

  const wbot = await GetTicketWbot(ticket);

  if (!wbot) {
    throw new AppError("ERR_WBOT_NOT_FOUND");
  }


  const number = `${ticket.contact.number}@${
    ticket.isGroup ? "g.us" : "s.whatsapp.net"
  }`;
  if (quotedMsg) {
    const chatMessage = await Message.findOne({
      where: {
        id: quotedMsg.id
      }
    });

    if (chatMessage) {
      const msgFound = JSON.parse(chatMessage.dataJson);

      options = {
        quoted: {
          key: msgFound.key || chatMessage.id,
          message: {
            extendedTextMessage: msgFound?.message.extendedTextMessage
          }
        }
      };
    }

  }


  if (!_.isNil(vCard)) {
    const vcardNumber = vCard.number;
    const contactName = vCard.name.split(" ")[0];
    const trimName = String(vCard.name).replace(vCard.name.split(" ")[0], "");
    const vcardBody = "BEGIN:VCARD\nVERSION:3.0\n" + ("N:" + trimName + ";" + contactName + ";;;\n") + ("FN:" + vCard.name + "\n") + ("TEL;type=CELL;waid=" + vcardNumber + ":+" + vcardNumber + "\n") + "END:VCARD";
    try {

      const msg = await wbot.sendMessage(number, {
        contacts: {
          displayName: "" + vCard.name,
          contacts: [{
            vcard: vcardBody
          }]
        }
      });
      await ticket.update({
        lastMessage: formatBody(vcardBody, ticket),
        imported: null
      });
      return msg;
    } catch (err) {
      Sentry.captureException(err);

      console.trace(err);
      throw new AppError("ERR_SENDING_WAPP_MSG");
    }
  }

  try {

    const sentMessage = await wbot.sendMessage(number, {
        text: formatBody(body, ticket)
      },
      {
        ...options
      }
    );

    return sentMessage;
  } catch (err) {
    Sentry.captureException(err);
    console.log(err);
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMessage;
