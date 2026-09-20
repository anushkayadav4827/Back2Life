import fs from 'fs';
import path from 'path';

const baseDir = path.resolve(__dirname, '../../../data/seed');
const rulesPath = path.join(baseDir, 'diagnosticRules.json');
const repairDataPath = path.join(baseDir, 'repairData.json');

const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf-8'));
const repairData = JSON.parse(fs.readFileSync(repairDataPath, 'utf-8'));

const newRules = [
  // Laptop additions
  {
    "PK": "DEVICE#laptop",
    "SK": "RULE#slow_performance",
    "deviceId": "laptop",
    "ruleId": "slow_performance",
    "symptomLabel": "Laptop running very slow or freezing",
    "questions": [
      { "id": "storage_full", "text": "Is your hard drive or SSD nearly full?", "type": "boolean" },
      { "id": "high_ram_usage", "text": "Do you have many tabs or heavy apps running simultaneously?", "type": "boolean" }
    ],
    "dangerousFlags": [],
    "possibleIssues": ["hdd_failing", "insufficient_ram", "malware_os_issue"]
  },
  {
    "PK": "DEVICE#laptop",
    "SK": "RULE#wifi_issues",
    "deviceId": "laptop",
    "ruleId": "wifi_issues",
    "symptomLabel": "WiFi disconnecting or not finding networks",
    "questions": [
      { "id": "other_devices_connect", "text": "Can other devices connect to your WiFi fine?", "type": "boolean" },
      { "id": "airplane_mode_off", "text": "Is Airplane mode turned off?", "type": "boolean" }
    ],
    "dangerousFlags": [],
    "possibleIssues": ["wifi_card_failure", "antenna_disconnected", "driver_issue"]
  },
  {
    "PK": "DEVICE#laptop",
    "SK": "RULE#trackpad_issues",
    "deviceId": "laptop",
    "ruleId": "trackpad_issues",
    "symptomLabel": "Trackpad not responding or jumping",
    "questions": [
      { "id": "external_mouse_works", "text": "Does an external USB mouse work fine?", "type": "boolean" },
      { "id": "trackpad_bulging", "text": "Is the trackpad physically bulging upwards?", "type": "boolean" }
    ],
    "dangerousFlags": ["swollen_battery"],
    "possibleIssues": ["swollen_battery", "trackpad_cable_loose", "trackpad_failure"]
  },
  
  // Smartphone additions
  {
    "PK": "DEVICE#smartphone",
    "SK": "RULE#camera_not_working",
    "deviceId": "smartphone",
    "ruleId": "camera_not_working",
    "symptomLabel": "Camera app crashing or photos blurry",
    "questions": [
      { "id": "lens_scratched", "text": "Is the outer glass covering the camera visibly cracked or scratched?", "type": "boolean" },
      { "id": "app_crashes", "text": "Does the camera app show a black screen or crash immediately?", "type": "boolean" }
    ],
    "dangerousFlags": [],
    "possibleIssues": ["camera_module_failure", "camera_lens_glass", "software_glitch"]
  },
  {
    "PK": "DEVICE#smartphone",
    "SK": "RULE#buttons_unresponsive",
    "deviceId": "smartphone",
    "ruleId": "buttons_unresponsive",
    "symptomLabel": "Power or volume buttons not clicking",
    "questions": [
      { "id": "mushy_buttons", "text": "Do the buttons feel 'mushy' and lack a distinct click?", "type": "boolean" },
      { "id": "case_removed", "text": "Does the issue persist even when the phone case is removed?", "type": "boolean" }
    ],
    "dangerousFlags": [],
    "possibleIssues": ["button_flex_cable", "debris_in_button", "chassis_dent"]
  },
  {
    "PK": "DEVICE#smartphone",
    "SK": "RULE#network_issues",
    "deviceId": "smartphone",
    "ruleId": "network_issues",
    "symptomLabel": "No cellular signal or dropped calls",
    "questions": [
      { "id": "sim_reseated", "text": "Have you tried removing and reinserting the SIM card?", "type": "boolean" },
      { "id": "wifi_works", "text": "Does the phone connect to WiFi without issues?", "type": "boolean" }
    ],
    "dangerousFlags": [],
    "possibleIssues": ["sim_reader_damage", "antenna_cable", "baseband_ic"]
  },

  // Headphones additions
  {
    "PK": "DEVICE#headphones",
    "SK": "RULE#case_not_charging",
    "deviceId": "headphones",
    "ruleId": "case_not_charging",
    "symptomLabel": "Charging case won't charge or power on",
    "questions": [
      { "id": "cable_tested", "text": "Have you tested the charging cable with another device?", "type": "boolean" },
      { "id": "lint_in_port", "text": "Is there lint or debris in the case's charging port?", "type": "boolean" }
    ],
    "dangerousFlags": ["hot_to_touch"],
    "possibleIssues": ["case_battery_dead", "charging_port_damaged", "case_logic_board"]
  },
  {
    "PK": "DEVICE#headphones",
    "SK": "RULE#mic_not_working",
    "deviceId": "headphones",
    "ruleId": "mic_not_working",
    "symptomLabel": "Microphone not picking up voice in calls",
    "questions": [
      { "id": "muffled_voice", "text": "Do callers say you sound very muffled or distant?", "type": "boolean" },
      { "id": "voice_memo_works", "text": "Does the mic work if you record a local voice memo?", "type": "boolean" }
    ],
    "dangerousFlags": [],
    "possibleIssues": ["mic_mesh_clogged", "microphone_component", "bluetooth_profile_issue"]
  }
];

