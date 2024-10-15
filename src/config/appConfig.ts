import dotenv from "dotenv";
dotenv.config();
const pe = process.env;

export const appConfig = {
  port : parseInt(pe.PORT || '23629'),
  hddNames: pe.HDD_NAMES?.split(',') || [],
}