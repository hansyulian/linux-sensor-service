
import { sensors } from "~/modules/sensors";

import express, { Express, Request, Response } from "express";
import { appConfig } from "~/config/appConfig";

const app: Express = express();
app.use(express.json());
const port = appConfig.port;

app.get("/", async (req: Request, res: Response) => {
  try {
    const [temperature, hdd,zpool] = await Promise.all([sensors.readCpuTemperature(),
      sensors.readHddStates(appConfig.hddNames),
      sensors.readZpoolStatus(),
    ]);
    res.json({
      temperature,
      hdd,
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
