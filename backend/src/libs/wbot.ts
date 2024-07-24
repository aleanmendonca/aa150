import * as Sentry from "@sentry/node";
import makeWASocket, {
  WASocket,
  Browsers,
  DisconnectReason,
  jidNormalizedUser,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  makeInMemoryStore,
  isJidBroadcast,
  isJidStatusBroadcast,
  CacheStore,
  proto
} from "@whiskeysockets/baileys";

import { FindOptions } from "sequelize";

import Whatsapp from "../models/Whatsapp";
import Message from "../models/Message";
import Contact from "../models/Contact";
import {logger} from "../utils/logger";
import MAIN_LOGGER from "@whiskeysockets/baileys/lib/Utils/logger";
import authState from "../helpers/authState";
import {Boom} from "@hapi/boom";
import AppError from "../errors/AppError";
import {getIO} from "./socket";
import {Store} from "./store";
import {StartWhatsAppSession} from "../services/WbotServices/StartWhatsAppSession";
import DeleteBaileysService from "../services/BaileysServices/DeleteBaileysService";
import NodeCache from 'node-cache';
import {add} from "date-fns";

import {isValidMsg} from "../services/WbotServices/wbotMessageListener";
import ImportWhatsAppMessageService from "../services/WhatsappService/ImportWhatsAppMessageService";


const loggerBaileys = MAIN_LOGGER.child({});
loggerBaileys.level = "silent";
export type Session = WASocket & {
  id?: number;
  store?: Store;
};
const sessions: Session[] = [];
const retriesQrCodeMap = new Map<number, number>();
export const getWbot = (whatsappId: number): Session => {
  const sessionIndex = sessions.findIndex(s => s.id === whatsappId);
  if (sessionIndex === -1) {
    throw new AppError("ERR_WAPP_NOT_INITIALIZED");
  }
  return sessions[sessionIndex];
};

// Remove a conexão
export const removeWbot = async (
  whatsappId: number,
  isLogout = true
): Promise<void> => {
  try {
    const sessionIndex = sessions.findIndex(s => s.id === whatsappId);
    if (sessionIndex !== -1) {
      if (isLogout) {
        sessions[sessionIndex].logout();
        sessions[sessionIndex].ws.close();
      }
      sessions.splice(sessionIndex, 1);
    }
  } catch (err) {
    logger.error(err);
  }
};

// Reinicia a conexão
export const restartWbot = async (
  companyId: number,
  session?: any
): Promise<void> => {
  try {
    const options: FindOptions = { where: { companyId }, attributes: ["id"] };
    const whatsapp = await Whatsapp.findAll(options);
    whatsapp.map(async c => {
      const sessionIndex = sessions.findIndex(s => s.id === c.id);
      if (sessionIndex !== -1) {
        sessions[sessionIndex].ws.close();
      }
    });
  } catch (err) {
    logger.error(err);
  }
};

export let dataMessages = [];

