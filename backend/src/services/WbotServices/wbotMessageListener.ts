import path, {join} from "path";
import {promisify} from "util";
import {readFile, writeFile} from "fs";
import * as Sentry from "@sentry/node";
import {v4 as uuidv4} from 'uuid';
import {isNil, isNull, head} from "lodash";
import axios from 'axios';

import {
  downloadMediaMessage,
  extractMessageContent,
  downloadContentFromMessage,
  MediaType,
  BinaryNode,
  getContentType,
  jidNormalizedUser,
  MessageUpsertType,
  proto,
  WAMessage,
  WAMessageStubType,
  WAMessageUpdate,
  WASocket,
  GroupMetadata,
} from "@whiskeysockets/baileys";

import * as MessageUtils from "./wbotGetMessageFromType";

import {Transform} from "stream";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import OldMessage from "../../models/OldMessage";

import {getIO} from "../../libs/socket";
import CreateMessageService from "../MessageServices/CreateMessageService";
import {logger} from "../../utils/logger";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import formatBody from "../../helpers/Mustache";
import {Store} from "../../libs/store";
import TicketTraking from "../../models/TicketTraking";
import UserRating from "../../models/UserRating";
import SendWhatsAppMessage from "./SendWhatsAppMessage";
import moment from "moment";
import Queue from "../../models/Queue";
import QueueOption from "../../models/QueueOption";
import FindOrCreateATicketTrakingService from "../TicketServices/FindOrCreateATicketTrakingService";
import VerifyCurrentSchedule from "../CompanyService/VerifyCurrentSchedule";
import Campaign from "../../models/Campaign";
import CampaignShipping from "../../models/CampaignShipping";
import {Op} from "sequelize";
import {campaignQueue, messageQueue, parseToMilliseconds, randomValue} from "../../queues";
import User from "../../models/User";
import Setting from "../../models/Setting";
import {cacheLayer} from "../../libs/cache";
import {debounce} from "../../helpers/Debounce";
import {ChatCompletionRequestMessage, Configuration, OpenAIApi} from "openai";
import ffmpeg from "fluent-ffmpeg";
import {
  SpeechConfig,
  SpeechSynthesizer,
  AudioConfig
} from "microsoft-cognitiveservices-speech-sdk";

import {provider} from "./providers";

import typebotListener from "../TypebotServices/typebotListener";
import QueueIntegrations from "../../models/QueueIntegrations";
import ShowQueueIntegrationService from "../QueueIntegrationServices/ShowQueueIntegrationService";
import {getMessageOptions} from "./SendWhatsAppMedia";
import MarkDeleteWhatsAppMessage from "./MarkDeleteWhatsAppMessage";
import Whatsapp from "../../models/Whatsapp";

import fs from "fs";
import request from "request";
import ffmpegPath from 'ffmpeg-static';
import app from "../../app";
import {getViewOnceMessageV2} from "./wbotGetMessageFromType";
import mime from "mime";
import {getWbot} from "../../libs/wbot";
import {SendPresenceStatus} from "../../helpers/SendPresenceStatus";

ffmpeg.setFfmpegPath(ffmpegPath);

type Session = WASocket & {
  id?: number;
  store?: Store;
};

interface SessionOpenAi extends OpenAIApi {
  id?: number;
}

const sessionsOpenAi: SessionOpenAi[] = [];

interface ImessageUpsert {
  messages: proto.IWebMessageInfo[];
  type: MessageUpsertType;
}

interface IMe {
  name: string;
  id: string;
}

interface IMessage {
  messages: WAMessage[];
  isLatest: boolean;
}

export const isNumeric = (value: string) => /^-?\d+$/.test(value);

let outOfHourMessageControl: any[] = [];
let completionMessageControl: any[] = [];
let greetingMessageControl: any[] = [];
let farewellMessageControl: any[] = [];

const writeFileAsync = promisify(writeFile);

const getTypeMessage = (msg: proto.IWebMessageInfo): string => {
  return getContentType(msg.message);
};

export const removeNonPrintableChars = (text): string => {
  return text.replace(/[\x00-\x1F\x7F-\x9F]/g, "");
}


async function getQueues(companyId: number): Promise<Queue[]> {
  try {
    const queues = await Queue.findAll({
      where: {companyId: companyId}
    });
    return queues;
  } catch (error) {
    console.error("Failed to fetch queues:", error);
    return [];
  }
}

async function getContactFromTicket(ticketId: number): Promise<Contact | null> {
  try {
    const ticket = await Ticket.findByPk(ticketId, {
      include: [{
        model: Contact,
        as: 'contact' // Certifique-se de que o alias está correto conforme definido em suas associações
      }]
    });

    if (ticket && ticket.contact) {
      return ticket.contact;
    } else {
      console.log("No contact found for this ticket.");
      return null;
    }
  } catch (error) {
    console.error("Failed to fetch contact from ticket:", error);
    return null;
  }
}

export function validaCpfCnpj(val) {
  if (val.length == 11) {
    var cpf = val.trim();

    cpf = cpf.replace(/\./g, '');
    cpf = cpf.replace('-', '');
    cpf = cpf.split('');

    var v1 = 0;
    var v2 = 0;
    var aux = false;

    for (var i = 1; cpf.length > i; i++) {
      if (cpf[i - 1] != cpf[i]) {
        aux = true;
      }
    }

    if (aux == false) {
      return false;
    }

    for (var i = 0, p = 10; (cpf.length - 2) > i; i++, p--) {
      v1 += cpf[i] * p;
    }

    v1 = ((v1 * 10) % 11);

    if (v1 == 10) {
      v1 = 0;
    }

    if (v1 != cpf[9]) {
      return false;
    }

    for (var i = 0, p = 11; (cpf.length - 1) > i; i++, p--) {
      v2 += cpf[i] * p;
    }

    v2 = ((v2 * 10) % 11);

    if (v2 == 10) {
      v2 = 0;
    }

    if (v2 != cpf[10]) {
      return false;
    } else {
      return true;
    }
  } else if (val.length == 14) {
    var cnpj = val.trim();

    cnpj = cnpj.replace(/\./g, '');
    cnpj = cnpj.replace('-', '');
    cnpj = cnpj.replace('/', '');
    cnpj = cnpj.split('');

    var v1 = 0;
    var v2 = 0;
    var aux = false;

    for (var i = 1; cnpj.length > i; i++) {
      if (cnpj[i - 1] != cnpj[i]) {
        aux = true;
      }
    }

    if (aux == false) {
      return false;
    }

    for (var i = 0, p1 = 5, p2 = 13; (cnpj.length - 2) > i; i++, p1--, p2--) {
      if (p1 >= 2) {
        v1 += cnpj[i] * p1;
      } else {
        v1 += cnpj[i] * p2;
      }
    }

    v1 = (v1 % 11);

    if (v1 < 2) {
      v1 = 0;
    } else {
      v1 = (11 - v1);
    }

    if (v1 != cnpj[12]) {
      return false;
    }

    for (var i = 0, p1 = 6, p2 = 14; (cnpj.length - 1) > i; i++, p1--, p2--) {
      if (p1 >= 2) {
        v2 += cnpj[i] * p1;
      } else {
        v2 += cnpj[i] * p2;
      }
    }

    v2 = (v2 % 11);

    if (v2 < 2) {
      v2 = 0;
    } else {
      v2 = (11 - v2);
    }

    if (v2 != cnpj[13]) {
      return false;
    } else {
      return true;
    }
  } else {
    return false;
  }
}


function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function sleep(time) {
  await timeout(time);
}

export const sendMessageImage = async (
  wbot: Session,
  contact,
  ticket: Ticket,
  url: string,
  caption: string
) => {

  let sentMessage
  try {
    sentMessage = await wbot.sendMessage(
      `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
      {
        image: url ? {url} : fs.readFileSync(`public/temp/${caption}-${makeid(10)}`),
        fileName: caption,
        caption: caption,
        mimetype: 'image/jpeg'
      }
    );
  } catch (error) {
    sentMessage = await wbot.sendMessage(
      `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
      {
        text: formatBody('Não consegui enviar o PDF, tente novamente!', ticket)
      }
    );
  }
  verifyMessage(sentMessage, ticket, contact);
};

export const sendMessageLink = async (
  wbot: Session,
  contact: Contact,
  ticket: Ticket,
  url: string,
  caption: string
) => {

  let sentMessage
  try {
    sentMessage = await wbot.sendMessage(
      `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
        document: url ? {url} : fs.readFileSync(`public/temp/${caption}-${makeid(10)}`),
        fileName: caption,
        caption: caption,
        mimetype: 'application/pdf'
      }
    );
  } catch (error) {
    sentMessage = await wbot.sendMessage(
      `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
        text: formatBody('Não consegui enviar o PDF, tente novamente!', ticket)
      }
    );
  }
  verifyMessage(sentMessage, ticket, contact);
};

