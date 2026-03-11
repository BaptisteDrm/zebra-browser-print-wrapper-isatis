export interface Device {
  name: string;
  deviceType: string;
  connection: string;
  uid: string;
  provider: string;
  manufacturer: string;
  version: number;
}

export type PrinterStatus = {
  isReadyToPrint: boolean;
  errors: string[];
  raw: {
    isError: string;
    nibble1: string;
    nibble2: string;
    nibble4: string;
    nibble5: string;
    result: string;
  };
};
