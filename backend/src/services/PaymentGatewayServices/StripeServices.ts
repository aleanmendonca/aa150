import { Request, Response } from "express";
import Stripe from "stripe";
import GetSuperSettingService from "../SettingServices/GetSuperSettingService";
import { logger } from "../../utils/logger";
import Invoices from "../../models/Invoices";
import AppError from "../../errors/AppError";
import { processInvoiceExpired, processInvoicePaid } from "./PaymentGatewayServices";

const stripe = new Stripe(process.env.STRIPE_PRIVATE, {
  apiVersion: '2022-11-15',
});

async function createStripeWebhook() {
  try {
    const webhookEndpoint = await stripe.webhookEndpoints.create({
      url: `${process.env.BACKEND_URL}/subscription/aa/webhook`,
      enabled_events: [
        'payment_intent.succeeded',
        'payment_intent.payment_failed'
      ]
    });
    logger.info({ webhookEndpoint }, "Webhook created successfully.");
    return webhookEndpoint;
  } catch (error) {
    logger.error({ error }, "Failed to create webhook.");
    throw new AppError("Failed to create webhook.", 500);
  }
}

export const stripeInitialize = async () => {
  const paymentGateway = await GetSuperSettingService({ key: "_paymentGateway" });

  if (paymentGateway !== "stripe") {
    logger.debug("stripeInitialize: not configured for Stripe.");
    return;
  }

  if (!process.env.BACKEND_URL.startsWith("https://")) {
    logger.debug("stripeInitialize: only SSL webhooks are supported");
    return;
  }

  await createStripeWebhook();
}

export const stripeWebhookHandler = async (req: Request, res: Response): Promise<Response> => {
  const event = req.body;

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        await processInvoicePaid(paymentIntent.metadata.invoiceId);
        break;
      case 'payment_intent.payment_failed':
        const failedIntent = event.data.object;
        logger.info({ failedIntent }, "Payment failed.");
        break;
      default:
        logger.warn({ event }, "Unhandled event type.");
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    logger.error({ error }, "Error handling webhook event.");
    return res.status(400).json({ error: "Webhook handler failed." });
  }
};

export const stripeCreateSubscription = async (req: Request, res: Response): Promise<Response> => {
  const { price, invoiceId } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(price) * 100), // convert price to cents
      currency: 'usd',
      metadata: { invoiceId },
    });

    await Invoices.update({ stripePaymentIntentId: paymentIntent.id }, { where: { id: invoiceId } });

    return res.json({
      clientSecret: paymentIntent.client_secret,
      status: 'success'
    });
  } catch (error) {
    logger.error({ error }, "Failed to create subscription.");
    throw new AppError("Failed to create subscription.", 400);
  }
};

export const stripeCheckStatus = async (invoiceId: number): Promise<boolean> => {
  try {
    const invoice = await Invoices.findByPk(invoiceId);
    if (!invoice || !invoice.stripePaymentIntentId) {
      logger.error("Invoice not found or missing Stripe PaymentIntent ID.");
      return false;
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(invoice.stripePaymentIntentId);
    if (paymentIntent.status === 'succeeded') {
      await processInvoicePaid(invoice);
      return true;
    }

    return false;
  } catch (error) {
    logger.error({ error }, "Failed to check payment status.");
    return false;
  }
};
