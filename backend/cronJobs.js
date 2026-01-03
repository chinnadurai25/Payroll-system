const cron = require('node-cron');
const mongoose = require('mongoose');

// We need to access the Leave model. 
// Since the Leave model is defined in server.js, we might need to export it or redefine/retrieve it here.
// However, server.js is the main entry point and defines models inline. 
// A better best practice generally is to have models in separate files.
// BUT, to avoid refactoring the whole backend, we can access the model via mongoose.models if it's already registered.
// NOTE: server.js must be running for this to work if this file is imported there.

const cleanupLeaves = async () => {
    console.log('⏰ Running Cron Job: Cleanup Old Approved Leaves...');

    try {
        const Leave = mongoose.model('Leave');

        // Calculate date 7 days ago
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const cutoffDateStr = sevenDaysAgo.toISOString().slice(0, 10); // YYYY-MM-DD format for string comparison

        const result = await Leave.deleteMany({
            status: 'Approved',
            endDate: { $lt: cutoffDateStr }
        });

        if (result.deletedCount > 0) {
            console.log(`✅ Deleted ${result.deletedCount} old approved leave requests.`);
        } else {
            console.log('ℹ️ No old approved leaves found to delete.');
        }

    } catch (err) {
        console.error('❌ Error in Cron Job:', err);
    }
};

const setupCronJobs = () => {
    // Run immediately on server start
    cleanupLeaves();

    // Schedule task to run every day at midnight (00:00)
    cron.schedule('0 0 * * *', cleanupLeaves);

    console.log('✅ Cron Jobs Scheduled: Cleanup Old Approved Leaves (Daily at 00:00)');
};

module.exports = setupCronJobs;
