import React from 'react';
import { Routes, Route } from 'react-router-dom';

import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import WeatherTrends from './pages/WeatherTrends';
import TouristTrends from './pages/TouristTrends';

export default function App() {
  return (
     <>
      <Header /> 
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/weather-trends" element={<WeatherTrends />} />
        <Route path="/tourist-trends" element={<TouristTrends />} />
      </Routes>
      <Footer />
    </>
  );
}