export function makeid(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

const msgLocation = (image, latitude, longitude) => {
  if (image) {
    var b64 = Buffer.from(image).toString("base64");

    let data = `data:image/png;base64, ${b64} | https://maps.google.com/maps?q=${latitude}%2C${longitude}&z=17&hl=pt-BR|${latitude}, ${longitude} `;
    return data;
  }
};

export const getBodyMessage = (msg: proto.IWebMessageInfo): string | null => {
  try {
    let type = getTypeMessage(msg);

    const types = {
      conversation: MessageUtils.getTextMessage(msg),
      editedMessage: msg?.message?.editedMessage?.message?.protocolMessage?.editedMessage?.conversation || msg?.message?.editedMessage?.message?.extendedTextMessage?.text,
      imageMessage: MessageUtils.getImageMessage(msg),
      videoMessage: MessageUtils.getVideoMessage(msg),
      extendedTextMessage: msg.message?.extendedTextMessage?.text,
      buttonsResponseMessage: MessageUtils.getButtonsMessage(msg),
      templateButtonReplyMessage: msg.message?.templateButtonReplyMessage?.selectedId,
      messageContextInfo: msg.message?.buttonsResponseMessage?.selectedButtonId || msg.message?.listResponseMessage?.title,
      buttonsMessage: MessageUtils.getBodyButton(msg) || msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId,
      viewOnceMessage: MessageUtils.getViewOnceMessage(msg),
      viewOnceMessageV2: MessageUtils.getViewOnceMessageV2(msg),
      stickerMessage: MessageUtils.getStickerMessage(msg),
      contactMessage: MessageUtils.getContactMessage(msg),
      contactsArrayMessage: "varios contatos",
      pollCreationMessageV2: msg.message?.pollCreationMessageV2?.name || "Enquete não suportada, abra o dispositivo para ler.",
      pollCreationMessageV3: msg.message?.pollCreationMessageV3?.name || "Enquete não suportada, abra o dispositivo para ler.",
      interactiveMessage: msg?.message.interactiveMessage?.body || "Mensagem interativa não suportada, abra o dispositivo para ler.",
      locationMessage: MessageUtils.getLocationMessage(msg),
      liveLocationMessage: `Latitude: ${msg.message?.liveLocationMessage?.degreesLatitude} - Longitude: ${msg.message?.liveLocationMessage?.degreesLongitude}`,
      documentMessage: MessageUtils.getDocumentMessage(msg),
      documentWithCaptionMessage: msg.message?.documentWithCaptionMessage?.message?.documentMessage?.caption,
      audioMessage: MessageUtils.getAudioMessage(msg),
      ephemeralMessage: msg.message?.ephemeralMessage?.message?.extendedTextMessage?.text,
      listMessage: MessageUtils.getBodyButton(msg) || msg.message?.listResponseMessage?.title,
      listResponseMessage: MessageUtils.getListMessage(msg),
      reactionMessage: MessageUtils.getReactionMessage(msg) || "reaction",
      advertising: MessageUtils.getAd(msg) || msg.message?.listResponseMessage?.contextInfo?.externalAdReply?.title,
      productMessage: msg.message?.productMessage?.product?.productImage?.caption || "Produto",
      multiProductMessage: "Múltiplos Produtos",
      orderMessage: "Pedido",
      paymentMessage: MessageUtils.getPaymentMessage(msg),
      paymentRequestMessage: "Solicitação de Pagamento",
      groupInviteMessage: MessageUtils.getGroupInviteMessage(msg),
      revokeInviteMessage: "Convite Revogado",
      protocolMessage: msg.message?.protocolMessage?.editedMessage?.conversation || null,
      disappearingMessage: "Mensagem que Desaparece",
      callMessage: MessageUtils.getCallMessage(msg),
      templateMessage: MessageUtils.getTemplateMessage(msg),
      statusUpdateMessage: "Atualização de Status"
    };

    return types[type] || null;
  } catch (error) {
    console.error("Error getting message body:", error);
    return null;
  }
};

export const getQuotedMessage = (msg: proto.IWebMessageInfo): any => {
  const body =
    msg.message.imageMessage.contextInfo ||
    msg.message.videoMessage.contextInfo ||
    msg.message?.documentMessage ||
    msg.message.extendedTextMessage.contextInfo ||
    msg.message.buttonsResponseMessage.contextInfo ||
    msg.message.listResponseMessage.contextInfo ||
    msg.message.templateButtonReplyMessage.contextInfo ||
    msg.message.buttonsResponseMessage?.contextInfo ||
    msg?.message?.buttonsResponseMessage?.selectedButtonId ||
    msg.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
    msg?.message?.listResponseMessage?.singleSelectReply.selectedRowId ||
    msg.message.listResponseMessage?.contextInfo;
  msg.message.senderKeyDistributionMessage;

  // testar isso

  return extractMessageContent(body[Object.keys(body).values().next().value]);
};

export const getQuotedMessageId = (msg: proto.IWebMessageInfo) => {
  const body = extractMessageContent(msg.message)[
    Object.keys(msg?.message).values().next().value
    ];
  let reaction = msg?.message?.reactionMessage
    ? msg?.message?.reactionMessage?.key?.id
    : "";

  return reaction ? reaction : body?.contextInfo?.stanzaId;
};

const getMeSocket = (wbot: Session): IMe => {
  return {
    id: jidNormalizedUser((wbot as WASocket).user.id),
    name: (wbot as WASocket).user.name
  };
};

const getSenderMessage = (
  msg: proto.IWebMessageInfo,
  wbot: Session
): string => {
  const me = getMeSocket(wbot);
  if (msg.key.fromMe) return me.id;

  const senderId = msg.participant || msg.key.participant || msg.key.remoteJid || undefined;

  return senderId && jidNormalizedUser(senderId);
};

const getContactMessage = async (msg: proto.IWebMessageInfo, wbot: Session) => {
  const isGroup = msg.key.remoteJid.includes("g.us");
  const rawNumber = msg.key.remoteJid.replace(/\D/g, "");

  return isGroup
    ? {
      id: getSenderMessage(msg, wbot),
      name: msg.pushName
    }
    : {
      id: msg.key.remoteJid,
      name: msg.key.fromMe ? rawNumber : msg.pushName
    };
};


const downloadMedia = async (msg: proto.IWebMessageInfo, wbot: Session) => {

  const mineType =
    msg.message?.imageMessage ||
    msg.message?.viewOnceMessageV2?.message?.imageMessage ||
    msg.message?.viewOnceMessage?.message?.imageMessage ||
    msg.message?.ephemeralMessage?.message?.imageMessage ||
    msg.message?.audioMessage ||
    msg.message?.ephemeralMessage?.message?.audioMessage ||
    msg.message?.viewOnceMessageV2?.message?.audioMessage ||
    msg.message?.viewOnceMessage?.message?.audioMessage ||
    msg.message?.videoMessage ||
    msg.message?.ephemeralMessage?.message?.videoMessage ||
    msg.message?.viewOnceMessageV2?.message?.videoMessage ||
    msg.message?.viewOnceMessage?.message?.videoMessage ||
    msg.message?.stickerMessage ||
    msg.message?.ephemeralMessage?.message?.stickerMessage ||
    msg.message?.viewOnceMessageV2?.message?.stickerMessage ||
    msg.message?.viewOnceMessage?.message?.stickerMessage ||
    msg.message?.documentMessage ||
    msg.message?.ephemeralMessage?.message?.documentMessage ||
    msg.message?.viewOnceMessageV2?.message?.documentMessage ||
    msg.message?.viewOnceMessage?.message?.documentMessage ||
    msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage ||
    msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.audioMessage;


  if (!mineType) {
    console.log(">>>>> media message not found")
    console.log(msg);
    return;
  }

  var splitMime = typeof mineType.mimetype === 'string' ? mineType.mimetype.split("/")[0] : 'unknown';

  // eslint-disable-next-line no-nested-ternary
  let messageType = msg.message?.documentMessage
    ? "document"
    : splitMime.replace("application", "document")
      ? (splitMime
        .replace("application", "document") as MediaType)
      : (splitMime as MediaType);

  let stream: Transform;
  let contDownload = 0;


  if (msg.message?.stickerMessage) {
    messageType = 'sticker';

  }

  let maxTries = 5;
  while (contDownload < maxTries && !stream) {

    try {


      if (mineType.directPath) {
        mineType.url = "";
      }

      if (messageType == 'sticker') {
        maxTries = 1;
      }

      stream = await downloadContentFromMessage(
        mineType,
        messageType
      );

    } catch (error) {
      console.log(error);
      contDownload += 1;

      await new Promise(resolve => {
          setTimeout(resolve, 1000 * contDownload * 2)
        }
      );
      logger.warn(
        `>>>> erro ${contDownload} de baixar o arquivo ${msg?.key.id}`
      );
    }
  }


  let buffer = Buffer.from([]);

  try {
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }
  } catch (error) {
    return {data: "error", mimetype: "", filename: ""};
  }

  if (!buffer) {
    Sentry.setExtra("ERR_WAPP_DOWNLOAD_MEDIA", {msg});
    Sentry.captureException(new Error("ERR_WAPP_DOWNLOAD_MEDIA"));
    throw new Error("ERR_WAPP_DOWNLOAD_MEDIA");
  }
  let filename = msg.message?.documentMessage?.fileName || "";

  if (!filename) {
    const ext = mime.extension(mineType.mimetype) || "unknown";
    filename = `${new Date().getTime()}.${ext}`;
  }

  const media = {
    data: buffer,
    mimetype: mineType.mimetype,
    filename
  };
  return media;
}


const verifyContact = async (
  msgContact: IMe,
  wbot: Session,
  companyId: number
): Promise<Contact> => {


  const contactData = {
    name: msgContact?.name || msgContact.id.replace(/\D/g, ""),
    number: msgContact.id.substring(0, msgContact.id.indexOf("@")),
    //number: msgContact.id.replace(/\D/g, ""),
    //profilePicUrl,
    isGroup: msgContact.id.includes("g.us"),
    companyId,
    whatsappId: wbot.id
  };
  const contact = CreateOrUpdateContactService(contactData, wbot, msgContact.id);

  return contact;
};

export const verifyQuotedMessage = async (
  msg: proto.IWebMessageInfo
): Promise<Message | null> => {
  if (!msg) return null;
  const quoted = getQuotedMessageId(msg);

  if (!quoted) return null;

  const quotedMsg = await Message.findOne({
    where: {id: quoted},
  });

  if (!quotedMsg) return null;

  return quotedMsg;
};

const sanitizeName = (name: string): string => {
  let sanitized = name.split(" ")[0];
  sanitized = sanitized.replace(/[^a-zA-Z0-9]/g, "");
  return sanitized.substring(0, 60);
};
const convertTextToSpeechAndSaveToFile = (
  text: string,
  filename: string,
  subscriptionKey: string,
  serviceRegion: string,
  voice: string = "pt-BR-FabioNeural",
  audioToFormat: string = "mp3"
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const speechConfig = SpeechConfig.fromSubscription(
      subscriptionKey,
      serviceRegion
    );
    speechConfig.speechSynthesisVoiceName = voice;
    const audioConfig = AudioConfig.fromAudioFileOutput(`${filename}.wav`);
    const synthesizer = new SpeechSynthesizer(speechConfig, audioConfig);
    synthesizer.speakTextAsync(
      text,
      result => {
        if (result) {
          convertWavToAnotherFormat(
            `${filename}.wav`,
            `${filename}.${audioToFormat}`,
            audioToFormat
          )
            .then(output => {
              resolve();
            })
            .catch(error => {
              console.error(error);
              reject(error);
            });
        } else {
          reject(new Error("No result from synthesizer"));
        }
        synthesizer.close();
      },
      error => {
        console.error(`Error: ${error}`);
        synthesizer.close();
        reject(error);
      }
    );
  });
};

const convertWavToAnotherFormat = (
  inputPath: string,
  outputPath: string,
  toFormat: string
) => {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(inputPath)
      .toFormat(toFormat)
      .on("end", () => resolve(outputPath))
      .on("error", (err: { message: any }) =>
        reject(new Error(`Error converting file: ${err.message}`))
      )
      .save(outputPath);
  });
};

