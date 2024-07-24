import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";

const GetProfilePicUrl = async (
  number: string,
  companyId: number
): Promise<string> => {
  const defaultWhatsapp = await GetDefaultWhatsApp(companyId);

  const wbot = getWbot(defaultWhatsapp.id);

  let isGroup = number.endsWith("@g.us") || (number.includes("-") && number.length > 10);

  let cleanNumber = number.replace(/[^0-9]/g, "");
  let profilePicUrl: string;
  try {
    profilePicUrl = await wbot.profilePictureUrl(isGroup ? `${number}@g.us` :`${number}@s.whatsapp.net`, null, 10000);
  } catch (error) {
    console.trace(`Error getting profile picture for ${number}: ${error.message}`);
    profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
  }

  return profilePicUrl;
};

export default GetProfilePicUrl;
