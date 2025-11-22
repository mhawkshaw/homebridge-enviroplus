
<p align="center">

<img src="https://raw.githubusercontent.com/homebridge/branding/latest/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>


# Pimoroni Enviro+ Homebridge Plug-in

This Homebridge plug-in allows you to make the data available from the [Pimoroni Enviro+](https://learn.pimoroni.com/tutorial/sandyj/getting-started-with-enviro-plus) device connected to a [Raspberry Pi](https://www.raspberrypi.org/).

[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

## Setup MQTT broker

This Homebridge plug-in reads the data from an MQTT broker providing the JSON information, for example:

* {"temperature": 24, "pressure": 99080, "humidity": 47, "oxidised": 33, "reduced": 1024, "nh3": 1810, "lux": 0, "pm1": 6, "pm25": 7, "pm10": 7, "serial": "0000000012345def"}

Included in the examples on the [Pimoroni Enviroplus GitHub repository](https://github.com/pimoroni/enviroplus-python/tree/master/examples) you can find a Python script called "mqtt-all.py" that will read the information from the Enviro+ sensors and pass them as JSON values to an MQTT broker. Just start the script, for example:

    python3 mqtt-all.py --broker 192.168.1.164 --topic enviro --username xxx --password xxxx

You need to install an [MQTT broker](http://mosquitto.org/) on your machine, this can be any machine in your network, including the machine running Homebridge. Here are some instructions for popular distributions:

### Raspberry Pi / Ubuntu

In short, you just need to do the following:

    sudo apt-get update
    sudo apt-get install -y mosquitto mosquitto-clients
    sudo systemctl enable mosquitto.service

### macOS

Use [Homebrew](https://brew.sh/)

    brew install mosquitto

### Windows

Go to the [Mosquitto Download Page](https://mosquitto.org/download/) and choose the right installer for your system.

### Enable authentication

A quick search online will provide you with information on how to secure your installation. To help you, I've found the following links for the 
[Raspberry Pi](https://randomnerdtutorials.com/how-to-install-mosquitto-broker-on-raspberry-pi/) and [Ubuntu](https://www.vultr.com/docs/install-mosquitto-mqtt-broker-on-ubuntu-20-04-server/)

## Plug-in Installation

Follow the [homebridge installation instructions](https://www.npmjs.com/package/homebridge) if you haven't already.

Install this plugin globally:

    npm install -g homebridge-enviroplus

Add platform to `config.json`, for configuration see below.

## Plug-in Configuration

The plug-in needs to know where to find the MQTT broker providing the JSON data (e.g. mqtt://127.0.0.1:1883) along with the serial number of the device to uniquely identify it (you can also use your Raspberry Pi identifier).

```json
{
  "platforms": [
    {
      "platform": "EnviroplusAirQuality",
      "name": "EnviroPlus",
      "mqttbroker": "mqtt://127.0.0.1:1883",
      "username": "",
      "password": "",
      "devices": [
        {
          "displayName": "My Enviro+ Sensor",
          "serial": "1234567890",
          "topic": "enviro"
        }
      ],
      "excellent": 10,
      "good": 20,
      "fair": 25,
      "inferior": 50,
      "poor": 50
    }
  ]
}

```

The following settings are optional:

- `username`: the MQTT broker username
- `password`: the MQTT broker password
- `excellent`: the upper value for PM2.5 air quality considered to be excellent (in micrograms per cubic metre). Default is 10.
- `good`: the upper value for PM2.5 air quality considered to be good (in micrograms per cubic metre). Default is 20.
- `fair`: the upper value for PM2.5 air quality considered to be fair (in micrograms per cubic metre). Default is 25.
- `inferior`: the upper value for PM2.5 air quality considered to be inferior (in micrograms per cubic metre). Default is 50.
- `poor`: the lowest value for PM2.5 air quality considered to be poor (in micrograms per cubic metre). Anything above this is considered to be poor. Default is 50.

If you have multiple Enviro+ devices, then you can list them all in the config giving each one a unique name, MQTT topic and serial number.
