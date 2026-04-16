import { buildFilterOptions } from './filters.js';
import {
  escapeHtml,
  textYesNo,
  downloadTextFile
} from './utils.js';

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? '';
}

function renderMultiSelect(selectId, values, selectedValues, labelMap = null) {
  const el = document.getElementById(selectId);
  if (!el) return;

  const selectedSet = new Set((selectedValues || []).map((v) => String(v)));

  el.innerHTML = (values || [])
    .map((value) => {
      const label = labelMap?.[value] || value;
      const selected = selectedSet.has(String(value)) ? 'selected' : '';
      return `<option value="${escapeHtml(value)}" ${selected}>${escapeHtml(label)}</option>`;
    })
    .join('');
}

function renderSchoolSelect(selectId, programs, selectedValues) {
  const el = document.getElementById(selectId);
  if (!el) return;

  const map = {};
  (programs || []).forEach((program) => {
    if (!map[program.university_slug]) {
      map[program.university_slug] = program.display_name || program.university || program.university_slug;
    }
  });

  const entries = Object.entries(map).sort((a, b) => a[1].localeCompare(b[1], 'zh-CN'));
  const selectedSet = new Set((selectedValues || []).map((v) => String(v)));

  el.innerHTML = entries
    .map(([slug, label]) => {
      const selected = selectedSet.has(String(slug)) ? 'selected' : '';
      return `<option value="${escapeHtml(slug)}" ${selected}>${escapeHtml(label)}</option>`;
    })
    .join('');
}

function renderActiveTags(ui, programs) {
  const container = document.getElementById('activeFilterTags');
  if (!container) return;

  const schoolMap = {};
  (programs || []).forEach((program) => {
    if (!schoolMap[program.university_slug]) {
      schoolMap[program.university_slug] = program.display_name || program.university || program.university_slug;
    }
  });

  const tags = [];

  if (ui.search) tags.push(`搜索：${ui.search}`);
  if (ui.engTaught === 'true') tags.push('授课：仅英授');
  if (ui.engTaught === 'false') tags.push('授课：仅非英授');

  (ui.schools || []).forEach((v) => tags.push(`大学：${schoolMap[v] || v}`));
  (ui.regions || []).forEach((v) => tags.push(`地区：${v}`));
  (ui.countries || []).forEach((v) => tags.push(`国家：${v}`));
  (ui.cities || []).forEach((v) => tags.push(`城市：${v}`));
  (ui.campuses || []).forEach((v) => tags.push(`校区：${v}`));
  (ui.faculties || []).forEach((v) => tags.push(`学院：${v}`));
  (ui.durations || []).forEach((v) => tags.push(`学制：${v}`));
  (ui.cityScales || []).forEach((v) => tags.push(`城市规模：${v}`));
  (ui.climates || []).forEach((v) => tags.push(`气候：${v}`));
  (ui.languages || []).forEach((v) => tags.push(`语言：${v}`));
  (ui.residencies || []).forEach((v) => tags.push(`居留：${v}`));

  container.innerHTML = tags
    .map((tag) => `<span class="filter-tag">${escapeHtml(tag)}</span>`)
    .join('');
}

function renderStatsList(containerId, items) {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (!items || items.length === 0) {
    el.innerHTML = `<div class="empty-state">暂无数据</div>`;
    return;
  }

  const max = Math.max(...items.map((item) => item.count), 1);

  el.innerHTML = items
    .map((item) => {
      const width = Math.max(6, Math.round((item.count / max) * 100));
      return `
        <div class="stat-row">
          <div class="stat-row__label">${escapeHtml(item.label)}</div>
          <div class="stat-row__bar">
            <div class="stat-row__fill" style="width:${width}%"></div>
          </div>
          <div class="stat-row__value">${item.count}</div>
        </div>
      `;
    })
    .join('');
}

function countBy(list, getKey) {
  const map = new Map();

  (list || []).forEach((item) => {
    const key = getKey(item);
    if (!key) return;
    map.set(key, (map.get(key) || 0) + 1);
  });

  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'zh-CN'));
}

