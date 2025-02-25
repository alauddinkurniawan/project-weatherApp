import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
const API_URL = "https://api.openweathermap.org/data/2.5/weather";

interface WeatherData {
  name: string;
  sys: { country: string };
  main: { temp: number };
  weather: { description: string }[];
}

interface RecentCityWeather {
  city: string;
  temp: number;
  description: string;
}

interface CachedWeatherData extends WeatherData {
  timestamp: number;
}

const MAX_RECENT_SEARCHES = 5; // Maximum number of recent searches to show

const DEFAULT_CITIES = ["Jakarta", "Tokyo", "Seoul", "Paris", "New York"];

// Add a type for weather conditions
type WeatherCondition =
  | "clear"
  | "clouds"
  | "rain"
  | "snow"
  | "thunderstorm"
  | "mist"
  | "default";

const CACHE_DURATION = 1000 * 60 * 10; // 10 minutes in milliseconds

export default function WeatherApp() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [city, setCity] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    // Initialize from localStorage if available, otherwise use default cities
    const saved = localStorage.getItem("recentSearches");
    return saved ? JSON.parse(saved) : DEFAULT_CITIES;
  });
  const [recentWeatherData, setRecentWeatherData] = useState<
    Record<string, RecentCityWeather>
  >(() => {
    // Initialize from localStorage if available
    const saved = localStorage.getItem("recentWeatherData");
    return saved ? JSON.parse(saved) : {};
  });

  // Save recent searches to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(
      "recentWeatherData",
      JSON.stringify(recentWeatherData)
    );
  }, [recentWeatherData]);

  const fetchWeather = useCallback(async (searchCity: string) => {
    if (!searchCity.trim()) {
      setError("Please enter a city name");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check cache first
      const cachedData = localStorage.getItem(
        `weather_${searchCity.toLowerCase()}`
      );
      if (cachedData) {
        const parsed: CachedWeatherData = JSON.parse(cachedData);
        const now = Date.now();

        // If cache is still valid
        if (now - parsed.timestamp < CACHE_DURATION) {
          setWeather(parsed);
          setRecentWeatherData((prev) => ({
            ...prev,
            [searchCity.toLowerCase()]: {
              city: searchCity,
              temp: parsed.main.temp,
              description: parsed.weather[0].description,
            },
          }));
          addToRecentSearches(searchCity);
          setLoading(false);
          return;
        }
      }

      // If no cache or cache expired, fetch from API
      const response = await axios.get<WeatherData>(API_URL, {
        params: {
          q: searchCity,
          appid: API_KEY,
          units: "metric",
        },
      });

      const weatherWithTimestamp: CachedWeatherData = {
        ...response.data,
        timestamp: Date.now(),
      };

      // Save to cache
      localStorage.setItem(
        `weather_${searchCity.toLowerCase()}`,
        JSON.stringify(weatherWithTimestamp)
      );

      setWeather(response.data);
      setRecentWeatherData((prev) => ({
        ...prev,
        [searchCity.toLowerCase()]: {
          city: searchCity,
          temp: response.data.main.temp,
          description: response.data.weather[0].description,
        },
      }));
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
  }, []);


  useEffect(() => {
    const saved = localStorage.getItem("recentSearches");
    if (!saved) {
      // Only fetch default cities if there's no saved data
      DEFAULT_CITIES.forEach((city) => {
        fetchWeather(city);
      });
    }
  }, [fetchWeather]);

  const addToRecentSearches = (searchCity: string) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter(
        (item) => item.toLowerCase() !== searchCity.toLowerCase()
      );
      return [searchCity, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    });
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


  // just in case i decide to use this again
  // const handleDeleteSearch = (
  //   searchCityToDelete: string,
  //   e: React.MouseEvent
  // ) => {
  //   e.stopPropagation(); // Prevent triggering the search click
  //   setRecentSearches((prev) =>
  //     prev.filter(
  //       (city) => city.toLowerCase() !== searchCityToDelete.toLowerCase()
  //     )
  //   );
  // };

  

  const capitalizeWords = (str: string) => {
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Add function to determine weather condition
  const getWeatherCondition = (
    weatherDescription: string
  ): WeatherCondition => {
    const desc = weatherDescription.toLowerCase();
    if (desc.includes("clear")) return "clear";
    if (desc.includes("cloud")) return "clouds";
    if (desc.includes("rain")) return "rain";
    if (desc.includes("snow")) return "snow";
    if (desc.includes("thunder")) return "thunderstorm";
    if (desc.includes("mist") || desc.includes("fog")) return "mist";
    return "default";
  };

  // Get current weather condition
  const currentWeatherCondition = weather
    ? getWeatherCondition(weather.weather[0].description)
    : "default";

  // Add useEffect to update root class when weather changes
  useEffect(() => {
    const root = document.documentElement; // This gets the :root element
    if (weather) {
      // Remove any existing weather classes
      root.classList.remove(
        "weather-clear",
        "weather-clouds",
        "weather-rain",
        "weather-snow",
        "weather-thunderstorm",
        "weather-mist",
        "weather-default"
      );
      // Add new weather class
      root.classList.add(`weather-${currentWeatherCondition}`);
    } else {
      // Set to default if no weather
      root.classList.remove(
        "weather-clear",
        "weather-clouds",
        "weather-rain",
        "weather-snow",
        "weather-thunderstorm",
        "weather-mist"
      );
      root.classList.add("weather-default");
    }
  }, [weather, currentWeatherCondition]);

  const cleanupCache = () => {
    const now = Date.now();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("weather_")) {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed: CachedWeatherData = JSON.parse(data);
          if (now - parsed.timestamp > CACHE_DURATION) {
            localStorage.removeItem(key);
          }
        }
      }
    }
  };

  useEffect(() => {
    cleanupCache();
    const interval = setInterval(cleanupCache, CACHE_DURATION);
    return () => clearInterval(interval);
  }, []);

  const animationKey = Date.now();

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

      {/* Add animation-wrapper class */}
      <div
        className="weather-info animation-wrapper"
        key={animationKey}
        style={{ minHeight: "150px" }}
      >
        {!loading && !error && weather && (
          <>
            <h2>
              {weather.name}, {weather.sys.country}
            </h2>
            <p className="weather-description">
              {capitalizeWords(weather.weather[0].description)}
            </p>
            <p className="weather-temp">{weather.main.temp}°C</p>
          </>
        )}
        {error && (
          <p className="error-message" key={error}>
            {error}
          </p>
        )}
      </div>

      <div className="recent-searches">
        <div className="recent-searches-list">
          {recentSearches
            .filter(
              (searchCity) =>
                !weather ||
                searchCity.toLowerCase() !== weather.name.toLowerCase()
            )
            .map((searchCity, index) => {
              const weatherData = recentWeatherData[searchCity.toLowerCase()];
              return (
                <button
                  key={index}
                  onClick={() => handleRecentSearchClick(searchCity)}
                  className="recent-search-item"
                >
                  <div className="recent-weather-info">
                    {capitalizeWords(searchCity)}
                  </div>
                  {weatherData && (
                    <>
                      <div className="recent-weather-description">
                        {capitalizeWords(weatherData.description)}
                      </div>
                      <div className="recent-weather-temp">
                        {weatherData.temp}°C
                      </div>
                    </>
                  )}
                  {/* <button
                    className="delete-search"
                    onClick={(e) => handleDeleteSearch(searchCity, e)}
                    title="Remove from recent searches"
                  >
                    ×
                  </button> */}
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
