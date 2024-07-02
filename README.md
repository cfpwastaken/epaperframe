# Immich E-Paper Frame

This repository includes everything needed to build yourself a E-Paper picture frame with an Immich server from a 7-color epaper display.

## What you will need

- An already working Immich Server with photos sorted into albums.
- [A 7-color E-Paper module](https://www.waveshare.com/5.65inch-e-paper-module-f.htm), i used the standalone one, without headers for the microcontroller, so it can fit into better into the frame
- A Raspberry Pi Pico W (the W is important)
- Wires and a Soldering Iron
- A picture frame, needs to be big enough to hold all the electronics
- A lithium-ion battery
- A Battery-Management-System (BMS) like the MHCD42
- A USB-C female connector or other module
- Patience

## Soldering

1. Use small wires and solder them to the holes on the right of the display
   ![image](https://github.com/cfpwastaken/epaperframe/assets/44261356/f64e420e-df4b-4366-a547-746fa27109bf)
   
   If possible, use useful colors:
   - VCC: red
   - GND: black
   - DIN: blue
   - CLK: yellow
   - CS: orange
   - DC: green
   - RST: white
   - BUSY: purple
3. Solder those wires to your pico:
   Pico pinout diagram can be found [here](https://pico.pinout.xyz)
   - VCC: VSYS
   - GND: GND
   - DIN: GP11
   - CLK: GP10
   - CS: GP9
   - DC: GP8
   - RST: GP12
   - BUSY: GP13
   Take your time with the soldering if you are new!
4. Uploading the code
   1. Get the [latest micropython release](https://micropython.org/download/RPI_PICO_W/)
   2. Plug in your pico with a MicroUSB cable to your computer while holding down the BOOTSEL button on it's PCB.
   3. Drag-and-drop the .uf2-file to the drive that shows up
   4. Download and install [Thonny](https://thonny.org)
   5. Copy the contents of this repos picoCode/epd.py file to the pico's file system using thonny.
   6. Do the same with the main.py file
   7. Create a config.py file with these contents:
      ```python
      hostname = "epaperframe"
      ssid = "YOUR_WIFI_NAME"
      password = "YOUR_WIFI_PASSWORD"
      host = "YOUR_EPD_SERVER_HOST/IP"
      port = 6957
      ```
5. Installing the EPD server software using Docker:
   1. On your Immich Server, create a API key for the service in account settings and note down the key.
   2. Clone this repo and build it: `docker build -t epaperframe .`
   3. Deploy this compose file:
   ```yaml
   version: "3.8"
   services:
     epaperframe:
       restart: unless-stopped
       image: epaperframe
       ports:
         - 6957:6957
         - 6958:6958
       environment:
         - IMMICH_KEY=KEY_HERE
         - IMMICH_SERVER=https://immich.my_server.com/api/
         - IMMICH_ALBUMS=comma,seperated list,of albums
         - WORK_TIMES=always
         - DELAY=3600000 # 60*60*1000, 1h
   networks: {}
   ```
   Port 6957 will expose the TCP EPD server for communication with the pico.
   Port 6958 will expose a web interface showing the current image, its album and a countdown to the next image.
> [!WARNING]
> Do not set the delay higher than a few hours as that will cause the pico to sleep forever! 
> Setting the work times to anything but always is also not supported yet as the pico will again sleep forever!

6. Testing
   
   Run the main.py file in Thonny, while watching for possible errors in Thonny and Docker, look at the display and Pico LED for activity. After blinking for a few moments it should have connected to your WiFi and it should start clearing the E-Paper display by flashing it a few times.
   After that, the LED should start rapidly blinking after a few moments and the E-Paper display should then start showing the new image.

8. Adding a battery
   
   Fit your lithium ion (preferable not a 18650) battery on your E-Paper module and possibly glue it on.
   
   Solder the 2 wires coming from your battery to the BMS:
   - BAT: Red Wire (+)
   - GND below that: Black Wire (-)
   
   Then, use 2 wires to solder from the BMS to the Pico:
   - OUT: VBUS
   - GND below that: GND
   
   Refer to the Pinout Diagram for this again.
   Add the charging port with 2 more wires, if possible twist the wires into pairs:
   - Positive: VIN
   - Negative: GND
   
   Glue the BMS from below to the E-Paper module using double sided tape.
   Double tap the button on the BMS to start it.
> [!CAUTION]
> Lithium Ion batteries can cause a fire if you connect it wrongly or if you accidentally short both terminals!
> Once it works you should have no worries though, as the BMS is there to protect it.

9. Closing it up
   
   Use double sided tape again and put the pico on top of your battery or E-Paper module.
   Put all your electronics inside a picture frame big enough to house everything.
   If needed, use even more tape or hold it all in.
   Put the back on, sliding the charging connector on the corners, strip of a bit of the back if needed.

## Congrats!

You did it!

## Problems?

Open up an issue on GitHub!
