import * as Location from 'expo-location';
import type { ApproximateLocation } from '@/shared/models';

const MAX_LOCATION_OFFSET_METERS = 500;
const METERS_PER_DEGREE_LATITUDE = 111_320;

/** Gets the device location and offsets it by a random distance of at most 500 m. */
export async function getApproximateCurrentLocation(): Promise<ApproximateLocation> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('Allow location access to share your approximate location.');
  }

  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const latitude = position.coords.latitude;
  const longitude = position.coords.longitude;
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.sqrt(Math.random()) * MAX_LOCATION_OFFSET_METERS;
  const northMeters = Math.sin(angle) * distance;
  const eastMeters = Math.cos(angle) * distance;
  const longitudeScale = METERS_PER_DEGREE_LATITUDE * Math.max(0.01, Math.cos((latitude * Math.PI) / 180));

  return {
    label: 'Approximate nearby area',
    latitude: latitude + northMeters / METERS_PER_DEGREE_LATITUDE,
    longitude: longitude + eastMeters / longitudeScale,
    precision: 'neighborhood',
  };
}
