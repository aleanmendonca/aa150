import AppError from "../../errors/AppError";
import Whatsapp from "../../models/Whatsapp";
import Ticket from "../../models/Ticket";
import add from "date-fns/add";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import {dataMessages, getWbot} from "../../libs/wbot";
import {getIO} from "../../libs/socket";
import {handleMessage} from "../WbotServices/wbotMessageListener";
import moment from "moment";
import {Op, QueryTypes, Sequelize} from "sequelize";

export const closeImportedTickets = async whatsappId => {
  console.log("closeImportedTickets");
  const pendingTickets = await Ticket.findAll({
    where: {
      status: "pending",
      whatsappId: whatsappId,
      imported: {
        [Op.lt]: +add(new Date(), {
          hours: +5
        })
      }
    }
  });
  for (const ticket of pendingTickets) {
    await new Promise(a => setTimeout(a, 330));
    await UpdateTicketService({
      ticketData: {
        status: "closed"
      },
      ticketId: ticket.id,
      companyId: ticket.companyId
    });
  }
  let targetWhatsapp = await Whatsapp.findByPk(whatsappId);
  targetWhatsapp.update({
    statusImportMessages: null
  });
  const io = getIO();
  io
    .to(`company-${targetWhatsapp.companyId}-mainchannel`)
    .emit("importMessages-" + targetWhatsapp.companyId, {
    action: "refresh"
  });
};

function compareMessageTimestamps(a, b) {
  return b.messageTimestamp - a.messageTimestamp;
}

function removeDuplicateById(a) {
  const map = new Map();
  const uniqueIds = [];
  for (const d of a) {
    const a = d.key.id;
    if (!map.has(a)) {
      map.set(a, true);
      uniqueIds.push(d);
    }
  }
  return uniqueIds.sort(compareMessageTimestamps);
}

const ImportWhatsAppService = async (targetWhatsapp: Whatsapp) => {
  //let targetWhatsapp = await Whatsapp.findByPk(whatsappId);
  const wbot = getWbot(targetWhatsapp.id);
  try {
    const io = getIO();
    const messageList = removeDuplicateById(dataMessages[targetWhatsapp.id]);

    console.log("processImportMessagesWppId");

    const messageCount = messageList.length;
    let currentIndex = 0;
    while (currentIndex < messageCount) {
      try {
        const currentMessage = messageList[currentIndex];

        await handleMessage(currentMessage, wbot, targetWhatsapp.companyId, true);
        if (currentIndex % 2 === 0) {
          const a = Math.floor(currentMessage.messageTimestamp.low * 1000);
          io.emit("importMessages-" + targetWhatsapp.companyId, {
            action: "update",
            status: {
              this: currentIndex + 1,
              all: messageCount,
              date: moment(a).format("DD/MM/YY HH:mm:ss")
            }
          });
        }
        if (currentIndex + 1 === messageCount) {
          dataMessages[targetWhatsapp.id] = [];
          if (targetWhatsapp.closedTicketsPostImported) {
            await closeImportedTickets(targetWhatsapp.id);
          }
          await targetWhatsapp.update({
            statusImportMessages: targetWhatsapp.closedTicketsPostImported ? null : "renderButtonCloseTickets",
            importOldMessages: null,
            importRecentMessages: null
          });
          io

            .to(`company-${targetWhatsapp.companyId}-mainchannel`)

            .emit("importMessages-" + targetWhatsapp.companyId, {
            action: "refresh"
          });
        }
      } catch (a) {
        console.log(a);
        console.log("ERROR_IMPORTING_MESSAGE");
      }
      currentIndex++;
    }
  } catch (a) {
    console.log(a);
    throw new AppError("ERR_NOT_MESSAGE_TO_IMPORT", 403);
  }
  return "whatsapps";
};

export default ImportWhatsAppService;


