import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Cookies from 'js-cookie';
import { jwtDecode } from "jwt-decode";

function Dropdown() {
  const token = Cookies.get('token');
  const [userId, setUserId] = useState('');
  const navigate = useNavigate();

  const handleLogout = async (e) => {
    e.preventDefault();

    Cookies.remove('token');
    localStorage.removeItem('username');
    localStorage.removeItem('email');
    localStorage.removeItem('searchInput');
    localStorage.removeItem('profilePicture')

    navigate('/login');
  };

  useEffect(() => {
    const token = Cookies.get('token');
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        const userIdFromToken = decodedToken.userId;
        setUserId(userIdFromToken);
      } catch (error) {
        console.error("Error decoding token:", error);
        Cookies.remove('token'); 
      }
    }
}, [token, navigate]);


return (
  <div className="dropdown-menu">
    <ul>
      <li>
        <Link to={`/profile/${userId}`}>Profile</Link>
      </li>
      <li>
      <Link to={`/settings`}>Settings</Link>
      </li>
      <li>
      <Link to={`/blockedUsers/${userId}`}>Blocked Users</Link>
      </li>
    </ul>
  </div>
);
};

export default Dropdown;