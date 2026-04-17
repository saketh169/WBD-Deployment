const mongoose = require('mongoose');
const path = require('path');
const { Dietitian } = require('../src/models/userModel');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mockDietitians = [
  { name: "Dr. Sarah Johnson", photo: "https://images.unsplash.com/photo-1594824812393-08fe02440331?auto=format&fit=crop&w=800&q=80" },
  { name: "Dr. Amit Patel", photo: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=800&q=80" },
  { name: "Dr. Emily Rodriguez", photo: "https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&w=800&q=80" },
  { name: "Dr. Vikram Singh", photo: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=80" },
  { name: "Dr. Priya Sharma", photo: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=800&q=80" },
  { name: "Dr. Rajesh Kumar", photo: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=800&q=80" },
  { name: "Dr. Anjali Gupta", photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80" },
  { name: "Dr. Karan Mehta", photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=800&q=80" },
  { name: "Dr. Maya Singh", photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80" },
  { name: "Dr. Arjun Reddy", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80" },
  { name: "Dr. Sneha Iyer", photo: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=800&q=80" },
  { name: "Dr. Lisa Zhang", photo: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80" },
  { name: "Dr. Fatima Khan", photo: "https://images.unsplash.com/photo-1551190822-a9333d879b1f?auto=format&fit=crop&w=800&q=80" },
  { name: "Dr. Rohit Agarwal", photo: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=800&q=80" },
  { name: "Dr. Zara Ahmed", photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80" },
  { name: "Dr. Naveen Joshi", photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80" },
  { name: "Dr. Sunita Rao", photo: "https://images.unsplash.com/photo-1598128558393-70ff21433be0?auto=format&fit=crop&w=800&q=80" },
  { name: "Dr. Imran Khan", photo: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=800&q=80" },
  { name: "Dr. Kavita Menon", photo: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=800&q=80" },
  { name: "Dr. Aravind Nair", photo: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=800&q=80" },
  { name: "Dr. Meera Krishnan", photo: "https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?auto=format&fit=crop&w=800&q=80" },
  { name: "Dr. Vikash Gupta", photo: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=800&q=80" },
  { name: "Dr. Priyanka Jain", photo: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80" },
  { name: "Dr. Sameer Desai", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80" },
  { name: "Dr. Neha Agarwal", photo: "https://images.unsplash.com/photo-1618498082410-b4aa22193b38?auto=format&fit=crop&w=800&q=80" }
];

async function repairImages() {
  try {
    const MONGODB_URI = process.env.MONGODB_URL || "mongodb://localhost:27017/NutriConnectDatabase";
    await mongoose.connect(MONGODB_URI);

    console.log('🔄 Starting image reseed...');
    let updatedCount = 0;
    let notFoundCount = 0;

    for (const mock of mockDietitians) {
      const regexName = mock.name
        .replace(/\./g, '\\.?')
        .replace(/\s+/g, '\\s*');

      const updated = await Dietitian.findOneAndUpdate(
        { name: { $regex: new RegExp(`^${regexName}$`, 'i') } },
        { $set: { profileImage: mock.photo } },
        { new: true }
      );

      if (updated) {
        console.log(`✅ Updated: ${updated.name}`);
        updatedCount++;
      } else {
        console.log(`⚠️ Not found: ${mock.name}`);
        notFoundCount++;
      }
    }

    console.log(`\n✨ Final: ${updatedCount} updated, ${notFoundCount} not found.`);
    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Repair failed:', err);
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  }
}

repairImages();