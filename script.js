// TMDB API Configuration
const API_KEY = 'c4396ae9a1f6304f7c161bffa5284f17';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE_URL = 'https://image.tmdb.org/t/p';

// API Endpoints
const ENDPOINTS = {
    trending: `${BASE_URL}/trending/movie/day?api_key=${API_KEY}`,
    popular: `${BASE_URL}/movie/popular?api_key=${API_KEY}`,
    topRated: `${BASE_URL}/movie/top_rated?api_key=${API_KEY}`,
    search: `${BASE_URL}/search/movie?api_key=${API_KEY}`,
    movieDetails: (id) => `${BASE_URL}/movie/${id}?api_key=${API_KEY}`,
    similar: (id) => `${BASE_URL}/movie/${id}/similar?api_key=${API_KEY}`,
    recommendations: (id) => `${BASE_URL}/movie/${id}/recommendations?api_key=${API_KEY}`,
    genres: `${BASE_URL}/genre/movie/list?api_key=${API_KEY}`,
    discoverByGenre: (genreId) => `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genreId}&sort_by=popularity.desc`
};

// Genre mapping for quick reference
const GENRE_MAP = {
    'action': 28,
    'adventure': 12,
    'animation': 16,
    'comedy': 35,
    'crime': 80,
    'documentary': 99,
    'drama': 18,
    'family': 10751,
    'fantasy': 14,
    'history': 36,
    'horror': 27,
    'music': 10402,
    'mystery': 9648,
    'romance': 10749,
    'science fiction': 878,
    'sci-fi': 878,
    'thriller': 53,
    'war': 10752,
    'western': 37
};

// Store all genres from API
let allGenres = [];

// Local Storage for user ratings
const STORAGE_KEY = 'cineRateUserRatings';

// Get user ratings from localStorage
function getUserRatings() {
    const ratings = localStorage.getItem(STORAGE_KEY);
    return ratings ? JSON.parse(ratings) : {};
}

// Save user rating
function saveUserRating(movieId, rating) {
    const ratings = getUserRatings();
    ratings[movieId] = rating;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ratings));
}

// Get user rating for a specific movie
function getUserRating(movieId) {
    const ratings = getUserRatings();
    return ratings[movieId] || null;
}

// Fetch data from TMDB API
async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        return null;
    }
}

// Fetch and store all genres
async function fetchGenres() {
    const data = await fetchData(ENDPOINTS.genres);
    if (data && data.genres) {
        allGenres = data.genres;
    }
}

// Initialize the hero section with trending movie
async function initHero() {
    const data = await fetchData(ENDPOINTS.trending);
    if (data && data.results && data.results.length > 0) {
        const movie = data.results[0];
        updateHeroSection(movie);
    }
}

// Update hero section with movie data
function updateHeroSection(movie) {
    const hero = document.querySelector('.hero');
    const heroContent = document.querySelector('.hero-content');
    
    // Update background image
    if (movie.backdrop_path) {
        hero.style.backgroundImage = `url('${IMG_BASE_URL}/original${movie.backdrop_path}')`;
    }
    
    // Update content
    const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
    const userRating = getUserRating(movie.id);
    const cineRating = userRating ? userRating.toFixed(1) : 'N/A';
    const inWishlist = isInWishlist(movie.id);
    
    heroContent.innerHTML = `
        <span class="trending-tag">#1 Trending Today</span>
        <h1>${movie.title}</h1>
        <p class="meta">${year} • ${movie.vote_average ? '★ ' + movie.vote_average.toFixed(1) : ''}</p>
        <div class="ratings-row">
            <div class="rating-badge">TMDB: ${movie.vote_average.toFixed(1)}</div>
            <div class="rating-badge cine-gold">Cine-Rate: ${cineRating}</div>
        </div>
        <p class="description">
            ${movie.overview || 'No description available.'}
        </p>
        <div class="cta-buttons">
            <button class="btn-primary" onclick="viewMovieDetails(${movie.id})">View Details</button>
            <button class="btn-secondary ${inWishlist ? 'in-wishlist' : ''}" onclick="toggleWishlist(${movie.id}); updateHeroSection(${JSON.stringify(movie).replace(/"/g, '&quot;')})">
                ${inWishlist ? '❤️ In Wishlist' : '+ Wishlist'}
            </button>
        </div>
    `;
}

