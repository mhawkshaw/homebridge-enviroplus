import { Service, PlatformAccessory } from 'homebridge';

import { EnviroplusPlatform } from './platform';

import { XMLHttpRequest } from 'xmlhttprequest-ts';

/**
 * Enviroplus Accessory
 * An instance of this class is created for each accessory registered (in this case only one)
 * The Enviroplus accessory exposes the services of temperature, air quality and humidity
 */
export class EnviroplusSensor {
  private airQualityService: Service;
  private humidityService: Service;
  private temperatureService: Service;

  // User to store the sensor data for quick retrieval
  private sensorData = {
    airQuality: this.platform.Characteristic.AirQuality.UNKNOWN,
    temperature: -270,
    humidity: 0,
    P2: 0,
    P1: 0,
  };

  /**
   * Gets the Enviroplus JSON data from the specified URI
   */
   getEnviroValues(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = new XMLHttpRequest();
      req.open('GET', url);

      req.onload = () => {
        if (req.status === 200) {
          resolve(req.responseText);
        } else {
          reject(Error(req.statusText));
        }
      };

      req.onerror = () => {
        reject(Error('Network Error'));
      };

      req.send();
    });
  }

  updateAirQuality(): void {
    this.getEnviroValues(this.platform.config.server).then(response => {
      const jsonData = JSON.parse(response);

      this.sensorData.temperature = jsonData.temperature;
      this.sensorData.humidity = jsonData.humidity;
      this.sensorData.P2 = jsonData.P2;
      this.sensorData.P1 = jsonData.P1;

      this.platform.log.debug('Temperature:', this.sensorData.temperature);
      this.platform.log.debug('Humidity:', this.sensorData.humidity);
      this.platform.log.debug('P2:', this.sensorData.P2);
      this.platform.log.debug('P1:', this.sensorData.P1);

      if (this.sensorData.P2 <= this.platform.config.excellent) {
        this.sensorData.airQuality = this.platform.Characteristic.AirQuality.EXCELLENT;
      }
      else if (this.sensorData.P2 > this.platform.config.excellent && this.sensorData.P2 <= this.platform.config.good) {
        this.sensorData.airQuality = this.platform.Characteristic.AirQuality.GOOD;
      }
      else if (this.sensorData.P2 > this.platform.config.good && this.sensorData.P2 <= this.platform.config.fair) {
        this.sensorData.airQuality = this.platform.Characteristic.AirQuality.FAIR;
      }
      else if (this.sensorData.P2 > this.platform.config.fair && this.sensorData.P2 <= this.platform.config.inferior) {
        this.sensorData.airQuality = this.platform.Characteristic.AirQuality.INFERIOR;
      }
      else if (this.sensorData.P2 > this.platform.config.poor) {
        this.sensorData.airQuality = this.platform.Characteristic.AirQuality.POOR;
      }
    }).catch(error => {
      this.platform.log.error("Unable to obtain data from Enviro+ Server", this.platform.config.server, error);
    });
  }

  constructor(
    private readonly platform: EnviroplusPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    const accessoryInfo: Service | undefined = this.accessory.getService(this.platform.Service.AccessoryInformation);

    if (accessoryInfo != null) {
      accessoryInfo.setCharacteristic(this.platform.Characteristic.Manufacturer, 'Pimoroni')
        .setCharacteristic(this.platform.Characteristic.Model, 'EnviroPlus')
        .setCharacteristic(this.platform.Characteristic.SerialNumber, this.platform.config.serial);
    }

    this.airQualityService = this.accessory.getService(this.platform.Service.AirQualitySensor) || this.accessory.addService(this.platform.Service.AirQualitySensor);
    this.temperatureService = this.accessory.getService(this.platform.Service.TemperatureSensor) || this.accessory.addService(this.platform.Service.TemperatureSensor);
    this.humidityService = this.accessory.getService(this.platform.Service.HumiditySensor) || this.accessory.addService(this.platform.Service.HumiditySensor);

    // set the service name, this is what is displayed as the default name on the Home app
    this.airQualityService.setCharacteristic(this.platform.Characteristic.Name, "Air Quality");
    this.temperatureService.setCharacteristic(this.platform.Characteristic.Name, "Temperature");
    this.humidityService.setCharacteristic(this.platform.Characteristic.Name, "Humidity");

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

    // Do an initial get of the air quality data
    this.updateAirQuality();

    /**
     * Updating characteristics values asynchronously.
     *
     * For performance reasons, we get the data from the Enviro+ server periodically and store it locally in our variables
     * then push the updates to HomeKit. Then when HomeKit requests the data, we used the locally stored data instead.
     */
    const ms_to_minutes = 60000;

    setInterval(() => {
      this.updateAirQuality();
      // push the new value to HomeKit
      this.airQualityService.updateCharacteristic(this.platform.Characteristic.AirQuality, this.sensorData.airQuality);
      this.airQualityService.updateCharacteristic(this.platform.Characteristic.PM10Density, this.sensorData.P1);
      this.airQualityService.updateCharacteristic(this.platform.Characteristic.PM2_5Density, this.sensorData.P2);
      this.temperatureService.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, this.sensorData.temperature);
      this.humidityService.updateCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, this.sensorData.humidity);
    }, this.platform.config.interval * ms_to_minutes);
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
}