const deleteFileSync = (path: string): void => {
  try {
    fs.unlinkSync(path);
  } catch (error) {
    console.error("Erro ao deletar o arquivo:", error);
  }
};

const keepOnlySpecifiedChars = (str: string) => {
  return str.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚâêîôûÂÊÎÔÛãõÃÕçÇ!?.,;:\s]/g, "");
};
const handleOpenAi = async (
  msg: proto.IWebMessageInfo,
  wbot: Session,
  ticket: Ticket,
  contact: Contact,
  mediaSent: Message | undefined
): Promise<void> => {
  const bodyMessage = getBodyMessage(msg);

  if (!bodyMessage) return;


  let {prompt} = await ShowWhatsAppService(wbot.id, ticket.companyId);


  if (!prompt && !isNil(ticket?.queue?.prompt)) {
    prompt = ticket.queue.prompt;
  }

  if (!prompt) return;

  if (msg.messageStubType) return;

  const publicFolder: string = path.resolve(
    __dirname,
    "..",
    "..",
    "..",
    "public"
  );

  let openai: SessionOpenAi;
  const openAiIndex = sessionsOpenAi.findIndex(s => s.id === wbot.id);


  if (openAiIndex === -1) {
    const configuration = new Configuration({
      apiKey: prompt.apiKey
    });
    openai = new OpenAIApi(configuration);
    openai.id = wbot.id;
    sessionsOpenAi.push(openai);
  } else {
    openai = sessionsOpenAi[openAiIndex];
  }

  const messages = await Message.findAll({
    where: {ticketId: ticket.id},
    order: [["createdAt", "ASC"]],
    limit: prompt.maxMessages
  });

  const promptSystem = `Nas respostas utilize o nome ${sanitizeName(
    contact.name || "Amigo(a)"
  )} para identificar o cliente.\nSua resposta deve usar no máximo ${prompt.maxTokens
  } tokens e cuide para não truncar o final.\nSempre que possível, mencione o nome dele para ser mais personalizado o atendimento e mais educado. Quando a resposta requer uma transferência para o setor de atendimento, comece sua resposta com 'Ação: Transferir para o setor de atendimento'.\n
  ${prompt.prompt}\n`;

  let messagesOpenAi: ChatCompletionRequestMessage[] = [];

  if (msg.message?.conversation || msg.message?.extendedTextMessage?.text) {
    messagesOpenAi = [];
    messagesOpenAi.push({role: "system", content: promptSystem});
    for (
      let i = 0;
      i < Math.min(prompt.maxMessages, messages.length);
      i++
    ) {
      const message = messages[i];
      if (message.mediaType === "chat") {
        if (message.fromMe) {
          messagesOpenAi.push({role: "assistant", content: message.body});
        } else {
          messagesOpenAi.push({role: "user", content: message.body});
        }
      }
    }
    messagesOpenAi.push({role: "user", content: bodyMessage!});

    const chat = await openai.createChatCompletion({
      model: "gpt-3.5-turbo-1106",
      messages: messagesOpenAi,
      max_tokens: prompt.maxTokens,
      temperature: prompt.temperature
    });

    let response = chat.data.choices[0].message?.content;

    if (response?.includes("Ação: Transferir para o setor de atendimento")) {
      await transferQueue(prompt.queueId, ticket, contact);
      response = response
        .replace("Ação: Transferir para o setor de atendimento", "")
        .trim();
    }

    if (prompt.voice === "texto") {
      const sentMessage = await wbot.sendMessage(msg.key.remoteJid!, {
        text: response!
      });
      await verifyMessage(sentMessage!, ticket, contact);
    } else {
      const fileNameWithOutExtension = `${ticket.id}_${Date.now()}`;
      convertTextToSpeechAndSaveToFile(
        keepOnlySpecifiedChars(response!),
        `${publicFolder}/${fileNameWithOutExtension}`,
        prompt.voiceKey,
        prompt.voiceRegion,
        prompt.voice,
        "mp3"
      ).then(async () => {
        try {
          const sendMessage = await wbot.sendMessage(msg.key.remoteJid!, {
            audio: {url: `${publicFolder}/${fileNameWithOutExtension}.mp3`},
            mimetype: "audio/mpeg",
            ptt: true
          });
          await verifyMediaMessage(sendMessage!, ticket, contact);
          deleteFileSync(`${publicFolder}/${fileNameWithOutExtension}.mp3`);
          deleteFileSync(`${publicFolder}/${fileNameWithOutExtension}.wav`);
        } catch (error) {
          console.log(`Erro para responder com audio: ${error}`);
        }
      });
    }
  } else if (msg.message?.audioMessage) {
    const mediaUrl = mediaSent!.mediaUrl!.split("/").pop();
    const file = fs.createReadStream(`${publicFolder}/${mediaUrl}`) as any;
    const transcription = await openai.createTranscription(file, "whisper-1");

    messagesOpenAi = [];
    messagesOpenAi.push({role: "system", content: promptSystem});
    for (
      let i = 0;
      i < Math.min(prompt.maxMessages, messages.length);
      i++
    ) {
      const message = messages[i];
      if (message.mediaType === "chat") {
        if (message.fromMe) {
          messagesOpenAi.push({role: "assistant", content: message.body});
        } else {
          messagesOpenAi.push({role: "user", content: message.body});
        }
      }
    }
    messagesOpenAi.push({role: "user", content: transcription.data.text});
    const chat = await openai.createChatCompletion({
      model: "gpt-3.5-turbo-1106",
      messages: messagesOpenAi,
      max_tokens: prompt.maxTokens,
      temperature: prompt.temperature
    });
    let response = chat.data.choices[0].message?.content;

    if (response?.includes("Ação: Transferir para o setor de atendimento")) {
      await transferQueue(prompt.queueId, ticket, contact);
      response = response
        .replace("Ação: Transferir para o setor de atendimento", "")
        .trim();
    }
    if (prompt.voice === "texto") {
      const sentMessage = await wbot.sendMessage(msg.key.remoteJid!, {
        text: response!
      });
      await verifyMessage(sentMessage!, ticket, contact);
    } else {
      const fileNameWithOutExtension = `${ticket.id}_${Date.now()}`;
      convertTextToSpeechAndSaveToFile(
        keepOnlySpecifiedChars(response!),
        `${publicFolder}/${fileNameWithOutExtension}`,
        prompt.voiceKey,
        prompt.voiceRegion,
        prompt.voice,
        "mp3"
      ).then(async () => {
        try {
          const sendMessage = await wbot.sendMessage(msg.key.remoteJid!, {
            audio: {url: `${publicFolder}/${fileNameWithOutExtension}.mp3`},
            mimetype: "audio/mpeg",
            ptt: true
          });
          await verifyMediaMessage(sendMessage!, ticket, contact);
          deleteFileSync(`${publicFolder}/${fileNameWithOutExtension}.mp3`);
          deleteFileSync(`${publicFolder}/${fileNameWithOutExtension}.wav`);
        } catch (error) {
          console.log(`Erro para responder com audio: ${error}`);
        }
      });
    }
  }
  messagesOpenAi = [];
};

const transferQueue = async (
  queueId: number,
  ticket: Ticket,
  contact: Contact
): Promise<void> => {
  console.trace('update!')

  await UpdateTicketService({
    ticketData: {queueId: queueId, useIntegration: false, promptId: null},
    ticketId: ticket.id,
    companyId: ticket.companyId
  });
};

const verifyMediaMessage = async (
  msg: proto.IWebMessageInfo,
  ticket: Ticket,
  contact: Contact
): Promise<Message> => {
  const io = getIO();

  let msgInstance = await Message.findOne({
    where: {id: msg.key.id}
  });
  if (!msgInstance) {
    const quotedMsg = await verifyQuotedMessage(msg);
    const wbot = getWbot(ticket.whatsappId);

    const media = await downloadMedia(msg, wbot);

    if (!media) {
      throw new Error("ERR_WAPP_DOWNLOAD_MEDIA");
    }

    if (!media.filename) {
      const ext = (typeof media.mimetype === 'string' && media.mimetype.includes('/')
        && media.mimetype.includes(';'))
        ? mime.extension(media.mimetype) : 'unknown';
      media.filename = `${new Date().getTime()}.${ext}`;
    } else {
      let originalFilename = media.filename ? `-${media.filename}` : "";
      media.filename = `${new Date().getTime()}${originalFilename}`;
    }

    try {
      const folder = `public/company${ticket.companyId}`;
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder);
        fs.chmodSync(folder, 0o777);
      }

      await writeFileAsync(
        join(__dirname, "..", "..", "..", folder, media.filename),
        media.data,
        "base64"
      );
    } catch (err) {
      Sentry.captureException(err);
      logger.error(err);
    }

    const body = getBodyMessage(msg);
    var msgType = getTypeMessage(msg);

    const messageData = {
      id: msg.key.id,
      ticketId: ticket.id,
      contactId: msg.key.fromMe ? undefined : contact.id,
      body: body ? formatBody(body, ticket) : media.filename,
      fromMe: msg.key.fromMe,
      read: msg.key.fromMe,
      mediaUrl: media.filename,
      mediaType: typeof media.mimetype === 'string' ? media.mimetype.split("/")[0] : 'unknown',
      quotedMsgId: quotedMsg?.id,
      ack: getStatus(msg, "media"),
      remoteJid: msg.key.remoteJid,
      participant: msg.key.participant,
      dataJson: JSON.stringify(msg),
    };

    var messageBody = body || media.filename;
    if (typeof messageBody != "string") {
      console.trace("body is not a string", messageBody);
    }
    await ticket.update({
      lastMessage: messageBody
    });

    msgInstance = await CreateMessageService({
      messageData,
      ticket,
      companyId: ticket.companyId,
    });
  } else {
    if (typeof msgInstance.body != "string") {
      console.trace("body is not a string", msgInstance.body);
    }
    await ticket.update({
      lastMessage: msgInstance.body
    });

    msgInstance.ack = getStatus(msg, "media");
    msgInstance.participant = msg.key.participant;
    msgInstance.dataJson = JSON.stringify(msg);
    await msgInstance.save();

  }

  if (!msg.key.fromMe && ticket.status === "closed") {
    await ticket.update({status: "pending"});
    await ticket.reload({
      include: [
        {model: Queue, as: "queue"},
        {model: User, as: "user"},
        {model: Contact, as: "contact"},
      ],
    });

    io.to(`company-${ticket.companyId}-closed`).emit(`company-${ticket.companyId}-ticket`, {
      action: "delete",
      ticket,
      ticketId: ticket.id,
    });

    io.to(`company-${ticket.companyId}-${ticket.status}`)
      .to(ticket.id.toString())
      .emit(`company-${ticket.companyId}-ticket`, {
        action: "update",
        ticket,
        ticketId: ticket.id,
      });
  }

  return msgInstance;
};

