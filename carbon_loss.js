/***************************************
 * PERDA DE CARBONO APÓS QUEIMADA
 * Lavras – MG | Setembro de 2025
 * Biomassa aérea | Escala local
 ***************************************/

// 1. Área de estudo (buffer de 5 km)
var ponto = ee.Geometry.Point([-45.0172, -21.3224]);
var area = ponto.buffer(5000);
Map.centerObject(area, 12);
Map.addLayer(area, {color: 'white'}, 'Área de estudo');

// Função correta de máscara de nuvens – Sentinel-2 SR
function maskS2(image) {
  var scl = image.select('SCL');

  // Máscara: remove nuvem, cirrus, sombra e neve
  var mask = scl.neq(3)   // sombra
    .and(scl.neq(8))      // nuvem
    .and(scl.neq(9))      // nuvem alta
    .and(scl.neq(10))     // cirrus
    .and(scl.neq(11));    // neve

  return image.updateMask(mask).divide(10000);
}

// 3. Sentinel-2 pré e pós-fogo
var preFire = ee.ImageCollection('COPERNICUS/S2_SR')
  .filterBounds(area)
  .filterDate('2025-07-01', '2025-08-31')
  .map(maskS2)
  .median();

var postFire = ee.ImageCollection('COPERNICUS/S2_SR')
  .filterBounds(area)
  .filterDate('2025-09-01', '2025-10-31')
  .map(maskS2)
  .median();

// 4. NBR
var nbrPre = preFire.normalizedDifference(['B8', 'B12']);
var nbrPost = postFire.normalizedDifference(['B8', 'B12']);
var dNBR = nbrPre.subtract(nbrPost).rename('dNBR');

// 5. Conversão dNBR → perda percentual (proxy ecológico)
var perdaPerc = dNBR
  .multiply(100)
  .clamp(0, 100)
  .rename('Perda_%');

// 6. Carbono da biomassa aérea (MapBiomas)
var carbono = ee.Image(
  'projects/mapbiomas-workspace/public/collection7_1/biomass'
).select('carbon');

// Ajuste da perda de carbono
var carbonoPerdido = carbono
  .multiply(perdaPerc.divide(100))
  .rename('Carbono_perdido');

// 7. Classificação de severidade
var classes = perdaPerc.expression(
  "(b < 5) ? 0" +
  ": (b < 15) ? 1" +
  ": (b < 30) ? 2" +
  ": (b < 50) ? 3" +
  ": 4", {'b': perdaPerc}
).rename('Classe_severidade');

// 8. Paletas
var paletaContinua = ['#ffffcc','#ffeda0','#feb24c','#f03b20','#bd0026'];
var paletaClasses = ['#ffffcc','#ffeda0','#feb24c','#f03b20','#7a0177'];

// 9. Mapas
Map.addLayer(perdaPerc.clip(area),
  {min: 0, max: 60, palette: paletaContinua},
  'Perda percentual de carbono');

Map.addLayer(classes.clip(area),
  {min: 0, max: 4, palette: paletaClasses},
  'Severidade da perda');

// GRÁFICO 1 – Histograma contínuo (0–30%)
var histPerdaZoom = ui.Chart.image.histogram({
  image: perdaPerc,
  region: area,
  scale: 10,
  maxPixels: 1e13
}).setOptions({
  title: 'Distribuição da perda percentual de carbono (0–30%)',
  hAxis: {
    title: 'Perda de carbono da biomassa aérea (%)',
    viewWindow: {min: 0, max: 30}
  },
  vAxis: {
    title: 'Frequência (número de pixels)'
  },
  legend: {position: 'none'}
});

print(histPerdaZoom);

// GRÁFICO 2 – Frequência por classe de severidade
var histClasses = ui.Chart.image.histogram({
  image: classes,
  region: area,
  scale: 10,
  maxPixels: 1e13
}).setOptions({
  title: 'Distribuição das classes de severidade da perda de carbono',
  hAxis: {
    title: 'Classe de severidade (0 = muito baixa | 4 = muito alta)'
  },
  vAxis: {
    title: 'Número de pixels'
  },
  legend: {position: 'none'}
});

print(histClasses);

// EXPORTAÇÃO – Perda percentual de carbono
Export.image.toDrive({
  image: perdaPerc.clip(area),
  description: 'Perda_percentual_carbono_Lavras_2025',
  folder: 'GEE_Fogo_Lavras',
  fileNamePrefix: 'perda_percentual_carbono_2025',
  region: area,
  scale: 10,
  crs: 'EPSG:31983', // SIRGAS 2000 / UTM 23S (MG)
  maxPixels: 1e13
});

// EXPORTAÇÃO – Classes de severidade
Export.image.toDrive({
  image: classes.clip(area),
  description: 'Severidade_perda_carbono_Lavras_2025',
  folder: 'GEE_Fogo_Lavras',
  fileNamePrefix: 'severidade_perda_carbono_2025',
  region: area,
  scale: 10,
  crs: 'EPSG:31983',
  maxPixels: 1e13
});
