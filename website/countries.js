let countryCache = null;

async function fetchCountryData() {
  if (countryCache) return countryCache;

  try {
    const response = await fetch(
      "https://restcountries.com/v3.1/all?fields=name,cca3,flag",
    );
    const data = await response.json();

    countryCache = {};
    data.forEach((country) => {
      if (country.cca3 && country.name && country.name.common) {
        countryCache[country.cca3] = `${country.flag} ${country.name.common}`;
      }
    });

    return countryCache;
  } catch (error) {
    console.error("Error fetching country data:", error);
    return {};
  }
}

export const countriesPromise = fetchCountryData();

export async function getCountryName(code) {
  const countries = await countriesPromise;
  return countries[code] || code;
}
