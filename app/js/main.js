import { loadAllData } from './data_loader.js';
import { normalizePrograms } from './data_normalizer.js';
import { applyFilters } from './filters.js';
import { sortPrograms } from './sort.js';
import {
  renderFilterOptions,
  renderSummary,
  renderTable,
  bindStaticEvents
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
    engTaught: 'true',
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
  renderSummary(state.filtered, state.normalized);
  renderTable(state.filtered);
}

function refresh() {
  applyCurrentState();
}

async function bootstrap() {
  const loadingState = document.getElementById('loadingState');

  try {
    if (loadingState) {
      loadingState.textContent = '正在加载数据…';
      loadingState.classList.add('is-loading');
    }

    const loaded = await loadAllData();
    state.rawLoaded = loaded;
    state.normalized = normalizePrograms(loaded);

    applyCurrentState();
    bindStaticEvents(state, refresh);

    if (loadingState) {
      loadingState.textContent = '数据已加载';
      loadingState.classList.remove('is-loading');
    }
  } catch (error) {
    console.error(error);

    if (loadingState) {
      loadingState.textContent = '数据加载失败，请检查文件路径、字段名与 CSV 编码';
      loadingState.classList.remove('is-loading');
    }
  }
}

bootstrap();