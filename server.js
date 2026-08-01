const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'prajamitra_secure_token_secret_key_2026';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files directly from current directory
app.use(express.static(__dirname));

// Ensure required directories exist
const DB_FILE = path.join(__dirname, 'database.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const ADMIN_DIST = path.join(__dirname, 'admin-dist');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve uploads
app.use('/uploads', express.static(UPLOADS_DIR));

// Serve React admin app if built
if (fs.existsSync(ADMIN_DIST)) {
  app.use('/admin', express.static(ADMIN_DIST));
}

// In-memory sessions store (Token -> User Email)
const ACTIVE_SESSIONS = new Map();
const AUTHORITY_ROLES = new Map();

// Helper to initialize Gemini client lazily
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    return new GoogleGenAI({ apiKey });
  } catch (err) {
    console.warn('Failed to initialize Gemini API client:', err.message);
    return null;
  }
}

// Database initialization helper
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initData = {
      users: [
        {
          id: 'USR-1700000000001',
          email: 'citizen@gov.in',
          phone: '9876543210',
          passwordHash: bcrypt.hashSync('citizen123', 10),
          role: 'Citizen',
          department: 'N/A',
          status: 'Active'
        },
        {
          id: 'USR-1700000000002',
          email: 'minister@gov.in',
          phone: '9848012345',
          passwordHash: bcrypt.hashSync('admin123', 10),
          role: 'Authority',
          department: 'Civic Infrastructure',
          status: 'Active'
        }
      ],
      complaints: [
        {
          id: 'PM-2026-X84920',
          category: 'civic',
          subcategory: 'Potholes & Roads',
          title: 'Major Pothole on MG Road near Clock Tower',
          severity: 'High',
          description: 'Deep pothole causing severe traffic jams and risk of accidents during night hours.',
          location: { latitude: 16.5062, longitude: 80.6480 },
          media: {},
          anonymous: false,
          reporter: { name: 'Anil Kumar', phone: '9876543210', email: 'citizen@gov.in' },
          date: '30 Jul 2026 at 10:30 AM',
          eta: '06 Aug 2026',
          dept: 'Municipal Administration & Urban Development',
          status: 'Under Investigation',
          timeline: [
            { status: 'Submitted', desc: 'Complaint registered successfully.', date: '30 Jul 2026 at 10:30 AM', completed: true },
            { status: 'Assigned', desc: 'Routed automatically to Municipal Administration nodal officer.', date: '30 Jul 2026 at 10:32 AM', completed: true },
            { status: 'Under Investigation', desc: 'Field inspection scheduled by Municipal Team.', date: '31 Jul 2026 at 09:00 AM', completed: true },
            { status: 'Resolved', desc: 'Final site verification and resolution.', date: 'Pending action', completed: false }
          ]
        },
        {
          id: 'PM-2026-X12049',
          category: 'food',
          subcategory: 'Ration Quality',
          title: 'Substandard Grain Distribution at Ward 12 Ration Depot',
          severity: 'Medium',
          description: 'Substandard quality grains supplied at local fair price shop.',
          location: { latitude: 16.5120, longitude: 80.6200 },
          media: {},
          anonymous: false,
          reporter: { name: 'Sunita Devi', phone: '9849011223', email: 'sunita@gmail.com' },
          date: '28 Jul 2026 at 02:15 PM',
          eta: '04 Aug 2026',
          dept: 'Civil Supplies & Consumer Affairs',
          status: 'Resolved',
          timeline: [
            { status: 'Submitted', desc: 'Complaint registered successfully.', date: '28 Jul 2026 at 02:15 PM', completed: true },
            { status: 'Assigned', desc: 'Assigned to Food Safety Inspector.', date: '28 Jul 2026 at 02:20 PM', completed: true },
            { status: 'Under Investigation', desc: 'Depot inspected and stock replaced.', date: '29 Jul 2026 at 11:00 AM', completed: true },
            { status: 'Resolved', desc: 'Depot manager issued compliance notice and stock verified.', date: '30 Jul 2026 at 04:00 PM', completed: true }
          ]
        },
        {
          id: 'PM-2026-X33910',
          category: 'health',
          subcategory: 'Doctor Absence',
          title: 'Absence of Duty Doctors at Primary Health Center',
          severity: 'High',
          description: 'No medical officer on duty during afternoon hours at the local PHC.',
          location: { latitude: 16.5200, longitude: 80.6300 },
          media: {},
          anonymous: true,
          reporter: null,
          date: '31 Jul 2026 at 08:45 AM',
          eta: '07 Aug 2026',
          dept: 'Health, Medical & Family Welfare',
          status: 'Submitted (Under Review)',
          timeline: [
            { status: 'Submitted', desc: 'Complaint registered successfully.', date: '31 Jul 2026 at 08:45 AM', completed: true },
            { status: 'Assigned', desc: 'Routed to District Medical Officer.', date: '31 Jul 2026 at 08:50 AM', completed: true },
            { status: 'Under Investigation', desc: 'Inspection scheduled.', date: 'Pending inspector assign', completed: false },
            { status: 'Resolved', desc: 'Resolution and action report.', date: 'Pending action', completed: false }
          ]
        }
      ],
      departments: [
        { id: 'DEP-1', name: 'Civil Supplies & Consumer Affairs', type: 'food', email: 'food.dept@gov.in', phone: '1800-111-222', status: 'Active' },
        { id: 'DEP-2', name: 'Municipal Administration & Urban Development', type: 'civic', email: 'civic.dept@gov.in', phone: '1800-333-444', status: 'Active' },
        { id: 'DEP-3', name: 'School Education Department', type: 'education', email: 'edu.dept@gov.in', phone: '1800-555-666', status: 'Active' },
        { id: 'DEP-4', name: 'Health, Medical & Family Welfare', type: 'health', email: 'health.dept@gov.in', phone: '1800-777-888', status: 'Active' }
      ],
      officers: [
        { id: 'OFF-1', name: 'R. K. Sharma', department: 'Municipal Administration & Urban Development', designation: 'Superintending Engineer', district: 'Guntur', email: 'sharma.civic@gov.in', phone: '9848022331', assignedComplaints: 24, completedComplaints: 18, performanceScore: 88 },
        { id: 'OFF-2', name: 'V. Lakshmi', department: 'Health, Medical & Family Welfare', designation: 'Medical Officer', district: 'Vijayawada', email: 'lakshmi.health@gov.in', phone: '9440122334', assignedComplaints: 12, completedComplaints: 11, performanceScore: 94 },
        { id: 'OFF-3', name: 'P. Srinivas', department: 'Civil Supplies & Consumer Affairs', designation: 'Food Safety Officer', district: 'Nellore', email: 'srinivas.food@gov.in', phone: '9866033445', assignedComplaints: 30, completedComplaints: 29, performanceScore: 97 },
        { id: 'OFF-4', name: 'K. Santhosh', department: 'School Education Department', designation: 'District Educational Officer', district: 'Kurnool', email: 'santhosh.edu@gov.in', phone: '9988776655', assignedComplaints: 8, completedComplaints: 4, performanceScore: 72 }
      ],
      settings: {
        passkeys: {
          food: '101',
          education: '102',
          civic: '103',
          health: '104',
          others: '100'
        }
      }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initData, null, 2));
    return initData;
  }
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (!data.users) data.users = [];
    if (!data.complaints) data.complaints = [];
    if (!data.departments) data.departments = [];
    if (!data.officers) data.officers = [];
    if (!data.settings) data.settings = { passkeys: { food: '101', education: '102', civic: '103', health: '104', others: '100' } };
    return data;
  } catch (e) {
    return { users: [], complaints: [], departments: [], officers: [], settings: {} };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Multer Storage for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Middleware for JWT Authentication
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// ==========================================================================
// AUTHENTICATION APIS
// ==========================================================================

app.post('/api/auth/register', (req, res) => {
  const { email, phone, password } = req.body;
  if (!email || !phone || !password) {
    return res.status(400).json({ error: 'Email, phone, and password are required' });
  }

  const db = readDB();
  const userExists = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() || u.phone === phone);

  if (userExists) {
    return res.status(400).json({ error: 'User with this email or phone already exists' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = {
    id: 'USR-' + Date.now(),
    email: email.toLowerCase(),
    phone: phone,
    passwordHash: hashedPassword,
    role: 'Citizen',
    department: 'N/A',
    status: 'Active'
  };

  db.users.push(newUser);
  writeDB(db);

  res.status(201).json({ message: 'User registered successfully!' });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = readDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  ACTIVE_SESSIONS.set(token, user.email);

  res.json({
    token: token,
    user: {
      email: user.email,
      phone: user.phone,
      role: user.role || 'Citizen'
    }
  });
});

app.post('/api/auth/authority', (req, res) => {
  const { email, department, passcode } = req.body;
  if (!email || !department || !passcode) {
    return res.status(400).json({ error: 'Email, department, and passcode are required' });
  }

  const db = readDB();
  const passkeys = {
    food: '9676292195',
    education: '6301316591',
    health: '8886803818',
    civic: '7671000584',
    others: '7671000583'
  };

  const rawDept = department.toLowerCase().trim();
  let deptKey = 'others';
  if (rawDept.includes('food') || rawDept.includes('civil supplies') || rawDept.includes('ration') || rawDept.includes('consumer')) deptKey = 'food';
  else if (rawDept.includes('civic') || rawDept.includes('municipal') || rawDept.includes('infrastructure') || rawDept.includes('public works') || rawDept.includes('water')) deptKey = 'civic';
  else if (rawDept.includes('edu') || rawDept.includes('school') || rawDept.includes('college')) deptKey = 'education';
  else if (rawDept.includes('health') || rawDept.includes('med') || rawDept.includes('hospital') || rawDept.includes('sanitation')) deptKey = 'health';
  else if (passkeys[rawDept]) deptKey = rawDept;

  const expectedPasscode = passkeys[deptKey] || passkeys['others'];

  if (passcode.trim() !== expectedPasscode) {
    return res.status(401).json({ error: `Incorrect pass key for ${department} department! Please enter the valid authority pass key.` });
  }

  let user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    user = {
      id: 'USR-' + Date.now(),
      email: email.toLowerCase(),
      phone: '',
      passwordHash: '',
      role: 'Authority',
      department: department,
      status: 'Active'
    };
    db.users.push(user);
    writeDB(db);
  } else {
    user.role = 'Authority';
    user.department = department;
    writeDB(db);
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: 'Authority' }, JWT_SECRET, { expiresIn: '7d' });
  ACTIVE_SESSIONS.set(token, user.email);
  AUTHORITY_ROLES.set(user.email.toLowerCase(), deptKey);

  res.json({ token, email: user.email, department: user.department });
});

app.post('/api/auth/google', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const db = readDB();
  let user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    user = {
      id: 'USR-' + Date.now(),
      email: email.toLowerCase(),
      phone: '',
      passwordHash: '',
      role: 'Citizen',
      department: 'N/A',
      status: 'Active'
    };
    db.users.push(user);
    writeDB(db);
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  ACTIVE_SESSIONS.set(token, user.email);

  res.json({ token, email: user.email });
});

