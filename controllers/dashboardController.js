const Bus = require("../models/Bus");

// ================= GET DASHBOARD =================
exports.getDashboard = async (req, res) => {
  try {
    if (req.user && req.user.role === 'admin') {
      return res.status(200).json({
        success: true,
        user: req.user
      });
    }

    const bus = await Bus.findOne({ driver: req.driverId });

    return res.status(200).json({
      success: true,
      bus: bus || null,
      user: req.user
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching dashboard."
    });
  }
};

// ================= GET EDIT BUS =================
exports.getEditBus = async (req, res) => {
  try {
    const bus = await Bus.findOne({ driver: req.driverId });

    return res.status(200).json({
      success: true,
      bus: bus || null
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching bus details."
    });
  }
};

// ================= CREATE / UPDATE BUS =================
exports.postEditBus = async (req, res) => {
  try {
    const { busNumber, routeName, stops } = req.body;
    const driverId = req.driverId;

    const processedStops = Array.isArray(stops) ? stops : [];

    const bus = await Bus.findOneAndUpdate(
      { driver: driverId },
      {
        busNumber,
        routeName,
        stops: processedStops,
        driver: driverId
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "Bus details saved successfully.",
      bus
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error while saving bus details."
    });
  }
};