import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/index.css';

// API 기본 URL을 환경 변수에서 가져옴
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://20.39.188.27:8090';

axios.defaults.withCredentials = true;  // 전역 설정 추가
axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';

const Login = () => {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();


  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/csrf_token/`, { withCredentials: true });
        console.log('응답 헤더:', response.headers);
        console.log('응답 데이터:', response.data); // 응답 데이터 로그 확인
        setCsrfToken(response.data.csrfToken);
      } catch (error) {
        console.error('CSRF 토큰을 가져오는 중 오류 발생:', error);
      }
    };
    fetchCsrfToken();
  }, []);
  
  useEffect(() => {
    console.log(csrfToken, '!!!!!!!!!!'); // 상태가 업데이트될 때마다 출력
  }, [csrfToken]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(''); // 에러 메시지 초기화

    try {
      console.log(csrfToken," : csrfToken!")
      const response = await axios.post(`${API_BASE_URL}/api/login/`, {
        id,
        password
      }, {
        withCredentials: true,
        headers: {
          'X-CSRFToken': csrfToken || ''
        }
      });
      console.log('로그인 성공:', response.data);
      window.location.href = '/';
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        // 서버에서 반환하는 에러 메시지를 표시
        setError('The ID or password does not match.');
        //setError('아이디 또는 비밀번호가 일치하지 않습니다.');
      } else {
        setError('An error occurred while logging in. Please try again.');
        //setError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
      console.error('로그인 중 오류 발생:', error);
    }
  };

  return (
    <div className="container">
      <div className="register-box">
        <h1 className="title">Login</h1>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="label">ID:</label>
            <input 
              type="text" 
              value={id} 
              onChange={(e) => setId(e.target.value)} 
              className="input"
            />
          </div>
          <div className="input-group">
            <label className="label">Password:</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="input"
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="action-text">Login</button>
        </form>
        <button className="login-text" onClick={() => navigate('/register')}>Create Account</button>
      </div>
    </div>
  );
};

export default Login;