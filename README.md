# Zebra Browser Print Wrapper

A lightweight wrapper around [Zebra Browser Print](https://www.zebra.com/gb/en/support-downloads/software/printer-software/browser-print.html) to simplify integration of Zebra printers into web applications. Here is the documentation for erros [Documentation](https://www.zebra.com/content/dam/support-dam/en/documentation/unrestricted/guide/software/zpl-zbi2-pg-en.pdf)

This package helps you:

- detect available Zebra printers
- retrieve the default printer
- select a printer
- check printer status
- send raw text or **ZPL** commands for printing

It can be used in frontend applications such as:

- React
- Angular
- Vue
- or any JavaScript / TypeScript application running on a client machine with Zebra Browser Print installed

---

## Features

- Simple API
- Works with Zebra Browser Print local service
- Printer discovery
- Default printer selection
- Printer status checking
- Raw text / ZPL printing
- JavaScript and TypeScript friendly
---

## Prerequisites
Before using this package, make sure that:

Zebra Browser Print is installed on the client machine
Zebra Browser Print is running
Your Zebra printer is connected and recognized by the operating system
Browser Print is able to detect the printer


This package relies on the local Zebra Browser Print service.If Browser Print is not installed or not running, printer discovery and printing will fail.

---
## Compatibility
This wrapper is designed to work with:

Zebra printers supported by Zebra Browser Print
Web applications running in a browser environment
JavaScript / TypeScript projects
---

## Install

Install the module in your project 
Via YARN

```bash
yarn add @hacksis/zebra-browser-print-wrapper
```

Or NPM

```bash
npm i @hacksis/zebra-browser-print-wrapper
```
---

## Available Methods

### **getAvailablePrinters()**

Returns the list of printers currently available through Zebra Browser Print.

##### **Returns** :
```js
Promise<Device[]>
```
### **getDefaultPrinter()**

Returns the default printer.
##### **Returns** :
```js
Promise<Device>
```

### **setPrinter()**

Sets the current printer to use for future actions.
##### **Parameters** :
```js
printer: Device
```
##### **Returns** :
```js
Promise<void>
```

### **getPrinter()**

Returns the currently selected printer.
##### **Returns** :
```js
Device
```

### **checkPrinterStatus()**

Checks the current printer status.
Returns an object describing whether the printer is ready to print and, if not, which errors were detected.

**Returned object:**

```js
Promise<{
  isReadyToPrint: boolean;
  errors: string[];
}>
```

**Possible errors:**

- Paper out
- Ribbon Out
- Media Door Open
- Cutter Fault
- Printhead Overheating
- Motor Overheating
- Printhead Fault
- Incorrect Printhead
- Printer Paused
- Unknown Error

### **print(str)**

Sends raw data to the currently selected printer.
You can use this method with:

- plain text
- printer raw commands
- [ZPL language](https://www.zebra.com/content/dam/zebra/manuals/printers/common/programming/zpl-zbi2-pm-en.pdf "ZPL language")

##### **Parameters** :
```js
data: string
```
##### **Returns** :
```js
Promise<void>
```

## Example

### Basic example

```js
const ZebraBrowserPrintWrapper = require('@hacksis/zebra-browser-print-wrapper');

const printBarcode = async (serial) => {
  try {
    const browserPrint = new ZebraBrowserPrintWrapper();

    const defaultPrinter = await browserPrint.getDefaultPrinter();
    browserPrint.setPrinter(defaultPrinter);

    const printerStatus = await browserPrint.checkPrinterStatus();

    if (printerStatus.isReadyToPrint) {
      const zpl = `^XA
^BY2,2,100
^FO20,20^BCN,100,Y,N,N
^FD${serial}^FS
^XZ`;

      await browserPrint.print(zpl);
      console.log('Print sent successfully.');
    } else {
      console.error('Printer is not ready:', printerStatus.errors);
    }
  } catch (error) {
    console.error('Printing failed:', error);
  }
};

printBarcode('0123456789');
```

### Typescript example

```js
import ZebraBrowserPrintWrapper from '@hacksis/zebra-browser-print-wrapper';

async function printLabel(serial: string): Promise<void> {
  try {
    const browserPrint = new ZebraBrowserPrintWrapper();

    const defaultPrinter = await browserPrint.getDefaultPrinter();
    browserPrint.setPrinter(defaultPrinter);

    const status = await browserPrint.checkPrinterStatus();

    if (!status.isReadyToPrint) {
      console.error('Printer is not ready:', status.errors);
      return;
    }

    const zpl = `^XA
^FO50,50^A0N,30,30^FDSerial: ${serial}^FS
^XZ`;

    await browserPrint.print(zpl);
    console.log('Label printed successfully.');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}
```
---
## Recommended Workflow
A typical print flow looks like this:

1.  Create a wrapper instance
2. Get the default printer or available printers
3. Set the printer
4. Check printer status
5. Send text or ZPL to print

---

## Troubleshooting
### No printers found
Make sure:

- Zebra Browser Print is installed
- Zebra Browser Print is running
- the printer is connected
- the printer is visible in the operating system

### Print request succeeds but nothing is printed
Check that:

- the selected printer is the correct one
- the printer is ready
- the data sent is valid for the printer
- your ZPL is correctly formatted

Try with a very simple ZPL:
```
^XA
^FO50,50^A0N,30,30^FDTEST^FS
^XZ
```

### Printer status returns errors
The printer may not be ready because of a physical issue such as:

- no paper
- open media door
- paused printer
- overheating
- printhead issue

Resolve the hardware issue and try again.

### Browser Print communication issues
If requests fail unexpectedly:

- restart Zebra Browser Print
- nplug / reconnect the printer
- verify that the local Browser Print service is accessible
- retry printer discovery

---
## Notes

- This package does not communicate directly with the printer by itself.
- It relies on Zebra Browser Print as an intermediary local service.
- The package is intended for environments where local printing through Zebra Browser Print is allowed.

---
## Best Practices

- Always set a printer before calling print()
- Prefer checking printer status before printing
- Validate your ZPL when testing new labels
- Handle errors gracefully in the UI if used in a frontend application