export const MEDICAL_SPECIALIZATIONS = [
  'Endocrinology',
  'Pulmonology',
  'Obstetrics and Gynaecology',
  'Neurology',
  'Internal Medicine',
  'General Medicine',
  'Cardiology',
  'Dermatology',
  'Pediatrics',
  'Orthopedics',
  'Psychiatry',
  'Gastroenterology',
  'Ophthalmology',
  'ENT (Ear, Nose, Throat)',
] as const;

export const CITIES = [
  'Jammu',
  'Srinagar',
  'Anantnag',
  'Baramulla',
  'Kathua',
  'Udhampur',
  'Pulwama',
  'Ganderbal',
  'Budgam',
  'Kupwara',
  'Rajouri',
  'Poonch',
  'Doda',
  'Ramban',
  'Reasi',
  'Samba',
  'Kishtwar',
  'Bandipora',
  'Kulgam',
  'Shopian',
  'R.S. Pura',
  'Akhnoor',
  'Tangmarg',
] as const;

export const LEGACY_FOREIGN_DEMO_CITIES = [
  'New York, NY',
  'Chicago, IL',
  'Los Angeles, CA',
  'Houston, TX',
  'Phoenix, AZ',
  'Philadelphia, PA',
  'San Antonio, TX',
  'San Diego, CA',
  'Dallas, TX',
] as const;

export const JK_MAP_CONFIG = {
  centerLat: 33.48,
  centerLng: 75.02,
  defaultZoom: 8,
  minLat: 32.15,
  maxLat: 34.85,
  minLng: 73.7,
  maxLng: 76.85,
} as const;

export const POPULAR_SEARCH_CONDITIONS = [
  'Diabetes',
  'Asthma',
  'PCOS',
  'Migraine',
  'Anaemia',
  'Hypertension',
  'Thyroid Disorders',
  'Skin Allergy',
  'Heart Disease',
  'Wheezing',
] as const;

/**
 * Disease/Condition-to-Specialty Semantic Mapping
 * Enables users searching for common diseases or symptoms to discover qualified specialists.
 */
export const DISEASE_SPECIALTY_MAPPINGS: Record<string, string[]> = {
  // Diabetes & Endocrine
  diabetes: ['Endocrinology', 'Internal Medicine', 'General Medicine'],
  'type 2 diabetes': ['Endocrinology', 'Internal Medicine'],
  'type 1 diabetes': ['Endocrinology', 'Pediatrics'],
  thyroid: ['Endocrinology', 'Internal Medicine'],
  'thyroid disorders': ['Endocrinology', 'Internal Medicine'],
  hypothyroidism: ['Endocrinology'],
  hyperthyroidism: ['Endocrinology'],

  // Asthma & Respiratory
  asthma: ['Pulmonology', 'Internal Medicine', 'General Medicine', 'Pediatrics'],
  wheezing: ['Pulmonology', 'Internal Medicine'],
  respiratory: ['Pulmonology', 'Internal Medicine'],
  'respiratory conditions': ['Pulmonology'],
  cough: ['Pulmonology', 'General Medicine', 'Internal Medicine'],
  bronchitis: ['Pulmonology', 'Internal Medicine'],

  // PCOS & Women's Health
  pcos: ['Obstetrics and Gynaecology', 'Endocrinology'],
  'polycystic ovary syndrome': ['Obstetrics and Gynaecology', 'Endocrinology'],
  'menstrual disorders': ['Obstetrics and Gynaecology'],
  'irregular cycles': ['Obstetrics and Gynaecology'],
  menstrual: ['Obstetrics and Gynaecology'],
  gynecology: ['Obstetrics and Gynaecology'],

  // Migraine & Neurology
  migraine: ['Neurology', 'Internal Medicine', 'General Medicine'],
  headache: ['Neurology', 'Internal Medicine', 'General Medicine'],
  'headache disorders': ['Neurology'],
  neurology: ['Neurology'],
  cluster: ['Neurology'],

  // Anaemia & Internal Medicine
  anaemia: ['Internal Medicine', 'General Medicine'],
  anemia: ['Internal Medicine', 'General Medicine'],
  'iron deficiency': ['Internal Medicine', 'General Medicine'],
  'iron-deficiency anaemia': ['Internal Medicine', 'General Medicine'],
  'low haemoglobin': ['Internal Medicine'],
  fatigue: ['Internal Medicine', 'General Medicine'],

  // Cardiology & Cardiovascular
  hypertension: ['Cardiology', 'Internal Medicine', 'General Medicine'],
  'high blood pressure': ['Cardiology', 'Internal Medicine', 'General Medicine'],
  'heart disease': ['Cardiology'],
  heart: ['Cardiology'],
  arrhythmia: ['Cardiology'],
  'chest pain': ['Cardiology', 'Internal Medicine'],

  // Dermatology
  'skin allergy': ['Dermatology', 'General Medicine'],
  allergy: ['Dermatology', 'Pulmonology', 'General Medicine'],
  eczema: ['Dermatology'],
  acne: ['Dermatology'],
  psoriasis: ['Dermatology'],
  rash: ['Dermatology'],

  // General & Orthopedics
  fever: ['Internal Medicine', 'General Medicine', 'Pediatrics'],
  flu: ['Internal Medicine', 'General Medicine', 'Pediatrics'],
  'joint pain': ['Orthopedics'],
  arthritis: ['Orthopedics'],
  'back pain': ['Orthopedics'],
  depression: ['Psychiatry'],
  anxiety: ['Psychiatry'],
};

