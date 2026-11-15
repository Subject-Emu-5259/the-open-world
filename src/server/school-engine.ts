// THE OPEN WORLD - Professional Schools & Certifications
// Gain qualifications to unlock high-tier careers

export interface Course {
  id: string;
  name: string;
  description: string;
  durationHours: number; // Hours of study needed to complete
  cost: number;
  requirement?: { skill: string; level: number };
  rewardCertification: string;
  intelligenceGain: number;
}

export interface School {
  id: string;
  name: string;
  city: string;
  district: string;
  courses: Course[];
  description: string;
  // v0.108.20 §43: 'university' | 'community'. Existing schools read as
  // university when the field is absent (old saves / old code paths).
  tier?: 'university' | 'community';
}

export const SCHOOLS: School[] = [
  {
    id: 'maestro_college',
    name: 'Maestro College',
    city: 'memphis',
    district: 'downtown',
    description: 'Premier institution for AI and Software Engineering.',
    courses: [
      {
        id: 'ai_foundation',
        name: 'AI Foundations',
        description: 'Introduction to neural networks and machine learning.',
        durationHours: 40,
        cost: 1500,
        rewardCertification: 'AI_BASICS',
        intelligenceGain: 5
      },
      {
        id: 'fullstack_dev',
        name: 'Full-Stack Development',
        description: 'Master modern web architectures and databases.',
        durationHours: 60,
        cost: 2500,
        requirement: { skill: 'tech', level: 3 },
        rewardCertification: 'FULLSTACK_CERT',
        intelligenceGain: 8
      },
      {
        id: 'ai_software_eng',
        name: 'AAS in AI Software Engineering',
        description: 'Advanced degree for professional AI engineers.',
        durationHours: 120,
        cost: 8000,
        requirement: { skill: 'tech', level: 5 },
        rewardCertification: 'AI_SOFTWARE_ENG_DEGREE',
        intelligenceGain: 15
      },
      {
        id: 'data_eng_basics',
        name: 'Data Engineering Basics',
        description: 'Pipelines, storage, and clean data for AI systems.',
        durationHours: 50,
        cost: 2000,
        rewardCertification: 'DATA_ENG_CERT',
        intelligenceGain: 6
      }
    ]
  },
  {
    id: 'memphis_medical_academy',
    name: 'Memphis Medical Academy',
    city: 'memphis',
    district: 'midtown',
    description: 'The region\'s leading medical training facility.',
    courses: [
      {
        id: 'emt_basic',
        name: 'EMT Certification',
        description: 'Basic life support and emergency response.',
        durationHours: 40,
        cost: 800,
        rewardCertification: 'EMT_LICENSE',
        intelligenceGain: 3
      },
      {
        id: 'nursing_rn',
        name: 'Registered Nursing (RN)',
        description: 'Professional nursing qualification.',
        durationHours: 100,
        cost: 5000,
        requirement: { skill: 'charisma', level: 4 },
        rewardCertification: 'RN_LICENSE',
        intelligenceGain: 10
      },
      {
        id: 'paramedic',
        name: 'Paramedic Certification',
        description: 'Advanced emergency medicine: field triage, IV therapy, and critical transport. Builds on EMT training at the same academy.',
        durationHours: 80,
        cost: 3000,
        rewardCertification: 'PARAMEDIC_LICENSE',
        intelligenceGain: 5
      },
      {
        id: 'np_advanced',
        name: 'Nurse Practitioner Program',
        description: 'Advanced practice nursing: diagnosis, prescribing, and primary care.',
        durationHours: 120,
        cost: 9000,
        requirement: { skill: 'charisma', level: 5 },
        rewardCertification: 'NP_CERT',
        intelligenceGain: 12
      },
      {
        id: 'community_health',
        name: 'Community Health Worker',
        description: 'Front-line community care, outreach, and prevention.',
        durationHours: 40,
        cost: 1200,
        rewardCertification: 'CHW_CERT',
        intelligenceGain: 4
      }
    ]
  },
  {
    id: 'nyu_finance',
    name: 'NYU Stern School of Business',
    city: 'new_york',
    district: 'manhattan',
    description: 'Global leader in business and financial education.',
    courses: [
      {
        id: 'fin_analyst',
        name: 'Financial Analysis Cert',
        description: 'Master corporate finance and market analysis.',
        durationHours: 50,
        cost: 3000,
        rewardCertification: 'FINANCE_CERT',
        intelligenceGain: 8
      },
      {
        id: 'mba',
        name: 'Master of Business Administration',
        description: 'Elite management degree for executives.',
        durationHours: 150,
        cost: 15000,
        requirement: { skill: 'finance', level: 5 },
        rewardCertification: 'MBA_DEGREE',
        intelligenceGain: 20
      },
      {
        id: 'personal_finance',
        name: 'Personal Finance Planning',
        description: 'Budgeting, saving, and planning for real households.',
        durationHours: 45,
        cost: 2500,
        rewardCertification: 'FIN_PLAN_CERT',
        intelligenceGain: 6
      }
    ]
  },
  {
    id: 'lse_london',
    name: 'London School of Economics',
    city: 'london',
    district: 'westminster',
    description: 'World-renowned social science university.',
    courses: [
      {
        id: 'global_policy',
        name: 'Global Policy & Governance',
        description: 'Advanced study of international relations and policy.',
        durationHours: 80,
        cost: 6000,
        requirement: { skill: 'charisma', level: 5 },
        rewardCertification: 'GLOBAL_POLICY_CERT',
        intelligenceGain: 12
      },
      {
        id: 'policy_writing',
        name: 'Public Policy Writing',
        description: 'Clear briefs and memos for government work.',
        durationHours: 60,
        cost: 4000,
        requirement: { skill: 'charisma', level: 4 },
        rewardCertification: 'POLICY_WRITE_CERT',
        intelligenceGain: 8
      }
    ]
  },
  {
    id: 'tokyo_tech',
    name: 'Tokyo Institute of Technology',
    city: 'tokyo',
    district: 'akihabara',
    description: 'Leading research university for science and technology.',
    courses: [
      {
        id: 'robotics_auto',
        name: 'Robotics & Automation',
        description: 'Master the future of mechanical intelligence.',
        durationHours: 100,
        cost: 7000,
        requirement: { skill: 'tech', level: 6 },
        rewardCertification: 'ROBOTICS_LICENSE',
        intelligenceGain: 15
      },
      {
        id: 'embedded_systems',
        name: 'Embedded Systems',
        description: 'Small computers inside machines: sensors, control, firmware.',
        durationHours: 80,
        cost: 6000,
        requirement: { skill: 'tech', level: 4 },
        rewardCertification: 'EMBEDDED_CERT',
        intelligenceGain: 10
      }
    ]
  },
  {
    id: 'cordon_bleu',
    name: 'Le Cordon Bleu',
    city: 'paris',
    district: 'latin_quarter',
    description: 'The world-famous institute for culinary arts.',
    courses: [
      {
        id: 'french_cuisine',
        name: 'Master of French Cuisine',
        description: 'Elite culinary training in classical techniques.',
        durationHours: 90,
        cost: 5500,
        requirement: { skill: 'cooking', level: 5 },
        rewardCertification: 'MASTER_CHEF_CERT',
        intelligenceGain: 5
      },
      {
        id: 'pastry_fundamentals',
        name: 'Pastry Fundamentals',
        description: 'Doughs, creams, and classic pastry technique.',
        durationHours: 60,
        cost: 3500,
        requirement: { skill: 'cooking', level: 3 },
        rewardCertification: 'PASTRY_CERT',
        intelligenceGain: 4
      }
    ]
  },
  {
    id: 'uni_sydney',
    name: 'University of Sydney',
    city: 'sydney',
    district: 'surry_hills',
    description: 'Global top-tier research university in Australia.',
    courses: [
      {
        id: 'marine_bio',
        name: 'Marine Biology & Ecology',
        description: 'Advanced study of marine ecosystems and conservation.',
        durationHours: 70,
        cost: 4500,
        requirement: { skill: 'tech', level: 4 },
        rewardCertification: 'MARINE_BIO_LICENSE',
        intelligenceGain: 10
      },
      {
        id: 'env_science',
        name: 'Environmental Science',
        description: 'Ecosystems, climate, and field research methods.',
        durationHours: 60,
        cost: 4000,
        requirement: { skill: 'tech', level: 3 },
        rewardCertification: 'ENV_SCI_CERT',
        intelligenceGain: 8
      }
    ]
  },
  {
    id: 'toronto_city_university',
    name: 'Toronto City University',
    city: 'toronto',
    district: 'distillery_district',
    tier: 'university',
    description: 'City university in Toronto — applied data and international business.',
    courses: [
      {
        id: 'applied_data',
        name: 'Applied Data Analysis',
        description: 'Working with real datasets: cleaning, analysis, reporting.',
        durationHours: 60,
        cost: 3500,
        requirement: { skill: 'tech', level: 2 },
        rewardCertification: 'DATA_ENG_CERT',
        intelligenceGain: 6
      },
      {
        id: 'intl_business',
        name: 'International Business',
        description: 'Trade, finance, and managing across borders.',
        durationHours: 70,
        cost: 4000,
        rewardCertification: 'FINANCE_CERT',
        intelligenceGain: 6
      }
    ]
  },
  {
    id: 'dubai_city_university',
    name: 'Dubai City University',
    city: 'dubai',
    district: 'dubai_marina',
    tier: 'university',
    description: 'City university in Dubai — hospitality leadership and global finance.',
    courses: [
      {
        id: 'luxury_hospitality',
        name: 'Luxury Hospitality Management',
        description: 'Running high-end hotels, events, and guest service.',
        durationHours: 80,
        cost: 5500,
        rewardCertification: 'HOSP_MGMT_CERT',
        intelligenceGain: 6
      },
      {
        id: 'global_finance',
        name: 'Global Finance',
        description: 'International markets, currency, and investment basics.',
        durationHours: 60,
        cost: 4000,
        rewardCertification: 'FINANCE_CERT',
        intelligenceGain: 6
      }
    ]
  },
  {
    id: 'west_memphis_cc',
    name: 'West Memphis Community College',
    city: 'west_memphis',
    district: 'broadway',
    tier: 'community',
    description: 'Community college on Broadway — practical programs, lower cost.',
    courses: [
      {
        id: 'auto_tech_basics',
        name: 'Automotive Technology Basics',
        description: 'Vehicle systems, diagnostics, and shop practice.',
        durationHours: 70,
        cost: 1200,
        rewardCertification: 'ASSOC_AUTO_TECH',
        intelligenceGain: 4
      },
      {
        id: 'business_foundations',
        name: 'Business Foundations',
        description: 'Retail operations, bookkeeping, and customer service.',
        durationHours: 60,
        cost: 900,
        rewardCertification: 'ASSOC_BUSINESS',
        intelligenceGain: 4
      }
    ]
  },
  {
    id: 'southaven_cc',
    name: 'Southaven Community College',
    city: 'southaven',
    district: 'goodman_road',
    tier: 'community',
    description: 'Community college on Goodman Road — health support and hospitality.',
    courses: [
      {
        id: 'health_support',
        name: 'Health Support Foundations',
        description: 'Patient care basics, first response, and clinic support.',
        durationHours: 70,
        cost: 1500,
        rewardCertification: 'ASSOC_HEALTH',
        intelligenceGain: 4
      },
      {
        id: 'hospitality_foundations',
        name: 'Hospitality Foundations',
        description: 'Food service, hosting, and hotel operations.',
        durationHours: 60,
        cost: 800,
        rewardCertification: 'ASSOC_HOSPITALITY',
        intelligenceGain: 4
      }
    ]
  },
  {
    id: 'little_rock_cc',
    name: 'Little Rock Community College',
    city: 'littlerock',
    district: 'river_market',
    tier: 'community',
    description: 'Community college in the River Market — tech and general studies.',
    courses: [
      {
        id: 'it_foundations',
        name: 'Information Technology Foundations',
        description: 'Hardware, networks, and support-desk practice.',
        durationHours: 80,
        cost: 1800,
        requirement: { skill: 'tech', level: 1 },
        rewardCertification: 'ASSOC_TECH',
        intelligenceGain: 5
      },
      {
        id: 'general_studies',
        name: 'General Studies',
        description: 'Writing, reasoning, and broad academic foundations.',
        durationHours: 60,
        cost: 600,
        rewardCertification: 'ASSOC_GENERAL',
        intelligenceGain: 4
      }
    ]
  }
];

export class SchoolEngine {
  getAllSchools(): School[] {
    return SCHOOLS;
  }

  getSchoolsByCity(city: string): School[] {
    return SCHOOLS.filter(s => s.city === city);
  }

  getCourse(schoolId: string, courseId: string): Course | undefined {
    const school = SCHOOLS.find(s => s.id === schoolId);
    return school?.courses.find(c => c.id === courseId);
  }
}