// Create movie card HTML
function createMovieCard(movie) {
    const posterPath = movie.poster_path 
        ? `${IMG_BASE_URL}/w500${movie.poster_path}` 
        : 'https://via.placeholder.com/300x450?text=No+Poster';
    
    const userRating = getUserRating(movie.id);
    const displayRating = userRating 
        ? `<span class="user-rating">Your rating: ${userRating}/10</span>`
        : '';
    
    return `
        <div class="movie-card" onclick="viewMovieDetails(${movie.id})">
            <div class="poster-wrapper">
                <img src="${posterPath}" alt="${movie.title}" loading="lazy">
                <div class="card-overlay">
                    <span class="card-rating">★ ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</span>
                </div>
            </div>
            <h3>${movie.title}</h3>
            <p>${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}</p>
            ${displayRating}
        </div>
    `;
}

// Load popular movies into grid
async function loadMovies(endpoint = ENDPOINTS.popular) {
    const movieGrid = document.getElementById('movie-grid');
    movieGrid.innerHTML = '<p>Loading movies...</p>';
    
    const data = await fetchData(endpoint);
    if (data && data.results) {
        movieGrid.innerHTML = data.results.map(movie => createMovieCard(movie)).join('');
    } else {
        movieGrid.innerHTML = '<p>Failed to load movies. Please try again later.</p>';
    }
}

// Search functionality
function setupSearch() {
    const searchInput = document.querySelector('.search-bar input');
    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length > 2) {
            searchTimeout = setTimeout(() => {
                searchMoviesOrGenres(query);
            }, 500);
        } else if (query.length === 0) {
            loadMovies();
        }
    });
    
    // Add enter key support
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = e.target.value.trim();
            if (query.length > 0) {
                searchMoviesOrGenres(query);
            }
        }
    });
}

// Enhanced search - handles both movies and genres
async function searchMoviesOrGenres(query) {
    const lowerQuery = query.toLowerCase();
    
    // Check if query matches a genre
    const genreId = GENRE_MAP[lowerQuery];
    
    if (genreId) {
        // Search by genre
        await searchByGenre(genreId, query);
    } else {
        // Check if query contains genre keywords
        const matchedGenre = Object.keys(GENRE_MAP).find(genre => 
            lowerQuery.includes(genre) || genre.includes(lowerQuery)
        );
        
        if (matchedGenre) {
            await searchByGenre(GENRE_MAP[matchedGenre], matchedGenre);
        } else {
            // Regular movie search
            await searchMovies(query);
        }
    }
}

// Search by genre
async function searchByGenre(genreId, genreName) {
    const movieGrid = document.getElementById('movie-grid');
    movieGrid.innerHTML = '<p>Loading movies...</p>';
    
    const data = await fetchData(ENDPOINTS.discoverByGenre(genreId));
    
    const sectionTitle = document.querySelector('.section-title');
    sectionTitle.textContent = `${genreName.charAt(0).toUpperCase() + genreName.slice(1)} Movies`;
    
    if (data && data.results && data.results.length > 0) {
        movieGrid.innerHTML = data.results.map(movie => createMovieCard(movie)).join('');
        showNotification(`Found ${data.results.length} ${genreName} movies!`);
    } else {
        movieGrid.innerHTML = `<p>No ${genreName} movies found.</p>`;
    }
}

// Search movies
async function searchMovies(query) {
    const searchUrl = `${ENDPOINTS.search}&query=${encodeURIComponent(query)}`;
    const data = await fetchData(searchUrl);
    
    const movieGrid = document.getElementById('movie-grid');
    if (data && data.results && data.results.length > 0) {
        movieGrid.innerHTML = data.results.map(movie => createMovieCard(movie)).join('');
    } else {
        movieGrid.innerHTML = '<p>No movies found. Try a different search term.</p>';
    }
}

