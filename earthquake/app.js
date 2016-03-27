
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
  });

quakesObservable
  .map(function (quake) {
    return {
      lat: quake.geometry.coordinates[1],
      lng: quake.geometry.coordinates[0],
      size: quake.properties.mag * 10000,
      title: quake.properties.title
    };
  })
  .subscribe(function (point) {
      var c = L.circle([point.lat, point.lng], point.size);
      c.bindPopup(point.title);
      c.addTo(map);
  });

var todayDate = (new Date()).getDate();
var qsCounter = document.getElementById('qsCounter');
quakesObservable
  .scan(function (acc, x, i, source) {
    var date = new Date(x.properties.time);
    if (date.getDate() === todayDate) {
      return ++acc;
    }
  }, 0)
  .subscribe(
  function (next) {
    if (next) { qsCounter.innerText = next; }
  });