import type { API } from 'homebridge';

import { PLATFORM_NAME } from './settings.js';
import { EnviroplusPlatform } from './platform.js';

/**
 * This method registers the platform with Homebridge
 */
export default (api: API) => {
  api.registerPlatform(PLATFORM_NAME, EnviroplusPlatform);
};
