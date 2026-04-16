import {
  slugify,
  splitPlusValues,
  unique,
  indexBy,
  toNumberOrNull
} from './utils.js';

function buildValueOrderMaps(rows, keyField, valueField) {
  const valueMap = {};
  const orderMap = {};

  (rows || []).forEach((row) => {
    const key = String(row?.[keyField] || '').trim();
    const value = String(row?.[valueField] || '').trim();

    const orderRaw =
      row?.sort_order ??
      row?.sortOrder ??
      row?.order ??
      row?.rank_order ??
      '';

    const order = toNumberOrNull(orderRaw);

    if (key) valueMap[key] = value;

    if (value && order != null && orderMap[value] == null) {
      orderMap[value] = order;
    }
  });

  return { valueMap, orderMap };
}

function buildCountryRegionMap(regionRows) {
  return indexBy(regionRows, 'country', 'region');
}

function buildCountryResidencyMap(residencyRows) {
  return indexBy(residencyRows, 'country', 'residency');
}

function buildRankingMap(rows) {
  const map = {};

  (rows || []).forEach((row) => {
    const slug = String(row?.slug || '').trim();
    if (!slug) return;

    map[slug] = {
      qs: toNumberOrNull(row.qs),
      the: toNumberOrNull(row.the),
      usnews: toNumberOrNull(row.usnews)
    };
  });

  return map;
}

function buildDisplayNameMap(rows) {
  return indexBy(rows, 'slug', 'display_name');
}

function buildCampusCityMap(rows) {
  return indexBy(rows, 'campus', 'city');
}

function buildProgramId(program) {
  return slugify(
    [
      program.university_slug,
      program.program,
      program.faculty,
      program.campus_raw,
      program.duration
    ].join('_')
  );
}

function getOrderForList(values, orderMap) {
  if (!Array.isArray(values) || values.length === 0) return null;

  const numericOrders = values
    .map((value) => orderMap[value])
    .filter((order) => Number.isFinite(order));

  if (numericOrders.length === 0) return null;
  return Math.min(...numericOrders);
}

export function normalizePrograms(loaded) {
  const { mappings, schoolBundles } = loaded;

  const { valueMap: cityScaleMap, orderMap: cityScaleOrderMap } =
    buildValueOrderMaps(mappings.cityScaleRows, 'city', 'city_scale');

  const { valueMap: climateMap, orderMap: climateOrderMap } =
    buildValueOrderMaps(mappings.climateRows, 'city', 'climate');

  const countryMap = indexBy(mappings.countryRows, 'city', 'country');
  const languageMap = indexBy(mappings.languageRows, 'city', 'language');
  const regionMap = buildCountryRegionMap(mappings.regionRows);

  const { valueMap: residencyMap, orderMap: residencyOrderMap } =
    buildValueOrderMaps(mappings.residencyRows, 'country', 'residency');

  const rankingMap = buildRankingMap(mappings.rankingRows);
  const displayNameMap = buildDisplayNameMap(mappings.displayNameRows);

  const results = [];

  (schoolBundles || []).forEach((bundle) => {
    const school = bundle.school;
    const campusCityMap = buildCampusCityMap(bundle.campusCityRows);

    const universitySlug = school.slug;
    const universityName = school.university;
    const displayName = displayNameMap[universitySlug] || universityName;
    const ranking = rankingMap[universitySlug] || { qs: null, the: null, usnews: null };

    (bundle.programRows || []).forEach((row) => {
      const campusList = splitPlusValues(row.campus);
      const cityList = unique(
        campusList
          .map((campus) => campusCityMap[campus])
          .filter(Boolean)
      );

      const countryList = unique(
        cityList.map((city) => countryMap[city]).filter(Boolean)
      );

      const regionList = unique(
        countryList.map((country) => regionMap[country]).filter(Boolean)
      );

      const cityScaleList = unique(
        cityList.map((city) => cityScaleMap[city]).filter(Boolean)
      );

      const climateList = unique(
        cityList.map((city) => climateMap[city]).filter(Boolean)
      );

      const languageList = unique(
        cityList.map((city) => languageMap[city]).filter(Boolean)
      );

      const residencyList = unique(
        countryList.map((country) => residencyMap[country]).filter(Boolean)
      );

      const normalized = {
        university_slug: universitySlug,
        university: universityName,
        display_name: displayName,
        manifest_order: bundle.manifest_order,

        program: String(row.program || '').trim(),
        faculty: String(row.faculty || '').trim(),
        campus_raw: String(row.campus || '').trim(),
        campus_list: campusList,

        city_list: cityList,
        country_list: countryList,
        region_list: regionList,

        city_scale_list: cityScaleList,
        climate_list: climateList,
        language_list: languageList,
        residency_list: residencyList,

        city_scale_order: getOrderForList(cityScaleList, cityScaleOrderMap),
        climate_order: getOrderForList(climateList, climateOrderMap),
        residency_order: getOrderForList(residencyList, residencyOrderMap),

        duration: String(row.duration || '').trim(),
        eng_taught: String(row.eng_taught || '').trim(),
        type: String(row.type || '').trim(),
        url: String(row.url || '').trim(),

        qs: ranking.qs,
        the: ranking.the,
        usnews: ranking.usnews
      };

      normalized.program_id = buildProgramId(normalized);

      results.push(normalized);
    });
  });

  return results;
}