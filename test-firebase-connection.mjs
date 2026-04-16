import 'dotenv/config';
const { admin, db } = await import('./src/config/firebase.js');

const result = {
  firebaseAdminInitialized: !!admin,
  realtimeDbInitialized: !!db,
  testWriteSuccess: false,
  testReadSuccess: false,
  errors: [],
};

try {
  if (!db) {
    result.errors.push('Realtime Database not initialized');
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  // Test write
  const testRef = db.ref('_test_connection/message');
  const testMessage = { timestamp: new Date().toISOString(), content: 'test' };
  
  await testRef.set(testMessage);
  result.testWriteSuccess = true;
  result.writeTimestamp = new Date().toISOString();

  // Test read
  const snapshot = await testRef.get();
  if (snapshot.exists()) {
    result.testReadSuccess = true;
    result.readData = snapshot.val();
    result.readTimestamp = new Date().toISOString();
  } else {
    result.errors.push('Failed to read test data');
  }

  // Clean up
  await testRef.remove();

  // Verify cleanup
  const cleanupSnapshot = await testRef.get();
  if (!cleanupSnapshot.exists()) {
    result.cleanupSuccess = true;
  } else {
    result.errors.push('Failed to clean up test data');
  }
} catch (error) {
  result.errors.push(`Error: ${error.message}`);
}

console.log(JSON.stringify(result, null, 2));
