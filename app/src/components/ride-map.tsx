"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import { setWorkerUrl } from "maplibre-gl"
import Map, { Layer, Marker, NavigationControl, Source, type MapRef } from "react-map-gl/maplibre"

import type { RideSample } from "@/lib/cda-analysis"
import {
  geographicBounds,
  gpsSamples,
  routeGeoJson,
  routePointGeoJson,
  type GpsRideSample,
} from "@/lib/ride-map"

const OPEN_FREE_MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty"

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs")

type RideMapProps = {
  samples: RideSample[]
  hoverSample: GpsRideSample | null
}

export function RideMap({ samples, hoverSample }: RideMapProps) {
  const mapRef = useRef<MapRef>(null)
  const positions = useMemo(() => gpsSamples(samples), [samples])
  const route = useMemo(() => routeGeoJson(samples), [samples])
  const singlePoint = positions.length === 1 ? routePointGeoJson(positions[0]) : null
  const bounds = useMemo(() => geographicBounds(positions), [positions])

  const fitRoute = useCallback(() => {
    const map = mapRef.current
    if (!map || positions.length === 0) return

    if (positions.length === 1) {
      map.jumpTo({ center: [positions[0].longitudeDegrees, positions[0].latitudeDegrees], zoom: 13 })
      return
    }

    if (bounds) map.fitBounds(bounds, { padding: 36, duration: 0, maxZoom: 15 })
  }, [bounds, positions])

  useEffect(() => {
    fitRoute()
  }, [fitRoute])

  if (positions.length === 0) return null

  return (
    <div className="h-72 w-full overflow-hidden rounded-lg border" aria-label="Ride route map">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: positions[0].longitudeDegrees,
          latitude: positions[0].latitudeDegrees,
          zoom: positions.length === 1 ? 13 : 9,
        }}
        mapStyle={OPEN_FREE_MAP_STYLE}
        attributionControl={{}}
        onLoad={fitRoute}
      >
        <NavigationControl position="top-right" showCompass={false} />
        {route && (
          <Source id="ride-route" type="geojson" data={route}>
            <Layer
              id="ride-route-outline"
              type="line"
              paint={{ "line-color": "#ffffff", "line-width": 6, "line-opacity": 0.9 }}
            />
            <Layer
              id="ride-route-line"
              type="line"
              paint={{ "line-color": "#4338ca", "line-width": 3.5 }}
            />
          </Source>
        )}
        {singlePoint && (
          <Source id="ride-point" type="geojson" data={singlePoint}>
            <Layer
              id="ride-point-dot"
              type="circle"
              paint={{ "circle-color": "#4338ca", "circle-radius": 6, "circle-stroke-color": "#ffffff", "circle-stroke-width": 3 }}
            />
          </Source>
        )}
        {hoverSample && (
          <Marker longitude={hoverSample.longitudeDegrees} latitude={hoverSample.latitudeDegrees} anchor="center">
            <span
              data-testid="ride-hover-marker"
              className="block size-4 rounded-full border-[3px] border-white bg-rose-600 shadow-[0_1px_4px_rgba(0,0,0,0.75)]"
              aria-hidden="true"
            />
          </Marker>
        )}
      </Map>
    </div>
  )
}
