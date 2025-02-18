import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LoggedInHeader from './LoggedInHeader';
import LoggedOutHeader from './LoggedOutHeader';

// API 기본 URL을 환경 변수에서 가져옴
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://20.39.188.27:8090';

axios.defaults.withCredentials = true;  // 전역 설정 추가
axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';

const Header = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // 로그인 상태 확인
    const checkLoginStatus = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/check_login/`);
        setIsLoggedIn(response.data.is_logged_in);
      } catch (error) {
        console.error('로그인 상태 확인 중 오류 발생:', error);
      }
    };

    checkLoginStatus();
  }, []);

  return isLoggedIn ? <LoggedInHeader setIsLoggedIn={setIsLoggedIn} /> : <LoggedOutHeader />;
};

export default Header;