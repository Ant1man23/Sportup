/**
 * Central Environment & API Configuration for SportUp Mobile
 */

export const ENV = {
  API_BASE_URL: process.env.API_BASE_URL || 'https://cbs-appliance-alternatively-proprietary.trycloudflare.com/api/v1',
  FALLBACK_API_BASE_URL: 'http://192.168.0.194:8000/api/v1',
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyADSyTyyrt-shevgxYP2ynzpAmZ7m9KGxw',
  DEFAULT_LOCATION: {
    latitude: -18.8792, // Antananarivo, Madagascar
    longitude: 47.5079,
    city: 'Antananarivo',
    country: 'MG',
  },
};

export const hasValidGoogleMapsKey = (): boolean => {
  return (
    typeof ENV.GOOGLE_MAPS_API_KEY === 'string' &&
    ENV.GOOGLE_MAPS_API_KEY.length > 10 &&
    ENV.GOOGLE_MAPS_API_KEY !== 'YOUR_GOOGLE_MAPS_KEY'
  );
};
