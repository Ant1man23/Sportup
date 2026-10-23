import { Linking, Platform } from 'react-native';
import axios from 'axios';
import { ENV, hasValidGoogleMapsKey } from '../config/env';

export interface PlacePrediction {
  placeId: string;
  primaryText: string;
  secondaryText: string;
  fullDescription: string;
}

export interface PlaceLocation {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  city: string;
}

export interface MadagascarCity {
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  aliases?: string[];
}

export const MADAGASCAR_CITIES: MadagascarCity[] = [
  { name: 'Antananarivo', region: 'Analamanga', latitude: -18.8792, longitude: 47.5079, aliases: ['Tana', 'Antananarivo Renivohitra'] },
  { name: 'Toamasina', region: 'Atsinanana', latitude: -18.1492, longitude: 49.4023, aliases: ['Tamatave', 'Port Toamasina'] },
  { name: 'Mahajanga', region: 'Boeny', latitude: -15.7167, longitude: 46.3167, aliases: ['Majunga'] },
  { name: 'Antsirabe', region: 'Vakinankaratra', latitude: -19.8659, longitude: 47.0333, aliases: ['Ville d\'Eaux'] },
  { name: 'Fianarantsoa', region: 'Haute Matsiatra', latitude: -21.4506, longitude: 47.0826, aliases: ['Fianar'] },
  { name: 'Toliara', region: 'Atsimo-Andrefana', latitude: -23.3516, longitude: 43.6674, aliases: ['Tuléar', 'Toliary'] },
  { name: 'Antsiranana', region: 'Diana', latitude: -12.2833, longitude: 49.2833, aliases: ['Diego-Suarez', 'Diego'] },
  { name: 'Morondava', region: 'Menabe', latitude: -20.2887, longitude: 44.2806, aliases: ['Allée des Baobabs'] },
  { name: 'Taolagnaro', region: 'Anosy', latitude: -25.0225, longitude: 46.9987, aliases: ['Fort-Dauphin', 'Tolagnaro'] },
  { name: 'Nosy Be', region: 'Diana', latitude: -13.3100, longitude: 48.2600, aliases: ['Hell-Ville', 'Nosy-Be'] },
  { name: 'Ambatondrazaka', region: 'Alaotra-Mangoro', latitude: -17.8286, longitude: 48.4181, aliases: ['Lac Alaotra'] },
  { name: 'Sambava', region: 'Sava', latitude: -14.2667, longitude: 50.1667, aliases: ['SAVA'] },
  { name: 'Manakara', region: 'Fitovinany', latitude: -22.1486, longitude: 48.0167 },
  { name: 'Farafangana', region: 'Atsimo-Atsinanana', latitude: -22.8167, longitude: 47.8333 },
  { name: 'Moramanga', region: 'Alaotra-Mangoro', latitude: -18.9492, longitude: 48.2301 },
  { name: 'Miarinarivo', region: 'Itasy', latitude: -18.9611, longitude: 46.9051, aliases: ['Itasy', 'Lac Itasy'] },
  { name: 'Ambositra', region: 'Amoron\'i Mania', latitude: -20.5303, longitude: 47.2433 },
  { name: 'Sainte-Marie', region: 'Analanjirofo', latitude: -16.9042, longitude: 49.9003, aliases: ['Nosy Boraha'] },
  { name: 'Antalaha', region: 'Sava', latitude: -14.9000, longitude: 50.2833 },
  { name: 'Ambanja', region: 'Diana', latitude: -13.6833, longitude: 48.4500 },
];