export const initWASocket = async (whatsapp: Whatsapp): Promise<Session> => {
  return new Promise(async (resolve, reject) => {
    try {
      await (async () => {
        const io = getIO();
        const whatsappUpdate = await Whatsapp.findOne({
          where: {id: whatsapp.id}
        });
        if (!whatsappUpdate) return;
        const {id, name, provider} = whatsappUpdate;
        const {version, isLatest} = await fetchLatestBaileysVersion();
        const isLegacy = provider === "stable" ? true : false;
        logger.info(`using WA v${version.join(".")}, isLatest: ${isLatest}`);
        logger.info(`isLegacy: ${isLegacy}`);
        logger.info(`Starting session ${name}`);
        let retriesQrCode = 0;
        let wsocket: Session = null;
        const store = makeInMemoryStore({
          logger: loggerBaileys
        });
        const {state, saveState} = await authState(whatsapp);
        const msgRetryCounterCache = new NodeCache();

        wsocket = makeWASocket({
          logger: loggerBaileys,
          printQRInTerminal: false,
          browser: [
            process.env.BROWSER_CLIENT || "AutoAtende",
            process.env.BROWSER_NAME || "Chrome",
            process.env.BROWSER_VERSION || "10.0"
          ],
          auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, loggerBaileys),
          },
          msgRetryCounterCache,
          shouldIgnoreJid: (jid) => { return isJidBroadcast(jid) || jid.includes('newsletter') },
          version: [2, 2413, 1],
          patchMessageBeforeSending(message) {
            if (message.deviceSentMessage?.message?.listMessage?.listType === proto.Message.ListMessage.ListType.PRODUCT_LIST) {
              message = JSON.parse(JSON.stringify(message));
              message.deviceSentMessage.message.listMessage.listType = proto.Message.ListMessage.ListType.SINGLE_SELECT;
            }
            if (message.listMessage?.listType == proto.Message.ListMessage.ListType.PRODUCT_LIST) {
              message = JSON.parse(JSON.stringify(message));
              message.listMessage.listType = proto.Message.ListMessage.ListType.SINGLE_SELECT;
            }
            return message;
          }
        });

        if (whatsappUpdate?.importOldMessages) {
          let startImportDate = new Date(whatsappUpdate.importOldMessages).getTime()
          let endImportDate = whatsappUpdate.importRecentMessages != "" ?
            new Date(whatsappUpdate.importRecentMessages).getTime() : new Date().getTime();

          console.log('Importando whtasapp!')

          const timeBeforeImport = new Date().getTime()
          await whatsappUpdate.update({statusImportMessages: timeBeforeImport})
          wsocket.ev.on('messaging-history.set', async (historyEvent) => {

            const time = new Date().getTime()
            await whatsappUpdate.update({statusImportMessages: time})
            const i = whatsapp.id
            let messages = historyEvent.messages
            let queueMessages = []
            messages.forEach((message) => {
              const messageDate = Math.floor((<number>message.messageTimestamp) * 1000)
              if (isValidMsg(message)) {
                if ((startImportDate <= messageDate && endImportDate >= messageDate)) {
                  if (message.key?.remoteJid.split('@')[1] != 'g.us') {
                    //   console.log('Adicionando mensagem para pos processamento');
                    queueMessages.push(message)
                  } else {
                    if (whatsappUpdate?.importOldMessagesGroups) {
                      //  console.log('Mensagem de GRUPO');

                      queueMessages.push(message)
                    }
                  }
                }

              }
            })
            if (!dataMessages?.[i]) {
              dataMessages[i] = []
            }

            dataMessages[i].unshift(...queueMessages)

            setTimeout(async () => {

              io
                .to(`company-${whatsappUpdate.companyId}-mainchannel`)
                .emit('importMessages-' + whatsappUpdate.companyId, {
                action: 'update',
                status: {
                  this: -1,
                  all: -1,
                },
              })
              io
                .to(`company-${whatsappUpdate.companyId}-mainchannel`)
                .emit('whatsappSession', {
                action: 'update',
                session: whatsappUpdate,
              })
            }, 500)
            setTimeout(async () => {


              let importDateIsValid = !isNaN(
                new Date(
                  Math.floor(parseInt(whatsappUpdate?.statusImportMessages))
                ).getTime()
              )
              if (importDateIsValid) {
                const importTime = new Date(
                  Math.floor(parseInt(whatsappUpdate?.statusImportMessages))
                ).getTime()

                const nextImportTime = +add(importTime, {seconds: +45}).getTime()
                if (nextImportTime < new Date().getTime()) {
                  await ImportWhatsAppMessageService(whatsappUpdate)
                  whatsappUpdate.update({statusImportMessages: 'Running'})
                }

              }

              io
                .to(`company-${whatsappUpdate.companyId}-mainchannel`)
                .emit('whatsappSession', {
                action: 'update',
                session: whatsappUpdate,
              })
            }, 45000)
          })
        }

        wsocket.ev.on(
          "connection.update",
          async ({connection, lastDisconnect, qr}) => {
            logger.info(
              `Socket  ${name} Connection Update ${connection || ""} ${lastDisconnect || ""
              }`
            );
            if (wsocket && wsocket.ev) { // Adicionando verificação para evitar referência nula
              if (connection === "close") {
                if ((lastDisconnect?.error as Boom)?.output?.statusCode === 403) {
                  await whatsapp.update({
                    status: "PENDING",
                    session: "",
                    number: ""
                  });
                  await DeleteBaileysService(whatsapp.id);
                  io

                    .to(`company-${whatsapp.companyId}-mainchannel`)

                    .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                    action: "update",
                    session: whatsapp
                  });
                  await removeWbot(id, false);
                }
                if (
                  (lastDisconnect?.error as Boom)?.output?.statusCode !==
                  DisconnectReason.loggedOut
                ) {
                  await removeWbot(id, false);
                  setTimeout(
                    () => StartWhatsAppSession(whatsapp, whatsapp.companyId),
                    2000
                  );
                } else {
                  await whatsapp.update({
                    status: "PENDING",
                    session: "",
                    number: ""
                  });
                  await DeleteBaileysService(whatsapp.id);
                  io
                    .to(`company-${whatsapp.companyId}-mainchannel`)
                    .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                    action: "update",
                    session: whatsapp
                  });
                  await removeWbot(id, false);
                  setTimeout(
                    () => StartWhatsAppSession(whatsapp, whatsapp.companyId),
                    2000
                  );
                }
              }

              if (connection === "open") {
                await whatsapp.update({
                  status: "CONNECTED",
                  qrcode: "",
                  retries: 0,
                  number:
                    wsocket.type === "md"
                      ? jidNormalizedUser((wsocket as WASocket).user.id).split(
                          "@"
                        )[0]
                      : "-"
                });

                io
                  .to(`company-${whatsapp.companyId}-mainchannel`)
                  .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                  action: "update",
                  session: whatsapp
                });

                const sessionIndex = sessions.findIndex(
                  s => s.id === whatsapp.id
                );
                if (sessionIndex === -1) {
                  wsocket.id = whatsapp.id;
                  sessions.push(wsocket);
                }

                resolve(wsocket);
              }

              if (qr !== undefined) {
                if (retriesQrCodeMap.get(id) && retriesQrCodeMap.get(id) >= 3) {
                  await whatsappUpdate.update({
                    status: "DISCONNECTED",
                    qrcode: ""
                  });
                  await DeleteBaileysService(whatsappUpdate.id);
                  io
                    .to(`company-${whatsapp.companyId}-mainchannel`)
                    .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                    action: "update",
                    session: whatsappUpdate
                  });
                  wsocket.ev.removeAllListeners("connection.update");
                  wsocket.ws.close();
                  wsocket = null;
                  retriesQrCodeMap.delete(id);
                } else {
                  logger.info(`Session QRCode Generate ${name}`);
                  retriesQrCodeMap.set(id, (retriesQrCode += 1));

                  await whatsapp.update({
                    qrcode: qr,
                    status: "qrcode",
                    retries: 0,
                    number: ""
                  });
                  const sessionIndex = sessions.findIndex(
                    s => s.id === whatsapp.id
                  );

                  if (sessionIndex === -1) {
                    wsocket.id = whatsapp.id;
                    sessions.push(wsocket);
                  }

                  io
                    .to(`company-${whatsapp.companyId}-mainchannel`)
                    .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                    action: "update",
                    session: whatsapp
                  });
                }
              }
            } else {
              console.log("wsocket or wsocket.ev is null.");
            }
          }
        );
        wsocket.ev.on("creds.update", saveState);

        wsocket.ev.on("presence.update",async ({ id: remoteJid, presences }) => {
          try {
            const contact = await Contact.findOne({
              where: {
                number: remoteJid.replace(/\D/g, ""),
                companyId: whatsapp.companyId
              }
            });

            await contact.update({
              presence: presences[remoteJid].lastKnownPresence
            });

            await contact.reload();

            io.to(`company-${whatsapp.companyId}-mainchannel`).emit(`company-${whatsapp.companyId}-contact`,
              {
                action: "update",
                contact
              }
            );
          } catch (e) {}
        });
        store.bind(wsocket.ev);
      })();
    } catch (error) {
      Sentry.captureException(error);
      console.log(error);
      reject(error);
    }
  });
};
