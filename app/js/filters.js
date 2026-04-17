import {
  matchesSearch,
  hasIntersection
} from './utils.js';

function sortValuesByOrderThenLabel(values, orderMap = null) {
  return [...(values || [])].sort((a, b) => {
    const ao = orderMap?.[a];
    const bo = orderMap?.[b];

    const aHasOrder = Number.isFinite(ao);
    const bHasOrder = Number.isFinite(bo);

    if (aHasOrder && bHasOrder && ao !== bo) {
      return ao - bo;
    }

    if (aHasOrder && !bHasOrder) return -1;
    if (!aHasOrder && bHasOrder) return 1;

    return String(a).localeCompare(String(b), 'zh-CN');
  });
}

function matchArray(selectedValues, itemValues) {
  return hasIntersection(itemValues, selectedValues);
}

export function applyFilters(programs, ui) {
  return (programs || []).filter((program) => {
    if (!matchesSearch(program, ui.search)) return false;

    if (!matchArray(ui.schools, [program.university_slug, program.display_name])) {
      return false;
    }

    if (!matchArray(ui.regions, program.region_list)) return false;
    if (!matchArray(ui.countries, program.country_list)) return false;
    if (!matchArray(ui.cities, program.city_list)) return false;
    if (!matchArray(ui.campuses, program.campus_list)) return false;
    if (!matchArray(ui.durations, [program.duration])) return false;
    if (!matchArray(ui.cityScales, program.city_scale_list)) return false;
    if (!matchArray(ui.climates, program.climate_list)) return false;
    if (!matchArray(ui.languages, program.language_list)) return false;
    if (!matchArray(ui.residencies, program.residency_list)) return false;

    if (
      ui.facultyGroups.length > 0 &&
      program.faculty_group_list.length > 0 &&
      !matchArray(ui.facultyGroups, program.faculty_group_list)
    ) {
      return false;
    }
    
    if (!matchArray(ui.engTaught, [normalizeEngTaught(program.eng_taught)])) {
      return false;
    }

    return true;
  });
}

export function normalizeEngTaught(value) {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized === 'true' || normalized === 'yes' || normalized === 'y' || normalized === '1') {
    return 'true';
  }

  if (normalized === 'false' || normalized === 'no' || normalized === 'n' || normalized === '0') {
    return 'false';
  }

  return 'unknown';
}

export function buildFilterOptions(programs) {
  const options = {
    schools: new Set(),
    regions: new Set(),
    countries: new Set(),
    cities: new Set(),
    campuses: new Set(),
    facultyGroups: new Set(),
    durations: new Set(),
    cityScales: new Set(),
    climates: new Set(),
    languages: new Set(),
    residencies: new Set(),

    cityScaleOrderMap: {},
    climateOrderMap: {},
    languageOrderMap: {},
    residencyOrderMap: {}
  };

  (programs || []).forEach((program) => {
    options.schools.add(program.university_slug);

    (program.region_list || []).forEach((v) => options.regions.add(v));
    (program.country_list || []).forEach((v) => options.countries.add(v));
    (program.city_list || []).forEach((v) => options.cities.add(v));
    (program.campus_list || []).forEach((v) => options.campuses.add(v));

    (program.faculty_group_list || []).forEach((v) => options.facultyGroups.add(v));
    if (program.duration) options.durations.add(program.duration);

    (program.city_scale_list || []).forEach((v) => {
      options.cityScales.add(v);
      if (program.city_scale_order != null && options.cityScaleOrderMap[v] == null) {
        options.cityScaleOrderMap[v] = program.city_scale_order;
      }
    });

    (program.climate_list || []).forEach((v) => {
      options.climates.add(v);
      if (program.climate_order != null && options.climateOrderMap[v] == null) {
        options.climateOrderMap[v] = program.climate_order;
      }
    });

    (program.language_list || []).forEach((v) => {
      options.languages.add(v);
      if (program.language_order != null && options.languageOrderMap[v] == null) {
        options.languageOrderMap[v] = program.language_order;
      }
    });

    (program.residency_list || []).forEach((v) => {
      options.residencies.add(v);
      if (program.residency_order != null && options.residencyOrderMap[v] == null) {
        options.residencies.add(v);
        options.residencyOrderMap[v] = program.residency_order;
      }
    });
  });

  return {
    schools: [...options.schools].sort((a, b) => String(a).localeCompare(String(b), 'zh-CN')),
    regions: [...options.regions].sort((a, b) => String(a).localeCompare(String(b), 'zh-CN')),
    countries: [...options.countries].sort((a, b) => String(a).localeCompare(String(b), 'zh-CN')),
    cities: [...options.cities].sort((a, b) => String(a).localeCompare(String(b), 'zh-CN')),
    campuses: [...options.campuses].sort((a, b) => String(a).localeCompare(String(b), 'zh-CN')),
    facultyGroups: [...options.facultyGroups].sort((a, b) => String(a).localeCompare(String(b), 'zh-CN')),
    durations: [...options.durations].sort((a, b) => String(a).localeCompare(String(b), 'zh-CN')),
    cityScales: sortValuesByOrderThenLabel([...options.cityScales], options.cityScaleOrderMap),
    climates: sortValuesByOrderThenLabel([...options.climates], options.climateOrderMap),
    languages: sortValuesByOrderThenLabel([...options.languages], options.languageOrderMap),
    residencies: sortValuesByOrderThenLabel([...options.residencies], options.residencyOrderMap),

    cityScaleOrderMap: options.cityScaleOrderMap,
    climateOrderMap: options.climateOrderMap,
    languageOrderMap: options.languageOrderMap,
    residencyOrderMap: options.residencyOrderMap
  };
}