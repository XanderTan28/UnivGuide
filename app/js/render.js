import { buildFilterOptions } from './filters.js';
import {
  escapeHtml,
  textYesNo,
  downloadTextFile
} from './utils.js';

const expandedUniversitySet = new Set();

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? '';
}

function buildSchoolEntries(programs) {
  const map = {};
  (programs || []).forEach((program) => {
    if (!map[program.university_slug]) {
      map[program.university_slug] =
        program.display_name || program.university || program.university_slug;
    }
  });

  return Object.entries(map)
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
}

function buildEntries(values, labelMap = null) {
  return (values || [])
    .map((value) => ({
      value,
      label: labelMap?.[value] || value
    }))
    .sort((a, b) => String(a.label).localeCompare(String(b.label), 'zh-CN'));
}

function summarizeSelected(entries, selectedValues, fallback = '全部') {
  const normalizedSelected = (selectedValues || []).map((v) => String(v));
  const selectedSet = new Set(normalizedSelected);
  const allValues = (entries || []).map((item) => String(item.value));
  const allSelected =
    allValues.length > 0 &&
    allValues.length === normalizedSelected.length &&
    allValues.every((value) => selectedSet.has(value));

  if (allSelected) return fallback;

  const selectedLabels = (entries || [])
    .filter((item) => selectedSet.has(String(item.value)))
    .map((item) => item.label);

  if (selectedLabels.length === 0) return fallback;
  if (selectedLabels.length <= 3) return selectedLabels.join('、');
  return `已选 ${selectedLabels.length} 项`;
}

function renderCheckboxDropdown(hostId, entries, selectedValues, fallback = '全部') {
  const host = document.getElementById(hostId);
  if (!host) return;

  const normalizedSelected = (selectedValues || []).map((v) => String(v));
  const selectedSet = new Set(normalizedSelected);
  const allValues = (entries || []).map((item) => String(item.value));
  const allSelected =
    allValues.length > 0 &&
    allValues.length === normalizedSelected.length &&
    allValues.every((value) => selectedSet.has(value));

  const summary = summarizeSelected(entries, selectedValues, fallback);

  host.innerHTML = `
    <div class="filter-dropdown" data-filter-id="${escapeHtml(hostId)}">
      <button type="button" class="filter-dropdown__button">
        <span class="filter-dropdown__label">${escapeHtml(summary)}</span>
      </button>

      <div class="filter-dropdown__panel">
        <div class="filter-dropdown__list">
          <label
            class="filter-dropdown__row filter-dropdown__row--select-all"
            data-action="toggle-all"
          >
            <input
              class="filter-dropdown__checkbox filter-dropdown__checkbox--select-all"
              type="checkbox"
              ${allSelected ? 'checked' : ''}
            />
            <span>全选</span>
          </label>

          ${
            entries.length
              ? entries.map((item) => `
                <label class="filter-dropdown__row">
                  <input
                    class="filter-dropdown__checkbox"
                    type="checkbox"
                    value="${escapeHtml(item.value)}"
                    ${selectedSet.has(String(item.value)) ? 'checked' : ''}
                  />
                  <span>${escapeHtml(item.label)}</span>
                </label>
              `).join('')
              : `<div class="filter-dropdown__empty">暂无可选项</div>`
          }
        </div>
      </div>
    </div>
  `;
}

function renderSingleSelectDropdown(hostId, entries, selectedValue, fallback = '请选择') {
  const host = document.getElementById(hostId);
  if (!host) return;

  const normalizedSelected = String(selectedValue || '');
  const selectedEntry =
    (entries || []).find((item) => String(item.value) === normalizedSelected) || null;

  const summary = selectedEntry?.label || fallback;

  host.innerHTML = `
    <div class="filter-dropdown" data-filter-id="${escapeHtml(hostId)}">
      <button type="button" class="filter-dropdown__button">
        <span class="filter-dropdown__label">${escapeHtml(summary)}</span>
      </button>

      <div class="filter-dropdown__panel">
        <div class="filter-dropdown__list">
          ${
            entries.length
              ? entries.map((item) => `
                <button
                  type="button"
                  class="filter-dropdown__row filter-dropdown__row--single ${String(item.value) === normalizedSelected ? 'is-selected' : ''}"
                  data-single-value="${escapeHtml(item.value)}"
                >
                  <span>${escapeHtml(item.label)}</span>
                </button>
              `).join('')
              : `<div class="filter-dropdown__empty">暂无可选项</div>`
          }
        </div>
      </div>
    </div>
  `;
}

