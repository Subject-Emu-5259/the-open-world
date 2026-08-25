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
      }
    ]
  }
];

export class SchoolEngine {
  getSchoolsByCity(city: string): School[] {
    return SCHOOLS.filter(s => s.city === city);
  }

  getCourse(schoolId: string, courseId: string): Course | undefined {
    const school = SCHOOLS.find(s => s.id === schoolId);
    return school?.courses.find(c => c.id === courseId);
  }
}
