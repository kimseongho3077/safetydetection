from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.hashers import make_password, check_password
from django.http import JsonResponse
from django.middleware.csrf import get_token
from .models import User, UserStatus, UserPosture
import json
import random
from django.utils import timezone
from dotenv import load_dotenv
import openai
import pandas as pd
import pickle
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from sqlalchemy import create_engine  # SQLAlchemy 가져오기
import os
from sqlalchemy.engine.url import URL
from django.views.decorators.http import require_POST
from django.conf import settings
import numpy as np
from llama_index.core import VectorStoreIndex,SimpleDirectoryReader
from langchain.prompts import PromptTemplate
#from langchain_community.chat_models import ChatOpenAI
from langchain_openai import ChatOpenAI
from tensorflow.keras.models import load_model
import joblib

# 환경 변수 로드
load_dotenv()

# OpenAI API 키 설정
openai.api_key = os.getenv('OPENAI_API_KEY')

# 모델 파일 경로
MODEL1_PATH = os.path.join(os.path.dirname(__file__), 'models', 'model1.pkl')
print(MODEL1_PATH)
MODEL2_PATH = os.path.join(os.path.dirname(__file__), 'models', 'model2.pkl')
MODEL_MULTI_LABEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'multi_label.pkl')
HARTv3_PATH = os.path.join(os.path.dirname(__file__), 'models', 'HARTv3.pkl')

# 모델 로드
with open(MODEL1_PATH, 'rb') as f:
    model1 = pickle.load(f)

with open(MODEL2_PATH, 'rb') as f:
    model2 = pickle.load(f)
    
with open(MODEL_MULTI_LABEL_PATH, 'rb') as f:
    ml_model = pickle.load(f)
    
hartv3_model = joblib.load(HARTv3_PATH)

# SQLAlchemy 엔진 생성
database_url = URL.create(
    drivername='mysql+pymysql',
    username=settings.DATABASES['default']['USER'],
    password=settings.DATABASES['default']['PASSWORD'],
    host=settings.DATABASES['default']['HOST'],
    port=settings.DATABASES['default']['PORT'],
    database=settings.DATABASES['default']['NAME'],
)
engine = create_engine(database_url)


# 사용자 상태 갱신 뷰
@csrf_exempt
@require_POST
def update_user_status(request):
    if request.method == 'POST':
        user_id = request.session.get('user_id')
        if not user_id:
            return JsonResponse({'message': '로그인이 필요합니다.'}, status=403)

        user = User.objects.get(id=user_id)

        # 랜덤한 인덱스를 선택하여 데이터 가져오기
        random_index = random.randint(0, 100)
        query = f"""
        SELECT HeartRate, BreathRate, SPO2, SkinTemperature, SleepPhase, SleepScore, WalkingSteps, StressIndex, ActivityIntensity, CaloricExpenditure
        FROM random_db
        LIMIT 1 OFFSET {random_index}
        """
        df = pd.read_sql(query, engine)
        print("사용자 생체데이터 : ", df)

        # 모델 예측
        predictions = model1.predict(df)
        print("사용자 상태 예측 값 : ", predictions)

        # 예측 값 중 가장 큰 값을 상태로 저장
        status = int(predictions[0].argmax())  # 예측 값 중 가장 큰 값의 인덱스를 상태로 저장
        user_status = UserStatus.objects.create(user=user, status=status, updated_at=timezone.now())

        # status가 1 또는 2일 경우 predict_model2 호출
        # if status in [1, 2]:
        #     predict_model2(request)

        return JsonResponse({'message': '상태가 갱신되었습니다.', 'status': status, 'updated_at': user_status.updated_at, 'bio_data': df.to_dict(orient='records')})

    return JsonResponse({'message': '잘못된 요청입니다.'}, status=400)

# 사용자 상태 조회 뷰
def get_user_status(request):
    user_id = request.session.get('user_id')
    if not user_id:
        return JsonResponse({'message': '로그인이 필요합니다.'}, status=403)

    user = User.objects.get(id=user_id)
    statuses = UserStatus.objects.filter(user=user).order_by('-updated_at')[:10]
    print("사용자 상태 10개 데이터 업데이트 : ", statuses)
    data = [{'status': status.status, 'updated_at': status.updated_at} for status in statuses]
    return JsonResponse({'statuses': data})

