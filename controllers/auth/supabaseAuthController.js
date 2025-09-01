// controllers/auth/supabaseAuthController.js
const supabase = require("../../config/supabaseClient");

// 📍 Admin Login (Supabase)
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return res.status(400).json({ error: error.message });

    return res.json({ message: "Admin login successful", data });
  } catch (err) {
    console.error("Error in adminLogin:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// 📍 Admin Logout (Supabase)
exports.adminLogout = async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: "Admin logged out successfully" });
  } catch (err) {
    console.error("Error in adminLogout:", err);
    res.status(500).json({ error: "Server error" });
  }
};
