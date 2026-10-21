export const MEDICAL_SPECIALIZATIONS = [
  'General Medicine',
  'Cardiology',
  'Dermatology',
  'Pediatrics',
  'Orthopedics',
  'Neurology',
  'Gynecology & Obstetrics',
  'Psychiatry',
  'Ophthalmology',
  'ENT (Ear, Nose, Throat)',
  'Endocrinology',
  'Gastroenterology',
] as const;

export const CITIES = [
  'New York, NY',
  'Los Angeles, CA',
  'Chicago, IL',
  'Houston, TX',
  'Phoenix, AZ',
  'Philadelphia, PA',
  'San Antonio, TX',
  'San Diego, CA',
  'Dallas, TX',
] as const;

export const POPULAR_SEARCH_CONDITIONS = [
  'Diabetes',
  'Hypertension',
  'Skin Allergy',
  'Migraine',
  'Asthma',
  'Heart Disease',
  'Acne',
  'Fever & Flu',
  'Eczema',
  'High Cholesterol',
] as const;

/**
 * Disease/Condition-to-Specialty Semantic Mapping
 * Enables users searching for common diseases or symptoms to discover qualified specialists.
 */
export const DISEASE_SPECIALTY_MAPPINGS: Record<string, string[]> = {
  diabetes: ['Endocrinology', 'General Medicine'],
  'type 2 diabetes': ['Endocrinology', 'General Medicine'],
  'type 1 diabetes': ['Endocrinology', 'Pediatrics', 'General Medicine'],
  hypertension: ['Cardiology', 'General Medicine'],
  'high blood pressure': ['Cardiology', 'General Medicine'],
  'heart disease': ['Cardiology'],
  heart: ['Cardiology'],
  arrhythmia: ['Cardiology'],
  'chest pain': ['Cardiology', 'General Medicine'],
  'high cholesterol': ['Cardiology', 'General Medicine', 'Endocrinology'],
  'skin allergy': ['Dermatology', 'General Medicine'],
  allergy: ['Dermatology', 'General Medicine', 'Pediatrics'],
  eczema: ['Dermatology'],
  acne: ['Dermatology'],
  psoriasis: ['Dermatology'],
  rash: ['Dermatology', 'General Medicine'],
  dermatitis: ['Dermatology'],
  rosacea: ['Dermatology'],
  migraine: ['Neurology', 'General Medicine'],
  headache: ['Neurology', 'General Medicine'],
  asthma: ['General Medicine', 'Pediatrics'],
  cough: ['General Medicine', 'Pediatrics'],
  fever: ['General Medicine', 'Pediatrics'],
  flu: ['General Medicine', 'Pediatrics'],
  fatigue: ['General Medicine'],
  'joint pain': ['Orthopedics'],
  arthritis: ['Orthopedics'],
  'back pain': ['Orthopedics'],
  depression: ['Psychiatry'],
  anxiety: ['Psychiatry'],
};

export const FEATURED_SPECIALTIES = [
  {
    name: 'General Physician',
    icon: 'Stethoscope',
    count: '142 Doctors Available',
    description: 'Cold, flu, routine checkups & primary care',
  },
  {
    name: 'Cardiology',
    icon: 'HeartPulse',
    count: '48 Doctors Available',
    description: 'Heart health, blood pressure & ECG consultation',
  },
  {
    name: 'Dermatology',
    icon: 'Sparkles',
    count: '64 Doctors Available',
    description: 'Skin disorders, acne, allergies & cosmetic health',
  },
  {
    name: 'Pediatrics',
    icon: 'Baby',
    count: '89 Doctors Available',
    description: 'Child growth, vaccinations & pediatric emergency',
  },
  {
    name: 'Orthopedics',
    icon: 'Activity',
    count: '53 Doctors Available',
    description: 'Joint pain, fractures & sports medicine',
  },
  {
    name: 'Neurology',
    icon: 'Brain',
    count: '31 Doctors Available',
    description: 'Migraines, nerve care & brain health',
  },
];
