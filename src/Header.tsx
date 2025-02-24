import { useState, useEffect } from "react";

const Header = () => {
  const version = "1.0.0";
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    // Cleanup interval on component unmount
    return () => clearInterval(timer);
  }, []);

  return (
    <header>
      <h1>WeatherApp <span>v.{version}</span></h1>
      <div>{time.toLocaleTimeString()}</div>
    </header>
  );
};

export default Header;