// View movie details (creates a modal)
async function viewMovieDetails(movieId) {
    const data = await fetchData(ENDPOINTS.movieDetails(movieId));
    if (!data) return;
    
    const posterPath = data.poster_path 
        ? `${IMG_BASE_URL}/w500${data.poster_path}` 
        : 'https://via.placeholder.com/300x450?text=No+Poster';
    
    const backdropPath = data.backdrop_path 
        ? `${IMG_BASE_URL}/original${data.backdrop_path}` 
        : '';
    
    const userRating = getUserRating(movieId);
    const genres = data.genres ? data.genres.map(g => g.name).join(', ') : 'N/A';
    const runtime = data.runtime ? `${Math.floor(data.runtime / 60)}h ${data.runtime % 60}m` : 'N/A';
    const inWishlist = isInWishlist(movieId);
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'movie-modal';
    modal.innerHTML = `
        <div class="modal-content" style="background-image: linear-gradient(rgba(0,0,0,0.9), rgba(0,0,0,0.9)), url('${backdropPath}')">
            <span class="close-modal" onclick="closeModal()">&times;</span>
            <div class="modal-body">
                <div class="modal-poster">
                    <img src="${posterPath}" alt="${data.title}">
                </div>
                <div class="modal-info">
                    <h2>${data.title}</h2>
                    <p class="modal-meta">${data.release_date ? data.release_date.split('-')[0] : 'N/A'} • ${genres} • ${runtime}</p>
                    <div class="ratings-row">
                        <div class="rating-badge">TMDB: ${data.vote_average ? data.vote_average.toFixed(1) : 'N/A'}</div>
                        <div class="rating-badge cine-gold">Your Rating: ${userRating || 'Not rated'}</div>
                    </div>
                    <p class="modal-description">${data.overview || 'No description available.'}</p>
                    
                    <div class="rating-section">
                        <h3>Rate this movie:</h3>
                        <div class="star-rating">
                            ${[1,2,3,4,5,6,7,8,9,10].map(star => 
                                `<span class="star ${userRating >= star ? 'filled' : ''}" data-rating="${star}" onclick="rateMovie(${movieId}, ${star})">★</span>`
                            ).join('')}
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        <button class="btn-wishlist ${inWishlist ? 'in-wishlist' : ''}" onclick="toggleWishlistFromModal(${movieId})">
                            ${inWishlist ? '❤️ In Wishlist' : '🤍 Add to Wishlist'}
                        </button>
                        <button class="btn-primary" onclick="getSimilarMovies(${movieId})">Get Similar Movies</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

// Toggle wishlist from modal
function toggleWishlistFromModal(movieId) {
    const inWishlist = toggleWishlist(movieId);
    const btn = document.querySelector('.btn-wishlist');
    if (btn) {
        if (inWishlist) {
            btn.classList.add('in-wishlist');
            btn.innerHTML = '❤️ In Wishlist';
        } else {
            btn.classList.remove('in-wishlist');
            btn.innerHTML = '🤍 Add to Wishlist';
        }
    }
}

// Close modal
function closeModal() {
    const modal = document.querySelector('.movie-modal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
    }
}

// Rate a movie
function rateMovie(movieId, rating) {
    saveUserRating(movieId, rating);
    
    // Update stars in modal
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        const starRating = parseInt(star.getAttribute('data-rating'));
        if (starRating <= rating) {
            star.classList.add('filled');
        } else {
            star.classList.remove('filled');
        }
    });
    
    // Update rating display
    const ratingBadge = document.querySelector('.modal-info .cine-gold');
    if (ratingBadge) {
        ratingBadge.textContent = `Your Rating: ${rating}/10`;
    }
    
    // Show confirmation
    showNotification(`You rated this movie ${rating}/10!`);
}

// Get similar movies and show suggestions
async function getSimilarMovies(movieId) {
    const data = await fetchData(ENDPOINTS.similar(movieId));
    
    if (data && data.results && data.results.length > 0) {
        closeModal();
        
        // Update section title
        const sectionTitle = document.querySelector('.section-title');
        sectionTitle.textContent = 'Movies Similar to Your Selection';
        
        // Update grid
        const movieGrid = document.getElementById('movie-grid');
        movieGrid.innerHTML = data.results.slice(0, 12).map(movie => createMovieCard(movie)).join('');
        
        // Scroll to results
        movieGrid.scrollIntoView({ behavior: 'smooth' });
        
        showNotification('Here are some similar movies you might enjoy!');
    } else {
        showNotification('No similar movies found.');
    }
}

// Get wishlist from localStorage
function getWishlist() {
    const wishlist = localStorage.getItem('cineRateWishlist');
    return wishlist ? JSON.parse(wishlist) : [];
}

// Check if movie is in wishlist
function isInWishlist(movieId) {
    const wishlist = getWishlist();
    return wishlist.includes(movieId);
}

// Add to wishlist
function addToWishlist(movieId) {
    const wishlist = getWishlist();
    
    if (!wishlist.includes(movieId)) {
        wishlist.push(movieId);
        localStorage.setItem('cineRateWishlist', JSON.stringify(wishlist));
        updateWishlistCount();
        showNotification('Added to wishlist! ❤️');
        return true;
    } else {
        showNotification('Already in your wishlist!');
        return false;
    }
}

// Remove from wishlist
function removeFromWishlist(movieId) {
    let wishlist = getWishlist();
    wishlist = wishlist.filter(id => id !== movieId);
    localStorage.setItem('cineRateWishlist', JSON.stringify(wishlist));
    updateWishlistCount();
    showNotification('Removed from wishlist');
}

// Toggle wishlist
function toggleWishlist(movieId) {
    if (isInWishlist(movieId)) {
        removeFromWishlist(movieId);
        return false;
    } else {
        addToWishlist(movieId);
        return true;
    }
}

// Update wishlist count in navbar
function updateWishlistCount() {
    const wishlist = getWishlist();
    const countElement = document.querySelector('.wishlist-count');
    if (countElement) {
        countElement.textContent = wishlist.length;
        if (wishlist.length > 0) {
            countElement.style.display = 'inline';
        } else {
            countElement.style.display = 'none';
        }
    }
}

// Show wishlist page
async function showWishlist() {
    const wishlist = getWishlist();
    const movieGrid = document.getElementById('movie-grid');
    const sectionTitle = document.querySelector('.section-title');
    
    sectionTitle.textContent = `My Wishlist (${wishlist.length})`;
    
    if (wishlist.length === 0) {
        movieGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <h3 style="font-size: 2rem; margin-bottom: 1rem;">💔 Your wishlist is empty</h3>
                <p style="color: var(--text-dim); margin-bottom: 2rem;">Start adding movies you want to watch!</p>
                <button class="btn-primary" onclick="loadMovies(); document.querySelector('.section-title').textContent = 'Popular Movies';">Browse Movies</button>
            </div>
        `;
        return;
    }
    
    movieGrid.innerHTML = '<p>Loading your wishlist...</p>';
    
    // Fetch all wishlist movies
    const moviePromises = wishlist.map(id => fetchData(ENDPOINTS.movieDetails(id)));
    const movies = await Promise.all(moviePromises);
    
    // Filter out any failed requests
    const validMovies = movies.filter(movie => movie !== null);
    
    if (validMovies.length > 0) {
        movieGrid.innerHTML = validMovies.map(movie => createWishlistCard(movie)).join('');
    } else {
        movieGrid.innerHTML = '<p>Failed to load wishlist movies.</p>';
    }
}

