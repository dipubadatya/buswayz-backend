const Driver = require("../models/Driver");
const Bus = require("../models/Bus");
const Admin = require("../models/Admin");

// ================= ADMIN CREDENTIALS =================
exports.updateCredentials = async (req, res) => {
    try {
        const { username, newPassword } = req.body;
        const adminId = req.user.id;

        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(404).json({ success: false, message: "Admin not found." });
        }

        if (username) admin.username = username;
        if (newPassword) admin.password = newPassword;

        await admin.save();

        res.status(200).json({ success: true, message: "Admin credentials updated successfully." });
    } catch (err) {
        console.error(err);
        if (err.code === 11000) {
            return res.status(409).json({ success: false, message: "Username already taken." });
        }
        res.status(500).json({ success: false, message: "Error updating credentials." });
    }
};

// ================= DRIVERS =================
exports.getDrivers = async (req, res) => {
    try {
        const drivers = await Driver.find().select("-password");
        res.status(200).json({ success: true, drivers });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error fetching drivers." });
    }
};

exports.createDriver = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: "Username and password required." });
        }

        const existing = await Driver.findOne({ username });
        if (existing) {
            return res.status(409).json({ success: false, message: "Driver username already exists." });
        }

        const driver = new Driver({ username, password });
        await driver.save();

        res.status(201).json({ success: true, message: "Driver created successfully.", driver: { id: driver._id, username: driver.username } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error creating driver." });
    }
};

exports.deleteDriver = async (req, res) => {
    try {
        const driverId = req.params.id;
        await Driver.findByIdAndDelete(driverId);

        // Optional: remove associated bus or set its driver to null
        await Bus.findOneAndDelete({ driver: driverId });

        res.status(200).json({ success: true, message: "Driver deleted successfully." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error deleting driver." });
    }
};

// ================= BUSES =================
exports.getBuses = async (req, res) => {
    try {
        const buses = await Bus.find().populate("driver", "username");
        res.status(200).json({ success: true, buses });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error fetching buses." });
    }
};

exports.getBusById = async (req, res) => {
    try {
        const bus = await Bus.findById(req.params.id);
        if (!bus) {
            return res.status(404).json({ success: false, message: "Bus not found." });
        }
        res.status(200).json({ success: true, bus });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error fetching bus." });
    }
};

exports.updateBus = async (req, res) => {
    try {
        const { busNumber, routeName, stops } = req.body;
        const bus = await Bus.findByIdAndUpdate(
            req.params.id,
            { busNumber, routeName, stops },
            { new: true, runValidators: true }
        );
        if (!bus) {
            return res.status(404).json({ success: false, message: "Bus not found." });
        }
        res.status(200).json({ success: true, message: "Bus updated successfully.", bus });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error updating bus." });
    }
};

exports.createBus = async (req, res) => {
    try {
        const { busNumber, routeName, driverId, stops } = req.body;

        if (!busNumber || !routeName || !driverId) {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        const processedStops = Array.isArray(stops) ? stops : [];

        const bus = await Bus.findOneAndUpdate(
            { driver: driverId },
            { busNumber, routeName, driver: driverId, stops: processedStops },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.status(200).json({ success: true, message: "Bus assigned to driver successfully.", bus });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error creating/assigning bus." });
    }
};

exports.deleteBus = async (req, res) => {
    try {
        await Bus.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Bus deleted successfully." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error deleting bus." });
    }
};
