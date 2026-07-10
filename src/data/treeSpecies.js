// Baumarten für die Kartierung — gängige Stadt-, Straßen- und Parkbäume (D)
// Ergänzt um Bäume/Sträucher aus der Pflanzendatenbank (plants.js).
import { PLANTS } from './plants.js'

const CORE_SPECIES = [
  { name: 'Stieleiche', latin: 'Quercus robur' },
  { name: 'Traubeneiche', latin: 'Quercus petraea' },
  { name: 'Roteiche', latin: 'Quercus rubra' },
  { name: 'Rotbuche', latin: 'Fagus sylvatica' },
  { name: 'Hainbuche', latin: 'Carpinus betulus' },
  { name: 'Winterlinde', latin: 'Tilia cordata' },
  { name: 'Sommerlinde', latin: 'Tilia platyphyllos' },
  { name: 'Silberlinde', latin: 'Tilia tomentosa' },
  { name: 'Kaiserlinde', latin: 'Tilia × europaea ‘Pallida’' },
  { name: 'Spitzahorn', latin: 'Acer platanoides' },
  { name: 'Bergahorn', latin: 'Acer pseudoplatanus' },
  { name: 'Feldahorn', latin: 'Acer campestre' },
  { name: 'Eschenahorn', latin: 'Acer negundo' },
  { name: 'Gemeine Esche', latin: 'Fraxinus excelsior' },
  { name: 'Bergulme', latin: 'Ulmus glabra' },
  { name: 'Feldulme', latin: 'Ulmus minor' },
  { name: 'Flatterulme', latin: 'Ulmus laevis' },
  { name: 'Gemeine Birke', latin: 'Betula pendula' },
  { name: 'Moorbirke', latin: 'Betula pubescens' },
  { name: 'Schwarzerle', latin: 'Alnus glutinosa' },
  { name: 'Grauerle', latin: 'Alnus incana' },
  { name: 'Platane', latin: 'Platanus × hispanica' },
  { name: 'Rosskastanie', latin: 'Aesculus hippocastanum' },
  { name: 'Rote Rosskastanie', latin: 'Aesculus × carnea' },
  { name: 'Robinie', latin: 'Robinia pseudoacacia' },
  { name: 'Gleditschie', latin: 'Gleditsia triacanthos' },
  { name: 'Japanischer Schnurbaum', latin: 'Styphnolobium japonicum' },
  { name: 'Götterbaum', latin: 'Ailanthus altissima' },
  { name: 'Silberweide', latin: 'Salix alba' },
  { name: 'Trauerweide', latin: 'Salix × sepulcralis' },
  { name: 'Salweide', latin: 'Salix caprea' },
  { name: 'Zitterpappel / Espe', latin: 'Populus tremula' },
  { name: 'Schwarzpappel', latin: 'Populus nigra' },
  { name: 'Silberpappel', latin: 'Populus alba' },
  { name: 'Hybridpappel', latin: 'Populus × canadensis' },
  { name: 'Vogelkirsche', latin: 'Prunus avium' },
  { name: 'Traubenkirsche', latin: 'Prunus padus' },
  { name: 'Blutpflaume', latin: 'Prunus cerasifera ‘Nigra’' },
  { name: 'Japanische Zierkirsche', latin: 'Prunus serrulata' },
  { name: 'Vogelbeere / Eberesche', latin: 'Sorbus aucuparia' },
  { name: 'Mehlbeere', latin: 'Sorbus aria' },
  { name: 'Schwedische Mehlbeere', latin: 'Sorbus intermedia' },
  { name: 'Elsbeere', latin: 'Sorbus torminalis' },
  { name: 'Speierling', latin: 'Sorbus domestica' },
  { name: 'Walnuss', latin: 'Juglans regia' },
  { name: 'Esskastanie', latin: 'Castanea sativa' },
  { name: 'Amberbaum', latin: 'Liquidambar styraciflua' },
  { name: 'Tulpenbaum', latin: 'Liriodendron tulipifera' },
  { name: 'Ginkgo', latin: 'Ginkgo biloba' },
  { name: 'Baumhasel', latin: 'Corylus colurna' },
  { name: 'Zürgelbaum', latin: 'Celtis australis' },
  { name: 'Hopfenbuche', latin: 'Ostrya carpinifolia' },
  { name: 'Blauglockenbaum', latin: 'Paulownia tomentosa' },
  { name: 'Trompetenbaum', latin: 'Catalpa bignonioides' },
  { name: 'Apfel (Zierapfel)', latin: 'Malus spec.' },
  { name: 'Birne (Zierbirne)', latin: 'Pyrus calleryana' },
  { name: 'Kulturapfel', latin: 'Malus domestica' },
  { name: 'Kulturbirne', latin: 'Pyrus communis' },
  { name: 'Süßkirsche (Obst)', latin: 'Prunus avium subsp. duracina' },
  { name: 'Zwetschge / Pflaume', latin: 'Prunus domestica' },
  { name: 'Waldkiefer', latin: 'Pinus sylvestris' },
  { name: 'Schwarzkiefer', latin: 'Pinus nigra' },
  { name: 'Gemeine Fichte', latin: 'Picea abies' },
  { name: 'Blaufichte', latin: 'Picea pungens' },
  { name: 'Weißtanne', latin: 'Abies alba' },
  { name: 'Douglasie', latin: 'Pseudotsuga menziesii' },
  { name: 'Europäische Lärche', latin: 'Larix decidua' },
  { name: 'Eibe', latin: 'Taxus baccata' },
  { name: 'Urweltmammutbaum', latin: 'Metasequoia glyptostroboides' },
  { name: 'Riesenmammutbaum', latin: 'Sequoiadendron giganteum' },
  { name: 'Sumpfzypresse', latin: 'Taxodium distichum' },
]

// Bäume & Sträucher aus der Pflanzendatenbank ergänzen (ohne Duplikate)
const fromPlants = PLANTS
  .filter(p => p.type === 'baum' || p.type === 'strauch')
  .map(p => ({ name: p.name, latin: p.latin }))
  .filter(p => !CORE_SPECIES.some(c => c.latin === p.latin))

export const TREE_SPECIES = [...CORE_SPECIES, ...fromPlants]
  .sort((a, b) => a.name.localeCompare(b.name, 'de'))

const HISTORY_KEY = 'luma_species_history'

export function speciesHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] }
}

export function rememberSpecies(name, latin) {
  if (!name && !latin) return
  const next = [{ name: name || '', latin: latin || '' },
    ...speciesHistory().filter(s => s.latin !== latin || s.name !== name)].slice(0, 12)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
}

/** Findet einen Arten-Eintrag zu einer Eingabe (deutscher oder lateinischer Name) */
export function matchSpecies(input) {
  if (!input) return null
  const q = input.trim().toLowerCase()
  return TREE_SPECIES.find(s => s.name.toLowerCase() === q || s.latin.toLowerCase() === q)
    || speciesHistory().find(s => s.name.toLowerCase() === q || s.latin.toLowerCase() === q)
    || null
}