function renderSortDirectionToggle(hostId, selectedValue = 'asc') {
  const host = document.getElementById(hostId);
  if (!host) return;

  const current = selectedValue === 'desc' ? 'desc' : 'asc';

  host.innerHTML = `
    <div class="sort-direction-toggle" role="group" aria-label="排序方向">
      <button
        type="button"
        class="sort-direction-toggle__btn ${current === 'asc' ? 'is-active' : ''}"
        data-sort-direction="asc"
      >
        升序
      </button>
      <button
        type="button"
        class="sort-direction-toggle__btn ${current === 'desc' ? 'is-active' : ''}"
        data-sort-direction="desc"
      >
        降序
      </button>
    </div>
  `;
}

function readCheckboxDropdownValues(hostId) {
  const host = document.getElementById(hostId);
  if (!host) return [];

  return [
    ...host.querySelectorAll('.filter-dropdown__checkbox:checked:not(.filter-dropdown__checkbox--select-all)')
  ].map((input) => input.value);
}

function bindDropdownInteractions(hostId, ui, uiKey, refresh) {
  const host = document.getElementById(hostId);
  if (!host) return;

  const dropdown = host.querySelector('.filter-dropdown');
  const button = host.querySelector('.filter-dropdown__button');
  const panel = host.querySelector('.filter-dropdown__panel');

  if (!dropdown || !button || !panel) return;

  button.addEventListener('click', (e) => {
    e.stopPropagation();

    document.querySelectorAll('.filter-dropdown.is-open').forEach((el) => {
      if (el !== dropdown) el.classList.remove('is-open');
    });

    dropdown.classList.toggle('is-open');
  });

  panel.addEventListener('click', (e) => {
    e.stopPropagation();

    const selectAllRow = e.target.closest('[data-action="toggle-all"]');
    if (selectAllRow) {
      const selectAllCheckbox = host.querySelector('.filter-dropdown__checkbox--select-all');
      const itemCheckboxes = [
        ...host.querySelectorAll('.filter-dropdown__checkbox:not(.filter-dropdown__checkbox--select-all)')
      ];

      const shouldSelectAll = !selectAllCheckbox.checked;

      selectAllCheckbox.checked = shouldSelectAll;
      itemCheckboxes.forEach((input) => {
        input.checked = shouldSelectAll;
      });

      ui[uiKey] = shouldSelectAll
        ? itemCheckboxes.map((input) => input.value)
        : [];

      refresh();
      return;
    }

    if (e.target.classList.contains('filter-dropdown__checkbox')) {
      if (e.target.classList.contains('filter-dropdown__checkbox--select-all')) {
        return;
      }

      ui[uiKey] = readCheckboxDropdownValues(hostId);

      const selectAllCheckbox = host.querySelector('.filter-dropdown__checkbox--select-all');
      const itemCheckboxes = [
        ...host.querySelectorAll('.filter-dropdown__checkbox:not(.filter-dropdown__checkbox--select-all)')
      ];

      const allChecked =
        itemCheckboxes.length > 0 &&
        itemCheckboxes.every((input) => input.checked);

      if (selectAllCheckbox) {
        selectAllCheckbox.checked = allChecked;
      }

      refresh();
    }
  });
}

