import { Request, Response } from "express";
import { ImportXLSContactsService } from "../services/ContactServices/ImportXLSContactsService";

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const file = req.file as Express.Multer.File; // Access the file using Express.Multer.File type

  await ImportXLSContactsService(companyId, file); // Pass the file to the ImportXLSContactsService

  return res.status(200).json({ message: "contacts imported" });
};
