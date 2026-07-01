import { createContext, useContext, useState, useEffect } from 'react'
import { fetchWeather } from '../lib/weather.js'

const WeatherCtx = createContext([])

export function WeatherProvider({ children }) {
  const [forecast, setForecast] = useState([])

  useEffect(() => {
    fetchWeather().then(setForecast)
    const id = setInterval(() => fetchWeather().then(setForecast), 30 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  return <WeatherCtx.Provider value={forecast}>{children}</WeatherCtx.Provider>
}

export function useWeather() { return useContext(WeatherCtx) }
