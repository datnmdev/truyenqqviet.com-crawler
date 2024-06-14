const fs = require('fs');
const path = require('path');

const directoryPath = '/Users/nguyenminhdat/Downloads/crawl/truyenqqviet';

fs.readdir(directoryPath, (err, files) => {
    if (err) {
        console.error('Lỗi khi đọc thư mục:', err);
        return;
    }

    for (let file of files) {
        const filePath = path.join(directoryPath, file);
        const storyData = require(filePath)

        try {
            
        } catch (error) {
            
        }
    }
});