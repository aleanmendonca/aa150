import {Request, Response} from "express";
import Ticket from "../models/Ticket";
import {Op} from "sequelize";
import moment from "moment/moment";
import User from "../models/User";
import Queue from "../models/Queue";
import TicketTag from "../models/TicketTag";
import Tag from "../models/Tag";
import Whatsapp from "../models/Whatsapp";
import TicketTraking from "../models/TicketTraking";
import Contact from "../models/Contact";


const ReportController = {
  tickets: async (req: Request, res: Response) => {
    const {companyId} = req.user;

    let {dateStart, dateEnd, status, queueId} = req.body;

    let filter: any = {
      companyId,
    }
    if (queueId) {
      filter.queueId = queueId;
    }

    if (status) {
      filter.status = status;
    }

    let tickets = await Ticket.findAll({
      where: {
        ...filter,
        createdAt: {
          [Op.between]: [moment(dateStart).startOf('day').toDate(), moment(dateEnd).endOf('day').toDate()]
        }
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "profile"]
        },
        {
          model: Queue,
          as: "queue",
          attributes: ["id", "name"],

        },
        {
          model: Whatsapp,
          as: "whatsapp",
          attributes: ["id", "name"]
        }
      ],
      attributes: ["id", "createdAt", "status", "queueId", "userId", "contactId"],
      order: [["createdAt", "DESC"]],

    });

    let parsedTickets = [];
    //iterate over tickets and add tags
    for (let ticket of tickets) {
      const tags = await TicketTag.findAll({
        attributes: ["tagId"],
        where: {
          ticketId: ticket.id
        },
        include: [
          {
            model: Tag,
            as: "tag",
            attributes: ["id", "name"]
          }
        ]
      });


      var tracking = await TicketTraking.findOne({
        where: {
          ticketId: ticket.id
        },
        attributes: ["startedAt", "queuedAt", "ratingAt", "rated", "createdAt", "finishedAt"]
      });

      let contact = await Contact.findOne({
        attributes: ["createdAt", "name", "number"],
        where: {
          id: ticket.contactId
        }
      });

      //check if contact created date is near ticket created date
      let newContact = false;
      if (contact) {
        newContact = moment(contact.createdAt).isBetween(moment(ticket.createdAt).subtract(1, 'minute'), moment(ticket.createdAt).add(1, 'minute'));
      }

      parsedTickets.push({
        id: ticket.id,
        contactName: contact?.name || "N/A",
        contactNumber: contact?.number || "N/A",
        createdAt: ticket?.createdAt,
        startedAt: tracking?.startedAt,
        queuedAt: tracking?.queuedAt,
        ratingAt: tracking?.ratingAt,
        rated: tracking?.rated,
        status: ticket.status,
        user: ticket.user?.name || "N/A",
        userId: ticket.userId,
        queue: ticket.queue?.name || "N/A",
        queueId: ticket.queueId,
        connection: ticket.whatsapp.name,
        connectionId: ticket.whatsapp.id,
        firstSentMessageAt: tracking?.createdAt,
        resolvedAt: tracking?.finishedAt,
        isNewContact: newContact,
        tags: tags.map(tag => tag.tag.name).join(','),
      });
    }


    /*


     */

   return res.json(parsedTickets);

  }
}
export default ReportController;
