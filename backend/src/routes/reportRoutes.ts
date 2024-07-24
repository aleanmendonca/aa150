import express, {Router} from "express";
import isAuth from "../middleware/isAuth";
import isSuper from "../middleware/isSuper";
import ReportController from "../controllers/ReportController";

const reportRoutes = Router();

reportRoutes.post('/report/tickets', isAuth, ReportController.tickets);



export default reportRoutes;