@csrf_exempt
@require_POST
def update_user_posture(request):
    if request.method == 'POST':
        user_id = request.session.get('user_id')
        if not user_id:
            return JsonResponse({'message': '로그인이 필요합니다.'}, status=403)

        user = User.objects.get(id=user_id)
        
        # 8개의 시퀀스 시작 인덱스 리스트
        sequence_starts = [0, 128, 254, 384, 512, 640, 768, 896]
        
        # 랜덤하게 시작 인덱스 선택
        start_idx = random.choice(sequence_starts)
        
        # 선택된 시작점부터 128개의 연속된 데이터 가져오기
        query = f"""
        SELECT accx, accy, accz, gyrox, gyroy, gyroz
        FROM hart_data
        WHERE pos_idx BETWEEN {start_idx} AND {start_idx + 127}
        ORDER BY "index"
        """
        df = pd.read_sql(query, engine)
        print("사용자 자세 데이터 : ", df)
        
        # 데이터 reshape하여 모델 입력 형태에 맞추기
        #X = df.values.reshape(1, 128, 6)
        
        # 모델 예측
        #posture_predictions = hartv3_model.predict(X)
        #print("사용자 자세 예측 값 : ", posture_predictions)
        
        # 예측 값 중 가장 높은 확률을 가진 자세 선택
        #posture = np.argmax(posture_predictions)
        
        # 예측 값 중 가장 큰 값을 상태로 저장
        #posture = int(posture_predictions.argmax())  # 예측 값 중 가장 큰 값의 인덱스를 상태로 저장
        posture = random.choice([0, 1, 2, 3, 4, 5, 6])
        #user_posture = UserPosture.objects.create(user=user, posture=posture, updated_at=timezone.now())
        print("선택된 자세 : ", posture)
        
        user_posture = UserPosture.objects.create(user=user, posture=posture, updated_at=timezone.now())
        return JsonResponse({
            'message': '자세가 갱신되었습니다.', 
            'posture': int(posture), 
            'updated_at': user_posture.updated_at,
            'data_count': len(df)
        })

    return JsonResponse({'message': '잘못된 요청입니다.'}, status=400)



# 사용자 자세 조회 뷰
def get_user_posture(request):
    user_id = request.session.get('user_id')
    if not user_id:
        return JsonResponse({'message': '로그인이 필요합니다.'}, status=403)

    user = User.objects.get(id=user_id)
    postures = UserPosture.objects.filter(user=user).order_by('-updated_at')[:10]
    data = [{'posture': posture.posture, 'updated_at': posture.updated_at} for posture in postures]
    return JsonResponse({'postures': data})