function bindSingleSelectDropdown(hostId, ui, uiKey, refresh) {
  const host = document.getElementById(hostId);
  if (!host) return;

  const dropdown = host.querySelector('.filter-dropdown');
  const button = host.querySelector('.filter-dropdown__button');
  const panel = host.querySelector('.filter-dropdown__panel');

  if (!dropdown || !button || !panel) return;

  button.addEventListener('click', (e) => {
    e.stopPropagation();

    document.querySelectorAll('.filter-dropdown.is-open').forEach((el) => {
      if (el !== dropdown) el.classList.remove('is-open');
    });

    dropdown.classList.toggle('is-open');
  });

  panel.addEventListener('click', (e) => {
    e.stopPropagation();

    const row = e.target.closest('[data-single-value]');
    if (!row) return;

    ui[uiKey] = row.dataset.singleValue || '';
    refresh();
  });
}

function bindSortDirectionToggle(hostId, ui, refresh) {
  const host = document.getElementById(hostId);
  if (!host) return;

  host.querySelectorAll('[data-sort-direction]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();

      const value = btn.dataset.sortDirection;
      if (!value) return;

      ui.sortDirection = value;
      refresh();
    });
  });
}

function isSameSelection(selectedValues, defaultValues) {
  const selected = [...new Set((selectedValues || []).map((v) => String(v)))].sort();
  const defaults = [...new Set((defaultValues || []).map((v) => String(v)))].sort();

  if (selected.length !== defaults.length) return false;
  return selected.every((value, index) => value === defaults[index]);
}

function getDefaultFilterState(programs) {
  const options = buildFilterOptions(programs);

  return {
    schools: [...options.schools],
    regions: [...options.regions],
    countries: [...options.countries],
    cities: [...options.cities],
    campuses: [...options.campuses],
    faculties: [...options.faculties],
    durations: [...options.durations],
    cityScales: [...options.cityScales],
    climates: [...options.climates],
    languages: [...options.languages],
    residencies: [...options.residencies],
    engTaught: ['true']
  };
}