const newRepairData = [
  // Laptop RepairData
  { "PK": "DEVICE#laptop", "SK": "ISSUE#hdd_failing", "issueId": "hdd_failing", "issueLabel": "Failing Hard Drive / Upgrade needed", "isDemoData": true, "partsAvailability": "GOOD", "repairComplexity": "LOW", "repairCostMinINR": 2000, "repairCostMaxINR": 6000, "replacementCostMinINR": 35000, "replacementCostMaxINR": 60000, "expectedRepairTimeDays": 1, "expectedRemainingUsabilityYears": 3 },
  { "PK": "DEVICE#laptop", "SK": "ISSUE#wifi_card_failure", "issueId": "wifi_card_failure", "issueLabel": "WiFi Card Replacement", "isDemoData": true, "partsAvailability": "GOOD", "repairComplexity": "LOW", "repairCostMinINR": 1000, "repairCostMaxINR": 2500, "replacementCostMinINR": 35000, "replacementCostMaxINR": 60000, "expectedRepairTimeDays": 1, "expectedRemainingUsabilityYears": 3 },
  { "PK": "DEVICE#laptop", "SK": "ISSUE#trackpad_failure", "issueId": "trackpad_failure", "issueLabel": "Trackpad Replacement", "isDemoData": true, "partsAvailability": "MEDIUM", "repairComplexity": "MEDIUM", "repairCostMinINR": 2500, "repairCostMaxINR": 4500, "replacementCostMinINR": 35000, "replacementCostMaxINR": 60000, "expectedRepairTimeDays": 2, "expectedRemainingUsabilityYears": 3 },

  // Smartphone RepairData
  { "PK": "DEVICE#smartphone", "SK": "ISSUE#camera_module_failure", "issueId": "camera_module_failure", "issueLabel": "Rear Camera Module Replacement", "isDemoData": true, "partsAvailability": "GOOD", "repairComplexity": "MEDIUM", "repairCostMinINR": 1500, "repairCostMaxINR": 4000, "replacementCostMinINR": 15000, "replacementCostMaxINR": 30000, "expectedRepairTimeDays": 1, "expectedRemainingUsabilityYears": 2 },
  { "PK": "DEVICE#smartphone", "SK": "ISSUE#button_flex_cable", "issueId": "button_flex_cable", "issueLabel": "Button Flex Cable Replacement", "isDemoData": true, "partsAvailability": "MEDIUM", "repairComplexity": "HIGH", "repairCostMinINR": 1000, "repairCostMaxINR": 2500, "replacementCostMinINR": 15000, "replacementCostMaxINR": 30000, "expectedRepairTimeDays": 2, "expectedRemainingUsabilityYears": 2 },
  { "PK": "DEVICE#smartphone", "SK": "ISSUE#antenna_cable", "issueId": "antenna_cable", "issueLabel": "Antenna Cable Replacement", "isDemoData": true, "partsAvailability": "MEDIUM", "repairComplexity": "MEDIUM", "repairCostMinINR": 800, "repairCostMaxINR": 1500, "replacementCostMinINR": 15000, "replacementCostMaxINR": 30000, "expectedRepairTimeDays": 1, "expectedRemainingUsabilityYears": 2 },

  // Headphones RepairData
  { "PK": "DEVICE#headphones", "SK": "ISSUE#case_battery_dead", "issueId": "case_battery_dead", "issueLabel": "Charging Case Battery Replacement", "isDemoData": true, "partsAvailability": "POOR", "repairComplexity": "HIGH", "repairCostMinINR": 1500, "repairCostMaxINR": 3000, "replacementCostMinINR": 5000, "replacementCostMaxINR": 15000, "expectedRepairTimeDays": 3, "expectedRemainingUsabilityYears": 1 },
  { "PK": "DEVICE#headphones", "SK": "ISSUE#mic_mesh_clogged", "issueId": "mic_mesh_clogged", "issueLabel": "Microphone Mesh Cleaning", "isDemoData": true, "partsAvailability": "GOOD", "repairComplexity": "LOW", "repairCostMinINR": 300, "repairCostMaxINR": 800, "replacementCostMinINR": 5000, "replacementCostMaxINR": 15000, "expectedRepairTimeDays": 1, "expectedRemainingUsabilityYears": 1 }
];

// Append if not exists
newRules.forEach(r => {
  if (!rules.find((existing: any) => existing.ruleId === r.ruleId)) {
    rules.push(r);
  }
});
newRepairData.forEach(r => {
  if (!repairData.find((existing: any) => existing.issueId === r.issueId)) {
    repairData.push(r);
  }
});

fs.writeFileSync(rulesPath, JSON.stringify(rules, null, 2));
fs.writeFileSync(repairDataPath, JSON.stringify(repairData, null, 2));
console.log('Seed data expanded successfully.');