function getStatus(msg: proto.IWebMessageInfo, msgType: string) {

  if (msg.status == proto.WebMessageInfo.Status.PENDING) {

    if (msg.key.fromMe && msgType == "reactionMessage") {
      return 3;
    }

    return 1
  } else if (msg.status == proto.WebMessageInfo.Status.SERVER_ACK) {
    return 1
  } else if (msg.status == proto.WebMessageInfo.Status.DELIVERY_ACK) {
    return 2;
  } else if (msg.status == proto.WebMessageInfo.Status.READ || msg.status == proto.WebMessageInfo.Status.PLAYED) {
    return 3;
  }

  return 0;
}

export const verifyMessage = async (
  msg: proto.IWebMessageInfo,
  ticket: Ticket,
  contact: Contact
) => {
  const io = getIO();
  const quotedMsg = await verifyQuotedMessage(msg);
  const body = getBodyMessage(msg);

  if (!body) {
    return;
  }

  let msgType = getTypeMessage(msg);


  const isEdited = msgType == 'editedMessage' ||
    (msg?.message?.protocolMessage?.type == proto.Message.ProtocolMessage.Type.MESSAGE_EDIT
      || msg?.message?.protocolMessage?.editedMessage?.conversation?.length > 0);


  let msgId = msg.key.id;
  if (msgType == 'protocolMessage') {
    msgId = msg?.message?.protocolMessage?.key?.id || msg.key.id;
  } else if (msgType == 'editedMessage') {
    msgId = msg?.message?.editedMessage?.message?.protocolMessage?.key?.id || msg.key.id;
  }

  const messageData = {
    id: msgId,
    ticketId: ticket.id,
    contactId: msg.key.fromMe ? undefined : contact.id,
    body,
    fromMe: msg.key.fromMe,
    mediaType: msgType,
    read: msg.key.fromMe,
    quotedMsgId: quotedMsg?.id,
    ack: getStatus(msg, msgType),
    remoteJid: msg.key.remoteJid,
    participant: msg.key.participant,
    dataJson: JSON.stringify(msg),
    isEdited: isEdited,
  };
  if (typeof body != "string") {
    console.trace("body is not a string", body);
  }

  await ticket.update({
    lastMessage: body
  });

  if (isEdited) {
    let editedMsg = await Message.findByPk(messageData.id);
    if (editedMsg) {
      const oldMessage = {
        messageId: messageData.id,
        body: editedMsg.body
      }

      await OldMessage.upsert(oldMessage);
    } else {
      console.log(`Mensagem editada não encontrada: ${messageData.id}`);
    }
  }

  await CreateMessageService({messageData, ticket, companyId: ticket.companyId});

  if (!msg.key.fromMe && ticket.status === "closed") {
    await ticket.update({status: "pending"});
    await ticket.reload({
      include: [
        {model: Queue, as: "queue"},
        {model: User, as: "user"},
        {model: Contact, as: "contact"}
      ]
    });

    io.to(`company-${ticket.companyId}-closed`).emit(`company-${ticket.companyId}-ticket`, {
      action: "delete",
      ticket,
      ticketId: ticket.id
    });

    io.to(`company-${ticket.companyId}-${ticket.status}`)
      .to(ticket.id.toString())
      .emit(`company-${ticket.companyId}-ticket`, {
        action: "update",
        ticket,
        ticketId: ticket.id
      });
  }
};

export const isValidMsg = (msg: proto.IWebMessageInfo): boolean => {
  if (msg.key.remoteJid === "status@broadcast") return false;
  try {
    const msgType = getTypeMessage(msg);
    if (!msgType) {
      return false;
    }

    const ifType =
      msgType === "conversation" ||
      msgType === "editedMessage" ||
      msgType === "extendedTextMessage" ||
      msgType === "audioMessage" ||
      msgType === "videoMessage" ||
      msgType === "pollCreationMessageV2"||
      msgType === "templateMessage"||
      msgType === "pollCreationMessageV3"||
      msgType === "interactiveMessage" ||
      msgType === "imageMessage" ||
      msgType === "documentMessage" ||
      msgType === "documentWithCaptionMessage" ||
      msgType === "stickerMessage" ||
      msgType === "buttonsResponseMessage" ||
      msgType === "buttonsMessage" ||
      msgType === "messageContextInfo" ||
      msgType === "locationMessage" ||
      msgType === "liveLocationMessage" ||
      msgType === "contactMessage" ||
      msgType === "voiceMessage" ||
      msgType === "mediaMessage" ||
      msgType === "contactsArrayMessage" ||
      msgType === "reactionMessage" ||
      msgType === "ephemeralMessage" ||
      msgType === "protocolMessage" ||
      msgType === "listResponseMessage" ||
      msgType === "listMessage" ||
      msgType === "viewOnceMessage" ||
      msgType === "viewOnceMessageV2" ||
      msgType === "advertising" ||
      msgType === "highlyStructuredMessage"
    ;

    if (!ifType) {
      logger.warn(`#### Nao achou o type em isValidMsg: ${msgType}
${JSON.stringify(msg?.message)}`);
      Sentry.setExtra("Mensagem", {BodyMsg: msg.message, msg, msgType});
      Sentry.captureException(new Error("Novo Tipo de Mensagem em isValidMsg"));
    }

    return !!ifType;
  } catch (error) {
    Sentry.setExtra("Error isValidMsg", {msg});
    Sentry.captureException(error);
  }

  return false;
};


const Push = (msg: proto.IWebMessageInfo) => {
  return msg.pushName;
}

