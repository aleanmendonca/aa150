import {getIO} from "../../libs/socket";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";
import {isNil} from "lodash";
import {Session} from "../../libs/wbot";
import GetProfilePicUrl from "../WbotServices/GetProfilePicUrl";

interface ExtraInfo extends ContactCustomField {
  name: string;
  value: string;
}

interface Request {
  name: string;
  number: string;
  isGroup: boolean;
  email?: string;
  remoteJid?: string;
  companyId: number;
  extraInfo?: ExtraInfo[];
  disableBot?: false;
  whatsappId?: number;

}

const CreateOrUpdateContactService = async ({
                                              name,
                                              number: rawNumber,
                                              remoteJid,
                                              isGroup,
                                              email = "",
                                              companyId,
                                              extraInfo = [],
                                              disableBot = false,
                                              whatsappId
                                            }: Request, wbot: Session, msgContactId): Promise<Contact> => {
  const number = isGroup ? rawNumber : rawNumber.replace(/[^0-9]/g, "");


  const io = getIO();
  let contact: Contact | null;

  contact = await Contact.findOne({
    where: {
      number,
      companyId
    }
  });

  if (contact) {
    //if contact name is only numbers and passed name is not numbers, update name
    if (name && (!contact.name || contact.name.match(/^[0-9]*$/)) && !name.match(/^[0-9]*$/)) {
      contact.changed('name', true);
      contact.changed('updatedAt', true);
      let profilePicUrl: string;
      try {
        profilePicUrl = await GetProfilePicUrl(rawNumber, companyId);
      } catch (e) {
        console.log("Error getting profile picture 2: " + e);
      }

      if (profilePicUrl?.endsWith("nopicture.png")) {
        profilePicUrl = contact.profilePicUrl;
      }

      contact.update({name, profilePicUrl});

    }


    //check if last update is bigger than 7 days
    const lastUpdate = new Date(contact.updatedAt);
    const now = new Date();
    const diff = now.getTime() - lastUpdate.getTime();
    const diffDays = Math.ceil(diff / (1000 * 3600 * 24));

    if (diffDays >= 3) {


      let profilePicUrl: string;
      try {
        profilePicUrl = await GetProfilePicUrl(rawNumber, companyId);
      } catch (e) {
        console.log("Error getting profile picture: " + e);
      }
      contact.changed('updatedAt', true);

      if (!profilePicUrl?.endsWith("nopicture.png")) {
        contact.update({profilePicUrl, updatedAt: new Date()});
      } else {
        contact.update({updatedAt: new Date()});
      }
    }

    if (isNil(contact.whatsappId === null)) {
      contact.update({
        whatsappId
      });
    }
    io
      .to(`company-${companyId}-mainchannel`)
      .emit(`company-${companyId}-contact`, {
        action: "update",
        contact
      });

  } else {
    let profilePicUrl: string;
    try {
      profilePicUrl = await GetProfilePicUrl(rawNumber, companyId);
    } catch (e) {
      //console.log("Error getting profile picture", e);
      profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
    }

    contact = await Contact.create({
      name,
      number,
      profilePicUrl,
      email,
      isGroup,
      extraInfo,
      companyId,
      disableBot,
      whatsappId
    });


    io
      .to(`company-${companyId}-mainchannel`)
      .emit(`company-${companyId}-contact`, {
        action: "create",
        contact
      });
  }

  return contact;
};

export default CreateOrUpdateContactService;
