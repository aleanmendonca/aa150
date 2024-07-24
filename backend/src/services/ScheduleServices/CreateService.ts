import * as Yup from "yup";

import AppError from "../../errors/AppError";
import Schedule from "../../models/Schedule";
import Contact from "../../models/Contact";

interface Request {
  body: string;
  sendAt: string;
  contactId: number | string;
  companyId: number | string;
  userId?: number | string;
  daysR?: number;
  campId?: number;
  mediaPath?: string;
}

const CreateService = async ({
                               body,
                               sendAt,
                               contactId,
                               companyId,
                               daysR,
                               campId,
                               mediaPath,
                               userId
                             }: Request): Promise<Schedule> => {
  const schema = Yup.object().shape({
    body: Yup.string().required().min(5),
    sendAt: Yup.string().required()
  });

  try {
    await schema.validate({body, sendAt});
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const schedule = await Schedule.create(
    {
      body,
      sendAt,
      contactId,
      companyId,
      userId,
      daysR,
      campId,
      mediaPath,
      status: 'PENDENTE'
    }
  );

  await schedule.reload({
    include: [{model: Contact, as: "contact"}]
  });

  return schedule;
};

export default CreateService;
