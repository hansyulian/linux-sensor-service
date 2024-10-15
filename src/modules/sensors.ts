import { execPromise } from "~/utils/execPromise";

export const sensors = {
  readCpuTemperature,
  readHddStates,
  readHddState,
  readZpoolStatus,
  pings,
  ping,
};

async function readCpuTemperature() {
  try {
    const result = await execPromise('sensors');
    const match = result.match(/Package id 0:\s*\+([0-9.]+)°C/);
    if (!match){
      return undefined;
    }
    const temperature = match[1];
    return temperature;
  } catch (err){
    return undefined;
  }
}

async function readHddStates(hddNames: string[]){
  const result = await Promise.all(hddNames.map(hddName => readHddState(hddName)));
  return result;
}

async function readHddState(hddName: string){
  try {
    const result = await execPromise('sudo hdparm -C',hddName);
    const match = result.match(/drive state is:\s*([a-z]+)/);
    const status = !match ? undefined: match[1];
    return {
      name: hddName,
      status
    }
  } catch (err:any){
    return {
      name: hddName,
      status: 'error',
      error: err.message
    }
  }
}

export type ZpoolElementStatus = {
  name: string; 
  read: string; 
  write: string; 
  checksum: string; 
  state: string; 
}
export type ZpoolResult = {
  drives: ZpoolElementStatus[];
} & ZpoolElementStatus 

async function readZpoolStatus():Promise<ZpoolResult>{
  try {
    const readResult = await execPromise('zpool status');
    const lines = readResult.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const result:ZpoolResult = {
      checksum: '',
      name: '',
      read: '',
      state: 'UNKNOWN',
      write: '',
      drives: [],
    }

    let isConfigSection = false;
    let isAfterSection = false;

    for (const line of lines) {
        // Check for the pool name and its state
        if (line.startsWith('pool:')) {
            result.name = line.split(':')[1].trim();
        }
        if (line.startsWith('state:')) {
            result.state = line.split(':')[1].trim();
        }

        // Check for the config section
        if (line === 'config:') {
            isConfigSection = true;
            continue; // Skip the 'config:' line
        }

        // Parse the drives information
        if (isConfigSection && line.startsWith('raidz1')) {
            // We will skip this line as it will not be parsed directly
            isAfterSection = true;
            continue; 
        }

        // Check for the drive state and details
        const driveMatch = line.match(/^(\S+)\s+(\S+)\s+(\d+)\s+(\d+)\s+(\d+)$/);
        if (driveMatch) {
          const [_, driveName, driveState, read, write, checksum] = driveMatch;
            if (isAfterSection){
              result.drives.push({
                  name: driveName,
                  state: driveState.toUpperCase(),
                  read: read,
                  write: write,
                  checksum: checksum,
              });
          } else{
            result.name = driveName;
            result.write = write;
            result.checksum = checksum;
            result.read = read;
            result.state = driveState;
          }
        }
    }

    // Parse the overall statistics for the pool (read, write, checksum)
    const overallMatch = result.drives.length ? result.drives[0] : null;
    if (overallMatch) {
        result.read = overallMatch.read;
        result.write = overallMatch.write;
        result.checksum = overallMatch.checksum;
    }

    return result;
  } catch (err:any){
    return {
      checksum: '',
      drives: [],
      name: '',
      read: '',
      write: '',
      state: 'ERROR',

    }
  }
}

async function pings(targets:string[]){
  const result = await Promise.all(targets.map(target => ping(target)));
  return result;
}

async function ping(target: string){
  try {
    const stringResult = await execPromise('ping -c 1',target);
    const match = stringResult.match(/time=([0-9]+(\.[0-9]+)?)/);
    const result = !match ? undefined : match[1];
    return {
      target,
      result,
    }
  } catch (err:any){
    return {
      target,
      error: err.message,
    }
  }
}