// THE OPEN WORLD - NPC & Social Engine
// NPCs operate on independent schedules, factions react dynamically

export class SocialEngine {
  private npcs: Map<string, NPCState> = new Map();
  private factions: Map<string, Faction> = new Map();
  
  constructor() {
    this.initializeNPCs();
    this.initializeFactions();
  }
  
  private initializeNPCs(): void {
    // West Memphis / Memphis, TN Area NPCs (40+ NPCs across all cities)
    const residents = [
      // Downtown Memphis
      { id: 'npc_001', name: 'Marcus Williams', role: 'store_owner', district: 'downtown', city: 'memphis', age: 45, gender: 'male', personality: ['wise', 'generous'], description: 'Owns Williams General Store on Main St. Been in business 20 years.', firstName: 'Marcus', lastName: 'Williams' },
      { id: 'npc_007', name: 'Ms. Cookie', role: 'restaurant_owner', district: 'downtown', city: 'memphis', age: 58, gender: 'female', personality: ['warm', 'strict'], description: 'Runs Ms. Cookie\'s Diner. Famous for her catfish plates.', firstName: 'Cookie', lastName: 'Thompson' },
      { id: 'npc_009', name: 'Benny "The Blade" Cooper', role: 'barber', district: 'downtown', city: 'memphis', age: 52, gender: 'male', personality: ['observant', 'chatty'], description: 'Barber shop legend. Knows everyone\'s business.', firstName: 'Benny', lastName: 'Cooper' },
      { id: 'npc_010', name: 'Lena Stax', role: 'jazz_singer', district: 'downtown', city: 'memphis', age: 31, gender: 'female', personality: ['ambitious', 'free_spirited'], description: 'Sings at the Blue Duck Lounge on Beale St.', firstName: 'Lena', lastName: 'Stax' },
      { id: 'npc_011', name: 'Officer Tanya Raines', role: 'police_officer', district: 'downtown', city: 'memphis', age: 38, gender: 'female', personality: ['fair', 'intimidating'], description: 'Downtown beat cop. Respected but firm.', firstName: 'Tanya', lastName: 'Raines' },
      // Midtown Memphis
      { id: 'npc_004', name: 'Keisha Brown', role: 'nurse', district: 'midtown', city: 'memphis', age: 34, gender: 'female', personality: ['caring', 'exhausted'], description: 'Works ER at Regional Medical Center.', firstName: 'Keisha', lastName: 'Brown' },
      { id: 'npc_008', name: 'DJ Metro', role: 'promoter', district: 'midtown', city: 'memphis', age: 28, gender: 'male', personality: ['charismatic', 'ambitious'], description: 'Runs underground shows. Connected in the music scene.', firstName: 'Metro', lastName: 'Robinson' },
      { id: 'npc_012', name: 'Professor Andre Pierce', role: 'professor', district: 'midtown', city: 'memphis', age: 47, gender: 'male', personality: ['intellectual', 'distracted'], description: 'Teaches sociology at Rhodes College.', firstName: 'Andre', lastName: 'Pierce' },
      { id: 'npc_013', name: 'Rosa Sandoval', role: 'food_truck_owner', district: 'midtown', city: 'memphis', age: 42, gender: 'female', personality: ['hardworking', 'family_first'], description: 'Runs Tacos Rosa in Cooper-Young.', firstName: 'Rosa', lastName: 'Sandoval' },
      { id: 'npc_014', name: 'Tyrone "Ty" Webb', role: 'basketball_coach', district: 'midtown', city: 'memphis', age: 55, gender: 'male', personality: ['mentor', 'tough_love'], description: 'AAU coach at the recreation center. Changed many kids\' lives.', firstName: 'Tyrone', lastName: 'Webb' },
      // South Memphis
      { id: 'npc_003', name: 'Devonte Harris', role: 'mechanic', district: 'south_memphis', city: 'memphis', age: 29, gender: 'male', personality: ['skilled', 'quiet'], description: 'Can fix anything with an engine. Runs Harris Auto.', firstName: 'Devonte', lastName: 'Harris' },
      { id: 'npc_006', name: 'Uncle Ray', role: 'elder', district: 'south_memphis', city: 'memphis', age: 72, gender: 'male', personality: ['wise', 'spiritual'], description: 'Community elder. Shares stories and wisdom on the corner.', firstName: 'Rayford', lastName: 'Jackson' },
      { id: 'npc_015', name: 'Preacher Moses', role: 'pastor', district: 'south_memphis', city: 'memphis', age: 65, gender: 'male', personality: ['compassionate', 'fire_and_brimstone'], description: 'Pastor at Greater Bethel MB Church.', firstName: 'Moses', lastName: 'Williams' },
      { id: 'npc_016', name: 'Darla "Dee" Jackson', role: 'beautician', district: 'south_memphis', city: 'memphis', age: 48, gender: 'female', personality: ['sassy', 'supportive'], description: 'Runs Dee\'s Beauty Salon. The neighborhood therapist.', firstName: 'Darla', lastName: 'Jackson' },
      { id: 'npc_017', name: 'Little Mike', role: 'corner_vendor', district: 'south_memphis', city: 'memphis', age: 19, gender: 'male', personality: ['hungry', 'quick'], description: 'Sells snacks and drinks on the corner. Ambitious kid.', firstName: 'Mike', lastName: 'Taylor' },
      // East Memphis
      { id: 'npc_002', name: 'Tasha Johnson', role: 'teacher', district: 'east_memphis', city: 'memphis', age: 36, gender: 'female', personality: ['dedicated', 'patient'], description: 'Teaches 4th grade at East Memphis Elementary.', firstName: 'Tasha', lastName: 'Johnson' },
      { id: 'npc_018', name: 'Dr. Samuel Chen', role: 'doctor', district: 'east_memphis', city: 'memphis', age: 52, gender: 'male', personality: ['professional', 'kind'], description: 'Physician at East Memphis Medical Center.', firstName: 'Samuel', lastName: 'Chen' },
      { id: 'npc_019', name: 'Brittany Wells', role: 'realtor', district: 'east_memphis', city: 'memphis', age: 33, gender: 'female', personality: ['ambitious', 'friendly'], description: 'Top realtor in East Memphis. Always closing.', firstName: 'Brittany', lastName: 'Wells' },
      { id: 'npc_020', name: 'Coach Thompson', role: 'high_school_coach', district: 'east_memphis', city: 'memphis', age: 48, gender: 'male', personality: ['disciplined', 'inspiring'], description: 'Football coach at East High. Former NFL player.', firstName: 'Gerald', lastName: 'Thompson' },
      // Orange Mound
      { id: 'npc_005', name: 'Jamal Davis', role: 'contractor', district: 'orange_mound', city: 'memphis', age: 41, gender: 'male', personality: ['hardworking', 'proud'], description: 'Runs Davis Construction. Built half of Orange Mound.', firstName: 'Jamal', lastName: 'Davis' },
      { id: 'npc_021', name: 'Sister Mary Elizabeth', role: 'nun', district: 'orange_mound', city: 'memphis', age: 67, gender: 'female', personality: ['compassionate', 'wise'], description: 'Sisters of Mercy community outreach.', firstName: 'Mary', lastName: 'Elizabeth' },
      { id: 'npc_022', name: 'Chef Tremaine', role: 'chef', district: 'orange_mound', city: 'memphis', age: 38, gender: 'male', personality: ['passionate', 'perfectionist'], description: 'Culinary instructor at the community center.', firstName: 'Tremaine', lastName: 'Williams' },
      { id: 'npc_023', name: 'Nia Cole', role: 'community_organizer', district: 'orange_mound', city: 'memphis', age: 29, gender: 'female', personality: ['passionate', 'driven'], description: 'Runs the Orange Mound Youth Initiative.', firstName: 'Nia', lastName: 'Cole' },
      // Little Rock NPCs
      { id: 'npc_024', name: 'Mayor Frank Delgado', role: 'politician', district: 'river_market', city: 'littlerock', age: 58, gender: 'male', personality: ['charismatic', 'calculating'], description: 'Little Rock Mayor. At the River Market Saturday mornings.', firstName: 'Frank', lastName: 'Delgado' },
      { id: 'npc_025', name: 'Hana Kim', role: 'art_gallery_owner', district: 'river_market', city: 'littlerock', age: 44, gender: 'female', personality: ['creative', 'intellectual'], description: 'Owns Kim Contemporary Art.', firstName: 'Hana', lastName: 'Kim' },
      { id: 'npc_026', name: 'Jedidiah "Jed" Morris', role: 'farmer', district: 'river_market', city: 'littlerock', age: 61, gender: 'male', personality: ['hardworking', 'old_school'], description: 'Runs Morris Family Farm. Sells at the farmer\'s market.', firstName: 'Jedidiah', lastName: 'Morris' },
      { id: 'npc_027', name: 'Attorney Deja Williams', role: 'lawyer', district: 'hillcrest', city: 'littlerock', age: 39, gender: 'female', personality: ['sharp', 'ambitious'], description: 'Partner at Williams & Associates. Young professional scene.', firstName: 'Deja', lastName: 'Williams' },
      { id: 'npc_028', name: 'Professor Liz Bowen', role: 'professor', district: 'hillcrest', city: 'littlerock', age: 51, gender: 'female', personality: ['academic', 'curious'], description: 'UAMS researcher. Always at the coffee shop grading.', firstName: 'Liz', lastName: 'Bowen' },
      { id: 'npc_029', name: 'Marcus "Mack" McKinney', role: 'tech_ceo', district: 'west_lr', city: 'littlerock', age: 35, gender: 'male', personality: ['visionary', 'driven'], description: 'Founder of TechArkansas. Building the local tech scene.', firstName: 'Marcus', lastName: 'McKinney' },
      { id: 'npc_030', name: 'Diana Reyes', role: 'restaurant_owner', district: 'west_lr', city: 'littlerock', age: 46, gender: 'female', personality: ['warm', 'perfectionist'], description: 'Owns Reyes Southwestern Grill. Highly acclaimed.', firstName: 'Diana', lastName: 'Reyes' },
      { id: 'npc_031', name: 'Bobby Joe Stevens', role: 'union_leader', district: 'southwest_lr', city: 'littlerock', age: 54, gender: 'male', personality: ['fierce', 'protective'], description: 'Union rep for the steel workers. Fights for his people.', firstName: 'Bobby', lastName: 'Stevens' },
      { id: 'npc_032', name: 'Chen Wei', role: 'restaurant_owner', district: 'southwest_lr', city: 'littlerock', age: 50, gender: 'male', personality: ['quiet', 'skilled'], description: 'Runs Golden Dragon. Best dim sum in Arkansas.', firstName: 'Chen', lastName: 'Wei' },
      { id: 'npc_033', name: 'Destiny Jackson', role: 'college_student', district: 'hillcrest', city: 'littlerock', age: 21, gender: 'female', personality: ['ambitious', 'curious'], description: 'UAMS med student. Volunteers at community clinic.', firstName: 'Destiny', lastName: 'Jackson' },
      { id: 'npc_034', name: 'Reverend Thomas Wade', role: 'pastor', district: 'southwest_lr', city: 'littlerock', age: 68, gender: 'male', personality: ['wise', 'compassionate'], description: 'New Beginning Baptist Church. Community pillar.', firstName: 'Thomas', lastName: 'Wade' },
      // Southaven, MS NPCs
      { id: 'npc_035', name: 'Tommy "Slow" Donaldson', role: 'golf_pro', district: 'snowden', city: 'southaven', age: 62, gender: 'male', personality: ['patient', 'relaxed'], description: 'Pro at Shadow Creek Golf Course. Former PGA tour.', firstName: 'Tommy', lastName: 'Donaldson' },
      { id: 'npc_036', name: 'Amanda Pruitt', role: 'real_estate_agent', district: 'goodman_road', city: 'southaven', age: 36, gender: 'female', personality: ['friendly', 'ambitious'], description: 'Top seller on the Goodman Road corridor.', firstName: 'Amanda', lastName: 'Pruitt' },
      { id: 'npc_037', name: 'Coach Randy Hatfield', role: 'baseball_coach', district: 'snowden', city: 'southaven', age: 50, gender: 'male', personality: ['mentor', 'competitive'], description: 'Southaven High baseball coach. State championship winner.', firstName: 'Randy', lastName: 'Hatfield' },
      { id: 'npc_038', name: 'Sister Margaret', role: 'nun', district: 'church_road', city: 'southaven', age: 71, gender: 'female', personality: ['gentle', 'wise'], description: 'St. Theresa\'s Catholic Church. Runs the food pantry.', firstName: 'Margaret', lastName: 'OBrien' },
      { id: 'npc_039', name: 'Dr. Kenji Nakamura', role: 'doctor', district: 'goodman_road', city: 'southaven', age: 45, gender: 'male', personality: ['caring', 'thorough'], description: 'Pediatrician at Southaven Children\'s Clinic.', firstName: 'Kenji', lastName: 'Nakamura' },
      { id: 'npc_040', name: 'Bella Rodriguez', role: 'dance_instructor', district: 'church_road', city: 'southaven', age: 27, gender: 'female', personality: ['energetic', 'encouraging'], description: 'Runs Bella\'s Dance Academy. Kids love her.', firstName: 'Bella', lastName: 'Rodriguez' },
      { id: 'npc_041', name: 'Gary "Pops" Mitchell', role: 'retiree', district: 'snowden', city: 'southaven', age: 70, gender: 'male', personality: ['wise', 'storyteller'], description: 'Retired teacher. Tells stories at the park bench.', firstName: 'Gary', lastName: 'Mitchell' },
      { id: 'npc_042', name: 'Trucker Pete', role: 'trucker', district: 'goodman_road', city: 'southaven', age: 55, gender: 'male', personality: ['road_worn', 'storyteller'], description: 'Long-haul trucker. Always at the truck stop.', firstName: 'Pete', lastName: 'Harrison' },
      // Nashville NPCs
      { id: 'npc_043', name: 'Johnny Ray', role: 'musician', district: 'downtown', city: 'nashville', age: 34, gender: 'male', personality: ['talented', 'dreamer'], description: 'Country singer trying to make it big. Plays Broadway bars.', firstName: 'Johnny', lastName: 'Ray' },
      { id: 'npc_044', name: 'Patsy Monroe', role: 'record_producer', district: 'music_row', city: 'nashville', age: 52, gender: 'female', personality: ['connected', 'savvy'], description: 'VP at Big River Records. Can make or break careers.', firstName: 'Patsy', lastName: 'Monroe' },
      { id: 'npc_045', name: 'Doc Holliday', role: 'studio_owner', district: 'music_row', city: 'nashville', age: 61, gender: 'male', personality: ['perfectionist', 'legendary'], description: 'Owns Holliday Sound. Recorded hundreds of hits.', firstName: 'Doc', lastName: 'Holliday' },
      { id: 'npc_046', name: 'Sweet Lou', role: 'club_owner', district: 'germantown', city: 'nashville', age: 48, gender: 'male', personality: ['smooth', 'generous'], description: 'Runs The Blue Note. Old school jazz cat.', firstName: 'Lou', lastName: 'Washington' },
      // Atlanta NPCs
      { id: 'npc_047', name: 'King Carter', role: 'rapper', district: 'buckhead', city: 'atlanta', age: 28, gender: 'male', personality: ['ambitious', 'flashy'], description: 'Rising hip-hop star. Just signed major deal.', firstName: 'Carter', lastName: 'James' },
      { id: 'npc_048', name: 'Auntie Pearl', role: 'soul_food_owner', district: 'sweet_asia', city: 'atlanta', age: 65, gender: 'female', personality: ['maternal', 'wise'], description: 'Runs Pearl\'s Kitchen. Everyone\'s favorite auntie.', firstName: 'Pearl', lastName: 'Jefferson' },
      { id: 'npc_049', name: 'DJ Hurricane', role: 'dj', district: 'midtown_atl', city: 'atlanta', age: 32, gender: 'male', personality: ['energetic', 'connected'], description: 'Hottest DJ in the A. Clubs fight for him.', firstName: 'Marcus', lastName: 'Thompson' },
      { id: 'npc_050', name: 'Coach Brenda', role: 'basketball_coach', district: 'college_park', city: 'atlanta', age: 44, gender: 'female', personality: ['tough', 'caring'], description: 'AAU legend. Sends kids to D1 schools.', firstName: 'Brenda', lastName: 'Hayes' },
      // New Orleans NPCs
      { id: 'npc_051', name: 'Big Daddy Gumbo', role: 'chef', district: 'french_quarter', city: 'new_orleans', age: 58, gender: 'male', personality: ['larger_than_life', 'culinary_genius'], description: 'Runs the famous Gumbo Palace. James Beard winner.', firstName: 'Gerald', lastName: 'Thibodeaux' },
      { id: 'npc_052', name: 'Voodoo Mama', role: 'spiritual_guide', district: 'treme', city: 'new_orleans', age: 72, gender: 'female', personality: ['mysterious', 'wise'], description: 'Practitioner of rootwork. People seek her guidance.', firstName: 'Marie', lastName: 'LeBeau' },
      { id: 'npc_053', name: 'Professor Longhair Jr', role: 'pianist', district: 'french_quarter', city: 'new_orleans', age: 45, gender: 'male', personality: ['soulful', 'traditional'], description: 'Carries on the NOLA piano tradition. Plays at Preservation Hall.', firstName: 'Henry', lastName: 'Byrd' },
      { id: 'npc_054', name: 'Nana Bee', role: 'mardi_gras_indian', district: 'treme', city: 'new_orleans', age: 67, gender: 'female', personality: ['proud', 'cultural_guardian'], description: 'Big Chief\'s mother. Keeper of traditions.', firstName: 'Beatrice', lastName: 'Williams' },
      // New York NPCs
      { id: 'npc_055', name: 'Tony The Tie', role: 'businessman', district: 'manhattan', city: 'new_york', age: 55, gender: 'male', personality: ['shrewd', 'old_school'], description: 'Wall Street veteran. Knows where bodies are buried.', firstName: 'Anthony', lastName: 'Moretti' },
      { id: 'npc_056', name: 'Jade Kim', role: 'fashion_designer', district: 'soho', city: 'new_york', age: 38, gender: 'female', personality: ['creative', 'cutthroat'], description: 'Rising fashion star. NY Fashion Week regular.', firstName: 'Jade', lastName: 'Kim' },
      { id: 'npc_057', name: 'Brooklyn B', role: 'hip_hop_producer', district: 'brooklyn', city: 'new_york', age: 31, gender: 'male', personality: ['innovative', 'street_smart'], description: 'Beat maker for the biggest names. Works in a loft studio.', firstName: 'Brandon', lastName: 'Jackson' },
      { id: 'npc_058', name: 'Dr. Maya Patel', role: 'surgeon', district: 'harlem', city: 'new_york', age: 46, gender: 'female', personality: ['brilliant', 'dedicated'], description: 'Chief of Surgery at Harlem Hospital. Saves lives daily.', firstName: 'Maya', lastName: 'Patel' },
      { id: 'npc_059', name: 'Big Sal', role: 'restaurant_owner', district: 'little_italy', city: 'new_york', age: 62, gender: 'male', personality: ['warm', 'protective'], description: 'Runs Sal\'s since 1952. Best cannoli in the city.', firstName: 'Salvatore', lastName: 'Romano' },
      { id: 'npc_060', name: 'Vinny Vibe', role: 'agent', district: 'hollywood', city: 'los_angeles', age: 42, gender: 'male', personality: ['slick', 'powerful'], description: 'Talent agent at CAA. Can greenlight projects.', firstName: 'Vincent', lastName: 'Carlson' },
      { id: 'npc_061', name: 'Sunshine Starr', role: 'actress', district: 'beverly_hills', city: 'los_angeles', age: 29, gender: 'female', personality: ['famous', 'grounded'], description: 'A-list actress. Surprisingly down to earth.', firstName: 'Sarah', lastName: 'Starr' },
      { id: 'npc_062', name: 'Dr. Feelgood', role: 'therapist', district: 'santa_monica', city: 'los_angeles', age: 50, gender: 'male', personality: ['empathetic', 'zen'], description: 'Therapist to the stars. Sunset Strip practice.', firstName: 'Michael', lastName: 'Stone' },
      { id: 'npc_063', name: 'Mama Rosa', role: 'food_truck_owner', district: 'echo_park', city: 'los_angeles', age: 58, gender: 'female', personality: ['hardworking', 'beloved'], description: 'Best tacos in LA. Lines around the block.', firstName: 'Rosa', lastName: 'Garcia' },
      { id: 'npc_064', name: 'Gino The Giant', role: 'restaurant_owner', district: 'chicago_loop', city: 'chicago', age: 52, gender: 'male', personality: ['gregarious', 'old_world'], description: 'Runs Gino\'s Deep Dish. Chicago institution.', firstName: 'Gino', lastName: 'Rossi' },
      { id: 'npc_065', name: 'Queen Latifah Jr', role: 'singer', district: 'south_side', city: 'chicago', age: 26, gender: 'female', personality: ['soulful', 'ambitious'], description: 'Rising R&B star from the South Side.', firstName: 'Tanya', lastName: 'Williams' },
      { id: 'npc_066', name: 'Old Man Winter', role: 'elder', district: 'hyde_park', city: 'chicago', age: 78, gender: 'male', personality: ['wise', 'storyteller'], description: 'Former civil rights activist. Knew Dr. King.', firstName: 'Robert', lastName: 'Winter' },
      { id: 'npc_067', name: 'Coach Iron Mike', role: 'boxing_coach', district: 'south_side', city: 'chicago', age: 65, gender: 'male', personality: ['tough', 'disciplined'], description: 'Trained champions. Gym is his life.', firstName: 'Mike', lastName: 'Thompson' },
      { id: 'npc_068', name: 'Carlos Cruz', role: 'club_owner', district: 'south_beach', city: 'miami', age: 45, gender: 'male', personality: ['smooth', 'connected'], description: 'Owns three of the hottest clubs on Ocean Drive.', firstName: 'Carlos', lastName: 'Cruz' },
      { id: 'npc_069', name: 'Abuela Lucia', role: 'restaurant_owner', district: 'little_havana', city: 'miami', age: 74, gender: 'female', personality: ['warm', 'traditional'], description: 'Best Cuban sandwiches. Family recipe since 1960.', firstName: 'Lucia', lastName: 'Rodriguez' },
      { id: 'npc_070', name: 'DJ Heatwave', role: 'dj', district: 'south_beach', city: 'miami', age: 29, gender: 'male', personality: ['electrifying', 'night_owl'], description: 'King of Miami nightlife. Never sleeps.', firstName: 'Diego', lastName: 'Martinez' },
      { id: 'npc_071', name: 'Big Tex', role: 'oil_exec', district: 'downtown_houston', city: 'houston', age: 58, gender: 'male', personality: ['powerful', 'old_boy_network'], description: 'Oil company CEO. Everything\'s bigger in Texas.', firstName: 'Richard', lastName: 'Johnson' },
      { id: 'npc_072', name: 'Mama Tran', role: 'restaurant_owner', district: 'chinatown_houston', city: 'houston', age: 62, gender: 'female', personality: ['hardworking', 'generous'], description: 'Pho queen of Houston. Lines out the door.', firstName: 'Linh', lastName: 'Tran' },
      { id: 'npc_073', name: 'Dr. Freeman', role: 'surgeon', district: 'medical_center', city: 'houston', age: 52, gender: 'male', personality: ['brilliant', 'humble'], description: 'Heart surgeon at Texas Medical Center.', firstName: 'David', lastName: 'Freeman' },
      { id: 'npc_074', name: 'J.R. Sterling', role: 'businessman', district: 'downtown_dallas', city: 'dallas', age: 60, gender: 'male', personality: ['ruthless', 'old_money'], description: 'Real estate tycoon. Owns half of downtown.', firstName: 'James', lastName: 'Sterling' },
      { id: 'npc_075', name: 'Cowboy Cliff', role: 'rancher', district: 'north_dallas', city: 'dallas', age: 55, gender: 'male', personality: ['authentic', 'proud'], description: 'Third generation cattle rancher. True Texan.', firstName: 'Clifford', lastName: 'Barnes' },
      // Additional Expansion NPCs
      { id: 'npc_076', name: 'Sasha Luxe', role: 'gallery_curator', district: 'soho', city: 'new_york', age: 34, gender: 'female', personality: ['sophisticated', 'critical'], description: 'Curates the most avant-garde art in the city.', firstName: 'Sasha', lastName: 'Luxe' },
      { id: 'npc_077', name: 'Big Mike', role: 'bouncer', district: 'manhattan', city: 'new_york', age: 41, gender: 'male', personality: ['intimidating', 'loyal'], description: 'Head of security for The Platinum Club.', firstName: 'Michael', lastName: 'Stone' },
      { id: 'npc_078', name: 'Chloe Chen', role: 'tech_founder', district: 'silicon_alley', city: 'new_york', age: 27, gender: 'female', personality: ['driven', 'visionary'], description: 'Founded a fintech startup that went viral.', firstName: 'Chloe', lastName: 'Chen' },
      { id: 'npc_079', name: 'Leo Rivers', role: 'jazz_pianist', district: 'harlem', city: 'new_york', age: 66, gender: 'male', personality: ['soulful', 'melancholy'], description: 'Plays the best lounge in Harlem.', firstName: 'Leo', lastName: 'Rivers' },
      { id: 'npc_080', name: 'Xander Vale', role: 'fashion_critic', district: 'soho', city: 'new_york', age: 39, gender: 'male', personality: ['sharp', 'cynical'], description: 'His review can make or break a designer.', firstName: 'Xander', lastName: 'Vale' },
      { id: 'npc_081', name: 'Sundance Sam', role: 'surfer', district: 'santa_monica', city: 'los_angeles', age: 24, gender: 'male', personality: ['laid_back', 'optimistic'], description: 'Local legend at the pier.', firstName: 'Samuel', lastName: 'Beach' },
      { id: 'npc_082', name: 'Miranda Moore', role: 'political_consultant', district: 'beverly_hills', city: 'los_angeles', age: 44, gender: 'female', personality: ['calculating', 'charismatic'], description: 'The power behind the mayor.', firstName: 'Miranda', lastName: 'Moore' },
      { id: 'npc_083', name: 'Taco Tony', role: 'chef', district: 'echo_park', city: 'los_angeles', age: 31, gender: 'male', personality: ['passionate', 'loud'], description: 'Trying to franchise his taco truck.', firstName: 'Antonio', lastName: 'Gomez' },
      { id: 'npc_084', name: 'Dr. Zenia', role: 'biohacker', district: 'hollywood', city: 'los_angeles', age: 36, gender: 'female', personality: ['eccentric', 'brilliant'], description: 'Experimenting with longevity in a secret lab.', firstName: 'Zenia', lastName: 'Kovacs' },
      { id: 'npc_085', name: 'Big Windy', role: 'city_guide', district: 'chicago_loop', city: 'chicago', age: 59, gender: 'male', personality: ['chatty', 'proud'], description: 'Tells the best stories about the Windy City.', firstName: 'Windy', lastName: 'Miller' },
      { id: 'npc_086', name: 'Lydia Lane', role: 'architect', district: 'hyde_park', city: 'chicago', age: 38, gender: 'female', personality: ['precise', 'ambitious'], description: 'Designing the next skyscraper for the Loop.', firstName: 'Lydia', lastName: 'Lane' },
      { id: 'npc_087', name: 'Sly Fox', role: 'street_artist', district: 'south_side', city: 'chicago', age: 22, gender: 'male', personality: ['rebellious', 'creative'], description: 'His murals are famous across the city.', firstName: 'Sly', lastName: 'Fox' },
      { id: 'npc_088', name: 'Detective Hardened', role: 'police_detective', district: 'chicago_loop', city: 'chicago', age: 51, gender: 'male', personality: ['grumpy', 'honest'], description: 'Seen it all. Doesn\'t trust anyone.', firstName: 'Frank', lastName: 'Hardened' },
    ];

    residents.forEach(r => {
      this.npcs.set(r.id, {
        ...r,
        schedule: this.generateSchedule(r.role),
        relationship: 0,
        mood: 'neutral',
        memories: [],
        quests: [],
      });
    });
  }
  
