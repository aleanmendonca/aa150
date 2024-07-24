import express from "express";
import isAuth from "../middleware/isAuth";
import { mediaUpload } from "../services/WhatsappService/UploadMediaAttachment";

import * as WhatsAppController from "../controllers/WhatsAppController";
import multer from "multer";
import uploadConfig from "../config/upload";
const upload = multer(uploadConfig);

const whatsappRoutes = express.Router();

whatsappRoutes.get("/whatsapp/", isAuth, WhatsAppController.index);

whatsappRoutes.post("/whatsapp/", isAuth, WhatsAppController.store);

whatsappRoutes.get("/whatsapp/:whatsappId", isAuth, WhatsAppController.show);

whatsappRoutes.put("/whatsapp/:whatsappId", isAuth, WhatsAppController.update);

whatsappRoutes.post("/closedimported/:whatsappId", isAuth, WhatsAppController.closedTickets);

whatsappRoutes.delete(
  "/whatsapp/:whatsappId",
  isAuth,
  WhatsAppController.remove
);

//whatsappRoutes.get("/whatsapp/all", isAuth, WhatsAppController.getAllConnections);

//whatsappRoutes.post('/closedimported/:whatsappId', isAuth, WhatsAppController.closedTickets)

whatsappRoutes.post("/whatsapp-restart/", isAuth, WhatsAppController.restart);

whatsappRoutes.post(
  "/whatsapp/:whatsappId/media-upload",
  isAuth,
  upload.array("file"),
  mediaUpload
);
export default whatsappRoutes;
