const path = require('path');
const fs = require('fs');

const getLocations = (req, res) => {
    const filePath = path.join(__dirname, '../../location.json');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Error reading locations file' });
        }
        const locations = JSON.parse(data);
        res.json({ success: true, locations });
    });
};

module.exports = { getLocations };
