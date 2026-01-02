# Fire impact analysis – Lavras (MG)

This repository contains Google Earth Engine (GEE) scripts developed to assess the impacts of a fire event that occurred in September 2025 in Lavras, Minas Gerais, Brazil. The analysis focuses on fire severity and its effects on aboveground biomass and carbon stocks, using high-resolution satellite imagery and LiDAR-based biomass data.

The scripts were designed for local-scale analysis in heterogeneous environments, such as the Cerrado–Atlantic Forest ecotone, where spatial detail is essential.

---

## Overview of the approach

Both scripts share the same core methodology and differ only in the final variable analyzed (biomass or carbon):

1. Fire severity is estimated using the dNBR index derived from Sentinel-2 imagery.
2. The severity information is converted into a percentage of vegetation loss.
3. This loss is applied to:
   - Aboveground biomass (using GEDI LiDAR data), or
   - Carbon stocks (derived from biomass).

The use of fire severity, rather than a simple burned/unburned classification, allows a more realistic representation of fire impacts, accounting for variations in fire intensity across the landscape.

---

## Scripts included

### `01_severidade_dnBR_sentinel2.js`
Calculates fire severity using Sentinel-2 imagery.

Main steps:
- Cloud masking using the Scene Classification Layer (SCL)
- Calculation of NBR for pre- and post-fire periods
- Computation of dNBR
- Conversion of dNBR into loss percentage
- Classification of fire severity into five ecological classes
- Generation of maps and histograms

This script provides the base information used by the other analyses.

---

### `02_perda_biomassa_gedi.js`
Estimates aboveground biomass loss after the fire.

Main steps:
- Imports GEDI L4A LiDAR-derived aboveground biomass density (Mg/ha)
- Applies fire severity (loss percentage) to biomass
- Generates maps of biomass loss and severity
- Exports GeoTIFF and CSV outputs

This script is particularly suitable for ecological and structural vegetation analyses.

---

### `03_perda_carbono.js`
Estimates carbon loss from aboveground biomass.

Main steps:
- Uses the same fire severity derived from Sentinel-2
- Converts biomass into carbon using a standard fraction
- Applies loss percentage to carbon stocks
- Generates maps, histograms, and exportable outputs

This script is more suitable for studies focused on carbon cycling and fire-related emissions.

---

## Key functions used and why they matter

### `ee.ImageCollection.filterDate()`
Used to separate pre-fire and post-fire periods.
Ensures temporal consistency and avoids mixing vegetation recovery with fire effects.

### `ee.ImageCollection.filterBounds()`
Limits the analysis to the study area.
Improves processing efficiency and spatial relevance.

### `normalizedDifference()`
Used to compute the NBR index from Sentinel-2 bands.
NBR is highly sensitive to burned vegetation and widely used in fire ecology.

### `subtract()`
Calculates dNBR by subtracting post-fire NBR from pre-fire NBR.
This step captures the magnitude of vegetation change caused by fire.

### `expression()`
Used to classify loss percentages into severity classes.
Allows flexible and transparent definition of ecological thresholds.

### `ui.Chart.image.histogram()`
Generates histograms directly in the GEE interface.
Helps visualize the distribution of fire impacts and supports result interpretation.

### `Export.image.toDrive()` and `Export.table.toDrive()`
Used to export results as GeoTIFF and CSV files.
Ensures compatibility with GIS software and statistical analysis tools.

---

## Why Sentinel-2 and GEDI were chosen

- Sentinel-2 provides 10 m spatial resolution, which is essential for small and heterogeneous areas.
- Its spectral bands allow robust calculation of NBR and dNBR.
- GEDI provides LiDAR-based biomass estimates, offering physically based and peer-reviewed biomass data.
- The combination of Sentinel-2 and GEDI enables a detailed and ecologically consistent assessment of fire impacts.

---

## Common issues and possible solutions

### Cloud masking removes too many pixels
**Cause:** Strict cloud filtering during cloudy periods.  
**Solution:** Adjust date ranges or inspect SCL classes to ensure valid pixels remain.

---

### Biomass layer appears patchy or sparse
**Cause:** GEDI data coverage is not continuous.  
**Solution:** Use temporal aggregation (e.g., annual median) and interpret results as spatially explicit estimates, not wall-to-wall measurements.

---

### Export fails due to pixel limits
**Cause:** Large regions or high resolution.  
**Solution:** Reduce the export area, increase `maxPixels`, or export variables separately.

---

### Severity values seem too high or too low
**Cause:** Differences in vegetation type or fire behavior.  
**Solution:** Reevaluate severity class thresholds and discuss their ecological meaning in the analysis.

---

## Final notes

These scripts are intended to be transparent, reproducible, and adaptable. Users are encouraged to modify severity thresholds, time windows, and export settings according to their study objectives and ecological context.

---

## License

This project is shared under the Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 License (CC BY-NC-ND 4.0).

You may copy and redistribute the script with proper attribution, but commercial use and modification are prohibited without permission. See the LICENSE file for details.

Note: This workflow is part of an active research project. The repository is temporarily licensed under supervisory rights due to an ongoing publication process. License terms may change upon official publication.


