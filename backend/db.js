const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI)
.then(() => {
  console.info("✅ MongoDB");
})
.catch(err => {
  console.error("MongoDB ❌", err);
  process.exit();
});