export function renderFilterOptions(programs, ui) {
  const options = buildFilterOptions(programs);

  renderSchoolSelect('schoolSelect', programs, ui.schools);
  renderMultiSelect('regionSelect', options.regions, ui.regions);
  renderMultiSelect('countrySelect', options.countries, ui.countries);
  renderMultiSelect('citySelect', options.cities, ui.cities);
  renderMultiSelect('campusSelect', options.campuses, ui.campuses);
  renderMultiSelect('facultySelect', options.faculties, ui.faculties);
  renderMultiSelect('durationSelect', options.durations, ui.durations);
  renderMultiSelect('cityScaleSelect', options.cityScales, ui.cityScales);
  renderMultiSelect('climateSelect', options.climates, ui.climates);
  renderMultiSelect('languageSelect', options.languages, ui.languages);
  renderMultiSelect('residencySelect', options.residencies, ui.residencies);

  const engTaughtSelect = document.getElementById('engTaughtSelect');
  if (engTaughtSelect) engTaughtSelect.value = ui.engTaught || 'all';

  const sortMetricSelect = document.getElementById('sortMetricSelect');
  if (sortMetricSelect) sortMetricSelect.value = ui.sortMetric || 'manifest_order';

  const sortDirectionSelect = document.getElementById('sortDirectionSelect');
  if (sortDirectionSelect) sortDirectionSelect.value = ui.sortDirection || 'asc';

  const searchInput = document.getElementById('searchInput');
  if (searchInput && searchInput.value !== (ui.search || '')) {
    searchInput.value = ui.search || '';
  }

  renderActiveTags(ui, programs);
}

export function renderSummary(filteredPrograms, allPrograms) {
  const filtered = filteredPrograms || [];
  const all = allPrograms || [];

  const loadingState = document.getElementById('loadingState');
  if (loadingState) {
    loadingState.textContent = '数据已加载';
    loadingState.classList.remove('is-loading');
  }

  const schoolCount = new Set(filtered.map((p) => p.university_slug)).size;
  const totalSchoolCount = new Set(all.map((p) => p.university_slug)).size;

  setText('resultCount', `${filtered.length} 个项目`);
  setText('dataSummary', `当前显示 ${schoolCount} 所学校 / 共 ${totalSchoolCount} 所，${filtered.length} 个项目`);

  renderStatsList(
    'schoolCoverageStats',
    countBy(filtered, (p) => p.display_name || p.university)
  );

  renderStatsList(
    'regionStats',
    countBy(filtered, (p) => (p.region_list || [])[0] || '')
  );

  renderStatsList(
    'durationStats',
    countBy(filtered, (p) => p.duration)
  );

  renderStatsList(
    'cityStats',
    countBy(filtered, (p) => (p.city_list || [])[0] || '')
  );
}

