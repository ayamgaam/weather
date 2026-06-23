export interface Station {
  id: string;
  city: string;
  airport: string;
  iata: string;
  lat: number;
  lon: number;
}

// Fixed airport stations. Coordinates per the project brief; each was sanity-checked
// against Open-Meteo's forecast response (returned grid cell / elevation matches the
// airport location). Open-Meteo snaps to the nearest ~1-11 km grid cell.
export const STATIONS: Station[] = [
  { id: "london",  city: "London",  airport: "London City Airport",     iata: "LCY", lat: 51.5048, lon: 0.0495 },
  { id: "seoul",   city: "Seoul",   airport: "Incheon Int'l Airport",   iata: "ICN", lat: 37.4602, lon: 126.4407 },
  { id: "beijing", city: "Beijing", airport: "Beijing Capital Int'l",   iata: "PEK", lat: 40.0801, lon: 116.5846 },
  { id: "taipei",  city: "Taipei",  airport: "Taipei Songshan Airport", iata: "TSA", lat: 25.0697, lon: 121.5520 },
  { id: "paris",   city: "Paris",   airport: "Paris-Le Bourget Airport", iata: "LBG", lat: 48.9694, lon: 2.4414 },
];