// Fallback sports locations in Madagascar (always accessible offline & instantly)
export const MADAGASCAR_SPORTS_VENUES: (PlaceLocation & { name: string })[] = [
  {
    name: 'Stade Municipal de Mahamasina (Barea)',
    formattedAddress: 'Rue Rakotoarijaona, Mahamasina, Antananarivo 101',
    city: 'Antananarivo',
    latitude: -18.9189,
    longitude: 47.5256,
  },
  {
    name: 'Palais des Sports et de la Culture Mahamasina',
    formattedAddress: 'Mahamasina Sud, Antananarivo',
    city: 'Antananarivo',
    latitude: -18.9221,
    longitude: 47.5244,
  },
  {
    name: 'Gymnase Couvert d\'Ankorondrano',
    formattedAddress: 'Route des Hydrocarbures, Ankorondrano, Antananarivo',
    city: 'Antananarivo',
    latitude: -18.8872,
    longitude: 47.5273,
  },
  {
    name: 'Urban Futsal Andraharo',
    formattedAddress: 'Zone Galaxy, Andraharo, Antananarivo',
    city: 'Antananarivo',
    latitude: -18.8785,
    longitude: 47.5142,
  },
  {
    name: 'Stade de l\'Université d\'Ankatso',
    formattedAddress: 'Campus Universitaire d\'Ankatso, Antananarivo',
    city: 'Antananarivo',
    latitude: -18.9152,
    longitude: 47.5564,
  },
  {
    name: 'Terrain Municipal d\'Antsirabe',
    formattedAddress: 'Avenue de la Gare, Antsirabe',
    city: 'Antsirabe',
    latitude: -19.8659,
    longitude: 47.0333,
  },
  {
    name: 'Stade Municipal de Barikadimy',
    formattedAddress: 'Boulevard Augagneur, Toamasina',
    city: 'Toamasina',
    latitude: -18.1499,
    longitude: 49.4023,
  },
  {
    name: 'Stade Rabemananjara Mahajanga',
    formattedAddress: 'Boulevard Poincaré, Mahajanga',
    city: 'Mahajanga',
    latitude: -15.7212,
    longitude: 46.3195,
  },
  {
    name: 'Gymnase d\'Ambatomena',
    formattedAddress: 'Lalana Pasitera Eugène Groult, Ambalapaiso, Fianarantsoa',
    city: 'Fianarantsoa',
    latitude: -21.4506,
    longitude: 47.0826,
  },
  {
    name: 'Stade Maître Kira Toliara',
    formattedAddress: 'Avenue de France, Toliara',
    city: 'Toliara',
    latitude: -23.3550,
    longitude: 43.6740,
  },
];

class GoogleMapsService {
  private osmCache = new Map<string, PlaceLocation>();
  private cityCache = new Map<string, PlaceLocation>();

  private get apiKey(): string {
    return ENV.GOOGLE_MAPS_API_KEY;
  }

  /**
   * Search places using Google Places Autocomplete API or Free OpenStreetMap Nominatim
   */
  async searchPlaces(query: string): Promise<PlacePrediction[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const trimmed = query.trim().toLowerCase();

    // ─── Instant Match for Madagascar Cities (always available) ───
    const cityMatches: PlacePrediction[] = MADAGASCAR_CITIES.filter((c) => {
      if (c.name.toLowerCase().includes(trimmed)) return true;
      if (c.region.toLowerCase().includes(trimmed)) return true;
      if (c.aliases && c.aliases.some((a) => a.toLowerCase().includes(trimmed))) return true;
      return false;
    }).map((c) => {
      const placeId = `city_${c.name.toLowerCase().replace(/\s+/g, '_')}`;
      this.cityCache.set(placeId, {
        latitude: c.latitude,
        longitude: c.longitude,
        formattedAddress: `${c.name}, ${c.region}, Madagascar`,
        city: c.name,
      });
      return {
        placeId,
        primaryText: c.name,
        secondaryText: `${c.region}, Madagascar`,
        fullDescription: `${c.name}, ${c.region}, Madagascar`,
      };
    });

    // ─── OPTION A : Google Places Autocomplete API without Antananarivo lock ───
    if (hasValidGoogleMapsKey()) {
      try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
          params: {
            input: query,
            key: this.apiKey,
            language: 'fr',
            components: 'country:mg',
          },
        });

