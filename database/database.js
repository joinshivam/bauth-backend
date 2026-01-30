const mysql = require("mysql2/promise");
const createTablesSQL = `
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    postfix VARCHAR(50) DEFAULT '@bauth.com',
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    dob VARCHAR(255),
    gender ENUM('male','female','other'),
    photo VARCHAR(255),
    email_verified TINYINT(1) DEFAULT 0,
    phone_verified TINYINT(1) DEFAULT 0,
    agreement TINYINT(1) DEFAULT 0,
    status ENUM('active','inactive','banned') DEFAULT 'inactive',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    session_token CHAR(64) UNIQUE NOT NULL,
    user_agent VARCHAR(255),
    ip_address VARCHAR(45),
    expires_at TIMESTAMP,
    revoked TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS otp (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    otp_token VARCHAR(255) UNIQUE NOT NULL,
    otp VARCHAR(12),
    purpose ENUM('email','phone','2fa') DEFAULT 'phone',
    used TINYINT(1) DEFAULT 0,
    expires_at TIMESTAMP,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    action VARCHAR(100),
    description TEXT,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_preferences (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    theme ENUM('light','dark','system') DEFAULT 'system',
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    two_factor_enabled TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

/* FIXED: table name cannot start with number */
CREATE TABLE IF NOT EXISTS two_factor_auth (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    secret_key VARCHAR(255) NOT NULL,
    enabled TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS account_recovery (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    type ENUM('email','phone','backup_code'),
    value VARCHAR(255),
    verified TINYINT(1) DEFAULT 0,
    used TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
`;

let pool;

const connectDB = async () => {
    try {
        pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE || "bauth",
            port: process.env.DB_PORT || 3306,
            ssl: {
                rejectUnauthorized: false
            },

            waitForConnections: true,
            connectionLimit: 20,
            multipleStatements: true,
        });

        await pool.query("SELECT 1");

        const statements = createTablesSQL
            .split(";")
            .map(s => s.trim())
            .filter(Boolean);

        for (const stmt of statements) {
            await pool.query(stmt);
        }

        console.log("✅ Cloud MySQL connected & tables ready");
    } catch (err) {
        console.error("❌ DB connection failed:", err.message);
        process.exit(1);
    }
};

const getDB = () => {
    if (!pool) throw new Error("DB not initialized");
    return pool;
};

module.exports = { connectDB, getDB };
