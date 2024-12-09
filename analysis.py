import sys
import pandas as pd
import json
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score

# Load dataset
file_path = sys.argv[1]
data = pd.read_csv(file_path)

# Fill missing values CLEAN DATA
data.fillna({'transaction_type': 'Unknown', 'received_by': 'Unknown'}, inplace=True)
if 'transaction_amount' not in data.columns:
    data['transaction_amount'] = data['item_price'] * data['quantity']

# Analysis FORMULA
top_items = data.groupby('item_name')['quantity'].sum().sort_values(ascending=False).head(5)
transaction_revenue = data.groupby('transaction_type')['transaction_amount'].sum()

# Prediction model
X = data[['item_price', 'quantity']]
y = data['transaction_amount']
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)
model = LinearRegression()
model.fit(X_train, y_train)
y_pred = model.predict(X_test)
r2 = r2_score(y_test, y_pred)

# Results
results = {
    "top_items": top_items.to_dict(),
    "transaction_revenue": transaction_revenue.to_dict(),
    "r2_score": r2
}

print(json.dumps(results)) # transfer the results to NODE JS application server in JSON FORMAT
