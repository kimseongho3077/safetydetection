import React from 'react';
import { useNavigate } from 'react-router-dom';
import footerLogo from '../assets/footer_logo.png'; // Ensure this path is correct
import '../styles/Footer.css';

const Footer: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer className="footer">
      <img 
        src={footerLogo} 
        alt="Footer Logo" 
        className="footer-logo" 
        onClick={() => navigate('/')} // Navigate to the main page on click
      />
      <p className="footer-text">℺ All rights reversed.</p> {/* Copyleft Symbol */}
      <p className="footer-text">Contact:  | @gmail.com</p>
    </footer>
  );
};

export default Footer;