const verifyQueue = async (
  wbot: Session,
  msg: proto.IWebMessageInfo,
  ticket: Ticket,
  contact: Contact,
  mediaSent?: Message | undefined
) => {
  const companyId = ticket.companyId;


  const {queues, greetingMessage, maxUseBotQueues, timeUseBotQueues} = await ShowWhatsAppService(
    wbot.id!,
    ticket.companyId
  )


  if (queues.length === 1) {
    console.log('sem fila 2')
    const firstQueue = head(queues);
    let chatbot = false;
    if (firstQueue?.options) {
      chatbot = firstQueue.options.length > 0;
    }

    // Adiciona a opção de enviar mensagem de saudação com fila única
    const sendGreetingMessageOneQueues = await Setting.findOne({
      where: {
        key: "sendGreetingMessageOneQueues",
        companyId: ticket.companyId
      }
    });

    greetingMessageControl.push({
      ticketId: ticket.id,
      greetingMessage: greetingMessage,
      companyId: companyId
    });
    if (greetingMessage.length > 1 && sendGreetingMessageOneQueues?.value === "enabled") {
      const recentMessage = await Message.findOne({
        where: {
          ticketId: ticket.id,
          fromMe: true,
          createdAt: {
            [Op.gte]: moment().subtract(5, "minutes").toDate()
          }
        }
      });

      if (recentMessage) {
        return;
      }


      const body = formatBody(`${greetingMessage}`, ticket);

      await wbot.sendMessage(
        `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
        {
          text: body
        }
      );
    }

    //inicia integração dialogflow/n8n
    if (
      !msg.key.fromMe &&
      !ticket.isGroup &&
      !isNil(queues[0]?.integrationId)
    ) {

      const integrations = await ShowQueueIntegrationService(queues[0].integrationId, companyId);

      await handleMessageIntegration(msg, wbot, integrations, ticket)

      await ticket.update({
        useIntegration: true,
        integrationId: integrations.id
      })
      // return;
    }
    //inicia integração openai
    if (
      !msg.key.fromMe &&
      !ticket.isGroup &&
      !isNil(queues[0]?.promptId)
    ) {
      console.log(" 1286 - Entrei na integracao openai.");
      await handleOpenAi(msg, wbot, ticket, contact, mediaSent);

      await ticket.update({
        useIntegration: true,
        promptId: queues[0]?.promptId
      })
      // return;
    }

    await UpdateTicketService({
      ticketData: {queueId: firstQueue?.id, chatbot, status: "pending"},
      ticketId: ticket.id,
      companyId: ticket.companyId,
    });

    return;
  }

  const selectedOption = msg?.message?.buttonsResponseMessage?.selectedButtonId ||
    msg?.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    msg?.message?.extendedTextMessage?.text ||
    msg?.message?.conversation;

  let choosenQueue = null;
  if (!isNumeric(selectedOption) || +selectedOption > queues.length) {
    //find queues by keywords or name
    const keyword = selectedOption.toLowerCase();

    for (let queue of queues) {
      if (queue.name.toLowerCase() === keyword) {
        choosenQueue = queue;
        break;
      }

      if (queue.keywords && queue.keywords.length > 0) {
        let splitKeywords = queue.keywords.split(", ");

        for (let key of splitKeywords) {
          if (key.toLowerCase() == keyword) {
            choosenQueue = queue;
            break;
          }
        }
      }
    }
  } else {
    choosenQueue = queues[+selectedOption - 1];
  }

  const buttonActive = await Setting.findOne({
    where: {
      key: "chatBotType",
      companyId
    }
  });

  const botText = async () => {
    let options = "";

    if (outOfHourMessageControl.length > 5000)
      outOfHourMessageControl = [];

    queues.forEach((queue, index) => {
      options += `*[ ${index + 1} ]* - ${queue.name}\n`;
    });


    if (process.env.CHATBOT_RESTRICT_NUMBER?.length >= 8) {
      if (ticket.contact.number != process.env.CHATBOT_RESTRICT_NUMBER) {
        console.trace('chatbot desativado!');
        return;
      }
    }


    const textMessage = {
      text: formatBody(`\u200e${greetingMessage}\n\n${options}`, ticket),
    };

    await UpdateTicketService({
      ticketData: {amountUsedBotQueues: ticket.amountUsedBotQueues + 1},
      ticketId: ticket.id,
      companyId: ticket.companyId
    });

    const sendMsg = await wbot.sendMessage(
      `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
      textMessage
    );

    await verifyMessage(sendMsg, ticket, ticket.contact);
  };

  if (choosenQueue) {
    let chatbot = false;
    if (choosenQueue?.options) {
      chatbot = choosenQueue.options.length > 0;
    }


    await UpdateTicketService({
      ticketData: {queueId: choosenQueue.id, chatbot, status: "pending", amountUsedBotQueues: 0},
      ticketId: ticket.id,
      companyId: ticket.companyId,
    });


    /* Tratamento para envio de mensagem quando a fila está fora do expediente */
    console.trace(choosenQueue.options);
    if (choosenQueue.options.length === 0) {
      const queue = await Queue.findByPk(choosenQueue.id);
      const {schedules}: any = queue;
      const now = moment();
      const weekday = now.format("dddd").toLowerCase();
      let schedule;

      if (Array.isArray(schedules) && schedules.length > 0) {
        schedule = schedules.find((s) => s.weekdayEn === weekday && s.startTime !== "" && s.startTime !== null && s.endTime !== "" && s.endTime !== null);
      }

      if (queue.outOfHoursMessage !== null && queue.outOfHoursMessage !== "" && !isNil(schedule)) {


        var lastMessage = outOfHourMessageControl.find((o) => o.ticketId === ticket.id || o.dest === contact.number);

        if (!lastMessage || (lastMessage && lastMessage.time + (1000 * 60 * 5) < new Date().getTime())) {

          if (lastMessage) {
            outOfHourMessageControl = outOfHourMessageControl.filter((o) => o.ticketId !== ticket.id);
            lastMessage = null;
          }
          const startTime = moment(schedule.startTime, "HH:mm");
          const endTime = moment(schedule.endTime, "HH:mm");

          outOfHourMessageControl.push({ticketId: ticket.id, time: new Date().getTime()});

          if (now.isBefore(startTime) || now.isAfter(endTime)) {
            const body = formatBody(`\u200e ${queue.outOfHoursMessage}\n\n*[ # ]* - Voltar ao Menu Principal`, ticket);
            const sentMessage = await wbot.sendMessage(
              `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
                text: body,
              }
            );
            await verifyMessage(sentMessage, ticket, contact);

            await UpdateTicketService({
              ticketData: {queueId: null, chatbot},
              ticketId: ticket.id,
              companyId: ticket.companyId,
            });

            console.log('fora do horario')
            return;
          }
        }

        if (!lastMessage) {
          outOfHourMessageControl.push({ticketId: ticket.id, dest: contact.number, time: new Date().getTime()});
        }
      }

      //inicia integração dialogflow/n8n
      console.trace(choosenQueue.integrationId);

      if (
        !msg.key.fromMe &&
        !ticket.isGroup &&
        choosenQueue.integrationId
      ) {

        const integrations = await ShowQueueIntegrationService(choosenQueue.integrationId, companyId);

        await handleMessageIntegration(msg, wbot, integrations, ticket)

        await ticket.update({
          useIntegration: true,
          integrationId: integrations.id
        })
        // return;
      }

      //inicia integração openai
      if (
        !msg.key.fromMe &&
        !ticket.isGroup &&
        !isNil(choosenQueue?.promptId)
      ) {
        await handleOpenAi(msg, wbot, ticket, contact, mediaSent);


        await ticket.update({
          useIntegration: true,
          promptId: choosenQueue?.promptId
        })
        // return;
      }

      const body = formatBody(`\u200e${choosenQueue.greetingMessage}`, ticket);
      if (choosenQueue.greetingMessage) {
        const sentMessage = await wbot.sendMessage(
          `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
            text: body,
          }
        );
        await verifyMessage(sentMessage, ticket, contact);

        if (choosenQueue.mediaPath !== null && choosenQueue.mediaPath !== "") {
          const filePath = path.resolve("public", `company${choosenQueue.companyId}`, choosenQueue.mediaPath);

          const optionsMsg = await getMessageOptions(choosenQueue.mediaName, filePath, null, ticket.companyId);

          let sentMessage = await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {...optionsMsg});

          await verifyMediaMessage(sentMessage, ticket, contact);
        }
      }
    }

  } else {


    if (maxUseBotQueues && maxUseBotQueues !== 0 && ticket.amountUsedBotQueues >= maxUseBotQueues) {
      return;
    }

    //Regra para desabilitar o chatbot por x minutos/horas após o primeiro envio
    const ticketTraking = await FindOrCreateATicketTrakingService({ticketId: ticket.id, companyId});

    let dataLimite = new Date();
    let Agora = new Date();

    if (ticketTraking.chatbotAt !== null) {
      dataLimite.setMinutes(ticketTraking.chatbotAt.getMinutes() + (Number(timeUseBotQueues)));

      if (ticketTraking.chatbotAt !== null && Agora < dataLimite && timeUseBotQueues !== "0" && ticket.amountUsedBotQueues !== 0) {
        return
      }
    }

    await ticketTraking.update({
      updatedAt: new Date(),
    })

    if (buttonActive.value === "text") {
      console.trace('botText')
      return botText();
    }

  }

};


export const verifyRating = (ticketTraking: TicketTraking) => {
  return ticketTraking &&
    ticketTraking.finishedAt === null &&
    ticketTraking.userId !== null &&
    ticketTraking.ratingAt !== null;

};

export const handleRating = async (
  msg: WAMessage,
  ticket: Ticket,
  ticketTraking: TicketTraking
) => {
  const io = getIO();
  let rate: number | null = null;

  if (msg?.message?.conversation || msg?.message?.extendedTextMessage) {
    rate = parseInt(msg.message.conversation || msg.message.extendedTextMessage.text, 10) || null;
  }

  if (!Number.isNaN(rate) && Number.isInteger(rate) && !isNull(rate)) {
    const {complationMessage} = await ShowWhatsAppService(
      ticket.whatsappId,
      ticket.companyId
    );

    let finalRate = rate;

    if (rate < 1) {
      finalRate = 1;
    }
    if (rate > 5) {
      finalRate = 5;
    }

    await UserRating.create({
      ticketId: ticketTraking.ticketId,
      companyId: ticketTraking.companyId,
      userId: ticketTraking.userId,
      rate: finalRate,
    });

    if (complationMessage) {

      if (completionMessageControl.length >= 2500)
        completionMessageControl = [];

      var lastMessage = completionMessageControl.find((o) => o.ticketId === ticket.id || o.dest === ticket.contact.number);
      if (!lastMessage || (lastMessage && lastMessage.time + (1000 * 60 * 30) < new Date().getTime())) {
        if (lastMessage) {
          completionMessageControl = completionMessageControl.filter((o) => o.ticketId !== ticket.id);
          lastMessage = null;
        }

        const body = formatBody(`\u200e${complationMessage}`, ticket);
        await SendPresenceStatus(getWbot(ticket.whatsappId), `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`);
        await SendWhatsAppMessage({body, ticket});
      }
      if (!lastMessage) {
        completionMessageControl.push({ticketId: ticket.id, dest: ticket.contact.number, time: new Date().getTime()});
      }

    }

    await ticketTraking.update({
      finishedAt: moment().toDate(),
      ratedAt: moment().toDate(),
      rated: true,
    });

    await ticket.update({
      queueId: null,
      chatbot: null,
      queueOptionId: null,
      userId: null,
      status: "closed",
    });

    io.to(`company-${ticket.companyId}-open`).emit(`company-${ticket.companyId}-ticket`, {
      action: "delete",
      ticket,
      ticketId: ticket.id,
    });

    io.to(`company-${ticket.companyId}-${ticket.status}`)
      .to(ticket.id.toString())
      .emit(`company-${ticket.companyId}-ticket`, {
        action: "update",
        ticket,
        ticketId: ticket.id,
      });
  }
};

const handleChartbot = async (ticket: Ticket, msg: WAMessage, wbot: Session,
                              whatsapp: Whatsapp,
                              dontReadTheFirstQuestion: boolean = false) => {
  //console.trace('handleChatbot ' + ticket.amountUsedBotQueues)
  if (!ticket.contact.disableBot) {
    const queue = await Queue.findByPk(ticket.queueId, {
      include: [
        {
          model: QueueOption,
          as: "options",
          where: {parentId: null},
          order: [
            ["option", "ASC"],
            ["createdAt", "ASC"],
          ],
        },
      ],
    });

    const messageBody = msg?.message?.buttonsResponseMessage?.selectedButtonId ||
      msg?.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
      msg?.message?.extendedTextMessage?.text ||
      msg?.message?.conversation;

    if (messageBody == "#" && (!ticket.userId || ticket.status == "pending")) {
      // voltar para o menu inicial
      console.trace('## if')

      await ticket.update({queueOptionId: null, chatbot: false, queueId: null, amountUsedBotQueues: 0});
      await verifyQueue(wbot, msg, ticket, ticket.contact);
      return;
    }

    // voltar para o menu anterior
    if (!isNil(queue) && !isNil(ticket.queueOptionId) && messageBody == "0") {
      console.trace('primeiro if')
      const option = await QueueOption.findByPk(ticket.queueOptionId);
      await ticket.update({queueOptionId: option?.parentId, amountUsedBotQueues: 0});

      // escolheu uma opção
    } else if (!isNil(queue) && !isNil(ticket.queueOptionId)) {
      console.trace('segundo if')

      const count = await QueueOption.count({
        where: {parentId: ticket.queueOptionId},
      });
      let option: any = {};
      if (count == 1) {
        option = await QueueOption.findOne({
          where: {parentId: ticket.queueOptionId},
        });
      } else {
        console.trace('terceiro if')

        option = await QueueOption.findOne({
          where: {
            [Op.or]: [{option: messageBody || ""}, {title: messageBody || ""}],
            parentId: ticket.queueOptionId,
          },
        });
      }
      if (option) {
        await ticket.update({queueOptionId: option?.id, amountUsedBotQueues: 0});
      }

      // não linha a primeira pergunta
    } else if (!isNil(queue) && isNil(ticket.queueOptionId) && !dontReadTheFirstQuestion) {
      console.trace('quarto if')

      const option = queue?.options.find((o) => o.option == messageBody
        || o.title.toLowerCase() == messageBody.toLowerCase());

      if (option) {
        await ticket.update({queueOptionId: option?.id, amountUsedBotQueues: 0});
      } else {
        if (whatsapp.maxUseBotQueues && whatsapp.maxUseBotQueues !== 0 && ticket.amountUsedBotQueues >= whatsapp.maxUseBotQueues) {
          return;
        }
        await ticket.update({amountUsedBotQueues: ticket.amountUsedBotQueues + 1});
      }

    } else {
      if (whatsapp.maxUseBotQueues && whatsapp.maxUseBotQueues !== 0 && ticket.amountUsedBotQueues >= whatsapp.maxUseBotQueues) {
        return;
      }
      await ticket.update({amountUsedBotQueues: ticket.amountUsedBotQueues + 1});
    }


    await ticket.reload();

    if (!isNil(queue) && isNil(ticket.queueOptionId)) {

      const queueOptions = await QueueOption.findAll({
        where: {queueId: ticket.queueId, parentId: null},
        order: [
          ["option", "ASC"],
          ["createdAt", "ASC"],
        ],
      });

      const companyId = ticket.companyId;

      const buttonActive = await Setting.findOne({
        where: {
          key: "chatBotType",
          companyId
        }
      });

      const botButton = async () => {
        const buttons = [];
        queueOptions.forEach((option, i) => {
          buttons.push({
            buttonId: `${option.option}`,
            buttonText: {displayText: option.title},
            type: 4
          });
        });
        buttons.push({
          buttonId: `#`,
          buttonText: {displayText: "Menu inicial *[ 0 ]* Menu anterior"},
          type: 4
        });

        const buttonMessage = {
          text: formatBody(`\u200e${queue.greetingMessage}`, ticket),
          buttons,
          footer: 'AUTOATENDE',
          headerType: 1
        };

        const sendMsg = await wbot.sendMessage(
          `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          buttonMessage
        );

        await verifyMessage(sendMsg, ticket, ticket.contact);
      }

      const botText = async () => {
        let options = "";

        console.trace('botText')
        console.log(queue.mediaPath);
        queueOptions.forEach((option, i) => {
          options += `*[ ${option.option} ]* - ${option.title}\n`;
        });
        options += `\n*[ # ]* - Menu inicial`;


        const textMessage = {
          text: formatBody(`\u200e${queue.greetingMessage}\n\n${options}`, ticket),
        };


        let sendMsg;
        if (!queue.mediaPath) {
          sendMsg = await wbot.sendMessage(
            `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
            textMessage
          );
          await verifyMessage(sendMsg, ticket, ticket.contact);

        } else {
          const filePath = path.resolve("public", "company" + ticket.companyId, queue.mediaPath);
          const optionsMsg = await getMessageOptions(textMessage.text, filePath, textMessage.text, ticket.companyId);
          sendMsg = await wbot.sendMessage(
            `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
            {...optionsMsg}
          );

          await verifyMediaMessage(sendMsg, ticket, ticket.contact);
        }
      };

      if (buttonActive.value === "button" && QueueOption.length <= 4) {
        return botButton();
      }

      if (buttonActive.value === "text") {

        console.trace('botText')
        return botText();
      }

      if (buttonActive.value === "button" && QueueOption.length > 4) {

        console.trace('botText')
        return botText();
      }
    } else if (!isNil(queue) && !isNil(ticket.queueOptionId)) {
      const currentOption = await QueueOption.findByPk(ticket.queueOptionId);
      const queueOptions = await QueueOption.findAll({
        where: {parentId: ticket.queueOptionId},
        order: [
          ["option", "ASC"],
          ["createdAt", "ASC"],
        ],
      });

      // detectar ultima opção do chatbot e finaliza-lo
      if (queueOptions.length === 0) {
        const textMessage = {
          text: formatBody(`\u200e${currentOption.message}`, ticket),
        };

        const sendMsg = await wbot.sendMessage(
          `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          textMessage
        );

        await verifyMessage(sendMsg, ticket, ticket.contact);

        await ticket.update({
          queueOptionId: null,
          chatbot: false,
        });

        return;
      }
      if (queueOptions.length > -1) {
        const companyId = ticket.companyId;
        const buttonActive = await Setting.findOne({
          where: {
            key: "chatBotType",
            companyId
          }
        });

        const botList = async () => {
          const sectionsRows = [];
          const companyId = ticket.companyId;
          const queues = await getQueues(companyId);
          const contact = await getContactFromTicket(ticket.id);

          queues.forEach((queue, index) => {
            sectionsRows.push({
              title: `[${index + 1}] - ${queue.name}`,
              rowId: `${index + 1}`
            });
          });

          const sections = [
            {
              rows: sectionsRows
            }
          ];

          const listMessage = {
            text: formatBody(`\u200e${currentOption.message}`, ticket),
            title: "Lista",
            buttonText: "Escolha uma opção",
            sections
          };
          await sleep(1000);
          const sendMsg = await wbot.sendMessage(`
          ${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
            listMessage
          );

          await verifyMessage(sendMsg, ticket, ticket.contact);
        }

        const botButton = async () => {
          const buttons = [];
          queueOptions.forEach((option, i) => {
            buttons.push({
              buttonId: `${option.option}`,
              buttonText: {displayText: option.title},
              type: 4
            });
          });
          buttons.push({
            buttonId: `#`,
            buttonText: {displayText: "Menu inicial *[ 0 ]* Menu anterior"},
            type: 4
          });

          const buttonMessage = {
            text: formatBody(`\u200e${currentOption.message}`, ticket),
            buttons,
            headerType: 4
          };

          if (process.env.CHATBOT_RESTRICT_NUMBER?.length >= 8) {
            if (ticket.contact.number != process.env.CHATBOT_RESTRICT_NUMBER) {
              console.trace('chatbot desativado!');
              return;
            }
          }

          if (!currentOption.mediaPath) {
            const sendMsg = await wbot.sendMessage(
              `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
              buttonMessage
            );

            await verifyMessage(sendMsg, ticket, ticket.contact);
          } else {
            const filePath = path.resolve("public", "company" + ticket.companyId, currentOption.mediaPath);
            const optionsMsg = await getMessageOptions(currentOption.mediaName, filePath, buttonMessage.text, ticket.companyId);
            let sentMessage = await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {...optionsMsg});

            await verifyMediaMessage(sentMessage, ticket, ticket.contact);
          }
          const sendMsg = await wbot.sendMessage(
            `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
            buttonMessage
          );

          await verifyMessage(sendMsg, ticket, ticket.contact);
        }

        const botText = async () => {


          let options = "";

          queueOptions.forEach((option, i) => {
            options += `*[ ${option.option} ]* - ${option.title}\n`;
          });
          options += `\n*[ 0 ]* - Menu anterior`;
          options += `\n*[ # ]* - Menu inicial`;
          const textMessage = {
            text: formatBody(`\u200e${currentOption.message}\n\n${options}`, ticket),
          };


          if (process.env.CHATBOT_RESTRICT_NUMBER?.length >= 8) {
            if (ticket.contact.number != process.env.CHATBOT_RESTRICT_NUMBER) {
              console.trace('chatbot desativado!');
              return;
            }
          }

          if (!currentOption.mediaPath) {

            const sendMsg = await wbot.sendMessage(
              `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
              textMessage
            );
            await verifyMessage(sendMsg, ticket, ticket.contact);

          } else {
            const filePath = path.resolve("public", "company" + ticket.companyId, currentOption.mediaPath);
            const optionsMsg = await getMessageOptions(currentOption.mediaName, filePath, textMessage.text, ticket.companyId);
            let sentMessage = await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {...optionsMsg});

            await verifyMediaMessage(sentMessage, ticket, ticket.contact);
          }


          // if (currentOption.mediaPath !== null && currentOption.mediaPath !== "")  {

          //     const filePath = path.resolve("public", currentOption.mediaPath);


          //     const optionsMsg = await getMessageOptions(currentOption.mediaName, filePath);

          //     let sentMessage = await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, { ...optionsMsg });

          //     await verifyMediaMessage(sentMessage, ticket, ticket.contact);
          //   }
        };

        if (buttonActive.value === "list") {
          return botList();
        }
        ;

        if (buttonActive.value === "button" && QueueOption.length <= 4) {
          return botButton();
        }

        if (buttonActive.value === "text") {

          console.trace('botText 3')
          return botText();
        }

        if (buttonActive.value === "button" && QueueOption.length > 4) {
          console.trace('botText 2')
          return botText();
        }
      }
    }
  }
}

export const handleMessageIntegration = async (
  msg: proto.IWebMessageInfo,
  wbot: Session,
  queueIntegration: QueueIntegrations,
  ticket: Ticket
): Promise<void> => {


  if (process.env.CHATBOT_RESTRICT_NUMBER) {
    if (ticket.contact.number != process.env.CHATBOT_RESTRICT_NUMBER) {
      console.log('chatbot desativado!');
      return;
    }
  }

  const msgType = getTypeMessage(msg);

  if (queueIntegration.type === "n8n" || queueIntegration.type === "webhook") {
    if (queueIntegration?.urlN8N) {
      const options = {
        method: "POST",
        url: queueIntegration?.urlN8N,
        headers: {
          "Content-Type": "application/json"
        },
        json: msg
      };
      try {
        request(options, function (error, response) {
          if (error) {
            throw new Error(error);
          } else {
            console.log(response.body);
          }
        });
      } catch (error) {
        throw new Error(error);
      }
    }

  } else if (queueIntegration.type === "typebot") {

    // await typebots(ticket, msg, wbot, queueIntegration);
    await typebotListener({ticket, msg, wbot, typebot: queueIntegration});

  }
}

const messageContainsMedia = (msg: proto.IWebMessageInfo) => {
  return msg.message?.imageMessage ||
    msg.message?.audioMessage ||
    msg.message?.videoMessage ||
    msg.message?.stickerMessage ||
    msg.message?.documentMessage ||
    msg.message?.documentWithCaptionMessage?.message?.documentMessage ||
    msg.message?.ephemeralMessage?.message?.audioMessage ||
    msg.message?.ephemeralMessage?.message?.documentMessage ||
    msg.message?.ephemeralMessage?.message?.videoMessage ||
    msg.message?.ephemeralMessage?.message?.stickerMessage ||
    msg.message?.ephemeralMessage?.message?.imageMessage ||
    msg.message?.viewOnceMessage?.message?.imageMessage ||
    msg.message?.viewOnceMessage?.message?.videoMessage ||
    msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message
      ?.imageMessage ||
    msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message
      ?.videoMessage ||
    msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message
      ?.audioMessage ||
    msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message
      ?.documentMessage ||
    msg.message?.documentWithCaptionMessage?.message?.documentMessage ||
    msg.message?.templateMessage?.hydratedTemplate?.imageMessage ||
    msg.message?.templateMessage?.hydratedTemplate?.documentMessage ||
    msg.message?.templateMessage?.hydratedTemplate?.videoMessage ||
    msg.message?.templateMessage?.hydratedFourRowTemplate?.imageMessage ||
    msg.message?.templateMessage?.hydratedFourRowTemplate?.documentMessage ||
    msg.message?.templateMessage?.hydratedFourRowTemplate?.videoMessage ||
    msg.message?.templateMessage?.fourRowTemplate?.imageMessage ||
    msg.message?.templateMessage?.fourRowTemplate?.documentMessage ||
    msg.message?.templateMessage?.fourRowTemplate?.videoMessage ||
    msg.message?.interactiveMessage?.header?.imageMessage ||
    msg.message?.interactiveMessage?.header?.documentMessage ||
    msg.message?.interactiveMessage?.header?.videoMessage ||
    msg.message?.highlyStructuredMessage?.hydratedHsm?.hydratedTemplate
      ?.documentMessage ||
    msg.message?.highlyStructuredMessage?.hydratedHsm?.hydratedTemplate
      ?.videoMessage ||
    msg.message?.highlyStructuredMessage?.hydratedHsm?.hydratedTemplate
      ?.imageMessage ||
    msg.message?.highlyStructuredMessage?.hydratedHsm?.hydratedTemplate
      ?.locationMessage
}
export const handleMessage = async (
  msg: proto.IWebMessageInfo,
  wbot: Session,
  companyId: number,
  importing = false
): Promise<void> => {


  if (importing) {
    console.log("Importando mensagens!!")
    let wid = msg.key.id;
    let exists = await Message.count({
      where: {
        id: wid
      }
    });

    if (exists > 0) {

      await new Promise(a => setTimeout(a, 150));
      return;
    } else {
      await new Promise(a => setTimeout(a, 330));
    }
  }

  let mediaSent: Message | undefined;

  if (!isValidMsg(msg)) {
    console.log("Mensagem inválida!")
    console.log(msg)
    return;
  }

  if (msg.message?.ephemeralMessage) {
    msg.message = msg.message.ephemeralMessage.message;
  }

  try {
    let contact: Contact | undefined;

    const isGroup = msg.key.remoteJid?.endsWith("@g.us");

    const msgIsGroupBlock = await Setting.findOne({
      where: {
        companyId,
        key: "CheckMsgIsGroup",
      },
    });

    if (msgIsGroupBlock?.value === "enabled" && isGroup) {
      console.log("Mensagem de grupo bloqueada!")
      return;
    }

    let bodyMessage = getBodyMessage(msg);
    const msgType = getTypeMessage(msg);


    if (typeof bodyMessage === 'string') {
      bodyMessage = bodyMessage.replace(/\u200c/, "");
    }

    const hasMedia = messageContainsMedia(msg);

    if (msg.key.fromMe) {

      if (
        !hasMedia &&
        msgType !== "conversation" &&
        msgType !== "extendedTextMessage" &&
        msgType !== "vcard" &&
        msgType !== 'contactMessage' &&
        msgType !== 'ephemeralMessage' &&
        msgType !== 'protocolMessage' &&
        msgType !== "reactionMessage" &&
        msgType !== 'viewOnceMessage' &&
        msgType !== 'locationMessage' &&
        msgType !== 'hydratedContentText' &&
        msgType !== "advertising"
      ) {
        console.trace(msgType);
        return;
      }
    }

    const whatsapp = await ShowWhatsAppService(wbot.id!, companyId);

    let groupContact;

    let msgContact = await getContactMessage(msg, wbot);
    contact = await verifyContact(msgContact, wbot, companyId);

    if (isGroup) {
      if (!whatsapp.allowGroup) {
        return;
      }

      try {
        const grupoMeta = await wbot.groupMetadata(msg.key.remoteJid);
        const msgGroupContact = {
          id: grupoMeta.id,
          name: grupoMeta.subject
        };
        groupContact = await verifyContact(msgGroupContact, wbot, companyId);
      } catch (e) {
        console.log("Erro ao buscar grupo!")
        console.log(e)
        return;
      }
    }

    let unreadMessages = 0;

    if (msg.key.fromMe) {
      await cacheLayer.set(`contacts:${contact.id}:unreads`, "0");
    } else {
      const unreads = await cacheLayer.get(`contacts:${contact.id}:unreads`);
      unreadMessages = +unreads + 1;
      await cacheLayer.set(
        `contacts:${contact.id}:unreads`,
        `${unreadMessages}`
      );
    }


    const ticket = await FindOrCreateTicketService(contact, wbot.id!, unreadMessages, companyId, groupContact
      , importing);

    const ticketTraking = await FindOrCreateATicketTrakingService({
      ticketId: ticket.id,
      companyId,
      whatsappId: whatsapp?.id
    });

    ticketTraking.changed("updatedAt", true);
    await ticketTraking.update({
      updatedAt: new Date()
    });

    await provider(ticket, msg, companyId, contact, wbot as WASocket);

    if (whatsapp.complationMessage && unreadMessages === 0) {
      const lastMessage = await Message.findOne({
        where: {
          contactId: contact.id,
          companyId,
        },
        order: [["createdAt", "DESC"]],
      });

      if (formatBody(whatsapp.complationMessage, ticket).trim().toLowerCase() === lastMessage?.body.trim().toLowerCase()) {
        return;
      }
    }

    // voltar para o menu inicial

    if (bodyMessage == "#" && !importing && (!ticket.userId || ticket.status == "pending")) {
      await ticket.update({
        queueOptionId: null,
        chatbot: false,
        queueId: null,
        amountUsedBotQueues: 0
      });
      await verifyQueue(wbot, msg, ticket, ticket.contact);
      return;
    }

    try {
      if (!msg.key.fromMe && !importing) {

        if (bodyMessage != null && typeof bodyMessage !== 'string') {
          console.log(bodyMessage)

          console.trace('Expected bodyMessage to be a string, got:', typeof bodyMessage);
          return;
        }

        // ENCERRA ATENDIMENTO
        if (bodyMessage?.toUpperCase() === "SAIR" && ticket.status != "closed") {


          await SendPresenceStatus(wbot, `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`);

          const sentMessage = await wbot.sendMessage(
            `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
            {
              text: "*Você encerrou este atendimento usando o comando SAIR*.\n\n\nSe você finalizou o atendimento *ANTES* de receber um retorno do operador, ele *NÃO* irá visualizar sua solicitação!\n\nVocê deve aguardar o retorno do operador e que ele encerre seu atendimento quando necessário.\n\nUse a opção *SAIR* somente em casos de emergência ou se ficou preso em algum setor.\n\n\nPara iniciar um novo atendimento basta enviar uma nova mensagem!"
            }
          )
          await verifyMessage(sentMessage, ticket, ticket.contact);
          await UpdateTicketService({
            ticketData: {queueId: null, status: "closed"},
            ticketId: ticket.id,
            companyId: ticket.companyId,
          });

          await ticket.reload();
          return;
        }


      }
    } catch (e) {
      console.log("Erro ao salvar mensagem!")
      console.log(e);

      Sentry.captureException(e);
    }

    // Atualiza o ticket se a ultima mensagem foi enviada por mim, para que possa ser finalizado.
    try {
      await ticket.update({
        fromMe: msg.key.fromMe,
      });
    } catch (e) {
      console.log("Erro ao salvar ticket!")

      console.log(e);
      Sentry.captureException(e);
    }


    try {
      if (!msg.key.fromMe) {
        if (verifyRating(ticketTraking)) {

          await handleRating(msg, ticket, ticketTraking);
          console.log('Mensagem inválida 8! ' + msg)

          return;
        }
      }
    } catch (e) {
      console.log("Erro ao salvar avaliação!")
      Sentry.captureException(e);
      console.log(e);
    }

    if (hasMedia) {

      mediaSent = await verifyMediaMessage(msg, ticket, contact);
    } else {
      await verifyMessage(msg, ticket, contact);
    }

    const currentSchedule = await VerifyCurrentSchedule(companyId);
    const scheduleType = await Setting.findOne({
      where: {
        companyId,
        key: "scheduleType"
      }
    });

    if (!msg.key.fromMe && scheduleType && !importing)
      await handleOutOfHour(wbot, ticket, scheduleType, contact, currentSchedule, whatsapp);


    //openai na conexao
    if (
      !ticket.queue &&
      !isGroup &&
      !msg.key.fromMe &&
      !ticket.userId &&
      !isNil(whatsapp.promptId) &&
      !importing
    ) {
      await handleOpenAi(msg, wbot, ticket, contact, mediaSent);
    }

    //integraçao na conexao

    if (
      !msg.key.fromMe &&
      !ticket.isGroup &&
      !ticket.queue &&
      !ticket.user &&
      ticket.chatbot &&
      !isNil(whatsapp.integrationId) &&
      !ticket.useIntegration
      && !importing
    ) {

      const integrations = await ShowQueueIntegrationService(whatsapp.integrationId, companyId);

      await handleMessageIntegration(msg, wbot, integrations, ticket)

      return
    }

    //openai na fila
    if (
      !isGroup &&
      !msg.key.fromMe &&
      !ticket.userId &&
      !isNil(ticket.promptId) &&
      ticket.useIntegration
      //&& ticket.queueId
      && !importing
    ) {
      await handleOpenAi(msg, wbot, ticket, contact, mediaSent);
    }


    if (
      !msg.key.fromMe &&
      !ticket.isGroup &&
      !ticket.userId &&
      ticket.integrationId &&
      ticket.useIntegration &&
      !importing
    ) {

      const integrations = await ShowQueueIntegrationService(ticket.integrationId, companyId);

      await handleMessageIntegration(msg, wbot, integrations, ticket)

    }


    if (
      !ticket.queue &&
      !ticket.isGroup &&
      !msg.key.fromMe &&
      !ticket.userId &&
      whatsapp.queues.length >= 1 &&
      !ticket.useIntegration
      && !importing
    ) {

      await verifyQueue(wbot, msg, ticket, contact);

      ticketTraking.changed("chatbotAt", true)
      ticketTraking.changed("updatedAt", true)

      await ticketTraking.update({
        chatbotAt: moment().toDate(),
        updatedAt: new Date(),
      })
    }

    const dontReadTheFirstQuestion = ticket.queue === null;

    await ticket.reload();


    if (!importing && whatsapp.greetingMessage)
      await greetingMessage(wbot, ticket, msg, whatsapp, isGroup);


    if (whatsapp.queues.length == 1 && ticket.queue && !importing) {
      if (ticket.chatbot && !msg.key.fromMe && !ticket.userId) {


        await handleChartbot(ticket, msg, wbot, whatsapp);
      }
    }
    if (whatsapp.queues.length > 1 && ticket.queue && !importing) {
      if (ticket.chatbot && !msg.key.fromMe && !ticket.userId) {

        await handleChartbot(ticket, msg, wbot, whatsapp, dontReadTheFirstQuestion);
      }
    }

  } catch (err) {
    console.log(err)
    Sentry.captureException(err);
    logger.error(`Error handling whatsapp message: Err: ${err}`);
  }
};

const handleOutOfHour = async (wbot: Session, ticket: Ticket, scheduleType?: Setting, contact?: any, currentSchedule?: any
  , whatsapp?: Whatsapp
) => {
  try {

    if (outOfHourMessageControl.length > 5000)
      outOfHourMessageControl = [];

    /**
     * Tratamento para envio de mensagem quando a empresa está fora do expediente
     */
    let lastOffMessage = outOfHourMessageControl.find((o) => o.ticketId === ticket.id || o.dest === contact.number);

    if (
      scheduleType.value === "company" &&
      !isNil(currentSchedule) && whatsapp.outOfHoursMessage &&
      (!currentSchedule || currentSchedule.inActivity === false)
    ) {

      if (!lastOffMessage || (lastOffMessage && lastOffMessage.time + (1000 * 60 * 5) < new Date().getTime())) {

        if (lastOffMessage) {
          outOfHourMessageControl = outOfHourMessageControl.filter((o) => o.ticketId !== ticket.id);
          lastOffMessage = null;
        }

        if (!lastOffMessage)
          outOfHourMessageControl.push({ticketId: ticket.id, dest: contact.number, time: new Date().getTime()});

        const body = `\u200e ${whatsapp.outOfHoursMessage}`;

        const debouncedSentMessage = debounce(
          async () => {
            await wbot.sendMessage(
              `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"
              }`,
              {
                text: body
              }
            );
          },
          randomValue(1500, 3500),
          ticket.id
        );
        debouncedSentMessage();
        return;
      }

    }


    if (scheduleType.value === "queue" && ticket.queueId !== null) {

      /**
       * Tratamento para envio de mensagem quando a fila está fora do expediente
       */
      const queue = await Queue.findByPk(ticket.queueId);

      const {schedules}: any = queue;
      const now = moment();
      const weekday = now.format("dddd").toLowerCase();
      let schedule = null;

      if (Array.isArray(schedules) && schedules.length > 0) {
        schedule = schedules.find(
          s =>
            s.weekdayEn === weekday &&
            s.startTime !== "" &&
            s.startTime !== null &&
            s.endTime !== "" &&
            s.endTime !== null
        );
      }

      if (
        scheduleType.value === "queue" &&
        queue.outOfHoursMessage !== null &&
        queue.outOfHoursMessage !== "" &&
        !isNil(schedule)
      ) {
        const startTime = moment(schedule.startTime, "HH:mm");
        const endTime = moment(schedule.endTime, "HH:mm");

        let isOutOfHours = now.isBefore(startTime) || now.isAfter(endTime);
        if (!isOutOfHours) {
          if (schedule.startLunchTime && schedule.endLunchTime) {
            const startLunchTime = moment(schedule.startLunchTime, "HH:mm");
            const endLunchTime = moment(schedule.endLunchTime, "HH:mm");
            isOutOfHours = now.isBetween(startLunchTime, endLunchTime);
          }
        }

        if (isOutOfHours) {
          if (!lastOffMessage || (lastOffMessage && lastOffMessage.time + (1000 * 60 * 30) < new Date().getTime())) {
            const body = queue.outOfHoursMessage;
            const debouncedSentMessage = debounce(
              async () => {
                await wbot.sendMessage(
                  `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"
                  }`,
                  {
                    text: body
                  }
                );
              },
              randomValue(1000, 3000),
              ticket.id
            );
            debouncedSentMessage();
            return;
          }

          if (!lastOffMessage)
            outOfHourMessageControl.push({ticketId: ticket.id, dest: contact.number, time: new Date().getTime()});
        }
      }
    }


  } catch (e) {
    Sentry.captureException(e);
    console.log(e);
  }
}

const greetingMessage = async (wbot: Session, ticket: Ticket, msg: proto.IWebMessageInfo, whatsapp?: Whatsapp, isGroup?: boolean) => {

  if (!whatsapp?.queues?.length && !ticket.userId && !isGroup && !msg.key.fromMe) {

    if (process.env.CHATBOT_RESTRICT_NUMBER?.length >= 8) {
      if (ticket.contact.number != process.env.CHATBOT_RESTRICT_NUMBER) {
        return;
      }
    }

    if (greetingMessageControl.length > 5000)
      greetingMessageControl = [];

    var lastMessage = greetingMessageControl.find((o) => o.ticketId === ticket.id || o.dest === ticket.contact.number);

    if (lastMessage && lastMessage.time + (1000 * 60 * 5) >= new Date().getTime()) {
      return;
    }

    // Verifica se já foi enviada uma mensagem recentemente.
    const firstMessage = await Message.findOne({
      where: {
        ticketId: ticket.id,
        fromMe: true,
        createdAt: {
          [Op.gte]: moment().subtract(5, "minutes").toDate()
        }
      }
    });

    if (firstMessage) {
      return;
    }


    const debouncedSentMessage = debounce(
      async () => {
        if (!whatsapp.greetingMediaAttachment)
          await wbot.sendMessage(
            `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"
            }`,
            {
              text: formatBody(whatsapp.greetingMessage, ticket)
            }
          );
        else {
          const filePath = path.resolve("public", "company" + ticket.companyId, whatsapp.greetingMediaAttachment);
          const optionsMsg = await getMessageOptions(whatsapp.greetingMediaAttachment, filePath, whatsapp.greetingMessage, ticket.companyId);
          await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {...optionsMsg});
        }
      },
      1000,
      ticket.id
    );
    debouncedSentMessage();
    return;

  }
}
export const handleMsgAck = async (
  msg: WAMessage,
  chat: number | null | undefined
) => {
  const io = getIO();

  try {
    const messageToUpdate = await Message.findByPk(msg.key.id, {
      include: [
        "contact",
        {
          model: Message,
          as: "quotedMsg",
          include: ["contact"],
        },
      ],
    });

    if (!messageToUpdate) {
      console.log(msg);
      console.log('Mensagem não encontrada!')
      return;
    }


    await messageToUpdate.update({ack: chat});

    io.to(messageToUpdate.ticketId.toString()).emit(
      `company-${messageToUpdate.companyId}-appMessage`,
      {
        action: "update",
        message: messageToUpdate,
      }
    );
  } catch (err) {
    Sentry.captureException(err);
    logger.error(`Error handling message ack. Err: ${err}`);
  }
};

export const verifyRecentCampaign = async (
  message: proto.IWebMessageInfo,
  companyId: number
) => {
  if (!message.key.fromMe) {
    const number = message.key.remoteJid.replace(/\D/g, "");
    const campaigns = await Campaign.findAll({
      where: {companyId, status: "EM_ANDAMENTO", confirmation: true},
    });
    if (campaigns) {
      const ids = campaigns.map((c) => c.id);
      const campaignShipping = await CampaignShipping.findOne({
        where: {campaignId: {[Op.in]: ids}, number, confirmation: null},
      });

      if (campaignShipping) {
        await campaignShipping.update({
          confirmedAt: moment(),
          confirmation: true,
        });
        await campaignQueue.add(
          "DispatchCampaign",
          {
            campaignShippingId: campaignShipping.id,
            campaignId: campaignShipping.campaignId,
          },
          {
            delay: parseToMilliseconds(randomValue(0, 10)),
          }
        );
      }
    }
  }
};

export const verifyCampaignMessageAndCloseTicket = async (
  message: proto.IWebMessageInfo,
  companyId: number
) => {
  const io = getIO();
  const body = getBodyMessage(message);
  const isCampaign = /\u200c/.test(body);
  if (message.key.fromMe && isCampaign) {
    const messageRecord = await Message.findOne({
      where: {id: message.key.id!, companyId},
    });
    const ticket = await Ticket.findByPk(messageRecord.ticketId);
    await ticket.update({status: "closed"});

    io.to(`company-${ticket.companyId}-open`).emit(`company-${ticket.companyId}-ticket`, {
      action: "delete",
      ticket,
      ticketId: ticket.id,
    });

    io
      .to(`company-${companyId}-${ticket.status}`)
      .to(ticket.id.toString())
      .emit(`company-${ticket.companyId}-ticket`, {
        action: "update",
        ticket,
        ticketId: ticket.id,
      });
  }
};

const filterMessages = (msg: WAMessage): boolean => {

  if (
    [
      WAMessageStubType.REVOKE,
      WAMessageStubType.E2E_DEVICE_CHANGED,
      WAMessageStubType.E2E_IDENTITY_CHANGED,
      WAMessageStubType.CIPHERTEXT
    ].includes(msg.messageStubType as WAMessageStubType)
  )
    return false;

  return true;
};


export const wbotMessageListener = async (wbot: Session, companyId: number, whatsapp: Whatsapp): Promise<void> => {

  wbot.ev.on("messages.upsert", async (messageUpsert: ImessageUpsert) => {


    const messages = messageUpsert.messages
      .filter(filterMessages);

    if (!messages) return;


    await app.get("queues").messageQueue.add(
      "HandleMessageJob",
      {
        whatsappId: whatsapp.id,
        messages,
        companyId,
      },
      {removeOnComplete: true, attempts: 3}
    );

  });

  wbot.ev.on("messages.update", async (messageUpdate: WAMessageUpdate[]) => {
    if (messageUpdate.length === 0) return;
    await app.get("queues").messageQueue.add(
      "MessageUpdateJob",
      {
        whatsappId: whatsapp.id,
        messageUpdate,
        companyId
      },
      {removeOnComplete: true, attempts: 3, delay: 100}
    );

  });

  wbot.ev.on("groups.update", (groupUpdates: GroupMetadata[]) => {
    console.log(groupUpdates);
    if (groupUpdates.length === 0) return;
    groupUpdates.forEach(async (group: GroupMetadata) => {
      const number = group.id.replace(/\D/g, "");
      const nameGroup = group.subject || number;

      const contactData = {
        name: nameGroup,
        number: number,
        isGroup: true,
        companyId: companyId,
        remoteJid: group.id,
        whatsappId: wbot.id
      };

      await CreateOrUpdateContactService(contactData, wbot, group.id);

    });
  })

};