// ==========================================================================
// COMPLAINTS APIS
// ==========================================================================

app.post('/api/complaints', upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), (req, res) => {
  const {
    category, subcategory, title, description, severity,
    latitude, longitude, anonymous, name, phone, email
  } = req.body;

  if (!category || !title) {
    return res.status(400).json({ error: 'Category and Title are required fields' });
  }

  const db = readDB();

  const randomNum = Math.floor(10000 + Math.random() * 90000);
  const ticketId = `PM-2026-X${randomNum}`;

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const etaDate = new Date();
  etaDate.setDate(today.getDate() + 7);
  const etaStr = etaDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const rawCat = (category || '').toLowerCase();
  let deptName = 'General Administration & Public Grievance';
  if (rawCat.includes('food') || rawCat.includes('civil') || rawCat.includes('ration') || rawCat.includes('consumer') || rawCat.includes('canteen')) {
    deptName = 'Civil Supplies & Consumer Affairs';
  } else if (rawCat.includes('civic') || rawCat.includes('municipal') || rawCat.includes('road') || rawCat.includes('pothole') || rawCat.includes('drainage') || rawCat.includes('water') || rawCat.includes('street')) {
    deptName = 'Municipal Administration & Urban Development';
  } else if (rawCat.includes('edu') || rawCat.includes('school') || rawCat.includes('college') || rawCat.includes('teacher') || rawCat.includes('scholarship')) {
    deptName = 'School Education Department';
  } else if (rawCat.includes('health') || rawCat.includes('med') || rawCat.includes('hospital') || rawCat.includes('doctor') || rawCat.includes('sanitation')) {
    deptName = 'Health, Medical & Family Welfare';
  } else if (rawCat.includes('police') || rawCat.includes('crime') || rawCat.includes('safety') || rawCat.includes('traffic')) {
    deptName = 'Police Department';
  } else if (rawCat.includes('emergency')) {
    deptName = 'Emergency Control Room';
  } else if (category && category.trim().length > 2) {
    deptName = category.trim();
  }

  const media = {};
  if (req.files) {
    if (req.files['photo']) media.photo = '/uploads/' + req.files['photo'][0].filename;
    if (req.files['video']) media.video = '/uploads/' + req.files['video'][0].filename;
    if (req.files['audio']) media.audio = '/uploads/' + req.files['audio'][0].filename;
  }

  const isEmg = (severity && severity.toLowerCase() === 'high') || (severity && severity.toLowerCase() === 'emergency') || title.toUpperCase().includes('EMERGENCY');

  const newComplaint = {
    id: ticketId,
    category: category,
    subcategory: subcategory || 'General',
    title: title,
    severity: severity || 'Medium',
    is_emergency: isEmg,
    is_voice: !!(req.files && req.files['audio']),
    description: description || 'No detailed description provided.',
    location: {
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null
    },
    media: media,
    anonymous: anonymous === 'true',
    reporter: anonymous === 'true' ? null : {
      name: name || 'Registered Citizen',
      phone: phone || '',
      email: email || ''
    },
    date: `${dateStr} at ${timeStr}`,
    eta: etaStr,
    dept: deptName,
    status: 'Submitted (Under Review)',
    timeline: [
      { status: 'Submitted', desc: 'Complaint registered successfully in citizen portal.', date: `${dateStr} at ${timeStr}`, completed: true, officerName: 'System Gatekeeper', deptName: deptName },
      { status: 'Under Review', desc: `Routed to ${deptName} nodal desk officer for verification.`, date: `${dateStr} at ${timeStr}`, completed: true, officerName: 'Nodal Desk Officer', deptName: deptName },
      { status: 'Assigned', desc: `Pending officer field assignment in ${deptName}.`, date: 'Pending', completed: false, officerName: 'Field Inspection Lead', deptName: deptName },
      { status: 'In Progress', desc: 'On-site investigation & resolution process scheduled.', date: 'Pending', completed: false, officerName: 'Field Inspection Lead', deptName: deptName },
      { status: 'Action Taken', desc: 'Corrective action implemented by department team.', date: 'Pending', completed: false, officerName: 'Field Action Team', deptName: deptName },
      { status: 'Resolved', desc: 'Grievance verified and resolved by department.', date: 'Pending', completed: false, officerName: 'Department Minister', deptName: deptName },
      { status: 'Closed', desc: 'Complaint lifecycle officially completed.', date: 'Pending', completed: false, officerName: 'System Auditor', deptName: deptName }
    ]
  };

  db.complaints.unshift(newComplaint);
  writeDB(db);

  res.status(201).json(newComplaint);
});

