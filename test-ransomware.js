const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const testDir = '/tmp/test_ransomguard';

// Create test directory
fs.ensureDirSync(testDir);

// Function to create high entropy (encrypted-like) files
function createEncryptedFile(filePath) {
  const highEntropyData = crypto.randomBytes(1024);
  fs.writeFileSync(filePath, highEntropyData);
}

// Function to create ransom note
function createRansomNote(filePath) {
  const note = `Your files have been encrypted!
To restore your files, send 0.1 Bitcoin to this address: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
After payment, contact us at decrypt@ransomware.com with your payment details.
Do not attempt to decrypt files yourself - this may cause permanent data loss!`;
  
  fs.writeFileSync(filePath, note);
}

// Function to simulate file encryption (rename with .encrypted extension)
function simulateFileEncryption(originalPath) {
  if (fs.existsSync(originalPath)) {
    const encryptedPath = originalPath + '.encrypted';
    createEncryptedFile(encryptedPath);
    fs.removeSync(originalPath);
    return encryptedPath;
  }
  return null;
}

// Simulate normal files first
console.log('Creating normal files...');
for (let i = 0; i < 5; i++) {
  const normalFile = path.join(testDir, `document_${i}.txt`);
  fs.writeFileSync(normalFile, `This is a normal document ${i}\nContent is readable and not encrypted.`);
}

// Wait a bit
setTimeout(() => {
  console.log('Simulating ransomware attack...');
  
  // Create ransom note
  createRansomNote(path.join(testDir, 'READ_ME_TO_RESTORE.txt'));
  
  // Simulate rapid file encryption (high burst rate)
  for (let i = 0; i < 10; i++) {
    const originalFile = path.join(testDir, `document_${i}.txt`);
    simulateFileEncryption(originalFile);
    
    // Create additional encrypted files
    const encryptedFile = path.join(testDir, `encrypted_file_${i}.locked`);
    createEncryptedFile(encryptedFile);
  }
  
  console.log('Ransomware simulation complete!');
  console.log(`Check the RansomGuard dashboard at http://localhost:3000`);
  console.log(`Test directory: ${testDir}`);
  
  // Detection Flow:
  1. File System Monitor detects file changes
  2. FME extracts metadata and calculates entropy
  3. ABT analyzes burst patterns (rapid modifications)
  4. Detection Engine scores threat level
  5. Real-time alerts sent via WebSocket
  6. Dashboard displays alerts with severity
  7. Security team can respond immediately
  
}, 3000);
