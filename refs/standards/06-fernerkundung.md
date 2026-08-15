# Standards-Register — Fernerkundung

> Stand: 2026-08-09. Nur frei zugängliche, wörtlich belegte Quellen.
> Regel: Was hier nicht gedeckt ist, darf die BIOME-Oberfläche nicht anbieten.
>
> Abrufhinweise für Nachprüfungen:
> - `www.usgs.gov` liefert ohne Browser-User-Agent HTTP 403. Mit
>   `curl -A "Mozilla/5.0 …"` HTTP 200. Ein 403 ist hier kein Ausfall der Quelle.
> - `publications.jrc.ec.europa.eu` weist `curl` mit einer WAF-Seite ab
>   („Request Rejected", 244 Byte bei HTTP 200). Dieselbe URL liefert über WebFetch
>   das echte PDF (990 KB). Gegenprobe über einen Fremd-Spiegel mit identischem
>   Dokumentkopf war möglich.
> - AdV-PDF-Dateinamen sind irreführend: `PQS_DOP_V4.2_2026-03-04.pdf` enthält den
>   **Produkt- und Qualitätsstandard für Digitale Luftbilder** (nicht für Orthophotos).
>   Der Orthophoto-Standard liegt unter `2026-04/PQS_DOP.pdf` (Version 4.1).
> - Alle PDF-Zitate wurden mit `pdftotext -layout` aus der Textebene gewonnen;
>   Silbentrennung und Layout-Leerzeichen sind bereinigt, der Wortlaut ist unverändert.

## Gedeckte Definitionen

### FE-S2-01 · Sentinel-2 MSI — Bandbelegung, äquivalente Zentralwellenlängen, Bandbreiten
- **Herausgeber:** ESA / Copernicus, SentiWiki (Sentinel-2 Mission), betrieben vom Copernicus Space Component Data Access und dem Sentinel-2 OPT-MPC
- **Quelle:** https://sentiwiki.copernicus.eu/web/s2-mission
- **Abgerufen:** 2026-08-09 (HTTP 200)
- **Wörtlich** (Abschnitt „Spectral Resolutions", Vorbemerkung zur Tabelle):
  „The 13 spectral bands of Sentinel-2 range from the Visible and Near Infra-Red (VNIR) to the Short-Wave Infra-Red (SWIR):"
  „4 x 10 metre Bands: the three classical RGB bands (Blue (~493nm), Green (560nm), and Red (~665nm)) and a Near Infra-Red (~833nm) band;"
  „6 x 20 metre Bands: 4 narrow Bands in the VNIR vegetation red edge spectral domain (~704nm,~740nm, ~783nm and ~865nm) and 2 wider SWIR bands (~1610nm and ~2190nm) for applications such as snow/ice/cloud detection, or vegetation moisture stress assessment;"
  „3 x 60 metre Bands mainly focused on cloud screening and atmospheric correction (~443nm for aerosols and ~945nm for water vapour) and cirrus detection (~1374nm)."
- **Wörtlich** (Definitionshinweis zur Wellenlängenangabe):
  „NOTE: The equivalent wavelength in the Tables below (provided in Sentinel-2 product metadata as Spectral_Information/Wavelength/CENTRAL) is the barycentre of the spectral response function, not considering the solar irradiance:"
- **Wörtlich** (Table 3 „Spectral information and associated Signal to Noise ratio (SNR) per band for S2A and S2B", Spalten „Equivalent wavelength (nm)" und „Bandwidth (nm)", vollständig):

  | Band | S2A λ (nm) | S2A Breite (nm) | S2B λ (nm) | S2B Breite (nm) |
  |---|---|---|---|---|
  | 1 | 442.7 | 21 | 442.3 | 20 |
  | 2 | 492.7 | 65 | 492.3 | 65 |
  | 3 | 559.9 | 35 | 559.0 | 35 |
  | 4 | 664.6 | 31 | 664.9 | 31 |
  | 5 | 704.1 | 15 | 703.8 | 14 |
  | 6 | 740.5 | 13 | 739.1 | 14 |
  | 7 | 782.8 | 19 | 779.7 | 20 |
  | 8 | 832.8 | 118 | 832.9 | 115 |
  | 8a | 864.7 | 20 | 864.0 | 21 |
  | 9 | 945.1 | 20 | 943.2 | 19 |
  | 10 | 1373.5 | 29 | 1376.9 | 29 |
  | 11 | 1613.7 | 89 | 1610.4 | 93 |
  | 12 | 2202.4 | 180 | 2185.7 | 181 |

- **Wörtlich** (Table 4, Sentinel-2C, „Equivalent wavelength (nm)" / „Bandwidth (nm)", vollständig):
  „1 | 444.2 | 20" · „2 | 489.1 | 65" · „3 | 560.6 | 35" · „4 | 666.5 | 31" · „5 | 707.1 | 16" · „6 | 741.1 | 16" · „7 | 784.7 | 20" · „8 | 834.6 | 114" · „8a | 865.6 | 20" · „9 | 947.2 | 20" · „10 | 1372.2 | 33" · „11 | 1612.0 | 90" · „12 | 2191.3 | 181"
- **Deckt in BIOME:**
  - **Abgeschlossene Bandliste** für Sentinel-2: genau 13 Bänder mit den Bezeichnern `B1, B2, B3, B4, B5, B6, B7, B8, B8A, B9, B10, B11, B12`. Eine BIOME-Auswahlliste darf keine anderen Sentinel-2-Bänder anbieten.
  - **Feld `zentralwellenlaenge_nm`** je Band, Einheit nm, mit einer Nachkommastelle. Der Wert ist **satellitenabhängig** (S2A ≠ S2B ≠ S2C) — BIOME muss die Plattform mitspeichern, sonst ist die Wellenlänge nicht eindeutig.
  - **Semantik des Werts:** „barycentre of the spectral response function, not considering the solar irradiance". BIOME darf ihn als „äquivalente/zentrale Wellenlänge" beschriften, nicht als „Mittelpunkt des Bandintervalls".
  - **Feld `bandbreite_nm`** je Band und Plattform, Einheit nm, ganzzahlig.
  - **Herkunft im Produkt:** `Spectral_Information/Wavelength/CENTRAL` in den Produktmetadaten — der belegte Pfad für eine automatische Übernahme.
- **Deckt ausdrücklich nicht:** die volle spektrale Responsefunktion je Band (die Quelle verweist dafür auf eine separate Seite, die hier nicht abgerufen wurde); Werte für Sentinel-2D oder andere Sensoren.

### FE-S2-02 · Sentinel-2 — räumliche Auflösung je Band
- **Herausgeber:** ESA / Copernicus (SentiWiki); Copernicus Data Space Ecosystem (Dokumentation)
- **Quelle:** https://sentiwiki.copernicus.eu/web/s2-mission · https://documentation.dataspace.copernicus.eu/Data/SentinelMissions/Sentinel2.html
- **Abgerufen:** 2026-08-09 (HTTP 200 / HTTP 200)
- **Wörtlich** (SentiWiki, Abschnitt „Spatial Resolutions", Abbildungsunterschriften Figure 14–16, vollständig):
  „The spatial resolution of Sentinel-2 is dependent on the particular spectral band:"
  „Figure 14: Sentinel-2 10 m spatial resolution bands: B2 (490 nm), B3 (560 nm), B4 (665 nm) and B8 (842 nm)"
  „Figure 15: Sentinel-2 20 m spatial resolution bands: B5 (705 nm), B6 (740 nm), B7 (783 nm), B8a (865 nm), B11 (1610 nm) and B12 (2190 nm)"
  „Figure 16: Sentinel-2 60 m spatial resolution bands: B1 (443 nm), B9 (940 nm) and B10 (1375 nm)"
- **Wörtlich** (Copernicus Data Space Ecosystem):
  „The satellites carry a single payload: the optical Multi-Spectral Instrument (MSI) that samples 13 spectral bands: four bands at 10 m, six bands at 20 m and three bands at 60 m spatial resolution."
- **Wörtlich** (SentiWiki, Mission Overview): „The orbital swath width is 290 km."
- **Deckt in BIOME:**
  - **Feld `aufloesung_m`** je Band mit dem abgeschlossenen Wertebereich {10, 20, 60}, Einheit Meter:
    10 m: B2, B3, B4, B8 · 20 m: B5, B6, B7, B8A, B11, B12 · 60 m: B1, B9, B10.
  - **Harte Konsequenz für Indizes:** Jeder Index, der ein 20-m-Band enthält (z. B. alle Red-Edge-Indizes, siehe FE-RE-09/10), hat als native Bezugsfläche **20 m × 20 m = 400 m²**. BIOME darf ein solches Ergebnis nicht als 10-m-Produkt ausgeben, ohne das Resampling zu kennzeichnen.
  - **Kleinste belegte Bezugsfläche** eines Sentinel-2-Pixels: 10 m × 10 m = 100 m². Für Einzelbaumkronen unterhalb dieser Fläche ist ein Sentinel-2-Pixel ein Mischsignal — BIOME darf Sentinel-2-Werte nicht als Einzelbaum-Messwerte führen.
- **Deckt ausdrücklich nicht:** eine Aussage, welche der drei Auflösungen im L2A-Produkt tatsächlich vorliegt (L2A wird laut FE-S2-04 in allen drei Auflösungen resampled); Angaben zu Pan-Sharpening (Sentinel-2 hat keinen panchromatischen Kanal).

### FE-S2-03 · Sentinel-2 Level-1C — Definition TOA-Reflektanz und Umrechnung aus dem Digital Number
- **Herausgeber:** ESA / Copernicus, SentiWiki (S2 Products, S2 Processing)
- **Quelle:** https://sentiwiki.copernicus.eu/web/s2-products · https://sentiwiki.copernicus.eu/web/s2-processing
- **Abgerufen:** 2026-08-09 (HTTP 200 / HTTP 200)
- **Wörtlich** (S2 Products, Abschnitt „Level-1C Products"):
  „The Level-1C product provides Top Of Atmosphere (TOA) reflectance images, derived from associated Level-1B products."
  „The Level-1C product is composed of 110 km x 110 km tiles (ortho-images in UTM/WGS84 projection). … The Level-1C product results from using a Digital Elevation Model (DEM) to project the image in cartographic geometry."
  „Level-1C products are resampled with a constant Ground Sampling Distance (GSD) of 10, 20 and 60 m depending on the native resolution of the different spectral bands. In Level-1C products, pixel coordinates refer to the upper left corner of the pixel."
  „Please note that starting from January 25th, 2022 (PB 04.00), to avoid truncation of negative values, the dynamic range of Level-1C products is shifted by a band-dependent constant radiometric offset called RADIO_ADD_OFFSET."
  „Digital Number DN=0 remains the „NO_DATA" value"
  „L1C_TOAi = (L1C_DNi + RADIO_ADD_OFFSETi) / QUANTIFICATION_VALUE"
  „The radiometric offset per spectral band and quantification value are reported in the General_Info/Product_Image_Characteristics section of the product metadata."
- **Wörtlich** (S2 Processing, Abschnitt „Top Of Atmosphere (TOA) Reflectance Computation"):
  „The numeric digital counts (CN) of each pixel image (i,j) and each spectral band (k) are converted in TOA reflectance (ρ). This conversion takes into account the equivalent extra-terrestrial solar spectrum (E s ), the incoming solar direction defined by its zenith angle (θ s ) for each pixel of the image and the absolute calibration (A k ) of the instrument MSI."
  „d(t) is the Sun-Earth distance variation and is computed based on Orekit flight dynamics library, using the Planetary and Lunar Ephemerides DE430"
  „θ s is the Sun zenith angle, determined at this level too."
- **Wörtlich** (S2 Products, Grenzfall Sonnenstand):
  „L1C TOA reflectance is computed according to the formula provided in the TOA reflectance computation section, where θ s stands for the Solar Zenith Angle (SZA). If the SZA equals 90°, the TOA reflectance computation is impossible (division by 0), and become negative if the SZA is higher than 90°. To avoid this behavior, the TOA reflectance is computed only for SZA lower than 89.9° in L1C products and set to 0 (1000 DN) otherwise."
- **Deckt in BIOME:**
  - **Prozessierungsstufe `L1C`** = TOA-Reflektanz (Reflektanz am Oberrand der Atmosphäre), dimensionslos.
  - **Pflicht-Rechenweg vom Rohwert:** `Reflektanz = (DN + RADIO_ADD_OFFSET) / QUANTIFICATION_VALUE`. Beide Parameter sind bandabhängig und stehen in den Produktmetadaten unter `General_Info/Product_Image_Characteristics`. Ein BIOME-Importer, der einfach durch 10000 teilt, ist für Produkte ab PB 04.00 (25.01.2022) falsch.
  - **`DN = 0` ist NO_DATA**, nicht Reflektanz 0. Muss als Fehlwert behandelt werden, nicht als Messwert.
  - **Pixel-Ankerpunkt:** obere linke Pixelecke.
  - **Kachelgeometrie:** 110 km × 110 km, UTM/WGS84.
  - **Sonnenstandsabhängigkeit ist Teil der Definition:** die TOA-Reflektanz enthält bereits die Korrektur mit dem Sonnenzenitwinkel θs und der Sonne-Erde-Distanz d(t). Siehe FE-CAL-12.
- **Deckt ausdrücklich nicht:** die Gleichung selbst — sie steht in der Quelle als Bild („Equation 8: Top of Atmosphere conversion") und war in der Textebene nicht abrufbar. BIOME darf die Formel deshalb **nicht** als „laut ESA" ausschreiben; belegt sind nur die eingehenden Größen und der DN-Umrechnungsweg.

### FE-S2-04 · Sentinel-2 Level-2A — Surface Reflectance (vormals BOA), Umrechnung, Zusatzprodukte
- **Herausgeber:** ESA / Copernicus, SentiWiki (S2 Products); Copernicus Data Space Ecosystem
- **Quelle:** https://sentiwiki.copernicus.eu/web/s2-products · https://documentation.dataspace.copernicus.eu/Data/SentinelMissions/Sentinel2.html
- **Abgerufen:** 2026-08-09 (HTTP 200 / HTTP 200)
- **Wörtlich** (SentiWiki, Abschnitt „Level-2A Products"):
  „The Level-2A product provides atmospherically corrected Surface Reflectance (SR) products from Level-1C products."
  „Please be aware that „Surface Reflectance (SR)" is a new term that has been introduced to replace the former one: „Bottom of Atmosphere (BOA) reflectance.""
  „Additional Level-2A output image products are an Aerosol Optical Thickness (AOT) map, a Water Vapour (WV) map and a Scene Classification (SCL) map."
  „Please note that starting with the Processing Baseline (PB) 04.00 (25th January 2022), the dynamic range of the Level-2A products is shifted by a band-dependent constant: BOA_ADD_OFFSET. This offset will allow encoding negative surface reflectances that may occur over very dark surfaces."
  „L2A_SR i = (L2A_DN i + BOA_ADD_OFFSET i ) / QUANTIFICATION_VALUE"
  „CEOS has officially assessed Sentinel-2 Level-2A Surface Reflectance (SR) products as compliant with CEOS Analysis Ready Data (ARD) requirements at the Threshold level."
- **Wörtlich** (Copernicus Data Space Ecosystem):
  „Level 2A product provides atmospherically corrected Surface Reflectance (SR) images, derived from the associated Level-1C products. The atmospheric correction of Sentinel-2 images includes the correction of the scattering of air molecules (Rayleigh scattering), of the absorbing and scattering effects of atmospheric gases, in particular ozone, oxygen and water vapor and the correction of absorption and scattering due to aerosol particles. Additional Level-2A output image products are an Aerosol Optical Thickness (AOT) map, a Water Vapour (WV) map and a Scene Classification (SCL) map. These image products, as well as the Surface Reflectance for the different spectral bands, are resampled at different spatial resolutions (10 m, 20 m, or 60 m)."
- **Wörtlich** (SentiWiki, Werkzeugtabelle, Zeile Sen2Cor): „Converts Top-Of-Atmosphere Sentinel-2 products into Bottom-Of-Atmosphere (surface reflectance) products, by correcting for atmosphere, terrain influences and cirrus contamination."
- **Deckt in BIOME:**
  - **Prozessierungsstufe `L2A`** = atmosphärisch korrigierte Oberflächenreflektanz, dimensionslos. **Amtlich aktuelle Bezeichnung: „Surface Reflectance (SR)".** „BOA-Reflektanz" ist laut Quelle der **abgelöste** Begriff. BIOME darf „BOA" höchstens als Synonym in Klammern führen.
  - **Pflicht-Rechenweg:** `SR = (DN + BOA_ADD_OFFSET) / QUANTIFICATION_VALUE`, bandabhängig, ab PB 04.00.
  - **Negative Reflektanzwerte sind zulässig** und dürfen von BIOME nicht auf 0 geklemmt werden („may occur over very dark surfaces").
  - **Pflichtfeld `prozessierungsstufe`** mit dem abgeschlossenen Wertebereich {`L1C`, `L2A`}. Nur diese beiden Stufen werden an Nutzer ausgeliefert (SentiWiki: „Only the Level-1C and Level-2A products are released to Users. L1B products are available for expert users only on request.").
  - **Pflicht-Begleitband `SCL` (Scene Classification)** und die Masken AOT/WV. Ein NDVI ohne Wolken-/Schattenmaske aus SCL ist nicht verteidigbar.
  - **Vergleichbarkeitsregel:** L1C- und L2A-Werte sind verschiedene physikalische Größen. BIOME darf NDVI aus L1C und aus L2A **nicht** in derselben Zeitreihe mischen.
- **Deckt ausdrücklich nicht:** die Klassenschlüssel der SCL-Maske (nicht abgerufen); die konkreten Zahlenwerte von `BOA_ADD_OFFSET` und `QUANTIFICATION_VALUE` (produktspezifisch, stehen in den Metadaten); Genauigkeitsangaben der Atmosphärenkorrektur.

### FE-S2-05 · Sentinel-2 — geometrische Leistungsanforderungen, insbesondere multitemporale Ko-Registrierung
- **Herausgeber:** ESA / Copernicus, SentiWiki (S2 Mission, Abschnitt „Geometric Performance")
- **Quelle:** https://sentiwiki.copernicus.eu/web/s2-mission · https://sentiwiki.copernicus.eu/web/s2-processing
- **Abgerufen:** 2026-08-09 (HTTP 200 / HTTP 200)
- **Wörtlich** (S2 Mission, „Geometric Performance", vollständige Anforderungsliste):
  „The Level-1 geometric quality requirements are:"
  „A priori absolute geo-location uncertainty (before performing any processing): 2 km 3σ"
  „Absolute geolocation uncertainty: 20 m 2σ without GCPs and 12.5 m 2σ with GCPs"
  „Multi-temporal registration: The spatial co-registration accuracy of Level 1C data acquired at different dates over the same geographical area shall be better than or equal to 0.3 pixels at 2 σ confidence level."
  „Multi-spectral registration (for any two spectral bands): the inter-channel spatial co-registration of any two spectral bands shall be better than 0.30 of the coarser achieved spatial sampling distance of these two bands at 3σ confidence level."
- **Wörtlich** (S2 Processing, Global Reference Image):
  „The images, acquired by the Sentinel-2 mission between 2015 and 2018, use the Sentinel-2 reference band (B04) and are mostly (but not entirely) cloud-free. The GRI covers most emerged land masses and has a global absolute geolocation accuracy better than 6 m."
  „The geometric refinement of the Copernicus Sentinel-2 imagery relies on the GRI and is part of the Sentinel-2 geometric calibration process, applied worldwide since August 2021. It has highly improved the absolute geolocation and the multi-temporal co-registration of Sentinel-2 products."
- **Wörtlich** (S2 Processing, Tabelle inter-band-Zeitversatz, Auszug): „B08 / B02 | 0.264" · „B05 / B04 | 0.264" · „B12 / B02 | 2.085" (Sekunden)
- **Deckt in BIOME:**
  - **Definition „Ko-Registrierung" im Sentinel-2-Kontext:** räumliche Übereinstimmung zweier Aufnahmen desselben Gebiets — multitemporal (verschiedene Termine) oder multispektral (verschiedene Bänder).
  - **Belegte Kennzahl multitemporal:** ≤ 0,3 Pixel bei 2σ. Bei 10-m-Bändern sind das **≤ 3 m**. Eine BIOME-Zeitreihe auf Pixelebene darf keine Lageübereinstimmung besser als diesen Wert behaupten.
  - **Belegte Kennzahl multispektral:** ≤ 0,30 der gröberen Abtastweite der beiden beteiligten Bänder, bei 3σ. Für ein 10-m-/20-m-Paar (z. B. B4 mit B5) also **≤ 6 m** — das ist die Grenze für NDRE-artige Indizes über Bandgrenzen hinweg.
  - **Absolute Lagegenauigkeit:** 20 m 2σ ohne GCP, 12,5 m 2σ mit GCP. Ein BIOME-Overlay von Sentinel-2-Pixeln auf einen Baumstandort aus dem Kataster darf keine bessere Passung behaupten.
  - **Zeitstempel-Feinheit:** Bänder eines „gleichzeitigen" Aufnahmezeitpunkts sind bis zu ca. 2,1 s auseinander (B12 gegen B02). Für bewegte Oberflächen (Wasser) relevant, für Vegetation nicht.
  - **Datumsgrenze:** die geometrische Verfeinerung über die GRI ist erst „since August 2021" weltweit angewandt. Ältere Produkte sind nur über die Collection-1-Reprozessierung vergleichbar.
- **Deckt ausdrücklich nicht:** Angaben in RMSE. Die Sentinel-2-Anforderungen sind in **σ-Konfidenzniveaus** formuliert, nicht als RMSE. Eine Umrechnung ist ohne Verteilungsannahme nicht zulässig — siehe FE-GEO-14 bis FE-GEO-17 für die RMSE-Definitionen.

### FE-NDVI-06 · NDVI — Formel, Bandbelegung und Wertebereich
- **Herausgeber:** (a) U.S. Geological Survey (USGS), „Landsat Normalized Difference Vegetation Index"; (b) NASA Earth Observatory, „Measuring Vegetation (NDVI & EVI)"
- **Quelle:** https://www.usgs.gov/landsat-missions/landsat-normalized-difference-vegetation-index · https://earthobservatory.nasa.gov/features/MeasuringVegetation/measuring_vegetation_2.php
- **Abgerufen:** 2026-08-09 (HTTP 200 mit Browser-User-Agent, HTTP 403 ohne / HTTP 200)
- **Wörtlich** (USGS):
  „NDVI is used to quantify vegetation greenness and is useful in understanding vegetation density and assessing changes in plant health. NDVI is calculated as a ratio between the red (R) and near infrared (NIR) values in traditional fashion:"
  „(NIR - R) / (NIR + R)"
  „In Landsat 4-7, NDVI = (Band 4 – Band 3) / (Band 4 + Band 3)."
  „In Landsat 8-9, NDVI = (Band 5 – Band 4) / (Band 5 + Band 4)."
  „Landsat Surface Reflectance-derived Normalized Difference Vegetation Index (NDVI) products are produced from Landsat 4–5 Thematic Mapper (TM), Landsat 7 Enhanced Thematic Mapper Plus (ETM+), and Landsat 8-9* Operational Land Imager (OLI)/Thermal Infrared Sensor (TIRS) Collection 1 and Collection 2 scenes that have been processed to Landsat Level-2 Surface Reflectance products."
  Produktspezifikation, wörtlich aus der Tabelle: „Data Type: Signed 16-bit Integer" · „Scale Factor: *0.0001"
- **Wörtlich** (NASA Earth Observatory):
  „Nearly all satellite Vegetation Indices employ this difference formula to quantify the density of plant growth on the Earth — near-infrared radiation minus visible radiation divided by near-infrared radiation plus visible radiation. The result of this formula is called the Normalized Difference Vegetation Index (NDVI). Written mathematically, the formula is:"
  „NDVI = (NIR — VIS)/(NIR + VIS)"
  „Calculations of NDVI for a given pixel always result in a number that ranges from minus one (-1) to plus one (+1); however, no green leaves gives a value close to zero. A zero means no vegetation and close to +1 (0.8 - 0.9) indicates the highest possible density of green leaves."
  „Very low values of NDVI (0.1 and below) correspond to barren areas of rock, sand, or snow. Moderate values represent shrub and grassland (0.2 to 0.3), while high values indicate temperate and tropical rainforests (0.6 to 0.8)."
- **Deckt in BIOME:**
  - **Feld `ndvi`:** dimensionslos, Wertebereich **−1 bis +1** (wörtlich belegt), Formel `(NIR − Rot) / (NIR + Rot)`.
  - **Pflicht-Begleitfelder:** Sensor und die konkret verwendeten Bänder. Die Quelle zeigt wörtlich, dass die Bandnummern sensorabhängig sind. Ein NDVI ohne Bandangabe ist nicht reproduzierbar.
  - **Pflicht-Begleitfeld `prozessierungsstufe`:** Das USGS-Produkt ist ausdrücklich aus **Surface-Reflectance**-Daten (Level-2) abgeleitet. Ein NDVI aus TOA-Daten ist ein anderer Wert und muss so gekennzeichnet sein.
  - **Grobe Interpretationsanker, wörtlich belegt (NASA):** ≤ 0,1 vegetationsfrei (Fels, Sand, Schnee); 0,2–0,3 Strauch und Grasland; 0,6–0,8 gemäßigte und tropische Regenwälder; 0,8–0,9 höchste Blattdichte.
  - **Speicherformat, falls BIOME Landsat-NDVI übernimmt:** signed 16-bit Integer mit Skalenfaktor 0,0001.
- **Deckt ausdrücklich nicht:**
  - **Keine Klassengrenzen für eine Zustandsbewertung.** Die NASA-Werte sind Beispielanker für Landbedeckungstypen, keine abgestufte Skala und ausdrücklich keine Vitalitätsklassen. BIOME darf daraus **keine** Ampel „gesund / gestresst / kritisch" ableiten.
  - Keine Aussage zu Stadtbäumen, Einzelbäumen oder zur Übertragbarkeit auf Drohnendaten.
  - Der USGS-Text nennt keinen Interpretationsschlüssel; der Wertebereich „-10,000 bis 10,000" auf der USGS-Seite ist der **skalierte Integer-Wertebereich** des Produkts, nicht der physikalische Wertebereich.

### FE-NDVI-07 · Die Urquelle „Rouse et al." — was dort tatsächlich steht
- **Herausgeber:** NASA Technical Reports Server (NTRS); Rouse, J. W. Jr., Haas, R. H., Schell, J. A., Deering, D. W. (Texas A&M University, Remote Sensing Center)
- **Quelle:**
  (a) NTRS 19730017588, „Monitoring the vernal advancement and retrogradation (green wave effect) of natural vegetation", Contractor Report, NASA-CR-132982 / E73-10693, Publikationsdatum 1973-04-01 — https://ntrs.nasa.gov/api/citations/19730017588/downloads/19730017588.pdf
  (b) NTRS 19740022614, „Monitoring vegetation systems in the Great Plains with ERTS", Conference Paper, Paper A20, in: „NASA. Goddard Space Flight Center 3d ERTS-1 Symp., Vol. 1, Sect. A", 1974 — https://ntrs.nasa.gov/api/citations/19740022614/downloads/19740022614.pdf
- **Abgerufen:** 2026-08-09 (HTTP 200 / HTTP 200; Metadaten über https://ntrs.nasa.gov/api/citations/… , HTTP 200; `distribution: PUBLIC`, `determinationType: GOV_PUBLIC_USE_PERMITTED`)
- **Wörtlich** (a, Abschnitt 4.4.2 „Theoretical Vegetation Index Model"):
  „Since the red band (MSS Band 5) energy is strongly absorbed and the near-infrared band (MSS Bands 6 and 7) energy somewhat more reflected by dense green vegetation, a ratio of the red to near-infrared reflectance should provide a useful index of the greenness of a vegetation scene."
  „Thus, the difference in Band 7 and Band 5 reflectance values, normalized over the sum of these values, is used as an index value and is called the „vegetation index"."
  „Vegetation Index (R) = (Band 7 - Band 5) / (Band 7 + Band 5)   (1)"
  „To avoid working with negative ratio values and the possibility that the variance of the ratio would be proportional to the mean values, a square-root transformation is applied. The resulting „transformed vegetation index" is then Transformed Vegetation Index = √(R + 0.5)   (2)"
- **Wörtlich** (b, Abstract):
  „Radiance values recorded in ERTS-1 spectral bands 5 and 7, corrected for sun angle, are used to compute a band ratio parameter which is shown to be correlated with aboveground green biomass on rangelands."
- **Wörtlich** (b, Abschnitt „Spectral Analysis"):
  „The specific parameter employed is the Band Ratio Parameter (BRP) defined as the difference in the ERTS radiance value measured in bands 5 and 7, divided by their sum. The normalization procedure is used to eliminate seasonal sun angle differences and to minimize the effect of atmospheric attenuation."
  „This parameter, termed the Transformed Vegetation Index (TVI), is equal to the square-root of the BRP plus an arbitrary constant. The constant selected was 0.5."
- **Wörtlich** (b, Datenaufbereitung — Sonnenstandskorrektur):
  „The radiance measured in each MSS band is computed from the ERTS CCT counts and corrected for seasonal sun angle differences by dividing the CCT value by the sine of the inclination angle of the sun."
- **Deckt in BIOME:**
  - **Korrekte Zitierweise der NDVI-Urquelle.** Die üblicherweise zitierte Konferenzarbeit von 1974 (b) enthält den Begriff „NDVI" **nicht** und definiert dort „Band Ratio Parameter (BRP)" als Differenz der Bänder 5 und 7, geteilt durch die Summe. Die Form `(NIR − Rot)/(NIR + Rot)` steht wörtlich im **Bericht von 1973** (a), dort unter dem Namen „vegetation index".
  - Wenn BIOME eine Herkunftsangabe zum NDVI anzeigt, ist die belastbare Formulierung: „Normalisierter Differenzindex nach Rouse et al., NASA-CR-132982 (1973), dort als ‚vegetation index' (Band 7 − Band 5)/(Band 7 + Band 5); der Name NDVI stammt nicht aus dieser Arbeit."
  - **Beleg für den ursprünglichen Zweck:** Korrelation mit „aboveground green biomass on rangelands" — oberirdische grüne Biomasse auf Weideland. Nicht Baumvitalität, nicht Stadtgrün.
  - **Historischer Beleg für Sonnenstandskorrektur** (siehe FE-CAL-12): Division des Zählwerts durch den Sinus des Sonnenhöhenwinkels.
- **Deckt ausdrücklich nicht:**
  - Die Reihenfolge der Bänder im BRP von (b) ist „the difference in the ERTS radiance value measured in bands 5 and 7" — also Rot minus NIR und damit das **Vorzeichen-invertierte** NDVI. Ich habe im Volltext keine Stelle gefunden, die dieses Vorzeichen auflöst. BIOME darf (b) deshalb nicht als Beleg für die heutige NDVI-Formel führen; dafür ist (a) heranzuziehen.
  - Beide Arbeiten arbeiten mit ERTS-1/Landsat-1-MSS. Eine Übertragung der Konstanten (z. B. der 0,5 im TVI) auf heutige Sensoren ist nicht gedeckt.

### FE-NDVI-08 · NDVI-Sättigung bei hoher Biomasse — belegte Aussage und Zahlen
- **Herausgeber:** NASA / EOS, „MODIS Vegetation Index (MOD 13) Algorithm Theoretical Basis Document", Version 3, Alfredo Huete, Chris Justice, Wim van Leeuwen, 30. April 1999
- **Quelle:** https://modis.gsfc.nasa.gov/data/atbd/atbd_mod13.pdf
- **Abgerufen:** 2026-08-09 (HTTP 200, 1,9 MB PDF)
- **Wörtlich** (Abschnitt 2.2.8 „NDVI saturation considerations", S. 11, vollständig für den hier belegten Teil):
  „There are several explanations for the NDVI saturation problem over densely vegetated areas in which NDVI values no longer respond to variations in green biomass. The NDVI has been reported to be an insensitive measure of LAI at values exceeding 2 or 3. This is of concern since land use change detection, vegetation monitoring, net primary production, and scaling studies cannot be carried out in an NDVI ‚saturated' mode (Townshend et al., 1991)."
  „Gitelson et al. (1996) attributed this to the high sensitivity of the NDVI to the red (chlorophyll) absorption band, which also saturates quickly. Maximum sensitivity to chlorophyll-a (Chl-a) pigment absorption is at 670nm. For Chl-a concentration beyond 3-5 µg/cm2, the inverse relationship of reflectance at 670nm vs. chlorophyll concentration ‚saturates' and is no longer sensitive despite a global range in chlorophyll concentrations from 0.3 to 45 µg/cm2 (Vogelmann et al. 1994; Buschmann and Nagel 1993)."
  „Although bandwidth may affect saturation, one must also consider the nature of the NDVI mathematical transform involving the red and NIR bands. The NDVI is a non-linear ‚stretch' of the functionally equivalent, NIR/red ratio designed to confine its values from -1 to +1 (Deering, 1978). The stretch has the effect of enhancing low ratio values while compressing higher ratio values. As ratio values increase from 5 to 10 and 15, the corresponding NDVI values shift from 0.67 to 0.82 (20% increase), and 0.87 (6% increase). A further increase in the NIR/red ratio to a value of 20 yields very little change in the NDVI (0.90). The non-linear stretch has the effect of enhancing vegetation index values under low biomass conditions while compressing the NDVI values at high biomass conditions. This results in very low sensitivity to spatial and temporal variations in densely vegetated areas."
- **Wörtlich** (Abschnitt 2.2.9, Canopy structural effects):
  „Sellers (1985) calculated the variation of the NDVI with canopy greenness fractions and demonstrated how the presence of dry and dead plant material severely alters the relationship between NDVI and LAI. He showed the NDVI to vary greatly with leaf angle which alters the optical thickness of the canopy."
- **Wörtlich** (NASA Earth Observatory, ergänzend, gleiche Aussage in nicht-technischer Form):
  „The EVI data product also does not become saturated as easily as the NDVI when viewing rainforests and other areas of the Earth with large amounts of chlorophyll."
- **Deckt in BIOME:**
  - **Belegte Warnschwelle:** NDVI ist „an insensitive measure of LAI at values exceeding 2 or 3" — oberhalb LAI ≈ 2–3 ist der NDVI kein belastbares Maß für Biomasseunterschiede mehr. BIOME muss diese Grenze an jeder NDVI-Ausgabe anzeigen können.
  - **Belegte Zahlen zur Stauchung** (direkt in eine Oberflächen-Warnung übertragbar): NIR/Rot-Verhältnis 5 → NDVI 0,67; 10 → 0,82; 15 → 0,87; 20 → 0,90. Ab NDVI ≈ 0,8 bewirken große Änderungen der Vegetationsmenge nur noch minimale NDVI-Änderungen.
  - **Regel für BIOME:** NDVI-Differenzen im Bereich > 0,8 dürfen **nicht** als proportionale Biomasse- oder Vitalitätsänderung interpretiert werden. Eine Trendauswertung in dichter Vegetation (Waldbestände, geschlossene Kronendächer im Sommer) ist mit NDVI allein nicht verteidigbar.
  - **Zweite belegte Störgröße:** trockenes und totes Pflanzenmaterial sowie der Blattwinkel verändern die NDVI-LAI-Beziehung stark. BIOME darf NDVI-Werte verschiedener Bestandsstrukturen nicht direkt vergleichen.
- **Deckt ausdrücklich nicht:**
  - Einen exakten NDVI-Sättigungswert. Die Quelle nennt eine LAI-Schwelle (2–3) und beschreibt die Stauchung an Beispielverhältnissen, gibt aber **keine** normative NDVI-Grenze. Eine harte Zahl wie „NDVI sättigt ab 0,85" ist damit nicht belegt.
  - Aussagen zur Sättigung bei Drohnenaufnahmen, hochauflösenden Sensoren oder Einzelbäumen. Das ATBD betrachtet MODIS und AVHRR.
  - Der Beleg für die Alternative NDRE. Das ATBD nennt als sensitivere Alternativen den EVI und ein „green NDVI" — **nicht** NDRE.

### FE-RE-09 · Red Edge — welche Sentinel-2-Bänder das sind
- **Herausgeber:** ESA / Copernicus, SentiWiki; ergänzend der Bandkatalog des ASI-Projekts (siehe FE-RE-10)
- **Quelle:** https://sentiwiki.copernicus.eu/web/s2-mission · https://raw.githubusercontent.com/awesome-spectral-indices/awesome-spectral-indices/main/output/bands.json
- **Abgerufen:** 2026-08-09 (HTTP 200 / HTTP 200)
- **Wörtlich** (SentiWiki): „6 x 20 metre Bands: 4 narrow Bands in the VNIR vegetation red edge spectral domain (~704nm,~740nm, ~783nm and ~865nm)"
- **Wörtlich** (ASI-Bandkatalog, Einträge RE1/RE2/RE3, unverändert aus der JSON-Antwort):
  „RE1 :: {"common_name": "rededge071", "long_name": "Red Edge 1", "max_wavelength": 715, "min_wavelength": 695, "platforms": {"planetscope": {"band": "B7", "bandwidth": 16.0, "name": "Red Edge", "platform": "PlanetScope", "wavelength": 705.0}, "sentinel2a": {"band": "B5", "bandwidth": 15.0, "name": "Red Edge 1", "platform": "Sentinel-2A", "wavelength": 704.1}, "sentinel2b": {"band": "B5", "bandwidth": 15.0, "name": "Red Edge 1", "platform": "Sentinel-2B", "wavelength": 703.8}}, "short_name": "RE1"}"
  „RE2 :: … "long_name": "Red Edge 2", "max_wavelength": 750, "min_wavelength": 730, … "sentinel2a": {"band": "B6", "bandwidth": 15.0, … "wavelength": 740.5}, "sentinel2b": {"band": "B6", … "wavelength": 739.1}}"
  „RE3 :: … "long_name": "Red Edge 3", "max_wavelength": 795, "min_wavelength": 765, … "sentinel2a": {"band": "B7", "bandwidth": 20.0, … "wavelength": 782.8}, "sentinel2b": {"band": "B7", … "wavelength": 779.7}}"
- **Deckt in BIOME:**
  - **Abgeschlossene Liste der Sentinel-2-Red-Edge-Bänder: B5, B6, B7.** Alle drei liegen bei **20 m** Auflösung (FE-S2-02).
  - **Zentralwellenlängen** (aus FE-S2-01, S2A): B5 = 704,1 nm, B6 = 740,5 nm, B7 = 782,8 nm.
  - **Wellenlängenfenster, die BIOME als „Red Edge" akzeptieren darf** (ASI-Katalog): RE1 695–715 nm, RE2 730–750 nm, RE3 765–795 nm.
  - **Prüfregel für Sensoren:** Ein Sensor liefert nur dann ein Red-Edge-Band, wenn er einen Kanal mit Zentralwellenlänge in einem dieser Fenster besitzt.
- **Deckt ausdrücklich nicht:** Der SentiWiki-Text zählt B8A (~865 nm) mit zu den vier „narrow Bands in the VNIR vegetation red edge spectral domain". Der ASI-Katalog führt 865 nm dagegen als NIR (`N2`), nicht als Red Edge. **Die beiden Quellen widersprechen sich hier.** BIOME darf B8A deshalb nicht ohne Kennzeichnung als Red-Edge-Band führen.

### FE-RE-10 · NDRE — Formel und benötigte Bänder
- **Herausgeber:** „Awesome Spectral Indices" (ASI), maschinenlesbarer Katalog; publiziert und begutachtet als Montero, D. et al., „A standardized catalogue of spectral indices to advance the use of remote sensing in Earth system research", *Scientific Data* 10, 197 (2023), Open Access
- **Quelle:** https://raw.githubusercontent.com/awesome-spectral-indices/awesome-spectral-indices/main/output/spectral-indices-dict.json · Begleitpublikation: https://www.nature.com/articles/s41597-023-02096-0
- **Abgerufen:** 2026-08-09 (HTTP 200 / HTTP 200)
- **Wörtlich** (Katalogeintrag, unverändert aus der JSON-Antwort):
  „{"application_domain": "vegetation", "bands": ["N", "RE1"], "date_of_addition": "2021-05-13", "formula": "(N - RE1) / (N + RE1)", "long_name": "Normalized Difference Red Edge Index", "platforms": ["Sentinel-2"], "reference": "https://doi.org/10.1016/1011-1344(93)06963-4", "short_name": "NDREI"}"
- **Wörtlich** (zum Vergleich der NDVI-Eintrag desselben Katalogs):
  „{"application_domain": "vegetation", "bands": ["N", "R"], "formula": "(N - R)/(N + R)", "long_name": "Normalized Difference Vegetation Index", "platforms": ["Sentinel-2", "Landsat-OLI", "Landsat-TM", "Landsat-ETM+", "MODIS", "Planet-Fusion"], "reference": "https://ntrs.nasa.gov/citations/19740022614", "short_name": "NDVI"}"
- **Wörtlich** (Abstract der Begleitpublikation):
  „Here we present „Awesome Spectral Indices" (ASI), a standardized catalogue of spectral indices for Earth system research. ASI provides a comprehensive machine readable catalogue of spectral indices, which is linked to a Python library. ASI delivers a broad set of attributes for each spectral index, including names, formulas, and source references."
- **Herkunft der Referenz, über die Crossref-API aufgelöst** (https://api.crossref.org/works/10.1016/1011-1344(93)06963-4 , HTTP 200): Gitelson & Merzlyak, „Quantitative estimation of chlorophyll-a using reflectance spectra: Experiments with autumn chestnut and maple leaves", *Journal of Photochemistry and Photobiology B: Biology*, März 1994.
- **Deckt in BIOME:**
  - **Feld `ndre`:** dimensionslos, Formel `(NIR − RedEdge1) / (NIR + RedEdge1)`. Katalogname `NDREI`, Langname „Normalized Difference Red Edge Index".
  - **Zwingend benötigte Bänder: genau zwei — NIR und Red Edge 1.** Für Sentinel-2 also **B8 (oder B8A) und B5**. Ohne ein Band im Fenster 695–715 nm (FE-RE-09) ist NDRE nicht berechenbar.
  - **Bezugsfläche:** durch B5 (20 m) bestimmt, also 20 m × 20 m = 400 m².
  - **Plattformbindung:** Der Katalog nennt für NDREI ausschließlich `Sentinel-2`. Für andere Sensoren ist die Übertragbarkeit nicht durch diese Quelle gedeckt.
- **Deckt ausdrücklich nicht:**
  - **Einen Wertebereich, eine Skala oder Interpretationsklassen.** Der Katalog liefert Formel und Bänder, sonst nichts. Alle im Netz kursierenden NDRE-Interpretationsspannen („0,6–1 = gesunde reife Bestände") sind hier **nicht** belegt und dürfen in BIOME nicht angezeigt werden.
  - Die Primärquelle. Die im Katalog hinterlegte Referenz (Gitelson & Merzlyak 1994) liegt bei Elsevier und wurde nicht geöffnet — der Wortlaut der Originaldefinition ist damit nicht belegt (siehe „Nicht zugänglich").
  - Eine amtliche oder normative Definition von NDRE. **Eine solche habe ich nicht gefunden.** Der ASI-Katalog ist ein begutachteter, DOI-belegter Community-Katalog, keine Norm einer Raumfahrt- oder Vermessungsbehörde.

### FE-RE-11 · Eine RGN-Kamera (Rot, Grün, NIR) hat kein Red-Edge-Band und kann kein NDRE liefern
- **Herausgeber:** MAPIR Inc., Produkt-/Spezifikationsseite „Survey3 Cameras" (Herstellerdatenblatt)
- **Quelle:** https://www.mapir.camera/pages/survey3-cameras
- **Abgerufen:** 2026-08-09 (HTTP 200)
- **Wörtlich** (Filtertabelle „Camera Filter Model | Image Channels 1,2,3 | Spectrum Peaks", vollständig):
  „RGN | Red, Green, Near Infrared (NIR) | 660nm, 550nm, 850nm"
  „OCN | Orange, Cyan, Near Infrared (NIR) | 615nm, 490nm, 808nm"
  „NGB | Near Infrared (NIR), Green, Blue | 850nm, 550nm, 475nm"
  „RE | Red Edge | 725nm"
  „NIR | Near Infrared (NIR) | 850nm"
- **Wörtlich** (Tabelle „Spectrum Peak | Spectrum Width | Filter Model | Image Channel", vollständig):
  „475nm | 15nm | NGB | 3" · „490nm | 36nm | OCN | 2" · „550nm | 15nm | NGB, RGN | 2" · „615nm | 42nm | OCN | 1" · „660nm | 15nm | RGN | 1" · „725nm | 23nm | RE | 1" · „808nm | 50mm | OCN | 3" · „850nm | 30mm | NGB, RGN, NIR | 1,3,1"
- **Wörtlich** (Sensor und Kanalzahl):
  „Survey3 cameras contain a 12 megapixel (4000x3000px) 3-channel (bayer RGB) image sensor that records the reflected light in the scene. A special band-pass filter is installed over the image sensor which blocks all wavelengths of light other than those which the filter allows to pass through."
  „We offer 6 different filters for the Survey3 cameras: RGB, RGN, OCN, NGB, RE, and NIR."
  „The OCN & RGN filters are often used for indices such as NDVI, GNDVI, OSAVI, TVI, CVI, etc. The NGB filter is often used for the ENDVI index. We also provide a visible light color (RGB), rededge (RE) and near infrared (NIR) filter option."
- **Wörtlich** (Filterdurchlassangaben im Spezifikationsblock):
  „RGN (Red+Green+NIR): 550nm/660nm/850nm" · „Red-Edge (RE): 725nm"
- **Deckt in BIOME:**
  - **Beweis, direkt aus dem Herstellerdatenblatt:** Eine RGN-Kamera hat genau drei Kanäle mit den Spektralspitzen **660 nm (Rot), 550 nm (Grün), 850 nm (NIR)**. Keine dieser drei liegt in einem Red-Edge-Fenster (RE1 695–715 nm, RE2 730–750 nm, RE3 765–795 nm, FE-RE-09). Der Hersteller führt Red Edge (725 nm, Breite 23 nm) als **eigenen, separaten Filter** — er ist im RGN-Filter nicht enthalten.
  - **Harte Regel für die BIOME-Oberfläche:** Ist als Aufnahmegerät eine RGN-Kamera hinterlegt, muss das Feld `ndre` **gesperrt** sein. NDRE braucht zwingend ein Red-Edge-Band (FE-RE-10); eine RGN-Kamera liefert keines. Es gibt keine Umrechnung, kein Ersatzband und keine Näherung, die hier gedeckt wäre.
  - **Was eine RGN-Kamera belegbar kann:** Der Hersteller nennt wörtlich NDVI, GNDVI, OSAVI, TVI, CVI. BIOME darf für RGN also NDVI anbieten (Rot 660 nm, NIR 850 nm).
  - **Pflichtfeld `kamera_filter`** mit dem für dieses Gerät belegten Wertebereich {`RGB`, `RGN`, `OCN`, `NGB`, `RE`, `NIR`} und je Wert die zugehörigen Spektralspitzen und -breiten aus der obigen Tabelle. Die Indexliste ist aus diesem Feld abzuleiten, nicht frei wählbar.
  - **Nebenbefund, GSD-Beispiel aus demselben Datenblatt:** „Ground Sample Distance (GSD) | Survey3W: 5.5 cm/px (2.17in/px) at 120 m (~400 ft) AGL Survey3N: 2.3 cm/px (0.9in/px) at 120 m (~400 ft) AGL" — belegt die Kopplung GSD ↔ Flughöhe ↔ Optik (siehe FE-GSD-21).
  - **Nebenbefund, Kalibrierung:** „Reflectance Calibration | Channel separation and reflectance calibration using a photo of our calibration targets. Only RAW+JPG photos are supported. No video, USB/WIFI streaming video or JPGs are supported." — reine JPG-Aufnahmen sind für eine radiometrische Kalibrierung dieses Geräts nicht zulässig.
- **Deckt ausdrücklich nicht:**
  - Andere Hersteller. Der Beweis ist an diesem Datenblatt geführt. Für jede andere Kamera in BIOME muss die Bandliste einzeln belegt werden. Insbesondere gibt es Multispektralkameras **mit** Red-Edge-Band; „Drohnenkamera" allein sagt nichts aus.
  - Die spektralen Transmissionskurven (auf der Seite als „DATA DOWNLOAD" verlinkt, nicht abgerufen).
  - Zwei Werte in der Breitentabelle sind in der Quelle als „50mm" bzw. „30mm" ausgezeichnet, offenkundig ein Tippfehler für „nm". Ich habe sie unverändert übernommen und leite daraus keine Bandbreite ab.

### FE-CAL-12 · Radiometrische Kalibrierung mit kalibriertem Referenzpanel (Reflexionsstandard)
- **Herausgeber:** MicaSense (Hersteller der RedEdge-Kameras), offizielles Verarbeitungs-Repository `micasense/imageprocessing`, „MicaSense RedEdge Image Processing Tutorial 1"
- **Quelle:** https://raw.githubusercontent.com/micasense/imageprocessing/master/MicaSense%20Image%20Processing%20Tutorial%201.ipynb
- **Abgerufen:** 2026-08-09 (HTTP 200; Jupyter-Notebook, 20,8 KB)
- **Wörtlich** (Verarbeitungskette Rohbild → Radianz):
  „Any RedEdge workflow must include these common steps.
  1. Un-bias images by accounting for the dark pixel offset
  1. Compensate for imager-level effects
  1. Compensate for optical chain effects
  1. Normalize images by exposure and gain settings
  1. Convert to a common unit system (radiance)"
  „First, we get the darkPixel values. These values come from optically-covered pixels on the imager which are exposed at the same time as the image pixels. They measure the small amount of random charge generation in each pixel, independent of incoming light, which is common to all semiconductor imaging devices."
  „We get the parameters of the optical chain (vignette) effects and create a vignette map. This map will be multiplied by the black-level corrected image values to reverse the darkening seen at the image corners."
- **Wörtlich** (Radianz → Reflektanz über das Panel):
  „Now that we have a flat and calibrated radiance image, we can convert into reflectance. To do this, we will use the radiance values of the panel image of known reflectance to determine a scale factor between radiance and reflectance."
  „In this case, we have our MicaSense calibrated reflectance panel and its known reflectance of 49% in the band of interest. We will extract the area of the image containing the lambertian panel, determine it's radiance to reflectance scale factor, and then scale the whole image by that factor to get a reflectance image."
  Rechenweg, wörtlich aus dem Code: „panelReflectance = panelCalibration[bandName]" · „radianceToReflectance = panelReflectance / meanRadiance"
- **Wörtlich** (Qualitätsprüfung und Aufnahmeregeln für das Panelbild):
  „The area should have a very consistent reflectance. If a gradient or a high standard deviation (>3% absolute reflectance) is noticed across the panel area it is possible that the panel was captured under inconsistent lighting conditions (e.g. next to a wall or vehicle) or it was captured too close to the edge of the image where the optical calibration is the least accurate."
  „Reasons for a high standard deviation across a panel can include panel contamination or inconsistent lighting across the panel due to environmental conditions. Based on the context of the image, it is also clear that the user is taking the panel image facing the sun, which can cast reflected light from the operator's clothing on the panel and contaminate results. For this reason it is always best to capture panel images in an open area and with the operator's back to the sun."
- **Wörtlich** (Reichweite und Grenzen des Verfahrens):
  „In this tutorial we have found that we can read MicaSense RedEdge images and their metadata, and use python and OpenCV to convert those images to radiance and then to reflectance using the standard scientific field method of imaging a lambertian reflector. We have corrected for both the electro-optical effects of the sensor and optical chain, as well as the incident light at the time of capture."
  „In future tutorials, we will introduce the Downwelling Light Sensor (DLS) information into the calibration process in order to account for changing irradiance over time (e.g. such as clouds). However, since the panel method is straightforward and repeatable under constant illumination conditions, and is the standard scientific calibration method of surface reflectance, this process is useful and sufficient for many calibration needs."
  „In fact, reflectances higher than 100% are normal in specific cases of specular reflections."
- **Deckt in BIOME:**
  - **Verfahrensschritte, die ein BIOME-Erfassungsprotokoll für eine kalibrierte Drohnenbefliegung abfragen muss:** (1) Dunkelbildabzug, (2) Sensorkorrektur, (3) Vignettierungskorrektur, (4) Normierung auf Belichtungszeit und Verstärkung, (5) Umrechnung in Radianz, (6) Panelaufnahme, (7) Skalierung Radianz → Reflektanz.
  - **Pflichtfelder je Befliegung:** `panel_id`, `panel_reflektanz_je_band` (Wertebereich 0–1; im Beispiel 0,49 für alle fünf Bänder), `panel_bild_vor_flug` und/oder `panel_bild_nach_flug`, `panel_stdabw_reflektanz`.
  - **Belegte Annahmekriterien:** Standardabweichung über die Panelfläche **≤ 3 % absolute Reflektanz**. Panelbild in freier Umgebung, Bediener mit dem Rücken zur Sonne, Panel nicht am Bildrand.
  - **Belegter Rechenweg:** `Skalierungsfaktor = bekannte Panelreflektanz / mittlere Radianz in der Panelfläche`, danach Multiplikation des gesamten Bildes.
  - **Gültigkeitsgrenze, die BIOME durchsetzen kann:** Das reine Panelverfahren gilt laut Quelle „under constant illumination conditions". Bei wechselnder Bewölkung braucht es zusätzlich einen Downwelling Light Sensor. BIOME muss ein Feld `beleuchtungsbedingungen` führen und Ergebnisse ohne DLS bei wechselnder Bewölkung als eingeschränkt kennzeichnen.
  - **Plausibilitätsregel:** Reflektanzwerte > 1,0 (100 %) sind bei spiegelnden Flächen normal und dürfen nicht automatisch verworfen werden.
- **Deckt ausdrücklich nicht:**
  - Eine Norm. Dies ist Herstellerdokumentation für eine bestimmte Kameraserie, kein Regelwerk. Der Text bezeichnet das Verfahren selbst als „the standard scientific field method of imaging a lambertian reflector" — das ist eine Einordnung des Herstellers, keine Normreferenz.
  - Panelreflektanzwerte anderer Hersteller. Die 49 % im Beispiel sind der Wert **dieses konkreten Panels**; jedes Panel hat ein eigenes Kalibrierprotokoll.
  - Die MicaSense-Wissensdatenbank (`support.micasense.com`) — Zugriff verweigert, siehe „Nicht zugänglich".

### FE-CAL-13 · Sonnenstandskorrektur — die drei frei belegten Ausprägungen
- **Herausgeber:** (a) ESA/Copernicus SentiWiki; (b) NASA/NTRS, Rouse et al. 1974; (c) MicaSense, Quelltext `micasense/dls.py`
- **Quelle:** https://sentiwiki.copernicus.eu/web/s2-processing · https://ntrs.nasa.gov/api/citations/19740022614/downloads/19740022614.pdf · https://raw.githubusercontent.com/micasense/imageprocessing/master/micasense/dls.py
- **Abgerufen:** 2026-08-09 (HTTP 200 / HTTP 200 / HTTP 200)
- **Wörtlich** (a, Satellit, in die Produktdefinition eingebaut):
  „This conversion takes into account the equivalent extra-terrestrial solar spectrum (E s ), the incoming solar direction defined by its zenith angle (θ s ) for each pixel of the image and the absolute calibration (A k ) of the instrument MSI."
  „d(t) is the Sun-Earth distance variation and is computed based on Orekit flight dynamics library, using the Planetary and Lunar Ephemerides DE430"
  „θ s is the Sun zenith angle, determined at this level too."
- **Wörtlich** (b, historisches Verfahren, Rohwertkorrektur):
  „The radiance measured in each MSS band is computed from the ERTS CCT counts and corrected for seasonal sun angle differences by dividing the CCT value by the sine of the inclination angle of the sun. The correction procedure has been tested using measurements of temporally independent targets."
- **Wörtlich** (c, Drohne, Einstrahlungssensor — Kommentarblock im Quelltext, unverändert):
  „# from the current position (lat,lon,alt) tuple
  # and time (UTC), as well as the sensor orientation (yaw,pitch,roll) tuple
  # compute a sensor sun angle - this is needed as the actual sun irradiance
  # (for clear skies) is related to the measured irradiance by:
  # I_measured = I_direct * cos (sun_sensor_angle) + I_diffuse
  # For clear sky, I_direct/I_diffuse ~ 6 and we can simplify this to
  # I_measured = I_direct * (cos (sun_sensor_angle) + 1/6)"
  Sonnenstandsberechnung, wörtlich: „altitude = pysolar.get_altitude(position[0], position[1], utc_datetime)" · „azimuth = pysolar.get_azimuth(position[0], position[1], utc_datetime)"
- **Deckt in BIOME:**
  - **Belegte Eingangsgrößen einer Sonnenstandskorrektur:** Sonnenzenit- bzw. Sonnenhöhenwinkel, Sonnenazimut, Aufnahmezeitpunkt in UTC, geographische Position, bei Drohnen zusätzlich die Sensorlage (yaw/pitch/roll), sowie die Sonne-Erde-Distanz.
  - **Pflicht-Metadaten je Aufnahme in BIOME**, ohne die eine Sonnenstandskorrektur nicht nachvollziehbar ist: `aufnahmezeit_utc` (mit Zeitzone), `position_lat_lon`, `sonnenzenit_grad` bzw. `sonnenhoehe_grad`, `sonnenazimut_grad`, bei Drohnen `sensorlage_yaw_pitch_roll`.
  - **Für Sentinel-2 ist die Korrektur bereits im Produkt enthalten** (FE-S2-03). BIOME darf sie auf L1C/L2A **nicht** ein zweites Mal anwenden.
  - **Für Drohnenflüge ist die Korrektur nicht automatisch enthalten.** Sie erfolgt entweder über das Referenzpanel (FE-CAL-12) oder über einen Einstrahlungssensor mit der oben belegten Kosinus-Beziehung.
  - **Vergleichbarkeitsregel:** Aufnahmen mit stark unterschiedlichem Sonnenstand sind ohne dokumentierte Korrektur nicht vergleichbar. BIOME sollte den Sonnenstand bei jedem Vergleich zweier Termine anzeigen.
- **Deckt ausdrücklich nicht:**
  - Eine einheitliche, normative Formel. Die drei Quellen zeigen drei **verschiedene** Korrekturansätze (Sinus des Sonnenhöhenwinkels bei Rouse; Zenitwinkel in der Sentinel-2-Produktgleichung; Kosinus des Sensor-Sonne-Winkels plus Diffusanteil bei MicaSense). Eine „die" Sonnenstandskorrektur gibt es hier nicht.
  - Die Sentinel-2-Gleichung selbst (Bild, nicht extrahierbar — siehe FE-S2-03).
  - Der Faktor 1/6 im MicaSense-Modell gilt laut Quelltext ausdrücklich nur „For clear sky". Für bewölkten Himmel ist er nicht gedeckt.

### FE-CAL-14 · Amtliche Vorgaben für Radiometrie und Sonnenstand eines Bildflugs
- **Herausgeber:** Arbeitsgemeinschaft der Vermessungsverwaltungen der Länder der Bundesrepublik Deutschland (AdV), „Leitfaden zur Ausschreibung einer Luftbildbefliegung für die Zwecke der Landesvermessung", Version 1.7, Bearbeitungsstand 04.03.2026, veröffentlicht durch den AdV-Arbeitskreis Geotopographie am 28.04.2026; ergänzend AdV „Produkt- und Qualitätsstandard für Digitale Luftbilder des amtlichen deutschen Vermessungswesens", Version 4.2, Stand 04.03.2026
- **Quelle:** https://www.adv-online.de/sites/default/files/documents/2026-07/Leitfaden_zur_Ausschreibung__einer_Luftbildbefliegung_V1.7_2026-03-04.pdf · https://www.adv-online.de/sites/default/files/documents/2026-07/PQS_DOP_V4.2_2026-03-04.pdf (Übersichtsseite: https://www.adv-online.de/de/fachinformationen/standards-der-geotopographie)
- **Abgerufen:** 2026-08-09 (HTTP 200, 36 S. / HTTP 200, 32 S. / HTTP 200)
- **Wörtlich** (Leitfaden, C.4.1 „Sonnenstand"):
  „Die Bilder sind bei einem Sonnenstand von mindestens 30° über dem Horizont aufzunehmen. In Ausnahmefällen kann der Sonnenstand unterschritten werden. Bei einem höheren Sonnenstand verkürzen sich die Schatten, die Lichtverhältnisse werden besser, aber das Befliegungsfenster pro Tag wird eingeschränkt (insbesondere im zeitigen Frühjahr und späten Herbst). Der Sonnenstand von 25° sollte nicht unterschritten werden."
- **Wörtlich** (Leitfaden, C.3.1 „Verfahren der radiometrischen Korrektur beim Auftragnehmer"):
  „1) Das Bildmaterial ist in gleichbleibender, radiometrisch homogener Qualität für das Gebiet eines ganzen Bildfluges zu liefern. Dabei sind graue Objekte mit neutralen Grauwerten in den Lichtern, den Mitten und den Tiefen sicherzustellen."
  „3) Das Histogramm soll keine Lücken aufweisen und den vollen Grauwertbereich umfassen. Grundsätzlich sollen die Pixel mit dem niedrigsten und dem höchsten Grauwert nicht häufiger vorkommen als die Pixel der benachbarten Grauwerte, d.h. die Anzahl der hellen und dunklen Grauwerte am rechten und linken Rand der Histogramme soll stetig abnehmen. Ausnahmefälle, z. B. Reflexionen, sind davon ausgenommen."
  „2) Der NIR-Kanal ist nach dem im Angebot vom Auftragnehmer beschriebenen Verfahren entsprechend radiometrisch zu bearbeiten. Abweichungen hiervon bedürfen der Zustimmung des Auftraggebers."
  Länderbeispiel (Rheinland-Pfalz), wörtlich: „Der Infrarotkanal des RGBI-Bildes soll in Verbindung mit dem Rotkanal zur Detektion von Vegetation verwendet werden, daher ist beim Postprocessing auf die Beibehaltung des Verhältnisses dieser beiden Kanäle zu achten."
- **Wörtlich** (Leitfaden, C.1.8/C.1.9): „Die Aufnahme erfolgt als 4-Kanal-multispektral-Bild (RGBI)." · „Die Aufnahme erfolgt mit einer radiometrischen Auflösung von mindestens 12 Bit / Kanal."
- **Wörtlich** (Leitfaden, C.1.2 „Kalibrierung der Luftbildkamera"):
  „Die Kalibrierung der Kamera muss vom Auftragnehmer durch ein Kalibrierungszertifikat des Herstellers nachgewiesen werden."
  „Die Kalibrierung der Kamera darf zum Zeitpunkt des Bildfluges nicht länger als 2 Jahre zurückliegen. Nach jeder Veränderung, die Einfluss auf die Kalibrierung hat, ist erneut eine Kalibrierung, mindestens eine Selbstkalibrierung, durchzuführen."
  „Die Validierungsprüfung darf zum Zeitpunkt des Bildfluges nicht länger als 1 Jahr zurückliegen."
  „Nach längstens zwei mit Validierungsprüfungen überbrückten Jahren ist eine vollständige geometrische und radiometrische Kalibrierung durch den Kamerahersteller vorzunehmen."
  „Es erfolgt durch den Kamerahersteller eine geometrische und eine radiometrische Kalibrierung. Sie werden durch den Hersteller in einem Kalibrierungszertifikat nachgewiesen."
- **Wörtlich** (PQS Digitale Luftbilder 4.2, 3.5.2 „Bildflug, Aufnahmebedingungen"):
  „Standardbedingungen für Bildaufnahmen mit flugzeuggestützten Kameras sind:
  • Sonnenschein oder je nach Festlegung hochstehende geschlossene lichtdurchlässige Wolkendecke mit klarer Sicht zum Boden;
  • Sonnenstand in der Regel größer als 30° über Horizont; keine Wolken, Wolkenschatten oder Dunst in den Bildern;
  • Befliegungsgebiet frei von Hochwasser, Eis, Schnee und großflächigem Rauch."
- **Deckt in BIOME:**
  - **Pflichtfeld `sonnenstand_grad` je Bildflug** mit belegten Schwellen: Regelanforderung **≥ 30°**, absolute Untergrenze **25°**. Eine BIOME-Befliegung unterhalb 25° ist nach amtlichem Maßstab nicht regelkonform.
  - **Pflichtfeld `kalibrierung_datum` und `validierung_datum`** mit belegten Gültigkeitsfristen: Herstellerkalibrierung **max. 2 Jahre** alt, Validierungsprüfung **max. 1 Jahr** alt, spätestens nach zwei überbrückten Jahren vollständige Neukalibrierung. BIOME kann daraus eine harte Gültigkeitsprüfung bauen.
  - **Belegte Mindestwerte:** radiometrische Auflösung **≥ 12 Bit/Kanal** bei der Aufnahme; Spektralausprägung **RGBI** (4 Kanäle).
  - **Aufnahmebedingungen als Pflicht-Checkliste:** Sonnenschein oder hochstehende, geschlossene, lichtdurchlässige Wolkendecke; keine Wolken, Wolkenschatten oder Dunst im Bild; Gebiet frei von Hochwasser, Eis, Schnee, großflächigem Rauch.
  - **Regel für Vegetationsauswertung, wörtlich belegt:** Beim Postprocessing ist das Verhältnis von NIR- zu Rotkanal beizubehalten. Jede BIOME-Verarbeitungskette, die die Kanäle unabhängig streckt oder tonwertkorrigiert, zerstört den NDVI.
- **Deckt ausdrücklich nicht:**
  - **Ein Referenzpanel-Verfahren.** Die AdV-Dokumente kennen für den flugzeuggestützten Bildflug keine Referenzpanel-Kalibrierung im Feld; die radiometrische Kalibrierung erfolgt beim Kamerahersteller. Für Drohnen gilt FE-CAL-12.
  - Die inhaltlichen Anforderungen selbst: Der Leitfaden verweist für die Radiometrie ausdrücklich auf „DIN 18740-2:2005-02, Anhang D.2 und D.3" — diese Norm ist kostenpflichtig, siehe „Nicht zugänglich".
  - Rechtsverbindlichkeit. Der Leitfaden ist eine Ausschreibungshilfe („Bsp. NI", „Bsp. NW", „Bsp. TH" markieren Länderbeispiele, nicht bundesweite Vorgaben). BIOME darf ihn nicht als Rechtsnorm bezeichnen.

### FE-GEO-15 · Lagegenauigkeit als RMSE — die normative Definition
- **Herausgeber:** Federal Geographic Data Committee (FGDC), „Geospatial Positioning Accuracy Standards, Part 3: National Standard for Spatial Data Accuracy", FGDC-STD-007.3-1998
- **Quelle:** https://www.fgdc.gov/standards/projects/accuracy/part3/chapter3
- **Abgerufen:** 2026-08-09 (HTTP 200, PDF)
- **Wörtlich** (3.2.1 „Spatial Accuracy"):
  „The NSSDA uses root-mean-square error (RMSE) to estimate positional accuracy. RMSE is the square root of the average of the set of squared differences between dataset coordinate values and coordinate values from an independent source of higher accuracy for identical points."
  „Accuracy is reported in ground distances at the 95% confidence level. Accuracy reported at the 95% confidence level means that 95% of the positions in the dataset will have an error with respect to true ground position that is equal to or smaller than the reported accuracy value. The reported accuracy value reflects all uncertainties, including those introduced by geodetic control coordinates, compilation, and final computation of ground coordinate values in the product."
- **Wörtlich** (3.1.1 „Objective"):
  „The National Standard for Spatial Data Accuracy (NSSDA) implements a statistical and testing methodology for estimating the positional accuracy of points on maps and in digital geospatial data, with respect to georeferenced ground positions of higher accuracy."
- **Wörtlich** (Appendix 3-A „Accuracy Statistics (normative)"):
  „RMSEx = sqrt[ (x data, i - x check, i)2/n]"
  „RMSEy = sqrt[ (y data, i - y check, i)2/n]"
  „Horizontal error at point i is defined as sqrt[(x data, i - x check, i)2 +(y data, i - y check, i)2]. Horizontal RMSE is: RMSEr = sqrt[ ((x data, i - x check, i)2 +(y data, i - y check, i)2)/n] = sqrt[RMSEx2 + RMSEy 2]"
  „If RMSEx = RMSEy, RMSEr = sqrt(2*RMSEx2 ) = sqrt(2*RMSEy 2 ) = 1.4142*RMSEx = 1.4142*RMSEy"
  „It is assumed that systematic errors have been eliminated as best as possible. If error is normally distributed and independent in each the x- and y-component and error, the factor 2.4477 is used to compute horizontal accuracy at the 95% confidence level (Greenwalt and Schultz, 1968)."
  „Accuracyr = 2.4477 * RMSEx = 2.4477 * RMSEy = 2.4477 * RMSEr /1.4142" · „Accuracyr = 1.7308 * RMSEr"
- **Wörtlich** (3.2.2 „Accuracy Test Guidelines"):
  „A minimum of 20 check points shall be tested, distributed to reflect the geographic area of interest and the distribution of error in the dataset. When 20 points are tested, the 95% confidence level allows one point to fail the threshold given in product specifications."
  „Positional accuracy values shall be reported in ground distances."
- **Wörtlich** (3.2.3, Meldeformat): „Tested ____ (meters, feet) horizontal accuracy at 95% confidence level"
- **Deckt in BIOME:**
  - **Feld `lagegenauigkeit_rmse_m`:** Einheit Meter (Bodendistanz, nicht Pixel, nicht Maßstab), Wertebereich ≥ 0.
  - **Belegte Rechenvorschrift:** RMSEx und RMSEy je Achse; RMSEr = √(RMSEx² + RMSEy²).
  - **Pflicht-Begleitfelder:** Anzahl der Kontrollpunkte (**mindestens 20**), Herkunft der Referenzkoordinaten („independent source of higher accuracy"), Prüfgebiet.
  - **Umrechnung auf das 95-%-Niveau, wörtlich belegt:** `Accuracy_r = 1,7308 × RMSEr` (gilt nur bei RMSEx = RMSEy und normalverteiltem, unabhängigem Fehler). BIOME darf diese Umrechnung anbieten, muss aber die Voraussetzung mit anzeigen.
  - **Meldeformat für die Oberfläche:** „Geprüft: X m Lagegenauigkeit auf dem 95-%-Konfidenzniveau" — nicht „Genauigkeit X m" ohne Konfidenzangabe.
  - **Abgrenzung, die BIOME anzeigen muss:** RMSE misst gegen eine **unabhängige, genauere Referenz**. Ein RMSE aus den Restklaffungen der eigenen Passpunkte ist etwas anderes (siehe FE-GEO-16).
- **Deckt ausdrücklich nicht:**
  - Schwellenwerte. Der Standard sagt wörtlich: „This standard does not define threshold accuracy values." BIOME darf aus NSSDA keine Grenzwerte für „gut/schlecht" ableiten.
  - Vertikalgenauigkeit im Detail (hier nicht ausgewertet).
  - Ko-Registrierung zwischen zwei Bildern — NSSDA prüft gegen Bodenreferenz, nicht Bild gegen Bild. Dafür FE-GEO-16 und FE-GEO-17.

### FE-GEO-16 · RMSE absolut vs. relativ, Registrierung, Maximaltoleranz — Begriffsdefinitionen
- **Herausgeber:** Europäische Kommission, Joint Research Centre, Institute for the Protection and Security of the Citizen: Kapnias, D., Milenov, P., Kay, S., „Guidelines for Best Practice and Quality Checking of Ortho Imagery", Issue 3.0, EUR 23638 EN, 2008
- **Quelle:** https://publications.jrc.ec.europa.eu/repository/bitstream/JRC48904/10133.pdf
- **Abgerufen:** 2026-08-09 (per WebFetch HTTP 200, PDF 990 KB; direkter `curl`-Abruf wird von der JRC-WAF mit einer 244-Byte-Seite „Request Rejected" beantwortet, obwohl HTTP 200 gemeldet wird. Gegenprobe über einen Fremd-Spiegel mit identischem Dokumentkopf: HTTP 200, 610 KB.)
- **Wörtlich** (Glossar, Einträge unverändert):
  „RMS Error | The square root of the average of the squared discrepancies or residuals: (1/n) Σ d² where d is the measured discrepancy or residual in x, y or z. For small samples (n < 30) or if systematic error is present this is not the same as the standard deviation of the discrepancy." (Quellenangabe im Original: ASPRS 1989)
  „RMSE (Absolute) | RMSE based on check points obtained from a ground reference of recognised higher accuracy."
  „RMSE (Relative) | RMSE based on check points extracted from another geocoded image. In practice the RMSE of the GCP residuals is also used as a measure of relative error."
  „Registration | Rectification of an image to conform to another image."
  „Rectification | The process of resampling pixels of an image into a new grid which is referenced to a specific geographic projection, using a spatial transformation (matrix). The resampling is achieved through interpolation."
  „Maximum Tolerable Discrepancy | Defined as three times the RMSE of the check point sample: is used to help determine if a point can be considered as a blunder error."
  „Precision | The precision of a GCP or check point is the standard deviation of its position (in x, y and z) as determined from repeated trials under identical conditions. Precision indicates the internal consistency of a set of data and is expressed as the standard deviation. Note: Data can be precise yet inaccurate; precision is not used when comparing a set of data to an external reference, RMSE is used to express this."
  „Residual | A residual is the linear distance between a fixed reference point [ground control point] and the position determined by the transformation applied to the observed data to give a best fit to the reference points. Note: This is not the same as a discrepancy because the computed error of a residual is based only on the internal (statistical) consistency of a set of points and not on comparison to independent locations known to higher accuracy."
  „Pixel size | Distance represented by each pixel in an image or DEM in x and y components. Pixel size can be expressed as a distance on the ground or a distance on scanned hardcopy (e.g. microns). It is not a measure of resolution."
- **Wörtlich** (Abschnitt zur Blockausgleichung, Sollwerte):
  „Relative Block Accuracy | Block Adjustment from tie points and GCP … | RMSE ≤ 0.5 x input pixel size"
  „Absolute Block Accuracy | Block Adjustment from tie points and GCP … | RMSE ≤ 1/3 specification"
  „DEM height accuracy | … | 2 x planimetric 1-D RMSE required"
- **Wörtlich** (Prüfverfahren):
  „The operator identifies the location of each checkpoint on the image and enters this and the ‚true' co-ordinate in a table. A discrepancy is then calculated for each checkpoint together with an overall RMSE. These calculated values are then compared to the project tolerances and a ‚Pass' or ‚Fail' status applied to the final result."
  „The concept of maximum tolerable discrepancy is defined as three times the calculated RMSE."
- **Deckt in BIOME:**
  - **Definition Ko-Registrierung, wörtlich:** „Registration | Rectification of an image to conform to another image." Das ist der belegte Begriff für die Lagegleichheit zweier Bilder.
  - **Zwei getrennte Felder, die BIOME nicht vermischen darf:**
    `lagegenauigkeit_rmse_absolut_m` — gegen Bodenreferenz höherer Genauigkeit;
    `koregistrierung_rmse_relativ_m` — gegen ein anderes georeferenziertes Bild.
    Nur der zweite Wert beschreibt Ko-Registrierung.
  - **Belegte Ausreißerregel:** maximal tolerierbare Abweichung = **3 × RMSE** der Kontrollpunktstichprobe; darüber liegende Punkte sind Kandidaten für einen groben Fehler.
  - **Belegte Sollwerte für Blockausgleichungen:** relative Blockgenauigkeit RMSE ≤ 0,5 × Eingangspixelgröße.
  - **Begriffstrennung, die BIOME in der Oberfläche führen muss:** Residuum (interne Konsistenz) ≠ Diskrepanz (Vergleich mit unabhängiger Referenz); Präzision (Standardabweichung) ≠ Genauigkeit (RMSE gegen externe Referenz).
  - **Wichtige Klarstellung, wörtlich belegt:** Pixelgröße „is not a measure of resolution". BIOME darf Pixelgröße und Auflösung nicht gleichsetzen.
- **Deckt ausdrücklich nicht:** Aktualität. Das Dokument ist von 2008 und bezieht sich auf die Kontrolle von Orthobildern im EU-Agrarkontext. Sensorgenerationen und Toleranzen können überholt sein; die Begriffsdefinitionen sind davon unberührt.

### FE-GEO-17 · Ko-Registrierung als Sub-Pixel-Anforderung: rRMSE ≤ 0,5 Pixel
- **Herausgeber:** Committee on Earth Observation Satellites (CEOS), Land Surface Imaging Virtual Constellation (LSI-VC): „CEOS Analysis Ready Data For Land — Product Family Specification, Surface Reflectance (CARD4L-SR)", Version 5.0
- **Quelle:** https://ceos.org/ard/files/PFS/SR/v5.0/CARD4L_Product_Family_Specification_Surface_Reflectance-v5.0.pdf
- **Abgerufen:** 2026-08-09 (HTTP 200, PDF)
- **Wörtlich** (Abschnitt „Geometric Corrections", Einleitung):
  „Geometric corrections must place the measurement accurately on the surface of the Earth (that is, geolocate the measurement) allowing measurements taken through time to be compared."
- **Wörtlich** (Anforderung 4.1 „Geometric Correction", Threshold-Spalte):
  „Sub-pixel accuracy is achieved in relative geolocation, that is, the pixels from the same instrument and platform are consistently located, and in thus comparable, through time."
  „Sub-pixel accuracy is taken to be less than or equal to 0.5-pixel radial root mean square error (rRMSE) or equivalent in Circular Error Probability (CEP) relative to a defined reference image."
  „A consistent gridding/sampling frame is used, including common cell size, origin, and nominal sample point location within the cell (centre, ll, ur)."
- **Wörtlich** (Anforderung 4.1, Target-Spalte):
  „Sub-pixel accuracy is achieved relative to an identified absolute independent terrestrial referencing system (such as a national map grid). A consistent gridding/sampling frame is necessary to meet this requirement."
  „Note 1: This requirement is intended to enable interoperability between imagery from different platforms that meet this level of correction and with non-image spatial data such as GIS layers and terrain models."
- **Wörtlich** (Anforderung 1.8 „Geometric Accuracy of the Data", Target-Spalte):
  „The metadata includes metrics describing the assessed geodetic accuracy of the data, expressed units of the coordinate system of the data. Accuracy is assessed by independent verification (as well as internal model-fit where applicable). Uncertainties are expressed quantitatively, for example, as root mean square error (RMSE) or Circular Error Probability (CEP90, CEP95), etc."
- **Wörtlich** (Definitionstabelle):
  „Spatial Sampling Distance | Spatial sampling distance is the barycentre-to-barycentre distance between adjacent spatial samples on the Earth's surface."
  „Spatial Resolution | The highest magnification of the sensor at the ground surface."
- **Deckt in BIOME:**
  - **Belegte Schwelle für Ko-Registrierung einer Zeitreihe:** **rRMSE ≤ 0,5 Pixel** gegen ein definiertes Referenzbild. Bei Sentinel-2-10-m-Bändern also ≤ 5 m; bei einer Drohnenbefliegung mit 5 cm GSD ≤ 2,5 cm.
  - **Feld `koregistrierung_rrmse_pixel`** (dimensionslos, in Pixeln) plus abgeleitet `koregistrierung_rrmse_m`. Pflicht-Begleitfeld: das Referenzbild.
  - **Zusatzbedingung, wörtlich belegt:** ein einheitlicher Rasterrahmen — gleiche Zellgröße, gleicher Ursprung, gleiche nominale Lage des Abtastpunkts in der Zelle (Mitte / links unten / rechts oben). BIOME muss die Pixelanker-Konvention speichern; für Sentinel-2 L1C ist sie „upper left corner" (FE-S2-03).
  - **Belegter Unterschied zweier Genauigkeitsbegriffe:** *relative* Geolokalisierung (Bild gegen Bild, Zeitreihenfähigkeit) und *absolute* Geolokalisierung (gegen ein terrestrisches Referenzsystem). BIOME braucht beide Felder getrennt.
  - **Zulässige Ausdrucksformen der Unsicherheit, wörtlich:** RMSE oder Circular Error Probability (CEP90, CEP95).
- **Deckt ausdrücklich nicht:**
  - Eine Definition von „Ground Sample Distance". CEOS definiert **Spatial Sampling Distance** (Schwerpunkt-zu-Schwerpunkt-Abstand benachbarter Abtastungen) und **Spatial Resolution**, aber nicht GSD. Für GSD siehe FE-GSD-21.
  - Verfahren zur Messung der Ko-Registrierung. Die Spezifikation setzt Schwellen, beschreibt aber kein Messverfahren.

### FE-GEO-18 · INSPIRE Orthoimagery — RMSE als Datenqualitätsmaß und die Regel RMSE ≤ GSD
- **Herausgeber:** Europäische Kommission, INSPIRE Thematic Working Group Orthoimagery: „D2.8.II.3 Data Specification on Orthoimagery – Technical Guidelines", v3.0
- **Quelle:** https://inspire-mif.github.io/technical-guidelines/data/oi/dataspecification_oi.pdf
- **Abgerufen:** 2026-08-09 (HTTP 200, 6,8 MB PDF)
- **Wörtlich** (7.1.2 „Positional accuracy – Gridded data position accuracy", Recommendation 14):
  „Gridded data position accuracy should be evaluated and documented using root mean square error of planimetry or root mean square error in X or Y as specified in the tables below."
- **Wörtlich** (Maßdefinition, Tabelle):
  „Name: Root mean square error of planimetry · Alternative name: RMSEP · Data quality element: Positional accuracy · Data quality sub-element: Absolute or external accuracy · Definition: radius of a circle around the given point, in which the true value lies with probability P · … yields the linear root mean square error of planimetry RMSEP = σ · Source reference: ISO/DIS 19157 Geographic information – Data quality · Measure identifier: 47 (ISO/DIS 19157)"
  „Name: Root mean square error in X or Y · Alternative name: RMSE-x or RMSE-y · Data quality element: Positional accuracy · Data quality sub-element: Absolute or external accuracy · … yields the linear root mean square error RMSE-x = σx … yields the linear root mean square error RMSE-y = σy"
- **Wörtlich** (Anforderungsliste an beitragende Orthobilddatensätze, Auszug, unverändert):
  „• Solar elevation ≥ 40°."
  „• Ground Sample Distance (GSD) at least 0.5 m."
  „• Radiometric resolution at least 8 bits per band."
  „• Geodetic Reference System in ETRS89."
  „• Cartographic projection UTM in the corresponding UTM zone."
  „• Positional accuracy, RMSE ≤ GSD"
- **Wörtlich** (Kapitel zur Zusammenführung von Datensätzen):
  „• Spatial resolutions (i.e. Ground Sample Distances) must be strictly identical."
  „• Grid points (i.e. pixels) must be aligned."
- **Deckt in BIOME:**
  - **Belegte Faustregel für Orthobilder:** `Lagegenauigkeit (RMSE) ≤ GSD`. Ein Orthobild mit 20 cm GSD darf höchstens 20 cm RMSE haben. BIOME kann daraus eine Plausibilitätsprüfung bauen.
  - **Belegte Bedingung für die Zusammenführung zweier Bilddatensätze:** identische GSD **und** deckungsgleiche Rasterpunkte. BIOME darf Raster unterschiedlicher GSD nicht ohne dokumentiertes Resampling überlagern.
  - **Belegte Maßnamen für Metadatenfelder:** `RMSEP` (planimetrischer RMSE, ISO-19157-Maßkennung 47), `RMSE-x`, `RMSE-y`. Datenqualitätselement „Positional accuracy", Unterelement „Absolute or external accuracy".
  - **Weitere belegte Mindestanforderungen** an in INSPIRE einfließende Orthobilder: Sonnenhöhe ≥ 40°, GSD mindestens 0,5 m, radiometrische Auflösung ≥ 8 Bit/Band, ETRS89, UTM.
- **Deckt ausdrücklich nicht:**
  - Die Formeln zu RMSEP und RMSE-x/y. Sie stehen in der Quelle als Bilder und waren in der Textebene nicht abrufbar; belegt sind nur Name, Definition und die Gleichsetzung mit σ.
  - Eine Definition von GSD (die Spezifikation benutzt den Begriff, definiert ihn aber nicht in ihrer Begriffsliste — dort stehen nur band, mosaic, orthoimage aggregation, raster, seamline, tiling).
  - Die zugrunde liegende Norm ISO 19157 selbst — kostenpflichtig, siehe „Nicht zugänglich".

### FE-GEO-19 · Amtliche deutsche Genauigkeitsklassen: orientierte Luftbilder LB1–LB4, Orthophoto σxy
- **Herausgeber:** AdV, „Produkt- und Qualitätsstandard für Digitale Luftbilder des amtlichen deutschen Vermessungswesens", Version 4.2, Stand 04.03.2026; AdV, „Produkt- und Qualitätsstandard für Digitale Orthophotos", Version 4.1, Stand 05.06.2020
- **Quelle:** https://www.adv-online.de/sites/default/files/documents/2026-07/PQS_DOP_V4.2_2026-03-04.pdf · https://www.adv-online.de/sites/default/files/documents/2026-04/PQS_DOP.pdf
- **Abgerufen:** 2026-08-09 (HTTP 200 / HTTP 200)
- **Wörtlich** (PQS Digitale Luftbilder 4.2, 3.6.3 „Geometrische Genauigkeit", Tabelle „Genauigkeitsklasse (1σ) | Genauigkeitsangabe Lage | Bemerkung", vollständig):
  „LB1 | - | Bildmitte (X,Y) genähert"
  „LB2 | 3-fache Bodenpixelgröße | z. B. als Ergebnis der direkten Georeferenzierung"
  „LB3 | 2-fache Bodenpixelgröße | als Ergebnis einer Aerotriangulation"
  „LB4 | 1-fache Bodenpixelgröße | als Ergebnis einer Aerotriangulation"
  „Eine Aussage zu den erreichbaren Höhengenauigkeiten ist von den zugrundeliegenden Befliegungsparametern (z. B. Kamera, Längs- und Querüberdeckung) abhängig und kann mit dem 2 – 3-fachen Wert der Lagegenauigkeit angenommen werden."
  „Die Qualität der äußeren Orientierung muss sicherstellen, dass die Standardabweichung der Lagekoordinaten berechneter Bodenpunkte nicht größer als das 0,5-fache der festgelegten Standardabweichung σXY der georeferenzierten Lagekoordinaten des Orthophotos ist."
  „Für die Ableitung von ATKIS-DOP sind daher Orientierungsparameter der Genauigkeitsklasse LB4 erforderlich."
- **Wörtlich** (PQS Digitale Orthophotos 4.1, 3.5.1 „Geometrische Genauigkeit"):
  „ATKIS-DOP besitzen eine Standardabweichung σxy der georeferenzierten Lagekoordinaten von: σxy(DOP40): ± 0,8 m · σxy(DOP20): ± 0,4 m"
- **Wörtlich** (PQS DOP 4.1, Anlage „Anforderungen an die Qualitätssicherung", Lagegenauigkeit):
  „Für die Prüfung der Lagegenauigkeit in einem Orthophotomosaik werden unabhängig bestimmte Kontrollpunkte, die auf der Erdoberfläche (DGM) liegen und in geeigneter Anzahl gleichmäßig verteilt sind, verwendet. Die Standardabweichung der Sollwerte der Kontrollpunkte soll das 0,5-fache der festgelegten Standardabweichung σXY des Orthophotos nicht überschreiten. Der maximal zulässige Abstand zwischen den Kontrollpunkten soll 1/10 der längsten Blockdiagonalen betragen. Bei einem rechteckigen Projektgebiet sollte jeder Quadrant mindestens 20 % der Kontrollpunkte beinhalten."
  „Die maximale Differenz zwischen Ist- und Sollkoordinaten in den Kontrollpunkten darf den zweifachen Wert der Standardabweichung σXY des Orthophotos nicht überschreiten."
- **Wörtlich** (PQS DOP 4.1, 3.1 „Produkte" und 2 „Definition"):
  „Die Produkte der Produktgruppe DOP werden nach ihrer Bodenauflösung (Ground Sample Distance (GSD)) unterschieden. Digitales Orthophoto Bodenauflösung 20 cm ATKIS-DOP20 · Digitales Orthophoto Bodenauflösung 40 cm ATKIS-DOP40"
  „Digitale Orthophotos (DOP) sind grundsätzlich verzerrungsfreie und maßstabsgetreue Rasterdaten photographischer Abbildungen der Erdoberfläche. Sie werden aus orientierten Luftbildern und einem Digitalen Höhenmodell abgeleitet. Wird ein Geländemodell verwendet, entsteht ein klassisches Orthophoto, bei Verwendung eines bildbasierten Oberflächenmodells ein True Orthophoto (TrueDOP)."
- **Wörtlich** (AdV-Leitfaden Bildflug, C.7.3 „Zielgenauigkeit"):
  „Genauigkeit der direkten Georeferenzierung (vor AT) unter Verwendung der GNSS-/INS-Daten; Messung aller Kontrollpunkte; Standardabweichung ≤ 0,5 m für Lage und Höhe"
  „Genauigkeit der AT unter Verwendung der ausgeglichenen Orientierungsdaten; Messung aller Kontrollpunkte; Standardabweichung ≤ 0,2 m für Lage und ≤ 0,4 m für Höhe für die Herstellung von DOP20"
- **Deckt in BIOME:**
  - **Feld `orientierungsgenauigkeit`** mit dem abgeschlossenen Wertebereich {`LB1`, `LB2`, `LB3`, `LB4`} und der jeweils belegten Bedeutung. Für die Ableitung amtlicher Orthophotos ist LB4 Pflicht.
  - **Belegte Lagegenauigkeiten deutscher Orthophotos:** DOP20 σxy = ±0,4 m; DOP40 σxy = ±0,8 m. Eine BIOME-Auswertung auf DOP20 darf keine Lagegenauigkeit besser als 0,4 m behaupten.
  - **Belegte Prüfvorschrift für die Lage:** unabhängige Kontrollpunkte auf der Geländeoberfläche, gleichmäßig verteilt, max. Abstand 1/10 der längsten Blockdiagonalen, je Quadrant ≥ 20 % der Punkte, Sollwerte mindestens doppelt so genau wie das Produkt; maximale Einzelabweichung ≤ 2 σXY.
  - **Wichtige Einheitenwarnung:** Die AdV rechnet in **Standardabweichung σ (1σ)**, die FGDC/CEOS/INSPIRE-Welt in **RMSE** (FE-GEO-15 bis 18). Der JRC-Leitfaden hält wörtlich fest, dass RMSE bei kleinen Stichproben oder systematischen Fehlern nicht dasselbe ist wie die Standardabweichung. **BIOME darf σ-Werte und RMSE-Werte nicht in dasselbe Feld schreiben** und nicht ohne Kennzeichnung ineinander umrechnen.
- **Deckt ausdrücklich nicht:** die Höhengenauigkeit (nur als Faustregel 2–3-facher Lagewert benannt); Genauigkeitsangaben für TrueDOP über das oben Zitierte hinaus; die zugrunde liegenden Normen DIN 18740-3 und DIN 18740-6 (kostenpflichtig).

### FE-BF-20 · Metadaten eines Bildflugs — die amtliche Luftbildinformationsdatei
- **Herausgeber:** AdV, „Produkt- und Qualitätsstandard für Digitale Luftbilder des amtlichen deutschen Vermessungswesens", Version 4.2, Stand 04.03.2026, Beschluss GT 2026/02 der 43. Tagung des AdV-Arbeitskreises Geotopographie
- **Quelle:** https://www.adv-online.de/sites/default/files/documents/2026-07/PQS_DOP_V4.2_2026-03-04.pdf
- **Abgerufen:** 2026-08-09 (HTTP 200, 32 S. PDF)
- **Wörtlich** (Abschnitt 4, Einleitung):
  „Die den Datensatz allgemein beschreibenden Metadaten werden im Metainformationssystem der AdV durch die für die Landesvermessung zuständigen Stellen gepflegt. Darüber hinaus werden mit jeder Datenlieferung begleitende Luftbildinformationen bereitgestellt, die wesentliche Angaben zur Aktualität und zum Inhalt der gelieferten digitalen Luftbilder beinhalten."
- **Wörtlich** (4.1.1 „Angaben für den gesamten Datensatz", vollständig — Schlüsselwort · Bedeutung):
  „Land | Vollständiger Name des Bundeslandes"
  „Eigentuemer | Vollständiger Name des Eigentümers (freie Textzeile)"
  „Aktualitaet_Luftbildinformationen | Datum der Generierung der Luftbildinformationen (JJJJ-MM-TT)"
  „Version_Standard | Versionsnummer des zugrunde liegenden Standards, nach dem die Luftbildinformationen erstellt wurden"
- **Wörtlich** (4.1.2 „Angaben je Luftbild", vollständige Feldliste in Standardreihenfolge):
  „Luftbildname | Name der Luftbilddatei (freie Textzeile)"
  „Aktualitaet | Datum der Luftbildaufnahme (Format: JJJJ-MM-TT)"
  „Erfassungsmethode | Angabe über Befliegungsverfahren. Mögliche Angaben: 0 (Digitaler Bildflug, Dig. Messbild nach DIN 18740-4) 1 (Analoger Bildflug, Dig. Luftbild aus Analog-Digital-Wandlung nach DIN 18740-2) 2 (Analoger Bildflug, Dig. Luftbild aus Analog-Digital-Wandlung ohne Berücksichtigung der DIN 18740-2)"
  „Bildflugnummer | Eindeutige Bezeichnung des Befliegungsprojektes (freie Textzeile) Bsp.: 200809 Oschersleben"
  „Flugstreifen | Nummer des Flugstreifens (Integer)"
  „Bildnummer | Nummer des Luftbildes (Integer)"
  „Bildmassstabszahl | Bildmaßstab bei Analogbildflug (Integer), Bsp.: 14000"
  „Kamera_Sensor | Kurzbezeichnung der Kamera incl. Seriennr. (freie Textzeile) Bsp.: UC-Eagle-1-70815170-f100"
  „Kamera_Version | Versionsnummern der Firm- und Hardware Bsp.: FW_X.Y/HW_X.Z"
  „Kamera_Kalibrierung | Datum der letzten geometrischen und radiometrischen Kalibrierung oder der letzten geometrischen Selbstkalibrierung (Format: JJJJ-MM-TT)"
  „Kamera_Validierung | Datum der letzten geometrischen Validierung (Format: JJJJ-MM-TT)"
  „Prozessierung_Version | Name und Versionsnummer der eingesetzten Prozessierungssoftware"
  „Kalibrierprotokoll_Kamera | Angabe zur Verfügbarkeit des Kalibrierprotokolls der Kamera. Mögliche Angaben: 0 (Kalibrierprotokoll nicht vorhanden) 1 (Kalibrierprotokoll vorhanden)"
  „Bildhauptpunkt_der_Kamera_[PPA]_in_x-Richtung | Angabe des PPA-Wertes in [mm]"
  „Bildhauptpunkt_der_Kamera_[PPA]_in_y-Richtung | Angabe des PPA-Wertes in [mm]"
  „Bodenpixelgroesse | Bodenpixelgröße bei digitalen Luftbildern in [cm]. Bei analogen Luftbildern kann die Bodenauflösung oder der Wert „0" geführt werden."
  „Spektralkanaele | Kombination der Spektralkanäle. Mögliche Angaben sind: RGB RGBI CIR PAN"
  „Kammerkonstante | Brennweite der Kamera in [mm]"
  „Koordinatenreferenzsystem_Lage | EPSG-Code des Bezugssystems (Integer), Bsp.: 25832 (ETRS89/UTM Zone 32 ohne Zonenkennung)"
  „Koordinatenreferenzsystem_Hoehe | EPSG-Code des Bezugssystems (Integer), Bsp.: 7837 (DHHN2016)"
  „Orientierungsgenauigkeit | Klasse der Genauigkeit für die stereoskopische Lage- und Höhenauswertung (s. Abschnitt 3.6.3) [Integer]; Bsp: LB4 → 4"
  „Geometrische_Aufloesung | Pixelauflösung des digitalen Luftbildes bzw. des gescannten analogen Luftbildes [µm] Bsp.: 7.5"
  „Bildmitte_Rechts | Koordinate der Bildmitte als mind. ganzzahliger Meterwert in [m] Bsp.: 554123"
  „Bildmitte_Hoch | Koordinate der Bildmitte als mind. ganzzahliger Meterwert in [m], Bsp.: 5912345"
  „Anzahl_Spalten | Anzahl der Pixelspalten des digitalen Luftbildes bzw. des gescannten analogen Luftbildes in Flugrichtung (Integer)"
  „Anzahl_Zeilen | Anzahl der Pixelzeilen des digitalen Luftbildes bzw. des gescannten analogen Luftbildes quer zur Flugrichtung (Integer)"
  „Farbtiefe | Angabe der Farbtiefe (bit / Kanal), Bsp.: 8 / 16"
  „Dateiformat | Angaben des Datenformats. Mögliche Angaben sind: TIFF JPEG2000 ECW"
  „Kompression | Angabe, ob die Daten komprimiert wurden. Mögliche Angaben sind: 0 (Nein) 1 (Ja)"
  „Komprimierung | Textfeld mit ergänzenden Angaben zur Komprimierung … Mindestangaben: Kompressionsalgorithmus (z. B. JPEG2000), Verwendete Software incl. Versionsnr., Komprimierungsgrad (z. B. 25)"
  „Belaubungszustand | Angabe über den Belaubungszustand. Mögliche Angaben: 0 keine Angabe 1 unbelaubt 2 teilbelaubt 3 vollbelaubt"
  „Bemerkungen | Optionale Angaben, z. B. zu Qualitätseinschränkungen (freie Textzeile) Bsp.: Wolke"
- **Wörtlich** (Fußnoten zur Datumsangabe und zur Bezugsgröße):
  „Ist eine Datumsangabe mit Tagesgenauigkeit aus technischen oder inhaltlichen Gründen nicht möglich, kann bei den Angaben je Erfassungseinheit eine Datumsangabe JJJJ-MM mit Monatsgenauigkeit erfolgen. Eine ausschließliche Jahresangabe ist nicht ausreichend."
  „Bei Digitalkameras ist die Angabe auf den geometriegebenden i.d.R. panchromatischen Kanal zu beziehen."
  „Wert „9999", wenn nicht bekannt"
- **Wörtlich** (4.2.1 „Dateiformat, Dateibezeichnung"):
  „Die Luftbildinformationen zu einzelnen digitalen Luftbildern werden als separate ASCII-Datei geführt. Sie werden mit den in Abschnitt 4.1 genannten Schlüsselwörtern gelistet. Ein Doppelpunkt mit anschließendem Leerzeichen dient als Trennzeichen. Die ASCII-Datei trägt den Namen des Luftbildes und die Endung *.meta"
  „Luftbildinformationen zu mehreren digitalen Luftbildern können zu einer CSV-Datei zusammengeführt werden, die ab der siebten Zeile aus jeweils einer Zeile für jedes DLB besteht, in der das Semikolon als Trennzeichen dient. Die Datei erhält die Bezeichnung „lb_<land>_jjjjmmtt_hhmmss.csv"."
- **Wörtlich** (Anlage 2, echter Beispieldatensatz, unverändert):
  „lb_202209_14_688.tif;2022-05-10;0;202209 Oschersleben;14;688;0;UltraCamX UCX-SX-1-60911016;FW_2.4/HW_4.5;2021-04-14;2022-03-22;Ultramap V4;1;0.9;-0.2;20;RGBI;100.5;25833;7837;4;7.2;652032;5766539;14430;9420;8;TIFF;0;;3;vereinzelt Wolkenschatten"
- **Deckt in BIOME:**
  - **Vollständige, amtlich belegte Feldliste für den Datensatz `bildflug_metadaten`.** BIOME kann diese Liste 1:1 als Pflicht-/Optionalfelder übernehmen; sie ist die einzige mir zugängliche amtliche Metadatenvorgabe für Bildflüge.
  - **Belegte Einheiten:** Bodenpixelgröße in **cm**; Kammerkonstante und PPA in **mm**; geometrische Auflösung in **µm**; Bildmittenkoordinaten in **m**; Farbtiefe in **bit/Kanal**.
  - **Belegte Wertelisten (abgeschlossen):**
    `Erfassungsmethode` {0, 1, 2}; `Spektralkanaele` {RGB, RGBI, CIR, PAN}; `Dateiformat` {TIFF, JPEG2000, ECW}; `Kompression` {0, 1}; `Kalibrierprotokoll_Kamera` {0, 1}; `Orientierungsgenauigkeit` {1, 2, 3, 4} entsprechend LB1–LB4; **`Belaubungszustand` {0 = keine Angabe, 1 = unbelaubt, 2 = teilbelaubt, 3 = vollbelaubt}**.
  - **Der `Belaubungszustand` ist der direkte Anschluss an die Vegetationsdomäne:** Ein Bildflug ohne diese Angabe ist für eine Vegetationsauswertung in BIOME nicht verwertbar, und Aufnahmen unterschiedlichen Belaubungszustands dürfen nicht in derselben Zeitreihe verglichen werden.
  - **Belegte Datumsregel:** Format JJJJ-MM-TT; monatsgenau nur ausnahmsweise; **eine reine Jahresangabe ist ausdrücklich nicht ausreichend**. BIOME darf `aufnahmedatum` nicht als Jahreszahl führen.
  - **Belegter Fehlwertcode:** `9999` für „nicht bekannt" bei Kamera_Sensor, Kammerkonstante und PPA. BIOME muss ihn als Fehlwert erkennen und darf ihn nicht als Zahl verrechnen.
  - **Belegter Bezugskanal:** Bodenpixelgröße und Brennweitenangaben beziehen sich auf den geometriegebenden, i. d. R. panchromatischen Kanal — nicht auf den NIR-Kanal.
- **Deckt ausdrücklich nicht:**
  - Sonnenstand, Wetter, Flughöhe und Überdeckung. Diese Angaben stehen **nicht** in der Luftbildinformationsdatei, sondern im Operateursbericht (FE-BF-21). BIOME braucht beide Quellen.
  - Rechtsverbindlichkeit: Der Standard bezeichnet sich selbst als Empfehlung — „Der vorliegende Produkt- und Qualitätsstandard … soll als Empfehlung und Hilfestellung bei der Erzeugung von Luftbildern zur Ableitung definierter AdV-Produkte dienen."
  - Drohnenbefliegungen. Der Standard gilt wörtlich für Luftbilder, die „aus Flugzeugen mit Luftbildkameras in Nadirrichtung aufgenommen" werden und Kameras nach DIN 18740-4 voraussetzen.

### FE-BF-21 · Metadaten eines Bildflugs — Operateursbericht, Orientierungsparameter, Lieferumfang
- **Herausgeber:** AdV, „Leitfaden zur Ausschreibung einer Luftbildbefliegung für die Zwecke der Landesvermessung", Version 1.7, Bearbeitungsstand 04.03.2026
- **Quelle:** https://www.adv-online.de/sites/default/files/documents/2026-07/Leitfaden_zur_Ausschreibung__einer_Luftbildbefliegung_V1.7_2026-03-04.pdf
- **Abgerufen:** 2026-08-09 (HTTP 200, 36 S. PDF)
- **Wörtlich** (C.6.3 „Datenlieferung", Ziffer 9 „Operateursbericht / Bildflugprotokoll im PDF- oder Excel-Format", vollständige Inhaltsliste):
  „• Bildflugnummer, Streifen- und Luftbildnummernbereich
  • Aufnahmedatum, Aufnahmezeit, Zeitzone zu Beginn und Ende jedes Fluges
  • Sonnenstand zu Beginn und Ende jedes Fluges
  • Flugzeug, Besatzung
  • Flughöhe, Fluggeschwindigkeit
  • Luftbildkamera incl. Seriennummer, Objektiv, Brennweite
  • Belichtungszeit, Blende, Filter
  • Angaben zu Wetter, Sichtweite, Bewölkung
  • Längs- und Querüberdeckung
  • Besonderheiten und Abweichungen. (z. B. Flugunterbrechungen mit Begründung)
  • zusätzlich ist das Originalprotokoll aus dem Bildflug in Kopie zu übergeben."
- **Wörtlich** (C.6.3, Ziffer 7 „Orientierungsparameter"):
  „• Bildflug-, Streifen-, Bild-Nummer
  • GNSS-Zeit
  • Rechtswert, Hochwert, Höhe in [zu spezifizierendem Bezugssystem Lage/Höhe, Angabe EPSG-Code]
  • Omega / Phi / Kappa"
  „Weitere mögliche Inhalte: • Principal Point (PPA) in x-/y-Richtung • Aufnahmedatum • Kameraname, Seriennummer der Kamera"
- **Wörtlich** (C.6.3, weitere Lieferbestandteile):
  „3) Dokumentation zur Kalibrierung der Kamera im PDF-Format … - vollständiges Kalibrierungszertifikat (Langversion) der Kamera - Feld-Kalibrierungszertifikat des Kameraherstellers bei Selbstkalibrierung - Protokoll lt. Anlage 1 bei Validierungsprüfung"
  „4) Dokumentation der Kalibrierung der inertialen Messeinheit im PDF-Format"
  „5) Differenzwinkel zwischen dem Rahmen des Inertialsensors und der Kamera („misalignement angles")"
  „6) GNSS-Antennen-Offset in mm-Genauigkeit"
  „11) Metadatendatei / Luftbildinformationsdatei (csv-Version) pro Bildflug nach AdV-Produkt- und Qualitätsstandard für Digitale Luftbilder in der aktuellen Version"
  „12) Nennung von Hersteller und Version der verwendeten Post-Processing-Software für die Herstellung der Luftbilder"
  „13) Bildmittenübersicht im shape- oder pdf-Format: Aufnahmen verschiedener Bildflugtage sind in den Bildmittenübersichten farblich differenziert zu kennzeichnen."
  „14) Abschlussbericht pro Bildfluggebiet mit allen geforderten Nachweisen und Angaben"
- **Wörtlich** (E.1 „Mindestabnahmekriterien", 1.3 Kalibrierzertifikate — inhaltliche Prüfpunkte):
  „• Kalibrierung und Validierung • Fluganordnung • Kontroll- und Passpunktverteilung • Verzeichnungswerte in den Bildecken • Auflösungsvermögen der Kamera • spektrale Empfindlichkeit • Anzahl der detektierten defekten Pixel • Dokumentation (Datensatz) der Selbstkalibrierung, sofern durchgeführt"
- **Wörtlich** (E.1.6 „Metadaten"): „Vollständigkeit und Inhalt gemäß Leistungsbeschreibung"
- **Wörtlich** (C.1.10 „Längs-/Querüberdeckung"):
  „1) Es ist eine Längsüberdeckung von mindestens 60 % und eine Querüberdeckung von mindestens 30 % einzuhalten. Für die Erstellung von TrueDOP ist eine Längsüberdeckung von mindestens 80 % und eine Querüberdeckung von mindestens 50 %, in urbanen Gebieten von mindestens 60 %, anzuhalten."
- **Wörtlich** (C.1.7 „Bodenauflösung"):
  „1) Es ist eine originäre Bodenauflösung für den geometriegebenden Kanal (z. B. panchromatischen Kanal) von mind. 0,20 m einzuhalten.
  2) Die geforderte Bodenauflösung darf bezogen auf das Gelände des gesamten Bildfluggebiets nicht überschritten werden und gilt damit auch für den tiefsten Geländepunkt des Bildfluggebietes."
- **Deckt in BIOME:**
  - **Zweiter, amtlich belegter Metadatenblock für einen Bildflug** — der flugbezogene, ergänzend zum bildbezogenen aus FE-BF-20. BIOME kann daraus die Tabelle `bildflug` (je Flug) neben `luftbild` (je Bild) modellieren.
  - **Pflichtfelder je Flug, wörtlich belegt:** Bildflugnummer, Streifen- und Bildnummernbereich, Aufnahmedatum, **Aufnahmezeit mit Zeitzone zu Beginn und Ende**, **Sonnenstand zu Beginn und Ende**, Flughöhe, Fluggeschwindigkeit, Kamera mit Seriennummer/Objektiv/Brennweite, Belichtungszeit, Blende, Filter, Wetter/Sichtweite/Bewölkung, Längs- und Querüberdeckung, Besonderheiten und Abweichungen.
  - **Äußere Orientierung je Bild:** GNSS-Zeit, Rechtswert/Hochwert/Höhe mit EPSG-Code, Omega/Phi/Kappa. Das ist die belegte Minimalliste; ohne EPSG-Code ist die Angabe wertlos.
  - **Belegte Mindestwerte:** Bodenauflösung ≤ 0,20 m (auch am tiefsten Geländepunkt); Längsüberdeckung ≥ 60 % (TrueDOP ≥ 80 %); Querüberdeckung ≥ 30 % (TrueDOP ≥ 50 %, urban ≥ 60 %).
  - **Zwei Zeitangaben, die BIOME trennen muss:** `aufnahmedatum` (Tag) und `aufnahmezeit_mit_zeitzone` (Beginn/Ende des Fluges). Für eine Sonnenstandsrechnung (FE-CAL-13) reicht das Datum allein nicht.
- **Deckt ausdrücklich nicht:**
  - Verbindlichkeit des Feldkatalogs. Die Liste ist wörtlich mit „Mögliche Inhalte (Firmenlayout wird akzeptiert)" überschrieben. Es ist eine Ausschreibungsempfehlung, kein Pflichtschema. Der Prüfstandard E.1.6 verweist für die Metadaten lediglich auf „Vollständigkeit und Inhalt gemäß Leistungsbeschreibung" — die inhaltliche Vorgabe entsteht also erst im Einzelvertrag.
  - Ein maschinenlesbares Format für den Operateursbericht (belegt sind nur PDF oder Excel).
  - Drohnenbefliegungen.

### FE-GSD-22 · Ground Sample Distance (GSD) — Definition
- **Herausgeber:** Europäische Kommission, Joint Research Centre: Kapnias, Milenov, Kay, „Guidelines for Best Practice and Quality Checking of Ortho Imagery", Issue 3.0, EUR 23638 EN, 2008; ergänzend AdV (Begriffsgleichsetzung) und ESA/Copernicus (Anwendung)
- **Quelle:** https://publications.jrc.ec.europa.eu/repository/bitstream/JRC48904/10133.pdf · https://www.adv-online.de/sites/default/files/documents/2026-04/PQS_DOP.pdf · https://sentiwiki.copernicus.eu/web/s2-products
- **Abgerufen:** 2026-08-09 (JRC per WebFetch HTTP 200, PDF 990 KB — `curl` wird von der WAF abgewiesen; AdV HTTP 200; SentiWiki HTTP 200)
- **Wörtlich** (JRC, Abschnitt 3.1 „GSD", vollständig):
  „Since the introduction of digital technology the scale does not provide by itself a clear measure for the spatial resolution of the imagery as the size of the CCD element (respectively the scanning resolution for film imagery) has been introduced to the equation. The use of the Ground Sampling Distance (GSD) which represents the ground distance covered in a pixel has been established as the most common measure of the spatial resolution of an image (although not a sufficient condition)."
  „[GSD = (H/f)*CCD]"
  „When orthoimage is to be produced it is the output pixel size that defines the GSD of the imagery. In case of digital sensors the ratio of the final ortho resolution to the GSD is 1:1 whereas for film cameras should be at least 1.2:1"
  „GSD size has great impact to the project cost for both analogue and digital airborne imagery; generally halving the GSD size will increase the cost of a project 2-4 times."
- **Wörtlich** (JRC, Glossar, Abgrenzung): „Pixel size | Distance represented by each pixel in an image or DEM in x and y components. Pixel size can be expressed as a distance on the ground or a distance on scanned hardcopy (e.g. microns). It is not a measure of resolution."
- **Wörtlich** (AdV, PQS Digitale Orthophotos 4.1, Überschrift 3.3.1 und Produktsystematik):
  „3.3.1 Bodenauflösung, Ground Sample Distance (GSD)"
  „Die Produkte der Produktgruppe DOP werden nach ihrer Bodenauflösung (Ground Sample Distance (GSD)) unterschieden."
  „ATKIS-DOP besitzen standardmäßig eine Bodenauflösung als ATKIS-DOP20 von 20 cm und als ATKIS-DOP40 von 40 cm."
- **Wörtlich** (ESA/Copernicus, Anwendung auf Satellitendaten): „Level-1C products are resampled with a constant Ground Sampling Distance (GSD) of 10, 20 and 60 m depending on the native resolution of the different spectral bands."
- **Wörtlich** (MAPIR-Datenblatt, Kopplung an die Flughöhe): „Ground Sample Distance (GSD) | Survey3W: 5.5 cm/px (2.17in/px) at 120 m (~400 ft) AGL Survey3N: 2.3 cm/px (0.9in/px) at 120 m (~400 ft) AGL"
- **Deckt in BIOME:**
  - **Definition, wörtlich belegt:** GSD = die im Boden abgedeckte Distanz eines Pixels; das gebräuchlichste Maß der räumlichen Auflösung eines Bildes, aber ausdrücklich **keine hinreichende** Angabe („although not a sufficient condition").
  - **Belegte Rechenbeziehung:** `GSD = (H / f) × CCD` mit H = Flughöhe über Grund, f = Kammerkonstante/Brennweite, CCD = Detektorelementgröße. Alle drei Größen sind in BIOME über FE-BF-20/21 belegt vorhanden (`Kammerkonstante` in mm, Flughöhe im Operateursbericht).
  - **Feld `gsd`:** Einheit **cm** bei Bildflügen (AdV-Konvention, FE-BF-20 `Bodenpixelgroesse` in cm), **m** bei Satellitendaten (Copernicus-Konvention). BIOME muss die Einheit mitführen, nicht raten.
  - **Deutsche Begriffsgleichsetzung, wörtlich belegt:** „Bodenauflösung" = „Ground Sample Distance (GSD)". BIOME darf die beiden Begriffe als Synonyme führen.
  - **Belegte Bezugsregel für Orthophotos:** Bei Orthobildern definiert die Ausgabepixelgröße die GSD; bei digitalen Sensoren ist das Verhältnis Ortho-Auflösung zu GSD 1:1.
  - **Belegte Abgrenzung, die BIOME anzeigen muss:** Pixelgröße ist **kein** Maß der Auflösung. Zwei Bilder mit gleicher GSD können unterschiedlich scharf sein (siehe MTF-Angaben in FE-S2-01-Kontext). BIOME darf aus einer kleinen GSD nicht auf erkennbare Objektdetails schließen.
- **Deckt ausdrücklich nicht:**
  - Eine normative Definition. Die maßgebliche deutsche Norm DIN 18740-4 definiert GSD, ist aber kostenpflichtig (siehe „Nicht zugänglich"). Der JRC-Leitfaden ist eine Handreichung der Kommission, keine Norm; er stellt zudem selbst fest: „Defining the different types of image resolution (spatial, spectral, radiometric and temporal) is not in the scope of this document."
  - Eine Aussage darüber, welche Objektgröße bei welcher GSD erkennbar ist.
  - CEOS verwendet statt GSD den Begriff „Spatial Sampling Distance" (FE-GEO-17) — die beiden Begriffe sind in den Quellen **nicht** ausdrücklich gleichgesetzt.

### FE-GS-23 · KHR_gaussian_splatting — 3D-Gaussian-Splats in glTF: Pflichtangaben, Attribute, Farbraum
- **Herausgeber:** The Khronos Group Inc., 3D Formats Working Group (Beitragende laut Dokument u. a. Cesium, Niantic Spatial, Esri, Nvidia, Huawei, Autodesk)
- **Quelle:** https://raw.githubusercontent.com/KhronosGroup/glTF/main/extensions/2.0/Khronos/KHR_gaussian_splatting/README.md · Registerzeile: https://raw.githubusercontent.com/KhronosGroup/glTF/main/extensions/README.md · JSON-Schema: https://raw.githubusercontent.com/KhronosGroup/glTF/main/extensions/2.0/Khronos/KHR_gaussian_splatting/schema/mesh.primitive.KHR_gaussian_splatting.schema.json · Ankündigung: https://www.khronos.org/news/press/gltf-gaussian-splatting-press-release · Basisspezifikation: https://raw.githubusercontent.com/KhronosGroup/glTF/main/specification/2.0/Specification.adoc
- **Abgerufen:** 2026-08-15 (README HTTP 200, 38.890 Byte; Register HTTP 200; Schema HTTP 200; glTF-2.0-Quelltext HTTP 200). Abrufhinweis: `registry.khronos.org` weist sowohl `curl` als auch WebFetch mit HTTP 403 ab — die Spezifikationstexte sind über `raw.githubusercontent.com` aus demselben Repository zu holen. Ein 403 der Registry ist hier kein Ausfall der Quelle.
- **Wörtlich** (Abschnitt „Status", vollständig): „Release Candidate"
- **Wörtlich** (Erweiterungsregister des glTF-Repositorys, Zeile des Eintrags): „| KHR_gaussian_splatting | Release Candidate | [Specification](2.0/Khronos/KHR_gaussian_splatting/README.md) |"
- **Wörtlich** (Ankündigung vom 3. Februar 2026): „ratification … is expected in the second quarter of 2026"
- **Wörtlich** (Abschnitt „Overview"):
  „This extension defines basic support for storing 3D Gaussian splats in glTF assets, bringing structure and conformity to the 3D Gaussian splatting space. 3D Gaussian splatting uses fields of Gaussians that can be treated as a point cloud for the purposes of storage. This extension defines 3D Gaussian splats by their position, rotation, scale, opacity, and spherical harmonics, which provide both diffuse and specular color. These values are stored as attributes on a point primitive. Since the extension treats the 3D Gaussian splats as point primitives, a graceful fallback to treating the data as a sparse point cloud is possible."
- **Wörtlich** (Abschnitt „Extending Mesh Primitives", Eigenschaftstabelle vollständig):
  „| **kernel** | `string` | The kernel used to generate the Gaussians. | :white_check_mark: Yes |"
  „| **colorSpace** | `string` | The color space of the reconstructed color values. | :white_check_mark: Yes |"
  „| **projection** | `string` | The projection method for rendering the Gaussians. | No, default `\"perspective\"`. |"
  „| **sortingMethod** | `string` | The sorting method for rendering the Gaussians. | No, default `\"cameraDistance\"` |"
- **Wörtlich** (Kernel, Farbraum, Projektion, Sortierung — die abgeschlossenen Wertelisten):
  „This extension defines only one kernel type called `\"ellipse\"`, that is a 2D ellipse kernel used to project an ellipsoid shape in 3D space."
  „| `srgb_rec709_display` | BT.709 sRGB (display-referred) color space. |" · „| `lin_rec709_display` | BT.709 linear (display-referred) color space. |"
  „This base extension defines a single projection method, `\"perspective\"`, which is the default value."
  „This base extension defines a single sorting method, `cameraDistance`, which is the default value. This method sorts the splats based on the length of the vector from the splat to the camera origin (viewer's position)."
- **Wörtlich** (Abschnitt „Dependencies on glTF"):
  „The `mode` property of the mesh primitive MUST be `POINTS` (0)."
  „Unless specified otherwise by additional Gaussian splats extensions, the glTF material referenced from the mesh primitive (if any) MUST be ignored for splat rendering."
  „These rules ensure that the transformation matrix is decomposable into regular translation, rotation, and positive scale values. Splat rendering with non-decomposable transformation matrices or with negative scale values is undefined."
  „The camera used for splat rendering SHOULD use perspective projection. Splat rendering with non-perspective projections is undefined."
- **Wörtlich** (Attributtabelle des Ellipse-Kernels, Spalten „Attribute Semantic" und „Required", vollständig):
  „| Position | `POSITION` | VEC3 | Inherited from the glTF specification | :white_check_mark: Yes |"
  „| Rotation | `KHR_gaussian_splatting:ROTATION` | VEC4 | _float_ <br/>_signed byte_ normalized <br/>_signed short_ normalized | :white_check_mark: Yes |"
  „| Scale | `KHR_gaussian_splatting:SCALE` | VEC3 | _float_ <br/>_unsigned byte_ <br/>_unsigned byte_ normalized <br/>_unsigned short_ <br/>_unsigned short_ normalized | :white_check_mark: Yes |"
  „| Opacity | `KHR_gaussian_splatting:OPACITY` | SCALAR | _float_ <br/>_unsigned byte_ normalized <br/>_unsigned short_ normalized | :white_check_mark: Yes |"
  „| Spherical Harmonics degree 0 | `KHR_gaussian_splatting:SH_DEGREE_0_COEF_0` | VEC3 | _float_ | :white_check_mark: Yes |"
  „| Spherical Harmonics degree 1 | `KHR_gaussian_splatting:SH_DEGREE_1_COEF_[0-2]` | VEC3 | _float_ | no (yes if degree 2 or 3 are used) |"
  „| Spherical Harmonics degree 2 | `KHR_gaussian_splatting:SH_DEGREE_2_COEF_[0-4]` | VEC3 | _float_ | no (yes if degree 3 is used) |"
  „| Spherical Harmonics degree 3 | `KHR_gaussian_splatting:SH_DEGREE_3_COEF_[0-6]` | VEC3 | _float_ | no |"
- **Wörtlich** (Wertebereiche und Vollständigkeitsregel):
  „Scale values are linear and MUST NOT be negative."
  „Rotation values are stored as unit quaternions in the usual glTF order."
  „It stores a normalized linear value between _0.0_ (transparent) and _1.0_ (opaque). Out-of-range values are invalid."
  „Spherical harmonic degrees MUST NOT be partially defined, that is, either all coefficients for a given degree and all lower degrees MUST be defined or none."
  „To use higher degrees of spherical harmonics the lower degrees MUST be defined."
- **Wörtlich** (Rendering und Farbrekonstruktion):
  „This kernel assumes a _3σ_ cut-off (Mahalanobis distance of 3 units) for correct rendering."
  „The diffuse color of the splat can be computed by multiplying the RGB coefficients of the zeroth-order real spherical harmonic by the normalization constant value of $\approx0.282095$."
  „Color_{diffuse} = SH_{0,0} * 0.2820947917738781 + 0.5"
  „Implementations MAY ignore higher-degree coefficients for performance reasons."
- **Wörtlich** (Abschnitt „Image State & Relighting"):
  „Image state is defined by ISO 22028-1:2016 and indicates the rendering state of the image data. **_Display-referred_** (also known as _output-referred_ in ISO 22028-1:2016) image state represents data that has gone through color-rendering appropriate for display. **_Scene-referred_** image state represents data that represents the actual radiance of the scene."
  „The ellipse kernel defined in this specification uses a _display-referred_ image state for training and rendering. This is similar to the material model described in the `KHR_materials_unlit` glTF extension, i.e., glTF scene lighting, exposure settings, and tonemapping generally do not affect rendered splats."
- **Wörtlich** (Abschnitt „Fallback Behavior"): „To support fallback functionality, the `COLOR_0` attribute semantic from the base glTF specification MAY be used to provide the diffuse color of the 3D Gaussian splat. This allows renderers to color the points in the sparse point cloud when 3D Gaussian splatting is not supported by a renderer."
- **Wörtlich** (Basisspezifikation glTF 2.0, Abschnitt „Coordinate System and Units", vollständig für den hier belegten Teil):
  „glTF uses a right-handed coordinate system."
  „glTF defines +Y as up; the front side of a glTF asset faces +Z, the left side of a glTF asset faces +X."
  „The units for all linear distances are meters."
- **Wörtlich** (Khronos-Copyright-Erklärung im Dokument): „Khronos grants a conditional copyright license to use and reproduce the unmodified Specification for any purpose, without fee or royalty, EXCEPT no licenses to any patent, trademark or other intellectual property rights are granted under these terms."
- **Deckt in BIOME:**
  - **Feld `kernel`** mit dem heute abgeschlossenen Wertebereich {`ellipse`}, **Pflichtangabe**. Ein anderer Kernel stammt zwingend aus einer Fremderweiterung; BIOME darf ihn nicht stillschweigend als `ellipse` rendern.
  - **Feld `farbraum`** mit dem abgeschlossenen Wertebereich {`srgb_rec709_display`, `lin_rec709_display`}, **Pflichtangabe**. Beide sind wörtlich **display-referred**.
  - **Felder `projektion`** {`perspective`} und **`sortierung`** {`cameraDistance`}, optional mit den belegten Vorgabewerten. Fehlt die Angabe, ist der Vorgabewert einzusetzen — nicht „keine Angabe".
  - **Pflichtattribute je Primitive**, abgeschlossen: `POSITION`, `KHR_gaussian_splatting:ROTATION`, `KHR_gaussian_splatting:SCALE`, `KHR_gaussian_splatting:OPACITY`, `KHR_gaussian_splatting:SH_DEGREE_0_COEF_0`. Fehlt eines davon, ist die Datei kein gültiges Splat-Feld und BIOME muss sie zurückweisen statt teilweise darzustellen.
  - **Prüfregel Primitivtyp:** `mode` MUSS `POINTS` (0) sein — wörtlich belegt, damit als harte Annahmeprüfung formulierbar.
  - **Prüfregel Kugelflächenfunktionen:** Grade sind nur vollständig zulässig (3 Koeffizienten für Grad 1, 5 für Grad 2, 7 für Grad 3, jeweils RGB), und ein höherer Grad setzt alle niedrigeren voraus. Ein teilweise besetzter Grad ist ein Annahmefehler, keine Warnung.
  - **Prüfregel Wertebereiche:** Skalen nicht negativ; Deckkraft zwischen 0,0 und 1,0, außerhalb liegende Werte sind wörtlich „invalid".
  - **Belegte Farbformel** für die Diffusfarbe aus dem nullten Grad: `Farbe = SH₀ × 0,2820947917738781 + 0,5`. BIOME darf diese Zahl fest verdrahten und als belegt kennzeichnen.
  - **Belegter Renderparameter:** 3σ-Abschneidung (Mahalanobis-Abstand 3). Ein Renderer, der anders abschneidet, zeigt nicht das, was die Datei beschreibt.
  - **Belegte Einheit und Achslage** über die Basisspezifikation: Meter, rechtshändig, +Y oben. Damit ist eine Längenangabe aus einem Splat-Feld überhaupt erst interpretierbar — und der Unterschied zu den y-nach-Norden-Konventionen der Geodaten benennbar.
  - **Belegter Reifegrad:** „Release Candidate". BIOME muss diesen Stand an der Ebene anzeigen. Die angekündigte Ratifizierung im zweiten Quartal 2026 war am Abrufdatum (2026-08-15) **nicht** vollzogen — Register und Dokument führen den Stand unverändert als Release Candidate.
  - **Zitierweise:** Der Wortlaut ist unter der oben zitierten Bedingung zitierfähig. Wie bei den AdV-Dokumenten gilt: zitieren ja, als BIOME-Inhalt ausliefern nein.
- **Deckt ausdrücklich nicht:**
  - **Jede Aussage über ein Bezugssystem.** Weder die Erweiterung noch die Basisspezifikation glTF 2.0 enthalten die Begriffe CRS, EPSG, Datum, Georeferenzierung oder WGS 84 — geprüft am Volltext beider Dokumente am 2026-08-15, Trefferzahl 0. Ein Splat-Feld ist damit ein **lagefreies lokales Modell**. Die Verortung eines Splat-Felds im Gelände ist eine Angabe von BIOME, keine Eigenschaft der Datei, und muss als eigener, selbst erhobener Wert mit eigener Herkunft geführt werden. Ohne sie darf BIOME kein Splat-Feld auf eine Karte legen.
  - **Jede Aussage über Lagegenauigkeit.** Die Spezifikation nennt keine Genauigkeitsmaße, keine RMSE, keine σ-Angabe. Die Genauigkeit eines Splat-Felds richtet sich nach Aufnahme und Rekonstruktion und ist über FE-GEO-15 bis FE-GEO-19 zu belegen, nicht über diese Quelle.
  - **Jede radiometrische Auswertung.** Die Farbwerte sind wörtlich **display-referred**, also durch ein Color-Rendering für die Anzeige gegangen — und damit ausdrücklich nicht die Szenenradianz. Reflektanz im Sinne von FE-S2-03/FE-S2-04 ist das nicht. **BIOME darf aus Splat-Farben keinen NDVI, keinen NDRE und keinen anderen Index berechnen**, auch nicht näherungsweise: die Eingangsgröße ist eine andere physikalische Größe. Eine radiometrische Kalibrierung nach FE-CAL-12 ist an einem Splat-Feld nicht rekonstruierbar.
  - **Jede Aussage zur Vollständigkeit oder Dichte.** Wie viele Gaußfunktionen ein Objekt beschreiben, ist ein Ergebnis des Trainings. Aus der Splat-Zahl folgt nichts über Detailtreue, Auflösung oder erkennbare Objektgröße — eine GSD im Sinne von FE-GSD-22 hat ein Splat-Feld nicht.
  - **Die Kompression.** Kompressionserweiterungen sind ausdrücklich als eigene, hier nicht abgerufene Erweiterungen vorgesehen („Compression extensions that operate on 3D Gaussian splatting data SHOULD extend this base extension"). BIOME kann eine komprimierte Datei nicht lesen, solange die betreffende Erweiterung nicht belegt ist.
  - **Die formalen Definitionen von $\mathbf{W}$ und $\mathbf{J}$** der Projektion. Die Quelle hält ausdrücklich fest: „Since the construction details of the view and perspective projection matrices are implementation-specific, the formal definitions of $\mathbf{W}$ and $\mathbf{J}$ are not provided in this specification." Die Projektionsmathematik eines BIOME-Renderers ist damit eine Umsetzungsentscheidung, keine belegte Vorschrift.
  - **Bekannte Implementierungen.** Der Abschnitt „Known Implementations" ist im Dokument unbesetzt: „_TODO: Add known implementations before final ratification._" BIOME kann sich auf keine Referenzumsetzung berufen.

## Nicht zugänglich

| Norm/Quelle | Warum | Status | Was dadurch in BIOME NICHT belegbar ist |
|---|---|---|---|
| DIN 18740-4 „Photogrammetrische Produkte — Teil 4: Anforderungen an digitale Kameras für Luftbild- und Weltraumphotogrammetrie" | Kostenpflichtig. Produktseite DIN Media abrufbar, Volltext nur nach Kauf: „from 90.50 EUR" (Fassung 2017-04). Die Seite hält fest: „This document has been replaced by: DIN 18740-4:2025-05". Zuständiger Ausschuss laut Seite: NA 005-03-02 AA „Photogrammetrie und Fernerkundung". Bezugsweg: https://www.dinmedia.de/en/standard/din-18740-4/269273201 | Produktseite HTTP 200; Volltext nicht abrufbar | Die **normative Definition von GSD / Bodenauflösung**; die Anforderungen an digitale Luftbildkameras, auf die der AdV-Standard durchgängig verweist („Es sind Luftbildkameras einzusetzen, die der DIN 18740-4 genügen"); die Definition des „Messbildes". FE-GSD-22 stützt sich deshalb auf den JRC-Leitfaden, nicht auf die Norm. |
| DIN 18740-2:2005-02, Anhänge D.2 und D.3 (Analog-Digital-Wandlung, Radiometrie) | Kostenpflichtig. Der AdV-Leitfaden verweist für die radiometrischen Histogrammanforderungen ausdrücklich in Fußnoten auf „DIN 18740-2:2005-02, Anhang D.2 und D.3". Keine Produktseite abgerufen. | Nicht abgerufen | Die inhaltlichen radiometrischen Prüfkriterien (Histogrammform, Grauwertverteilung) hinter der AdV-Formulierung. BIOME kann eine Histogrammprüfung anbieten, aber keine Grenzwerte „nach DIN". |
| DIN 18740-3 „Anforderungen an das Orthobild", DIN 18740-6 „Anforderungen an digitale Höhenmodelle" | Kostenpflichtig; im AdV-DOP-Standard als zugrunde liegende Normen genannt (DIN 18740-3:2015-8, DIN 18740-6:2014-12). Keine Produktseiten abgerufen. | Nicht abgerufen | Die Definitionen von Orthobild und Höhenmodell auf Normebene sowie die Kontrollpunktvorschrift, auf die die AdV in Fußnote 13 verweist („DIN 18740-3, Pkt. 5.3.1"). |
| ISO 19157 „Geographic information — Data quality" | Kostenpflichtig. `www.iso.org` liefert für die Normseite HTTP 403 (Zugriff über den ISO-Store nötig). Die INSPIRE-Spezifikation zitiert daraus die Maßkennungen 7 und 47. | HTTP 403 | Die Originaldefinitionen der Datenqualitätsmaße RMSEP und RMSE-x/y sowie die vollständige Systematik der Positional-accuracy-Unterelemente. FE-GEO-18 zitiert nur die INSPIRE-Wiedergabe. |
| ISO/TS 19101-2, ISO 19123 | Kostenpflichtig; in der INSPIRE-Orthoimagery-Spezifikation als Quellen für die Begriffe „band" und „raster" angegeben. Nicht abgerufen. | Nicht abgerufen | Die Normdefinition von „Band" (Spektralkanal). BIOME kann nur die INSPIRE-Wiedergabe zitieren. |
| MicaSense/AgEagle Wissensdatenbank, u. a. „Use of Calibrated Reflectance Panels For MicaSense Data" (`support.micasense.com`) | Zugriff verweigert. Sowohl `curl` mit Browser-User-Agent als auch WebFetch erhalten HTTP 403 Forbidden. | HTTP 403 (curl und WebFetch) | Die herstellerseitige Schritt-für-Schritt-Anleitung zur Panelaufnahme (Abstand, Winkel, Zeitpunkt vor/nach dem Flug, DLS-Nutzung). FE-CAL-12 stützt sich stattdessen auf das offene Verarbeitungs-Repository desselben Herstellers, das dieselben Kernaussagen enthält, aber keine vollständige Feldanleitung ist. |
| Gitelson & Merzlyak (1994), „Quantitative estimation of chlorophyll-a using reflectance spectra: Experiments with autumn chestnut and maple leaves", J. Photochem. Photobiol. B — die im ASI-Katalog hinterlegte NDRE-Primärquelle | Verlagspublikation bei Elsevier. Der DOI 10.1016/1011-1344(93)06963-4 leitet auf `linkinghub.elsevier.com` weiter (HTTP 200), der Volltext wurde nicht geöffnet. Metadaten über die Crossref-API bestätigt. | DOI-Auflösung HTTP 200; Volltext nicht abgerufen | Der **Originalwortlaut der NDRE-Definition** und ihr ursprünglicher Anwendungsbereich. FE-RE-10 belegt nur Formel und Bandbedarf aus dem Sekundärkatalog. |
| Barnes et al. (2000), üblicherweise als NDRE-Urquelle zitiert | Nicht gesucht/nicht abgerufen. Der ASI-Katalog nennt diese Arbeit nicht als Referenz. | Nicht abgerufen | Eine belegte Zuordnung des Namens „NDRE" zu einer Urquelle. BIOME darf keine Urheberschaft für NDRE behaupten. |
| JRC „Guidelines for Best Practice and Quality Checking of Ortho Imagery", Issue 3.0 — über den amtlichen Direktabruf | Der JRC-Publikationsserver weist `curl` mit einer WAF-Seite ab: „Request Rejected. The requested URL was rejected. Please consult with your administrator." (244 Byte bei gemeldetem HTTP 200). Ein Download über die EC-Wiki-Adresse endet in der EU-Login-Maske. Das echte PDF war nur über WebFetch (990 KB) sowie über einen Fremd-Spiegel (610 KB, identischer Dokumentkopf) zu bekommen. | curl HTTP 200 / 244 Byte WAF-Seite; WebFetch HTTP 200 / PDF; EC-Wiki: EU-Login-Seite | Nichts inhaltlich — das Dokument liegt vor (FE-GEO-16, FE-GSD-22). Hier nur festgehalten, damit ein späterer 244-Byte-„Erfolg" nicht für den Volltext gehalten wird. |
| Sentinel-2 „Equation 8: Top of Atmosphere conversion" und die INSPIRE-Formeln zu RMSEP / RMSE-x,y | Liegen in den jeweiligen Quellen als eingebettete Grafiken vor und sind in der Textebene nicht enthalten. | Seiten HTTP 200, Formelbild nicht extrahierbar | Die exakten Gleichungen. BIOME darf sie nicht als Zitat ausgeben; belegt sind nur die Eingangsgrößen (FE-S2-03) bzw. die Maßnamen (FE-GEO-18). |
| Sentinel-2 Spectral Response Functions (SRF) je Band | SentiWiki verweist auf eine separate Seite („More information on both the Sentinel-2A, Sentinel-2B and Sentinel-2C Spectral Responses can be found here"); diese wurde nicht abgerufen. | Nicht abgerufen | Bandpassformen. Eine Simulation von Sentinel-2-Bändern aus Drohnen- oder Hyperspektraldaten ist damit nicht belegbar. |
| Sentinel-2 Scene Classification (SCL) Klassenschlüssel | Nicht abgerufen. | Nicht abgerufen | Die konkreten SCL-Codes für Wolke, Wolkenschatten, Schnee, Vegetation. BIOME kann eine Maskierungspflicht setzen (FE-S2-04), aber keine Klassenliste anbieten. |
| DJI-Produktspezifikationen (Mavic 3 Multispectral, P4 Multispectral) als Gegenbeispiel „Kamera mit Red-Edge-Band" | Die Spezifikationsseite lieferte über WebFetch keinen Inhalt (nur die generische DJI-Titelzeile); das Handbuch-PDF auf `dl.djicdn.com` antwortete mit HTTP 403. | WebFetch ohne Inhalt / PDF HTTP 403 | Ein zweiter Herstellerbeleg für eine Kamera **mit** Red-Edge-Band. FE-RE-11 führt den Nachweis nur an der MAPIR-Serie, dort allerdings vollständig (RGN ohne, RE-Filter mit Red Edge). |
| USGS-Seiten ohne Browser-User-Agent | `www.usgs.gov` antwortet auf `curl` ohne Browser-User-Agent mit HTTP 403 (919 Byte). Mit gesetztem User-Agent HTTP 200. | curl HTTP 403 / mit UA HTTP 200 | Nichts — die Quelle ist unter FE-NDVI-06 gedeckt. Nur als Abrufhinweis notiert. |
| ISO 22028-1:2016 „Photography and graphic technology — Extended colour encodings for digital image storage, manipulation and interchange — Part 1" | Kostenpflichtig. `KHR_gaussian_splatting` stützt seine Unterscheidung display-referred/scene-referred wörtlich auf diese Norm, gibt die beiden Definitionen aber selbst im Volltext wieder. Nicht abgerufen. | Nicht abgerufen | Der Normwortlaut der Bildzustände. FE-GS-23 zitiert die Wiedergabe in der Khronos-Spezifikation; die reicht für die BIOME-Regel „aus Splat-Farben kein Index", nicht für eine farbwissenschaftliche Aussage darüber hinaus. |
| `registry.khronos.org` | Antwortet sowohl `curl` als auch WebFetch mit HTTP 403 Forbidden (5.495 Byte). Dieselben Spezifikationstexte liegen im offenen GitHub-Repository `KhronosGroup/glTF` und sind über `raw.githubusercontent.com` mit HTTP 200 abrufbar. | Registry HTTP 403 / Repository HTTP 200 | Nichts — die Texte liegen vollständig vor (FE-GS-23). Hier nur als Abrufhinweis notiert, damit ein 403 der Registry nicht für „Quelle nicht verfügbar" gehalten wird. |

## Offene Fragen an Malte

- **Welchen Sensor führt BIOME als Leitquelle?** Frei belegbar sind drei Ebenen mit unvereinbaren Bezugsflächen: Sentinel-2 (10/20/60 m Pixel, kostenlos, alle 5 Tage), amtliche Luftbilder/DOP (20 cm, Zyklus „i.d.R. ≤ 3 Jahre") und eigene Drohnenbefliegung (im MAPIR-Beispiel 5,5 cm bei 120 m Flughöhe). Für einen Einzelbaum ist Sentinel-2 physikalisch ungeeignet (FE-S2-02). Soll BIOME Sentinel-2 nur für Flächen und Drohnen-/DOP-Daten für Einzelbäume zulassen, und sperrt die Oberfläche die jeweils andere Kombination?
- **NDRE oder nicht?** Für NDRE gibt es **keine frei zugängliche normative Definition** und **keinen belegten Wertebereich** (FE-RE-10). Belegbar sind nur Formel und Bandbedarf. Wenn BIOME NDRE anbietet, kann es einen Zahlenwert anzeigen, aber keine Interpretation. Soll das Feld trotzdem rein? Ich empfehle: nur als Rohwert, ohne Ampel, mit Pflichtanzeige der verwendeten Bänder.
- **Welche Kameras sind für Welle 1 vorgesehen?** Die Antwort entscheidet, ob NDRE überhaupt zur Debatte steht. Eine RGN-Kamera kann es beweisbar nicht liefern (FE-RE-11). Wenn NDRE gewünscht ist, braucht es Hardware mit einem Kanal zwischen 695 und 795 nm — das ist eine Beschaffungsentscheidung, keine Softwarefrage.
- **σ oder RMSE?** Die deutsche amtliche Welt rechnet in Standardabweichung 1σ (AdV: DOP20 σxy = ±0,4 m), die internationale in RMSE auf dem 95-%-Niveau (FGDC, CEOS, INSPIRE). Der JRC-Leitfaden sagt wörtlich, dass beides bei kleinen Stichproben nicht dasselbe ist. Führt BIOME **beide** Felder getrennt (mein Vorschlag), oder legen wir uns auf eine Konvention fest und rechnen beim Import um? Eine Umrechnung wäre eine Setzung, keine Ableitung.
- **Ko-Registrierung: welche Schwelle gilt bei uns?** Belegt sind drei verschiedene: Sentinel-2 fordert ≤ 0,3 Pixel bei 2σ (FE-S2-05), CEOS-ARD ≤ 0,5 Pixel rRMSE (FE-GEO-17), JRC ≤ 0,5 × Eingangspixelgröße für die relative Blockgenauigkeit (FE-GEO-16). Welche davon ist die BIOME-Annahmegrenze für eine Zeitreihe?
- **NDVI-Sättigung in der Oberfläche.** Belegt ist eine LAI-Schwelle von 2–3 und die Stauchung oberhalb NDVI ≈ 0,8 (FE-NDVI-08), aber **kein** harter NDVI-Grenzwert. Soll BIOME ab einem selbstgesetzten Schwellwert (Vorschlag: 0,8) eine Sättigungswarnung einblenden? Das wäre eine begründete Setzung, die ich als solche kennzeichnen würde.
- **Belaubungszustand als Pflichtfeld.** Der AdV-Standard führt ihn mit vier Codes (FE-BF-20). Für jede Vegetationsauswertung ist er entscheidend, in den meisten frei verfügbaren DOP-Lieferungen dürfte er aber unbesetzt sein. Soll BIOME Bilddaten ohne Belaubungsangabe für Vegetationsindizes sperren, oder nur warnen?
- **Kauf von DIN 18740-4 (und -2, -3, -6)?** DIN 18740-4 kostet ab 90,50 € (aktuelle Fassung 2025-05). Ohne sie bleiben die normative GSD-Definition, die Kameraanforderungen und die radiometrischen Histogrammkriterien dauerhaft unbelegt — obwohl die AdV-Standards, die BIOME nutzen will, durchgehend darauf verweisen. Soll ich den Kauf vorbereiten? Zu beachten: Auch die frei abrufbaren AdV-Dokumente tragen „Das Werk einschließlich aller seiner Teile ist urheberrechtlich geschützt. Jede Verwertung außerhalb der Grenzen des Urheberrechts ist ohne Zustimmung des Herausgebers unzulässig." — Wortlaut also zitieren, nicht als BIOME-Inhalt ausliefern.
- **Wie wird ein Splat-Feld verortet?** `KHR_gaussian_splatting` und glTF 2.0 kennen nachweislich kein Bezugssystem (FE-GS-23): eine Splat-Datei ist ein lagefreies lokales Modell in Metern. Damit BIOME sie überhaupt auf eine Fläche legen darf, braucht es eine selbst erhobene Verortung — mein Vorschlag: Ankerpunkt in EPSG:4326, Drehung gegen Nord in Grad, dazu Verfahren und Person wie bei jedem anderen erhobenen Wert. Alternative wäre, Splat-Felder nur als Ansicht ohne Kartenbezug zu führen. Solange nichts entschieden ist, zeigt BIOME die Verortung als fehlend und legt nichts auf die Karte.
- **Darf ein Splat-Feld für Messungen benutzt werden?** Technisch lassen sich in einer Splat-Szene Strecken abgreifen. Belegt ist dafür nichts: die Spezifikation nennt keine Lagegenauigkeit, und die Rekonstruktionsgenauigkeit hängt an Aufnahme und Training. Mein Vorschlag: BIOME bietet in Splat-Feldern **kein** Messwerkzeug an, bis eine Genauigkeitsangabe nach FE-GEO-15 ff. am Flug hinterlegt ist. Ein Stammumfang aus einer Punktwolke wäre sonst eine Zahl ohne Verfahren.
- **Ist der Release-Candidate-Stand tragfähig genug?** Die Ratifizierung war für das zweite Quartal 2026 angekündigt und ist am 2026-08-15 nicht vollzogen (FE-GS-23). Bis dahin können sich Attributnamen und Wertelisten ändern. BIOME liest heute nur, schreibt nicht — soll das so bleiben, bis der Status wechselt?
- **Bezugsquelle für Sentinel-2.** Die Copernicus-Dokumentation nennt das Copernicus Data Space Ecosystem als Vertriebsweg. Ich habe nur die Dokumentation abgerufen, keinen Datenabruf getestet und keine Nutzungsbedingungen/Lizenz geprüft. Soll ich das als eigenen Auftrag nachziehen, bevor BIOME Sentinel-2 als Datenquelle einplant?
