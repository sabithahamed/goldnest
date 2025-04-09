'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import Navbar from '@/components/NavbarInternal';
import Footer from '@/components/FooterInternal';

  Chart.register(...registerables);
  
  export default function MarketPage() {
    const [activeTab, setActiveTab] = useState('goldPriceChartContent');
    const goldCanvasRef = useRef(null);
    const inflationCanvasRef = useRef(null);
    const goldChartRef = useRef(null);
    const inflationChartRef = useRef(null);
    const simulationInterval = useRef(null);
  
    // Historical Labels
    const initialLabels = [
      "2/5", "2/6", "2/7", "2/10", "2/11", "2/13", "2/14", "2/17", "2/18", "2/19",
      "2/20", "2/21", "2/24", "2/25", "2/27", "2/28", "3/3", "3/4", "3/5", "3/6",
      "3/7", "3/10", "3/11", "3/12", "3/14", "3/17", "3/18", "3/19", "3/20", "3/21",
      "3/24", "3/25", "3/26", "3/27", "3/28", "4/1", "4/2", "4/3", "4/4"
    ];
  
    // Initial Gold Prices
    const initialGold = [
      27414, 27593, 27520, 27503, 28120, 27771, 27915, 27522, 27508, 27929,
      28023, 28008, 27911, 28051, 27698, 27321, 27250, 27398, 27601, 27750,
      27617, 27666, 27529, 27716, 28359, 28420, 28642, 28837, 29056, 28944,
      28812, 28716, 28852, 28855, 29304, 29933, 29832, 29984, 29645
    ];
  
    // Initial Inflation (simulated)
    const initialInflation = (() => {
      let data = [];
      let current = 850;
      for (let i = 0; i < initialGold.length; i++) {
        data.push(current);
        current += (Math.random() - 0.49) * current * 0.001;
        current = Math.max(500, current);
      }
      return data;
    })();
  
    // Data Refs (live simulation)
    const labels = useRef([...initialLabels]);
    const goldData = useRef([...initialGold]);
    const inflationData = useRef([...initialInflation]);
  
    // Simulation logic
    const simulateGold = (last) => {
      const r = Math.random();
      const delta = r < 0.65 ? 0.0005 : r < 0.9 ? (Math.random() - 0.5) * 0.0001 : -Math.random() * 0.0003;
      return Math.max(20000, last * (1 + delta));
    };
  
    const simulateInflation = (last) => {
      return Math.max(500, last + (Math.random() - 0.48) * last * 0.0005);
    };
  
    // Setup Charts ONCE
    useEffect(() => {
      if (!goldChartRef.current && goldCanvasRef.current) {
        const ctx = goldCanvasRef.current.getContext('2d');
        goldChartRef.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: [...labels.current],
            datasets: [{
              label: 'Gold Exchange Rate (Rs/g)',
              data: [...goldData.current],
              borderColor: 'rgb(248, 182, 18)',
              backgroundColor: 'rgba(248, 182, 18, 0.2)',
              fill: true,
              tension: 0.1,
              pointRadius: 0,
              pointHoverRadius: 5,
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: { mode: 'nearest', intersect: false },
            scales: {
              y: {
                beginAtZero: false,
                title: { display: true, text: 'Exchange Rate (Rs/g)' }
              },
              x: {
                title: { display: true, text: 'Date / Time' }
              }
            },
            plugins: {
              legend: { display: true, position: 'top' },
              tooltip: { animation: false }
            }
          }
        });
      }
  
      if (!inflationChartRef.current && inflationCanvasRef.current) {
        const ctx = inflationCanvasRef.current.getContext('2d');
        inflationChartRef.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: [...labels.current],
            datasets: [
              {
                label: 'Inflation (Simulated Index)',
                data: [...inflationData.current],
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                fill: false,
                tension: 0.2,
                pointRadius: 0,
                pointHoverRadius: 5,
                borderWidth: 2,
                yAxisID: 'yInflation'
              },
              {
                label: 'Gold Exchange Rate (Rs/g)',
                data: [...goldData.current],
                borderColor: 'rgb(248, 182, 18)',
                backgroundColor: 'rgba(248, 182, 18, 0.2)',
                fill: true,
                tension: 0.1,
                pointRadius: 0,
                pointHoverRadius: 5,
                borderWidth: 2,
                yAxisID: 'yGold'
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: { mode: 'nearest', intersect: false },
            stacked: false,
            scales: {
              yInflation: {
                type: 'linear',
                position: 'left',
                title: { display: true, text: 'Inflation Index (Simulated)' }
              },
              yGold: {
                type: 'linear',
                position: 'right',
                title: { display: true, text: 'Gold Exchange Rate (Rs/g)' },
                beginAtZero: false,
                grid: { drawOnChartArea: false }
              },
              x: {
                title: { display: true, text: 'Date / Time' }
              }
            },
            plugins: {
              legend: { display: true, position: 'top' },
              tooltip: { animation: false }
            }
          }
        });
      }
  
      // Start the simulation once
      if (!simulationInterval.current) {
        simulationInterval.current = setInterval(() => {
          const now = new Date().toLocaleTimeString();
          const newGold = simulateGold(goldData.current[goldData.current.length - 1]);
          const newInflation = simulateInflation(inflationData.current[inflationData.current.length - 1]);
  
          labels.current.push(now);
          goldData.current.push(newGold);
          inflationData.current.push(newInflation);
  
          if (labels.current.length > 60) {
            labels.current.shift();
            goldData.current.shift();
            inflationData.current.shift();
          }
  
          // Update Gold chart
          if (goldChartRef.current) {
            goldChartRef.current.data.labels = [...labels.current];
            goldChartRef.current.data.datasets[0].data = [...goldData.current];
            goldChartRef.current.update('none');
          }
  
          // Update Inflation chart
          if (inflationChartRef.current) {
            inflationChartRef.current.data.labels = [...labels.current];
            inflationChartRef.current.data.datasets[0].data = [...inflationData.current];
            inflationChartRef.current.data.datasets[1].data = [...goldData.current];
            inflationChartRef.current.update('none');
          }
        }, 3000);
      }
  
      return () => {
        if (simulationInterval.current) {
          clearInterval(simulationInterval.current);
          simulationInterval.current = null;
        }
      };
    }, []);
  
    return (
      <>
        <Navbar activePage="market" />
        <main className="static-page-padding">
          <section className="market-section content-container">
            <h2>Market Overview</h2>
  
            <div className="chart-tabs">
              <button
                className={`tab-button ${activeTab === 'goldPriceChartContent' ? 'active' : ''}`}
                onClick={() => setActiveTab('goldPriceChartContent')}
              >
                Gold Price (Simulated)
              </button>
              <button
                className={`tab-button ${activeTab === 'inflationChartContent' ? 'active' : ''}`}
                onClick={() => setActiveTab('inflationChartContent')}
              >
                Inflation vs Gold (Simulated)
              </button>
            </div>
  
            <div className="chart-display-area">
              <div
                style={{ display: activeTab === 'goldPriceChartContent' ? 'block' : 'none' }}
                className="chart-content"
              >
                <div className="chart-container">
                  <canvas ref={goldCanvasRef} id="goldPriceCanvas"></canvas>
                </div>
              </div>
  
              <div
                style={{ display: activeTab === 'inflationChartContent' ? 'block' : 'none' }}
                className="chart-content"
              >
                <div className="chart-container">
                  <canvas ref={inflationCanvasRef} id="inflationCanvas"></canvas>
                </div>
              </div>
            </div>
  
            <p className="chart-disclaimer">
              Note: Charts display SIMULATED data for demonstration purposes and do not reflect real-time market values. Past performance is not indicative of future results.
            </p>
          </section>
        </main>
        <Footer />
      </>
    );
  }