  private initializeFactions(): void {
    const factions = [
      { id: 'fam_001', name: 'South Memphis Hustlers', territory: 'south_memphis', rep: 0 },
      { id: 'biz_001', name: 'Downtown Business Association', territory: 'downtown', rep: 0 },
      { id: 'church_001', name: 'Orange Mound Community Church', territory: 'orange_mound', rep: 0 },
      { id: 'school_001', name: 'West Memphis High Alumni', territory: 'east_memphis', rep: 0 },
    ];
    
    factions.forEach(f => this.factions.set(f.id, f));
  }
  
  private generateSchedule(role: string): NPCSchedule {
    const schedules: Record<string, NPCSchedule> = {
      store_owner: {
        weekday: [{ start: 8, end: 18, activity: 'working', location: 'shop' }],
        weekend: [{ start: 10, end: 16, activity: 'working', location: 'shop' }],
      },
      teacher: {
        weekday: [{ start: 7, end: 16, activity: 'teaching', location: 'school' }],
        weekend: [{ start: 10, end: 14, activity: 'grading', location: 'home' }],
      },
      mechanic: {
        weekday: [{ start: 7, end: 17, activity: 'repairing', location: 'garage' }],
        weekend: [],
      },
      promoter: {
        weekday: [{ start: 14, end: 22, activity: 'networking', location: 'clubs' }],
        weekend: [{ start: 18, end: 3, activity: 'promoting', location: 'clubs' }],
      },
      elder: {
        weekday: [{ start: 9, end: 12, activity: 'mentoring', location: 'community_center' }],
        weekend: [{ start: 11, end: 14, activity: 'church', location: 'church' }],
      },
    };
    
    return schedules[role] || {
      weekday: [{ start: 9, end: 17, activity: 'working', location: 'workplace' }],
      weekend: [],
    };
  }
  
