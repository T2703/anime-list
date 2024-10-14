import React, { useEffect, useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import Cookies from 'js-cookie';
import "../styles/Navbar.css";
import Dropdown from './Dropdown';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min';

function Navbar() {
  const navigate = useNavigate();
  const [profilePicture, setProfilePicture] = useState('');
  const [isDropdownVisible, setDropdownVisible] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogout = async (e) => {
    e.preventDefault();

    Cookies.remove('token');
    localStorage.removeItem('username');
    localStorage.removeItem('email');
    localStorage.removeItem('searchInput');
    localStorage.removeItem('profilePicture')

    navigate('/login');
  };

  const handleMouseEnter = () => {
    setDropdownVisible(true);
    console.log("Hover");
  };

  const handleMouseLeave = () => {
    setDropdownVisible(false);
    console.log("unhover");
  };

  useEffect(() => {
    const token = Cookies.get('token');
    if (token) {
      setIsLoggedIn(true);  
      const storedProfilePicture = localStorage.getItem('profilePicture');
      if (storedProfilePicture) {
        setProfilePicture(storedProfilePicture);
      }
    } else {
      setIsLoggedIn(false);
    }
  }, []);


  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light">
      <div className="container-fluid">
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav">
            {isLoggedIn && (
              <li className="nav-item">
              <NavLink className="nav-link me-3" aria-current="page" to="/homepage" end>
                Homepage
              </NavLink>
            </li>
            )}
            <li className="nav-item">
              <NavLink className="nav-link me-3" aria-current="page" to="/anime" end>
                Animes
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link me-3" aria-current="page" to="/social" end>
                Social
              </NavLink>
            </li>
            {isLoggedIn && ( 
              <li className="nav-item dropdown-container" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                <img src={profilePicture} className="profile-picture" alt="Profile" />
                {isDropdownVisible && <Dropdown />}
              </li>
            )}
            <li className="nav-item">
              <button className="nav-link btn btn-link" onClick={handleLogout}>
                Sign Out
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
