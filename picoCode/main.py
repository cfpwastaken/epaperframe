from machine import UART, Pin
import utime
import network
import socket
import machine
import os
from epd import EPD
import config
from config import host, port

epd = EPD()
epd.fill(0xff)

uart = UART(0, 115200)
os.dupterm(uart, 0)

led = Pin("LED")

for i in range(10):
	led.off()
	utime.sleep(0.1)
	led.on()
	utime.sleep(0.1)

def printerror(msg):
    print(msg)
    epd.epdDisplay(epd.buffer)
    start = 5
    lineskip = 15
    text = msg.split("\n")
    for i, t in enumerate(text):
        epd.text(t, 5, start+(lineskip*i), epd.Black)
    epd.epdDisplay(epd.buffer)
    while True:
        pass

network.country("DE")
network.hostname(config.hostname)
nic = network.WLAN(network.STA_IF)
nic.active(True)
utime.sleep(8) # wait for the networking to come available
nic.connect(config.ssid, config.password)
att = 0
while not nic.isconnected(): 
	if att > 5:
		break
	print("Connecting")
	led.on()
	utime.sleep(0.5)
	led.off()
	utime.sleep(0.5)
	s = nic.status()
	if s == network.STAT_CONNECTING or s == network.STAT_GOT_IP:
		pass
	else:
		print("Failed!")
		nic.active(False)
		utime.sleep(3)
		nic.active(True)
		utime.sleep(8)
		nic.connect(config.ssid, config.password)
		att = att + 1
if not nic.isconnected():
	aps = nic.scan()
	apstr = ""
	for ap in aps:
		print(ap)
		apstr = apstr + str(ap[0]) + " S" + str(ap[4]) + " R" + str(ap[3]) + "\n"
	printerror("Netzwerkverbindung fehlgeschlagen: " + str(s) + ". Dumping network list:\n" + apstr + "\nIDLE = 0 - CONNECTING = 1 - WRONG_PASSWORD = -3 - NO_AP_FOUND = -2\nCONNECT_FAIL = -1 - GOT_IP = 3 - NOIP = 2")

print("TEST")
epd.fill(0xff)
epd.epdDisplay(epd.buffer)
utime.sleep(0.5)
print("Start receiving data")
epd.send_command(0x61)   # Set Resolution setting
epd.send_data(0x02)
epd.send_data(0x58)
epd.send_data(0x01)
epd.send_data(0xC0)
epd.send_command(0x10)
chunk_size = 512
total_bytes = 134400
delayTime = -1
started = False
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
try:
	s.connect((host, port))
	print("Connected to", host, "on port", port)
	# Receive data in 512-byte chunks
	received_bytes = 0
	while True:
		data = s.recv(chunk_size)
		led.on()
		if len(data) == 0:
			break
		# Process data
		if data:
			if started:
				received_bytes += len(data)
				print(f"Received {len(data)} bytes. Total received: {received_bytes}/{total_bytes}")
				epd.send_data1(bytearray(data))
				led.off()
			else:
				print(data)
				if data == b'STARTDATA':
					started = True
					print("Server indicating start of EPaper data")
				else:
					delayTime = int(data)
					print("Received delay time of " + str(delayTime))
	print("Download finished")
except:
	printerror("Verbindung mit Server fehlgeschlagen!")
	utime.sleep(5)
	machine.reset()
finally:
	s.close()
	print("Connection closed")
print("Received data from server")
epd.send_command(0x04)
epd.BusyHigh()
epd.send_command(0x12)
epd.BusyHigh()
epd.send_command(0x02)
epd.BusyLow()
epd.delay_ms(200)
print("Finished magic")
epd.Sleep()
print("Going to sleep")
nic.disconnect()
nic.active(False)
nic.deinit()
utime.sleep_ms(100)
nic=None
machine.lightsleep(delayTime)
machine.reset()