// Create wishlist card (with remove button)
function createWishlistCard(movie) {
    const posterPath = movie.poster_path 
        ? `${IMG_BASE_URL}/w500${movie.poster_path}` 
        : 'https://via.placeholder.com/300x450?text=No+Poster';
    
    const userRating = getUserRating(movie.id);
    const displayRating = userRating 
        ? `<span class="user-rating">Your rating: ${userRating}/10</span>`
        : '';
    
    return `
        <div class="movie-card">
            <div class="poster-wrapper">
                <img src="${posterPath}" alt="${movie.title}" loading="lazy" onclick="viewMovieDetails(${movie.id})">
                <div class="card-overlay">
                    <span class="card-rating">★ ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</span>
                </div>
                <button class="remove-from-wishlist" onclick="removeFromWishlist(${movie.id}); showWishlist();" title="Remove from wishlist">
                    ✕
                </button>
            </div>
            <h3 onclick="viewMovieDetails(${movie.id})">${movie.title}</h3>
            <p>${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}</p>
            ${displayRating}
        </div>
    `;
}

// Show notification
function showNotification(message) {
    // Remove existing notification
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Setup navigation links
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-links a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const text = link.textContent.toLowerCase();
            
            if (text === 'movies') {
                loadMovies(ENDPOINTS.popular);
                document.querySelector('.section-title').textContent = 'Popular Movies';
            } else if (text === 'suggestions') {
                loadMovies(ENDPOINTS.topRated);
                document.querySelector('.section-title').textContent = 'Top Rated Suggestions';
            } else if (text.includes('wishlist')) {
                showWishlist();
            }
        });
    });
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    initHero();
    loadMovies();
    setupSearch();
    setupNavigation();
    fetchGenres();
    createGenreButtons();
    updateWishlistCount(); // Initialize wishlist count
    
    // Close modal when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('movie-modal')) {
            closeModal();
        }
    });
    
    // Close modal with ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
});

