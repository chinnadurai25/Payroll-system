const express = require("express");
const router = express.Router();
const Attendance = require("../models/Attendance");

router.post("/", async (req, res) => {
  try {
    const { employeeId, date, status } = req.body;
    const month = date.slice(0, 7); // YYYY-MM

    await Attendance.findOneAndUpdate(
      { employeeId, month },                 // SAME document
      {
        $set: {
          [`days.${date}`]: status            // add/update day
        }
      },
      {
        upsert: true,                         // create once if not exists
        new: true
      }
    );

    res.json({ message: "Attendance updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Attendance save failed" });
  }
});

router.get("/", async (req, res) => {
  try {
    const { employeeId, month } = req.query;

    const record = await Attendance.findOne({ employeeId, month });
    res.json(record?.days || {});
  } catch (err) {
    res.status(500).json({ message: "Fetch failed" });
  }
});

module.exports = router;
