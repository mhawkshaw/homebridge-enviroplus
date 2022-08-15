import { Service, PlatformAccessory, Characteristic } from 'homebridge';

import { EnviroplusPlatform } from './platform';

import { Client, connect } from 'mqtt';

interface EnviroPlusJson {
  temperature: number;
  pressure: number;
  humidity: number;
  oxidised: number;
  reduced: number;
  nh3: number;
  lux: number;
  pm1: number;
  pm25: number;
  pm10: number;
  serial: string;
}

/**
 * Enviroplus Accessory
 * An instance of this class is created for each accessory registered (in this case only one)
 * The Enviroplus accessory exposes the services of temperature, air quality and humidity
 */
export class EnviroplusSensor {
  private airQualityService: Service;
  private humidityService: Service;
  private temperatureService: Service;
  private lightSensorService: Service;

  // User to store the sensor data for quick retrieval
  private sensorData = {
    airQuality: this.platform.Characteristic.AirQuality.UNKNOWN,
    temperature: -270,
    humidity: 0,
    lux: 0.0001,
    P2: 0,
    P1: 0,
  };

  private mqttClient: Client;

  /**
   * Maps the JSON data received from the MQTT broker originating from the Enviro sensor to the internal structure we need
   * @param jsonData the JSON data received from the MQTT broker
   */
  mapJsonData(jsonData: EnviroPlusJson): void {
    this.sensorData.P1 = jsonData.pm1;
    this.sensorData.P2 = jsonData.pm25;
    this.sensorData.humidity = jsonData.humidity;
    this.sensorData.temperature = jsonData.temperature;
    this.sensorData.lux = jsonData.lux;
    if (jsonData.lux <= 0) {
      this.sensorData.lux = 0.0001;
    }

    if (this.sensorData.P2 <= this.platform.config.excellent) {
      this.sensorData.airQuality = this.platform.Characteristic.AirQuality.EXCELLENT;
    } else if (this.sensorData.P2 > this.platform.config.excellent && this.sensorData.P2 <= this.platform.config.good) {
      this.sensorData.airQuality = this.platform.Characteristic.AirQuality.GOOD;
    } else if (this.sensorData.P2 > this.platform.config.good && this.sensorData.P2 <= this.platform.config.fair) {
      this.sensorData.airQuality = this.platform.Characteristic.AirQuality.FAIR;
    } else if (this.sensorData.P2 > this.platform.config.fair && this.sensorData.P2 <= this.platform.config.inferior) {
      this.sensorData.airQuality = this.platform.Characteristic.AirQuality.INFERIOR;
    } else if (this.sensorData.P2 > this.platform.config.poor) {
      this.sensorData.airQuality = this.platform.Characteristic.AirQuality.POOR;
    }
  }

  shutdown() {
    this.platform.log.debug("Shutdown called. Unsubscribing from MQTT broker.")
    this.mqttClient.unsubscribe(this.platform.config.topic, (error, packet) => {
      if (error) {
        this.platform.log.error(error.message);
      }
    });
    this.mqttClient.end();
  }