app.get('/api/complaints/track/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const found = db.complaints.find(c => c.id.toLowerCase() === id.toLowerCase());

  if (!found) {
    return res.status(404).json({ error: 'Complaint not found' });
  }

  res.json(found);
});

app.get('/api/complaints/user-history', (req, res) => {
  const db = readDB();

  if (req.query.all === 'true') {
    return res.json(db.complaints || []);
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.json([]);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.json([]);
    const userEmail = (user.email || '').toLowerCase();
    const history = (db.complaints || []).filter(c => {
      return !c.anonymous && c.reporter && c.reporter.email && c.reporter.email.toLowerCase() === userEmail;
    });
    res.json(history);
  });
});

app.get('/api/complaints/authority', (req, res) => {
  const db = readDB();
  res.json(db.complaints || []);
});

app.get('/api/complaints/stats', (req, res) => {
  const db = readDB();
  const complaints = db.complaints || [];
  const total = complaints.length;
  let investigation = 0;
  let resolved = 0;
  let submitted = 0;
  let underReview = 0;
  let assigned = 0;
  let inProgress = 0;
  let actionTaken = 0;
  let closed = 0;

  complaints.forEach(c => {
    const s = (c.status || '').toLowerCase();
    if (s.includes('resolved')) {
      resolved++;
    } else if (s.includes('closed')) {
      closed++;
    } else if (s.includes('investigation') || s.includes('progress') || s.includes('action')) {
      investigation++;
      if (s.includes('action')) actionTaken++;
      else inProgress++;
    } else if (s.includes('assigned')) {
      assigned++;
      investigation++;
    } else if (s.includes('review')) {
      underReview++;
    } else {
      submitted++;
    }
  });

  const pending = total - (resolved + closed);

  res.json({
    total,
    investigation,
    resolved,
    submitted,
    underReview,
    assigned,
    inProgress,
    actionTaken,
    closed,
    pending
  });
});

