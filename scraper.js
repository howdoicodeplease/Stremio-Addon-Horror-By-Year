const puppeteer = require('puppeteer');
const fs = require('fs');

// Function to scrape movies for a specific year
async function scrapeMoviesForYear(year) {
    // const url = `https://www.imdb.com/search/title/?genres=horror&release_date=${year}-01-01,${year}-12-31&sort=user_rating,desc&title_type=movie&languages=en`;
    const url =`https://www.imdb.com/search/title/?genres=action&release_date=${year}-01-01,${year}-12-31&sort=num_votes,desc&title_type=movie&languages=en&num_votes=200`

     const browser = await puppeteer.launch({ headless: true });
    // const browser = await puppeteer.launch({
    //     headless: false,
    //     slowMo: 50, // Slows down operations by 50ms
    // });
    const page = await browser.newPage();
    // await page.goto(url, { waitUntil: 'networkidle2' });
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
    );
    await page.goto(url, {
        networkIdleTimeout: 5000,
        waitUntil: 'networkidle2',
        timeout: 3000000
    });
   
   
    const html = await page.content();
fs.writeFileSync('page_snapshot.html', html); // Save the HTML for inspection
console.log("Page snapshot saved as 'page_snapshot.html'");
    
    const movies = [];
    
    // Function to extract movies from the current page
    async function extractMovies() {
        page.on('console', msg => console.log("PAGE LOG:", msg.text()));
        await page.waitForSelector('.ipc-metadata-list-summary-item');
        const pageMovies = await page.evaluate(() => {

            const movieElements = document.querySelectorAll('.ipc-metadata-list-summary-item');
            console.log(`Found ${movieElements.length} movie elements`);

            return Array.from(movieElements).map(movie => {
                const rawTitle = movie.querySelector('.ipc-title__text').textContent;
                // console.log(title);
                const title = rawTitle.replace(/^\d+\.\s*/, '');
                const yearText = movie.querySelector('.dli-title-metadata-item')?.textContent;
                const movieLength= movie.querySelector('.dli-title-metadata-item')?.nextElementSibling?.textContent || null
                
                const year = yearText ? yearText.match(/\d{4}/)?.[0] : null;

                const rating = movie.querySelector('.ipc-rating-star--rating')?.innerText;
                const poster = movie.querySelector('.ipc-image')?.getAttribute('src') || 'No Poster';
                // console.log("poster",poster);
                
                const imdbIdText = movie.querySelector('.ipc-title-link-wrapper')?.getAttribute('href');
                const imdbId= imdbIdText.match(/tt\d+/)?.[0];
                // console.log("imdbId",imdbId);
                
                const description = movie.querySelector('.ipc-html-content-inner-div')?.textContent || 'no description'
                // console.log(description);
                
                return { title, year,poster, imdbId, description,rating,movieLength};
            });
        });
        // console.log(pageMovies)
        movies.push(pageMovies);
    }
    
    let loadMoreExists = true;
    
    let previousMovieCount = 0; // Tracks the number of movies in the previous iteration
    let currentMovieCount = 0; 
    const button = await page.$('[data-testid="accept-button"]')
    await button.evaluate(b => b.click());
    while (loadMoreExists) {
        let loadMoreButton = await page.$('.ipc-see-more__button'); // Select the button correctly
        
        // Extract movies from the current page
        
        // Check if the "Load More" button exists
        previousMovieCount = currentMovieCount;
        if (loadMoreButton) {
            
            await page.waitForSelector('.ipc-see-more__button', { timeout: 5000 });
            await page.evaluate(button => button.scrollIntoView(), loadMoreButton);
            
            
            await loadMoreButton.evaluate(b => b.click());
          
            // await page.locator('.ipc-btn__text').click();
            await page.waitForFunction(
                (prevCount) => {
                    const movieElements = document.querySelectorAll('.ipc-metadata-list-summary-item');
                    return movieElements.length > prevCount;
                },
                { timeout: 30000 }, // Adjust timeout as needed
                previousMovieCount // Pass the previous movie count for comparison
            );

            // Update current movie count
            currentMovieCount = await page.evaluate(() =>
                document.querySelectorAll('.ipc-metadata-list-summary-item').length
            );
            console.log(`Movies loaded so far: ${currentMovieCount}`);
            console.log(typeof(currentMovieCount));
            
            if (currentMovieCount> 1500){
                console.log('above 200');
                
                loadMoreExists=false
            }
            // Wait for the next batch to load
        } else {
            console.log("No more movies to load.");
            loadMoreExists = false; // Exit the loop if the "Load More" button doesn't exist
        }
        
    }
    await extractMovies();
    console.log("i am out of the loop");

    await browser.close();
    return movies[0];
}

// Function to scrape movies for all years and save to JSON files
async function scrapeAllYears(startYear, endYear) {
    for (let year = startYear; year >= endYear; year--) {
        console.log(`Scraping year: ${year}`);
        const movies = await scrapeMoviesForYear(year);

        // Save to a JSON file
        fs.writeFileSync(`action_movies_${year}.json`, JSON.stringify(movies, null, 2));
        console.log(`Saved data for ${year}. Total movies: ${movies.length}`);
    }
}

// Main Execution
scrapeAllYears(2024, 2000)
    .then(() => console.log("All years scraped successfully!"))
    .catch(err => console.error("Error scraping years:", err));