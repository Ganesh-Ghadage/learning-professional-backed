import { createLogger, format, transports } from "winston";
const { combine, timestamp, json, colorize } = format;


// Create a Winston logger
const logger = createLogger({
  level: "info",
  format: combine(colorize(), timestamp(), json()),
  transports: [
    new transports.File({ filename: "logs/info.log" }),
  ]}
);



export default logger;