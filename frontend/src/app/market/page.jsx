'use client'; // Required for Chart.js interaction, useEffect, useState

import React, { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Chart, registerables } from 'chart.js'; // Import Chart.js

Chart.register(...registerables); // Register necessary components for Chart.js v3+

export default function MarketPage() {
    const [activeTab, setActiveTab] = useState('goldPriceChartContent');
    const goldCanvasRef = useRef(null);
    const inflationCanvasRef = useRef(null);
    const goldChartRef = useRef(null); // To store chart instance
    const inflationChartRef = useRef(null); // To store chart instance

    // --- Chart Data (Keep consistent with HTML, ideally fetch real data later) ---
     const historicalLabels = ["2/5", "2/6", "2/7", "2/10", "2/11", "2/13", "2/14", "2/17", "2/18", "2/19", "2/20", "2/21", "2/24", "2/25", "2/27", "2/28", "3/3", "3/4", "3/5", "3/6", "3/7", "3/10", "3/11", "3/12", "3/14", "3/17", "3/18", "3/19", "3/20", "3/21", "3/24", "3/25", "3/26", "3/27", "3/28", "4/1", "4/2", "4/3", "4/4"];
     const historicalGoldData = [27414, 27593, 27520, 27503, 28120, 27771, 27915, 27522, 27508, 27929, 28023, 28008, 27911, 28051, 27698, 27321, 27250, 27398, 27601, 27750, 27617, 27666, 27529, 27716, 28359, 28420, 28642, 28837, 29056, 28944, 28812, 28716, 28852, 28855, 29304, 29933, 29832, 29984, 29645]; // Simplified
     const historicalInflationData = historicalGoldData.map(g => g * 0.03 + 500 + Math.random() * 100); // Very basic simulation matching length


    // --- Effect to initialize and update charts ---
    useEffect(() => {
        // Cleanup function to destroy charts on component unmount or tab change
        const destroyCharts = () => {
             if (goldChartRef.current) {
                 goldChartRef.current.destroy();
                 goldChartRef.current = null;
             }
             if (inflationChartRef.current) {
                 inflationChartRef.current.destroy();
                 inflationChartRef.current = null;
             }
        };

        destroyCharts(); // Destroy previous charts before creating new ones

        if (activeTab === 'goldPriceChartContent' && goldCanvasRef.current) {
            const ctxGold = goldCanvasRef.current.getContext('2d');
             goldChartRef.current = new Chart(ctxGold, {
                type: 'line',
                data: {
                    labels: historicalLabels,
                    datasets: [{
                        label: 'Gold Exchange Rate (Rs/g - Simulated)',
                        data: historicalGoldData,
                        borderColor: 'rgb(248, 182, 18)',
                        backgroundColor: 'rgba(248, 182, 18, 0.2)',
                        fill: true,
                        tension: 0.1
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: false, title: { display: true, text: 'Exchange Rate (Rs/g)' }}, x: { title: { display: true, text: 'Date / Time' }} }, plugins: { legend: { display: true, position: 'top' } } }
            });
        } else if (activeTab === 'inflationChartContent' && inflationCanvasRef.current) {
            const ctxInflation = inflationCanvasRef.current.getContext('2d');
             inflationChartRef.current = new Chart(ctxInflation, {
                type: 'line',
                data: {
                    labels: historicalLabels,
                    datasets: [
                        { label: 'Inflation (Simulated Index)', data: historicalInflationData, borderColor: 'rgb(255, 99, 132)', backgroundColor: 'rgba(255, 99, 132, 0.2)', fill: false, tension: 0.2, yAxisID: 'yInflation' },
                        { label: 'Gold Exchange Rate (Rs/g)', data: historicalGoldData, borderColor: 'rgb(248, 182, 18)', backgroundColor: 'rgba(248, 182, 18, 0.2)', fill: true, tension: 0.1, yAxisID: 'yGold' }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, stacked: false, scales: { yInflation: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Inflation Index (Simulated)' }}, yGold: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Gold Exchange Rate (Rs/g)' }, grid: { drawOnChartArea: false }, beginAtZero: false }, x: { title: { display: true, text: 'Date / Time' }}}, plugins: { legend: { display: true, position: 'top' } } }
            });
        }

        // Return cleanup function
         return destroyCharts;

    }, [activeTab]); // Re-run effect when activeTab changes

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
            {/* Use conditional rendering based on activeTab */}
            <div style={{ display: activeTab === 'goldPriceChartContent' ? 'block' : 'none' }} className="chart-content active">
              <div className="chart-container">
                <canvas ref={goldCanvasRef} id="goldPriceCanvas"></canvas>
              </div>
            </div>
             <div style={{ display: activeTab === 'inflationChartContent' ? 'block' : 'none' }} className="chart-content active">
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