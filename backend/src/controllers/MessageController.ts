import {Request, Response} from "express";
import AppError from "../errors/AppError";

import SetTicketMessagesAsRead from "../helpers/SetTicketMessagesAsRead";
import {getIO} from "../libs/socket";
import Message from "../models/Message";
import Ticket from "../models/Ticket";
import Queue from "../models/Queue";
import User from "../models/User";
import Whatsapp from "../models/Whatsapp";
import formatBody from "../helpers/Mustache";

import ListMessagesService from "../services/MessageServices/ListMessagesService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import FindOrCreateTicketService from "../services/TicketServices/FindOrCreateTicketService";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import DeleteWhatsAppMessage from "../services/WbotServices/DeleteWhatsAppMessage";
import SendWhatsAppMedia, {SendWhatsAppMediaFileAddress} from "../services/WbotServices/SendWhatsAppMedia";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import SendWhatsAppReaction from "../services/WbotServices/SendWhatsAppReaction";
import CheckContactNumber from "../services/WbotServices/CheckNumber";
import CheckIsValidContact from "../services/WbotServices/CheckIsValidContact";
import EditWhatsAppMessage from "../services/WbotServices/EditWhatsAppMessage";

import TranscreveAudioService from "../services/MessageServices/TranslateAudioService";
import TranslateAudioService from "../services/MessageServices/TranslateAudioService";

import CreateOrUpdateContactService from "../services/ContactServices/CreateOrUpdateContactService";
import ShowMessageService, {GetWhatsAppFromMessage} from "../services/MessageServices/ShowMessageService";
import {ShowContactService1} from "../services/ContactServices/ShowContactService";
import ShowUserService from "../services/UserServices/ShowUserService";
import {firstQueueThisUser} from "../utils/user";
import {notifyUpdate} from "../services/TicketServices/UpdateTicketService";
import ListAllMessagesService from "../services/MessageServices/ListAllMessagesService";
import {toBoolean} from "validator";

import ffmpegPath from "ffmpeg-static";

import ffmpeg from "fluent-ffmpeg";


import crypto from "crypto";
import GetWhatsappWbot from "../helpers/GetWhatsappWbot";
import UserQueue from '../models/UserQueue';
import {getWbot} from "../libs/wbot";
import {SendPausedStatus, SendTypingStatus} from "../helpers/SendPresenceStatus";

ffmpeg.setFfmpegPath(ffmpegPath);

type IndexQuery = {
  pageNumber: string;
};

type MessageData = {
  body: string;
  fromMe: boolean;
  isGroup: boolean;
  read: boolean;
  vCard?: any;
  quotedMsg?: Message;
  number?: string;
  closeTicket?: true;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const {ticketId} = req.params;
  const {pageNumber} = req.query as IndexQuery;
  const {companyId, profile} = req.user;
  const queues: number[] = [];

  if (profile !== "admin") {
    const user = await User.findByPk(req.user.id, {
      include: [{model: Queue, as: "queues"}]
    });
    user.queues.forEach(queue => {
      queues.push(queue.id);
    });
  }

  const {count, messages, ticket, hasMore} = await ListMessagesService({
    pageNumber,
    ticketId,
    companyId,
    queues
  });

  SetTicketMessagesAsRead(ticket);

  return res.json({count, messages, ticket, hasMore});
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const {ticketId} = req.params;
  const {body, quotedMsg, vCard}: MessageData = req.body;
  const medias = req.files as Express.Multer.File[];
  const {companyId, id} = req.user;

  const ticket = await ShowTicketService(ticketId, companyId);

  if (ticket.status !== "open") {
    await UpdateTicketService({
      ticketId: ticket.id,
      ticketData: {status: "open", userId: parseInt(id)},
      companyId
    });

  }

  if (ticket.unreadMessages > 0)
    SetTicketMessagesAsRead(ticket);

  if (medias) {
    await Promise.all(
      medias.map(async (media: Express.Multer.File, index) => {
        return SendWhatsAppMedia({media, ticket, body: Array.isArray(body) ? body[index] : body})
      }));
  } else {
    const send = await SendWhatsAppMessage({
      body, ticket, quotedMsg,
      vCard
    });
  }

  return res.send();
};