export const FEATURED_SPECIALTIES = [
  {
    name: 'Endocrinology',
    icon: 'Activity',
    count: 'Diabetes & Thyroid Focus',
    description: 'Type 2 Diabetes, insulin resistance & hormone regulation',
  },
  {
    name: 'Pulmonology',
    icon: 'Stethoscope',
    count: 'Asthma & Lung Specialists',
    description: 'Asthma, wheezing, inhaler therapy & respiratory wellness',
  },
  {
    name: 'Obstetrics and Gynaecology',
    icon: 'Sparkles',
    count: 'PCOS & Reproductive Health',
    description: 'PCOS management, irregular cycles & fertility support',
  },
  {
    name: 'Neurology',
    icon: 'Brain',
    count: 'Headache & Migraine Relief',
    description: 'Migraines, neurological triggers & preventive care',
  },
  {
    name: 'Internal Medicine',
    icon: 'HeartPulse',
    count: 'Anaemia & Primary Diagnostics',
    description: 'Anaemia, low haemoglobin, iron deficiency & wellness',
  },
  {
    name: 'Cardiology',
    icon: 'HeartPulse',
    count: 'Heart & Blood Pressure',
    description: 'Hypertension, ECG reviews & cardiovascular screening',
  },
];

export const JK_DIVISIONS = ['Jammu', 'Kashmir'] as const;

export const JK_DISTRICTS_BY_DIVISION: Record<'Jammu' | 'Kashmir', readonly string[]> = {
  Jammu: [
    'Doda',
    'Jammu',
    'Kathua',
    'Kishtwar',
    'Poonch',
    'Rajouri',
    'Ramban',
    'Reasi',
    'Samba',
    'Udhampur',
  ],
  Kashmir: [
    'Anantnag',
    'Bandipora',
    'Baramulla',
    'Budgam',
    'Ganderbal',
    'Kulgam',
    'Kupwara',
    'Pulwama',
    'Shopian',
    'Srinagar',
  ],
};

export const JK_ALL_DISTRICTS = [
  ...JK_DISTRICTS_BY_DIVISION.Jammu,
  ...JK_DISTRICTS_BY_DIVISION.Kashmir,
].sort();

export function getDivisionForDistrict(district?: string | null): 'Jammu' | 'Kashmir' | null {
  if (!district) return null;
  const trimmed = district.trim().toLowerCase();
  if (JK_DISTRICTS_BY_DIVISION.Jammu.some((d) => d.toLowerCase() === trimmed)) {
    return 'Jammu';
  }
  if (JK_DISTRICTS_BY_DIVISION.Kashmir.some((d) => d.toLowerCase() === trimmed)) {
    return 'Kashmir';
  }
  return null;
}

export const FACILITY_TYPES = [
  { value: 'HOSPITAL', label: 'Hospital (District / Tertiary / Teaching)' },
  { value: 'CHC', label: 'CHC / Sub-District Hospital' },
  { value: 'PHC', label: 'Primary Health Centre (PHC)' },
  { value: 'SUB_CENTRE', label: 'Sub-Centre / Health & Wellness Centre' },
  { value: 'CLINIC', label: 'Clinic / Urban Health Post' },
  { value: 'DIAGNOSTIC_CENTRE', label: 'Diagnostic Centre' },
] as const;

export const FACILITY_OPERATIONAL_STATUSES = [
  { value: 'ACTIVE', label: 'Verified & Unexpired Evidence' },
  { value: 'UNKNOWN', label: 'Unverified or Expired Evidence' },
  { value: 'CLOSED', label: 'Closed' },
] as const;
