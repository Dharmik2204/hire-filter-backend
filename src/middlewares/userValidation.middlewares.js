const validateFormat = (req, res, next) => {
    const { email, phone, password, name, role } = req.body;

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const phoneRegex = /^[0-9+\-\s]{10,15}$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@.#$!%*?&])[A-Za-z\d@.#$!%*?&]{8,15}$/;

    const missingFields = [];
    if (!name) missingFields.push("name");
    if (!password) missingFields.push("password");
    if (!role) missingFields.push("role");
    if (!email && !phone) missingFields.push("email or phone");

    if (missingFields.length > 0) {
        return res.status(400).json({
            message: `Required fields missing: ${missingFields.join(", ")}`
        });
    }

    if (email && !emailRegex.test(email)) {
        return res.status(400).json({
            message: "Invalid Email format"
        });
    }

    if (phone && !phoneRegex.test(phone)) {
        return res.status(400).json({
            message: "Invalid Phone format (must be 10-15 digits)"
        });
    }

    if (!passwordRegex.test(password)) {
        return res.status(400).json({
            message: "Invalid Password format (must be 8-15 characters, including uppercase, lowercase, number, and special character)"
        });
    }

    next();
};
export default validateFormat;
