import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { EnviroplusSensor } from './platformAccessory';

/**
 * EnviroplusPlatform
 * Here the user config is loaded and the Enviroplus accessories are created
 */
export class EnviroplusPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  private configProvided() {
    let provided = this.config.mqttbroker && this.config.devices && this.config.excellent && this.config.good &&
      this.config.fair && this.config.inferior && this.config.poor &&
      Array.isArray(this.config.devices) && this.config.devices.length !== 0;
    for (const device of this.config.devices) {
      provided = provided && device.displayName && device.serial && device.topic;
    }
    return provided;
  }

  private sensors: EnviroplusSensor[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    // Checks whether a configuration is provided, otherwise the plugin should not be initialized
    if (!this.configProvided()) {
      log.error('Not all configuration provided!');
      log.info('MQTT Broker for enviroment data is required along with all the enviro+ devices and their serial numbers, names and' +
               ' MQTT topics');
      return;
    }

    this.log.debug('Finished initializing platform:', this.config.name);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
    });

    this.api.on('shutdown', () => {
      log.debug('Executed shutdown callback');
      this.shutdown();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory): void {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * Register discovered accessories.
   * Accessories are only registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  discoverDevices(): void {

    // loop over the discovered devices and register each one if it has not already been registered
    this.log.debug('Devices:', this.config.devices);
    for (const device of this.config.devices) {

      // generate a unique id for the accessory based on the provided serial number
      const uuid = this.api.hap.uuid.generate(device.serial);

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        // the accessory already exists
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        // create the accessory handler for the restored accessory
        // this is imported from `platformAccessory.ts`
        this.sensors.push(new EnviroplusSensor(this, existingAccessory, device.displayName, device.serial, device.topic));
      } else {
        // the accessory does not yet exist, so we need to create it
        this.log.info('Adding new accessory:', device.displayName);

        // create a new accessory
        const accessory = new this.api.platformAccessory(device.displayName, uuid);

        // store a copy of the device object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.device = device;

        // create the accessory handler for the newly create accessory
        // this is imported from `platformAccessory.ts`
        this.sensors.push(new EnviroplusSensor(this, accessory, device.displayName, device.serial, device.topic));

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }

  shutdown() {
    for (const sensor of this.sensors) {
      sensor.shutdown();
    }
  }
}
