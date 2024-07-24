import Ticket from "../../models/Ticket";
import User from "../../models/User";
import { createClient } from 'redis';
import Contact from "../../models/Contact";
import { WASocket, proto } from "@whiskeysockets/baileys";
import { Store } from "../../libs/store";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import {getBodyMessage} from "../WbotServices/wbotMessageListener";
import ShowTicketService from "../TicketServices/ShowTicketService";
import Message from "../../models/Message";
import { getIO } from "../../libs/socket";
import { number } from "yup";
import SendWhatsAppMessage from "./SendWhatsAppMessage";
import Queue from "../../models/Queue";

type Session = WASocket & {
  id?: number;
  store?: Store;
};

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

export const CheckConnection = async ({
    waid,
    code,
    companyId,
    wbot
}:{waid: string; code: string; companyId: number; wbot: Session}): Promise<boolean> => {

    //BUSCA O USUARIO QUE TEM ESTE TELEFONE
    const user = await User.findOne({
        where:{
            waid,
            companyId
        },
        include: [
          {model: Queue}
        ]
    })

    if (!user)
        return false;

    //BUSA O TICKET QUE TENHA ESTE CÓDIGO, QUE SEJA DESTE USUÁRIO E QUE AINDA NÃO TENHA SIDO ABERTO
    const ticket = await Ticket.findOne({
        where: {
          iCode: code,
          companyId,
          status: "pending"
        },
        include: [
          { model: Contact },
          {model: Queue}
        ]
      });

    if (!ticket){
      await wbot.sendMessage(`${waid}@s.whatsapp.net`,{text: "Ticket não encontrado ou já foi aberto!"});
      return true;
    }

    //O TICKET NÃO ESTA NO NOME DESTE USUÁRIO
    //VERIFICAR SE AMBOS COMPARTILHAM A MESMA FILA
    const userQueueIds = user.queues.map(queue => queue.id);

    // Em seguida, verificamos se a fila do ticket está entre as filas do usuário
    const ticketQueueId = ticket?.queueId; // Supondo que 'Queue' é a propriedade que contém a fila associada ao ticket
    if (ticketQueueId){
      if (!userQueueIds.includes(ticketQueueId)) {
          // O usuário NÃO tem acesso à fila do ticket
          console.log("O usuário NÃO tem acesso à fila do ticket.");
          // Você pode optar por enviar uma mensagem ou tomar outra ação apropriada aqui
          await wbot.sendMessage(`${waid}@s.whatsapp.net`, {text: "Você não tem acesso a esta fila."});
          return true;
      }
    } else {
      if (ticket.userId !== user.id){
        console.log("O usuário NÃO tem acesso ao ticket.");
        // Você pode optar por enviar uma mensagem ou tomar outra ação apropriada aqui
        await wbot.sendMessage(`${waid}@s.whatsapp.net`, {text: "Você não tem acesso a este ticket."});
        return true;
      }
    }

    if (ticket.contact.number === waid){
      await wbot.sendMessage(`${waid}@s.whatsapp.net`,{text: "Você não pode se conectar consigo mesmo!"});
      return true;
    }

    //CRIAR UMA CONEXAO NO REDIS
    const client = createClient({
        url: process.env.REDIS_URI
    });
    await client.connect();

    //CRIA UM VINCULO ENTRE O CLIENTE E O COLABORADOR
    let json =  {type: "user", ticketId: ticket.id, userId: user.id, number: waid, companyId}
    await client.set(ticket.contact.number, JSON.stringify(json), {
        EX: 86400, // Define o TTL para 24 horas
        });

    //CRIA UM VINCULO ENTRE O COLABORADOR E O CLIENTE
    json = {type:"assistant", ticketId: ticket.id, number: ticket.contact.number, userId: user.id, companyId};
    await client.set(waid, JSON.stringify(json), {
        EX: 86400, // Define o TTL para 24 horas
        });

    await client.disconnect();

    //ABRE O TICKET COMO SE TIVESSE ABRINDO PELA INTERFACE
    const ticketNew = await UpdateTicketService({
      ticketData: {status:"open", userId: user.id}, ticketId: ticket.id, companyId
    });

    //NOTIFICA QUE TÁ CONECTADO
    await wbot.sendMessage(`${waid}@s.whatsapp.net`,{text: "Conectado com sucesso, agora responda ao cliente. Para sair da conversa, digite:\nsair"});
    return true;
  };

