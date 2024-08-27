from fastapi import FastAPI, WebSocket
import random
import time
import sqlite3
import numpy as np
from sklearn.linear_model import LinearRegression
import asyncio
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allow your React app's origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SQLite setup (create a simple database to store sensor data)
def init_db():
    conn = sqlite3.connect('sensor_data.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS sensor_data
                 (timestamp REAL, laser_power REAL, scan_speed REAL, 
                  bed_temperature REAL, layer_thickness REAL, oxygen_level REAL)''')
    conn.commit()
    conn.close()

# Store sensor data into the database
def store_sensor_data(data):
    conn = sqlite3.connect('sensor_data.db')
    c = conn.cursor()
    c.execute(f"INSERT INTO sensor_data VALUES (?, ?, ?, ?, ?, ?)",
              (time.time(), data['laser_power'], data['scan_speed'],
               data['bed_temperature'], data['layer_thickness'], data['oxygen_level']))
    conn.commit()
    conn.close()

# Fetch historical data from the database
def fetch_historical_data():
    conn = sqlite3.connect('sensor_data.db')
    c = conn.cursor()
    c.execute('SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT 100')
    rows = c.fetchall()
    conn.close()
    return rows

# Predict future values using linear regression
def predict_future_data(historical_data, data_key_index):
    if len(historical_data) < 10:  # Ensure we have at least 10 data points
        return [None] * 150  # Not enough data to predict

    # Extract timestamps and the specific sensor data (e.g., laser_power)
    timestamps = np.array([i for i in range(len(historical_data))]).reshape(-1, 1)
    sensor_values = np.array([row[data_key_index] for row in historical_data])

    # Train a simple linear regression model
    model = LinearRegression()
    model.fit(timestamps, sensor_values)

    # Predict future values for the next 5 minutes (150 seconds, assuming 1 point every second)
    future_timestamps = np.array([i for i in range(len(historical_data), len(historical_data) + 150)]).reshape(-1, 1)
    future_predictions = model.predict(future_timestamps)

    return future_predictions.tolist()

# Function to simulate sensor data
def generate_sensor_data():
    return {
        "laser_power": round(random.uniform(150, 300), 2),
        "scan_speed": round(random.uniform(500, 1500), 2),
        "bed_temperature": round(random.uniform(80, 150), 2),
        "layer_thickness": round(random.uniform(20, 50), 2),
        "oxygen_level": round(random.uniform(0.1, 0.5), 2)
    }

@app.get("/sensor-data")
async def get_sensor_data():
    # Generate new sensor data
    data = generate_sensor_data()

    # Store the new sensor data in the database
    store_sensor_data(data)

    # Fetch the latest 100 historical data points
    historical_data = fetch_historical_data()

    # Predict future values for the next 5 minutes (150 seconds)
    laser_power_predictions = predict_future_data(historical_data, 1)  # Column 1 = laser_power
    scan_speed_predictions = predict_future_data(historical_data, 2)   # Column 2 = scan_speed
    bed_temp_predictions = predict_future_data(historical_data, 3)     # Column 3 = bed_temperature
    layer_thickness_predictions = predict_future_data(historical_data, 4)  # Column 4 = layer_thickness
    oxygen_level_predictions = predict_future_data(historical_data, 5)     # Column 5 = oxygen_level

    return {
        "current_data": data,
        "predictions": {
            "laser_power": laser_power_predictions,
            "scan_speed": scan_speed_predictions,
            "bed_temperature": bed_temp_predictions,
            "layer_thickness": layer_thickness_predictions,
            "oxygen_level": oxygen_level_predictions
        }
    }

# WebSocket for real-time data streaming
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = generate_sensor_data()
        await websocket.send_json(data)
        await asyncio.sleep(2)

# Initialize the DB when the app starts
init_db()
