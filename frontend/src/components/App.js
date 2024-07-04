import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Login from './Logins/Login';
import Register from './Logins/Register';
import Landing from './Logins/Landing';
import Homepage from './Users/Homepage';
import Anime from './Anime/Anime';
import AnimeInfo from './Anime/AnimeInfo';
import Social from './Users/Social';
import Following from './Users/Following';
import Followers from './Users/Followers';
import Profile from './Users/Profile';
import Settings from './Users/Settings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/homepage" element={<Homepage />} />
        <Route path="/anime" element={<Anime />} />
        <Route path="/animeinfo/:animeID" element={<AnimeInfo />} />
        <Route path="/social" element={<Social />} />
        <Route path="/following/:userId" element={<Following />} />
        <Route path="/followers/:userId" element={<Followers />} />
        <Route path="/profile/:userId" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

