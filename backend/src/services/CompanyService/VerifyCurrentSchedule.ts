import { QueryTypes } from "sequelize";
import sequelize from "../../database";
import Company from "../../models/Company";
import moment from "moment";

type Result = {
  id: number;
  currentSchedule: [];
  startTime: string;
  currentWeekday: string;
  endTime: string;
  inActivity: boolean;
};

const VerifyCurrentSchedule = async (id: string | number): Promise<Result> => {
  const currentWeekday = new Date().toLocaleDateString('en-US', { weekday: 'long' }).trim().toLowerCase();

  const company = await Company.findOne({
    where: { id },
    attributes: ['id', 'schedules'],
    raw: true
  });

  if (!company) {
    throw new Error('Company not found');
  }

  const currentSchedule = company.schedules.find(schedule  =>
    schedule.weekdayEn.trim().toLowerCase() === currentWeekday
  );


  if (!currentSchedule || !currentSchedule.startTime || !currentSchedule.endTime) {
    return;
  }

  const now = moment();
  const startTime = moment(currentSchedule.startTime, 'hh:mm');
  const endTime = moment(currentSchedule.endTime, 'hh:mm');

  let inActivity = startTime.isBefore(now) && now.isBefore(endTime);


  if (inActivity && currentSchedule.startLunchTime && currentSchedule.endLunchTime) {
    const startLunchTime = moment(currentSchedule.startLunchTime, 'hh:mm');
    const endLunchTime = moment(currentSchedule.endLunchTime, 'hh:mm');

    inActivity = !(startLunchTime.isBefore(now) && now.isBefore(endLunchTime));
  }

  const result: Result = {
    id: company.id,
    currentWeekday,
    currentSchedule,
    startTime: currentSchedule.startTime,
    endTime: currentSchedule.endTime,
    inActivity
  };

  return result;
};

export default VerifyCurrentSchedule;
