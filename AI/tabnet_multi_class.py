import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import roc_auc_score
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
import torch
from pytorch_tabnet.tab_model import TabNetClassifier
import pymysql
from sqlalchemy import create_engine
import matplotlib
matplotlib.use('Agg')  # GUI 없는 환경에서 matplotlib 사용


# 데이터베이스 연결 함수
def get_db():
    db = pymysql.connect(
        host='human-mysql.mysql.database.azure.com',  
        port=3306,  
        user='human',  
        passwd='!q1w2e3r4',  
        db='humandb',  
        ssl_ca=r'/home/azureuser/Desktop/config/DigiCertGlobalRootG2.crt.pem'  
    )
    return db

# DB에서 데이터 로드
db_connection = get_db()
cursor = db_connection.cursor()
query = "SELECT * FROM humandb.modeling_final"
cursor.execute(query)
columns = [desc[0] for desc in cursor.description]  
all_data = cursor.fetchall()  
df = pd.DataFrame(all_data, columns=columns)

# 데이터 확인
print("데이터셋의 크기:", df.shape)
print("컬럼명:", df.columns)
df.info()

# 데이터 준비 (numpy 변환 추가)
y = df[['상태']].values.ravel()  # 1D 배열 변환
x = df.drop(columns=['Index', '심박', '호흡', '피부온도', '혈중산소농도', '일상', '상태']).values  # DataFrame → numpy 변환


# 데이터 분할 (훈련 / 검증 / 테스트)
x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.2, random_state=42)
x_train, x_val, y_train, y_val = train_test_split(x_train, y_train, test_size=0.2, random_state=42)

# TabNet 모델 정의
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

clf = TabNetClassifier(
    device_name=device,
    n_d=8,  
    n_a=8,  
    n_steps=3,  
    gamma=1.5,  
    lambda_sparse=1e-4,  
    optimizer_fn=torch.optim.Adam,
    optimizer_params=dict(lr=2e-2),
    scheduler_params={"step_size":10, "gamma":0.9},
    scheduler_fn=torch.optim.lr_scheduler.StepLR,
    verbose=10
)

# TabNet 학습 (DataFrame → numpy 변환)
clf.fit(
    X_train=x_train, y_train=y_train,  
    eval_set=[(x_val, y_val)],
    eval_name=["val"],
    eval_metric=["logloss"],  # AUROC 대신 다중 클래스에서 사용할 수 있는 metric 적용
    max_epochs=50,
    patience=10,
    batch_size=256,
    virtual_batch_size=128,
    num_workers=0
)

# 모델 평가
from sklearn.metrics import roc_auc_score, log_loss, accuracy_score

y_pred_proba = clf.predict_proba(x_test)  # 확률 예측
y_pred = clf.predict(x_test)  # 클래스 예측

# AUROC 평가 (다중 클래스)
try:
    auc_score = roc_auc_score(y_test, y_pred_proba, multi_class='ovr')
    print(f"Test AUROC: {auc_score:.4f}")
except ValueError as e:
    print(f"AUROC 계산 중 오류 발생: {e}")

# Log Loss 평가
logloss = log_loss(y_test, y_pred_proba)
print(f"Test Log Loss: {logloss:.4f}")

# Accuracy 평가
accuracy = accuracy_score(y_test, y_pred)
print(f"Test Accuracy: {accuracy:.4f}")