app.get('/api/complaints/search', (req, res) => {
  const query = (req.query.q || '').toLowerCase().trim();
  if (!query) return res.json([]);

  const keywordMappings = [
    { keywords: ['road', 'pothole', 'street', 'drainage', 'garbage', 'streetlight', 'highway', 'civic'], page: 'comregister.html#civic' },
    { keywords: ['ration', 'food', 'canteen', 'water', 'meal', 'welfare'], page: 'comregister.html#food' },
    { keywords: ['school', 'education', 'college', 'scholarship', 'teacher', 'fee'], page: 'comregister.html#education' },
    { keywords: ['hospital', 'doctor', 'medicine', 'health', 'ambulance', 'clinic'], page: 'comregister.html#health' },
    { keywords: ['police', 'transit', 'internet', 'noise', 'telecom', 'other', 'safety'], page: 'comregister.html#other' }
  ];

  const matches = [];
  keywordMappings.forEach(mapping => {
    const matchedKeyword = mapping.keywords.find(key => key.includes(query) || query.includes(key));
    if (matchedKeyword) {
      matches.push({
        title: `Report ${matchedKeyword.charAt(0).toUpperCase() + matchedKeyword.slice(1)} Grievance`,
        url: mapping.page
      });
    }
  });

  res.json(matches.slice(0, 5));
});

