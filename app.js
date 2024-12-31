document.addEventListener('DOMContentLoaded', () => {
    const apiKey = '6b2bd5b2c5c57d89f4031eb85d84607f'; // Your API key
    const locationInput = document.getElementById('locationInput');
    const searchBtn = document.getElementById('searchBtn');
    const saveFavoriteBtn = document.getElementById('saveFavoriteBtn');
    const temperatureEl = document.getElementById('temperature');
    const conditionsEl = document.getElementById('conditions');
    const humidityEl = document.getElementById('humidity');
    const visibilityEl = document.getElementById('visibility');
    const uvIndexEl = document.getElementById('uvIndex');
    const windSpeedEl = document.getElementById('windSpeed');
    const pressureEl = document.getElementById('pressure');
    const sunriseEl = document.getElementById('sunrise');
    const sunsetEl = document.getElementById('sunset');
    const forecastContainer = document.getElementById('forecast-container');
    const weatherIconEl = document.getElementById('weatherIcon');
    const dateEl = document.getElementById('date');
    const errorMessageEl = document.getElementById('error-message');
    const historyList = document.getElementById('history-list');
    const favoritesList = document.getElementById('favorites-list');
    const alertContainer = document.getElementById('alert-container');
    const body = document.body;
    const unitInputs = document.querySelectorAll('input[name="unit"]'); // Unit radio buttons

    let searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];
    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    let currentUnit = 'imperial'; // Default unit

    // Update unit based on selection
    unitInputs.forEach(input => {
        input.addEventListener('change', (event) => {
            currentUnit = event.target.value;
            if (locationInput.value) {
                fetchWeatherData(locationInput.value);
            }
        });
    });

    // Search button event
    searchBtn.addEventListener('click', () => {
        const location = locationInput.value.trim();
        if (location) {
            fetchWeatherData(location);
            addToSearchHistory(location);
        }
    });

    // Save as favorite button event
    saveFavoriteBtn.addEventListener('click', () => {
        const location = locationInput.value.trim();
        if (location) {
            addToFavorites(location);
        }
    });

    // Automatically detect user's location on load
    function getLocationWeather() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude } = position.coords;
                fetchWeatherByCoords(latitude, longitude);
            }, () => {
                showError('Geolocation permission denied. Please search manually.');
            });
        } else {
            showError('Geolocation is not supported by this browser.');
        }
    }

    // Fetch weather data based on coordinates
    async function fetchWeatherByCoords(lat, lon) {
        showLoading();
        try {
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${currentUnit}`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.cod === "404") {
                showError("Location not found. Please try again.");
                return;
            }
            updateUI(data);
            fetchUVIndex(lat, lon);
            fetchForecast(lat, lon);
        } catch (error) {
            showError("Error fetching weather data.");
        } finally {
            hideLoading();
        }
    }

    // Fetch weather data based on location name
    async function fetchWeatherData(location) {
        showLoading(); // Show loading indicator
        try {
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=${currentUnit}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.cod === "404") {
                showError("Location not found. Please try again.");
                return;
            }

            updateUI(data);
            fetchUVIndex(data.coord.lat, data.coord.lon);
            fetchForecast(data.coord.lat, data.coord.lon);
        } catch (error) {
            console.error('Error fetching weather data:', error);
            showError("An error occurred. Please try again later.");
        } finally {
            hideLoading(); // Hide loading indicator
        }
    }

    // Add location to search history
    function addToSearchHistory(location) {
        if (!searchHistory.includes(location)) {
            searchHistory.push(location);
            localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
            updateHistoryList();
        }
    }

    // Add location to favorites
    function addToFavorites(location) {
        if (!favorites.includes(location)) {
            favorites.push(location);
            localStorage.setItem('favorites', JSON.stringify(favorites));
            updateFavoritesList();
        }
    }

    // Update search history list
    function updateHistoryList() {
        historyList.innerHTML = '';
        searchHistory.forEach(location => {
            const li = document.createElement('li');
            li.textContent = location;
            li.addEventListener('click', () => fetchWeatherData(location));
            historyList.appendChild(li);
        });
    }

    // Update favorites list
    function updateFavoritesList() {
        favoritesList.innerHTML = '';
        favorites.forEach(location => {
            const li = document.createElement('li');
            li.textContent = location;
            li.addEventListener('click', () => fetchWeatherData(location));
            favoritesList.appendChild(li);
        });
    }

    // Update UI with weather data
    function updateUI(data) {
        errorMessageEl.style.display = 'none';
        temperatureEl.textContent = `${Math.round(data.main.temp)}°${currentUnit === 'imperial' ? 'F' : 'C'}`;
        conditionsEl.textContent = data.weather[0].description;
        humidityEl.textContent = `${data.main.humidity}%`;
        visibilityEl.textContent = `${(data.visibility / 1000).toFixed(2)} ${currentUnit === 'imperial' ? 'miles' : 'km'}`;
        windSpeedEl.textContent = `${data.wind.speed} ${currentUnit === 'imperial' ? 'mph' : 'km/h'}`;
        pressureEl.textContent = `${data.main.pressure} hPa`;
        sunriseEl.textContent = new Date(data.sys.sunrise * 1000).toLocaleTimeString();
        sunsetEl.textContent = new Date(data.sys.sunset * 1000).toLocaleTimeString();

        const iconCode = data.weather[0].icon;
        weatherIconEl.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
        weatherIconEl.style.display = 'block';

        const currentDate = new Date();
        dateEl.textContent = `Last updated: ${currentDate.toLocaleDateString()} ${currentDate.toLocaleTimeString()}`;

        // Update background based on the weather condition
        updateBackground(data.weather[0].main);
    }

    // Fetch UV index
    async function fetchUVIndex(lat, lon) {
        try {
            const uvUrl = `https://api.openweathermap.org/data/2.5/uvi?lat=${lat}&lon=${lon}&appid=${apiKey}`;
            const response = await fetch(uvUrl);
            const uvData = await response.json();
            uvIndexEl.textContent = `${uvData.value} (UV Index)`;
        } catch (error) {
            console.error('Error fetching UV Index:', error);
        }
    }

    // Fetch weather forecast
    async function fetchForecast(lat, lon) {
        try {
            const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${currentUnit}`;
            const response = await fetch(forecastUrl);
            const forecastData = await response.json();
            displayForecast(forecastData);
        } catch (error) {
            console.error('Error fetching forecast:', error);
        }
    }

    // Display forecast data
    function displayForecast(data) {
        forecastContainer.innerHTML = ''; // Clear previous forecast
        const days = {}; // Group forecast by day

        data.list.forEach(item => {
            const date = new Date(item.dt * 1000).toLocaleDateString();
            if (!days[date]) {
                days[date] = [];
            }
            days[date].push(item);
        });

        for (const date in days) {
            const dayData = days[date][0]; // Take the first entry for the day
            const forecastItem = document.createElement('div');
            forecastItem.className = 'forecast-item';
            forecastItem.innerHTML = `
                <h4>${date}</h4>
                <img src="https://openweathermap.org/img/wn/${dayData.weather[0].icon}@2x.png" alt="Weather Icon">
                <p>Max: ${Math.round(dayData.main.temp_max)}° / Min: ${Math.round(dayData.main.temp_min)}°</p>
                <p>Humidity: ${dayData.main.humidity}%</p>
                <p>Wind Speed: ${dayData.wind.speed} ${currentUnit === 'imperial' ? 'mph' : 'km/h'}</p>
                <p>Chance of Rain: ${Math.round(dayData.pop * 100)}%</p>
                <p>${dayData.weather[0].description}</p>
            `;
            forecastContainer.appendChild(forecastItem);
        }
    }

    // Show error message
    function showError(message) {
        errorMessageEl.textContent = message;
        errorMessageEl.style.display = 'block';
    }

    // Show loading indicator
    function showLoading() {
        document.getElementById('loading').style.display = 'block';
    }

    // Hide loading indicator
    function hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    // Update background based on weather condition
    function updateBackground(weatherCondition) {
        const condition = weatherCondition.toLowerCase();
        const backgrounds = {
            clear: 'https://www.ksnt.com/wp-content/uploads/sites/86/2016/03/sunshine_36366417_ver1.0-8.jpg?w=2560&h=1440&crop=1',
            clouds: 'https://images.pexels.com/photos/158163/clouds-cloudporn-weather-lookup-158163.jpeg?cs=srgb&dl=clouds-cloudy-gloomy-158163.jpg&fm=jpg',
            rain: 'https://wallpaperaccess.com/full/164284.jpg',
            snow: 'https://getwallpapers.com/wallpaper/full/b/1/9/1173068-cold-weather-wallpaper-1920x1080-large-resolution.jpg',
            thunderstorm: 'https://tse2.mm.bing.net/th?id=OIP.OhE0JNdeDe5EGxN3GZjv6wHaE7&pid=Api&P=0&h=180',
            mist: 'https://wallpaperaccess.com/full/464455.jpg',
            fog: 'https://wallpaperaccess.com/full/464455.jpg',
            default: 'https://wallpapercave.com/wp/4YUhHd3.jpg'
        };

        body.style.backgroundImage = `url(${backgrounds[condition] || backgrounds['default']})`;
        body.style.backgroundSize = 'cover';
        body.style.backgroundPosition = 'center';
        body.style.backgroundRepeat = 'no-repeat';
        body.style.backgroundAttachment = 'fixed';
    }

    // Load search history and favorites on page load
    updateHistoryList();
    updateFavoritesList();
    getLocationWeather(); // Fetch weather on page load based on geolocation
});