        if (response.data.status === 'OK' && Array.isArray(response.data.predictions) && response.data.predictions.length > 0) {
          const googlePredictions: PlacePrediction[] = response.data.predictions.map((p: any) => ({
            placeId: p.place_id,
            primaryText: p.structured_formatting?.main_text || p.description,
            secondaryText: p.structured_formatting?.secondary_text || '',
            fullDescription: p.description,
          }));

          // Merge: cities on top, then google results (avoid duplicates)
          const seen = new Set<string>();
          const combined: PlacePrediction[] = [];
          for (const item of [...cityMatches, ...googlePredictions]) {
            const key = item.primaryText.toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              combined.push(item);
            }
          }
          return combined;
        }
      } catch (error) {
        console.warn('Google Places Autocomplete API Error, falling back to local/OSM:', error);
      }
    }

    // ─── OPTION B : Seamless Free OpenStreetMap & Local Venues Fallback ───
    const freeResults = await this.searchFreePlaces(query);
    const seen = new Set<string>();
    const combined: PlacePrediction[] = [];
    for (const item of [...cityMatches, ...freeResults]) {
      const key = item.primaryText.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(item);
      }
    }
    return combined;
  }

  /**
   * Free OpenStreetMap & Local Sports Venues search (0 € / Always available)
   */
  async searchFreePlaces(query: string): Promise<PlacePrediction[]> {
    const q = query.toLowerCase().trim();

    // 1. Check local sports venues first for instant response
    const localMatches: PlacePrediction[] = MADAGASCAR_SPORTS_VENUES.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.formattedAddress.toLowerCase().includes(q) ||
        v.city.toLowerCase().includes(q)
    ).map((v, index) => ({
      placeId: `fallback_${index}`,
      primaryText: v.name,
      secondaryText: `${v.formattedAddress}, ${v.city}`,
      fullDescription: `${v.name}, ${v.city}`,
    }));

    // 2. Query free OpenStreetMap Nominatim search for dynamic real-world addresses
    try {
      const osmRes = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: query,
          format: 'json',
          addressdetails: 1,
          limit: 6,
          countrycodes: 'mg',
        },
        headers: {
          'Accept-Language': 'fr',
          'User-Agent': 'SportUpApp/1.0 (sportup.madagascar@gmail.com)',
        },
        timeout: 4000,
      });

      if (Array.isArray(osmRes.data)) {
        const osmPredictions: PlacePrediction[] = osmRes.data.map((item: any) => {
          const placeId = `osm_${item.place_id}`;
          const address = item.address || {};
          const city =
            address.city ||
            address.town ||
            address.village ||
            address.municipality ||
            address.suburb ||
            address.state ||
            item.name ||
            'Madagascar';
          const primary = item.name || address.road || item.display_name.split(',')[0];
          const secondary = item.display_name.split(',').slice(1, 3).join(',').trim();

          this.osmCache.set(placeId, {
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
            formattedAddress: item.display_name,
            city,
          });

          return {
            placeId,
            primaryText: primary,
            secondaryText: secondary || city,
            fullDescription: item.display_name,
          };
        });

        return [...localMatches, ...osmPredictions];
      }
    } catch {
      return localMatches;
    }

    return localMatches;
  }

  /**
   * Get Place Details (coordinates, address, city)
   */
  async getPlaceDetails(placeId: string): Promise<PlaceLocation | null> {
    if (placeId.startsWith('city_')) {
      return this.cityCache.get(placeId) || null;
    }

    if (placeId.startsWith('fallback_')) {
      const index = parseInt(placeId.replace('fallback_', ''), 10);
      const venue = MADAGASCAR_SPORTS_VENUES[index] || MADAGASCAR_SPORTS_VENUES[0];
      return {
        latitude: venue.latitude,
        longitude: venue.longitude,
        formattedAddress: venue.formattedAddress,
        city: venue.city,
      };
    }

    if (placeId.startsWith('osm_')) {
      return this.osmCache.get(placeId) || null;
    }

    if (!hasValidGoogleMapsKey()) {
      return null;
    }

    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
        params: {
          place_id: placeId,
          fields: 'formatted_address,geometry,name,address_components',
          key: this.apiKey,
          language: 'fr',
        },
      });

      if (response.data.status === 'OK' && response.data.result) {
        const result = response.data.result;
        const lat = result.geometry?.location?.lat;
        const lng = result.geometry?.location?.lng;

        let city = '';
        if (Array.isArray(result.address_components)) {
          const locality = result.address_components.find((c: any) =>
            c.types.includes('locality') ||
            c.types.includes('administrative_area_level_2') ||
            c.types.includes('administrative_area_level_1')
          );
          if (locality) {
            city = locality.long_name;
          }
        }

        if (!city && result.name) {
          city = result.name;
        }

        return {
          latitude: lat,
          longitude: lng,
          formattedAddress: result.formatted_address || result.name,
          city: city || 'Madagascar',
        };
      }
      return null;
    } catch (error) {
      console.warn('Google Place Details API Error:', error);
      return null;
    }
  }

  /**
   * Geocode a text address into coordinates (Google or OpenStreetMap)
   */
  async geocodeAddress(address: string): Promise<PlaceLocation | null> {
    const trimmed = address.trim().toLowerCase();

    // Vérifier d'abord si c'est le nom d'une ville malgache
    const cityMatch = MADAGASCAR_CITIES.find(
      (c) => c.name.toLowerCase() === trimmed || (c.aliases && c.aliases.some((a) => a.toLowerCase() === trimmed))
    );
    if (cityMatch) {
      return {
        latitude: cityMatch.latitude,
        longitude: cityMatch.longitude,
        formattedAddress: `${cityMatch.name}, ${cityMatch.region}, Madagascar`,
        city: cityMatch.name,
      };
    }

    if (!hasValidGoogleMapsKey()) {
      try {
        const res = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: {
            q: address,
            format: 'json',
            addressdetails: 1,
            limit: 1,
            countrycodes: 'mg',
          },
          headers: {
            'User-Agent': 'SportUpApp/1.0',
          },
          timeout: 4000,
        });
        if (Array.isArray(res.data) && res.data.length > 0) {
          const item = res.data[0];
          const addr = item.address || {};
          const city =
            addr.city ||
            addr.town ||
            addr.village ||
            addr.municipality ||
            addr.state ||
            address;
          return {
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
            formattedAddress: item.display_name,
            city,
          };
        }
      } catch {
        // Fallback
      }

      return null;
    }

    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          address,
          key: this.apiKey,
          language: 'fr',
          components: 'country:mg',
        },
      });

      if (response.data.status === 'OK' && response.data.results?.[0]) {
        const result = response.data.results[0];
        const lat = result.geometry?.location?.lat;
        const lng = result.geometry?.location?.lng;

        let city = '';
        if (Array.isArray(result.address_components)) {
          const locality = result.address_components.find((c: any) =>
            c.types.includes('locality') ||
            c.types.includes('administrative_area_level_2') ||
            c.types.includes('administrative_area_level_1')
          );
          if (locality) city = locality.long_name;
        }

        return {
          latitude: lat,
          longitude: lng,
          formattedAddress: result.formatted_address,
          city: city || address,
        };
      }
      return null;
    } catch (error) {
      console.warn('Google Geocode API Error:', error);
      return null;
    }
  }

  /**
   * Reverse Geocode (lat/lng to human address)
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    if (!hasValidGoogleMapsKey()) {
      try {
        const res = await axios.get('https://nominatim.openstreetmap.org/reverse', {
          params: {
            lat: latitude,
            lon: longitude,
            format: 'json',
            addressdetails: 1,
          },
          headers: {
            'User-Agent': 'SportUpApp/1.0',
          },
          timeout: 4000,
        });
        if (res.data?.display_name) {
          return res.data.display_name;
        }
      } catch {
        // Fallback default
      }
      return 'Madagascar';
    }

    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          latlng: `${latitude},${longitude}`,
          key: this.apiKey,
          language: 'fr',
        },
      });

      if (response.data.status === 'OK' && response.data.results?.[0]) {
        return response.data.results[0].formatted_address;
      }
      return null;
    } catch (error) {
      console.warn('Google Reverse Geocode API Error:', error);
      return null;
    }
  }

  /**
   * Generate Map Image URL:
   * Uses Google Static Maps API if key is available,
   * otherwise uses 100% Free OpenStreetMap static map!
   */
  getStaticMapUrl(
    latitude: number,
    longitude: number,
    options: {
      zoom?: number;
      width?: number;
      height?: number;
      sportColor?: string;
    } = {}
  ): string {
    const zoom = options.zoom ?? 15;
    const width = options.width ?? 600;
    const height = options.height ?? 300;

    if (hasValidGoogleMapsKey()) {
      const markerColor = options.sportColor ? `0x${options.sportColor.replace('#', '')}` : 'red';
      const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
      const params = [
        `center=${latitude},${longitude}`,
        `zoom=${zoom}`,
        `size=${width}x${height}`,
        `scale=2`,
        `maptype=roadmap`,
        `markers=color:${markerColor}%7Clabel:S%7C${latitude},${longitude}`,
        `key=${this.apiKey}`,
      ];
      return `${baseUrl}?${params.join('&')}`;
    }

    // 100% Free OpenStreetMap Static Map (No API key, No credit card needed!)
    return this.getOsmStaticMapUrl(latitude, longitude, { zoom, width, height });
  }

  /**
   * Free OpenStreetMap Static Map URL
   */
  getOsmStaticMapUrl(
    latitude: number,
    longitude: number,
    options: {
      zoom?: number;
      width?: number;
      height?: number;
    } = {}
  ): string {
    const zoom = options.zoom ?? 15;
    const width = options.width ?? 600;
    const height = options.height ?? 300;
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=${zoom}&size=${width}x${height}&maptype=mapnik&markers=${latitude},${longitude},ol-marker`;
  }

  /**
   * Open Native Google Maps navigation or Web Fallback
   * 100% Free - Uses native device URL schemes (geo: or https://www.google.com/maps)
   */
  async openInGoogleMaps(latitude: number, longitude: number, label: string = 'Session SportUp'): Promise<void> {
    const encodedLabel = encodeURIComponent(label);
    const nativeUrl = Platform.select({
      ios: `comgooglemaps://?q=${latitude},${longitude}&zoom=16`,
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodedLabel})`,
    });

    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

    try {
      if (nativeUrl) {
        const supported = await Linking.canOpenURL(nativeUrl);
        if (supported) {
          await Linking.openURL(nativeUrl);
          return;
        }
      }
      await Linking.openURL(webUrl);
    } catch (err) {
      console.warn('Could not open Google Maps navigation:', err);
      await Linking.openURL(webUrl);
    }
  }
}

export const googleMapsService = new GoogleMapsService();
