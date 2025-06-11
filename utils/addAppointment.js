require('dotenv').config();
const cron = require("node-cron");
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const BASE_URL = "https://fhir.api.thelattice.org/facadeDev/api/v1/";
var HEADERS = {
  'Content-Type': 'application/json',
};

function getTodayAtTimeIST(hours, minutes) {
  const date = new Date();

  date.setHours(hours, minutes, 0, 0);

  const pad = (n) => n.toString().padStart(2, '0');

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hr = pad(date.getHours());
  const min = pad(date.getMinutes());
  const sec = pad(date.getSeconds());

  return `${year}-${month}-${day}T${hr}:${min}:${sec}+05:30`;
}

// Create Schedule
async function createSchedule(orgId, schduleStartTime, scheduleEndTime) {
  const payload = {
    "orgId": orgId,
    "planningHorizon": {
        "end": scheduleEndTime,
        "start": schduleStartTime
    },
    "uuid": uuidv4()
    };
  const res = await axios.post(`${BASE_URL}/sync/Schedule`, [payload], { headers: HEADERS });
  return res.data.data[0].fhirId;
}

// Create an Appointment
async function createAppointment(orgId, patientId, scheduleId, appointmentStartTime, appointmentEndTime) {
  const payload = {
    "appointmentType": "walkin",
    "createdOn": appointmentStartTime,
    "orgId": orgId,
    "patientId": patientId,
    "scheduleId": scheduleId,
    "slot": {
        "end": appointmentEndTime,
        "start": appointmentStartTime
    },
    "status": "walkin",
    "uuid": uuidv4()
    };
  const res = await axios.post(`${BASE_URL}/sync/Appointment`, [payload], { headers: HEADERS });
  return res.data.data[0].fhirId;
}

// login
async function login() {
  const payload = {
    "userContact": "agnitest@thelattice.in"
  };
  await axios.post(`${BASE_URL}/auth/login`, payload, { headers: HEADERS });
  const otpPayload = {
    "userContact": "agnitest@thelattice.in",
    "otp": 111111
  };
  const res = await axios.post(`${BASE_URL}/auth/otp`, otpPayload, { headers: HEADERS });
  return res.data.data.token;
}

async function run() {
  try {
    const token = await login();

    HEADERS = {
      'x-access-token': token,
      'Content-Type': 'application/json',
    };

    var patientFhirIds = ["9969", "9988", "9971", "10005"]
    var orgId = "9935"
    var schduleStartTime = getTodayAtTimeIST(10, 0);
    var scheduleEndTime = getTodayAtTimeIST(10, 29);
  
    const scheduleId = await createSchedule(orgId, schduleStartTime, scheduleEndTime);
    console.log(`Schedule created: ${scheduleId}`);

    var appointmentStartTime = getTodayAtTimeIST(10, 0);
    var appointmentEndTime = getTodayAtTimeIST(10, 5);
    for (const patientFhirId of patientFhirIds) {
        const appointmentId = await createAppointment(orgId, patientFhirId, scheduleId, appointmentStartTime, appointmentEndTime);
        console.log(`Appointment created: ${appointmentId}`);
    }
    
  } catch (err) {
    if (err.response) {
      console.error('API Error:', err.response.status, err.response.data);
    } else if (err.request) {
      console.error('No response received:', err.request);
    } else {
      console.error('Unexpected error:', err.message);
    }
  }
}

cron.schedule("0 10 * * *", function() {
  run();
});