// Create genre filter buttons
function createGenreButtons() {
    const container = document.querySelector('.container');
    const genreBar = document.createElement('div');
    genreBar.className = 'genre-bar';
    
    const popularGenres = ['action', 'comedy', 'drama', 'horror', 'romance', 'sci-fi', 'thriller', 'animation'];
    
    genreBar.innerHTML = `
        <div class="genre-buttons">
            ${popularGenres.map(genre => 
                `<button class="genre-btn" onclick="searchByGenreName('${genre}')">${genre.charAt(0).toUpperCase() + genre.slice(1)}</button>`
            ).join('')}
            <button class="genre-btn all-genres" onclick="showAllGenres()">All Genres ▼</button>
        </div>
    `;
    
    // Insert before section title
    const sectionTitle = container.querySelector('.section-title');
    container.insertBefore(genreBar, sectionTitle);
}

// Search by genre name (helper for buttons)
function searchByGenreName(genreName) {
    const genreId = GENRE_MAP[genreName.toLowerCase()];
    if (genreId) {
        searchByGenre(genreId, genreName);
    }
}

// Show all genres in a modal
function showAllGenres() {
    const modal = document.createElement('div');
    modal.className = 'movie-modal genre-modal';
    
    const allGenreButtons = Object.keys(GENRE_MAP).sort().map(genre => 
        `<button class="genre-modal-btn" onclick="searchByGenreName('${genre}'); closeModal();">
            ${genre.charAt(0).toUpperCase() + genre.slice(1)}
        </button>`
    ).join('');
    
    modal.innerHTML = `
        <div class="modal-content genre-modal-content">
            <span class="close-modal" onclick="closeModal()">&times;</span>
            <h2 style="text-align: center; margin-bottom: 2rem;">Browse by Genre</h2>
            <div class="genre-grid">
                ${allGenreButtons}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

// Make functions globally accessible
window.viewMovieDetails = viewMovieDetails;
window.closeModal = closeModal;
window.rateMovie = rateMovie;
window.getSimilarMovies = getSimilarMovies;
window.addToWatchlist = addToWatchlist;
window.searchByGenreName = searchByGenreName;
window.showAllGenres = showAllGenres;

window.removeFromWishlist = removeFromWishlist;
window.toggleWishlist = toggleWishlist;
window.toggleWishlistFromModal = toggleWishlistFromModal;
window.showWishlist = showWishlist;