/* eslint-disable */

export const displayMap = (locations) => {
  mapboxgl.accessToken =
    'pk.eyJ1Ijoic2FoaXR5YTAwMiIsImEiOiJja29ja294ZmMwcjIyMnhvZGRlam44M29pIn0.BkS5HRErPkJiWp5dauuKBQ';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/sahitya002/ckocl259z083f18p7dnvts60x',
    scrollZoom: false,
    //   center: [-118.112491, 34.111745],
    //   zoom: 5,
    //   interactive: false
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    // Create marker
    const el = document.createElement('div');
    el.className = 'marker';

    // add marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // Add popup
    new mapboxgl.Popup({ offset: 30 })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);
    // Extend map bounds to include current location
    bounds.extend(loc.coordinates);

    // fit map to the bounds
    map.fitBounds(bounds, {
      padding: {
        top: 200,
        bottom: 150,
        left: 100,
        right: 100,
      },
    });
  });
};
