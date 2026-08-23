"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Navigation,
  MapPin,
  Clock,
  Route,
  Gauge,
  CheckCircle,
  AlertTriangle,
  X,
  Loader2,
} from "lucide-react";
import { useGeolocation, calculateDistanceMeters } from "@/hooks/use-geolocation";
import { formatUGX } from "@/lib/utils";
import { toast } from "sonner";

interface InspectionTrackerProps {
  propertyId: string;
  propertyTitle: string;
  propertyLatitude?: number | null;
  propertyLongitude?: number | null;
  arrivalRadiusM?: number;
}

interface InspectionSession {
  id: string;
  status: string;
  startedAt: string;
  arrivedAt?: string | null;
  totalDistanceM: number;
  maxSpeedKmh?: number | null;
  avgSpeedKmh?: number | null;
  durationS?: number | null;
}

export default function InspectionTracker({
  propertyId,
  propertyTitle,
  propertyLatitude,
  propertyLongitude,
  arrivalRadiusM = 50,
}: InspectionTrackerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState<InspectionSession | null>(null);
  const [tracking, setTracking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);

  const geo = useGeolocation({
    enableHighAccuracy: true,
    timeout: 10000,
    maxAge: 3000,
  });

  // Timer for elapsed time
  useEffect(() => {
    if (!tracking || !session) return;

    const interval = setInterval(() => {
      const start = new Date(session.startedAt).getTime();
      const now = Date.now();
      setElapsedTime(Math.floor((now - start) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [tracking, session]);

  // Record waypoints when position changes
  useEffect(() => {
    if (!tracking || !session || !geo.latitude || !geo.longitude) return;

    const recordWaypoint = async () => {
      try {
        const res = await fetch(`/api/inspections/${session.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude: geo.latitude,
            longitude: geo.longitude,
            accuracyM: geo.accuracy,
            speedMps: geo.speed,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.arrived && !arrived) {
            setArrived(true);
            toast.success("You've arrived at the property! 🎉");
          }

          if (data.waypoint?.distanceFromPrevM) {
            setTotalDistance((prev) => prev + data.waypoint.distanceFromPrevM);
          }

          if (geo.speed) {
            const speedKmh = geo.speed * 3.6;
            setMaxSpeed((prev) => Math.max(prev, speedKmh));
          }
        }
      } catch (error) {
        console.error("Failed to record waypoint:", error);
      }
    };

    // Debounce waypoint recording
    const timeout = setTimeout(recordWaypoint, 3000);
    return () => clearTimeout(timeout);
  }, [geo.latitude, geo.longitude, tracking, session, arrived]);

  // Check arrival on position update
  useEffect(() => {
    if (!tracking || arrived || !propertyLatitude || !propertyLongitude) return;
    if (!geo.latitude || !geo.longitude) return;

    const distance = calculateDistanceMeters(
      geo.latitude,
      geo.longitude,
      propertyLatitude,
      propertyLongitude
    );

    if (distance <= arrivalRadiusM) {
      setArrived(true);
      toast.success("You've arrived at the property! 🎉");
    }
  }, [geo.latitude, geo.longitude, propertyLatitude, propertyLongitude, arrivalRadiusM, tracking, arrived]);

  const startInspection = async () => {
    setLoading(true);
    try {
      // Request location permission
      geo.requestPermission();

      if (geo.permissionState === "denied") {
        toast.error("Location permission is required for inspection tracking");
        setLoading(false);
        return;
      }

      // Create inspection session
      const res = await fetch("/api/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start inspection");
      }

      const data = await res.json();
      setSession(data.session);
      setTracking(true);
      setArrived(false);
      setTotalDistance(0);
      setMaxSpeed(0);
      toast.success("Inspection tracking started");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start inspection");
    } finally {
      setLoading(false);
    }
  };

  const stopInspection = async (action: "complete" | "cancel" = "complete") => {
    if (!session) return;

    try {
      const res = await fetch(`/api/inspections/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        setTracking(false);
        geo.stopTracking();
        toast.success(action === "complete" ? "Inspection completed" : "Inspection cancelled");
      }
    } catch (error) {
      toast.error("Failed to stop inspection");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  return (
    <>
      {/* Floating action button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg transition-all hover:bg-brand-600 hover:shadow-xl md:bottom-8"
        aria-label="Start inspection"
      >
        <Navigation className="h-6 w-6" />
      </button>

      {/* Tracker panel */}
      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 z-50 md:bottom-8 md:right-4 md:left-auto md:w-96">
          <div className="rounded-t-2xl bg-white shadow-2xl md:rounded-2xl md:border md:border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div>
                <h3 className="font-semibold text-gray-900">Inspection Tracker</h3>
                <p className="text-xs text-gray-500 truncate">{propertyTitle}</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Permission state */}
              {geo.permissionState === "denied" && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-red-600" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Location Access Required</p>
                      <p className="mt-1 text-xs text-red-600">
                        Please enable location access in your browser settings to use inspection tracking.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Property location info */}
              {propertyLatitude && propertyLongitude && (
                <div className="mb-4 rounded-lg bg-gray-50 p-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>Property location: {propertyLatitude.toFixed(4)}, {propertyLongitude.toFixed(4)}</span>
                  </div>
                  {tracking && geo.latitude && geo.longitude && (
                    <div className="mt-2 text-xs text-gray-500">
                      Distance: {formatDistance(
                        calculateDistanceMeters(
                          geo.latitude,
                          geo.longitude,
                          propertyLatitude,
                          propertyLongitude
                        )
                      )}
                      {arrived && (
                        <span className="ml-2 text-green-600 font-medium">✓ Arrived</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Not started */}
              {!tracking && !session && (
                <div className="text-center">
                  <Navigation className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-3 text-sm text-gray-600">
                    Start inspection to navigate to the property and track your visit.
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Your location will be used to calculate distance and detect arrival (50m radius).
                  </p>
                  <button
                    onClick={() => void startInspection()}
                    disabled={loading || geo.permissionState === "denied"}
                    className="btn-primary mt-4 w-full"
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Navigation className="mr-2 h-4 w-4" />
                    )}
                    Start Inspection
                  </button>
                </div>
              )}

              {/* Tracking */}
              {tracking && (
                <div className="space-y-4">
                  {/* Status */}
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${arrived ? "bg-green-500" : "animate-pulse bg-brand-500"}`} />
                    <span className="text-sm font-medium text-gray-900">
                      {arrived ? "Arrived at property" : "Navigating to property"}
                    </span>
                  </div>

                  {/* Current location */}
                  {geo.latitude && geo.longitude && (
                    <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
                      Your location: {geo.latitude.toFixed(4)}, {geo.longitude.toFixed(4)}
                      {geo.accuracy && ` (±${Math.round(geo.accuracy)}m)`}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-gray-50 p-3 text-center">
                      <Clock className="mx-auto h-4 w-4 text-gray-400" />
                      <p className="mt-1 text-lg font-bold text-gray-900">{formatTime(elapsedTime)}</p>
                      <p className="text-xs text-gray-500">Duration</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3 text-center">
                      <Route className="mx-auto h-4 w-4 text-gray-400" />
                      <p className="mt-1 text-lg font-bold text-gray-900">{formatDistance(totalDistance)}</p>
                      <p className="text-xs text-gray-500">Distance</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3 text-center">
                      <Gauge className="mx-auto h-4 w-4 text-gray-400" />
                      <p className="mt-1 text-lg font-bold text-gray-900">{Math.round(maxSpeed)}</p>
                      <p className="text-xs text-gray-500">km/h max</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => void stopInspection("cancel")}
                      className="btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => void stopInspection("complete")}
                      className="btn-primary flex-1"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Complete
                    </button>
                  </div>
                </div>
              )}

              {/* Completed session */}
              {!tracking && session && session.status !== "ACTIVE" && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-green-50 p-3 text-center">
                    <CheckCircle className="mx-auto h-8 w-8 text-green-500" />
                    <p className="mt-2 text-sm font-medium text-green-800">
                      Inspection {session.status === "COMPLETED" ? "Completed" : "Cancelled"}
                    </p>
                  </div>

                  {session.status === "COMPLETED" && (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg bg-gray-50 p-3 text-center">
                        <p className="text-lg font-bold text-gray-900">
                          {session.durationS ? formatTime(session.durationS) : "—"}
                        </p>
                        <p className="text-xs text-gray-500">Duration</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3 text-center">
                        <p className="text-lg font-bold text-gray-900">
                          {formatDistance(session.totalDistanceM)}
                        </p>
                        <p className="text-xs text-gray-500">Distance</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3 text-center">
                        <p className="text-lg font-bold text-gray-900">
                          {session.maxSpeedKmh ? Math.round(session.maxSpeedKmh) : "—"}
                        </p>
                        <p className="text-xs text-gray-500">km/h max</p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setSession(null);
                      setArrived(false);
                      setElapsedTime(0);
                      setTotalDistance(0);
                      setMaxSpeed(0);
                    }}
                    className="btn-primary w-full"
                  >
                    Start New Inspection
                  </button>
                </div>
              )}

              {/* Disclaimer */}
              <p className="mt-4 text-center text-[10px] text-gray-400">
                Approximate location / navigation assistance only.
                Not a security-grade verification mechanism.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