function renderActiveTags(ui, programs) {
  const container = document.getElementById('activeFilterTags');
  if (!container) return;

  const schoolMap = {};
  (programs || []).forEach((program) => {
    if (!schoolMap[program.university_slug]) {
      schoolMap[program.university_slug] =
        program.display_name || program.university || program.university_slug;
    }
  });

  const defaults = getDefaultFilterState(programs);
  const tags = [];

  if (ui.search) tags.push(`搜索：${ui.search}`);

  if (!isSameSelection(ui.engTaught, defaults.engTaught)) {
    (ui.engTaught || []).forEach((v) => {
      const label =
        v === 'true' ? '英授' :
        v === 'false' ? '非英授' :
        '未知';
      tags.push(`授课语言：${label}`);
    });
  }

  if (!isSameSelection(ui.schools, defaults.schools)) {
    (ui.schools || []).forEach((v) => tags.push(`大学：${schoolMap[v] || v}`));
  }

  if (!isSameSelection(ui.regions, defaults.regions)) {
    (ui.regions || []).forEach((v) => tags.push(`地区：${v}`));
  }

  if (!isSameSelection(ui.countries, defaults.countries)) {
    (ui.countries || []).forEach((v) => tags.push(`国家：${v}`));
  }

  if (!isSameSelection(ui.cities, defaults.cities)) {
    (ui.cities || []).forEach((v) => tags.push(`城市：${v}`));
  }

  if (!isSameSelection(ui.campuses, defaults.campuses)) {
    (ui.campuses || []).forEach((v) => tags.push(`校区：${v}`));
  }

  if (!isSameSelection(ui.faculties, defaults.faculties)) {
    (ui.faculties || []).forEach((v) => tags.push(`学院：${v}`));
  }

  if (!isSameSelection(ui.durations, defaults.durations)) {
    (ui.durations || []).forEach((v) => tags.push(`学制：${v}`));
  }

  if (!isSameSelection(ui.cityScales, defaults.cityScales)) {
    (ui.cityScales || []).forEach((v) => tags.push(`城市规模：${v}`));
  }

  if (!isSameSelection(ui.climates, defaults.climates)) {
    (ui.climates || []).forEach((v) => tags.push(`气候：${v}`));
  }

  if (!isSameSelection(ui.languages, defaults.languages)) {
    (ui.languages || []).forEach((v) => tags.push(`语言环境：${v}`));
  }

  if (!isSameSelection(ui.residencies, defaults.residencies)) {
    (ui.residencies || []).forEach((v) => tags.push(`居留：${v}`));
  }

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

function getRepresentativeProgram(programs) {
  return (
    (programs || []).find((p) => (p.campus_list || [])[0] === 'Main Campus') ||
    (programs || []).find((p) => (p.campus_list || []).includes('Main Campus')) ||
    (programs || [])[0] ||
    null
  );
}

function buildProgramLocation(program) {
  return {
    city: (program?.city_list || [])[0] || '',
    country: (program?.country_list || [])[0] || '',
    region: (program?.region_list || [])[0] || '',
    cityScale: (program?.city_scale_list || [])[0] || '',
    climate: (program?.climate_list || [])[0] || '',
    language: (program?.language_list || [])[0] || '',
    residency: (program?.residency_list || [])[0] || ''
  };
}

function groupProgramsByUniversity(programs) {
  const map = new Map();

  (programs || []).forEach((program) => {
    const slug = program.university_slug;
    if (!map.has(slug)) {
      map.set(slug, []);
    }
    map.get(slug).push(program);
  });

  return [...map.entries()]
    .map(([slug, items]) => {
      const first = items[0];
      const representativeProgram = getRepresentativeProgram(items);

      return {
        university_slug: slug,
        display_name: first.display_name || first.university || slug,
        manifest_order: first.manifest_order,
        qs: first.qs,
        the: first.the,
        usnews: first.usnews,
        total_score: first.total_score ?? '',
        representativeProgram,
        programs: items
      };
    })
    .sort((a, b) => a.manifest_order - b.manifest_order);
}

function buildLocationPayload(location) {
  return encodeURIComponent(JSON.stringify(location));
}

function renderLocationCell(type, location) {
  const label =
    type === 'city' ? location.city :
    type === 'country' ? location.country :
    location.region;

  return `
    <button
      type="button"
      class="inline-link-btn location-trigger"
      data-location="${buildLocationPayload(location)}"
    >
      ${escapeHtml(label || '')}
    </button>
  `;
}

function bindLocationTriggers() {
  document.querySelectorAll('.location-trigger').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const payload = btn.dataset.location;
      if (!payload) return;
      const location = JSON.parse(decodeURIComponent(payload));
      openLocationDialog(location);
    });
  });
}

function openLocationDialog(location) {
  const dialog = document.getElementById('locationDetailDialog');
  if (!dialog) return;

  setText('locationDetailTitle', location.city || '地区信息');
  setText('locationDetailSubtitle', `${location.country || ''} · ${location.region || ''}`);

  setText('locCity', location.city || '');
  setText('locCountry', location.country || '');
  setText('locRegion', location.region || '');
  setText('locCityScale', location.cityScale || '');
  setText('locClimate', location.climate || '');
  setText('locLanguage', location.language || '');
  setText('locResidency', location.residency || '');

  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', 'open');
  }
}

function renderProgramLink(programName, url) {
  if (!programName) return '';

  return url
    ? `<a class="program-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(programName)}</a>`
    : escapeHtml(programName);
}

