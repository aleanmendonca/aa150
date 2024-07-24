import AppError from "../../errors/AppError";
import GetSuperSettingService from "../SettingServices/GetSuperSettingService";
import { efiCheckStatus, efiCreateSubscription, efiInitialize, efiWebhook } from "./EfiServices";
import { stripeInitialize, stripeCreateSubscription, stripeCheckStatus, stripeWebhookHandler } from "./StripeServices"; // Import Stripe services
import { Request, Response } from "express";
import Invoices from "../../models/Invoices";
import { getIO } from "../../libs/socket";
import { Op } from "sequelize";
import Company from "../../models/Company";
import FindOpenInvoiceService from "../InvoicesService/FindOpenInvoiceService";

export const payGatewayInitialize = async () => {
  const paymentGateway = await GetSuperSettingService({ key: "_paymentGateway" });

  switch (paymentGateway) {
    case "efi":
      return efiInitialize();
    case "stripe":
      return stripeInitialize(); // Initialize Stripe
    default:
      throw new AppError("Unsupported payment gateway", 400);
  }
}

export const payGatewayCreateSubscription = async (req: Request, res: Response): Promise<Response> => {
  const paymentGateway = await GetSuperSettingService({ key: "_paymentGateway" });

  switch (paymentGateway) {
    case "efi":
      return efiCreateSubscription(req, res);
    case "stripe":
      return stripeCreateSubscription(req, res); // Create Stripe subscription
    default:
      throw new AppError("Unsupported payment gateway", 400);
  }
}

export const payGatewayReceiveWebhook = async (req: Request, res: Response): Promise<Response> => {
  const paymentGateway = await GetSuperSettingService({ key: "_paymentGateway" });

  switch (paymentGateway) {
    case "efi":
      return efiWebhook(req, res);
    case "stripe":
      return stripeWebhookHandler(req, res); // Handle Stripe webhook
    default:
      throw new AppError("Unsupported payment gateway", 400);
  }
}

export const processInvoicePaid = async (invoice: Invoices) => {
  const company = invoice.company || await Company.findByPk(invoice.companyId);

  if (company) {
    const expiresAt = new Date(company.dueDate);
    expiresAt.setDate(expiresAt.getDate() + 30);

    await company.update({
      dueDate: expiresAt
    });
    await invoice.update({
      status: "paid"
    });
    await company.reload();
    const io = getIO();

    io.to(`company-${invoice.companyId}-mainchannel`)
      .to("super")
      .emit(`company-${invoice.companyId}-payment`, {
      action: "CONCLUIDA",
      company,
      invoiceId: invoice.id,
    });
  }
}

export const processInvoiceExpired = async (invoice: Invoices) => {
  const io = getIO();

  await invoice.update({
    txId: null,
    payGw: null,
    payGwData: null,
  });

  await invoice.reload();

  io.to(`company-${invoice.companyId}-mainchannel`)
    .to("super")
    .emit(`company-${invoice.companyId}-payment`, {
    action: "EXPIRADA",
    company: invoice.company || await Invoices.findByPk(invoice.companyId) ,
    invoiceId: invoice.id,
  });
}

export const checkInvoicePayment = async (invoice: Invoices) => {
  if (invoice.payGw === "efi") {
    efiCheckStatus(invoice);
  }
  else if (invoice.payGw === "stripe") {
    stripeCheckStatus(invoice.id);
  }
}

export const checkOpenInvoices = async (companyId) => {
  const invoices = await FindOpenInvoiceService(companyId);
  invoices.forEach( (invoice) => {
    checkInvoicePayment(invoice);
  });
}
