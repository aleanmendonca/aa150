import path from "path";
import multer from "multer";
import fs from "fs";
import { isEmpty, isNil } from "lodash";
import Whatsapp from "../models/Whatsapp";

export const publicFolder = path.resolve(__dirname, "..", "..", "public");

export default {
  directory: publicFolder,
  storage: multer.diskStorage({
    destination: async function (req, file, cb) {

      const { typeArch, fileId } = req.body;

      let companyId = req.user?.companyId;
      if (companyId === undefined && isNil(companyId) && isEmpty(companyId)) {
        const authHeader = req.headers.authorization;
        const [, token] = authHeader.split(" ");
        const whatsapp = await Whatsapp.findOne({ where: { token } });
        companyId = whatsapp.companyId;
      }

      let companyPath = `${publicFolder}/company${companyId}/`;
      if (!fs.existsSync(companyPath)) {
        fs.mkdirSync(companyPath);
        fs.chmodSync(companyPath, 0o777);
      }

      let folder = companyPath;


      if (typeArch && typeArch !== "announcements") {
        folder =  path.resolve(companyPath , typeArch, fileId ? fileId : "")
      } else if (typeArch && typeArch === "announcements") {
        folder =  path.resolve(companyPath )
      }


      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder,  { recursive: true })
        fs.chmodSync(folder, 0o777)
      }
      return cb(null, folder);
    },
    filename(req, file, cb) {
      const { typeArch } = req.body;

      const fileName = typeArch && typeArch !== "announcements" ? file.originalname.replace('/','-').replace(/ /g, "_") : new Date().getTime() + '_' + file.originalname.replace('/','-').replace(/ /g, "_");

      return cb(null, fileName);
    }
  })
};
