import Mustache from "mustache";
import Contact from "../models/Contact";
import Ticket from "../models/Ticket";

function makeid(length) {
  var result = "";
  var characters = "0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export const msgsd = (): string => {
  let ms = "";
  const hh = new Date().getHours();
  if (hh >= 6) {
    ms = "Bom Dia";
  }
  if (hh > 11) {
    ms = "Boa tarde";
  }
  if (hh > 17) {
    ms = "Boa Noite";
  }
  if (hh > 23 || hh < 6) {
    ms = "Bom Dia";
  }
  return ms;
};

export const control = (): string => {
  const Hr = new Date();
  const dd: string = ("0" + Hr.getDate()).slice(-2);
  const mm: string = ("0" + (Hr.getMonth() + 1)).slice(-2);
  const yyyy: string = Hr.getFullYear().toString();
  const minute: string = Hr.getMinutes().toString();
  const second: string = Hr.getSeconds().toString();
  const millisecond: string = Hr.getMilliseconds().toString();
  const ctrl = yyyy + mm + makeid(8) + dd + minute + second + millisecond;
  return ctrl;
};

export const date = (): string => {
  const Hr = new Date();
  const dd: string = ("0" + Hr.getDate()).slice(-2);
  const mm: string = ("0" + (Hr.getMonth() + 1)).slice(-2);
  const yy: string = Hr.getFullYear().toString();
  const dates = dd + "-" + mm + "-" + yy;
  return dates;
};

export const hour = (): string => {
  const Hr = new Date();
  const hh: number = Hr.getHours();
  const min: string = ("0" + Hr.getMinutes()).slice(-2);
  const ss: string = ("0" + Hr.getSeconds()).slice(-2);
  const hours = hh + ":" + min + ":" + ss;
  return hours;
};

export const firstName = (entity?: Ticket | Contact): string => {
  if (entity instanceof Ticket && entity.contact.name) {
    const nameArr = entity.contact.name.split(" ");
    return nameArr[0];
  } else if (entity instanceof Contact && entity.name) {
    const nameArr = entity.name.split(" ");
    return nameArr[0];
  }
  return "";
};

export const greeting = (): string => {
  const greetings = ["Boa madrugada", "Bom dia", "Boa tarde", "Boa noite"];
  const h = new Date().getHours();
  // eslint-disable-next-line no-bitwise
  return greetings[(h / 6) >> 0];
};

export default (body: string, entity?: Ticket | Contact): string => {

  if (typeof body !== 'string') {
    console.error('Expected a string for template, received:', typeof body);
    return '';
  }

  const view = {
    firstName: firstName(entity),
    name: entity instanceof Ticket ? entity.contact.name : (entity instanceof Contact ? entity.name : ""),
    ticket_id: entity instanceof Ticket ? entity.id : "",
    gretting: greeting(),
    ms: msgsd(),
    hour: hour(),
    date: date(),
    queue: entity instanceof Ticket ? (entity.queueId === undefined || entity.queueId === null ? "" : entity.queue.name) : "",
    connection: entity instanceof Ticket ? entity.whatsapp?.name : "",
    data_hora: [date(), hour()].join(" às "),
    protocol: [control(), entity instanceof Ticket ? entity.id.toString() : ""].join(""),
    user: entity instanceof Ticket ? (entity.userId === undefined || entity.userId === null ? "" : entity.user.name) : "",
    name_company: entity instanceof Ticket ? entity.company?.name : "",
  };

  return Mustache.render(body, view);
};