app.post('/api/complaints/assign', (req, res) => {
  const { id, officerId, officerName } = req.body;
  const db = readDB();
  const complaint = db.complaints.find(c => c.id === id);
  if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

  complaint.assignedOfficer = { id: officerId, name: officerName };
  complaint.status = 'Assigned';
  const nowStr = new Date().toLocaleDateString('en-IN') + ' at ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  
  if (!complaint.timeline) complaint.timeline = [];
  complaint.timeline.push({
    status: 'Assigned',
    desc: `Assigned to Officer ${officerName} (${officerId})`,
    date: nowStr,
    completed: true,
    officerName: officerName,
    deptName: complaint.dept || 'Nodal Department'
  });

  writeDB(db);
  res.json(complaint);
});

const STAGE_CONFIGS = [
  { name: 'Submitted', desc: 'Complaint registered in government portal.' },
  { name: 'Under Review', desc: 'Under active verification by nodal desk officer.' },
  { name: 'Assigned', desc: 'Assigned to nodal department officer.' },
  { name: 'In Progress', desc: 'On-site investigation & action underway.' },
  { name: 'Action Taken', desc: 'Corrective action implemented by department team.' },
  { name: 'Resolved', desc: 'Grievance verified and marked resolved by authority.' },
  { name: 'Closed', desc: 'Complaint lifecycle completed and closed.' }
];

const handleStatusUpdate = (req, res) => {
  const complaintId = req.body.id || req.body.complaint_id || req.body.ticketId;
  const status = req.body.status;
  const remarks = req.body.remarks || req.body.notes || `Status updated to ${status}`;

  if (!complaintId || !status) {
    return res.status(400).json({ error: 'Complaint ID and status are required' });
  }

  const db = readDB();
  const complaint = db.complaints.find(c => (c.id || '').toLowerCase() === complaintId.toLowerCase());
  if (!complaint) return res.status(404).json({ error: `Complaint #${complaintId} not found` });

  complaint.status = status;
  const nowStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' at ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  let targetIndex = STAGE_CONFIGS.findIndex(s => status.toLowerCase().includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(status.toLowerCase()));
  if (targetIndex === -1) {
    if (status.toLowerCase().includes('investigation')) targetIndex = 3;
    else targetIndex = 1;
  }

  if (!complaint.timeline) complaint.timeline = [];

  STAGE_CONFIGS.forEach((stg, idx) => {
    let existingStep = complaint.timeline.find(t => (t.status || '').toLowerCase().includes(stg.name.toLowerCase()) || stg.name.toLowerCase().includes((t.status || '').toLowerCase()));
    
    if (idx <= targetIndex) {
      if (existingStep) {
        existingStep.completed = true;
        if (idx === targetIndex) {
          existingStep.desc = remarks;
          existingStep.date = nowStr;
        }
      } else {
        complaint.timeline.push({
          status: stg.name,
          desc: idx === targetIndex ? remarks : stg.desc,
          date: nowStr,
          completed: true,
          officerName: (complaint.assignedOfficer && complaint.assignedOfficer.name) || 'Department Officer',
          deptName: complaint.dept || 'Nodal Authority'
        });
      }
    } else {
      if (existingStep) {
        existingStep.completed = false;
      } else {
        complaint.timeline.push({
          status: stg.name,
          desc: stg.desc,
          date: 'Pending',
          completed: false,
          officerName: (complaint.assignedOfficer && complaint.assignedOfficer.name) || 'Department Officer',
          deptName: complaint.dept || 'Nodal Authority'
        });
      }
    }
  });

  writeDB(db);
  res.json(complaint);
};

app.post('/api/complaints/update-status', handleStatusUpdate);
app.post('/api/complaints/status', handleStatusUpdate);

