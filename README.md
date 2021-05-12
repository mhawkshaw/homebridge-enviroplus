
<p align="center">

<img src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>


# Pimoroni Enviro+ Homebridge Plug-in

This Homebridge plug-in allows you to make the data available from the [Pimoroni Enviro+](https://learn.pimoroni.com/tutorial/sandyj/getting-started-with-enviro-plus) device connected to a [Raspberry Pi](https://www.raspberrypi.org/).

## Setup Python Server

This Homebridge plug-in reads the data from a web server providing the JSON information, for example:

* {"temperature": "13.68", "pressure": "99529.24", "humidity": "75.12", "P2": "19", "P1": "23"}

Included in the python directory on the [GitHub repository](https://github.com/mhawkshaw/homebridge-enviroplus) for this plug-in you can find an example web server written in Python that you can run on the Raspberry Pi that has the Enviro+ connected to make this data available. This configuration is useful if you are not running the Homebridge server on the same machine that has the Enviro+ connected (most use cases).

## Plug-in Installation

Follow the [homebridge installation instructions](https://www.npmjs.com/package/homebridge) if you haven't already.

Install this plugin globally:

    npm install -g homebridge-enviroplus

Add platform to `config.json`, for configuration see below.

## Plug-in Configuration

The plug-in needs to know where to find the web server providing the JSON data (e.g. http://127.0.0.1:8001) along with the serial number of the device to uniquely identify it (you can also use your Raspberry Pi identifier).

```json
{
  "platforms": [
    {
      "platform": "EnviroplusAirQuality",
      "name": "EnviroplusPlatform",
      "server": "http://127.0.0.1:8001/",
      "serial": "1234567890",
      "interval": 5,
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

- `interval`: how often (in minutes) the plug-in will fetch new Enviro+ data from the server. Default is 5.
- `excellent`: the upper value for PM2.5 air quality considered to be excellent (in micrograms per cubic metre). Default is 10.
- `good`: the upper value for PM2.5 air quality considered to be good (in micrograms per cubic metre). Default is 20.
- `fair`: the upper value for PM2.5 air quality considered to be fair (in micrograms per cubic metre). Default is 25.
- `inferior`: the upper value for PM2.5 air quality considered to be inferior (in micrograms per cubic metre). Default is 50.
- `poor`: the lowest value for PM2.5 air quality considered to be poor (in micrograms per cubic metre). Anything above this is considered to be poor. Default is 50.