"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: number | null;
  error: string | null;
  permissionState: "prompt" | "granted" | "denied" | "unavailable";
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maxAge?: number;
  watch?: boolean;
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maxAge = 5000,
    watch = false,
  } = options;

  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    speed: null,
    heading: null,
    timestamp: null,
    error: null,
    permissionState: "prompt",
  });

  const watchIdRef = useRef<number | null>(null);
  const optionsRef = useRef({ enableHighAccuracy, timeout, maxAge });

  useEffect(() => {
    optionsRef.current = { enableHighAccuracy, timeout, maxAge };
  }, [enableHighAccuracy, timeout, maxAge]);

  const handleSuccess = useCallback((position: GeolocationPosition) => {
    setState({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      speed: position.coords.speed,
      heading: position.coords.heading,
      timestamp: position.timestamp,
      error: null,
      permissionState: "granted",
    });
  }, []);

  const handleError = useCallback((error: GeolocationPositionError) => {
    let errorMessage = "Unable to get your location";
    let permissionState: GeolocationState["permissionState"] = "prompt";

    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = "Location permission denied. Please enable location access in your browser settings.";
        permissionState = "denied";
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = "Location information is unavailable. Please check your device settings.";
        permissionState = "unavailable";
        break;
      case error.TIMEOUT:
        errorMessage = "Location request timed out. Please try again.";
        permissionState = "prompt";
        break;
    }

    setState((prev) => ({
      ...prev,
      error: errorMessage,
      permissionState,
    }));
  }, []);

  const requestPermission = useCallback(async () => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "Geolocation is not supported by your browser",
        permissionState: "unavailable",
      }));
      return;
    }

    // Check current permission state
    if ("permissions" in navigator) {
      try {
        const result = await navigator.permissions.query({ name: "geolocation" });
        if (result.state === "denied") {
          setState((prev) => ({
            ...prev,
            error: "Location permission denied. Please enable location access in your browser settings.",
            permissionState: "denied",
          }));
          return;
        }
      } catch {
        // permissions API not supported, continue with watchPosition
      }
    }

    // Start watching position
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    const id = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      optionsRef.current
    );
    watchIdRef.current = id;
  }, [handleSuccess, handleError]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "Geolocation is not supported by your browser",
        permissionState: "unavailable",
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      optionsRef.current
    );
  }, [handleSuccess, handleError]);

  // Auto-start watching if requested
  useEffect(() => {
    if (watch) {
      requestPermission();
    }
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
      }
    };
  }, [watch, requestPermission]);

  return {
    ...state,
    requestPermission,
    stopTracking,
    getCurrentPosition,
    isSupported: typeof navigator !== "undefined" && "geolocation" in navigator,
  };
}

/**
 * Calculate distance between two coordinates using Haversine formula.
 * Returns distance in meters.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