// ==========================================================================
// RESOLVE COMPLAINT — Authority marks a complaint fully resolved
// ==========================================================================
app.post('/api/complaints/resolve', (req, res) => {
  const complaintId = req.body.id || req.body.complaint_id || req.body.ticketId;
  const remarks = req.body.remarks || 'Grievance resolved by department authority.';
  const officerName = req.body.officerName || req.body.officer_name || 'Department Officer';
  const officerEmail = req.body.officerEmail || req.body.officer_email || '';
  const officerDept = req.body.department || req.body.dept || 'Authority';

  if (!complaintId) return res.status(400).json({ error: 'Complaint ID is required' });

  const db = readDB();
  const complaint = db.complaints.find(c => (c.id || '').toLowerCase() === complaintId.toLowerCase());
  if (!complaint) return res.status(404).json({ error: `Complaint #${complaintId} not found` });

  complaint.status = 'Resolved';
  complaint.resolvedBy = { name: officerName, email: officerEmail, department: officerDept };
  complaint.resolvedAt = new Date().toISOString();
  complaint.resolutionRemarks = remarks;

  const nowStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' at ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  if (!complaint.timeline) complaint.timeline = [];

  const resolvedIdx = STAGE_CONFIGS.findIndex(s => s.name === 'Resolved');
  STAGE_CONFIGS.forEach((stg, idx) => {
    let existingStep = complaint.timeline.find(t =>
      (t.status || '').toLowerCase() === stg.name.toLowerCase()
    );
    if (idx <= resolvedIdx) {
      if (existingStep) {
        existingStep.completed = true;
        if (idx === resolvedIdx) {
          existingStep.desc = remarks;
          existingStep.date = nowStr;
          existingStep.officerName = officerName;
          existingStep.deptName = officerDept;
        }
      } else {
        complaint.timeline.push({
          status: stg.name,
          desc: idx === resolvedIdx ? remarks : stg.desc,
          date: nowStr,
          completed: true,
          officerName,
          deptName: officerDept
        });
      }
    } else {
      if (existingStep) {
        existingStep.completed = false;
      } else {
        complaint.timeline.push({
          status: stg.name,
          desc: stg.desc,
          date: 'Pending',
          completed: false,
          officerName,
          deptName: officerDept
        });
      }
    }
  });

  writeDB(db);
  res.json({ success: true, complaint });
});

// ==========================================================================
// GET COMPLAINTS BY DEPARTMENT — filtered view for authority portals
// ==========================================================================
app.get('/api/complaints/department/:dept', (req, res) => {
  const deptKey = (req.params.dept || '').toLowerCase().trim();
  const db = readDB();
  let complaints = db.complaints;

  if (deptKey && deptKey !== 'all') {
    complaints = complaints.filter(c => {
      if (c.is_emergency || c.is_voice) return true;
      const text = ((c.category || '') + ' ' + (c.dept || '') + ' ' + (c.subcategory || '') + ' ' +
        (c.title || '') + ' ' + (c.description || '')).toLowerCase();
      if (deptKey === 'food') return text.includes('food') || text.includes('ration') || text.includes('pds') || text.includes('canteen') || text.includes('meal') || text.includes('civil supplies');
      if (deptKey === 'education') return text.includes('education') || text.includes('school') || text.includes('college') || text.includes('scholarship') || text.includes('teacher');
      if (deptKey === 'health') return text.includes('health') || text.includes('hospital') || text.includes('doctor') || text.includes('medical') || text.includes('sanitation') || text.includes('clinic');
      if (deptKey === 'civic') return text.includes('civic') || text.includes('municipal') || text.includes('road') || text.includes('pothole') || text.includes('street') || text.includes('water') || text.includes('drainage') || text.includes('pwd');
      if (deptKey === 'others') return !text.includes('food') && !text.includes('education') && !text.includes('health') && !text.includes('road') && !text.includes('water');
      return true;
    });
  }

  complaints = [...complaints].sort((a, b) => {
    if (a.is_emergency && !b.is_emergency) return -1;
    if (!a.is_emergency && b.is_emergency) return 1;
    if (a.is_voice && !b.is_voice) return -1;
    if (!a.is_voice && b.is_voice) return 1;
    return 0;
  });

  res.json(complaints);
});

app.post('/api/complaints/delete', (req, res) => {
  const { id } = req.body;
  const db = readDB();
  db.complaints = db.complaints.filter(c => c.id !== id);
  writeDB(db);
  res.json({ success: true });
});

// ==========================================================================
// AI GENERATION & SEARCH CLASSIFICATION APIS
// ==========================================================================

