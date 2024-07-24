import {head} from "lodash";
import XLSX from "xlsx";
import {has} from "lodash";
import CheckContactNumber from "../WbotServices/CheckNumber";
import {logger} from "../../utils/logger";
import Contact from "../../models/Contact";

const attrNames = {
  NAME: ["nome", "Nome"],
  NUMBER: ["numero", "número", "Numero", "Número"],
  EMAIL: ["email", "e-mail", "Email", "E-mail"]
};

function extractContact(data: any, companyId: unknown) {
  const name = getValue(data, attrNames.NAME);
  let number = getValue(data, attrNames.NUMBER);
  number = ("" + number).replace(/\D/g, "");
  const email = getValue(data, attrNames.EMAIL);

  return {name, number, email, companyId};
}

function getValue(data: any, attributes: string[]) {
  for (const attr of attributes) {
    if (has(data, attr)) {
      return data[attr];
    }
  }
  return "";
}

export async function ImportXLSContactsService(
  companyId: number,
  file: Express.Multer.File | undefined
) {
  const workbook = XLSX.readFile(file?.path as string);
  const worksheet = head(Object.values(workbook.Sheets)) as any;
  const rows: any[] = XLSX.utils.sheet_to_json(worksheet, {header: 0});

  const contacts = rows.map((data) => extractContact(data, companyId));

  const contactList: Contact[] = [];
  for (const contact of contacts) {
    const [newContact, created] = await Contact.findOrCreate({
      where: {number: `${contact.number}`, companyId: contact.companyId},
      defaults: contact
    });
    if (created) {
      contactList.push(newContact);
    }
  }
  if (contactList) {
    for (let newContact of contactList) {
      try {
        const response = await CheckContactNumber(newContact.number, companyId);
        const number = response.jid.replace(/\D/g, "");
        newContact.number = number;

        await newContact.save();
      } catch (e) {
        logger.error(`Número de contato inválido: ${newContact.number}`);
      }
    }
  }
  return contactList;
}
