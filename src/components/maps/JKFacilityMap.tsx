'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { FacilitySummaryDTO } from '@/lib/types';
import { JK_MAP_CONFIG } from '@/lib/constants';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  MapPin,
  Plus,
  Minus,
  RotateCcw,
  Navigation,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  X,
} from 'lucide-react';

interface JKFacilityMapProps {
  facilities: FacilitySummaryDTO[];
  userLocation?: { lat: number; lng: number } | null;
  selectedFacilityId?: string | null;
  onSelectFacility?: (facility: FacilitySummaryDTO) => void;
  defaultCenter?: { lat: number; lng: number };
  defaultZoom?: number;
  heightClassName?: string;
}

const TILE_SIZE = 256;

function lonToWorldX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * TILE_SIZE * Math.pow(2, zoom);
}

function latToWorldY(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  const n = Math.log(Math.tan(Math.PI / 4 + rad / 2));
  return ((1 - n / Math.PI) / 2) * TILE_SIZE * Math.pow(2, zoom);
}

export const JKFacilityMap: React.FC<JKFacilityMapProps> = ({
  facilities,
  userLocation = null,
  selectedFacilityId = null,
  onSelectFacility,
  defaultCenter,
  defaultZoom,
  heightClassName = 'h-[360px] sm:h-[420px]',
}) => {
  const mappedFacilities = useMemo(
    () =>
      facilities.filter(
        (f): f is FacilitySummaryDTO & { latitude: number; longitude: number } =>
          f.latitude !== null &&
          f.longitude !== null &&
          Number.isFinite(f.latitude) &&
          Number.isFinite(f.longitude)
      ),
    [facilities]
  );

  const initialCenterLat = defaultCenter?.lat ?? JK_MAP_CONFIG.centerLat;
  const initialCenterLng = defaultCenter?.lng ?? JK_MAP_CONFIG.centerLng;
  const initialZoom = defaultZoom ?? JK_MAP_CONFIG.defaultZoom;

  const [zoom, setZoom] = useState<number>(initialZoom);
  const [center, setCenter] = useState<{ lat: number; lng: number }>({
    lat: initialCenterLat,
    lng: initialCenterLng,
  });
  const [activeId, setActiveId] = useState<string | null>(selectedFacilityId);

  const effectiveCenter = useMemo(() => {
    if (defaultCenter) return center;
    if (mappedFacilities.length === 1 && center.lat === initialCenterLat && center.lng === initialCenterLng) {
      return {
        lat: mappedFacilities[0].latitude,
        lng: mappedFacilities[0].longitude,
      };
    }
    return center;
  }, [defaultCenter, center, mappedFacilities, initialCenterLat, initialCenterLng]);

  const effectiveZoom = useMemo(() => {
    if (defaultZoom !== undefined) return zoom;
    if (mappedFacilities.length === 1 && zoom === initialZoom && center.lat === initialCenterLat) {
      return 12;
    }
    return zoom;
  }, [defaultZoom, zoom, mappedFacilities.length, initialZoom, center.lat, initialCenterLat]);

  // Fixed viewport virtual pixel box centered on effectiveCenter
  const VIEW_W = 860;
  const VIEW_H = 420;
  const centerWorldX = lonToWorldX(effectiveCenter.lng, effectiveZoom);
  const centerWorldY = latToWorldY(effectiveCenter.lat, effectiveZoom);

  const leftWorldX = centerWorldX - VIEW_W / 2;
  const topWorldY = centerWorldY - VIEW_H / 2;

  const tiles = useMemo(() => {
    const maxTileIndex = Math.pow(2, effectiveZoom) - 1;
    const minTileX = Math.max(0, Math.floor(leftWorldX / TILE_SIZE));
    const maxTileX = Math.min(maxTileIndex, Math.floor((leftWorldX + VIEW_W) / TILE_SIZE));
    const minTileY = Math.max(0, Math.floor(topWorldY / TILE_SIZE));
    const maxTileY = Math.min(maxTileIndex, Math.floor((topWorldY + VIEW_H) / TILE_SIZE));

    const result: Array<{ x: number; y: number; leftPct: number; topPct: number; wPct: number; hPct: number }> = [];
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        const px = tx * TILE_SIZE - leftWorldX;
        const py = ty * TILE_SIZE - topWorldY;
        result.push({
          x: tx,
          y: ty,
          leftPct: (px / VIEW_W) * 100,
          topPct: (py / VIEW_H) * 100,
          wPct: (TILE_SIZE / VIEW_W) * 100,
          hPct: (TILE_SIZE / VIEW_H) * 100,
        });
      }
    }
    return result;
  }, [effectiveZoom, leftWorldX, topWorldY]);

  const projectPoint = (lat: number, lng: number) => {
    const wx = lonToWorldX(lng, effectiveZoom);
    const wy = latToWorldY(lat, effectiveZoom);
    const xPct = ((wx - leftWorldX) / VIEW_W) * 100;
    const yPct = ((wy - topWorldY) / VIEW_H) * 100;
    return { xPct, yPct };
  };

  const activeFacility =
    mappedFacilities.find((f) => f.id === (selectedFacilityId ?? activeId)) || null;
  const unmappedCount = facilities.length - mappedFacilities.length;

  const handleReset = () => {
    setCenter({ lat: initialCenterLat, lng: initialCenterLng });
    setZoom(initialZoom);
    setActiveId(null);
  };

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
      data-testid="jk-facility-map"
      data-center-lat={effectiveCenter.lat.toFixed(4)}
      data-center-lng={effectiveCenter.lng.toFixed(4)}
      data-zoom={effectiveZoom}
    >
      {/* Map Header Bar */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <MapPin className="h-4 w-4 text-brand-600 shrink-0" />
          <span className="font-bold text-slate-900">
            Jammu &amp; Kashmir Interactive Facility Map
          </span>
          <Badge variant="brand" className="text-[10px]">
            {mappedFacilities.length} Mapped Marker{mappedFacilities.length === 1 ? '' : 's'}
          </Badge>
          {unmappedCount > 0 && (
            <span className="text-[11px] text-slate-500">
              ({unmappedCount} without verified coordinates excluded)
            </span>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] text-slate-600 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-amber-200" />
            Community-Sourced (OSM · Not Gov Verified)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-200" />
            Gov GIS Verified
          </span>
          {userLocation && (
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-blue-200" />
              Your Location
            </span>
          )}
        </div>
      </div>

      {/* Interactive Map Canvas */}
      <div
        className={`relative w-full ${heightClassName} bg-gradient-to-br from-sky-50 via-slate-100 to-emerald-50/60 overflow-hidden select-none`}
      >
        {/* Subtle Reference Grid Backdrop (visible if OSM tiles are blocked offline) */}
        <div
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* OpenStreetMap Slippy Tiles */}
        <div className="absolute inset-0 pointer-events-none">
          {tiles.map((t) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${effectiveZoom}-${t.x}-${t.y}`}
              src={`https://tile.openstreetmap.org/${effectiveZoom}/${t.x}/${t.y}.png`}
              alt=""
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
              style={{
                position: 'absolute',
                left: `${t.leftPct}%`,
                top: `${t.topPct}%`,
                width: `${t.wPct}%`,
                height: `${t.hPct}%`,
              }}
              className="object-cover"
            />
          ))}
        </div>

        {/* User Location Pin (only rendered when GPS permission granted) */}
        {userLocation && (() => {
          const pos = projectPoint(userLocation.lat, userLocation.lng);
          if (pos.xPct < -5 || pos.xPct > 105 || pos.yPct < -5 || pos.yPct > 105) return null;
          return (
            <div
              style={{ left: `${pos.xPct}%`, top: `${pos.yPct}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
              title={`Your location (${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)})`}
            >
              <span className="absolute inline-flex h-7 w-7 -inset-1.5 rounded-full bg-blue-400 opacity-50 animate-ping" />
              <span className="relative flex h-4 w-4 rounded-full bg-blue-600 border-2 border-white shadow-lg" />
            </div>
          );
        })()}

        {/* Database Facility Markers */}
        {mappedFacilities.map((facility) => {
          const pos = projectPoint(facility.latitude, facility.longitude);
          if (pos.xPct < -5 || pos.xPct > 105 || pos.yPct < -5 || pos.yPct > 105) return null;
          const isGovVerified = facility.verification.governmentGisVerified;
          const isSelected = activeFacility?.id === facility.id;

          return (
            <button
              key={facility.id}
              type="button"
              data-testid={`map-marker-${facility.id}`}
              onClick={() => {
                setActiveId(facility.id);
                setCenter({ lat: facility.latitude, lng: facility.longitude });
                onSelectFacility?.(facility);
              }}
              style={{ left: `${pos.xPct}%`, top: `${pos.yPct}%` }}
              className={`absolute -translate-x-1/2 -translate-y-full z-20 group focus:outline-none transition-transform ${
                isSelected ? 'scale-125 z-30' : 'hover:scale-110'
              }`}
              title={`${facility.name} (${facility.district})`}
            >
              <div
                className={`px-2 py-1 rounded-full shadow-lg border-2 border-white flex items-center gap-1 text-[10px] font-bold text-white whitespace-nowrap ${
                  isGovVerified
                    ? 'bg-emerald-600'
                    : isSelected
                    ? 'bg-slate-900'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="max-w-[110px] truncate">{facility.city || facility.district}</span>
              </div>
              <div
                className={`mx-auto w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent ${
                  isGovVerified ? 'border-t-emerald-600' : isSelected ? 'border-t-slate-900' : 'border-t-amber-600'
                }`}
              />
            </button>
          );
        })}

        {/* Map Controls */}
        <div className="absolute top-3 right-3 z-30 flex flex-col gap-1.5">
          <button
            type="button"
            aria-label="Zoom in map"
            onClick={() => setZoom((z) => Math.min(15, z + 1))}
            className="h-8 w-8 rounded-lg bg-white/95 border border-slate-300 shadow flex items-center justify-center text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Zoom out map"
            onClick={() => setZoom((z) => Math.max(7, z - 1))}
            className="h-8 w-8 rounded-lg bg-white/95 border border-slate-300 shadow flex items-center justify-center text-slate-700 hover:bg-slate-50"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Reset map to Jammu & Kashmir"
            title="Reset view to Jammu & Kashmir"
            onClick={handleReset}
            className="h-8 w-8 rounded-lg bg-white/95 border border-slate-300 shadow flex items-center justify-center text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Center Badge */}
        <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur border border-slate-200 text-[10px] font-mono text-slate-700 shadow-sm">
          J&amp;K Center: {effectiveCenter.lat.toFixed(2)}°N, {effectiveCenter.lng.toFixed(2)}°E · z{effectiveZoom}
        </div>

        {/* Selected Facility Info Overlay Card */}
        {activeFacility && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-96 z-30 bg-white/95 backdrop-blur rounded-xl border border-slate-200 shadow-xl p-3.5 text-xs space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="brand" className="text-[10px]">
                    {activeFacility.facilityType}
                  </Badge>
                  {activeFacility.distanceKm !== undefined && activeFacility.distanceKm !== null && (
                    <Badge variant="available" className="text-[10px] gap-1">
                      <Navigation className="h-2.5 w-2.5" />
                      {activeFacility.distanceKm} km away
                    </Badge>
                  )}
                </div>
                <p className="font-bold text-slate-900 mt-1 leading-snug">{activeFacility.name}</p>
                <p className="text-[11px] text-slate-500">
                  District {activeFacility.district} · {activeFacility.division} Division
                </p>
              </div>
              <button
                type="button"
                aria-label="Close marker details"
                onClick={() => setActiveId(null)}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="text-[11px] flex items-center gap-1.5">
              {activeFacility.verification.governmentGisVerified ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Government GIS Verified Coordinates
                </span>
              ) : (
                <span className="text-amber-800 font-semibold flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Community-Sourced Coordinates (OSM · Not Gov Verified)
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="font-mono text-[10px] text-slate-500">
                {activeFacility.latitude.toFixed(5)}, {activeFacility.longitude.toFixed(5)}
              </span>
              <div className="flex items-center gap-2">
                {activeFacility.mapLinks && (
                  <a
                    href={activeFacility.mapLinks.openStreetMapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-semibold text-amber-800 hover:underline inline-flex items-center gap-1"
                  >
                    OSM <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <Link href={`/facilities/${activeFacility.id}`}>
                  <Button size="sm" variant="default" className="h-7 px-2.5 text-[11px] gap-1">
                    Details <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Attribution */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <span>
          Map tiles &copy; OpenStreetMap contributors (ODbL) · Markers reflect exact recorded PostgreSQL coordinates.
        </span>
        <span>
          Jammu and Kashmir, India
        </span>
      </div>
    </div>
  );
};
