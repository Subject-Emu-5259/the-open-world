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
      // International NPCs
      { id: 'npc_089', name: 'Sir Alistair', role: 'banker', district: 'westminster', city: 'london', age: 52, gender: 'male', personality: ['proper', 'shrewd'], description: 'High-stakes investment banker in London.', firstName: 'Alistair', lastName: 'Whitmore' },
      { id: 'npc_090', name: 'Maya "Ink" Sato', role: 'tattoo_artist', district: 'shoreditch', city: 'london', age: 28, gender: 'female', personality: ['artistic', 'rebellious'], description: 'Famous for neo-traditional style in London.', firstName: 'Maya', lastName: 'Sato' },
      { id: 'npc_091', name: 'Kenji Tech', role: 'software_engineer', district: 'akihabara', city: 'tokyo', age: 26, gender: 'male', personality: ['brilliant', 'socially_awkward'], description: 'Expert in robotics and AI in Tokyo.', firstName: 'Kenji', lastName: 'Tanaka' },
      { id: 'npc_092', name: 'Yuki Mode', role: 'fashion_icon', district: 'shibuya', city: 'tokyo', age: 23, gender: 'female', personality: ['trendy', 'charismatic'], description: 'Influencing Tokyo fashion from Shibuya.', firstName: 'Yuki', lastName: 'Sato' },
      { id: 'npc_093', name: 'Chef Jean-Pierre', role: 'chef', district: 'latin_quarter', city: 'paris', age: 48, gender: 'male', personality: ['passionate', 'strict'], description: 'Michelin-star chef in the heart of Paris.', firstName: 'Jean-Pierre', lastName: 'Dupont' },
      { id: 'npc_094', name: 'Amélie Poulain', role: 'artist', district: 'montmartre', city: 'paris', age: 24, gender: 'female', personality: ['dreamy', 'curious'], description: 'Painters the soul of Paris from her attic studio.', firstName: 'Amélie', lastName: 'Poulain' },
      { id: 'npc_095', name: 'Hans Weber', role: 'industrialist', district: 'mitte', city: 'berlin', age: 55, gender: 'male', personality: ['precise', 'stern'], description: 'Legacy manufacturing giant in Berlin.', firstName: 'Hans', lastName: 'Weber' },
      { id: 'npc_096', name: 'Lukas "Beat" Zimmer', role: 'dj', district: 'kreuzberg', city: 'berlin', age: 32, gender: 'male', personality: ['minimalist', 'focused'], description: 'Pioneer of the Berlin techno scene.', firstName: 'Lukas', lastName: 'Zimmer' },
      { id: 'npc_097', name: 'Sheikh Rashid', role: 'royalty', district: 'downtown_dubai', city: 'dubai', age: 48, gender: 'male', personality: ['generous', 'visionary'], description: 'Patron of arts and futuristic architecture in Dubai.', firstName: 'Rashid', lastName: 'Al-Maktoum' },
      { id: 'npc_098', name: 'Layla Noor', role: 'architect', district: 'palm_jumeirah', city: 'dubai', age: 35, gender: 'female', personality: ['ambitious', 'bold'], description: 'Designing the next skyline for Dubai.', firstName: 'Layla', lastName: 'Noor' },
      { id: 'npc_099', name: 'Mateo "El Jefe"', role: 'vendor', district: 'zocalo', city: 'mexico_city', age: 45, gender: 'male', personality: ['friendly', 'hardworking'], description: 'Best street tacos in Mexico City.', firstName: 'Mateo', lastName: 'Garcia' },
      { id: 'npc_100', name: 'Elena Sol', role: 'curator', district: 'coyoacan', city: 'mexico_city', age: 38, gender: 'female', personality: ['knowledgeable', 'proud'], description: 'Historian at the National Museum in CDMX.', firstName: 'Elena', lastName: 'Sol' },
      { id: 'npc_101', name: 'Liam Maple', role: 'analyst', district: 'entertainment_district', city: 'toronto', age: 33, gender: 'male', personality: ['polite', 'thorough'], description: 'Financial analyst in Toronto\'s Bay Street.', firstName: 'Liam', lastName: 'Smith' },
      { id: 'npc_102', name: 'Sarah "Care"', role: 'nonprofit_director', district: 'kensington_market', city: 'toronto', age: 41, gender: 'female', personality: ['compassionate', 'driven'], description: 'Running community outreach in Toronto.', firstName: 'Sarah', lastName: 'Johnson' },
      { id: 'npc_103', name: 'Bruce "Surf" Bondi', role: 'surf_instructor', district: 'bondi', city: 'sydney', age: 36, gender: 'male', personality: ['relaxed', 'adventurous'], description: 'Teaching the world to surf in Sydney.', firstName: 'Bruce', lastName: 'Bondi' },
      { id: 'npc_104', name: 'Kylie Koala', role: 'retail_manager', district: 'the_rocks', city: 'sydney', age: 27, gender: 'female', personality: ['friendly', 'organized'], description: 'Managing high-end retail in Sydney.', firstName: 'Kylie', lastName: 'Down' },
      { id: 'npc_105', name: 'Sofia Rossi', role: 'opera_singer', district: 'darling_harbour', city: 'sydney', age: 34, gender: 'female', personality: ['talented', 'dramatic'], description: 'Performing at the Sydney Opera House.', firstName: 'Sofia', lastName: 'Rossi' },
      { id: 'npc_106', name: 'Hiroshi Yamamoto', role: 'salaryman', district: 'shinjuku', city: 'tokyo', age: 45, gender: 'male', personality: ['disciplined', 'tired'], description: 'Dedicated corporate employee in Tokyo.', firstName: 'Hiroshi', lastName: 'Yamamoto' },
      { id: 'npc_107', name: 'Fatima Zahra', role: 'gold_merchant', district: 'deira', city: 'dubai', age: 50, gender: 'female', personality: ['shrewd', 'hospitable'], description: 'Third-generation merchant in the Gold Souk.', firstName: 'Fatima', lastName: 'Zahra' },
      { id: 'npc_108', name: 'Sebastian Vogel', role: 'tech_investor', district: 'prenzlauer_berg', city: 'berlin', age: 42, gender: 'male', personality: ['calculated', 'wealthy'], description: 'Venture capitalist in Berlin\'s tech scene.', firstName: 'Sebastian', lastName: 'Vogel' },
      { id: 'npc_109', name: 'Isabella Morelo', role: 'art_restorer', district: 'polanco', city: 'mexico_city', age: 36, gender: 'female', personality: ['meticulous', 'passionate'], description: 'Preserving Mexico\'s artistic heritage.', firstName: 'Isabella', lastName: 'Morelo' },
      { id: 'npc_110', name: 'Marcus Sterling', role: 'corporate_lawyer', district: 'yorkville', city: 'toronto', age: 48, gender: 'male', personality: ['sharp', 'professional'], description: 'High-profile lawyer in Toronto.', firstName: 'Marcus', lastName: 'Sterling' },
      // New Global NPCs (v0.53.0)
      { id: 'npc_111', name: 'Dr. Aris Thorne', role: 'archaeologist', district: 'zocalo', city: 'mexico_city', age: 54, gender: 'male', personality: ['adventurous', 'scholarly'], description: 'Leading excavations in the heart of CDMX.', firstName: 'Aris', lastName: 'Thorne' },
      { id: 'npc_112', name: 'Suki Moon', role: 'esports_pro', district: 'akihabara', city: 'tokyo', age: 21, gender: 'female', personality: ['competitive', 'focused'], description: 'Top-ranked tactical shooter player in Japan.', firstName: 'Suki', lastName: 'Moon' },
      { id: 'npc_113', name: 'Viktor Volkov', role: 'tech_broker', district: 'mitte', city: 'berlin', age: 39, gender: 'male', personality: ['connected', 'secretive'], description: 'Facilitates high-tech deals across the EU.', firstName: 'Viktor', lastName: 'Volkov' },
      { id: 'npc_114', name: 'Chloe Dubois', role: 'perfumer', district: 'marais', city: 'paris', age: 29, gender: 'female', personality: ['elegant', 'sensitive'], description: 'Creating bespoke scents in a Marais boutique.', firstName: 'Chloe', lastName: 'Dubois' },
      { id: 'npc_115', name: 'Ravi Singh', role: 'fintech_engineer', district: 'shoreditch', city: 'london', age: 31, gender: 'male', personality: ['innovative', 'overworked'], description: 'Building the next generation of banking apps.', firstName: 'Ravi', lastName: 'Singh' },
      { id: 'npc_116', name: 'Oliver \"Ollie\" Posh', role: 'fashion_photographer', district: 'mayfair', city: 'london', age: 31, gender: 'male', personality: ['creative', 'arrogant'], description: 'High-end fashion photographer in London.', firstName: 'Oliver', lastName: 'Posh' },
      { id: 'npc_117', name: 'Hina \"Neon\" Tanaka', role: 'pop_idol', district: 'harajuku', city: 'tokyo', age: 19, gender: 'female', personality: ['energetic', 'exhausted'], description: 'Rising J-Pop idol in Harajuku.', firstName: 'Hina', lastName: 'Tanaka' },
      { id: 'npc_118', name: 'Marc \"The Baker\" Bernard', role: 'boulanger', district: 'marais', city: 'paris', age: 55, gender: 'male', personality: ['traditional', 'gruff'], description: 'Owner of the oldest bakery in the Marais.', firstName: 'Marc', lastName: 'Bernard' },
      { id: 'npc_119', name: 'Hilda \"Tech\" Schneider', role: 'nightclub_owner', district: 'kreuzberg', city: 'berlin', age: 44, gender: 'female', personality: ['visionary', 'strict'], description: 'Runs the most exclusive techno club in Berlin.', firstName: 'Hilda', lastName: 'Schneider' },
      { id: 'npc_120', name: 'Zaid Al-Habibi', role: 'concierge', district: 'palm_jumeirah', city: 'dubai', age: 29, gender: 'male', personality: ['helpful', 'observant'], description: 'Lead concierge at a luxury Dubai resort.', firstName: 'Zaid', lastName: 'Al-Habibi' },
      // New Global NPCs (v0.61.0 Expansion)
      { id: 'npc_121', name: 'Maple Mike', role: 'busker', district: 'kensington_market', city: 'toronto', age: 24, gender: 'male', personality: ['energetic', 'optimistic'], description: 'Kensington Market regular. Plays a mean acoustic guitar.', firstName: 'Mike', lastName: 'Henderson' },
      { id: 'npc_122', name: 'Captain Cook', role: 'tour_guide', district: 'darling_harbour', city: 'sydney', age: 58, gender: 'male', personality: ['authoritative', 'friendly'], description: 'Harbour tour legend. Knows every secret of the bay.', firstName: 'James', lastName: 'Cook' },
      { id: 'npc_123', name: 'Phoebe Posh', role: 'personal_shopper', district: 'mayfair', city: 'london', age: 31, gender: 'female', personality: ['connected', 'sophisticated'], description: 'Personal shopper to the elite in Mayfair.', firstName: 'Phoebe', lastName: 'Whitaker' },
      { id: 'npc_124', name: 'Sato San', role: 'arcade_owner', district: 'akihabara', city: 'tokyo', age: 65, gender: 'male', personality: ['nostalgic', 'disciplined'], description: 'Owns a retro arcade. Missing the golden age of gaming.', firstName: 'Kenji', lastName: 'Sato' },
      { id: 'npc_125', name: 'Madame Leclair', role: 'bookseller', district: 'latin_quarter', city: 'paris', age: 72, gender: 'female', personality: ['intellectual', 'warm'], description: 'Owns a rare bookstore in the Latin Quarter.', firstName: 'Solange', lastName: 'Leclair' },
      { id: 'npc_133', name: 'Lars Fischer', role: 'architect', district: 'mitte', city: 'berlin', age: 38, gender: 'male', personality: ['visionary', 'analytical'], description: "Visionary architect redesigning Berlin's skyline.", firstName: 'Lars', lastName: 'Fischer' },
      { id: 'npc_134', name: 'Yuki "Neon" Tanaka', role: 'esports_pro', district: 'akihabara', city: 'tokyo', age: 22, gender: 'female', personality: ['competitive', 'focused'], description: 'Top-tier e-sports athlete in the heart of Tokyo.', firstName: 'Yuki', lastName: 'Tanaka' },
      { id: 'npc_135', name: 'Isabella Costa', role: 'marine_biologist', district: 'bondi', city: 'sydney', age: 31, gender: 'female', personality: ['passionate', 'adventurous'], description: 'Dedicated to preserving the Great Barrier Reef.', firstName: 'Isabella', lastName: 'Costa' },
      { id: 'npc_126', name: 'Banksy Jr', role: 'street_artist', district: 'shoreditch', city: 'london', age: 22, gender: 'male', personality: ['rebellious', 'creative'], description: 'Tagging the walls of East London with high-concept art.', firstName: 'Banksy', lastName: 'Junior' },
      { id: 'npc_127', name: 'Yumi Cyber', role: 'netrunner', district: 'akihabara', city: 'tokyo', age: 24, gender: 'female', personality: ['secretive', 'brilliant'], description: 'Ghost in the Akihabara machine. Knows things she shouldn\'t.', firstName: 'Yumi', lastName: 'Cyber' },
      // New Global NPCs (v0.66.0 Expansion)
      { id: 'npc_128', name: 'Otto "Techno" Schmidt', role: 'club_bouncer', district: 'kreuzberg', city: 'berlin', age: 41, gender: 'male', personality: ['intimidating', 'loyal'], description: 'Legendary bouncer at the coolest club in Berlin. Not everyone gets in.', firstName: 'Otto', lastName: 'Schmidt' },
      { id: 'npc_129', name: 'Helga Von Art', role: 'art_critic', district: 'mitte', city: 'berlin', age: 49, gender: 'female', personality: ['critical', 'sophisticated'], description: 'The most feared art critic in Germany. Her word is law.', firstName: 'Helga', lastName: 'Von Art' },
      { id: 'npc_130', name: 'Carlos "Lucha" Libre', role: 'wrestler', district: 'zocalo', city: 'mexico_city', age: 34, gender: 'male', personality: ['honorable', 'tough'], description: 'Professional Luchador. Fights for the pride of Mexico.', firstName: 'Carlos', lastName: 'Gomez' },
      { id: 'npc_131', name: 'Maria "Agave" Santos', role: 'distiller', district: 'coyoacan', city: 'mexico_city', age: 39, gender: 'female', personality: ['passionate', 'traditional'], description: 'Crafts the finest tequila in the region using ancestral methods.', firstName: 'Maria', lastName: 'Santos' },
      { id: 'npc_132', name: 'Faisal Bin Zayed', role: 'investor', district: 'downtown_dubai', city: 'dubai', age: 52, gender: 'male', personality: ['visionary', 'wealthy'], description: 'Venture capitalist looking for the next trillion-dollar idea.', firstName: 'Faisal', lastName: 'Bin Zayed' },
      { id: 'npc_201', name: 'Sir Julian Thorne', role: 'investor', district: 'westminster', city: 'london', age: 65, gender: 'male', personality: ['proper', 'shrewd'], description: 'Old-money aristocrat and venture capitalist.', firstName: 'Julian', lastName: 'Thorne' },
      { id: 'npc_202', name: 'Akiko Tanaka', role: 'ceo', district: 'shibuya', city: 'tokyo', age: 42, gender: 'female', personality: ['visionary', 'analytical'], description: 'CEO of a leading robotics firm in Tokyo.', firstName: 'Akiko', lastName: 'Tanaka' },
      { id: 'npc_203', name: 'Chloe Dubois', role: 'designer', district: 'marais', city: 'paris', age: 31, gender: 'female', personality: ['creative', 'perfectionist'], description: 'High-fashion designer with a boutique in Le Marais.', firstName: 'Chloe', lastName: 'Dubois' },
      { id: 'npc_204', name: 'Zayed Al-Maktoum', role: 'tycoon', district: 'palm_jumeirah', city: 'dubai', age: 45, gender: 'male', personality: ['ambitious', 'generous'], description: 'Real estate tycoon redefining the Dubai skyline.', firstName: 'Zayed', lastName: 'Al-Maktoum' },
      { id: 'npc_205', name: 'Max Schmidt', role: 'dj', district: 'kreuzberg', city: 'berlin', age: 29, gender: 'male', personality: ['minimalist', 'focused'], description: 'The most sought-after techno DJ in Berlin.', firstName: 'Max', lastName: 'Schmidt' },
      // London Expansion
      { id: 'npc_206', name: 'Arthur Penhaligon', role: 'tailor', district: 'westminster', city: 'london', age: 55, gender: 'male', personality: ['meticulous', 'conservative'], description: 'Old-school Savile Row tailor.', firstName: 'Arthur', lastName: 'Penhaligon' },
      { id: 'npc_207', name: 'Siobhan O\'Reilly', role: 'pub_owner', district: 'camden', city: 'london', age: 42, gender: 'female', personality: ['boisterous', 'loyal'], description: 'Runs The Rusty Anchor. Heart of Camden.', firstName: 'Siobhan', lastName: 'O\'Reilly' },
      { id: 'npc_208', name: 'Jasper Thorne', role: 'broker', district: 'shoreditch', city: 'london', age: 31, gender: 'male', personality: ['sharp', 'ruthless'], description: 'Fast-talking high-frequency trader.', firstName: 'Jasper', lastName: 'Thorne' },
      { id: 'npc_209', name: 'Eliza Vance', role: 'historian', district: 'westminster', city: 'london', age: 38, gender: 'female', personality: ['intellectual', 'quiet'], description: 'Curator at the V&A Museum.', firstName: 'Eliza', lastName: 'Vance' },
      { id: 'npc_210', name: 'Dexter Reed', role: 'street_performer', district: 'soho', city: 'london', age: 25, gender: 'male', personality: ['charismatic', 'poor'], description: 'The best living statue in the city.', firstName: 'Dexter', lastName: 'Reed' },
      // Tokyo Expansion
      { id: 'npc_211', name: 'Hideo Sato', role: 'chef', district: 'shinjuku', city: 'tokyo', age: 60, gender: 'male', personality: ['perfectionist', 'stern'], description: 'Omakase master in Ginza.', firstName: 'Hideo', lastName: 'Sato' },
      { id: 'npc_212', name: 'Aimi Tanaka', role: 'idol', district: 'shibuya', city: 'tokyo', age: 19, gender: 'female', personality: ['bubbly', 'stressed'], description: 'Rising J-Pop star. Always in a hurry.', firstName: 'Aimi', lastName: 'Tanaka' },
      { id: 'npc_213', name: 'Kenjiro Ito', role: 'blacksmith', district: 'shinjuku', city: 'tokyo', age: 52, gender: 'male', personality: ['traditional', 'silent'], description: 'Crafts legendary katanas.', firstName: 'Kenjiro', lastName: 'Ito' },
      { id: 'npc_214', name: 'Yumi Mori', role: 'gamer', district: 'akihabara', city: 'tokyo', age: 22, gender: 'female', personality: ['obsessive', 'brilliant'], description: 'Top-ranked pro gamer in the arcade scene.', firstName: 'Yumi', lastName: 'Mori' },
      // v0.81.0 Global Expansion — Toronto, Sydney, Berlin, Dubai, Mexico City, Paris
      { id: 'npc_216', name: 'Ravi Patel', role: 'startup_founder', district: 'entertainment_district', city: 'toronto', age: 34, gender: 'male', personality: ['ambitious', 'friendly'], description: 'Running a fintech startup from a downtown co-working space.', firstName: 'Ravi', lastName: 'Patel' },
      { id: 'npc_217', name: 'Elena Varga', role: 'sommelier', district: 'yorkville', city: 'toronto', age: 39, gender: 'female', personality: ['refined', 'observant'], description: 'Curates rare wine lists for Yorkville restaurants.', firstName: 'Elena', lastName: 'Varga' },
      { id: 'npc_218', name: 'Kai Sun', role: 'kombucha_brewer', district: 'kensington_market', city: 'toronto', age: 29, gender: 'nonbinary', personality: ['creative', 'chill'], description: 'Brews small-batch kombucha and vegan snacks.', firstName: 'Kai', lastName: 'Sun' },
      { id: 'npc_219', name: 'Jake Dundee', role: 'lifeguard', district: 'bondi', city: 'sydney', age: 26, gender: 'male', personality: ['brave', 'laid-back'], description: 'Keeps swimmers safe at Bondi Beach.', firstName: 'Jake', lastName: 'Dundee' },
      { id: 'npc_220', name: 'Mei Chen', role: 'marine_biologist', district: 'darling_harbour', city: 'sydney', age: 32, gender: 'female', personality: ['passionate', 'curious'], description: 'Studies harbor ecosystems and plastic pollution.', firstName: 'Mei', lastName: 'Chen' },
      { id: 'npc_221', name: 'Nazanin Rahimi', role: 'art_curator', district: 'the_rocks', city: 'sydney', age: 41, gender: 'female', personality: ['intellectual', 'warm'], description: 'Runs a contemporary gallery in The Rocks.', firstName: 'Nazanin', lastName: 'Rahimi' },
      { id: 'npc_222', name: 'Fritz Brandt', role: 'street_food_chef', district: 'neukolln', city: 'berlin', age: 37, gender: 'male', personality: ['gruff', 'generous'], description: 'Serves legendary currywurst from a Neukölln food truck.', firstName: 'Fritz', lastName: 'Brandt' },
      { id: 'npc_223', name: 'Amira Hassan', role: 'perfume_merchant', district: 'deira', city: 'dubai', age: 46, gender: 'female', personality: ['persuasive', 'warm'], description: 'Blends traditional oud and attar fragrances in the souk.', firstName: 'Amira', lastName: 'Hassan' },
      { id: 'npc_224', name: 'Diego Rivera', role: 'mezcalier', district: 'condesa', city: 'mexico_city', age: 42, gender: 'male', personality: ['knowledgeable', 'theatrical'], description: 'Hosts mezcal tastings and folklore stories in Condesa.', firstName: 'Diego', lastName: 'Rivera' },
      { id: 'npc_225', name: 'Colette Renard', role: 'chocolatier', district: 'champs_elysees', city: 'paris', age: 58, gender: 'female', personality: ['elegant', 'perfectionist'], description: 'Creates award-winning chocolates on the Champs-Élysées.', firstName: 'Colette', lastName: 'Renard' },
      { id: 'npc_215', name: 'Taro Honda', role: 'salaryman', district: 'shinjuku', city: 'tokyo', age: 45, gender: 'male', personality: ['exhausted', 'loyal'], description: 'The quintessential corporate warrior.', firstName: 'Taro', lastName: 'Honda' },
      { id: 'npc_226', name: 'Jodie Chen', role: 'tech_recruiter', district: 'downtown_generic', city: 'seattle', age: 33, gender: 'female', personality: ['sharp', 'approachable'], description: 'Headhunter for Seattle tech giants. Always scouting talent.', firstName: 'Jodie', lastName: 'Chen' },
      { id: 'npc_227', name: 'Lucky Luciano', role: 'casino_host', district: 'downtown_generic', city: 'vegas', age: 41, gender: 'male', personality: ['smooth', 'calculating'], description: 'VIP host on the Strip. Knows every high roller in town.', firstName: 'Lucky', lastName: 'Luciano' },
      { id: 'npc_228', name: 'Rosa Saguaro', role: 'botanist', district: 'suburbs', city: 'phoenix', age: 37, gender: 'female', personality: ['patient', 'curious'], description: 'Desert ecologist working to save the saguaro forests.', firstName: 'Rosa', lastName: 'Saguaro' },
      { id: 'npc_229', name: 'Marcus Motor', role: 'auto_worker', district: 'industrial', city: 'detroit', age: 48, gender: 'male', personality: ['proud', 'hardworking'], description: 'Third-generation auto worker keeping Motor City running.', firstName: 'Marcus', lastName: 'Motor' },
      { id: 'npc_230', name: 'Tony Cheesesteak', role: 'food_truck_owner', district: 'downtown_generic', city: 'philly', age: 52, gender: 'male', personality: ['gruff', 'generous'], description: 'Philly cheesesteak legend. Cash only, no exceptions.', firstName: 'Tony', lastName: 'Cheesesteak' },
      { id: 'npc_231', name: 'Barbara Banker', role: 'financial_analyst', district: 'uptown', city: 'charlotte', age: 35, gender: 'female', personality: ['ambitious', 'polished'], description: 'Rising star in Charlotte\'s banking district.', firstName: 'Barbara', lastName: 'Banker' },
      { id: 'npc_232', name: 'Cassidy Wrangler', role: 'rodeo_promoter', district: 'downtown_generic', city: 'dallas', age: 29, gender: 'female', personality: ['bold', 'charming'], description: 'Promotes rodeos across Texas. Knows every rancher.', firstName: 'Cassidy', lastName: 'Wrangler' },
      { id: 'npc_233', name: 'Elena Energy', role: 'petroleum_engineer', district: 'industrial', city: 'houston', age: 44, gender: 'female', personality: ['driven', 'pragmatic'], description: 'Oil rig engineer balancing energy and the environment.', firstName: 'Elena', lastName: 'Energy' },
      // v0.87.0 Global Expansion — Tokyo, Sydney, Toronto, Paris, Dubai, Berlin
      { id: 'npc_234', name: 'Sakura Tanaka', role: 'matcha_master', district: 'shinjuku', city: 'tokyo', age: 58, gender: 'female', personality: ['peaceful', 'precise'], description: 'Tea ceremony master with a quiet shop in Shinjuku.', firstName: 'Sakura', lastName: 'Tanaka' },
      { id: 'npc_235', name: 'Kenji Arcade', role: 'arcade_champion', district: 'akihabara', city: 'tokyo', age: 24, gender: 'male', personality: ['competitive', 'nostalgic'], description: 'Holds the high score on every cabinet in Akihabara.', firstName: 'Kenji', lastName: 'Arcade' },
      { id: 'npc_236', name: 'Hamish McGregor', role: 'rugby_coach', district: 'bondi', city: 'sydney', age: 49, gender: 'male', personality: ['tough', 'mentor'], description: 'Coaches youth rugby at Bondi. Local legend.', firstName: 'Hamish', lastName: 'McGregor' },
      { id: 'npc_237', name: 'Priya Sharma', role: 'chef', district: 'darling_harbour', city: 'sydney', age: 35, gender: 'female', personality: ['innovative', 'warm'], description: 'Runs a modern Indian fusion restaurant near the harbour.', firstName: 'Priya', lastName: 'Sharma' },
      { id: 'npc_238', name: 'Noah Kim', role: 'music_producer', district: 'entertainment_district', city: 'toronto', age: 30, gender: 'male', personality: ['creative', 'hustler'], description: 'Produces beats for Toronto hip-hop artists.', firstName: 'Noah', lastName: 'Kim' },
      { id: 'npc_239', name: 'Camille Moreau', role: 'sommelier', district: 'latin_quarter', city: 'paris', age: 41, gender: 'female', personality: ['refined', 'witty'], description: 'Can identify any wine by scent alone.', firstName: 'Camille', lastName: 'Moreau' },
      { id: 'npc_240', name: 'Rashid Al-Farsi', role: 'yacht_captain', district: 'palm_jumeirah', city: 'dubai', age: 44, gender: 'male', personality: ['confident', 'worldly'], description: 'Charters luxury yachts around the Palm.', firstName: 'Rashid', lastName: 'Al-Farsi' },
      { id: 'npc_241', name: 'Lina Hoffman', role: 'startup_founder', district: 'kreuzberg', city: 'berlin', age: 32, gender: 'female', personality: ['visionary', 'rebellious'], description: 'Building a sustainable fashion brand in Kreuzberg.', firstName: 'Lina', lastName: 'Hoffman' },
      { id: 'npc_242', name: 'Mateo Ruiz', role: 'muralist', district: 'coyoacan', city: 'mexico_city', age: 29, gender: 'male', personality: ['passionate', 'political'], description: 'Paints huge murals honoring Frida and Zapata.', firstName: 'Mateo', lastName: 'Ruiz' },
      { id: 'npc_243', name: 'Aisha Patel', role: 'fashion_blogger', district: 'mayfair', city: 'london', age: 26, gender: 'female', personality: ['trendy', 'ambitious'], description: 'Street-style photographer with half a million followers.', firstName: 'Aisha', lastName: 'Patel' },
      // v0.89.0 Global Expansion — International NPCs for international cities
      { id: 'npc_244', name: 'Omar Hassan', role: 'spice_merchant', district: 'deira', city: 'dubai', age: 54, gender: 'male', personality: ['persuasive', 'warm'], description: 'Third-generation souk trader who can identify any spice by scent.', firstName: 'Omar', lastName: 'Hassan' },
      { id: 'npc_245', name: 'Yuki Fujimoto', role: 'robotics_engineer', district: 'roppongi', city: 'tokyo', age: 32, gender: 'female', personality: ['focused', 'curious'], description: 'Builds companion robots and dreams of sentient AI.', firstName: 'Yuki', lastName: 'Fujimoto' },
      { id: 'npc_246', name: 'Antoine Dubois', role: 'street_magician', district: 'montmartre', city: 'paris', age: 29, gender: 'male', personality: ['mysterious', 'charming'], description: 'Performs illusions in the squares of Montmartre.', firstName: 'Antoine', lastName: 'Dubois' },
      { id: 'npc_247', name: 'Freya Mueller', role: 'curator', district: 'mitte', city: 'berlin', age: 45, gender: 'female', personality: ['intellectual', 'direct'], description: 'Curates Cold War photography at a Mitte gallery.', firstName: 'Freya', lastName: 'Mueller' },
      { id: 'npc_248', name: 'Carmen Ortega', role: 'luchador_agent', district: 'zocalo', city: 'mexico_city', age: 38, gender: 'female', personality: ['fierce', 'loyal'], description: 'Represents masked wrestling legends and rising stars.', firstName: 'Carmen', lastName: 'Ortega' },
      { id: 'npc_249', name: 'Declan Murphy', role: 'pub_owner', district: 'camden', city: 'london', age: 52, gender: 'male', personality: ['witty', 'generous'], description: 'Owns a Camden pub that has hosted rising punk bands for decades.', firstName: 'Declan', lastName: 'Murphy' },
      { id: 'npc_250', name: 'Astrid Lindqvist', role: 'hockey_scout', district: 'yorkville', city: 'toronto', age: 41, gender: 'female', personality: ['sharp', 'encouraging'], description: 'Scout for junior hockey talent across Ontario.', firstName: 'Astrid', lastName: 'Lindqvist' },
      { id: 'npc_251', name: 'Jai Wilson', role: 'surf_instructor', district: 'bondi', city: 'sydney', age: 27, gender: 'male', personality: ['easygoing', 'brave'], description: 'Teaches sunrise surf lessons and volunteers for ocean cleanups.', firstName: 'Jai', lastName: 'Wilson' },
      { id: 'npc_252', name: 'Nia Okonkwo', role: 'grime_dj', district: 'shoreditch', city: 'london', age: 25, gender: 'female', personality: ['ambitious', 'rebellious'], description: 'Rising grime DJ spinning warehouse sets across East London.', firstName: 'Nia', lastName: 'Okonkwo' },
      { id: 'npc_253', name: 'Kenji Mori', role: 'ramen_apprentice', district: 'shinjuku', city: 'tokyo', age: 23, gender: 'male', personality: ['determined', 'humble'], description: 'Apprentice at a legendary back-alley ramen shop.', firstName: 'Kenji', lastName: 'Mori' },
      // v0.90.0 Global Expansion — International NPCs
      { id: 'npc_254', name: 'Sofia Petrov', role: 'ballet_instructor', district: 'prenzlauer_berg', city: 'berlin', age: 29, gender: 'female', personality: ['graceful', 'disciplined'], description: 'Teaches classical ballet at a Prenzlauer Berg studio.', firstName: 'Sofia', lastName: 'Petrov' },
      { id: 'npc_255', name: 'Maxime Laurent', role: 'wine_merchant', district: 'marais', city: 'paris', age: 52, gender: 'male', personality: ['sophisticated', 'witty'], description: 'Owns a small natural-wine bar in the Marais.', firstName: 'Maxime', lastName: 'Laurent' },
      { id: 'npc_256', name: 'Haruto Tanaka', role: 'bartender', district: 'shibuya', city: 'tokyo', age: 27, gender: 'male', personality: ['observant', 'cool'], description: 'Mixes cocktails in a hidden Shibuya jazz bar.', firstName: 'Haruto', lastName: 'Tanaka' },
      { id: 'npc_257', name: 'Layla Al-Rashid', role: 'yacht_broker', district: 'dubai_marina', city: 'dubai', age: 36, gender: 'female', personality: ['ambitious', 'polished'], description: 'Sells superyachts along the Dubai Marina Walk.', firstName: 'Layla', lastName: 'Al-Rashid' },
      { id: 'npc_258', name: 'Diego Cruz', role: 'mariachi_director', district: 'polanco', city: 'mexico_city', age: 48, gender: 'male', personality: ['passionate', 'proud'], description: 'Leads a revered mariachi ensemble in Polanco.', firstName: 'Diego', lastName: 'Cruz' },
      { id: 'npc_259', name: 'Priya Kapoor', role: 'comedy_booker', district: 'distillery_district', city: 'toronto', age: 31, gender: 'female', personality: ['sharp', 'hilarious'], description: 'Books stand-up acts at a Distillery District comedy club.', firstName: 'Priya', lastName: 'Kapoor' },
      { id: 'npc_260', name: 'Flynn OBrien', role: 'ferry_captain', district: 'the_rocks', city: 'sydney', age: 56, gender: 'male', personality: ['stoic', 'witty'], description: 'Steers harbour ferries and argues about rugby at The Rocks pub.', firstName: 'Flynn', lastName: 'OBrien' },
      { id: 'npc_261', name: 'Mei Lin', role: 'translator', district: 'latin_quarter', city: 'paris', age: 34, gender: 'female', personality: ['curious', 'charming'], description: 'Translates poetry between Mandarin and French in a Latin Quarter bookshop.', firstName: 'Mei', lastName: 'Lin' },
      { id: 'npc_262', name: 'Zara Hussein', role: 'camel_trainer', district: 'downtown_dubai', city: 'dubai', age: 42, gender: 'female', personality: ['tough', 'loyal'], description: 'Trains racing camels on the outskirts of Dubai.', firstName: 'Zara', lastName: 'Hussein' },
      { id: 'npc_263', name: 'Ren Sato', role: 'capsule_concierge', district: 'akihabara', city: 'tokyo', age: 24, gender: 'male', personality: ['efficient', 'kind'], description: 'Checks guests into a futuristic capsule hotel near Akihabara.', firstName: 'Ren', lastName: 'Sato' },
      // v0.93.0 Global Expansion — International NPCs
      { id: 'npc_264', name: 'Hiroshi Tanaka', role: 'bonsai_artist', district: 'asakusa', city: 'tokyo', age: 62, gender: 'male', personality: ['patient', 'wise'], description: 'Tends a tiny bonsai garden hidden behind a Senso-ji temple shop.', firstName: 'Hiroshi', lastName: 'Tanaka' },
      { id: 'npc_265', name: 'Isla Campbell', role: 'opera_singer', district: 'west_end', city: 'london', age: 39, gender: 'female', personality: ['dramatic', 'generous'], description: 'Performs lead roles in the West End and gives free vocal lessons.', firstName: 'Isla', lastName: 'Campbell' },
      { id: 'npc_266', name: 'Lucas Moreau', role: 'bicycle_mechanic', district: 'le_marais', city: 'paris', age: 31, gender: 'male', personality: ['laid-back', 'skilled'], description: 'Restores vintage bicycles and organizes group rides through the Marais.', firstName: 'Lucas', lastName: 'Moreau' },
      { id: 'npc_267', name: 'Nadine Keller', role: 'club_promoter', district: 'friedrichshain', city: 'berlin', age: 27, gender: 'female', personality: ['energetic', 'ambitious'], description: 'Promotes underground techno nights in abandoned factories.', firstName: 'Nadine', lastName: 'Keller' },
      { id: 'npc_268', name: 'Samir Haddad', role: 'goldsmith', district: 'gold_souk', city: 'dubai', age: 50, gender: 'male', personality: ['precise', 'warm'], description: 'Handcrafts 22-karat gold jewelry using designs passed down three generations.', firstName: 'Samir', lastName: 'Haddad' },
      { id: 'npc_269', name: 'Carmen Vega', role: 'tlayuda_chef', district: 'coyoacan', city: 'mexico_city', age: 45, gender: 'female', personality: ['fiery', 'welcoming'], description: 'Serves giant tlayudas from a family stall in Coyoacán.', firstName: 'Carmen', lastName: 'Vega' },
      { id: 'npc_270', name: 'Darius Mills', role: 'podcast_host', district: 'kensington_market', city: 'toronto', age: 34, gender: 'male', personality: ['curious', 'opinionated'], description: 'Records a popular true-crime podcast from a Kensington Market studio.', firstName: 'Darius', lastName: 'Mills' },
      { id: 'npc_271', name: 'Gemma Walsh', role: 'marine_biologist', district: 'manly', city: 'sydney', age: 29, gender: 'female', personality: ['passionate', 'scientific'], description: 'Studies reef restoration and gives beachside conservation talks.', firstName: 'Gemma', lastName: 'Walsh' },
      { id: 'npc_272', name: 'Olivier Bernard', role: 'parfumeur', district: 'saint_germain', city: 'paris', age: 55, gender: 'male', personality: ['refined', 'mysterious'], description: 'Blends bespoke fragrances for private clients in Saint-Germain.', firstName: 'Olivier', lastName: 'Bernard' },
      { id: 'npc_273', name: 'Aya Kobayashi', role: 'street_fashion_designer', district: 'harajuku', city: 'tokyo', age: 22, gender: 'female', personality: ['bold', 'creative'], description: 'Creates limited-run Harajuku pieces from recycled kimono fabric.', firstName: 'Aya', lastName: 'Kobayashi' },
      // v0.95.0 — International NPCs
      { id: 'npc_274', name: 'Yuki Tanabe', role: 'jazz_club_manager', district: 'shinjuku', city: 'tokyo', age: 36, gender: 'female', personality: ['cool', 'introverted'], description: 'Runs an underground jazz basement where sessions go until sunrise.', firstName: 'Yuki', lastName: 'Tanabe' },
      { id: 'npc_275', name: 'Lenny Brooks', role: 'pub_landlord', district: 'camden', city: 'london', age: 52, gender: 'male', personality: ['witty', 'gruff'], description: 'Keeps a riverside pub in Camden and knows every regular by name.', firstName: 'Lenny', lastName: 'Brooks' },
      { id: 'npc_276', name: 'Sophie Martin', role: 'pastry_chef', district: 'marais', city: 'paris', age: 29, gender: 'female', personality: ['perfectionist', 'warm'], description: 'Opens her Marais bakery before dawn to proof croissants and braided brioche.', firstName: 'Sophie', lastName: 'Martin' },
      { id: 'npc_277', name: 'Finn Wagner', role: 'graffiti_curator', district: 'kreuzberg', city: 'berlin', age: 33, gender: 'male', personality: ['rebellious', 'artistic'], description: 'Curates legal murals in Kreuzberg and mentors young street artists.', firstName: 'Finn', lastName: 'Wagner' },
      { id: 'npc_278', name: 'Amira Al-Fayed', role: 'yacht_broker', district: 'dubai_marina', city: 'dubai', age: 41, gender: 'female', personality: ['polished', 'persuasive'], description: 'Sells luxury marina berths to clients who expect sunset viewings.', firstName: 'Amira', lastName: 'Al-Fayed' },
      { id: 'npc_279', name: 'Mateo Herrera', role: 'lucha_trainer', district: 'coyoacan', city: 'mexico_city', age: 38, gender: 'male', personality: ['charismatic', 'tough'], description: 'Trains aspiring luchadores in a Coyoacán backyard ring on weekends.', firstName: 'Mateo', lastName: 'Herrera' },
      { id: 'npc_280', name: 'Priya Shah', role: 'startup_founder', district: 'distillery_district', city: 'toronto', age: 27, gender: 'female', personality: ['driven', 'friendly'], description: 'Bootstraps a climate-tech startup from a Distillery District co-working loft.', firstName: 'Priya', lastName: 'Shah' },
      { id: 'npc_281', name: 'Jack Morrison', role: 'surf_instructor', district: 'bondi', city: 'sydney', age: 30, gender: 'male', personality: ['laid-back', 'encouraging'], description: 'Teaches dawn surf lessons at Bondi and barbecues with students after.', firstName: 'Jack', lastName: 'Morrison' },
      { id: 'npc_282', name: 'Elena Rossi', role: 'vespa_mechanic', district: 'champs_elysees', city: 'paris', age: 45, gender: 'female', personality: ['no-nonsense', 'skilled'], description: 'Repairs vintage Vespas for couriers and film crews near the Champs-Élysées.', firstName: 'Elena', lastName: 'Rossi' },
      { id: 'npc_283', name: 'Kenji Mori', role: 'ramen_critic', district: 'shibuya', city: 'tokyo', age: 55, gender: 'male', personality: ['critical', 'passionate'], description: 'Reviews hidden ramen shops in Shibuya with a notebook and a strict scoring system.', firstName: 'Kenji', lastName: 'Mori' },


      // v0.96.0 — International NPCs
      { id: 'npc_284', name: "Liam O’Connor", role: 'street_poet', district: 'soho', city: 'london', age: 31, gender: 'male', personality: ['romantic', 'observant'], description: 'Recites spoken-word poetry on a folding stool in Soho every evening.', firstName: 'Liam', lastName: 'O’Connor' },
      { id: 'npc_285', name: 'Naoko Saito', role: 'retro_game_shop_owner', district: 'akihabara', city: 'tokyo', age: 42, gender: 'female', personality: ['nostalgic', 'knowledgeable'], description: 'Restores Famicom cartridges and rare games in a tiny Akihabara back room.', firstName: 'Naoko', lastName: 'Saito' },
      { id: 'npc_286', name: 'Claire Dupont', role: 'bookbinder', district: 'latin_quarter', city: 'paris', age: 37, gender: 'female', personality: ['meticulous', 'patient'], description: 'Rebinds rare Latin Quarter paperbacks with leather and gold leaf.', firstName: 'Claire', lastName: 'Dupont' },
      { id: 'npc_287', name: 'Jonas Keller', role: 'documentary_filmmaker', district: 'mitte', city: 'berlin', age: 39, gender: 'male', personality: ['curious', 'intense'], description: 'Shoots street-level documentaries about Berlin neighborhoods on vintage 16 mm film.', firstName: 'Jonas', lastName: 'Keller' },
      { id: 'npc_288', name: 'Rashid Al-Hassan', role: 'private_chef', district: 'palm_jumeirah', city: 'dubai', age: 34, gender: 'male', personality: ['refined', 'discreet'], description: 'Cooks private dinners for Palm Jumeirah villas using ingredients flown in daily.', firstName: 'Rashid', lastName: 'Al-Hassan' },
      { id: 'npc_289', name: 'Camila Rojas', role: 'art_collector', district: 'polanco', city: 'mexico_city', age: 48, gender: 'female', personality: ['sophisticated', 'sharp'], description: 'Builds rotating contemporary-art exhibits inside a Polanco townhouse.', firstName: 'Camila', lastName: 'Rojas' },
      { id: 'npc_290', name: 'Elijah Brooks', role: 'jazz_saxophonist', district: 'yorkville', city: 'toronto', age: 33, gender: 'male', personality: ['soulful', 'humble'], description: 'Plays sax on Yorkville patios and moonlights as a transit busker.', firstName: 'Elijah', lastName: 'Brooks' },
      { id: 'npc_291', name: 'Ruby Thompson', role: 'harbour_tour_guide', district: 'the_rocks', city: 'sydney', age: 29, gender: 'female', personality: ['outgoing', 'knowledgeable'], description: 'Leads small-group walking tours through The Rocks and beneath the harbour bridge.', firstName: 'Ruby', lastName: 'Thompson' },
      { id: 'npc_292', name: 'Zara Niazi', role: 'street_artist', district: 'shoreditch', city: 'london', age: 25, gender: 'female', personality: ['fearless', 'creative'], description: 'Paints large-scale murals in Shoreditch alleys under a rotating alias.', firstName: 'Zara', lastName: 'Niazi' },
      { id: 'npc_293', name: 'Hiro Tanaka', role: 'cocktail_bartender', district: 'roppongi', city: 'tokyo', age: 30, gender: 'male', personality: ['cool', 'witty'], description: 'Mixes experimental cocktails at a hidden Roppongi bar with no menu.', firstName: 'Hiro', lastName: 'Tanaka' },
      // v0.97.0 — International NPCs
      { id: 'npc_294', name: 'Omar Farooq', role: 'spice_merchant', district: 'gold_souk', city: 'dubai', age: 52, gender: 'male', personality: ['gregarious', 'shrewd'], description: 'Stands behind a spice stall in the Gold Souk blending za’atar and saffron for regulars.', firstName: 'Omar', lastName: 'Farooq' },
      { id: 'npc_295', name: 'Yuki Mori', role: 'bonsai_master', district: 'asakusa', city: 'tokyo', age: 68, gender: 'female', personality: ['patient', 'wise'], description: 'Tends a tiny Asakusa bonsai garden and critiques over-pruning with a gentle smile.', firstName: 'Yuki', lastName: 'Mori' },
      { id: 'npc_296', name: 'Céline Beaumont', role: 'perfume_blender', district: 'le_marais', city: 'paris', age: 41, gender: 'female', personality: ['refined', 'intuitive'], description: 'Blends custom fragrances from a Marais atelier using old glass apothecary bottles.', firstName: 'Céline', lastName: 'Beaumont' },
      { id: 'npc_297', name: 'Felix Brandt', role: 'bike_messenger', district: 'neukolln', city: 'berlin', age: 26, gender: 'male', personality: ['fast', 'witty'], description: 'Weaves through Neukölln traffic delivering parcels and restaurant orders on a fixed-gear bike.', firstName: 'Felix', lastName: 'Brandt' },
      { id: 'npc_298', name: 'Sana Patel', role: 'opera_house_usher', district: 'entertainment_district', city: 'toronto', age: 35, gender: 'female', personality: ['warm', 'theatrical'], description: 'Works the velvet rope at a Toronto opera house and knows every understudy story.', firstName: 'Sana', lastName: 'Patel' },
      { id: 'npc_299', name: 'Marco Reyes', role: 'mariachi_band_leader', district: 'plaza_garibaldi', city: 'mexico_city', age: 47, gender: 'male', personality: ['loud', 'proud'], description: 'Leads a Plaza Garibaldi mariachi group through late-night serenades and birthday gigs.', firstName: 'Marco', lastName: 'Reyes' },
      { id: 'npc_300', name: 'Tessa Okafor', role: 'market_florist', district: 'borough_market', city: 'london', age: 32, gender: 'female', personality: ['cheerful', 'artistic'], description: 'Arranges wildflower bouquets at Borough Market and remembers every customer’s favorite bloom.', firstName: 'Tessa', lastName: 'Okafor' },
      { id: 'npc_301', name: 'Aiden Chen', role: 'kayak_guide', district: 'manly', city: 'sydney', age: 28, gender: 'male', personality: ['energetic', 'encouraging'], description: 'Leads sunrise kayak tours along the Manly coast and names the local dolphins for tourists.', firstName: 'Aiden', lastName: 'Chen' },
      { id: 'npc_302', name: 'Laila Hassan', role: 'calligrapher', district: 'al_fahidi', city: 'dubai', age: 39, gender: 'female', personality: ['focused', 'graceful'], description: 'Practices Arabic calligraphy in an Al Fahidi courtyard and sells framed verses on weekends.', firstName: 'Laila', lastName: 'Hassan' },
      { id: 'npc_303', name: 'Ren Suzuki', role: 'izakaya_chef', district: 'shimokitazawa', city: 'tokyo', age: 44, gender: 'male', personality: ['gruff', 'generous'], description: 'Runs a smoky Shimokitazawa izakaya where locals gather for grilled skewers and cold beer.', firstName: 'Ren', lastName: 'Suzuki' },

      // v0.98.0 — Global City Characters
      { id: 'npc_304', name: 'Yuki Tanaka', role: 'sushi_apprentice', district: 'tsukiji', city: 'tokyo', age: 24, gender: 'female', personality: ['disciplined', 'observant'], description: 'Trains at a Tsukiji sushi counter before dawn, learning to spot the freshest tuna by sight.', firstName: 'Yuki', lastName: 'Tanaka' },
      { id: 'npc_305', name: 'Alistair Finch', role: 'jazz_archivist', district: 'camden', city: 'london', age: 58, gender: 'male', personality: ['knowledgeable', 'nostalgic'], description: 'Curates a Camden basement jazz archive and can name every saxophonist on a B-side.', firstName: 'Alistair', lastName: 'Finch' },
      { id: 'npc_306', name: 'Colette Marchand', role: 'macaron_baker', district: 'saint_germain', city: 'paris', age: 37, gender: 'female', personality: ['precise', 'playful'], description: 'Bakes jewel-box macarons in Saint-Germain and hands imperfect samples to children.', firstName: 'Colette', lastName: 'Marchand' },
      { id: 'npc_307', name: 'Farid Abbasi', role: 'desert_botanist', district: 'al_quoz', city: 'dubai', age: 45, gender: 'male', personality: ['patient', 'curious'], description: 'Grows drought-resistant gardens in Al Quoz and teaches visitors about Bedouin plants.', firstName: 'Farid', lastName: 'Abbasi' },
      { id: 'npc_308', name: 'Ingrid Hoffman', role: 'kreuzberg_curator', district: 'kreuzberg', city: 'berlin', age: 33, gender: 'female', personality: ['bold', 'opinionated'], description: 'Runs a Kreuzberg gallery that turns abandoned lots into open-air art installations.', firstName: 'Ingrid', lastName: 'Hoffman' },
      { id: 'npc_309', name: 'Mateo Cruz', role: 'lucha_mask_maker', district: 'arena_mexico', city: 'mexico_city', age: 62, gender: 'male', personality: ['proud', 'artisanal'], description: 'Sews hand-stitched lucha libre masks above Arena México and signs each piece.', firstName: 'Mateo', lastName: 'Cruz' },
      { id: 'npc_310', name: 'Priya Sharma', role: 'kensington_barista', district: 'kensington', city: 'toronto', age: 29, gender: 'female', personality: ['friendly', 'fast'], description: 'Pulls espresso shots in Kensington Market and remembers every regular’s order.', firstName: 'Priya', lastName: 'Sharma' },
      { id: "npc_311", name: "Jasper O'Brien", role: "bondi_rescuer", district: "bondi", city: "sydney", age: 31, gender: "male", personality: ["brave", "laid_back"], description: "Patrols Bondi Beach as a surf rescuer and gives impromptu safety tips to tourists.", firstName: "Jasper", lastName: "O'Brien" },
      { id: 'npc_312', name: 'Naoko Fujiwara', role: 'bonsai_teacher', district: 'shinjuku', city: 'tokyo', age: 51, gender: 'female', personality: ['serene', 'wise'], description: 'Holds weekend bonsai classes from a Shinjuku rooftop and speaks in gentle metaphors.', firstName: 'Naoko', lastName: 'Fujiwara' },
      { id: 'npc_313', name: 'Rami Khalil', role: 'spice_merchant', district: 'deira', city: 'dubai', age: 48, gender: 'male', personality: ['persuasive', 'warm'], description: 'Stacks saffron and sumac in Deira’s spice souk, brewing tiny cups of cardamom coffee.', firstName: 'Rami', lastName: 'Khalil' },

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
    const factions: Faction[] = [
      {
        id: '901_music',
        name: '901 Music Scene',
        description: 'The heartbeat of Memphis music. Producers, DJs, and artists.',
        reputationNeeded: 20,
        members: ['npc_008', 'npc_010', 'npc_047', 'npc_049'],
        color: 'purple',
        rivals: ['dubai_royals'],
        influence: 65,
        hqCity: 'memphis'
      },
      {
        id: 'wall_street_elites',
        name: 'Wall Street Elites',
        description: 'The high-rollers and market movers of NYC.',
        reputationNeeded: 50,
        members: ['npc_055', 'npc_071', 'npc_074'],
        color: 'gold',
        rivals: ['dubai_royals', 'berlin_underground'],
        influence: 80,
        hqCity: 'new_york'
      },
      {
        id: 'west_memphis_locals',
        name: 'West Memphis Locals',
        description: 'The tight-knit community of West Memphis.',
        reputationNeeded: 5,
        members: ['npc_001', 'npc_003', 'npc_006', 'npc_014'],
        color: 'green',
        rivals: [],
        influence: 40,
        hqCity: 'west_memphis'
      },
      {
        id: 'berlin_underground',
        name: 'Berlin Underground',
        description: 'The heartbeat of Berlin\'s techno and street art scene.',
        reputationNeeded: 30,
        members: ['npc_087', 'npc_095', 'npc_119', 'npc_128'],
        color: 'blue',
        rivals: ['wall_street_elites'],
        influence: 55,
        hqCity: 'berlin'
      },
      {
        id: 'dubai_royals',
        name: 'Dubai Elite',
        description: 'The high-stakes movers and luxury tycoons of Dubai.',
        reputationNeeded: 50,
        members: ['npc_097', 'npc_107', 'npc_120', 'npc_132'],
        color: 'cyan',
        rivals: ['901_music', 'wall_street_elites'],
        influence: 75,
        hqCity: 'dubai'
      }
    ];

    factions.forEach(f => this.factions.set(f.id, f));
  }
  
  getFaction(id: string): Faction | undefined {
    return this.factions.get(id);
  }
  
  getAllFactions(): Faction[] {
    return Array.from(this.factions.values());
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
    
    const isFriendly = npc.relationship > 20;
    const isHostile = npc.relationship < -20;

    switch (action.type) {
      case 'greet':
        change = 2;
        if (isFriendly) {
          response = `${npc.name} smiles broadly. "Great to see you again, friend!"`;
        } else if (isHostile) {
          response = `${npc.name} scowls. "What do you want now?"`;
        } else {
          // City-specific greetings
          if (npc.city === 'memphis' || npc.city === 'west_memphis') {
            response = `${npc.name} nods. "What's good, fam."`;
          } else if (npc.city === 'littlerock') {
            response = `${npc.name} smiles. "Welcome to the Rock. How's everything?"`;
          } else if (npc.city === 'southaven') {
            response = `${npc.name} waves. "Hey there, neighbor."`;
          } else if (npc.city === 'nashville') {
            response = `${npc.name} grins. "Howdy! You here for the music?"`;
          } else if (npc.city === 'atlanta') {
            response = `${npc.name} nods. "What's up, fam. Welcome to the A."`;
          } else if (npc.city === 'new_orleans') {
            response = `${npc.name} raises a cup. "Where y'at? Welcome to NOLA."`;
          } else if (npc.city === 'new_york') {
            response = `${npc.name} nods briskly. "Hey. Walk and talk."`;
          } else if (npc.city === 'chicago') {
            response = `${npc.name} gives a firm nod. "Welcome to the Windy City."`;
          } else if (npc.city === 'los_angeles') {
            response = `${npc.name} smiles. "Hey! Enjoying the sunshine?"`;
          } else if (npc.city === 'miami') {
            response = `${npc.name} flashes a grin. "Buenas. Ready for the beach?"`;
          } else if (npc.city === 'houston') {
            response = `${npc.name} tips a hat. "Howdy. Everything's bigger here."`;
          } else if (npc.city === 'dallas') {
            response = `${npc.name} nods. "Welcome to Big D."`;
          } else if (npc.city === 'charlotte') {
            response = `${npc.name} smiles. "Hey there. Banking or BBQ?"`;
          } else if (npc.city === 'detroit') {
            response = `${npc.name} gives a solid nod. "Welcome to the D."`;
          } else if (npc.city === 'philly') {
            response = `${npc.name} gestures casually. "Yo, what's good?"`;
          } else if (npc.city === 'vegas') {
            response = `${npc.name} smirks. "Welcome to Vegas. Feeling lucky?"`;
          } else if (npc.city === 'phoenix') {
            response = `${npc.name} shields their eyes from the sun. "Hot enough for ya?"`;
          } else if (npc.city === 'seattle') {
            response = `${npc.name} smiles. "Hey. Coffee's on me if you need it."`;
          } else if (npc.city === 'london') {
            response = `${npc.name} tips their hat. "Cheers, mate. How's it going?"`;
          } else if (npc.city === 'tokyo') {
            response = `${npc.name} bows slightly. "Konnichiwa. Nice to meet you."`;
          } else if (npc.city === 'berlin') {
            response = `${npc.name} gives a curt nod. "Hallo. What brings you here?"`;
          } else if (npc.city === 'paris') {
            response = `${npc.name} smiles elegantly. "Bonjour. A fine day, isn't it?"`;
          } else if (npc.city === 'toronto') {
            response = `${npc.name} smiles politely. "Hey there. Hope you're enjoying the 6ix!"`;
          } else if (npc.city === 'mexico_city') {
            response = `${npc.name} waves. "¡Hola! Welcome to the CDMX!"`;
          } else if (npc.city === 'sydney') {
            response = `${npc.name} gives a thumbs up. "G'day! Looking for the beach?"`;
          } else if (npc.city === 'dubai') {
            response = `${npc.name} nods. "Marhaba. Welcome to Dubai."`;
          } else {
            response = `${npc.name} nods. "Hey there."`;
          }
        }
        break;
      case 'help':
        change = 10;
        response = `${npc.name} appreciates the gesture. "I won't forget this. You're alright in my book."`;
        break;
      case 'trade':
        change = action.fair ? 3 : -5;
        if (action.fair) {
          response = `${npc.name} completes the deal. "Fair trade. Respect."`;
        } else {
          response = `${npc.name} looks insulted. "You think I'm a fool? Get out of here."`;
        }
        break;
      case 'insult':
        change = -15;
        if (isHostile) {
          response = `${npc.name} spits on the ground. "Get out of my face before things get ugly."`;
        } else {
          response = `${npc.name} looks shocked. "Where I'm from, we don't talk like that. Watch it."`;
        }
        break;
    }
    
    npc.relationship = Math.max(-100, Math.min(100, npc.relationship + change));
    npc.memories.push({ action: action.type, result: change, timestamp: Date.now() });
    
    return { success: true, message: response, relationshipChange: change };
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
  lastTopic?: string;
  lastInteractionDay?: number;
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
  description: string;
  reputationNeeded: number;
  members: string[]; // NPC IDs
  color?: string;
  rivals?: string[]; // IDs of rival factions
  influence?: number; // 0-100
  hqCity?: string; // Main city of operation
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
