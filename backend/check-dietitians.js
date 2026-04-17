const mongoose = require('mongoose');

(async () => {
  try {
    // Import after mongoose might be connected
    const { Dietitian } = require('./src/models/userModel');
    
    // Wait a bit for models to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n========================================');
    console.log('  DIETITIAN DATABASE ANALYSIS');
    console.log('========================================\n');
    
    // Get counts
    const total = await Dietitian.countDocuments({});
    const verified = await Dietitian.countDocuments({ 'verificationStatus.finalReport': 'Verified', isDeleted: false });
    const notReceived = await Dietitian.countDocuments({ 'verificationStatus.finalReport': 'Not Received', isDeleted: false });
    const received = await Dietitian.countDocuments({ 'verificationStatus.finalReport': 'Received', isDeleted: false });
    const rejected = await Dietitian.countDocuments({ 'verificationStatus.finalReport': 'Rejected', isDeleted: false });
    const deleted = await Dietitian.countDocuments({ isDeleted: true });
    
    console.log('📊 SUMMARY COUNTS:');
    console.log('├─ Total Dietitians in DB: ' + total);
    console.log('├─ Verified (SHOWING): ' + verified);
    console.log('├─ Not Received (NOT SHOWING): ' + notReceived);
    console.log('├─ Received (NOT SHOWING): ' + received);
    console.log('├─ Rejected (NOT SHOWING): ' + rejected);
    console.log('└─ Deleted (NOT SHOWING): ' + deleted);
    console.log('\nBreakdown: ' + verified + ' + ' + notReceived + ' + ' + received + ' + ' + rejected + ' + ' + deleted + ' = ' + (verified + notReceived + received + rejected + deleted));
    
    console.log('\n\n🔴 UNVERIFIED DIETITIANS (NOT SHOWING - ' + (notReceived + received + rejected) + '):');
    console.log('─'.repeat(80));
    
    // List unverified dietitians
    if (notReceived > 0) {
      const notReceivedList = await Dietitian.find({ 'verificationStatus.finalReport': 'Not Received', isDeleted: false }, 'name email verificationStatus.finalReport');
      console.log('\n📋 Status: "Not Received" (' + notReceivedList.length + '):');
      notReceivedList.forEach((d, i) => {
        console.log('   ' + (i + 1) + '. ' + d.name + ' (' + d.email + ')');
      });
    }
    
    if (received > 0) {
      const receivedList = await Dietitian.find({ 'verificationStatus.finalReport': 'Received', isDeleted: false }, 'name email verificationStatus.finalReport');
      console.log('\n⏳ Status: "Received" (Pending Review) (' + receivedList.length + '):');
      receivedList.forEach((d, i) => {
        console.log('   ' + (i + 1) + '. ' + d.name + ' (' + d.email + ')');
      });
    }
    
    if (rejected > 0) {
      const rejectedList = await Dietitian.find({ 'verificationStatus.finalReport': 'Rejected', isDeleted: false }, 'name email verificationStatus.finalReport');
      console.log('\n❌ Status: "Rejected" (' + rejectedList.length + '):');
      rejectedList.forEach((d, i) => {
        console.log('   ' + (i + 1) + '. ' + d.name + ' (' + d.email + ')');
      });
    }
    
    if (deleted > 0) {
      const deletedList = await Dietitian.find({ isDeleted: true }, 'name email verificationStatus.finalReport');
      console.log('\n🗑️  DELETED ACCOUNTS (' + deletedList.length + '):');
      deletedList.forEach((d, i) => {
        console.log('   ' + (i + 1) + '. ' + d.name + ' (' + d.email + ') - Status: ' + (d.verificationStatus?.finalReport || 'N/A'));
      });
    }
    
    console.log('\n' + '─'.repeat(80));
    console.log('\n✅ VERIFIED DIETITIANS (SHOWING - ' + verified + '):');
    console.log('─'.repeat(80));
    const verifiedList = await Dietitian.find({ 'verificationStatus.finalReport': 'Verified', isDeleted: false }, 'name email');
    verifiedList.forEach((d, i) => {
      console.log((i + 1) + '. ' + d.name + ' (' + d.email + ')');
    });
    
    console.log('\n========================================\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
})();