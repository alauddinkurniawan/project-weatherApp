import { useState, useEffect } from "react";
import axios from "axios";

const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
const API_URL = "https://api.openweathermap.org/data/2.5/weather";

interface WeatherData {
  name: string;
  sys: { country: string };
  main: { temp: number };
  weather: { description: string }[];
}

const MAX_RECENT_SEARCHES = 5; // Maximum number of recent searches to show

export default function WeatherApp() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [city, setCity] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    // Initialize from localStorage if available
    const saved = localStorage.getItem("recentSearches");
    return saved ? JSON.parse(saved) : [];
  });

  // Save recent searches to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("recentSearches", JSON.stringify(recentSearches));
  }, [recentSearches]);

  const addToRecentSearches = (searchCity: string) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter(
        (item) => item.toLowerCase() !== searchCity.toLowerCase()
      );
      return [searchCity, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    });
  };

  const fetchWeather = async (searchCity: string) => {
    if (!searchCity.trim()) {
      setError("Please enter a city name");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get<WeatherData>(API_URL, {
        params: {
          q: searchCity,
          appid: API_KEY,
          units: "metric",
        },
      });
      setWeather(response.data);
      addToRecentSearches(searchCity);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.status === 404
            ? "City not found"
            : "Failed to fetch weather data"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim()) {
      setError("Please enter a city name");
      setCity("");
      return;
    }
    fetchWeather(city);
  };

  const handleRecentSearchClick = (searchCity: string) => {
    setCity(searchCity);
    fetchWeather(searchCity);
  };

  const handleDeleteSearch = (
    searchCityToDelete: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation(); // Prevent triggering the search click
    setRecentSearches((prev) =>
      prev.filter(
        (city) => city.toLowerCase() !== searchCityToDelete.toLowerCase()
      )
    );
  };

  const capitalizeWords = (str: string) => {
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="weather-container">
      <form onSubmit={handleSearch}>
        <div className="search-wrapper">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Search City"
            className={`search-input ${!city.trim() && "empty-input"}`}
          />
          <img src="/Search.png" alt="search" className="search-icon" />
        </div>
      </form>

      { (
        <div className="recent-searches">
          <h3>Recent Searches</h3>
          <div className="recent-searches-list">
            {recentSearches.map((searchCity, index) => (
              <button
                key={index}
                onClick={() => handleRecentSearchClick(searchCity)}
                className="recent-search-item"
              >
                <span>{searchCity}</span>
                <button
                  className="delete-search"
                  onClick={(e) => handleDeleteSearch(searchCity, e)}
                  title="Remove from recent searches"
                >
                  ×
                </button>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="error-message" key={error}>
          {error}
        </p>
      )}
      {loading && (
        <div className="loader-container">
          <div className="loader"></div>
        </div>
      )}
      {!loading && !error && weather && (
        <div className="weather-info">
          <h2>
            {weather.name}, {weather.sys.country}
          </h2>
          <p className="weather-description">
            {capitalizeWords(weather.weather[0].description)}
          </p>
          <p className="weather-temp">{weather.main.temp}°C</p>
        </div>
      )}
    </div>
  );
}
