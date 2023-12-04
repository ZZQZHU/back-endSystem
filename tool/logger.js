const fs = require('fs');
const path = require('path');

function logError(error, req) {
    const logFilePath = path.join(__dirname, 'error.log');
    const logMessage = `Error at ${new Date().toISOString()} - ${req.method} ${req.url} - ${error.message}\n`;

    fs.appendFile(logFilePath, logMessage, (err) => {
        if (err) {
            console.error('Error writing to error log:', err);
        }
    });
}

module.exports = {
    logError
};