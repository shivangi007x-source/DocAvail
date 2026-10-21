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
