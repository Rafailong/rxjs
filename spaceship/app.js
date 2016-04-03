var canvas = document.createElement('canvas');
var ctx = canvas.getContext('2d');
document.body.appendChild(canvas);
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var velocida = 40;
var numeroDeEstrellitas = 300;
var estrellasStream = Rx.Observable.range(1, numeroDeEstrellitas)
  .map(function () {
    return {
      'x': parseInt(Math.random() * canvas.width),
      'y': parseInt(Math.random() * canvas.height),
      'size': Math.random() * 3 + 1
    };
  })
  .toArray()
  .selectMany(function (stars) {
    return Rx.Observable.interval(velocida)
      .map(function () {
        stars.forEach(function (star) {
          if (star.y >= canvas.height) {
            star.y = 0;
          }
          
          star.y += 3;
        });
        return stars;
      });
  });

// perron!!
var perronY = canvas.height - 30;
var perronMoves = Rx.Observable.fromEvent(canvas, 'mousemove');
var perron = perronMoves
  .map(function (move) {
    return {
      'x': move.clientX,
      'y': perronY
    };
  })
  .startWith({ 'x': canvas.width / 2, 'y': perronY });
var disparosDelPerron = Rx.Observable.combineLatest(
    Rx.Observable.fromEvent(canvas, 'click').sample(200).timestamp(),
    perron,
    function (disparo, perron) {
      return { 'x': perron.x, 'timestamp': disparo.timestamp, };
    }
  )
  .distinctUntilChanged(function(shot) { return shot.timestamp; })
  .scan(function (acc, disparo) {
    acc.push({
      'x': disparo.x, 'y': perronY
    });
    return acc;
  }, []);
  
// hijosDelCocho
var tanto = 1500;
var hijosDelCocho = Rx.Observable.interval(tanto)
  .scan(function (acc) {
    var hijoDelCocho  = {
      'x': parseInt(Math.random() * canvas.width),
      'y': -30,
      'disparos': []
    };
    Rx.Observable.interval(750).subscribe(
      function onNext () {
        if (!hijoDelCocho.isDead) {
          hijoDelCocho.disparos.push({ 'x': hijoDelCocho.x, 'y': hijoDelCocho.y });
        }
        hijoDelCocho.disparos = hijoDelCocho.disparos.filter(isVisible);
      }
    );
    acc.push(hijoDelCocho);
    return acc
      .filter(isVisible)
      .filter(function(enemy) {
        return !(enemy.isDead && enemy.disparos.length === 0);
      });
  }, []);

// puntotes
var puntotesSub = new Rx.Subject();
var puntotes = puntotesSub
  .scan(function (acc, val) {
    return acc + val;
  }, 0)
  .startWith(Rx.Observable.return(0));
  
// =]
var GAME = Rx.Observable.combineLatest(
    estrellasStream, perron, hijosDelCocho, disparosDelPerron, puntotes,
    function (estrellas, perron, enemies, disparosDelPerron, puntos) {
      return {
        'estrellas': estrellas, 'perron': perron, 'enemies': enemies,
        'disparosDelPerron': disparosDelPerron, 'puntos': puntos
      };
  })
  .sample(velocida)
  .takeWhile(function (cochos) {
    return gameOver(cochos.perron, cochos.enemies) === false;
  })
  .subscribe(render);
  
function render(cochos) {
  pintaLasCochasEstrellas(cochos.estrellas);
  paintSpaceShip(cochos.perron.x, cochos.perron.y);
  paintEnemies(cochos.enemies);
  paintHeroShots(cochos.disparosDelPerron, cochos.enemies);
  paintScore(cochos.puntos);
}

function paintHeroShots(heroShots, enemies) {
  heroShots.forEach(function(shot, i) {
    for (var l=0; l<enemies.length; l++) {
      var enemy = enemies[l];
      if (!enemy.isDead && collision(shot, enemy)) {
        puntotesSub.onNext(1);
        enemy.isDead = true;
        shot.x = shot.y = -100;
        break;
      }
    }
    
    shot.y -= 15;
    drawTriangle(shot.x, shot.y, 5, '#ffff00', 'up');
  });
}

function pintaLasCochasEstrellas (estrellas) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  estrellas.forEach(function (estrella) {
    ctx.fillRect(estrella.x, estrella.y, estrella.size, estrella.size);
  });
}

function paintEnemies(enemies) {
  enemies.forEach(function(enemy) {
    enemy.y += 5;
    enemy.x += getRandomInt(-15, 15);
    drawTriangle(enemy.x, enemy.y, 20, '#00ff00', 'down');
    
    if (!enemy.isDead) {
      drawTriangle(enemy.x, enemy.y, 20, '#00ff00', 'down');
    }
    
    enemy.disparos.forEach(function(shot) {
      shot.y += 15;
      drawTriangle(shot.x, shot.y, 5, '#00ffff', 'down');
    });
  });
}

function paintSpaceShip(x, y) {
  drawTriangle(x, y, 20, '#ff0000', 'up');
}
  
function drawTriangle(x, y, width, color, direction) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - width, y);
  ctx.lineTo(x, direction === 'up' ? y - width : y + width);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x - width,y);
  ctx.fill();
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isVisible(obj) {
  return obj.x > -40 && obj.x < canvas.width + 40 &&
  obj.y > -40 && obj.y < canvas.height + 40;
}

function collision(target1, target2) {
  return (target1.x > target2.x - 20 && target1.x < target2.x + 20) &&
    (target1.y > target2.y - 20 && target1.y < target2.y + 20);
}

function gameOver(ship, enemies) {
  return enemies.some(function(enemy) {
    if (collision(ship, enemy)) {
      return true;
    }
    return enemy.disparos.some(function(shot) {
      return collision(ship, shot);
    });
  });
}

function paintScore(score) {
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('Score: ' + score, 40, 43);
}