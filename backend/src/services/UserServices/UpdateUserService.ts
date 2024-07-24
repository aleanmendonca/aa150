import * as Yup from "yup";

import AppError from "../../errors/AppError";
import ShowUserService from "./ShowUserService";
import Company from "../../models/Company";
import User from "../../models/User";

interface UserData {
  email?: string;
  password?: string;
  name?: string;
  profile?: string;
  companyId?: number;
  queueIds?: number[];
  allTicket?: string;
  whatsappId?: number;
  startWork?: string;
  endWork?: string;
  spy?: string;
  isTricked?: string;
  super?: boolean;
  defaultMenu?: string;
}

interface Request {
  userData: UserData;
  userId: string | number;
  requestUserId: number;
}

interface Response {
  id: number;
  name: string;
  email: string;
  profile: string;
}

const UpdateUserService = async ({
  userData,
  userId,
  requestUserId
}: Request): Promise<Response | undefined> => {
  const user = await ShowUserService(userId, requestUserId);

  const requestUser : User = await User.findByPk(requestUserId);

  if (
    (requestUser.super === false && userData.companyId !== requestUser.companyId) ||
    (requestUser.profile !== "admin" && +userId !== requestUser.id )
  ) {
    throw new AppError("ERR_FORBIDDEN", 403);
  }

  const schema = Yup.object().shape({
    name: Yup.string().min(2),
    email: Yup.string().email(),
    profile: Yup.string(),
    password: Yup.string(),
    super: Yup.boolean()
  });

  const { email, password, profile, name, queueIds = [], allTicket, whatsappId, startWork, endWork, spy, isTricked, super: superStatus, defaultMenu } = userData;

  try {
    await schema.validate({ email, password, profile, name, super: superStatus });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  if (requestUser.profile === "admin") {
    await user.update({
      email,
      password,
      profile,
      name,
      allTicket,
      whatsappId: whatsappId || null,
      startWork,
      endWork,
      spy,
      isTricked,
      super: superStatus,      
      defaultMenu
    });
    await user.$set("queues", queueIds);
  } else {
    await user.update({
      email,
      password,
      name,
      allTicket,
      whatsappId: whatsappId || null,
      startWork,
      endWork,
      spy,
      isTricked,
      super: superStatus,      
      defaultMenu
    });
  }

  await user.reload();

  const company = await Company.findByPk(user.companyId);

  const serializedUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    profile: user.profile,
    companyId: user.companyId,
    company,
    queues: user.queues
  };

  return serializedUser;
};

export default UpdateUserService;
