/****************************************************
 * PERDA DE BIOMASSA AÉREA APÓS QUEIMADA
 * Lavras – MG | Setembro de 2025
 * Biomassa: GEDI L4A (Mg/ha)
 * Severidade: Sentinel-2 dNBR
 * Nível: Artigo científico
 ****************************************************/

// 1. ÁREA DE ESTUDO
var ponto = ee.Geometry.Point([-45.0172, -21.3224]); // Lavras – MG
var area = ponto.buffer(5000); // 5 km

Map.centerObject(area, 12);
Map.addLayer(area, {color: 'white'}, 'Área de estudo');

// 2. MÁSCARA DE NUVENS – SENTINEL-2 SR (SCL)
function maskS2(image) {
  var scl = image.select('SCL');

  var mask = scl.neq(3)    // sombra
    .and(scl.neq(8))       // nuvem
    .and(scl.neq(9))       // nuvem alta
    .and(scl.neq(10))      // cirrus
    .and(scl.neq(11));     // neve

  return image.updateMask(mask).divide(10000);
}

// 3. SENTINEL-2 PRÉ E PÓS-FOGO
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

// 4. NBR E dNBR (SEVERIDADE DO FOGO)
var nbrPre  = preFire.normalizedDifference(['B8', 'B12']);
var nbrPost = postFire.normalizedDifference(['B8', 'B12']);
var dNBR = nbrPre.subtract(nbrPost).rename('dNBR');

// 5. dNBR → PERDA PERCENTUAL (%)
var perdaPerc = dNBR
  .multiply(100)
  .clamp(0, 100)
  .rename('Perda_%');

// 6. BIOMASSA AÉREA – GEDI L4A (Mg/ha)
var biomassa = ee.ImageCollection('LARSE/GEDI/GEDI04_A_002_MONTHLY')
  .filterBounds(area)
  .filterDate('2024-01-01', '2024-12-31') // ano pré-fogo
  .select('agbd') // Aboveground Biomass Density
  .median()
  .rename('Biomassa');

// 7. BIOMASSA PERDIDA (Mg/ha)
var biomassaPerdida = biomassa
  .multiply(perdaPerc.divide(100))
  .rename('Biomassa_perdida');

// 8. CLASSIFICAÇÃO DA SEVERIDADE (fire ecology)
var classes = perdaPerc.expression(
  "(b < 5) ? 0" +
  ": (b < 15) ? 1" +
  ": (b < 30) ? 2" +
  ": (b < 50) ? 3" +
  ": 4", {'b': perdaPerc}
).rename('Classe_severidade');

// 9. PALETAS
var paletaContinua = ['#ffffcc','#ffeda0','#feb24c','#f03b20','#bd0026'];
var paletaClasses  = ['#ffffcc','#ffeda0','#feb24c','#f03b20','#7a0177'];

// 10. MAPAS
Map.addLayer(perdaPerc.clip(area),
  {min: 0, max: 60, palette: paletaContinua},
  'Perda percentual de biomassa');

Map.addLayer(biomassaPerdida.clip(area),
  {min: 0, max: 40, palette: paletaContinua},
  'Biomassa aérea perdida (Mg/ha)');

Map.addLayer(classes.clip(area),
  {min: 0, max: 4, palette: paletaClasses},
  'Severidade da perda');

// 11. GRÁFICO 1 – HISTOGRAMA (0–30%)
var histPerdaZoom = ui.Chart.image.histogram({
  image: perdaPerc,
  region: area,
  scale: 10,
  maxPixels: 1e13
}).setOptions({
  title: 'Distribuição da perda percentual de biomassa (0–30%)',
  hAxis: {
    title: 'Perda de biomassa aérea (%)',
    viewWindow: {min: 0, max: 30}
  },
  vAxis: {title: 'Frequência (pixels)'},
  legend: {position: 'none'}
});

print(histPerdaZoom);

// 12. GRÁFICO 2 – CLASSES DE SEVERIDADE
var histClasses = ui.Chart.image.histogram({
  image: classes,
  region: area,
  scale: 10,
  maxPixels: 1e13
}).setOptions({
  title: 'Distribuição das classes de severidade da perda de biomassa',
  hAxis: {title: 'Classe (0 = muito baixa | 4 = muito alta)'},
  vAxis: {title: 'Número de pixels'},
  legend: {position: 'none'}
});

print(histClasses);

// 13. EXPORTAÇÕES – GOOGLE DRIVE

// Perda percentual
Export.image.toDrive({
  image: perdaPerc.clip(area),
  description: 'Perda_percentual_biomassa_Lavras_2025',
  folder: 'GEE_Fogo_Lavras',
  fileNamePrefix: 'perda_percentual_biomassa_2025',
  region: area,
  scale: 10,
  crs: 'EPSG:31983',
  maxPixels: 1e13
});

// Biomassa perdida (GEDI ~25 m)
Export.image.toDrive({
  image: biomassaPerdida.clip(area),
  description: 'Biomassa_perdida_Lavras_2025',
  folder: 'GEE_Fogo_Lavras',
  fileNamePrefix: 'biomassa_perdida_2025',
  region: area,
  scale: 25,
  crs: 'EPSG:31983',
  maxPixels: 1e13
});

// 14. ÁREA (ha) POR CLASSE DE SEVERIDADE
var areaClasse = ee.Image.pixelArea()
  .addBands(classes)
  .reduceRegion({
    reducer: ee.Reducer.sum().group({
      groupField: 1,
      groupName: 'classe'
    }),
    geometry: area,
    scale: 10,
    maxPixels: 1e13
  });

var tabelaClasses = ee.FeatureCollection(
  ee.List(areaClasse.get('groups')).map(function(item) {
    item = ee.Dictionary(item);
    return ee.Feature(null, {
      classe: item.get('classe'),
      area_ha: ee.Number(item.get('sum')).divide(10000)
    });
  })
);

print('Área por classe (ha):', tabelaClasses);

// Exportar tabela
Export.table.toDrive({
  collection: tabelaClasses,
  description: 'Area_por_classe_severidade_biomassa_2025',
  folder: 'GEE_Fogo_Lavras',
  fileNamePrefix: 'area_por_classe_severidade_biomassa_2025',
  fileFormat: 'CSV'
});
