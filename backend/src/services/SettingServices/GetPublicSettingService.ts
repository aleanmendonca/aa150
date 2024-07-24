import Setting from "../../models/Setting";

interface Request {
  key: string;
  companyId?: number;
}

const publicSettingsKeys = [
  "primaryColorLight",
  "secondaryColorLight",
  "primaryColorDark",
  "secondaryColorDark",
  "appLogoLight",
  "appLogoDark",
  "appLogoFavicon",
  "appName",
  "chatlistLight",
  "chatlistDark",
  "boxRightLight",
  "boxRightDark",
  "boxLeftLight",
  "boxLeftDark",
  "allowSignup",
  "privacy",
  "terms",
  "trialExpiration",
]


export const GetAllPublicSettingsService = async (companyId): Promise<Setting[] | undefined> => {

  if (!companyId || companyId <= 0) {
    companyId = 1;
  }

  const companySettings = await Setting.findAll({
    where: {
      key: publicSettingsKeys,
      companyId: companyId
    },
    attributes: ["key", "value"]
  });

  return companySettings;
}

const GetPublicSettingService = async ({
                                         key,
                                         companyId
                                       }: Request): Promise<string | undefined> => {

  if (!publicSettingsKeys.includes(key)) {
    return "Not allowed";
  }

  if (companyId) {
    const companySetting = await Setting.findOne({
      where: {
        companyId: companyId,
        key
      },
      attributes: ["key", "value"]
    });

    if (companySetting?.value) {
      return companySetting.value;
    }
  }

  const setting = await Setting.findOne({
    where: {
      companyId: 1,
      key
    },
    attributes: ["key", "value"]
  });

  return setting?.value;
};

export default GetPublicSettingService;
