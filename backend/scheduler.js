// backend/scheduler.js
const cron = require('node-cron');
const priceAlertService = require('./services/priceAlertService');
const autoPaymentService = require('./services/autoPaymentService'); // <-- IMPORTED

console.log('Scheduler initializing...');

// --- Schedule Price Alert Check (e.g., every 15 minutes) ---
// Cron format: second minute hour day-of-month month day-of-week
// '*/15 * * * *' = run every 15 minutes
cron.schedule('*/15 * * * *', async () => { // Keep price alerts running often
    console.log(`[${new Date().toISOString()}] Running Price Alert Check job...`);
    try {
        await priceAlertService.checkPriceAlerts(); // Call the function to check alerts
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error running Price Alert Check job:`, error);
    }
});

// --- Schedule Auto-Payment Execution (e.g., daily at 2 AM server time) ---
// '0 2 * * *' = run at 2:00 AM every day
// Use '*/1 * * * *' for testing (run every 1 minute) if needed, but remember to change back!
cron.schedule('0 2 * * *', async () => { // <-- Set desired schedule (e.g., '0 2 * * *' for 2 AM)
    console.log(`[${new Date().toISOString()}] Running Auto-Payment Execution job...`);
    try {
        // --- CALL THE SERVICE FUNCTION ---
        await autoPaymentService.executeScheduledPayments();
        // --- ---
        console.log(`[${new Date().toISOString()}] Auto-Payment Execution job completed successfully.`); // Optional: Add success log
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error running Auto-Payment Execution job:`, error);
    }
});

 // --- Schedule Auto-Payment Reminder (e.g., daily at 8 PM server time) ---
 // '0 20 * * *' = run at 8:00 PM every day
 cron.schedule('0 20 * * *', async () => {
     console.log(`[${new Date().toISOString()}] Running Auto-Payment Reminder job...`);
     try {
        // await autoPaymentService.sendPaymentReminders(); // TODO: Implement this service and uncomment
        console.log('Auto-Payment Reminder job needs implementation.'); // Keep as placeholder until implemented
     } catch (error) {
        console.error(`[${new Date().toISOString()}] Error running Auto-Payment Reminder job:`, error);
     }
 });


console.log('Scheduler initialized. Cron jobs scheduled.');

// Optional: Export functions if you need to manually trigger jobs for testing
// module.exports = {
//     manuallyTriggerPriceCheck: priceAlertService.checkPriceAlerts,
//     manuallyTriggerAutoPayment: autoPaymentService.executeScheduledPayments
//     // Add more triggers as needed
// };