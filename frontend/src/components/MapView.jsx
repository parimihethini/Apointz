import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

// Premium dynamic marker
const createCustomIcon = (isActive = false) => new L.Icon({
  iconUrl: isActive 
    ? "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png"
    : "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  shadowSize: [41, 41],
});

const MapAutoCenter = ({ center, zoom = 13 }) => {
  const map = useMap();
  useEffect(() => {
    if (center && map) map.setView(center, zoom);
  }, [center, map, zoom]);
  return null;
};

const MapView = ({ location, business, businesses = [], onSelectBusiness, activeBusinessId }) => {
  const [geocodeCoords, setGeocodeCoords] = useState(null);

  useEffect(() => {
    if (!location || typeof location !== 'string') {
      setGeocodeCoords(null);
      return;
    }
    const parts = location.split(',');
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      setGeocodeCoords([parseFloat(parts[0]), parseFloat(parts[1])]);
      return;
    }

    let isActive = true;
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`)
      .then(res => res.json())
      .then(data => {
        if (isActive && data?.[0]) setGeocodeCoords([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
      }).catch(() => {
        if (isActive) setGeocodeCoords([12.9716, 77.5946]);
      });
    return () => { isActive = false; };
  }, [location]);

  const defaultCenter = useMemo(() => {
    if (activeBusinessId) {
       const b = businesses.find(x => x.id === activeBusinessId);
       if (b?.latitude != null && b.longitude != null) return [b.latitude, b.longitude];
    }
    if (geocodeCoords) return geocodeCoords;
    const first = businesses.find(b => b.latitude != null && b.longitude != null);
    return first ? [first.latitude, first.longitude] : [12.9716, 77.5946];
  }, [businesses, geocodeCoords, activeBusinessId]);

  return (
    <MapContainer
      center={defaultCenter}
      zoom={activeBusinessId ? 15 : 13}
      scrollWheelZoom={true}
      style={{ height: "100%", width: "100%" }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <MapAutoCenter center={defaultCenter} zoom={activeBusinessId ? 15 : 13} />

      {businesses.filter(b => b.latitude != null && b.longitude != null).map(b => (
        <Marker
          key={b.id}
          position={[b.latitude, b.longitude]}
          icon={createCustomIcon(b.id === activeBusinessId)}
          eventHandlers={{ click: () => onSelectBusiness?.(b) }}
        >
          <Popup>
            <div className="map-popup-inner" style={{ padding: "8px", minWidth: "150px" }}>
              <h4 style={{ margin: "0 0 4px 0", color: "white", fontSize: "1rem" }}>{b.name}</h4>
              <p style={{ margin: "0 0 10px 0", fontSize: "0.8rem", color: "#94a3b8" }}>
                {b.category || "Service"} • {b.city}
              </p>
              <Link to={`/business/${b.id}`} className="btn-primary small full" style={{ display: "block", textAlign: "center", textDecoration: "none", fontSize: "0.75rem", padding: "8px" }}>
                Book Now
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MapView;