export const getAll = async (req: Request, res: Response): Promise<Response> => {
  const dateStart = req.query.dateStart as string;
  const dateEnd = req.query.dateEnd as string;
  const fromMe = toBoolean(req.query.fromMe as string);


  const {companyId} = req.user;

  const {count} = await ListAllMessagesService({
    companyId,
    fromMe,
    dateStart,
    dateEnd
  });

  return res.json({count});

}
export const edit = async (req: Request, res: Response): Promise<Response> => {
  const {messageId} = req.params;
  const {companyId} = req.user;
  const {body}: MessageData = req.body;

  const {ticketId, message} = await EditWhatsAppMessage({messageId, companyId, body});

  const io = getIO();
  io.to(ticketId.toString()).emit(`company-${companyId}-appMessage`, {
    action: "update",
    message
  });

  return res.send();
}

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const {messageId} = req.params;
  const {companyId} = req.user;

  const message = await DeleteWhatsAppMessage(messageId);

  const io = getIO();

  io.to(message.ticketId.toString()).emit(`company-${companyId}-appMessage`, {
    action: "update",
    message
  });

  return res.send();
};

export const typing = async (req: Request, res: Response): Promise<Response> => {
  const {ticketId} = req.params;
  const {companyId} = req.user
  const {status} = req.query ;

  if (!ticketId)
    return res.status(400).send("TicketId is required");

  const ticket = await ShowTicketService(ticketId, companyId);
  if (!ticket)
    return res.status(404).send("Ticket not found");

  let wbot = getWbot(ticket.whatsappId);
  if (status == 'true') {

    await SendTypingStatus(wbot, `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`);
  } else {
    await SendPausedStatus(wbot, `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`);
  }

  return res.status(200).send(`Status ${status} enviado com sucesso`);

}

export const send = async (req: Request, res: Response): Promise<Response> => {
  const {whatsappId} = req.params as unknown as { whatsappId: number };
  const messageData: MessageData = req.body;
  const medias = req.files as Express.Multer.File[];

  try {
    const whatsapp = await Whatsapp.findByPk(whatsappId);

    if (!whatsapp) {
      throw new Error("Não foi possível realizar a operação");
    }

    if (messageData.number === undefined) {
      throw new Error("O número é obrigatório");
    }

    const numberToTest = messageData.number;
    const body = messageData.body;

    const companyId = whatsapp.companyId;

    const CheckValidNumber = await CheckContactNumber(numberToTest, companyId);
    var isGroup = CheckValidNumber.jid.includes("@g.us");
    console.log(isGroup);

    const number = CheckValidNumber.jid.replace("@s.whatsapp.net", "").replace("@g.us", "");


    const contactData = {
      name: `${number}`,
      number,
      //     profilePicUrl,
      isGroup,
      companyId
    };

    const wbot = await GetWhatsappWbot(whatsapp);

    const contact = await CreateOrUpdateContactService(contactData, wbot, CheckValidNumber.jid);

    const ticket = await FindOrCreateTicketService(contact, whatsapp.id!, 0, companyId);

    if (medias) {
      await Promise.all(
        medias.map(async (media: Express.Multer.File) => {
          await req.app.get("queues").messageQueue.add(
            "SendMessage",
            {
              whatsappId,
              data: {
                number,
                body: body ? formatBody(body, ticket) : media.originalname,
                mediaPath: media.path,
                finalName: media.filename,
                fileName: media.originalname
              }
            },
            {removeOnComplete: true, attempts: 3}
          );
        })
      );
    } else {
      await SendWhatsAppMessage({body: formatBody(body, ticket), ticket});
    }

    if (messageData.closeTicket) {
      setTimeout(async () => {
        await UpdateTicketService({
          ticketId: ticket.id,
          ticketData: {status: "closed"},
          companyId
        });
      }, 1000);
    }

    await SetTicketMessagesAsRead(ticket);

    return res.send({mensagem: "Mensagem enviada"});
  } catch (err: any) {
    console.log(err);
    if (Object.keys(err).length === 0) {
      throw new AppError(
        "Não foi possível enviar a mensagem, tente novamente em alguns instantes"
      );
    } else {
      throw new AppError(err.message);
    }
  }
};

