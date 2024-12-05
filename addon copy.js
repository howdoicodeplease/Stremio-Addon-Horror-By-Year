const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

// Simple cache to store IMDb data
const cache = new Map();
const CACHE_DURATION = 3600000; // Cache duration in ms (1 hour)
function generateYears() {
  const years = [];
  for (let year = 2023; year >= 2000; year--) {
    years.push(year.toString());
  }
  return years;
}
// Function to scrape IMDb for horror movies
async function scrapeHorrorMovies(year) {
  let url = "https://www.imdb.com/search/title/?genres=horror&sort=year,desc&title_type=movie";
  if (year) {
    url += `&release_date=${year}-01-01,${year}-12-31`;
}

  // Check cache first
  if (cache.has(url)) {
    const cachedData = cache.get(url);
    if (Date.now() - cachedData.timestamp < CACHE_DURATION) {
      console.log("Serving from cache...");
      return cachedData.data;
    }
    cache.delete(url); // Remove expired cache
  }

  try {
    // Make the request with a User-Agent header to mimic a real browser
    const axiosConfig = {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
      },
    };

    console.log("Scraping horror movies from IMDb...");
    const { data } = await axios.get(url, axiosConfig);
    // console.log("HTML snippet from IMDb:", data);

    const $ = cheerio.load(data);

    const movies = [];
    $(".ipc-metadata-list-summary-item").each((index, element) => {
      const title = $(element).find(".ipc-title__text").text();
      const year = $(element)
        .find(".dli-title-metadata-item")
        .text()
        .match(/\d{4}/)?.[0];
      const poster = $(element).find(".ipc-media__img").attr("loadlate");
      const imdbId = $(element)
        .find(".ipc-title-link-wrapper")
        .attr("href")
        .match(/tt\d+/)?.[0];
      const description = $(element)
        .find(".ipc-html-content-inner-div")
        .text()
        .trim();
    //   console.log(`Movie ${index + 1}:`);
    //   console.log(`Title: ${title}`);
    //   console.log(`Year: ${year}`);
    //   console.log(`Poster: ${poster}`);
    //   console.log(`IMDb ID: ${imdbId}`);
    //   console.log("---");
      if (title && imdbId) {
        movies.push({
          id: imdbId,
          name: title,
          poster: poster || "",
          description: description || "",
          releaseInfo: year || "",
        });
      }
    });

    // console.log("Scraped movies:", movies); // Log the extracted movie data

    // Cache the results
    cache.set(url, { data: movies, timestamp: Date.now() });
    console.log("Movies fetched and cached.");
    return movies;
  } catch (error) {
    console.error("Error scraping IMDb:");
    if (error.response) {
      console.error(`Response error: Status code ${error.response.status}`);
      console.error(
        `Response headers: ${JSON.stringify(error.response.headers)}`
      );
      console.error(`Response data: ${error.response.data}`);
    } else if (error.request) {
      console.error("No response received from IMDb.");
      console.error(`Request: ${JSON.stringify(error.request)}`);
    } else {
      console.error("Error setting up the request:", error.message);
    }
    console.error(error.stack);
    return [];
  }
}
// Define Stremio Addon Manifest
const manifest = {
  id: "org.example.horroraddon",
  version: "1.0.1",
  name: "Horror Movies Add-on",
  description: "Fetches and sorts horror movies from IMDb",
  resources: ["catalog", "stream"],
  types: ["movie"],
  catalogs: [
    {
      type: "movie",
      id: "horror_movies",
      name: "Horror Movies",
      extra: 
        [{
          name: "genre",
          isRequired: false,
          options:  [
            "2023", "2022", "2021", "2020", "2019", "2018", "2017", "2016", "2015",
            "2014", "2013", "2012", "2011", "2010", "2009", "2008", "2007", "2006", 
            "2005", "2004", "2003", "2002", "2001", "2000"
          ] // Generate years from 2023 to 2000
        }]
      
    }
  ]
};

// Create the Add-on Builder
const builder = new addonBuilder(manifest);

// Define the Catalog Handler
builder.defineCatalogHandler(async ({ type, id, extra }) => {
  console.log('Received extra parameters:', extra);
  console.log(type, id);
  
  if (type === "movie" && id === "horror_movies") {
    let movies = await scrapeHorrorMovies(extra.genre);

    // Sort by Year if Requested
    if (extra.genre) {
      const filterYear = parseInt(extra.year);
      if (filterYear) {
          movies = movies.filter((movie) => movie.releaseInfo === filterYear);
          console.log(`Filtered movies for year ${filterYear}:`, movies);
      }
  }

    return Promise.resolve({
      metas: movies.map((movie) => ({
        id: movie.id,
        name: movie.name,
        poster: movie.poster,
        description: movie.description,
        releaseInfo: movie.releaseInfo,
      })),
    });
  }
  return Promise.resolve({ metas: [] });
});

builder.defineStreamHandler(async ({ type, id }) => {
  console.log(`Stream request received for type: ${type}, id: ${id}`);

  const streams = [
      {
          name: "Torrentio",
          type: "torrent",
          infoHash: "example_info_hash", // Replace with a valid info hash
          title: "720p version",
          url: "magnet:?xt=urn:btih:example_info_hash&dn=Example+Movie",
      },
  ];

  return Promise.resolve({ streams });
});

// Serve the Add-on
module.exports = builder.getInterface();
