
var quakesObservable = Rx.Observable
  .interval(5000)
  .flatMap(function () {
    return Rx.DOM.jsonpRequest({
      'jsonpCallback': 'eqfeed_callback',
      'url': URL
    });
  })
  .flatMap(function (result) {
    return Rx.Observable.from(result.response.features);
  })
  .distinct(function(quake) { 
    return quake.properties.code; 
  })
  .map(function (quake) {
    return {
      lat: quake.geometry.coordinates[1],
      lng: quake.geometry.coordinates[0],
      size: quake.properties.mag * 10000,
      title: quake.properties.title
    };
  });

quakesObservable.subscribe(
  function (point) {
    var c = L.circle([point.lat, point.lng], point.size);
    c.bindPopup(point.title);
    c.addTo(map);
  }
);