import { useState } from "react";
import axios from "axios";

const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
const API_URL = "https://api.openweathermap.org/data/2.5/weather";

interface WeatherData {
  name: string;
  sys: { country: string };
  main: { temp: number };
  weather: { description: string }[];
}

export default function WeatherApp() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [city, setCity] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
    fetchWeather(city);
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
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Search City"
          className="search-input"
        />
      </form>

      {error && <p className="text-red-500">{error}</p>}
      {loading && (
        <div className="loader-container">
          <div className="loader"></div>
        </div>
      )}
      {!loading && weather && (
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
