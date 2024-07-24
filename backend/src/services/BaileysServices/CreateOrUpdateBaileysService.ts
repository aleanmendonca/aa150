import { Chat, Contact } from "@whiskeysockets/baileys";
import Baileys from "../../models/Baileys";
import { isArray } from "lodash";

interface Request {
  whatsappId: number;
  contacts?: Contact[];
  chats?: Chat[];
}

// Corrigido para garantir que os objetos sejam serializados corretamente antes de salvar
const createOrUpdateBaileysService = async ({
  whatsappId,
  contacts,
  chats
}: Request): Promise<Baileys> => {
  const baileysExists = await Baileys.findOne({
    where: { whatsappId }
  });

  if (baileysExists) {
    let getChats = baileysExists.chats
      ? JSON.parse(JSON.stringify(baileysExists.chats))
      : [];
    let getContacts = baileysExists.contacts
      ? JSON.parse(JSON.stringify(baileysExists.contacts))
      : [];

    if (chats && isArray(getChats)) {
      getChats.push(...chats);
      getChats.sort();
      getChats = getChats.filter((v, i, a) => a.indexOf(v) === i); // Corrigido para atribuir o resultado de filter de volta a getChats
    }

    if (contacts && isArray(getContacts)) {
      getContacts.push(...contacts);
      getContacts.sort();
      getContacts = getContacts.filter((v, i, a) => a.indexOf(v) === i); // Corrigido para atribuir o resultado de filter de volta a getContacts
    }

    const newBaileys = await baileysExists.update({
      chats: JSON.stringify(getChats),
      contacts: JSON.stringify(getContacts)
    });

    return newBaileys;
  }

  const baileys = await Baileys.create({
    whatsappId,
    contacts: JSON.stringify(contacts),
    chats: JSON.stringify(chats)
  });

  return baileys;
};

export default createOrUpdateBaileysService;
