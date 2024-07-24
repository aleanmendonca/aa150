import {getIO} from "../../libs/socket";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import OldMessage from "../../models/OldMessage";
import Tag from "../../models/Tag";

interface MessageData {
  id: string;
  ticketId: number;
  body: string;
  contactId?: number;
  fromMe?: boolean;
  read?: boolean;
  mediaType?: string;
  mediaUrl?: string;
  ack?: number;
  queueId?: number;
}

interface Request {
  messageData: MessageData;
  ticket: Ticket;
  companyId: number;
}

const CreateMessageService = async ({
                                      messageData,
                                      ticket,
                                      companyId
                                    }: Request): Promise<Message> => {


  await Message.upsert({...messageData, companyId});

  const message = await Message.findByPk(messageData.id, {
		include: [
			"contact",
			{
				model: Ticket,
				as: "ticket",
				include: ["contact", "queue", "whatsapp"]
			},
			{
				model: Message,
				as: "quotedMsg",
				include: ["contact"]
			},
			{
				model: OldMessage,
				as: "oldMessages"
			}
		]
	});

  await ticket.contact.update({presence: "available"});
  await ticket.contact.reload();

  if (ticket.queueId !== null && message.queueId === null) {
    await message.update({queueId: ticket.queueId});
  }

  if (!message) {
    throw new Error("ERR_CREATING_MESSAGE");
  }

  const io = getIO();
  io.to(message.ticketId.toString())
    .to(`company-${companyId}-${ticket.status}`)
    .to(`company-${companyId}-notification`)
    .to(`queue-${message.queueId}-notification`)
    .to(`queue-${message.queueId}-${ticket.status}`)

    .emit(`company-${companyId}-appMessage`, {
      action: "create",
      message,
      ticket: ticket,
      contact: ticket.contact
    });

  io.to(`company-${companyId}-mainchannel`)
    .emit(`company-${companyId}-contact`, {
      action: "update",
      contact: ticket.contact
    });

  return message;
};

export default CreateMessageService;
