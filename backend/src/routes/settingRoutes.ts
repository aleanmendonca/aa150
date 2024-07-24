import { Router } from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import isSuper from "../middleware/isSuper";
import envTokenAuth from "../middleware/envTokenAuth";
import * as SettingController from "../controllers/SettingController";
import uploadPublicConfig from "../config/uploadPublic";
import uploadPrivateConfig from "../config/privateFiles";
import isAdmin from "../middleware/isAdmin";

const settingRoutes = Router();

settingRoutes.get("/settings", isAuth, SettingController.index);

settingRoutes.get("/settingsregister", SettingController.getSettingRegister)

settingRoutes.get("/public-settings/:settingKey", SettingController.publicShow);
settingRoutes.get("/public-settings", SettingController.publicIndex);

// change setting key to key in future
settingRoutes.put("/settings/:settingKey", isAuth, isAdmin, SettingController.update);

const uploadPublic = multer(uploadPublicConfig);
const uploadPrivate = multer(uploadPrivateConfig);

settingRoutes.post(
  "/settings/logo",
  isAuth, isSuper,
  uploadPublic.single("file"),
  SettingController.storeLogo
);

settingRoutes.post(
  "/settings/privateFile",
  isAuth, isSuper,
  uploadPrivate.single("file"),
  SettingController.storePrivateFile
)

export default settingRoutes;