# 회원가입 기능
def signup(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        id = data.get('id')
        password = data.get('password')
        name = data.get('name')
        age = data.get('age')
        address = data.get('address')
        detailed_address = data.get('detailed_address', '')
        phone_num = data.get('phone_num')
        guard_name = data.get('guard_name', '')
        guard_phone_num = data.get('guard_phone_num', '')
        
        # ID 중복 체크
        if User.objects.filter(id=id).exists():
            return JsonResponse({'message': '이미 존재하는 아이디입니다.'}, status=400)

        # 회원 저장
        user = User.objects.create(
            id=id,
            password=make_password(password),  # 비밀번호 해싱
            name=name,
            age=age,
            address=address,
            detailed_address=detailed_address,
            phone_num=phone_num,
            guard_name=guard_name,
            guard_phone_num=guard_phone_num
        )
        return JsonResponse({'message': '회원가입이 완료되었습니다.'}, status=201)

    return JsonResponse({'message': '잘못된 요청입니다.'}, status=400)

# ID 중복 체크 기능
def check_id(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        id = data.get('id')
        if User.objects.filter(id=id).exists():
            return JsonResponse({'isAvailable': False}, status=200)
        return JsonResponse({'isAvailable': True}, status=200)
    
    return JsonResponse({'message': '잘못된 요청입니다.'}, status=400)

# 로그인 기능
def user_login(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        id = data.get('id')
        password = data.get('password')

        try:
            user = User.objects.get(id=id)
            if check_password(password, user.password):  # 비밀번호 확인
                request.session['user_id'] = user.id  # 세션 저장
                request.session.save()  # 명시적으로 세션 저장
                print("저장한 세션 데이터:", request.session.items())  # 현재 세션 데이터 출력
                return JsonResponse({'message': '로그인 성공'}, status=200)
            else:
                return JsonResponse({'message': '비밀번호가 틀렸습니다.'}, status=400)
        except User.DoesNotExist:
            return JsonResponse({'message': '존재하지 않는 아이디입니다.'}, status=400)

    return JsonResponse({'message': '잘못된 요청입니다.'}, status=400)

# 사용자 정보 반환 기능
def user_info(request):
    if request.method == 'GET':
        user_id = request.session.get('user_id')
        if user_id:
            try:
                user = User.objects.get(id=user_id)
                user_data = {
                    'name': user.name,
                    'age': user.age
                }
                return JsonResponse(user_data, status=200)
            except User.DoesNotExist:
                return JsonResponse({'message': '사용자를 찾을 수 없습니다.'}, status=404)
        return JsonResponse({'message': '로그인되지 않았습니다.'}, status=401)
    
    return JsonResponse({'message': '잘못된 요청입니다.'}, status=400)

# 로그아웃 기능
def user_logout(request):
    if request.method == 'POST':
        request.session.flush()  # 세션 초기화
        return JsonResponse({'message': '로그아웃 완료'}, status=200)

    return JsonResponse({'message': '잘못된 요청입니다.'}, status=400)


# 로그인 상태 확인 기능
def check_login(request):
    print("세션 데이터:", dict(request.session.items()))  # 현재 세션 데이터 출력
    is_logged_in = 'user_id' in request.session
    return JsonResponse({'is_logged_in': is_logged_in})


# CSRF 토큰을 반환하는 뷰
@ensure_csrf_cookie
def get_csrf_token(request):
    csrf_token = get_token(request)
    return JsonResponse({'csrfToken': csrf_token})

def get_openai_api_key(request):
    api_key = os.environ.get("OPENAI_API_KEY")  # 환경 변수를 가져옴
    print(api_key)  # API 키 출력
    return JsonResponse({'api_key': api_key})  # API 키 반환
    

# SQLAlchemy 엔진 생성
database_url = URL.create(
    drivername='mysql+pymysql',
    username=settings.DATABASES['default']['USER'],
    password=settings.DATABASES['default']['PASSWORD'],
    host=settings.DATABASES['default']['HOST'],
    port=settings.DATABASES['default']['PORT'],
    database=settings.DATABASES['default']['NAME'],
)
engine = create_engine(database_url)

# 모델 1 예측 뷰
@csrf_exempt
@require_POST
def predict_model1(request):
    if request.method == 'POST':
        try:
            # 랜덤한 인덱스를 선택하여 데이터 가져오기
            random_index = random.randint(0, 100)
            query = f"""
            SELECT HeartRate, BreathRate, SPO2, SkinTemperature, SleepPhase, SleepScore, WalkingSteps, StressIndex, ActivityIntensity, CaloricExpenditure
            FROM modeling
            LIMIT 1 OFFSET {random_index}
            """
            df = pd.read_sql(query, engine)

            # 모델 예측
            predictions = model1.predict(df)
            print(predictions)

            # 예측 결과 반환
            return JsonResponse({'predictions': predictions.tolist()}, status=200)
        except Exception as e:
            # 예외 메시지를 로그에 출력
            print(f"Error: {e}")
            return JsonResponse({'message': str(e)}, status=500)

    return JsonResponse({'message': 'Invalid request method'}, status=400)

# 모델 2 예측 뷰
# 모델 2 예측 뷰
@csrf_exempt
@require_POST
def predict_model2(request):
    if request.method == 'POST':
        print("모델 2 예측 뷰 호출")
        try:
            data = json.loads(request.body)
            bio_data = data.get('bio_data')
            status = data.get('status')
            if not bio_data:
                return JsonResponse({'message': '생체 데이터가 제공되지 않았습니다.'}, status=400)
            if status is None:
                return JsonResponse({'message': '상태 값이 제공되지 않았습니다.'}, status=400)

            # 생체 데이터를 DataFrame으로 변환
            df = pd.DataFrame(bio_data)
            print("전송받은 생체데이터 : ", df)
            print("전송받은 상태 값 : ", status)
            
            labels= ['정상', '주의', '위급']
            label = ''
            for i in range(len(labels)):
                if status == i:
                    label = labels[i]
                    
            print("선택된 라벨 : ", label) 

            # ✅ 4개 모델 각각 예측 수행
            y_pred_probs = np.zeros((1, len(ml_model)))  
            for i, model in enumerate(ml_model):
                y_pred_probs[:, i] = model.predict(df)

            # ✅ 확률값을 0.5 기준으로 이진화
            y_pred_binary = np.round(y_pred_probs).astype(int).tolist()
            print("4개의 값 : ", y_pred_binary)  # [1,0,0,0]
            
            # 라벨 리스트
            labels = ['심박', '호흡', '피부온도', '혈중산소농도']

            # 1이 있는 위치의 라벨 추출
            selected_labels = [label for label, pred in zip(labels, y_pred_binary[0]) if pred == 1]

            print("선택된 라벨들: ", selected_labels)  # ['호흡']
            
            # OPENAI_API_KEY = "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"
            # openai.api_key= OPENAI_API_KEY
            print("open api key : ",openai.api_key)
            
            
            # "Private-Data" 폴더 내 PDF 문서 로드
            resume = SimpleDirectoryReader("./ragdata").load_data()
            #print("resume : ",resume)
            # 트리 인덱스(TreeIndex) 생성
            new_index = VectorStoreIndex.from_documents(resume)

            # 쿼리 엔진 생성
            query_engine = new_index.as_query_engine()

            # 검색어 생성
            search_query = f"{label} 상태에서 {selected_labels} 문제 발생 시 해결 방법"

            # 🔎 쿼리 실행
            response = query_engine.query(search_query)
            print("검색 결과 : ",response)

            # OpenAI LLM 모델 생성 (올바른 방식)
            llm = ChatOpenAI(model="gpt-4-turbo", openai_api_key=openai.api_key)
            print("LLM 생성 완료", llm)
                
            # 프롬프트 템플릿 정의
            # template = """ 
            # 현재 상태는 {status}한 상황이고, 원인은 {cause}. 때문이야
            # 대처 방법으로 {method}를 참고 할 수 있어 
            # 한국어로 나의 현재 상태를 단호하게 말해주고
            # 대처방법을 알려줘. 
            # 그리고 위급할 경우에 119에 신고를 해야한다고 경각심을 심어줘
            # 너는 안전전문가야 만약이라는 표현을 쓰지말고 단호하게 고객의 현재상태와 대처방법에 대해 필요한 말만 말해줘
            # """
            
            # 프롬프트 템플릿 정의
            template = """ 
현재 상태: {status}
원인: {cause}
대처 방법: {method}

너는 응급상황 대응 전문가다. 
고객의 현재 상태를 단호하게 설명하고, 즉각적인 대처 방법을 안내하라. 
'만약' 같은 불확실한 표현을 사용하지 말고, 필요한 말만 전달하라.
위급한 경우 119에 신고해야 한다는 경각심을 심어줘라. 
출력은 다음 형식으로 하라:

1. 현재 상태 설명 (단호한 문장)
2. 원인 분석 (간결하게)
3. 즉각적인 대처 방법 (실용적이고 구체적으로)
4. 경고 문구 (119 신고 필요 여부 강조)

"""


            prompt = PromptTemplate(
                    input_variables=["status", "method", "cause"],
                    template=template
            )

            # 사용자 입력 값 설정
            status_INPUT = label
            cause_INPUT = selected_labels
            method_INPUT = response.response

            print("RRRDD")
            # 최종 프롬프트 생성 및 실행
            final_prompt = prompt.format(status=status_INPUT, cause=cause_INPUT, method=method_INPUT)
            print("최종 프롬프트: ", final_prompt)

            try:
                print("🔥 OpenAI API 호출 시작")
                final_response = llm.invoke(final_prompt)
                
                # 응답 객체 전체 출력
                print(f"✅ OpenAI 응답 객체: {final_response}")
                
                # 응답 속성 확인
                print(f"✅ OpenAI 응답 속성: {dir(final_response)}")
                
                # 응답 내용 확인
                if hasattr(final_response, "content"):
                    print(f"✅ OpenAI 응답 내용: {final_response.content}")
                    llm_output = final_response.content
                else:
                    print("❌ OpenAI 응답에 'content' 속성이 없습니다.")
                    return JsonResponse({"error": "응답 형식 오류"}, status=500)
                
                return JsonResponse({"predictions": y_pred_binary, "message": llm_output})

            except Exception as e:
                print(f"❌ OpenAI API 호출 중 오류 발생: {e}")
                return JsonResponse({"error": str(e)}, status=500)  

        
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"message": "Use POST method with 'features' input."})


def get_openai_api_key(request):
    api_key = os.environ.get("OPENAI_API_KEY")  # 환경 변수를 가져옴
    print(api_key)  # API 키 출력
    return JsonResponse({'api_key': api_key})  # API 키 반환


@csrf_exempt
@require_POST
def emergency_call(request):
    # 현재 로그인한 사용자 확인
    user_id = request.session.get('user_id')
    if not user_id:
        return JsonResponse({'message': '로그인이 필요합니다.'}, status=403)

    try:
        user = User.objects.get(id=user_id)
        address_info = {
            'address': user.address,
            'detailed_address': user.detailed_address if user.detailed_address else "상세 주소 없음"
        }
        return JsonResponse({
            'message': '119에 신고되었습니다.',
            'user_address': address_info
        }, status=200)

    except User.DoesNotExist:
        return JsonResponse({'message': '사용자를 찾을 수 없습니다.'}, status=404)