export const addReaction = async (req: Request, res: Response): Promise<Response> => {
  try {
    const {messageId} = req.params;
    const {type} = req.body; // O tipo de reação, por exemplo, 'like', 'heart', etc.
    const {companyId, id} = req.user;

    const message = await Message.findByPk(messageId);

    const ticket = await Ticket.findByPk(message.ticketId, {
      include: ["contact"]
    });

    if (!message) {
      return res.status(404).send({message: "Mensagem não encontrada"});
    }

    // Envia a reação via WhatsApp
    const reactionResult = await SendWhatsAppReaction({
      messageId: messageId,
      ticket: ticket,
      reactionType: type
    });

    // Atualiza a mensagem com a nova reação no banco de dados (opcional, dependendo da necessidade)
    const updatedMessage = await message.update({
      reactions: [...message.reactions, {type: type, userId: id}]
    });

    const io = getIO();
    io.to(message.ticketId.toString()).emit(`company-${companyId}-appMessage`, {
      action: "update",
      message
    });

    return res.status(200).send({
      message: 'Reação adicionada com sucesso!',
      reactionResult,
      reactions: updatedMessage.reactions
    });
  } catch (error) {
    console.error('Erro ao adicionar reação:', error);
    if (error instanceof AppError) {
      return res.status(400).send({message: error.message});
    }
    return res.status(500).send({message: 'Erro ao adicionar reação', error: error.message});
  }
};

export const storeAudio = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;
  const audio = req.file as Express.Multer.File;
  let textTranslate = '';
  const outputFilename = generateRandomFilename();
  const outputPath = `./public/company${companyId}/${outputFilename}`;
  await convertToMp3(audio.path, outputPath);
  if (audio) {
    textTranslate = await TranslateAudioService(outputPath);
  }
  return res.send(textTranslate || 'Transcrição não disponível');
};

function convertToMp3(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('mp3')
      .on('end', () => {
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('Erro na conversão do áudio:', err);
        reject(err);
      })
      .saveToFile(outputPath);
  });
}

function generateRandomFilename() {
  const randomId = crypto.randomBytes(16).toString('hex');
  return randomId + '.mp3';
}

export const forwardMessage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  console.log('>>>>>>>>>>>>>>>>>forwardMessage X<<<<<<<<<<<<<<<<<<<');
  const {body, quotedMsg}: MessageData = req.body;
  const messageId = req.body.messageId;
  const contactId = req.body.contactId;

  if (!messageId || !contactId) {
    return res.status(200).send("MessageId or ContactId not found");
  }
  const message = await ShowMessageService(messageId);
  const contact = await ShowContactService1(contactId);

  if (!message) {
    return res.status(404).send("Message not found");
  }
  if (!contact) {
    return res.status(404).send("Contact not found");
  }

  const whatsAppConnectionId = await GetWhatsAppFromMessage(message);
  if (!whatsAppConnectionId) {
    return res.status(404).send('Whatsapp from message not found');
  }

  const companyId = req.user.companyId; // verificar
  const ticket = await FindOrCreateTicketService(contact, whatsAppConnectionId, 0, companyId);

  await SetTicketMessagesAsRead(ticket);

  if (message.mediaType === 'conversation' || message.mediaType === 'extendedTextMessage') {
    await SendWhatsAppMessage({body: message.body, ticket, quotedMsg});
  } else {
    await SendWhatsAppMediaFileAddress(message.mediaUrl || '', ticket, message.body); // função com erro
  }
  const user = await ShowUserService(req.user.id);
  const queueId = await firstQueueThisUser(user);
  ticket.status = 'open';
  ticket.queueId = queueId?.id || null;
  ticket.userId = user.id;
  ticket.save();
  const io = getIO();
  notifyUpdate(io, ticket, ticket.id, companyId);

  return res.send();
}
