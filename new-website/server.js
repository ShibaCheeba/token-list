const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8000',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(__dirname));

// Database setup
const db = new sqlite3.Database('./legal_platform.db');

// Initialize database tables
db.serialize(() => {
    // Lawyers table
    db.run(`CREATE TABLE IF NOT EXISTS lawyers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        bar_number TEXT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Clients table
    db.run(`CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        access_code TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        phone TEXT,
        address TEXT,
        invitation_sent_at DATETIME,
        profile_completed BOOLEAN DEFAULT FALSE,
        assigned_lawyer_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assigned_lawyer_id) REFERENCES lawyers(id)
    )`);

    // Estate planning data table
    db.run(`CREATE TABLE IF NOT EXISTS estate_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        marital_status TEXT,
        spouse_name TEXT,
        children TEXT, -- JSON string
        assets TEXT, -- JSON string
        beneficiaries TEXT, -- JSON string
        healthcare_preferences TEXT,
        executor_preferences TEXT,
        special_instructions TEXT,
        completed_at DATETIME,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id)
    )`);

    // Email invitations log
    db.run(`CREATE TABLE IF NOT EXISTS email_invitations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_email TEXT NOT NULL,
        invitation_code TEXT NOT NULL,
        sent_by_lawyer_id INTEGER,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        opened_at DATETIME,
        app_downloaded BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (sent_by_lawyer_id) REFERENCES lawyers(id)
    )`);
});

// Email configuration
const emailTransporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// JWT middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'legal-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// API Routes

// Lawyer registration/login
app.post('/api/lawyer/register', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, firstName, lastName, barNumber } = req.body;
        
        // Check if lawyer already exists
        db.get('SELECT id FROM lawyers WHERE email = ?', [email], async (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (row) {
                return res.status(400).json({ error: 'Lawyer already registered' });
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, 12);

            // Insert new lawyer
            db.run(
                'INSERT INTO lawyers (email, password_hash, bar_number, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
                [email, passwordHash, barNumber, firstName, lastName],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to register lawyer' });
                    }

                    const token = jwt.sign(
                        { id: this.lastID, email, type: 'lawyer' },
                        process.env.JWT_SECRET || 'legal-secret-key',
                        { expiresIn: '24h' }
                    );

                    res.json({
                        message: 'Lawyer registered successfully',
                        token,
                        lawyer: { id: this.lastID, email, firstName, lastName }
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/lawyer/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        db.get('SELECT * FROM lawyers WHERE email = ?', [email], async (err, lawyer) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (!lawyer) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const passwordMatch = await bcrypt.compare(password, lawyer.password_hash);
            if (!passwordMatch) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const token = jwt.sign(
                { id: lawyer.id, email: lawyer.email, type: 'lawyer' },
                process.env.JWT_SECRET || 'legal-secret-key',
                { expiresIn: '24h' }
            );

            res.json({
                message: 'Login successful',
                token,
                lawyer: {
                    id: lawyer.id,
                    email: lawyer.email,
                    firstName: lawyer.first_name,
                    lastName: lawyer.last_name
                }
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Send client invitation
app.post('/api/lawyer/invite-client', authenticateToken, [
    body('clientEmail').isEmail().normalizeEmail(),
    body('clientName').trim().notEmpty()
], async (req, res) => {
    try {
        if (req.user.type !== 'lawyer') {
            return res.status(403).json({ error: 'Lawyer access required' });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { clientEmail, clientName } = req.body;
        const accessCode = uuidv4().substring(0, 8).toUpperCase();
        const invitationCode = uuidv4();

        // Check if client already exists
        db.get('SELECT id FROM clients WHERE email = ?', [clientEmail], (err, existingClient) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (existingClient) {
                return res.status(400).json({ error: 'Client already exists' });
            }

            // Insert new client
            db.run(
                'INSERT INTO clients (email, access_code, first_name, assigned_lawyer_id) VALUES (?, ?, ?, ?)',
                [clientEmail, accessCode, clientName, req.user.id],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to create client record' });
                    }

                    const clientId = this.lastID;

                    // Log invitation
                    db.run(
                        'INSERT INTO email_invitations (client_email, invitation_code, sent_by_lawyer_id) VALUES (?, ?, ?)',
                        [clientEmail, invitationCode, req.user.id]
                    );

                    // Send email invitation
                    const emailContent = `
                        <h2>Estate Planning Invitation</h2>
                        <p>Dear ${clientName},</p>
                        <p>You've been invited to begin your estate planning process with our secure digital platform.</p>
                        <p><strong>Your Access Code:</strong> ${accessCode}</p>
                        <p>Please click the link below to download our secure app and begin your estate planning journey:</p>
                        <p><a href="${process.env.FRONTEND_URL || 'http://localhost:8000'}#client-portal?code=${invitationCode}" 
                           style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
                           Access Your Estate Planning Portal
                        </a></p>
                        <p>If you have any questions, please don't hesitate to contact our office.</p>
                        <p>Best regards,<br>Your Legal Team</p>
                    `;

                    emailTransporter.sendMail({
                        from: process.env.SMTP_FROM || 'noreply@legalestatepro.com',
                        to: clientEmail,
                        subject: 'Your Estate Planning Portal Access',
                        html: emailContent
                    }, (emailErr) => {
                        if (emailErr) {
                            console.error('Email send error:', emailErr);
                            return res.status(500).json({ error: 'Failed to send invitation email' });
                        }

                        res.json({
                            message: 'Client invitation sent successfully',
                            clientId,
                            accessCode
                        });
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Client login
app.post('/api/client/login', [
    body('email').isEmail().normalizeEmail(),
    body('accessCode').notEmpty()
], (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, accessCode } = req.body;

        db.get('SELECT * FROM clients WHERE email = ? AND access_code = ?', [email, accessCode], (err, client) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (!client) {
                return res.status(401).json({ error: 'Invalid email or access code' });
            }

            const token = jwt.sign(
                { id: client.id, email: client.email, type: 'client' },
                process.env.JWT_SECRET || 'legal-secret-key',
                { expiresIn: '7d' }
            );

            res.json({
                message: 'Client login successful',
                token,
                client: {
                    id: client.id,
                    email: client.email,
                    firstName: client.first_name,
                    profileCompleted: client.profile_completed
                }
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get lawyer dashboard data
app.get('/api/lawyer/dashboard', authenticateToken, (req, res) => {
    if (req.user.type !== 'lawyer') {
        return res.status(403).json({ error: 'Lawyer access required' });
    }

    // Get clients assigned to this lawyer
    db.all(
        `SELECT c.*, e.completed_at as estate_completed 
         FROM clients c 
         LEFT JOIN estate_data e ON c.id = e.client_id 
         WHERE c.assigned_lawyer_id = ? 
         ORDER BY c.created_at DESC`,
        [req.user.id],
        (err, clients) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            // Get invitation statistics
            db.all(
                'SELECT COUNT(*) as total_invitations, SUM(CASE WHEN app_downloaded THEN 1 ELSE 0 END) as downloads FROM email_invitations WHERE sent_by_lawyer_id = ?',
                [req.user.id],
                (err, stats) => {
                    if (err) {
                        return res.status(500).json({ error: 'Database error' });
                    }

                    res.json({
                        clients,
                        statistics: stats[0] || { total_invitations: 0, downloads: 0 }
                    });
                }
            );
        }
    );
});

// Get client estate data
app.get('/api/client/estate-data', authenticateToken, (req, res) => {
    if (req.user.type !== 'client') {
        return res.status(403).json({ error: 'Client access required' });
    }

    db.get(
        'SELECT * FROM estate_data WHERE client_id = ?',
        [req.user.id],
        (err, estateData) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            res.json({ estateData: estateData || {} });
        }
    );
});

// Save client estate data
app.post('/api/client/estate-data', authenticateToken, (req, res) => {
    if (req.user.type !== 'client') {
        return res.status(403).json({ error: 'Client access required' });
    }

    const {
        maritalStatus,
        spouseName,
        children,
        assets,
        beneficiaries,
        healthcarePreferences,
        executorPreferences,
        specialInstructions
    } = req.body;

    const estateDataJson = {
        maritalStatus,
        spouseName,
        children: JSON.stringify(children),
        assets: JSON.stringify(assets),
        beneficiaries: JSON.stringify(beneficiaries),
        healthcarePreferences,
        executorPreferences,
        specialInstructions
    };

    // Check if estate data already exists
    db.get('SELECT id FROM estate_data WHERE client_id = ?', [req.user.id], (err, existing) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (existing) {
            // Update existing data
            db.run(
                `UPDATE estate_data SET 
                 marital_status = ?, spouse_name = ?, children = ?, assets = ?, 
                 beneficiaries = ?, healthcare_preferences = ?, executor_preferences = ?, 
                 special_instructions = ?, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
                 WHERE client_id = ?`,
                [
                    estateDataJson.maritalStatus,
                    estateDataJson.spouseName,
                    estateDataJson.children,
                    estateDataJson.assets,
                    estateDataJson.beneficiaries,
                    estateDataJson.healthcarePreferences,
                    estateDataJson.executorPreferences,
                    estateDataJson.specialInstructions,
                    req.user.id
                ],
                (err) => {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to update estate data' });
                    }

                    // Mark client profile as completed
                    db.run('UPDATE clients SET profile_completed = TRUE WHERE id = ?', [req.user.id]);

                    res.json({ message: 'Estate data updated successfully' });
                }
            );
        } else {
            // Insert new data
            db.run(
                `INSERT INTO estate_data 
                 (client_id, marital_status, spouse_name, children, assets, beneficiaries, 
                  healthcare_preferences, executor_preferences, special_instructions, completed_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [
                    req.user.id,
                    estateDataJson.maritalStatus,
                    estateDataJson.spouseName,
                    estateDataJson.children,
                    estateDataJson.assets,
                    estateDataJson.beneficiaries,
                    estateDataJson.healthcarePreferences,
                    estateDataJson.executorPreferences,
                    estateDataJson.specialInstructions
                ],
                (err) => {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to save estate data' });
                    }

                    // Mark client profile as completed
                    db.run('UPDATE clients SET profile_completed = TRUE WHERE id = ?', [req.user.id]);

                    res.json({ message: 'Estate data saved successfully' });
                }
            );
        }
    });
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🏛️  LegalEstate Pro server running on port ${PORT}`);
    console.log(`📧  Make sure to configure SMTP settings in .env file`);
    console.log(`🔐  JWT Secret: ${process.env.JWT_SECRET ? 'Configured' : 'Using default (set JWT_SECRET in .env)'}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('💾 Database connection closed.');
        }
        process.exit(0);
    });
});

module.exports = app;