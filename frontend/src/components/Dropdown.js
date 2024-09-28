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

    navigate('/login');
  };

  useEffect(() => {
    if (!token) {
        navigate('/login'); 
    } else {
        // TODO: Find betteer solution besides copy and paste.
        const decodedToken = jwtDecode(token);
        const userIdFromToken = decodedToken.userId;
        setUserId(userIdFromToken);
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
      <li onClick={handleLogout}>
        Logout
      </li>
    </ul>
  </div>
);
};

export default Dropdown;