import * as Yup from "yup";
import {Request, Response} from "express";

import AppError from "../errors/AppError";
import Company from "../models/Company";
import authConfig from "../config/auth";

import ListCompaniesService from "../services/CompanyService/ListCompaniesService";
import CreateCompanyService from "../services/CompanyService/CreateCompanyService";
import UpdateCompanyService from "../services/CompanyService/UpdateCompanyService";
import ShowCompanyService from "../services/CompanyService/ShowCompanyService";
import UpdateSchedulesService from "../services/CompanyService/UpdateSchedulesService";
import DeleteCompanyService from "../services/CompanyService/DeleteCompanyService";
import FindAllCompaniesService from "../services/CompanyService/FindAllCompaniesService";
import {verify} from "jsonwebtoken";
import User from "../models/User";
import ShowPlanCompanyService from "../services/CompanyService/ShowPlanCompanyService";
import ListCompaniesPlanService from "../services/CompanyService/ListCompaniesPlanService";
import CheckSettings from "../helpers/CheckSettings";
import moment from "moment/moment";
import fs from "fs";
import path from "path";

const publicFolder = path.resolve(__dirname, "..", "..", "public");

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
};

interface TokenPayload {
  id: string;
  username: string;
  profile: string;
  companyId: number;
  iat: number;
  exp: number;
}

type CompanyData = {
  name: string;
  id?: number;
  phone?: string;
  email?: string;
  status?: boolean;
  planId?: number;
  campaignsEnabled?: boolean;
  dueDate?: any;
  recurrence?: string;
};

type SchedulesData = {
  schedules: [];
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const {searchParam, pageNumber} = req.query as IndexQuery;

  const {companies, count, hasMore} = await ListCompaniesService({
    searchParam,
    pageNumber
  });

  return res.json({companies, count, hasMore});
};

export const signup = async (req: Request, res: Response): Promise<Response> => {
  if (await CheckSettings("allowSignup") !== "enabled") {
    return res.status(401).json("🙎🏻‍♂️ Signup disabled");
  }
  return await store(req, res);
}

export const store = async (req: Request, res: Response): Promise<Response> => {
  const newCompany: CompanyData = req.body;

  try {
    // Tente buscar a configuração de duração do período de teste.
    const trialDays = await CheckSettings('trialExpiration');
    const totalDays = parseInt(trialDays, 10);

    if (isNaN(totalDays) || totalDays <= 0) {
      newCompany.dueDate = moment().add(7, 'days').toDate(); // Padrão para 7 dias se não for especificado ou inválido.
    } else {
      newCompany.dueDate = moment().add(totalDays, 'days').toDate();
    }

    const company = await CreateCompanyService(newCompany);
    return res.status(201).json(company);
  } catch (error) {
    return res.status(500).json({ message: 'Error creating company', error });
  }
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const {id} = req.params;

  const requestUser = await User.findByPk(req.user.id);
  if (!requestUser.super && Number.parseInt(id, 10) !== requestUser.companyId) {
    throw new AppError("ERR_FORBIDDEN", 403);
  }

  const company = await ShowCompanyService(id);

  return res.status(200).json(company);
};

export const list = async (req: Request, res: Response): Promise<Response> => {
  const companies: Company[] = await FindAllCompaniesService();

  return res.status(200).json(companies);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const companyData: CompanyData = req.body;

  const schema = Yup.object().shape({
    name: Yup.string()
  });

  try {
    await schema.validate(companyData);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const {id} = req.params;

  const company = await UpdateCompanyService({id, ...companyData});

  return res.status(200).json(company);
};

export const updateSchedules = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const {schedules}: SchedulesData = req.body;
  const {id} = req.params;

  const requestUser = await User.findByPk(req.user.id);
  if (!requestUser.super && Number.parseInt(id, 10) !== requestUser.companyId) {
    throw new AppError("ERR_FORBIDDEN", 403);
  }

  const company = await UpdateSchedulesService({
    id,
    schedules
  });

  return res.status(200).json(company);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const {id} = req.params;

  // remove a pasta da empresa ao excluir a empresa
  if (fs.existsSync(`${publicFolder}/company${id}/`)) {
    const removefolder = await fs.rmdirSync(`${publicFolder}/company${id}/`, {
      recursive: true,
    });
  }
  const company = await DeleteCompanyService(id);

  return res.status(200).json(company);
};

export const listPlan = async (req: Request, res: Response): Promise<Response> => {
  const {id} = req.params;

  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const {id: requestUserId, profile, companyId} = decoded as TokenPayload;
  const requestUser = await User.findByPk(requestUserId);

  if (requestUser.super === true) {
    const company = await ShowPlanCompanyService(id);
    return res.status(200).json(company);
  } else if (companyId.toString() !== id) {
    return res.status(400).json({error: "Você não possui permissão para acessar este recurso!"});
  } else {
    const company = await ShowPlanCompanyService(id);
    return res.status(200).json(company);
  }

};

export const indexPlan = async (req: Request, res: Response): Promise<Response> => {
  const {searchParam, pageNumber} = req.query as IndexQuery;

  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const {id, profile, companyId} = decoded as TokenPayload;
  // const company = await Company.findByPk(companyId);
  const requestUser = await User.findByPk(id);

  if (requestUser.super === true) {
    const companies = await ListCompaniesPlanService();
    return res.json({companies});
  } else {
    return res.status(400).json({error: "Você não possui permissão para acessar este recurso!"});
  }
};
