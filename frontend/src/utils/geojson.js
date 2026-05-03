export function isValidLineStringGeoJson(geometry) {
  if (!geometry || geometry.type !== "LineString" || !Array.isArray(geometry.coordinates)) return false;
  if (geometry.coordinates.length < 2) return false;
  return geometry.coordinates.every((coordinate) => {
    if (!Array.isArray(coordinate) || coordinate.length !== 2) return false;
    const [lon, lat] = coordinate;
    return Number.isFinite(Number(lon))
      && Number.isFinite(Number(lat))
      && Number(lon) >= -180
      && Number(lon) <= 180
      && Number(lat) >= -90
      && Number(lat) <= 90;
  });
}

export function geoJsonToLeafletLatLngs(geometry) {
  if (!isValidLineStringGeoJson(geometry)) return [];
  return geometry.coordinates.map(([lon, lat]) => [Number(lat), Number(lon)]);
}

export function leafletLatLngsToGeoJson(latlngs) {
  const coordinates = (latlngs || [])
    .map((item) => {
      const lat = Array.isArray(item) ? item[0] : item?.lat;
      const lon = Array.isArray(item) ? item[1] : item?.lng;
      return Number.isFinite(Number(lat)) && Number.isFinite(Number(lon)) ? [Number(lon), Number(lat)] : null;
    })
    .filter(Boolean);
  return coordinates.length > 1 ? { type: "LineString", coordinates } : null;
}

export function mergeSegmentGeometries(segments = []) {
  const coordinates = [];
  for (const segment of segments) {
    const geometry = segment?.geometry_geojson || segment;
    if (!isValidLineStringGeoJson(geometry)) continue;
    const next = geometry.coordinates;
    coordinates.push(...(coordinates.length ? next.slice(1) : next));
  }
  return coordinates.length > 1 ? { type: "LineString", coordinates } : null;
}

export function getGeoJsonBounds(geometry) {
  const latlngs = geoJsonToLeafletLatLngs(geometry);
  if (!latlngs.length) return null;
  return latlngs.reduce(
    (bounds, [lat, lon]) => ({
      south: Math.min(bounds.south, lat),
      west: Math.min(bounds.west, lon),
      north: Math.max(bounds.north, lat),
      east: Math.max(bounds.east, lon),
    }),
    { south: latlngs[0][0], west: latlngs[0][1], north: latlngs[0][0], east: latlngs[0][1] }
  );
}

export function normalizeOsrmGeometry(geometry) {
  if (!isValidLineStringGeoJson(geometry)) return null;
  return {
    type: "LineString",
    coordinates: geometry.coordinates.map(([lon, lat]) => [Number(lon), Number(lat)]),
  };
}
