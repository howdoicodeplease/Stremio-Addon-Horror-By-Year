const { addonBuilder } = require("stremio-addon-sdk");
// Simple cache to store IMDb data
const cache = new Map();
const CACHE_DURATION = 3600000; // Cache duration in ms (1 hour)
const fs = require("fs");
const path = require("path");

// Function to scrape IMDb for horror movies

 

  // Check cache first
  
 
    

    // console.log("Scraped movies:", movies); // Log the extracted movie data

    // Cache the results
    
// Define Stremio Addon Manifest
function loadMoviesFromFile(year) {
  
  year = year || 2024
  const filePath = path.join(`movies_${year}.json`);
  // console.log(filePath);
  
    try {
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading JSON file for year ${year}:`, error);
      return [];
    }
  } 

const manifest = {
  id: "org.example.horroraddon",
  version: "1.0.1",
  name: "Horror Movies Add-on",
  description: "Fetches and sorts horror movies from IMDb",
  resources: ["catalog", "meta"],
  types: ["movie"],
  catalogs: [
    {
      type: "movie",
      id: "horror_movies_by_year",
      name: "Horror Movies By Year",
      extra: 
        [{
          name: "genre",
          isRequired: true,
          options:  [
            "2024","2023", "2022", "2021", "2020", "2019", "2018", "2017", "2016", "2015",
            "2014", "2013", "2012", "2011", "2010", "2009", "2008", "2007", "2006", 
            "2005", "2004", "2003", "2002", "2001", "2000"
          ] // Generate years from 2023 to 2000
        },
        { "name": "skip", "isRequired": false },
      ]
      
    }
  ]
};

// Create the Add-on Builder
const builder = new addonBuilder(manifest);

// Define the Catalog Handler
builder.defineCatalogHandler(async ({ type, id, extra }) => {
  // console.log('Received extra parameters:', extra);
  // console.log(type, id);
  
  if (type === "movie" && id === "horror_movies") {
    let movies = await loadMoviesFromFile(extra.genre);
    // console.log(movies);
    
    // Sort by Year if Requested
    
    const skip = parseInt(extra.skip) || 0;
   
     
      // console.log(metas);
      
      
    return {
      metas: movies.slice(skip, skip + 100).map((movie) => ({
        id: movie.imdbId,
        name: movie.title,
        poster: movie.poster,
        description: movie.description,
        releaseInfo: movie.year,
        imdbRating:movie.rating,
        runtime:movie.movieLength,
        type:"movie"
      })),
    }

  }
  return Promise.resolve({ metas: [] });
});

builder.defineMetaHandler(async ({ type, id }) => {
  console.log(`Meta request received for type: ${type}, id: ${id}`);

  // Fetch metadata for a specific movie using its IMDb ID
  const allMovies = Array.from({ length: 25 }, (_, i) =>
    loadMoviesFromFile((2024 - i).toString())
  ).flat();
  const movie = allMovies.find((m) => m.imdbId === id);

  if (movie) {
    return {
      meta: {
        id: movie.imdbId,
        type: "movie",
        name: movie.title,
        poster: movie.poster,
        description: movie.description,
        releaseInfo: movie.year,
        imdbRating: movie.rating,
        runtime: movie.movieLength,
      },
    };
  }

  return { meta: null }; // Default response if no movie is found
});


// Serve the Add-on
module.exports = builder.getInterface();
