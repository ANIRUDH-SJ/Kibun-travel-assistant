'use client';
import Map, { Marker, MapRef } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useStore } from '@/store/useStore';
import { MapPin } from 'lucide-react';
import { useRef, useEffect } from 'react';

export default function MapView() {
  const { mapLocation, language } = useStore();
  const mapRef = useRef<MapRef>(null);

  // Sync map movement
  useEffect(() => {
    if (mapLocation && mapRef.current) {
      const map = mapRef.current.getMap();
      map.flyTo({
        center: [mapLocation.lon, mapLocation.lat],
        zoom: 12,
        duration: 1000
      });
    }
  }, [mapLocation]);

  // Logic to switch Map Labels between English and Japanese
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const updateLanguage = () => {
      const style = map.getStyle();
      if (!style || !style.layers) return;

      const langField = language === 'en' ? 'name_en' : 'name_ja';

      style.layers.forEach((layer: any) => {
        if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
          // Attempt to update text-field property
          try {
            map.setLayoutProperty(layer.id, 'text-field', [
              'coalesce',
              ['get', langField],
              ['get', 'name'] // fallback
            ]);
          } catch (e) {
            // Ignore layers that don't support this
          }
        }
      });
    };

    if (map.isStyleLoaded()) {
      updateLanguage();
    } else {
      map.on('style.load', updateLanguage);
    }
    
    // Cleanup listener
    return () => {
        map.off('style.load', updateLanguage);
    }
  }, [language]);

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-gray-200">
      <Map
        ref={mapRef}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={{
          longitude: 139.6503,
          latitude: 35.6762,
          zoom: 10
        }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        worldview="JP" 
      >
        {mapLocation && (
          <Marker longitude={mapLocation.lon} latitude={mapLocation.lat} anchor="bottom">
            <MapPin className="text-red-500 w-8 h-8 fill-current" />
          </Marker>
        )}
      </Map>
    </div>
  );
}
