import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DaumPostcode from 'react-daum-postcode';
import '../styles/Register.css';

// API 기본 URL을 환경 변수에서 가져옴
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://20.39.188.27:8090';

axios.defaults.withCredentials = true;  // 전역 설정 추가
axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';

interface FormData {
  id: string;
  password: string;
  confirmPassword: string;
  name: string;
  age: string;
  address: string;
  detailed_address: string;
  phone_num: string;
  guard_name: string;
  guard_phone_num: string;
  zonecode: string;
}

interface SubmitData extends Omit<FormData, 'confirmPassword'> {}

interface AddressData {
  address: string;
  zonecode: string;
  addressType: string;
  bname: string;
  buildingName: string;
  apartment: string;
}

const Register = () => {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    id: '',
    password: '',
    confirmPassword: '',
    name: '',
    age: '',
    address: '',
    detailed_address: '',
    phone_num: '',
    guard_name: '',
    guard_phone_num: '',
    zonecode: '',
  });
  
  // 에러 상태를 분리하여 관리
  const [idErrors, setIdErrors] = useState<string[]>([]);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);
  
  const [isIdChecked, setIsIdChecked] = useState(false);
  const [isPasswordMatched, setIsPasswordMatched] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCsrfToken = async () => {
      const response = await axios.get(`${API_BASE_URL}/api/csrf_token/`);
      const token = response.data.csrfToken;
      console.log('CSRF Token received:', token);
      setCsrfToken(response.data.csrfToken);
    };
    fetchCsrfToken();
  }, []);

  const validateId = (id: string): string[] => {
    const errors: string[] = [];
    if (!id) {
      errors.push('Please enter your ID.');
      return errors;
    }
    if (id.length < 4 || id.length > 12) {
      errors.push('ID must be between 4 and 12 characters');
    }
    if (!/\d/.test(id)) {
      errors.push('Password must contain at least one number');
    }
    if (!/^[a-zA-Z0-9]+$/.test(id)) {
      errors.push('ID must contain only letters and numbers');
    }
    if (!/[a-zA-Z]/.test(id)) {
      errors.push('The ID must contain at least one English character.');
    }
    return errors;
  };

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (!password) {
      errors.push('Please enter your password.');
      return errors;
    }
    if (password.length < 8 || password.length > 20) {
      errors.push('Password must be between 8 and 20 characters');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[a-zA-Z]/.test(password)) {
      errors.push('Password must contain at least one English character.');
    }
    if (/\s/.test(password)) {
      errors.push('Password must not contain spaces');
    }
    return errors;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 입력 필드 변경 시 해당 필드의 에러 메시지 초기화
    if (name === 'id') {
      setIdErrors([]);
      setIsIdChecked(false);
    }
    if (name === 'password' || name === 'confirmPassword') {
      setPasswordErrors([]);
      setIsPasswordMatched(false);
    }
  };

  const handleIdCheck = async () => {
    const errors = validateId(formData.id);
    setIdErrors(errors);
    if (errors.length > 0) return;

    try {
      const response = await axios.post(`${API_BASE_URL}/api/check_id/`, { id: formData.id }, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || ''
        }
      });
      if (response.data.isAvailable) {
        //alert('사용 가능한 ID입니다.');
        alert('The ID is available.');
        setIsIdChecked(true);
      } else {
        //setIdErrors(['이미 사용 중인 ID입니다.']);
        setIdErrors(['The ID is already in use.']);
        setIsIdChecked(false);
      }
    } catch (error) {
      console.error('ID 중복 검사 중 오류 발생:', error);
      //setIdErrors(['ID 중복 검사 중 오류가 발생했습니다.']);
      setIdErrors(['Error occurred during duplicate ID scan.']);
      setIsIdChecked(false);
    }
  };

  
  const handlePasswordCheck = () => {
    const errors = validatePassword(formData.password);
    if (errors.length > 0) {
      setPasswordErrors(errors);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      //setPasswordErrors(['비밀번호가 일치하지 않습니다.']);
      setPasswordErrors(['The password does not match.']);
      setIsPasswordMatched(false);
      return;
    }

    setIsPasswordMatched(true);
    setPasswordErrors([]);
    //alert('비밀번호가 확인되었습니다.');
    alert('Password confirmed.');
  };

  const handleComplete = (data: AddressData) => {
    let fullAddress = data.address;
    let extraAddress = '';

    if (data.addressType === 'R') {
      if (data.bname !== '') {
        extraAddress += data.bname;
      }
      if (data.buildingName !== '') {
        extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
      }
      fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
    }
    
    setFormData({
      ...formData,
      zonecode: data.zonecode,
      address: fullAddress,
    });

    setIsAddressModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitErrors([]);
    
    if (!isIdChecked) {
      //setSubmitErrors(['ID 중복 검사를 완료해주세요.']);
      setSubmitErrors(['Please complete the duplicate ID check.']);
      return;
    }
    
    if (!isPasswordMatched) {
      //setSubmitErrors(['비밀번호 확인을 완료해주세요.']);
      setSubmitErrors(['Please complete the password confirmation.']);
      return;
    }

    try {
      const { confirmPassword, ...submitData } = formData;
      
      const response = await axios.post(`${API_BASE_URL}/api/signup/`, submitData, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || ''
        }
      });
      console.log('회원가입 성공:', response.data);
      alert('membership has been registered.'); // 여기에 alert 추가
      navigate('/login');
    } catch (error: any) {
      console.error('Signup error:', error);
      console.error('Error response:', error.response);
      if (error.response && error.response.data) {
        setSubmitErrors([error.response.data.message]);
      } else {
        //setSubmitErrors(['회원가입 중 오류가 발생했습니다.']);
        setSubmitErrors(['An error occurred while signing up.']);
      }
    }
  };

  return (
    <div className="container">
      <div className="register-box">
        <h1 className="title">Register</h1>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="label">ID:</label>
            <div className="id-input-group">
              <input 
                type="text"
                name="id"
                value={formData.id}
                onChange={handleChange}
                className="input"
              />
              <button type="button" className="action-text" onClick={handleIdCheck}>Check ID</button>
            </div>
            {idErrors.length > 0 && (
              <div className="error-box">
                {idErrors.map((error, index) => (
                  <p key={index}>{error}</p>
                ))}
              </div>
            )}
          </div>

          <div className="input-group">
            <label className="label">Password:</label>
            <input 
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="input"
            />
          </div>

          <div className="input-group">
            <label className="label">Confirm Password:</label>
            <div className="id-input-group">
              <input 
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="input"
              />
              <button type="button" className="action-text" onClick={handlePasswordCheck}>Check PW</button>
            </div>
            {passwordErrors.length > 0 && (
              <div className="error-box">
                {passwordErrors.map((error, index) => (
                  <p key={index}>{error}</p>
                ))}
              </div>
            )}
          </div>

          {submitErrors.length > 0 && (
            <div className="error-box">
              {submitErrors.map((error, index) => (
                <p key={index}>{error}</p>
              ))}
            </div>
          )}

          <div className="input-group">
            <label className="label">Name:</label>
            <input 
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input"
            />
          </div>

          <div className="input-group">
            <label className="label">Age:</label>
            <input 
              type="text"
              name="age"
              value={formData.age}
              onChange={handleChange}
              className="input"
            />
          </div>

          <div className="input-group">
            <label className="label">Postal code:</label>
            <div className="id-input-group">
              <input 
                type="text"
                name="zonecode"
                value={formData.zonecode}
                readOnly
                className="input"
              />
              <button 
                type="button" 
                className="action-text" 
                onClick={() => setIsAddressModalOpen(true)}
              >
                주소 검색
              </button>
            </div>
          </div>

          <div className="input-group">
            <input 
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Address"
              className="input"
            />
          </div>

          <div className="input-group">
            <input 
              type="text"
              name="detailed_address"
              value={formData.detailed_address}
              onChange={handleChange}
              placeholder="Detailed Address"
              className="input"
            />
          </div>

          <div className="input-group">
            <label className="label">Phone Number:</label>
            <input 
              type="text"
              name="phone_num"
              value={formData.phone_num}
              onChange={handleChange}
              className="input"
            />
          </div>

          <div className="input-group">
            <label className="label">Guard Name:</label>
            <input 
              type="text"
              name="guard_name"
              value={formData.guard_name}
              onChange={handleChange}
              className="input"
            />
          </div>

          <div className="input-group">
            <label className="label">Guard Phone Number:</label>
            <input 
              type="text"
              name="guard_phone_num"
              value={formData.guard_phone_num}
              onChange={handleChange}
              className="input"
            />
          </div>
          
          <button type="submit" className="action-text">Submit</button>
        </form>

        {isAddressModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>주소 검색</h2>
                <button 
                  onClick={() => setIsAddressModalOpen(false)}
                  className="close-button"
                >
                  ×
                </button>
              </div>
              <DaumPostcode
                onComplete={handleComplete}
                autoClose={false}
                style={{ height: 400 }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;