  getNPCByLocation(district: string, hour: number, dayOfWeek: number): NPCState[] {
    const results: NPCState[] = [];
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    this.npcs.forEach(npc => {
      if (npc.district === district) {
        const schedule = isWeekend ? npc.schedule.weekend : npc.schedule.weekday;
        const active = schedule.some(s => hour >= s.start && hour < s.end);
        if (active) results.push(npc);
      }
    });
    
    return results;
  }
  
  getNPCByCity(city: string): NPCState[] {
    const results: NPCState[] = [];
    this.npcs.forEach(npc => {
      if (npc.city === city) results.push(npc);
    });
    return results;
  }
  
  getNPCById(id: string): NPCState | undefined {
    return this.npcs.get(id);
  }
  
  // Get all NPCs
  getAllNPCs(): NPCState[] {
    return Array.from(this.npcs.values());
  }
  
  interact(npcId: string, action: InteractionAction): InteractionResult {
    const npc = this.npcs.get(npcId);
    if (!npc) return { success: false, message: 'NPC not found' };
    
    // Calculate relationship change
    let change = 0;
    let response = '';
    
    switch (action.type) {
      case 'greet':
        change = 2;
        response = `${npc.name} nods respectfully. "What's good, fam."`;
        break;
      case 'help':
        change = 10;
        response = `${npc.name} appreciates it. "I got you whenever you need somethin'."`;
        break;
      case 'trade':
        change = action.fair ? 3 : -5;
        response = action.fair 
          ? `${npc.name} completes the deal. "Fair trade. Respect."`
          : `${npc.name} frowns. "Nah, that ain't right. Step off."`;
        break;
      case 'insult':
        change = -15;
        response = `${npc.name} squares up. "Watch your mouth."`;
        break;
    }
    
    npc.relationship = Math.max(-100, Math.min(100, npc.relationship + change));
    npc.memories.push({ action: action.type, result: change, timestamp: Date.now() });
    
    return { success: true, message: response, relationshipChange: change };
  }
  
