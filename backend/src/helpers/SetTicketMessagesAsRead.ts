import { proto, WASocket } from "@whiskeysockets/baileys";
// import cacheLayer from "../libs/cache";
import { getIO } from "../libs/socket";
import Message from "../models/Message";
import Ticket from "../models/Ticket";
import { logger } from "../utils/logger";
import GetTicketWbot from "./GetTicketWbot";
import { cacheLayer } from "../libs/cache";

const SetTicketMessagesAsRead = async (ticket: Ticket): Promise<void> => {

  //console.trace('read msg');
  async function sendReadReceipt(wbot, remoteJid, participant, id) {
    await (wbot as WASocket).sendReceipt(
      remoteJid,
      participant,
      [id],
      'read'
    );
  }

  await ticket.update({ unreadMessages: 0 });


  try {
    const wbot = await GetTicketWbot(ticket);

    const getJsonMessage = await Message.findAll({
      where: {
        ticketId: ticket.id,
        fromMe: false,
        read: false
      },
      order: [["createdAt", "DESC"]]
    });

    getJsonMessage.map(async m => {
      const message: proto.IWebMessageInfo = JSON.parse(m.dataJson);
      if (message.key) {
        await (wbot as WASocket).readMessages([message.key]);
      }
    });

   if (getJsonMessage.length > 0) {
     const lastMessages: proto.IWebMessageInfo = JSON.parse( getJsonMessage[0].dataJson );
     const number: string = ticket.isGroup ? `${ticket.contact.number.substring(12,0)}-${ticket.contact.number.substring(12)}@g.us` : `${ticket.contact.number}@s.whatsapp.net`

      if (lastMessages.key && lastMessages.key.fromMe === false) {
        await (wbot as WASocket).chatModify(
          { markRead: true, lastMessages: [lastMessages] },
          number
        );
      }
    }

    await Message.update(
      { read: true },
      {
        where: {
          ticketId: ticket.id,
          read: false
        }
      }
    );

    await cacheLayer.set(`contacts:${ticket.contactId}:unreads`, "0");


  } catch (err) {
    logger.warn(
      `Could not mark messages as read. Maybe whatsapp session disconnected? Err: ${err}`
    );
  }

  const io = getIO();
  io.to(`company-${ticket.companyId}-${ticket.status}`)
    .to(`company-${ticket.companyId}-notification`)
    .emit(`company-${ticket.companyId}-ticket`, {
    action: "updateUnread",
    ticketId: ticket.id
  });
};

export default SetTicketMessagesAsRead;
