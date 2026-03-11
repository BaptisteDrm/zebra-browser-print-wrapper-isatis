import { API_URL, STATUS_INDEX } from './constants.js';
import { Device, PrinterStatus } from './types.js';

class ZebraBrowserPrintWrapper {
  device: Device = {} as Device;

  getAvailablePrinters = async (): Promise<Device[]> => {
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
      },
    };

    const endpoint = API_URL + 'available';

    try {
      const res = await this.fetchWithTimeout(endpoint, config);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} on ${endpoint}`);
      }

      const data = await res.json();

      if (data && Array.isArray(data.printer)) {
        return data.printer;
      }

      return [];
    } catch (error) {
      throw new Error(String(error));
    }
  };

  getDefaultPrinter = async (): Promise<Device> => {
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
      },
    };

    const endpoint = API_URL + 'default';

    try {
      const res = await this.fetchWithTimeout(endpoint, config);

      if (!res.ok) {
        throw new Error(`Printer API request failed: ${res.status} ${res.statusText}`);
      }

      const data = await res.text();

      if (data && typeof data !== 'object' && data.split('\n\t').length === 7) {
        const deviceRaw = data.split('\n\t');

        const name = this.cleanUpString(deviceRaw[1]);
        const deviceType = this.cleanUpString(deviceRaw[2]);
        const connection = this.cleanUpString(deviceRaw[3]);
        const uid = this.cleanUpString(deviceRaw[4]);
        const provider = this.cleanUpString(deviceRaw[5]);
        const manufacturer = this.cleanUpString(deviceRaw[6]);

        return {
          connection,
          deviceType,
          manufacturer,
          name,
          provider,
          uid,
          version: 0,
        };
      }

      throw new Error("There's no default printer");
    } catch (error) {
      throw new Error(String(error));
    }
  };

  setPrinter = (device: Device): void => {
    this.device = device;
  };

  getPrinter = (): Device => {
    return this.device;
  };

  cleanUpString = (str: string): string => {
    const index = str.indexOf(':');

    if (index === -1) {
      return str.trim();
    }

    return str.substring(index + 1).trim();
  };

  checkPrinterStatus = async (): Promise<PrinterStatus> => {
    await this.write('~HQES');
    const result = await this.read();

    if (!result || result.length < 89) {
      throw new Error(`Invalid printer status response: ${JSON.stringify(result)}`);
    }

    const errors: string[] = [];

    const isError = result.charAt(STATUS_INDEX.isError);
    const nibble1Char = result.charAt(STATUS_INDEX.nibble1); // media
    const nibble2Char = result.charAt(STATUS_INDEX.nibble2); // head
    const nibble4Char = result.charAt(STATUS_INDEX.nibble4); // black mark / retract / calibrate
    const nibble5Char = result.charAt(STATUS_INDEX.nibble5); // pause / paper path / presenter / feed

    const nibble1 = parseInt(nibble1Char, 16);
    const nibble2 = parseInt(nibble2Char, 16);
    const nibble4 = parseInt(nibble4Char, 16);
    const nibble5 = parseInt(nibble5Char, 16);

    if (Number.isNaN(nibble1) || Number.isNaN(nibble2) || Number.isNaN(nibble4) || Number.isNaN(nibble5)) {
      throw new Error(
        `Invalid hex status nibbles: nibble1=${nibble1Char}, nibble2=${nibble2Char}, nibble4=${nibble4Char}, nibble5=${nibble5Char}`,
      );
    }

    // Nibble 1
    if (nibble1 & 0x1) errors.push('Media Out');
    if (nibble1 & 0x2) errors.push('Ribbon Out');
    if (nibble1 & 0x4) errors.push('Head Open');
    if (nibble1 & 0x8) errors.push('Cutter Fault');

    // Nibble 2
    if (nibble2 & 0x1) errors.push('Printhead Over Temperature');
    if (nibble2 & 0x2) errors.push('Motor Over Temperature');
    if (nibble2 & 0x4) errors.push('Bad Printhead Element');
    if (nibble2 & 0x8) errors.push('Printhead Detection Error');

    // Nibble 4
    // According to Zebra status table, nibble4 value 0x5 represents a dedicated
    // "Retract Function timed out" status and should not be expanded as 0x1 + 0x4.
    if ((nibble4 & 0x5) === 0x5) {
      errors.push('Retract Function timed out');
    } else {
      if (nibble4 & 0x1) errors.push('Paused');
      if (nibble4 & 0x4) errors.push('Black Mark Calibrate Error');
    }
    if (nibble4 & 0x8) errors.push('Black Mark not Found');

    // Nibble 5
    if (nibble5 & 0x1) errors.push('Paper Jam during Retract');
    if (nibble5 & 0x2) errors.push('Presenter Not Running');
    if (nibble5 & 0x4) errors.push('Paper Feed Error');
    if (nibble5 & 0x8) errors.push('Clear Paper Path Failed');

    const hasDecodedErrors = errors.length > 0;
    const hasError = isError !== '0' || hasDecodedErrors;

    if (hasError && errors.length === 0) {
      errors.push('Unknown Error');
    }

    return {
      isReadyToPrint: !hasError,
      errors,
      raw: {
        isError,
        nibble1: nibble1Char,
        nibble2: nibble2Char,
        nibble4: nibble4Char,
        nibble5: nibble5Char,
        result,
      },
    };
  };

  write = async (data: string): Promise<void> => {
    try {
      const endpoint = API_URL + 'write';

      if (!this.device || !this.device.uid) {
        throw new Error('No printer selected');
      }

      const myData = {
        device: this.device,
        data,
      };

      const config = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(myData),
      };

      const res = await this.fetchWithTimeout(endpoint, config);

      if (!res.ok) {
        throw new Error(`Write failed: ${res.status} ${res.statusText}`);
      }
    } catch (error) {
      throw new Error(String(error));
    }
  };

  read = async (): Promise<string> => {
    try {
      const endpoint = API_URL + 'read';

      if (!this.device || !this.device.uid) {
        throw new Error('No printer selected');
      }

      const myData = {
        device: this.device,
      };

      const config = {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8',
        },
        body: JSON.stringify(myData),
      };

      const res = await this.fetchWithTimeout(endpoint, config);

      if (!res.ok) {
        throw new Error(`Printer API request failed: ${res.status} ${res.statusText}`);
      }

      return await res.text();
    } catch (error) {
      throw new Error(String(error));
    }
  };

  print = async (text: string): Promise<void> => {
    try {
      await this.write(text);
    } catch (error) {
      throw new Error(String(error));
    }
  };

  private fetchWithTimeout = async (input: RequestInfo, init?: RequestInit, timeoutMs = 30000): Promise<Response> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(input, {
        ...init,
        signal: controller.signal,
      });
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Printer request timeout');
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error(String(error));
    } finally {
      clearTimeout(timeout);
    }
  };
}

export default ZebraBrowserPrintWrapper;
