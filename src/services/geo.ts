// Ogasela.Api/Controllers/Geo/GeoController.cs - one function per route, in the same order they're declared there.
import { api } from "../lib/apiClient";
import type { NigeriaCity, NigeriaState } from "../types/api";

export function getStates(): Promise<NigeriaState[]> {
  return api.get<NigeriaState[]>("/geo/states");
}

export function getState(stateId: string): Promise<NigeriaState> {
  return api.get<NigeriaState>(`/geo/states/${stateId}`);
}

export function getCitiesByState(stateId: string): Promise<NigeriaCity[]> {
  return api.get<NigeriaCity[]>(`/geo/states/${stateId}/cities`);
}

export function getNearestCity(latitude: number, longitude: number): Promise<{ state: NigeriaState; city: NigeriaCity; distanceKm: number }> {
  return api.get(`/geo/cities/nearest?latitude=${latitude}&longitude=${longitude}`);
}

export function getCity(cityId: string): Promise<NigeriaCity> {
  return api.get<NigeriaCity>(`/geo/cities/${cityId}`);
}

export function createState(name: string, code: string): Promise<NigeriaState> {
  return api.post<NigeriaState>("/geo/states", { name, code });
}

export function updateState(id: string, name: string, code: string): Promise<NigeriaState> {
  return api.put<NigeriaState>(`/geo/states/${id}`, { name, code });
}

export function deleteState(id: string): Promise<void> {
  return api.del<void>(`/geo/states/${id}`);
}

/** Where a city is - both or neither. Used by the apps' "use my current location". */
export type CityCoordinates = { latitude: number | null; longitude: number | null };

export function createCity(stateId: string, name: string, coords: CityCoordinates): Promise<NigeriaCity> {
  return api.post<NigeriaCity>("/geo/cities", { stateId, name, ...coords });
}

/** Always send the coordinates: leaving them out clears them. */
export function updateCity(id: string, name: string, coords: CityCoordinates): Promise<NigeriaCity> {
  return api.put<NigeriaCity>(`/geo/cities/${id}`, { name, ...coords });
}

export function deleteCity(id: string): Promise<void> {
  return api.del<void>(`/geo/cities/${id}`);
}