  constructor(
    private readonly platform: EnviroplusPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    const accessoryInfo: Service | undefined = this.accessory.getService(this.platform.Service.AccessoryInformation);

    if (accessoryInfo !== undefined) {
      accessoryInfo.setCharacteristic(this.platform.Characteristic.Manufacturer, 'Pimoroni')
        .setCharacteristic(this.platform.Characteristic.Model, 'EnviroPlus')
        .setCharacteristic(this.platform.Characteristic.SerialNumber, this.platform.config.serial);
    }

    this.airQualityService = this.accessory.getService(this.platform.Service.AirQualitySensor) ||
      this.accessory.addService(this.platform.Service.AirQualitySensor);
    this.temperatureService = this.accessory.getService(this.platform.Service.TemperatureSensor) ||
      this.accessory.addService(this.platform.Service.TemperatureSensor);
    this.humidityService = this.accessory.getService(this.platform.Service.HumiditySensor) ||
      this.accessory.addService(this.platform.Service.HumiditySensor);
    this.lightSensorService = this.accessory.getService(this.platform.Service.LightSensor) ||
      this.accessory.addService(this.platform.Service.LightSensor);

    // set the service name, this is what is displayed as the default name on the Home app
    this.airQualityService.setCharacteristic(this.platform.Characteristic.Name, 'Air Quality');
    this.temperatureService.setCharacteristic(this.platform.Characteristic.Name, 'Temperature');
    this.humidityService.setCharacteristic(this.platform.Characteristic.Name, 'Humidity');
    this.lightSensorService.setCharacteristic(this.platform.Characteristic.Name, 'Light Level');

    // register handlers
    this.airQualityService.getCharacteristic(this.platform.Characteristic.AirQuality)
      .onGet(this.handleAirQualityGet.bind(this));
    this.airQualityService.getCharacteristic(this.platform.Characteristic.PM10Density)
      .onGet(this.handlePM10DensityGet.bind(this));
    this.airQualityService.getCharacteristic(this.platform.Characteristic.PM2_5Density)
      .onGet(this.handlePM2_5DensityGet.bind(this));
    this.temperatureService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.handleTemperatureGet.bind(this));
    this.humidityService.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
      .onGet(this.handleHumidityGet.bind(this));
    this.lightSensorService.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel)
      .onGet(this.handleLightSensorGet.bind(this));

    // Connect to MQTT broker
    const options = {
      username: this.platform.config.username,
      password: this.platform.config.password
    }

    let brokerUrl = this.platform.config.server;

    // URL needs to include mqtt:// prefix
    if (brokerUrl && !brokerUrl.includes('://')) {
      brokerUrl = 'mqtt://' + brokerUrl;
    }

    this.mqttClient = connect(brokerUrl, options);

    this.mqttClient.subscribe(this.platform.config.topic, { qos: 0 }, (error, granted) => {
      if (error) {
        this.platform.log.error("Unable to connect to the MQTT broker: " + error.name + " " + error.message);
      } else {
        this.platform.log.debug(`${granted[0].topic} was subscribed`);
      }
    })

    this.mqttClient.on("message", (topic, message) => {
      this.platform.log.debug(message.toString("utf-8"));
      let enviroPlusData: EnviroPlusJson = JSON.parse(message.toString("utf-8"));
      this.mapJsonData(enviroPlusData);
    })
  }

  /**
   * Handle the "GET" requests from HomeKit
   * Here we use the locally stored data for performance reasons and also to avoid sending too many requests to the Enviro+ server
   */
  async handleAirQualityGet(): Promise<number> {
    this.platform.log.debug('Air Quality ->', this.sensorData.airQuality);

    return this.sensorData.airQuality;
  }

  async handlePM10DensityGet(): Promise<number> {
    this.platform.log.debug('PM10 Density ->', this.sensorData.P1);

    return this.sensorData.P1;
  }

  async handlePM2_5DensityGet(): Promise<number> {
    this.platform.log.debug('PM2.5 Density ->', this.sensorData.P2);

    return this.sensorData.P2;
  }

  async handleTemperatureGet(): Promise<number> {
    this.platform.log.debug('Temperature ->', this.sensorData.temperature);

    return this.sensorData.temperature;
  }

  async handleHumidityGet(): Promise<number> {
    this.platform.log.debug('Humidity ->', this.sensorData.humidity);

    return this.sensorData.humidity;
  }

  async handleLightSensorGet(): Promise<number> {
    this.platform.log.debug('Light ->', this.sensorData.lux);

    return this.sensorData.lux;
  }
}
function options(arg0: string, options: any) {
  throw new Error('Function not implemented.');
}

function callback(arg0: string, options: { username: string; password: string; }, callback: any) {
  throw new Error('Function not implemented.');
}