function renderSchoolMainRow(school, rank) {
  const program = school.representativeProgram || {};
  const location = buildProgramLocation(program);

  return `
    <tr
      class="school-row"
      data-university-slug="${escapeHtml(school.university_slug)}"
    >
      <td>${rank}</td>
      <td class="school-name-cell">
        <span class="school-name">${escapeHtml(school.display_name)}</span>
      </td>
      <td>${renderProgramLink(program.program, program.url)}</td>
      <td>${escapeHtml(program.faculty || '')}</td>
      <td>${escapeHtml((program.campus_list || []).join(' + '))}</td>
      <td class="location-cell">${renderLocationCell('city', location)}</td>
      <td class="location-cell">${renderLocationCell('country', location)}</td>
      <td class="location-cell">${renderLocationCell('region', location)}</td>
      <td>${escapeHtml(program.duration || '')}</td>
      <td>${escapeHtml(textYesNo(program.eng_taught || ''))}</td>
      <td>${escapeHtml(program.type || '')}</td>
      <td>${escapeHtml(school.qs ?? '')}</td>
      <td>${escapeHtml(school.the ?? '')}</td>
      <td>${escapeHtml(school.usnews ?? '')}</td>
      <td>${escapeHtml(school.total_score ?? '')}</td>
    </tr>
  `;
}

function renderProgramContinuationRows(school) {
  if (!expandedUniversitySet.has(school.university_slug)) return '';

  const representativeProgramId = school.representativeProgram?.program_id || '';

  return (school.programs || [])
    .filter((program) => program.program_id !== representativeProgramId)
    .map((program) => {
      const location = buildProgramLocation(program);

      return `
        <tr class="program-row program-row--continuation">
          <td></td>
          <td></td>
          <td>${renderProgramLink(program.program, program.url)}</td>
          <td>${escapeHtml(program.faculty || '')}</td>
          <td>${escapeHtml((program.campus_list || []).join(' + '))}</td>
          <td class="location-cell">${renderLocationCell('city', location)}</td>
          <td class="location-cell">${renderLocationCell('country', location)}</td>
          <td class="location-cell">${renderLocationCell('region', location)}</td>
          <td>${escapeHtml(program.duration || '')}</td>
          <td>${escapeHtml(textYesNo(program.eng_taught || ''))}</td>
          <td>${escapeHtml(program.type || '')}</td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      `;
    })
    .join('');
}

