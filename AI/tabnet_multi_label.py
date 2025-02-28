import os
import numpy as np
import pandas as pd
from sklearn.metrics import f1_score, jaccard_score, hamming_loss
from sklearn.model_selection import train_test_split
import torch
from pytorch_tabnet.tab_model import TabNetClassifier
import shap
import matplotlib.pyplot as plt
import pymysql

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

# 상태(Status) 값이 1 또는 2인 데이터만 필터링
df_filtered = df[df["상태"].isin([1, 2])]

# 다중 라벨 컬럼 선택
y = df_filtered[['심박', '호흡', '피부온도', '혈중산소농도']]  # 다중 라벨 대상

# 입력 데이터(X) 설정
x = df_filtered.drop(columns=['Index', '심박', '호흡', '피부온도', '혈중산소농도','일상','상태']).values  # 독립 변수

# 데이터의 shape 확인
print("x (입력 데이터) shape:", x.shape)
print("y (출력 데이터) shape:", y.shape)

# 데이터 분할 (훈련 / 검증 / 테스트)
x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.2, random_state=42)
x_train, x_val, y_train, y_val = train_test_split(x_train, y_train, test_size=0.2, random_state=42)

# TabNet 이진 분류 모델 정의
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")
models = []
for i in range(y_train.shape[1]):  # 각 라벨별 개별 모델 학습
    print(f"Training tabnet for Label {i+1}...")
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
        X_train=x_train, y_train=y_train.iloc[:, i].values,  
        eval_set=[(x_val, y_val.iloc[:, i].values)],
        eval_name=["val"],
        eval_metric=["auc"],  # 이진 분류에서는 "accuracy"보다 "auc"이 더 적합
        max_epochs=50,
        patience=10,
        batch_size=256,
        virtual_batch_size=128,
        num_workers=0
    )
    models.append(clf)

# 모델 예측 수행
y_pred_probs = np.column_stack([model.predict_proba(x_test)[:, 1] for model in models])  # 확률 예측
y_pred_binary = (y_pred_probs > 0.5).astype(int)  # 확률값을 이진 변환

# 평가 지표 계산
print("Hamming Loss:", hamming_loss(y_test, y_pred_binary))
print("Micro F1-Score:", f1_score(y_test, y_pred_binary, average='micro'))
print("Macro F1-Score:", f1_score(y_test, y_pred_binary, average='macro'))
print("Jaccard Score:", jaccard_score(y_test, y_pred_binary, average='samples'))
