import { sensors } from "~/modules/sensors";
import { execPromise } from "~/utils/execPromise";

jest.mock('~/utils/execPromise');

describe('sensors', () => {
  const mockExecPromise = (execPromise as jest.MockedFunction<typeof execPromise>) = jest.fn();

  describe('readCpuTemperature',()=>{
    it('should return the temperature when execPromise output contains Package id 0', async () => {
      
    mockExecPromise.mockResolvedValueOnce(`nvme-pci-0a00
  Adapter: PCI adapter
  Composite:    +43.9°C  (low  =  -0.1°C, high = +71.8°C)
                        (crit = +89.8°C)

  coretemp-isa-0000
  Adapter: ISA adapter
  Package id 0:  +52.0°C  (high = +90.0°C, crit = +100.0°C)
  Core 0:        +47.0°C  (high = +90.0°C, crit = +100.0°C)
  Core 1:        +47.0°C  (high = +90.0°C, crit = +100.0°C)
  Core 2:        +47.0°C  (high = +90.0°C, crit = +100.0°C)
  Core 3:        +47.0°C  (high = +90.0°C, crit = +100.0°C)
  Core 4:        +48.0°C  (high = +90.0°C, crit = +100.0°C)
  Core 5:        +48.0°C  (high = +90.0°C, crit = +100.0°C)
  Core 6:        +48.0°C  (high = +90.0°C, crit = +100.0°C)
  Core 8:        +46.0°C  (high = +90.0°C, crit = +100.0°C)
  Core 9:        +48.0°C  (high = +90.0°C, crit = +100.0°C)
  Core 10:       +47.0°C  (high = +90.0°C, crit = +100.0°C)
  Core 11:       +47.0°C  (high = +90.0°C, crit = +100.0°C)
  Core 12:       +46.0°C  (high = +90.0°C, crit = +100.0°C)
  Core 13:       +46.0°C  (high = +90.0°C, crit = +100.0°C)
  Core 14:       +47.0°C  (high = +90.0°C, crit = +100.0°C)
      `);

      const temperature = await sensors.readCpuTemperature();
      
      
      expect(temperature).toBe('52.0');
    });

    it('should return undefined if Package id 0 is not found', async () => {
      
      mockExecPromise.mockResolvedValueOnce(`
        nvme-pci-0a00
        Adapter: PCI adapter
        Composite:    +43.9°C  (low  =  -0.1°C, high = +71.8°C)
      `);

      const temperature = await sensors.readCpuTemperature();
      
      
      expect(temperature).toBeUndefined();
    });

    it('should return undefined if execPromise returns an empty string', async () => {
      
      mockExecPromise.mockResolvedValueOnce('');

      const temperature = await sensors.readCpuTemperature();

      
      expect(temperature).toBeUndefined();
    });
  })

  describe('readHddState', () => {
    it('should return the status when hdparm output contains drive state', async () => {
      const hddName = '/dev/sdb';
      const mockOutput = 'ready, drive state is: active';
      
      // Mock the execPromise to simulate successful output
      mockExecPromise.mockResolvedValue(mockOutput);

      const result = await sensors.readHddState(hddName);

      expect(result).toEqual({
        name: hddName,
        status: 'active' // expected status extracted from the output
      });
    });

    it('should return undefined status when hdparm output does not contain drive state', async () => {
      const hddName = '/dev/sdb';
      const mockOutput = 'not ready';
      
      // Mock the execPromise to simulate output without drive state
      mockExecPromise.mockResolvedValue(mockOutput);

      const result = await sensors.readHddState(hddName);

      expect(result).toEqual({
        name: hddName,
        status: undefined // expected status to be undefined
      });
    });

    it('should handle errors thrown by execPromise', async () => {
      const hddName = '/dev/sdb';
      const mockError = new Error("Command failed");
      
      // Mock the execPromise to throw an error
      mockExecPromise.mockRejectedValueOnce(mockError);
      const result = await sensors.readHddState(hddName);

      expect(result).toEqual({
        name: hddName,
        status: 'error',
        error: 'Command failed',
      });
    });
  });

  describe('readHddStates', () => {
    it('should return an array of HDD states', async () => {
      const hddNames = ['/dev/sdb', '/dev/sdc'];
      const mockOutputs = [
        'ready, drive state is: active', // output for /dev/sdb
        'ready, drive state is: standby', // output for /dev/sdc
      ];
      
      // Mock the execPromise to simulate output for each HDD
      mockExecPromise
        .mockResolvedValueOnce(mockOutputs[0]) // for first HDD
        .mockResolvedValueOnce(mockOutputs[1]); // for second HDD

      const results = await sensors.readHddStates(hddNames);

      expect(results).toEqual([
        { name: hddNames[0], status: 'active' },
        { name: hddNames[1], status: 'standby' }
      ]);
    });

    it('should return an array with undefined statuses if hdparm output does not contain drive state', async () => {
      const hddNames = ['/dev/sdb', '/dev/sdc'];
      const mockOutputs = [
        'not ready', // output for /dev/sdb
        'not ready', // output for /dev/sdc
      ];
      
      // Mock the execPromise to simulate output without drive state for both HDDs
      mockExecPromise
        .mockResolvedValueOnce(mockOutputs[0]) // for first HDD
        .mockResolvedValueOnce(mockOutputs[1]); // for second HDD

      const results = await sensors.readHddStates(hddNames);

      expect(results).toEqual([
        { name: hddNames[0], status: undefined },
        { name: hddNames[1], status: undefined }
      ]);
    });

    it('should handle errors thrown by execPromise and return undefined for that HDD', async () => {
      const hddNames = ['/dev/sdb', '/dev/sdc'];
      const mockError = new Error("Command failed");
      
      // Mock the execPromise to throw an error for the first HDD
      mockExecPromise
        .mockRejectedValueOnce(mockError) // for first HDD
        .mockResolvedValueOnce('ready, drive state is: standby'); // for second HDD

      const results = await sensors.readHddStates(hddNames);

      expect(results).toEqual([
        { name: hddNames[0], status: 'error', error: 'Command failed' }, // Expect undefined due to the error
        { name: hddNames[1], status: 'standby' }
      ]);
    });
  });
});