app.post('/api/ai/generate', async (req, res) => {
  const { category, subcategory, customSubText } = req.body;
  if (!category || !subcategory) {
    return res.status(400).json({ error: 'Category and subcategory are required' });
  }

  const ai = getGeminiClient();
  if (ai) {
    try {
      const prompt = `You are an AI assistant for PrajaMitra, an official government citizen grievance portal in India.
Generate a realistic, formal complaint title and a detailed complaint description based on:
Category: ${category}
Subcategory: ${subcategory}
Specific Details: ${customSubText || 'None'}

Return ONLY valid JSON format:
{
  "title": "Clear concise complaint title",
  "description": "2-3 sentences of detailed complaint description explaining the grievance clearly"
}`;
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt
      });
      let text = response.text || '';
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(text);
      if (parsed.title && parsed.description) {
        return res.json(parsed);
      }
    } catch (err) {
      console.warn('Gemini API generate failed, using fallback:', err.message);
    }
  }

  // Fallback mock predictions
  const mockTitles = {
    food: `Quality and distribution grievance regarding ${subcategory}`,
    civic: `Infrastructure issue: ${subcategory} requiring immediate municipal action`,
    education: `Educational institution grievance concerning ${subcategory}`,
    health: `Public health concern regarding ${subcategory} at local medical facility`,
    other: `Citizen grievance regarding ${subcategory}`
  };

  const title = mockTitles[category] || `Grievance regarding ${subcategory}`;
  const description = customSubText
    ? `I am registering a grievance regarding ${subcategory}: ${customSubText}. Requesting prompt action by nodal officers.`
    : `I am reporting an urgent issue regarding ${subcategory} in our locality. Please inspect the site and resolve at the earliest.`;

  res.json({ title, description });
});

app.post('/api/ai/classify-search', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.json({ category: 'other' });

  const ai = getGeminiClient();
  if (ai) {
    try {
      const prompt = `Classify the following citizen grievance search query into one of these exact categories: 'food', 'civic', 'education', 'health', 'other'.
Query: "${query}"
Return ONLY JSON: {"category": "category_name"}`;
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt
      });
      let text = response.text || '';
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(text);
      if (parsed.category) {
        return res.json({ category: parsed.category.toLowerCase() });
      }
    } catch (err) {
      console.warn('Gemini search classify failed, using fallback:', err.message);
    }
  }

  // Keyword Fallback
  const q = query.toLowerCase();
  let category = 'other';
  if (q.match(/hospital|doctor|medicine|health|ambulance|clinic|disease|hygiene/)) category = 'health';
  else if (q.match(/school|education|college|scholarship|teacher|fee|exam|student/)) category = 'education';
  else if (q.match(/road|pothole|street|drainage|garbage|streetlight|highway|civic|sewage/)) category = 'civic';
  else if (q.match(/ration|food|canteen|water|meal|welfare|rice|wheat|grain|depot/)) category = 'food';

  res.json({ category });
});

// ==========================================================================
// AUTHORITY & DEPARTMENT & USER MANAGEMENT APIS
// ==========================================================================

app.get('/api/authority/metrics', (req, res) => {
  const db = readDB();
  const deptCount = (db.departments || []).length;
  const usersCount = (db.users || []).length;
  const complaints = db.complaints || [];
  const totalComplaints = complaints.length;
  const resolvedCount = complaints.filter(c => (c.status || '').toLowerCase().includes('resolved')).length;

  res.json({
    departments: deptCount,
    users: usersCount,
    complaints: totalComplaints,
    resolved: resolvedCount
  });
});

app.get('/api/authority/analytics', (req, res) => {
  const db = readDB();
  const complaints = db.complaints || [];
  const total = complaints.length;
  const resolved = complaints.filter(c => (c.status || '').toLowerCase().includes('resolved')).length;
  const pending = complaints.filter(c => (c.status || '').toLowerCase().includes('submitted')).length;
  const inProgress = complaints.filter(c => (c.status || '').toLowerCase().includes('investigation')).length;

  res.json({
    total: total || 156,
    pending: pending || 48,
    inProgress: inProgress || 32,
    resolved: resolved || 64,
    rejected: 12,
    emergency: 8,
    resolutionTimeTrend: [
      { month: 'Jan', days: 8.5 },
      { month: 'Feb', days: 7.2 },
      { month: 'Mar', days: 6.8 },
      { month: 'Apr', days: 5.9 },
      { month: 'May', days: 5.1 },
      { month: 'Jun', days: 4.8 },
      { month: 'Jul', days: 4.2 }
    ],
    categoryDistribution: [
      { name: 'Food', value: 34 },
      { name: 'Civic', value: 58 },
      { name: 'Education', value: 24 },
      { name: 'Health', value: 28 },
      { name: 'Other', value: 12 }
    ],
    monthlyVolume: [
      { month: 'Jan', complaints: 88 },
      { month: 'Feb', complaints: 94 },
      { month: 'Mar', complaints: 110 },
      { month: 'Apr', complaints: 125 },
      { month: 'May', complaints: 140 },
      { month: 'Jun', complaints: 135 },
      { month: 'Jul', complaints: 156 }
    ],
    statusDistribution: [
      { name: 'Resolved', value: resolved || 64 },
      { name: 'In Progress', value: inProgress || 32 },
      { name: 'Pending', value: pending || 48 },
      { name: 'Rejected', value: 12 }
    ],
    districtVolume: [
      { district: 'Guntur', count: 42 },
      { district: 'Krishna', count: 38 },
      { district: 'NTR', count: 28 },
      { district: 'Prakasam', count: 22 },
      { district: 'Nellore', count: 16 },
      { district: 'Other Districts', count: 10 }
    ]
  });
});

