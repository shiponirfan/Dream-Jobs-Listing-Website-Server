const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Dream Jobs Listing Website Server");
});
app.listen(port, () => {
  console.log(`Dream Jobs Listing Website Server Running On Port ${port}`);
});
