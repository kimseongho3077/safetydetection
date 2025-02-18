import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import '../styles/Header.css'; // Import your CSS file

const LoggedOutHeader = () => {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <header className="header">
      <div className="logo" onClick={handleLogoClick}>
        <img src={logo} alt="Logo" />
      </div>
      <nav className="nav">
        <button onClick={() => navigate('/login')} className="nav-item">Login</button>
        <button onClick={() => navigate('/register')} className="nav-item">Register</button>
      </nav>
    </header>
  );
};

export default LoggedOutHeader;