  getFactionRep(factionId: string): number {
    return this.factions.get(factionId)?.rep || 0;
  }
  
  updateFactionRep(factionId: string, change: number): void {
    const faction = this.factions.get(factionId);
    if (faction) {
      faction.rep = Math.max(-100, Math.min(100, faction.rep + change));
    }
  }
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  status: 'available' | 'active' | 'completed' | 'failed';
  reward: {
    money: number;
    stat?: { target: string; value: number };
    relationship?: { target: string; value: number };
  };
  objectives: {
    description: string;
    isCompleted: boolean;
  }[];
}

export interface NPCState {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  role: string;
  district: string;
  city: string;
  schedule: NPCSchedule;
  relationship: number;
  mood: string;
  memories: MemoryEntry[];
  description: string;
  age: number;
  gender: string;
  personality: string[];
  quests: Quest[];
}

export interface NPCSchedule {
  weekday: ScheduleBlock[];
  weekend: ScheduleBlock[];
}

export interface ScheduleBlock {
  start: number;
  end: number;
  activity: string;
  location: string;
}

export interface MemoryEntry {
  action: string;
  result: number;
  timestamp: number;
}

export interface Faction {
  id: string;
  name: string;
  territory: string;
  rep: number;
}

export interface InteractionAction {
  type: 'greet' | 'help' | 'trade' | 'insult' | 'recruit';
  fair?: boolean;
  amount?: number;
}

export interface InteractionResult {
  success: boolean;
  message: string;
  relationshipChange?: number;
}
