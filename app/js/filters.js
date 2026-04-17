import {
  matchesSearch,
  hasIntersection
} from './utils.js';

function matchArray(selectedValues, itemValues) {
  return hasIntersection(itemValues, selectedValues);
}

export function applyFilters(programs, ui) {
  return (programs || []).filter((program) => {
    if (!matchesSearch(program, ui.search)) return false;

    if (!matchArray(ui.schools, [program.university_slug, program.university, program.display_name])) {
      return false;
    }

    if (!matchArray(ui.regions, program.region_list)) return false;
    if (!matchArray(ui.countries, program.country_list)) return false;
    if (!matchArray(ui.cities, program.city_list)) return false;
    if (!matchArray(ui.campuses, program.campus_list)) return false;
    if (!matchArray(ui.faculties, [program.faculty])) return false;
    if (!matchArray(ui.durations, [program.duration])) return false;
    if (!matchArray(ui.cityScales, program.city_scale_list)) return false;
    if (!matchArray(ui.climates, program.climate_list)) return false;
    if (!matchArray(ui.languages, program.language_list)) return false;
    if (!matchArray(ui.residencies, program.residency_list)) return false;

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
    faculties: new Set(),
    durations: new Set(),
    cityScales: new Set(),
    climates: new Set(),
    languages: new Set(),
    residencies: new Set()
  };

  (programs || []).forEach((program) => {
    options.schools.add(program.university_slug);

    (program.region_list || []).forEach((v) => options.regions.add(v));
    (program.country_list || []).forEach((v) => options.countries.add(v));
    (program.city_list || []).forEach((v) => options.cities.add(v));
    (program.campus_list || []).forEach((v) => options.campuses.add(v));
    (program.city_scale_list || []).forEach((v) => options.cityScales.add(v));
    (program.climate_list || []).forEach((v) => options.climates.add(v));
    (program.language_list || []).forEach((v) => options.languages.add(v));
    (program.residency_list || []).forEach((v) => options.residencies.add(v));

    if (program.faculty) options.faculties.add(program.faculty);
    if (program.duration) options.durations.add(program.duration);
  });

  return {
    schools: [...options.schools].sort((a, b) => String(a).localeCompare(String(b), 'zh-CN')),
    regions: [...options.regions].sort((a, b) => String(a).localeCompare(String(b), 'zh-CN')),
    countries: [...options.countries].sort((a, b) => String(a).localeCompare(String(b), 'zh-CN')),
    cities: [...options.cities].sort((a, b) => String(a).localeCompare(String(b), 'zh-CN')),
    campuses: [...options.campuses].sort((a, b) => String(a).localeCompare(String(b), 'zh-CN')),
    faculties: [...options.faculties].sort((a, b) => String(a).localeCompare(String(b), 'zh-CN')),
    durations: [...options.durations].sort((a, b) => String(a).localeCompare(String(b), 'zh-CN')),
    cityScales: [...options.cityScales].sort((a, b) => String(a).localeCompare(String(b), 'zh-CN')),
    climates: [...options.climates].sort((a, b) => String(a).localeCompare(String(b), 'zh-CN')),
    languages: [...options.languages].sort((a, b) => String(a).localeCompare(String(b), 'zh-CN')),
    residencies: [...options.residencies].sort((a, b) => String(a).localeCompare(String(b), 'zh-CN'))
  };
}