export function renderTable(programs) {
  const tbody = document.getElementById('programTableBody');
  if (!tbody) return;

  if (!programs || programs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="14" class="table-empty">没有匹配结果</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = programs
    .map((program) => {
      const payload = encodeURIComponent(JSON.stringify(program));

      return `
        <tr class="program-row" data-program="${payload}">
          <td>${escapeHtml(program.manifest_order)}</td>
          <td>${escapeHtml(program.display_name || program.university)}</td>
          <td>${escapeHtml(program.program)}</td>
          <td>${escapeHtml(program.faculty)}</td>
          <td>${escapeHtml((program.campus_list || []).join(' + '))}</td>
          <td>${escapeHtml((program.city_list || []).join(' + '))}</td>
          <td>${escapeHtml((program.country_list || []).join(' + '))}</td>
          <td>${escapeHtml((program.region_list || []).join(' + '))}</td>
          <td>${escapeHtml(program.duration)}</td>
          <td>${escapeHtml(textYesNo(program.eng_taught))}</td>
          <td>${escapeHtml(program.type)}</td>
          <td>${escapeHtml(program.qs)}</td>
          <td>${escapeHtml(program.the)}</td>
          <td>${escapeHtml(program.usnews)}</td>
        </tr>
      `;
    })
    .join('');

  tbody.querySelectorAll('.program-row').forEach((row) => {
    row.addEventListener('click', () => {
      const program = JSON.parse(decodeURIComponent(row.dataset.program));
      renderDetailDialog(program);
    });
  });
}

export function renderDetailDialog(program) {
  const dialog = document.getElementById('programDetailDialog');
  if (!dialog) return;

  setText('detailTitle', program.program || '项目详情');
  setText('detailSubtitle', program.display_name || program.university || '');

  setText('dUniversity', program.display_name || program.university || '');
  setText('dProgram', program.program || '');
  setText('dFaculty', program.faculty || '');
  setText('dCampus', (program.campus_list || []).join(' + '));
  setText('dCity', (program.city_list || []).join(' + '));
  setText('dCountry', (program.country_list || []).join(' + '));
  setText('dRegion', (program.region_list || []).join(' + '));
  setText('dDuration', program.duration || '');
  setText('dEngTaught', textYesNo(program.eng_taught));
  setText('dType', program.type || '');

  setText('dCityScale', (program.city_scale_list || []).join(' + '));
  setText('dClimate', (program.climate_list || []).join(' + '));
  setText('dLanguage', (program.language_list || []).join(' + '));
  setText('dResidency', (program.residency_list || []).join(' + '));

  setText('dQs', program.qs || '');
  setText('dThe', program.the || '');
  setText('dUsnews', program.usnews || '');

  const link = document.getElementById('dUrl');
  if (link) {
    link.href = program.url || '#';
    link.textContent = program.url ? '查看项目官网' : '暂无链接';
    if (!program.url) {
      link.removeAttribute('target');
      link.removeAttribute('rel');
    } else {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
  }

  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', 'open');
  }
}

function readMultiSelectValues(selectId) {
  const el = document.getElementById(selectId);
  if (!el) return [];
  return [...el.selectedOptions].map((option) => option.value);
}

function resetUiState(ui) {
  ui.search = '';
  ui.schools = [];
  ui.regions = [];
  ui.countries = [];
  ui.cities = [];
  ui.campuses = [];
  ui.faculties = [];
  ui.durations = [];
  ui.engTaught = 'true';
  ui.cityScales = [];
  ui.climates = [];
  ui.languages = [];
  ui.residencies = [];
  ui.sortMetric = 'manifest_order';
  ui.sortDirection = 'asc';
}

function exportProgramsToCsv(programs) {
  const headers = [
    'program_id',
    'university_slug',
    'university',
    'display_name',
    'manifest_order',
    'program',
    'faculty',
    'campus',
    'city',
    'country',
    'region',
    'duration',
    'eng_taught',
    'type',
    'url',
    'city_scale',
    'climate',
    'language',
    'residency',
    'qs',
    'the',
    'usnews'
  ];

  const lines = [
    headers.join(','),
    ...(programs || []).map((p) => {
      const row = [
        p.program_id,
        p.university_slug,
        p.university,
        p.display_name,
        p.manifest_order,
        p.program,
        p.faculty,
        (p.campus_list || []).join('+'),
        (p.city_list || []).join('+'),
        (p.country_list || []).join('+'),
        (p.region_list || []).join('+'),
        p.duration,
        p.eng_taught,
        p.type,
        p.url,
        (p.city_scale_list || []).join('+'),
        (p.climate_list || []).join('+'),
        (p.language_list || []).join('+'),
        (p.residency_list || []).join('+'),
        p.qs,
        p.the,
        p.usnews
      ];

      return row
        .map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`)
        .join(',');
    })
  ];

  downloadTextFile('university_guidebook_filtered.csv', lines.join('\n'), 'text/csv;charset=utf-8');
}

export function bindStaticEvents(state, refresh) {
  const ui = state.ui;

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      ui.search = e.target.value.trim();
      refresh();
    });
  }

  const bindings = [
    ['schoolSelect', 'schools'],
    ['regionSelect', 'regions'],
    ['countrySelect', 'countries'],
    ['citySelect', 'cities'],
    ['campusSelect', 'campuses'],
    ['facultySelect', 'faculties'],
    ['durationSelect', 'durations'],
    ['cityScaleSelect', 'cityScales'],
    ['climateSelect', 'climates'],
    ['languageSelect', 'languages'],
    ['residencySelect', 'residencies']
  ];

  bindings.forEach(([selectId, uiKey]) => {
    const el = document.getElementById(selectId);
    if (!el) return;

    el.addEventListener('change', () => {
      ui[uiKey] = readMultiSelectValues(selectId);
      refresh();
    });
  });

  const engTaughtSelect = document.getElementById('engTaughtSelect');
  if (engTaughtSelect) {
    engTaughtSelect.addEventListener('change', () => {
      ui.engTaught = engTaughtSelect.value;
      refresh();
    });
  }

  const sortMetricSelect = document.getElementById('sortMetricSelect');
  if (sortMetricSelect) {
    sortMetricSelect.addEventListener('change', () => {
      ui.sortMetric = sortMetricSelect.value;
      refresh();
    });
  }

  const sortDirectionSelect = document.getElementById('sortDirectionSelect');
  if (sortDirectionSelect) {
    sortDirectionSelect.addEventListener('change', () => {
      ui.sortDirection = sortDirectionSelect.value;
      refresh();
    });
  }

  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      resetUiState(ui);
      refresh();
    });
  }

  const restoreEngOnlyBtn = document.getElementById('restoreEngOnlyBtn');
  if (restoreEngOnlyBtn) {
    restoreEngOnlyBtn.addEventListener('click', () => {
      ui.engTaught = 'true';
      refresh();
    });
  }

  const exportCsvBtn = document.getElementById('exportCsvBtn');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      exportProgramsToCsv(state.filtered || []);
    });
  }

  const closeDetailBtn = document.getElementById('closeDetailBtn');
  const dialog = document.getElementById('programDetailDialog');

  if (closeDetailBtn && dialog) {
    closeDetailBtn.addEventListener('click', () => {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    });

    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        if (typeof dialog.close === 'function') {
          dialog.close();
        } else {
          dialog.removeAttribute('open');
        }
      }
    });
  }

  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark');
    });
  }
}