app.get('/api/departments', (req, res) => {
  const db = readDB();
  res.json(db.departments || []);
});

app.post('/api/departments', (req, res) => {
  const { name, type, email, phone } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'Name and type are required' });

  const db = readDB();
  const newDept = {
    id: 'DEP-' + Date.now(),
    name,
    type,
    email: email || `${type.toLowerCase()}@gov.in`,
    phone: phone || '1800-000-000',
    status: 'Active'
  };
  db.departments.push(newDept);
  writeDB(db);
  res.status(201).json(newDept);
});

app.post('/api/departments/delete', (req, res) => {
  const { id } = req.body;
  const db = readDB();
  db.departments = (db.departments || []).filter(d => d.id !== id);
  writeDB(db);
  res.json({ success: true });
});

app.get('/api/users', (req, res) => {
  const db = readDB();
  res.json((db.users || []).map(u => ({
    id: u.id,
    name: u.name || u.email.split('@')[0],
    email: u.email,
    phone: u.phone || 'N/A',
    role: u.role || 'Citizen',
    department: u.department || 'N/A',
    status: u.status || 'Active'
  })));
});

app.post('/api/users', (req, res) => {
  const { name, email, role, department, status, phone } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const db = readDB();
  const newUser = {
    id: 'USR-' + Date.now(),
    name: name || email.split('@')[0],
    email,
    phone: phone || '98480' + Math.floor(10000 + Math.random() * 90000),
    role: role || 'Department Admin',
    department: department || 'Municipal Corporation',
    status: status || 'Active'
  };
  db.users.push(newUser);
  writeDB(db);
  res.status(201).json(newUser);
});

app.post('/api/users/update-role', (req, res) => {
  const { id, role } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.id === id);
  if (user) user.role = role;
  writeDB(db);
  res.json(user || {});
});

app.post('/api/users/update-department', (req, res) => {
  const { id, department } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.id === id);
  if (user) user.department = department;
  writeDB(db);
  res.json(user || {});
});

app.post('/api/users/update-status', (req, res) => {
  const { id, status } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.id === id);
  if (user) user.status = status;
  writeDB(db);
  res.json(user || {});
});

app.post('/api/users/delete', (req, res) => {
  const { id } = req.body;
  const db = readDB();
  db.users = (db.users || []).filter(u => u.id !== id);
  writeDB(db);
  res.json({ success: true });
});

app.get('/api/officers', (req, res) => {
  const db = readDB();
  res.json(db.officers || []);
});

app.post('/api/officers', (req, res) => {
  const { name, department, designation, district, email, phone } = req.body;
  const db = readDB();
  const newOfficer = {
    id: 'OFF-' + Date.now(),
    name: name || 'Officer',
    department: department || 'General Administration',
    designation: designation || 'Inspector',
    district: district || 'Central',
    email: email || 'officer@gov.in',
    phone: phone || '9000000000',
    assignedComplaints: 0,
    completedComplaints: 0,
    performanceScore: 100
  };
  db.officers.push(newOfficer);
  writeDB(db);
  res.status(201).json(newOfficer);
});

app.post('/api/officers/delete', (req, res) => {
  const { id } = req.body;
  const db = readDB();
  db.officers = (db.officers || []).filter(o => o.id !== id);
  writeDB(db);
  res.json({ success: true });
});

app.post('/api/settings/update-passkey', (req, res) => {
  const { department, passkey } = req.body;
  const db = readDB();
  if (!db.settings) db.settings = { passkeys: {} };
  if (!db.settings.passkeys) db.settings.passkeys = {};
  if (department && passkey) {
    db.settings.passkeys[department.toLowerCase()] = passkey;
    writeDB(db);
  }
  res.json({ message: 'Passkey updated successfully' });
});

app.post('/api/notifications/broadcast', (req, res) => {
  const { title, message } = req.body;
  res.json({ message: `Notification broadcasted: ${title}` });
});

// SPA fallback for root routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  if (req.path.startsWith('/admin')) {
    const adminIndex = path.join(ADMIN_DIST, 'index.html');
    if (fs.existsSync(adminIndex)) {
      return res.sendFile(adminIndex);
    }
  }
  const rootIndex = path.join(__dirname, 'index.html');
  if (fs.existsSync(rootIndex)) {
    return res.sendFile(rootIndex);
  }
  next();
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ error: 'Something went wrong on the server!' });
});

// Start Server listening on 0.0.0.0 and PORT 3000
app.listen(PORT, '0.0.0.0', () => {
  console.log(`PrajaMitra server running on http://0.0.0.0:${PORT}`);
});
