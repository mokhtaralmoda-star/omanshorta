const fs = require('fs');
try {
  const data = JSON.parse(fs.readFileSync('data/visitors_data.json', 'utf8'));
  const visitorsList = data.savedVisitors || [];
  console.log("Total saved visitors:", visitorsList.length);
  const recent = visitorsList.slice(-3); // Get last 3 visitors
  recent.forEach(v => {
    console.log("\n--- Visitor:", v._id, "---");
    console.log("fullName:", v.fullName);
    console.log("mohUsername:", v.mohUsername);
    console.log("data keys:", v.data ? Object.keys(v.data) : "no data");
    if (v.data && v.data['الاسم']) console.log("data['الاسم']:", v.data['الاسم']);
    
    if (v.dataHistory && v.dataHistory.length > 0) {
      console.log("dataHistory length:", v.dataHistory.length);
      v.dataHistory.forEach((h, i) => {
        console.log(`  History [${i}] keys:`, h.content ? Object.keys(h.content) : "no content");
        if (h.content && h.content['الاسم']) console.log(`  History [${i}]['الاسم']:`, h.content['الاسم']);
      });
    }
  });
} catch (e) {
  console.error("Error reading visitors_data.json:", e.message);
}
