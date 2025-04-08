// backend/utils/goldDataUtils.js
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const CSV_PATH = path.join(__dirname, '../data/gold_lkr_history.csv');
const TROY_OZ_TO_GRAMS = 31.1034768; // Standard conversion factor

let goldDataCache = null;

function loadGoldData() {
    if (goldDataCache) {
        return goldDataCache;
    }

    // *** Check if file exists ***
    if (!fs.existsSync(CSV_PATH)) {
        console.error(`CRITICAL: Gold data CSV file not found at: ${CSV_PATH}`);
        return []; // Return empty array if file doesn't exist
    }

    try {
        const fileContent = fs.readFileSync(CSV_PATH, { encoding: 'utf-8' });
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true
        });

        // Convert values and sort by date descending
        const parsedRecords = records.map(r => ({
            Date: r.Date,
            LKR_per_Oz: parseFloat(r.LKR_per_Oz)
        })).sort((a, b) => new Date(b.Date) - new Date(a.Date));

        goldDataCache = parsedRecords;
        return goldDataCache;
    } catch (error) {
        console.error(`Error loading or parsing gold data CSV (${CSV_PATH}):`, error);
        return [];
    }
}

function getRecentGoldData(days = 7) {
    const allData = loadGoldData();
    return allData.slice(0, days);
}

function getGoldMarketSummary() {
    const allData = loadGoldData();
    if (!allData || allData.length < 2) {
        return {
            latestPricePerOz: 0,
            latestPricePerGram: 0,
            latestDate: null,
            previousPricePerOz: 0,
            priceChangePercent: 0,
            trend: 'stable',
            previousDaysData: []
        };
    }

    const latestRecord = allData[0];
    const previousRecord = allData[1];

    const latestPriceOz = latestRecord.LKR_per_Oz || 0;
    const previousPriceOz = previousRecord.LKR_per_Oz || 0;

    let changePercent = 0;
    let trend = 'stable';
    if (previousPriceOz > 0) {
        changePercent = ((latestPriceOz - previousPriceOz) / previousPriceOz) * 100;
    }

    if (changePercent > 0.5) trend = 'up';
    else if (changePercent < -0.5) trend = 'down';

    const previousDaysData = allData.slice(0, 4).map(d => ({
        date: d.Date,
        pricePerOz: d.LKR_per_Oz || 0
    })).reverse();

    return {
        latestPricePerOz: latestPriceOz,
        latestPricePerGram: latestPriceOz / TROY_OZ_TO_GRAMS,
        latestDate: latestRecord.Date,
        previousPricePerOz: previousPriceOz,
        priceChangePercent: changePercent,
        trend: trend,
        previousDaysData: previousDaysData
    };
}

module.exports = {
    loadGoldData,
    getRecentGoldData,
    getGoldMarketSummary
};
