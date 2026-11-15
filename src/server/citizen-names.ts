// THE OPEN WORLD — v0.108.20 §45 ITEM 41: CITIZEN NAME GENERATION
// Pools per country, keyed by the WORLD_CITIES country code of the city
// (USA, UK, Japan, France, Germany, UAE, Mexico, Canada, Australia).
// >= 30 first + >= 30 last names per pool (>= 900 combinations).
// Real common names, respectful, no joke names, no stereotypes.
// Seeded pick: same (country + seed) always yields the same name, and the
// name is STORED on the citizen record so it never re-rolls.
// Display: Japan family-first ("Tanaka Yuki"), all others given-first.
// Existing roster NPCs are untouched: this generator applies only to
// newly generated citizens.

import { hashStr } from './features-0.108.20.js';

export interface NamePool { first: string[]; last: string[] }

export const NAME_POOLS: Record<string, NamePool> = {
  USA: {
    first: ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Daniel', 'Nancy', 'Matthew', 'Lisa', 'Anthony', 'Betty', 'Mark', 'Margaret', 'Donald', 'Sandra', 'Steven', 'Ashley', 'Paul', 'Kimberly', 'Andrew', 'Emily', 'Joshua', 'Michelle', 'Kenneth', 'Dorothy'],
    last: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores'],
  },
  UK: {
    first: ['Oliver', 'Amelia', 'George', 'Isla', 'Harry', 'Ava', 'Jack', 'Grace', 'Leo', 'Sophia', 'Arthur', 'Freya', 'Henry', 'Ivy', 'Archie', 'Ella', 'Oscar', 'Mia', 'Alfie', 'Luna', 'Thomas', 'Evie', 'James', 'Elsie', 'William', 'Florence', 'Edward', 'Poppy', 'Charles', 'Harper', 'Daniel', 'Willow', 'Samuel', 'Isabella', 'Joseph', 'Charlotte', 'Benjamin', 'Matilda', 'Alexander', 'Lily'],
    last: ['Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Johnson', 'Davies', 'Robinson', 'Wright', 'Thompson', 'Evans', 'Walker', 'White', 'Roberts', 'Green', 'Hall', 'Wood', 'Jackson', 'Clarke', 'Harris', 'Patel', 'Turner', 'Hill', 'Cooper', 'Ward', 'Moore', 'Clark', 'King', 'Morgan', 'Baker', 'Harrison', 'Young', 'Martin', 'Allen', 'Scott', 'Phillips', 'Carter', 'Mitchell', 'Adams'],
  },
  Japan: {
    first: ['Yuki', 'Hiroto', 'Aoi', 'Ren', 'Hina', 'Sota', 'Yui', 'Haruto', 'Mei', 'Kaito', 'Sakura', 'Daiki', 'Rin', 'Yuto', 'Airi', 'Takumi', 'Nana', 'Shota', 'Yuna', 'Riku', 'Ayaka', 'Kenta', 'Misaki', 'Tatsuya', 'Kaori', 'Yusuke', 'Emi', 'Naoki', 'Rei', 'Saki', 'Kazuki', 'Mio', 'Taro', 'Yoko', 'Kenji', 'Akari', 'Hiroshi', 'Mai', 'Daisuke', 'Noa'],
    last: ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato', 'Yoshida', 'Yamada', 'Sasaki', 'Yamaguchi', 'Matsumoto', 'Inoue', 'Kimura', 'Hayashi', 'Shimizu', 'Yamazaki', 'Mori', 'Abe', 'Ikeda', 'Hashimoto', 'Yamashita', 'Ishikawa', 'Nakajima', 'Ogawa', 'Ishii', 'Hasegawa', 'Goto', 'Kondo', 'Saito', 'Sakamoto', 'Endo', 'Aoki', 'Fujita', 'Nishimura', 'Fukuda', 'Ota'],
  },
  France: {
    first: ['Lucas', 'Emma', 'Hugo', 'Jade', 'Louis', 'Alice', 'Gabriel', 'Chloe', 'Raphael', 'Lea', 'Jules', 'Manon', 'Adam', 'Anna', 'Nathan', 'Camille', 'Ethan', 'Sarah', 'Theo', 'Juliette', 'Paul', 'Eva', 'Arthur', 'Ines', 'Noah', 'Lena', 'Antoine', 'Zoe', 'Maxime', 'Louise', 'Thomas', 'Charlotte', 'Baptiste', 'Ambre', 'Simon', 'Clara', 'Martin', 'Rose', 'Victor', 'Adele'],
    last: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'Andre', 'Lefevre', 'Mercier', 'Blanc', 'Guerin', 'Boyer', 'Garnier', 'Faure', 'Roussel', 'Chevalier', 'Bonnet', 'Dupont', 'Lambert', 'Fontaine', 'Rousseau', 'Vincent', 'Muller', 'Faure'],
  },
  Germany: {
    first: ['Lukas', 'Mia', 'Jonas', 'Hannah', 'Leon', 'Emma', 'Finn', 'Sofia', 'Paul', 'Emilia', 'Felix', 'Lena', 'Maximilian', 'Lea', 'Moritz', 'Anna', 'Tim', 'Laura', 'Niklas', 'Julia', 'Jan', 'Lisa', 'David', 'Sarah', 'Julian', 'Marie', 'Simon', 'Katharina', 'Tobias', 'Johanna', 'Christian', 'Charlotte', 'Michael', 'Sophie', 'Andreas', 'Clara', 'Stefan', 'Nina', 'Markus', 'Elena'],
    last: ['Muller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Richter', 'Klein', 'Wolf', 'Schroder', 'Neumann', 'Schwarz', 'Zimmermann', 'Braun', 'Kruger', 'Hofmann', 'Hartmann', 'Lang', 'Werner', 'Schmitt', 'Krause', 'Meier', 'Lehmann', 'Schmid', 'Schulze', 'Maier', 'Kohler', 'Herrmann', 'Konig', 'Walter', 'Mayer', 'Huber', 'Kaiser', 'Fuchs', 'Peters', 'Lehmann'],
  },
  UAE: {
    first: ['Mohammed', 'Fatima', 'Ahmed', 'Aisha', 'Ali', 'Mariam', 'Omar', 'Latifa', 'Khalid', 'Noora', 'Saeed', 'Hessa', 'Rashid', 'Maryam', 'Yousef', 'Shamma', 'Abdullah', 'Amina', 'Hamad', 'Sara', 'Sultan', 'Layla', 'Faisal', 'Noura', 'Tariq', 'Dana', 'Zayed', 'Reem', 'Salem', 'Mona', 'Hassan', 'Hind', 'Ibrahim', 'Alya', 'Nasser', 'Khadija', 'Jamal', 'Salma', 'Karim', 'Rania'],
    last: ['Al Mansoori', 'Al Suwaidi', 'Al Falasi', 'Al Hammadi', 'Al Mazrouei', 'Al Shamsi', 'Al Ameri', 'Al Kaabi', 'Al Nuaimi', 'Al Dhaheri', 'Al Hosani', 'Al Muhairi', 'Al Falahi', 'Al Zaabi', 'Al Marri', 'Al Shehhi', 'Al Blooshi', 'Al Qubaisi', 'Al Rashidi', 'Al Ketbi', 'Al Mansouri', 'Al Hashimi', 'Al Ali', 'Al Balushi', 'Al Khouri', 'Al Sayegh', 'Al Tayer', 'Al Ghurair', 'Al Futtaim', 'Al Habtoor', 'Al Jaber', 'Al Maktoum', 'Al Nahyan', 'Al Qasimi', 'Al Sharqi', 'Al Mualla', 'Al Nuaimi', 'Al Suwaidi', 'Al Falasi', 'Al Mansoori'],
  },
  Mexico: {
    first: ['Santiago', 'Valentina', 'Mateo', 'Camila', 'Sebastian', 'Ximena', 'Alejandro', 'Sofia', 'Leonardo', 'Martina', 'Daniel', 'Isabella', 'Miguel', 'Lucia', 'Diego', 'Emma', 'Carlos', 'Victoria', 'Jorge', 'Renata', 'Luis', 'Paula', 'Fernando', 'Andrea', 'Ricardo', 'Natalia', 'Javier', 'Fernanda', 'Andres', 'Regina', 'Pablo', 'Alejandra', 'Manuel', 'Mariana', 'Roberto', 'Daniela', 'Eduardo', 'Gabriela', 'Francisco', 'Valeria'],
    last: ['Hernandez', 'Garcia', 'Martinez', 'Lopez', 'Gonzalez', 'Perez', 'Sanchez', 'Ramirez', 'Torres', 'Flores', 'Rivera', 'Vasquez', 'Reyes', 'Morales', 'Jimenez', 'Herrera', 'Medina', 'Castro', 'Ortiz', 'Nunez', 'Mendez', 'Chavez', 'Guerrero', 'Rojas', 'Delgado', 'Vega', 'Ortiz', 'Munoz', 'Rojas', 'Diaz', 'Contreras', 'Luna', 'Juarez', 'Cortes', 'Salazar', 'Dominguez', 'Vargas', 'Ramos', 'Mendoza', 'Aguilar'],
  },
  Canada: {
    first: ['Liam', 'Emma', 'Noah', 'Olivia', 'Lucas', 'Ava', 'Logan', 'Sophia', 'James', 'Isabella', 'Ethan', 'Mia', 'Mason', 'Charlotte', 'Benjamin', 'Amelia', 'Jack', 'Harper', 'Henry', 'Evelyn', 'Owen', 'Abigail', 'Daniel', 'Ella', 'Carter', 'Scarlett', 'Jayden', 'Grace', 'Luke', 'Chloe', 'Ryan', 'Victoria', 'Nathan', 'Riley', 'Adam', 'Aria', 'Thomas', 'Lily', 'Samuel', 'Zoey'],
    last: ['Smith', 'Brown', 'Tremblay', 'Martin', 'Roy', 'Wilson', 'MacDonald', 'Gagnon', 'Johnson', 'Taylor', 'White', 'Thompson', 'Leblanc', 'Anderson', 'Cote', 'Lee', 'Bouchard', 'Williams', 'Jones', 'Gauthier', 'Miller', 'Davis', 'Lavoie', 'Moore', 'Fortin', 'Pelletier', 'Martin', 'Bergeron', 'Wong', 'Campbell', 'Richard', 'Singh', 'Girard', 'Morin', 'Lefebvre', 'Chen', 'Belanger', 'Clarke', 'Nguyen', 'Bernard'],
  },
  Australia: {
    first: ['Oliver', 'Charlotte', 'Jack', 'Amelia', 'Noah', 'Isla', 'William', 'Mia', 'James', 'Grace', 'Henry', 'Sophie', 'Lucas', 'Evie', 'Thomas', 'Matilda', 'Liam', 'Ella', 'Alexander', 'Harper', 'Oscar', 'Ava', 'Ethan', 'Lily', 'Mason', 'Ruby', 'Logan', 'Zoe', 'Archie', 'Ivy', 'Samuel', 'Freya', 'Benjamin', 'Willow', 'Daniel', 'Poppy', 'Joseph', 'Isabella', 'Max', 'Chloe'],
    last: ['Smith', 'Jones', 'Williams', 'Brown', 'Wilson', 'Taylor', 'Johnson', 'White', 'Martin', 'Anderson', 'Thomas', 'Thompson', 'Nguyen', 'Walker', 'Harris', 'Lee', 'Ryan', 'Robinson', 'Kelly', 'King', 'Davis', 'Wright', 'Evans', 'Roberts', 'Green', 'Hall', 'Wood', 'Jackson', 'Clarke', 'Patel', 'Turner', 'Hill', 'Cooper', 'Ward', 'Moore', 'Clark', 'Morgan', 'Baker', 'Harrison', 'Young'],
  },
};

// Seeded pick: deterministic per (country + seed). Falls back to pool[0]
// on any lookup failure; never returns an empty name.
export function generateCitizenName(countryCode: string, seed: string): { firstName: string; lastName: string; display: string } {
  const pool = NAME_POOLS[countryCode] ?? NAME_POOLS['USA']!;
  const h = hashStr(`${countryCode}|${seed}`);
  const firstName = pool.first[h % pool.first.length] ?? pool.first[0]!;
  const lastName = pool.last[Math.floor(h / pool.first.length) % pool.last.length] ?? pool.last[0]!;
  const display = countryCode === 'Japan' ? `${lastName} ${firstName}` : `${firstName} ${lastName}`;
  return { firstName, lastName, display };
}

export function displayCitizenName(firstName: string, lastName: string, countryCode: string): string {
  return countryCode === 'Japan' ? `${lastName} ${firstName}` : `${firstName} ${lastName}`;
}
