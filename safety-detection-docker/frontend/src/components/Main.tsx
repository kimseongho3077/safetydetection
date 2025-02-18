import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import * as echarts from 'echarts';
import dayjs from 'dayjs';

// API 기본 URL을 환경 변수에서 가져옴
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://20.39.188.27:8090';

axios.defaults.withCredentials = true;  // 전역 설정 추가
axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';

interface TooltipParam {
  data: number;
  axisValue: string;
  seriesName: string;
}

const Main = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{ name: string; age: number } | null>(null);
  const [statuses, setStatuses] = useState<{ status: number; updated_at: string }[]>([]);
  const [postures, setPostures] = useState<{ posture: number; updated_at: string }[]>([]);
  const [predictions2, setPredictions2] = useState<number[][]>([]);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertColor, setAlertColor] = useState<string | null>(null);
  const [bioData, setBioData] = useState<any[]>([]); // 사용자 생체 데이터를 저장할 상태 추가
  const [status, setStatus] = useState<number | null>(null); // 상태 값을 저장할 상태 추가
  const navigate = useNavigate();
  

  useEffect(() => {
    // 로그인 상태 확인
    const checkLoginStatus = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/check_login/`, {
          withCredentials: true, // ✅ 쿠키(세션) 포함
        });
        console.log(response);
        console.log("로그인 여부 확인: ", response.data.is_logged_in);
        setIsLoggedIn(response.data.is_logged_in);
  
        if (response.data.is_logged_in) {
          const userResponse = await axios.get(`${API_BASE_URL}/api/user_info/`, {
            withCredentials: true, // ✅ 쿠키(세션) 포함
          });
          console.log('User Info:', userResponse.data);
          setUserInfo(userResponse.data);
          fetchUserStatus();
          fetchUserPosture();
          updateUserStatus();
          updateUserPosture();
        }
      } catch (error) {
        console.error('로그인 상태 확인 중 오류 발생:', error);
      }
    };


    // CSRF 토큰을 가져오는 함수
    const fetchCsrfToken = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/csrf_token/`);
        setCsrfToken(response.data.csrfToken);
        axios.defaults.headers.common['X-CSRFToken'] = response.data.csrfToken; // CSRF 토큰을 기본 헤더에 설정
      } catch (error) {
        console.error('CSRF 토큰을 가져오는 중 오류 발생:', error);
      }
    };

    checkLoginStatus();
    fetchCsrfToken();

    // 10분 간격으로 사용자 상태 갱신
    const interval = setInterval(() => {
      if (isLoggedIn) {
        updateUserStatus();
        updateUserPosture();
      }
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const fetchUserStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/get_status/`, {
        withCredentials: true,});
      setStatuses(response.data.statuses);
      renderStatusChart(response.data.statuses);
    } catch (error) {
      console.error('사용자 상태를 가져오는 중 오류 발생:', error);
    }
  };

  const updateUserStatus = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/update_status/`, {
        withCredentials: true,
      });
      const status = response.data.status;
      setBioData(response.data.bio_data); // 사용자 생체 데이터를 저장
      setStatus(status); // 상태 값을 저장
      fetchUserStatus();
      if (status === 1 || status === 2) {
        fetchPredictions2(response.data.bio_data, status); // 생체 데이터와 상태 값을 함께 전송
      }
    } catch (error) {
      console.error('사용자 상태를 갱신하는 중 오류 발생:', error);
    }
  };

  const fetchUserPosture = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/get_posture/`, {
        withCredentials: true,
      });
      setPostures(response.data.postures);
      renderPostureChart(response.data.postures);
    } catch (error) {
      //console.error('사용자 자세를 가져오는 중 오류 발생:', error);
    }
  };

  const updateUserPosture = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/update_posture/`, {
        withCredentials: true,
      });
      fetchUserPosture();
    } catch (error) {
      //console.error('사용자 자세를 갱신하는 중 오류 발생:', error);
    }
  };

  const fetchPredictions2 = async (bioData: any[], status: number) => {
    try {
      const userResponse = await axios.get(`${API_BASE_URL}/api/user_info/`);
      console.log('User Info:', userResponse.data); // 응답 데이터 출력
      console.log('생체 데이터:', bioData);
      const response = await axios.post(`${API_BASE_URL}/api/predict_model2/`, { bio_data: bioData, status: status });
      setPredictions2(response.data.message);
      const currentTime = dayjs().format('HH:mm:ss');
      const alertMessage = `${currentTime} 기준, ${userResponse.data.name}님은 응급 상태입니다. 응급 단계 조치사항 ${response.data.message}`;
      //const alertMessage = `${currentTime} Based on the current status, ${userResponse.data.name}, emergency level ${response.data.message}`;
      console.log('alertMessage : ', alertMessage);
      setAlertMessage(alertMessage);
      const color = status === 0 ? 'black' : status === 1 ? '#ff5500' : 'red';
      setAlertColor(color);
    } catch (error) {
      console.error('모델 2 예측 값을 가져오는 중 오류 발생:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/logout/`, {
        withCredentials: true,
      });
      setIsLoggedIn(false);
      navigate('/login');
    } catch (error) {
      console.error('로그아웃 중 오류 발생:', error);
    }
  };

  const renderStatusChart = (data: { status: number; updated_at: string }[]) => {
    const chartDom = document.getElementById('main');
    if (!chartDom) return;
    const myChart = echarts.init(chartDom);
    const sortedData = data.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
    const option = {
      title: {
        text: 'User Status Over Time',
        subtext: 'Shows user status changes between Normal, Caution, and Danger states',
        left: 'center',
        textStyle: {
          fontSize: 24,         // 제목 글자 크기 증가
          fontWeight: 'bold'    // 제목 글자 굵기 설정
        }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const statusText = params[0].data[1] === 0 ? 'Normal' : params[0].data[1] === 1 ? 'Caution' : 'Danger';
          return `${params[0].data[0]}<br/>State: ${statusText}`;
        }
      },
      xAxis: {
        type: 'category',
        data: sortedData.map(item => dayjs(item.updated_at).format('HH:mm:ss')),
        axisTick: {
          alignWithLabel: true  // 눈금을 레이블 중앙에 맞춤
        }
      },
      yAxis: {
        type: 'category',
        data: ['Normal', 'Caution', 'Danger'],
        axisLabel: {
          formatter: (value: string) => {
            if (value === 'Normal') return 'Normal';
            if (value === 'Caution') return 'Caution';
            if (value === 'Danger') return 'Danger';
            return value;
          }
        },
        axisTick: {
          alignWithLabel: true  // 눈금을 레이블 중앙에 맞춤
        }
      },
      series: [
        {
          data: sortedData.map(item => [dayjs(item.updated_at).format('HH:mm:ss'), item.status]),
          type: 'line',
          lineStyle: {
            color: '#5470C6' // 라인 색깔
          },
          itemStyle: {
            color: (params: any) => {
              if (params.data[1] === 0) return '#5470C6'; // 점의 색깔을 초록색으로 변경
              if (params.data[1] === 1) return '#ff5500';
              return '#ff0000';
            },
            borderWidth: 2
          },
          symbolSize: 6,
          //symbol: 'circle' // 점의 모양을 원으로 설정
        }
      ]
    };
    myChart.setOption(option);
  };
  
  const renderPostureChart = (data: { posture: number; updated_at: string }[]) => {
    const chartDom = document.getElementById('posture');
    if (!chartDom) return;
    
    const myChart = echarts.init(chartDom);
    const sortedData = data.sort((a, b) => 
      new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
    );

    const postureNames = [
      'Downstair',
      'Upstair',
      'Running',
      'Sitdown',
      'StandUp',
      'Walking',
      'Lying',
      'Fall'
    ];

    const colors = [
      '#fac858',  // Yellow for Downstair      
      '#f5994e',  // Light Orange for Upstair 
      '#fc8452',  // Orange for Running 
      '#5470c6',  // Blue for Sitdown
      '#73c0de',  // Light Blue for StandUp
      '#91cc75',  // Green for Walking 
      '#3ba272',  // Teal for Lying      
      '#ff0000'   // Red for Fall
    ];

    const option = {
      title: {
        text: 'User Posture History',
        subtext: 'Displays real-time tracking of user movement and position changes',
        left: 'center',
        textStyle: {
          fontSize: 24,         // 제목 글자 크기 증가
          fontWeight: 'bold'    // 제목 글자 굵기 설정
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: (params: TooltipParam[]) => {
          const activeSeriesIndex = params.findIndex((param: TooltipParam) => param.data === 1);
          const time = params[0].axisValue;
          const posture = postureNames[activeSeriesIndex];
          return `${time}<br/>Posture: ${posture}`;
        }
      },
      legend: {
        data: postureNames,
        top: 60,
        itemWidth: 27,     // 범례 아이템의 너비
        itemHeight: 17,    // 범례 아이템의 높이
        textStyle: {
          fontSize: 15     // 범례 텍스트 크기
        },
      },
      grid: {
        left: '8%',
        right: '10%',
        bottom: '30%',
        top: '20%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: sortedData.map(item => dayjs(item.updated_at).format('HH:mm:ss')),
        axisLabel: {
          interval: 0,
          //rotate: 30  // 날짜 레이블이 겹치지 않도록 회전
        },
        axisTick: {
          alignWithLabel: true  // 눈금을 레이블 중앙에 맞춤
        }
      },
      yAxis: {
        type: 'category',
        max: 1,
        data: ['','Posture'],
        axisLabel: {
          //align: 'rignt',  // 눈금 텍스트를 중앙에 위치
          padding: [30, 0, 30,0]  // 텍스트와 눈금 사이의 간격 조정
        }
      },
      series: postureNames.map((name, index) => ({
        name: name,
        type: 'bar',
        stack: 'total',
        emphasis: {
          focus: 'series'
        },
        barWidth: '100%',  // bar 너비를 100%로 설정
        //barMaxWidth: 60,  // bar의 최대 너비를 60px로 제한
        barGap: '0%',     // bar 사이의 간격을 0으로 설정
        data: sortedData.map(item => item.posture === index ? 1 : 0),
        itemStyle: {
          color: colors[index]
        }
      }))
    };

    myChart.setOption(option);
    // 창 크기가 변경될 때 차트 크기 조정
    window.addEventListener('resize', () => {
      myChart.resize();
    });
  };

const handleEmergencyCall = async () => {
  //if (window.confirm('119에 신고하시겠습니까?')) {
  if (window.confirm('Would you like to report to 119?')) {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/emergency_call/`, {});

      if (response.status === 200) {
        const { message, user_address } = response.data;
          //alert(`${message}\n주소: ${user_address.address}\n상세 주소: ${user_address.detailed_address}`);
        alert(`${message}\nAddress: ${user_address.address}\nDetailed Address: ${user_address.detailed_address}`);
      } else {
          //alert('신고 요청이 실패했습니다. 다시 시도해주세요.');
        alert('Failed to report. Please try again.');
      }
    } catch (error) {
      console.error('🚨 신고 중 오류 발생:', error);
  
        // error를 AxiosError 타입으로 단언
      if (axios.isAxiosError(error)) {
          //alert(`🚨 신고 요청 실패: ${error.response?.data?.message || '알 수 없는 오류 발생'}`);
        alert(`🚨 Failed to report: ${error.response?.data?.message || 'An unknown error occurred'}`);
      } else {
          //alert('🚨 예기치 않은 오류가 발생했습니다.');
        alert('🚨 An unexpected error occurred.');
      }
    }
  }
};

  const closeAlert = () => {
    setAlertMessage(null);
    setAlertColor(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px' }}>
      </div>
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        {isLoggedIn && userInfo ? (
          <>
            <h1>{userInfo.name} ({userInfo.age}Y), currently on the web</h1>
            {/* <button onClick={() => status !== null && fetchPredictions2(bioData, status)}>Check Emergency Status</button> */}
          </>
        ) : (
          <h1>Welcome to the Main Page</h1>
        )}
      </div>
      {alertMessage && (
        <div className="popup-alert" style={{ backgroundColor: 'white', border: '1px solid black', padding: '10px' }}>
          
          <span style={{ color: alertColor || 'black' }}>{alertMessage}</span><br></br>
          <button onClick={closeAlert}className="action-text">Close</button>
          <button onClick={handleEmergencyCall} className="action-text">Report</button>
        </div>
      )}
      <div id="main" style={{ width: '100%', height: '400px' }}></div>
      <div id="posture" style={{ width: '100%', height: '400px', marginTop: '20px' }}></div>
    </div>
  );
};

export default Main;