export function renderFilterOptions(programs, ui) {
  const options = buildFilterOptions(programs);

  renderCheckboxDropdown(
    'cityScaleSelect',
    buildEntries(options.cityScales),
    ui.cityScales
  );

  renderCheckboxDropdown(
    'climateSelect',
    buildEntries(options.climates),
    ui.climates
  );

  renderCheckboxDropdown(
    'languageSelect',
    buildEntries(options.languages),
    ui.languages
  );

  renderCheckboxDropdown(
    'residencySelect',
    buildEntries(options.residencies),
    ui.residencies
  );

  renderCheckboxDropdown(
    'regionSelect',
    buildEntries(options.regions),
    ui.regions
  );

  renderCheckboxDropdown(
    'countrySelect',
    buildEntries(options.countries),
    ui.countries
  );

  renderCheckboxDropdown(
    'citySelect',
    buildEntries(options.cities),
    ui.cities
  );

  renderCheckboxDropdown(
    'schoolSelect',
    buildSchoolEntries(programs),
    ui.schools
  );

  renderCheckboxDropdown(
    'campusSelect',
    buildEntries(options.campuses),
    ui.campuses
  );

  renderCheckboxDropdown(
    'facultySelect',
    buildEntries(options.faculties),
    ui.faculties
  );

  renderCheckboxDropdown(
    'durationSelect',
    buildEntries(options.durations),
    ui.durations
  );

  renderCheckboxDropdown(
    'engTaughtSelect',
    [
      { value: 'true', label: '英授' },
      { value: 'false', label: '非英授' },
      { value: 'unknown', label: '未知' }
    ],
    ui.engTaught,
    '英授'
  );

  renderSingleSelectDropdown(
    'sortMetricSelect',
    [
      { value: 'manifest_order', label: '排位' },
      { value: 'qs', label: 'QS' },
      { value: 'the', label: 'THE' },
      { value: 'usnews', label: 'US News' },
      { value: 'program', label: '项目名称' },
      { value: 'faculty', label: '学院' },
      { value: 'duration', label: '学制' },
      { value: 'city', label: '城市' },
      { value: 'country', label: '国家' },
      { value: 'region', label: '地区' },
      { value: 'city_scale', label: '城市规模' },
      { value: 'climate', label: '气候' },
      { value: 'language', label: '语言环境' },
      { value: 'residency', label: '居留' }
    ],
    ui.sortMetric,
    '排位'
  );

  renderSortDirectionToggle('sortDirectionToggle', ui.sortDirection);

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

  setText('resultCount', `${schoolCount} 所大学 / ${filtered.length} 个项目`);
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

  const schools = groupProgramsByUniversity(programs);

  if (!schools.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="15" class="table-empty">没有匹配结果</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = schools
    .map((school, index) => {
      return (
        renderSchoolMainRow(school, index + 1) +
        renderProgramContinuationRows(school)
      );
    })
    .join('');

  tbody.querySelectorAll('.school-row').forEach((row) => {
    row.addEventListener('click', () => {
      const slug = row.dataset.universitySlug;
      if (!slug) return;

      if (expandedUniversitySet.has(slug)) {
        expandedUniversitySet.delete(slug);
      } else {
        expandedUniversitySet.add(slug);
      }

      renderTable(programs);
    });
  });

  bindLocationTriggers();
}

function resetUiState(ui, programs) {
  const options = buildFilterOptions(programs);

  ui.search = '';

  ui.schools = [...options.schools];
  ui.regions = [...options.regions];
  ui.countries = [...options.countries];
  ui.cities = [...options.cities];
  ui.campuses = [...options.campuses];
  ui.faculties = [...options.faculties];
  ui.durations = [...options.durations];
  ui.cityScales = [...options.cityScales];
  ui.climates = [...options.climates];
  ui.languages = [...options.languages];
  ui.residencies = [...options.residencies];

  ui.engTaught = ['true'];

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
    'usnews',
    'total_score'
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
        p.usnews,
        p.total_score ?? ''
      ];

      return row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',');
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

  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      resetUiState(ui, state.normalized);
      refresh();
    });
  }

  const exportCsvBtn = document.getElementById('exportCsvBtn');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      exportProgramsToCsv(state.filtered || []);
    });
  }

  const closeLocationDetailBtn = document.getElementById('closeLocationDetailBtn');
  const locationDialog = document.getElementById('locationDetailDialog');

  if (closeLocationDetailBtn && locationDialog) {
    closeLocationDetailBtn.addEventListener('click', () => {
      if (typeof locationDialog.close === 'function') {
        locationDialog.close();
      } else {
        locationDialog.removeAttribute('open');
      }
    });

    locationDialog.addEventListener('click', (e) => {
      if (e.target === locationDialog) {
        if (typeof locationDialog.close === 'function') {
          locationDialog.close();
        } else {
          locationDialog.removeAttribute('open');
        }
      }
    });
  }

  document.addEventListener('click', () => {
    document.querySelectorAll('.filter-dropdown.is-open').forEach((el) => {
      el.classList.remove('is-open');
    });
  });

  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark');
    });
  }
}

export function bindDynamicFilterEvents(state, refresh) {
  const ui = state.ui;

  [
    ['cityScaleSelect', 'cityScales'],
    ['climateSelect', 'climates'],
    ['languageSelect', 'languages'],
    ['residencySelect', 'residencies'],
    ['regionSelect', 'regions'],
    ['countrySelect', 'countries'],
    ['citySelect', 'cities'],
    ['schoolSelect', 'schools'],
    ['campusSelect', 'campuses'],
    ['facultySelect', 'faculties'],
    ['durationSelect', 'durations'],
    ['engTaughtSelect', 'engTaught']
  ].forEach(([hostId, uiKey]) => {
    bindDropdownInteractions(hostId, ui, uiKey, refresh);
  });

  bindSingleSelectDropdown('sortMetricSelect', ui, 'sortMetric', refresh);
  bindSortDirectionToggle('sortDirectionToggle', ui, refresh);
}