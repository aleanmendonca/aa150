import {Request, Response} from "express";

import DashboardDataService, {
  DashboardData,
  Params
} from "../services/ReportService/DashbardDataService";
import TicketsAttendanceService from "../services/ReportService/TicketsAttendanceService";
import TicketsDayService from "../services/ReportService/TicketsDayService";
import TicketsQueueService from "../services/ReportService/TicketsQueueService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const params: Params = req.query;
  const {companyId} = req.user;
  let daysInterval = 3;

  const dashboardData: DashboardData = await DashboardDataService(
    companyId,
    params
  );
  return res.status(200).json(dashboardData);
};

export const reportsUsers = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const {companyId} = req.user;
  const dateStart = req.query.dateStart as string;
  const dateEnd = req.query.dateEnd as string;


  return res.status(200).json({
      data: await TicketsAttendanceService({
        companyId,
        dateStart,
        dateEnd
      })
    }
  );
};


export const ticketsDay = async (req: Request, res: Response): Promise<Response> => {
  const {companyId} = req.user;

  const dateStart = req.query.initialDate as string;
  const dateEnd = req.query.finalDate as string;

  return res.status(200).json({
    data: await TicketsDayService({
      companyId,
      dateStart,
      dateEnd
    })
  });
}

export const DashTicketsQueues = async (req: Request, res: Response): Promise<Response> => {
  const {companyId} = req.user;
  const dateStart = req.query.dateStart as string;
  const dateEnd = req.query.dateEnd as string;
  const status = req.query.status as string;
  const userId = req.user.id;
  const profile = req.user.profile;

  return res.status(200).json({
    data: await TicketsQueueService({
      companyId,
      dateStart,
      dateEnd,
      status,
      userId,
      profile
    })
  });
}
