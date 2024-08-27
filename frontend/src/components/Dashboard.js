import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const [sensorData, setSensorData] = useState({
    laser_power: 'Loading...',
    scan_speed: 'Loading...',
    bed_temperature: 'Loading...',
    layer_thickness: 'Loading...',
    oxygen_level: 'Loading...'
  });

  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: 'Laser Power (W)',
        data: [],
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        fill: false,
        tension: 0.1,
      },
      {
        label: 'Scan Speed (mm/s)',
        data: [],
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        fill: false,
        tension: 0.1,
      },
      {
        label: 'Bed Temperature (°C)',
        data: [],
        borderColor: 'rgba(255, 206, 86, 1)',
        backgroundColor: 'rgba(255, 206, 86, 0.2)',
        fill: false,
        tension: 0.1,
      },
      {
        label: 'Layer Thickness (µm)',
        data: [],
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: false,
        tension: 0.1,
      },
      {
        label: 'Oxygen Level (%)',
        data: [],
        borderColor: 'rgba(153, 102, 255, 1)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        fill: false,
        tension: 0.1,
      }
    ],
  });

  const [predictionData, setPredictionData] = useState({
    labels: Array(150).fill().map((_, idx) => `+${(idx + 1) * 2} sec`),
    datasets: [
      {
        label: 'Predicted Laser Power (W)',
        data: [],
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        fill: false,
        tension: 0.1,
      },
      {
        label: 'Predicted Scan Speed (mm/s)',
        data: [],
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        fill: false,
        tension: 0.1,
      },
      {
        label: 'Predicted Bed Temperature (°C)',
        data: [],
        borderColor: 'rgba(255, 206, 86, 1)',
        backgroundColor: 'rgba(255, 206, 86, 0.2)',
        fill: false,
        tension: 0.1,
      },
      {
        label: 'Predicted Layer Thickness (µm)',
        data: [],
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: false,
        tension: 0.1,
      },
      {
        label: 'Predicted Oxygen Level (%)',
        data: [],
        borderColor: 'rgba(153, 102, 255, 1)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        fill: false,
        tension: 0.1,
      }
    ],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:8000/sensor-data');
        const data = await response.json();
        const { current_data, predictions } = data;

        console.log("Fetched data:", current_data);
        console.log("Predictions:", predictions);

        // Update current sensor data
        setSensorData(current_data);

        // Update real-time chart data
        setChartData(prevData => ({
          labels: [...prevData.labels, new Date().toLocaleTimeString()].slice(-20),
          datasets: prevData.datasets.map((dataset, index) => ({
            ...dataset,
            data: [...dataset.data, current_data[Object.keys(current_data)[index]]].slice(-20),
          })),
        }));

        // Update prediction chart data
        setPredictionData(prevPredictionData => ({
          labels: prevPredictionData.labels,
          datasets: prevPredictionData.datasets.map((dataset, index) => ({
            ...dataset,
            data: predictions[Object.keys(predictions)[index]],  // Use predicted data
          })),
        }));
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2000);  // Fetch every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: '3D Printing Parameters Over Time',
      },
    },
    scales: {
      y: {
        beginAtZero: false,
      },
    },
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">3D Printing Process Dashboard</h1>

      {/* Real-time data cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <SensorCard title="Laser Power" value={sensorData.laser_power} unit="W" />
        <SensorCard title="Scan Speed" value={sensorData.scan_speed} unit="mm/s" />
        <SensorCard title="Bed Temperature" value={sensorData.bed_temperature} unit="°C" />
        <SensorCard title="Layer Thickness" value={sensorData.layer_thickness} unit="µm" />
        <SensorCard title="Oxygen Level" value={sensorData.oxygen_level} unit="%" />
      </div>

      {/* Real-time data chart */}
      <div className="bg-white p-4 rounded shadow mb-4">
        <h2 className="text-lg font-semibold mb-2">Real-Time Data</h2>
        <Line options={options} data={chartData} />
      </div>

      {/* Prediction data chart */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-2">Predicted Data for Next 5 Minutes</h2>
        <Line options={options} data={predictionData} />
      </div>
    </div>
  );
};

const SensorCard = ({ title, value, unit }) => (
  <div className="bg-white p-4 rounded shadow">
    <h2 className="text-lg font-semibold mb-2">{title}</h2>
    <p className="text-xl">
      {value !== 'Loading...' ? `${parseFloat(value).toFixed(2)} ${unit}` : 'Loading...'}
    </p>
  </div>
);

export default Dashboard;
