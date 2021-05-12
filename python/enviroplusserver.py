#!/usr/bin/env python3

from http.server import HTTPServer, BaseHTTPRequestHandler
from http import HTTPStatus
import json
import time
from bme280 import BME280
from pms5003 import PMS5003, ReadTimeoutError
from signal import signal, SIGINT
from sys import exit

try:
    from smbus2 import SMBus
except ImportError:
    from smbus import SMBus

bus = SMBus(1)

# Create BME280 instance
bme280 = BME280(i2c_dev=bus)

# Create PMS5003 instance
pms5003 = PMS5003()

# Read values from BME280 and PMS5003 and return as dict
def read_values():
    values = {}
    raw_temp = bme280.get_temperature()
    values["temperature"] = "{:.2f}".format(raw_temp)
    values["pressure"] = "{:.2f}".format(bme280.get_pressure() * 100)
    values["humidity"] = "{:.2f}".format(bme280.get_humidity())
    try:
        pm_values = pms5003.read()
        values["P2"] = str(pm_values.pm_ug_per_m3(2.5))
        values["P1"] = str(pm_values.pm_ug_per_m3(10))
    except ReadTimeoutError:
        pms5003.reset()
        pm_values = pms5003.read()
        values["P2"] = str(pm_values.pm_ug_per_m3(2.5))
        values["P1"] = str(pm_values.pm_ug_per_m3(10))

    values_json={
        "temperature": values["temperature"],
        "pressure": values["pressure"],
        "humidity": values["humidity"],
        "P2": values["P2"],
        "P1": values["P1"]
    }

    return values_json

class _RequestHandler(BaseHTTPRequestHandler):
    def _set_headers(self):
        self.send_response(HTTPStatus.OK.value)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

    def do_GET(self):
        values = read_values()
        self._set_headers()
        self.wfile.write(json.dumps(values).encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT.value)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET')
        self.send_header('Access-Control-Allow-Headers', 'content-type')
        self.end_headers()


def run_server():
    server_address = ('', 8001)
    httpd = HTTPServer(server_address, _RequestHandler)
    print('serving at %s:%d' % server_address)
    httpd.serve_forever()

def handler(signal_received, frame):
    # Handle any cleanup here
    print('SIGINT or CTRL-C detected. Exiting gracefully')
    conn.close()
    exit(0)

if __name__ == '__main__':
    run_server()
    signal(SIGINT, handler)
