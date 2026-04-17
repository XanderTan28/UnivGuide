import { loadAllData } from './data_loader.js';
import { normalizePrograms } from './data_normalizer.js';
import { applyFilters, buildFilterOptions } from './filters.js';
import { sortPrograms } from './sort.js';
import {
  renderFilterOptions,
  renderSummary,
  renderTable,
  bindStaticEvents,
  bindDynamicFilterEvents
} from './render.js';

const state = {
  rawLoaded: null,
  normalized: [],
  filtered: [],
  ui: {
    search: '',
    schools: [],
    regions: [],
    countries: [],
    cities: [],
    campuses: [],
    faculties: [],
    durations: [],
    engTaught: [],
    cityScales: [],
    climates: [],
    languages: [],
    residencies: [],
    sortMetric: 'manifest_order',
    sortDirection: 'asc'
  }
};

function applyCurrentState() {
  const filtered = applyFilters(state.normalized, state.ui);
  const sorted = sortPrograms(filtered, state.ui.sortMetric, state.ui.sortDirection);

  state.filtered = sorted;

  renderFilterOptions(state.normalized, state.ui);
  bindDynamicFilterEvents(state, refresh);
  renderSummary(state.filtered, state.normalized);
  renderTable(state.filtered);
}

function refresh() {
  applyCurrentState();
}

async function bootstrap() {
  try {
    const loaded = await loadAllData();
    state.rawLoaded = loaded;
    state.normalized = normalizePrograms(loaded);

    const options = buildFilterOptions(state.normalized);

    state.ui.schools = [...options.schools];
    state.ui.regions = [...options.regions];
    state.ui.countries = [...options.countries];
    state.ui.cities = [...options.cities];
    state.ui.campuses = [...options.campuses];
    state.ui.faculties = [...options.faculties];
    state.ui.durations = [...options.durations];
    state.ui.cityScales = [...options.cityScales];
    state.ui.climates = [...options.climates];
    state.ui.languages = [...options.languages];
    state.ui.residencies = [...options.residencies];
    state.ui.engTaught = ['true'];

    applyCurrentState();
    bindStaticEvents(state, refresh);
  } catch (error) {
    console.error(error);
  }
}

bootstrap();