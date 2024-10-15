
import { sensors } from "~/modules/sensors";

import express, { Express, Request, Response } from "express";
import { appConfig } from "~/config/appConfig";
import { CachedTimeout } from "~/modules/CachedTimeout";

const app: Express = express();
app.use(express.json());
const port = appConfig.port;

const cpuCachedTimeout = new CachedTimeout(sensors.readCpuTemperature);
const hddCachedTimeout = new CachedTimeout(()=>sensors.readHddStates(appConfig.hddNames));
const zpoolCachedTimeout = new CachedTimeout(sensors.readZpoolStatus);
const pingTimeout = new CachedTimeout(()=>sensors.pings(appConfig.pingTargets));

app.get("/", async (req: Request, res: Response) => {
  try {
    const [temperature, hdds,zpool,pings] = await Promise.all([
      cpuCachedTimeout.retrieve(),
      hddCachedTimeout.retrieve(),
      zpoolCachedTimeout.retrieve(),
      pingTimeout.retrieve(),
    ]);
    res.json({
      temperature,
      hdds,
      pings,
      zpool,
    });
  } catch (err: any) {
    res.status(500);
    res.json({
      message: err.message,
      stack: err.stack.split("\n"),
    });
  }
});

app.listen(port, () => {
  console.log('appConfig: ',appConfig);
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
