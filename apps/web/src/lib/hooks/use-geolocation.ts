'use client';

import { useState } from 'react';

export interface GeoState {
  lat: number;
  lng: number;
  accuracy: number;
}

export interface GeoError {
  message: string;
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_SUPPORTED';
}

export function useGeolocation() {
  const [coords, setCoords] = useState<GeoState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GeoError | null>(null);

  function getCurrentPosition(): Promise<GeoState> {
    setLoading(true);
    setError(null);
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        const err: GeoError = { message: 'Geolocation tidak didukung', code: 'NOT_SUPPORTED' };
        setError(err);
        setLoading(false);
        reject(err);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          setCoords(c);
          setLoading(false);
          resolve(c);
        },
        (err) => {
          const e: GeoError = {
            message: err.message,
            code:
              err.code === 1
                ? 'PERMISSION_DENIED'
                : err.code === 2
                ? 'POSITION_UNAVAILABLE'
                : err.code === 3
                ? 'TIMEOUT'
                : 'NOT_SUPPORTED',
          };
          setError(e);
          setLoading(false);
          reject(e);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    });
  }

  return { coords, loading, error, getCurrentPosition };
}

const OFFICE_LAT = Number(process.env.NEXT_PUBLIC_OFFICE_LAT ?? -6.2088);
const OFFICE_LNG = Number(process.env.NEXT_PUBLIC_OFFICE_LNG ?? 106.8456);
const OFFICE_RADIUS = Number(process.env.NEXT_PUBLIC_OFFICE_RADIUS_METERS ?? 100);

function haversineDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function getOfficeCoords() {
  return { lat: OFFICE_LAT, lng: OFFICE_LNG };
}

export function distanceFromOffice(c: { lat: number; lng: number }): number {
  return haversineDistance({ lat: OFFICE_LAT, lng: OFFICE_LNG }, c);
}

export function isWithinOfficeRadius(c: { lat: number; lng: number }): boolean {
  return distanceFromOffice(c) <= OFFICE_RADIUS;
}

export function getOfficeRadius() {
  return OFFICE_RADIUS;
}
