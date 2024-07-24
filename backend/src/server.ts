import gracefulShutdown from "http-graceful-shutdown";
import app from "./app";
import {initIO} from "./libs/socket";
import {logger} from "./utils/logger";
import {StartAllWhatsAppsSessions} from "./services/WbotServices/StartAllWhatsAppsSessions";
import Company from "./models/Company";
import {startQueueProcess} from "./queues";
import {checkOpenInvoices, payGatewayInitialize} from "./services/PaymentGatewayServices/PaymentGatewayServices";
import {redis} from "./helpers/useRedisAuthState";

const server = app.listen(process.env.PORT, async () => {

  if (process.env.FLUSH_REDIS_ON_START == 'true')
    await redis.flushdb();

  const companies = await Company.findAll({
    where: {status: true}
  });


  const allPromises: Promise<unknown>[] = [];
  companies.map(async c => {
    const promise = StartAllWhatsAppsSessions(c.id);
    allPromises.push(promise);
  });

  Promise.all(allPromises).then(async () => {
    await startQueueProcess();
  });
  logger.info(`Server started on port: ${process.env.PORT}`);

  payGatewayInitialize().catch(
    (e) => {
      logger.error(`Error initializing payment gateway: ${e.message}`);
    }
  );

  companies.map(async c => {
    const promise = checkOpenInvoices(c.id);
    allPromises.push(promise);
  });
});

process.on("uncaughtException", err => {
  console.error(`${new Date().toUTCString()} uncaughtException:`, err.message);
  console.error(err.stack);

});

process.on("unhandledRejection", (reason, p) => {
  console.error(
    `${new Date().toUTCString()} unhandledRejection:`,
    reason,
    p
  );

});


initIO(server);
gracefulShutdown(server);
