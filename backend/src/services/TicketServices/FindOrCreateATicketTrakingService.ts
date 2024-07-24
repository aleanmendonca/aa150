import { Op } from "sequelize";
import TicketTraking from "../../models/TicketTraking";

interface Params {
  ticketId: string | number;
  companyId: string | number;
  whatsappId?: string | number;
  userId?: string | number;
}

const FindOrCreateATicketTrakingService = async ({
  ticketId,
  companyId,
  whatsappId,
  userId
}: Params): Promise<TicketTraking> => {

  if (!ticketId){
    console.trace('ticketId is required')
    return;
  }
  if (!companyId){
    console.trace('companyId is required')
    return;
  }
  if (!companyId){
    console.trace('whatsappId is required')
    return;
  }

  const ticketTraking = await TicketTraking.findOne({
    where: {
      ticketId,
      finishedAt: {
        [Op.is]: null
      }
    }
  });

  if (ticketTraking) {
    return ticketTraking;
  }

  const newRecord = await TicketTraking.create({
    ticketId,
    companyId,
    whatsappId,
    userId,

  });

  return newRecord;
};

export default FindOrCreateATicketTrakingService;