//DISCONECTA O COLABORADOR DO PROXY WHATSAPP
export const Disconnect = async ({
    msg,
    companyId,
    wbot
}:{msg: proto.IWebMessageInfo; companyId: number; wbot: Session}): Promise<boolean> => {
  //CRIAR UMA CONEXAO NO REDIS
  let ret = false;
  const client = createClient({
      url: process.env.REDIS_URI
  });
  await client.connect();
  const waid = msg.key.remoteJid.replace('@s.whatsapp.net','');
  const sRow = await client.get(waid);

  if (sRow){
    const row = JSON.parse(sRow);
    if (row.type == "assistant" && row.companyId == companyId){
      const ticketNew = await UpdateTicketService({
        ticketData: {status:"closed", userId: row.userId}, ticketId: row.ticketId, companyId
      });

      //MATA A CONEXAO DO COLABORADOR COM O CLIENTE
      await client.del(waid);

      //MATA A CONEXAO DO CLIENTE PARA COM O COLABORADOR
      await client.del(row.number);
      await wbot.sendMessage(`${waid}@s.whatsapp.net`,{text: "Desconectado com sucesso"});
      ret = true;
    }
  }
  client.disconnect();
  return ret;
}

  export const ResponseProxy = async ({
    msg,
    companyId,
    wbot
}:{msg: proto.IWebMessageInfo; companyId: number; wbot: Session}): Promise<boolean> => {
  const body = getBodyMessage(msg);
  const waid = msg.key.remoteJid.replace('@s.whatsapp.net','');

  //NÃO FAZ NADA POIS ELE ESTA ENVIANDO A MENSAGEM PARA ELE MESMO
  if (msg.key.fromMe)
    return false;

  //CRIAR UMA CONEXAO NO REDIS
  const client = createClient({
      url: process.env.REDIS_URI
  });
  await client.connect();
  const sRow = await client.get(waid);

  //NAO ENCONTROU O REGISTRO NO REDIS
  if (!sRow)
    return false;

  const row = JSON.parse(sRow);

  //NÀO FOI UM COLABORADOR QUE MANDOU
  if (row.type !== "assistant")
    return false;

  //VERIFICA SE O COLABORADOR QUER DESCONECTAR
  if (body.toLowerCase() === "sair"){
    const ret = await Disconnect({
      msg,
      companyId,
      wbot
    });

    if (ret)
      return;
  }

  if (body.toLowerCase() == "audio"){

  }

  //CARREGOU O TICKET, AGORA RESPONDE
  const ticket = await ShowTicketService(row.ticketId, companyId);
  //CARREGOU O TICKET, AGORA RESPONDE
  let messageData : MessageData = {
      id: msg.key.id,
      ticketId: row.ticketId,
      body,
      contactId: ticket.contactId,
      fromMe: true,
      read: true
  }
  //await Message.upsert({ ...messageData, companyId });
  await wbot.sendMessage(`${row.number}@s.whatsapp.net`,{ forward: msg });
  return true;
}

export const SendMessageConnectedStaffMember = async ({
  msg,
  companyId,
  wbot,
  body
}:{msg: proto.IWebMessageInfo; companyId: number; wbot: Session; body: string}): Promise<boolean> => {
  if (msg.key.fromMe)
    return false;

  const waid = msg.key.remoteJid.replace('@s.whatsapp.net','');
  //CRIAR UMA CONEXAO NO REDIS
  const client = createClient({
      url: process.env.REDIS_URI
  });
  await client.connect();
  const sRow = await client.get(waid);
  if (!sRow)
    return false;

  const row = JSON.parse(sRow);
  if (row.type != "user" || row.companyId != companyId)
    return false;

  await wbot.sendMessage(`${row.number}@s.whatsapp.net`,{ forward: msg });

  return true;
}
