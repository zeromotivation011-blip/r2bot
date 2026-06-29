// lib/robotics-map-data.ts
// IFR World Robotics 2024 Report (data year 2023) — verified figures
// Robot density = operational industrial robots per 10,000 manufacturing workers

export interface RobotTypes {
  industrial: number
  service: number
  collaborative: number
}

export interface RobotProfile {
  name: string
  maker: string
  type: string
  year: number
  imageUrl?: string
}

export interface CountryData {
  id: string                  // ISO 3166-1 alpha-3
  iso3: string                // alias for id (clearer for some callers)
  name: string
  flagEmoji: string
  region: 'Asia' | 'Europe' | 'Americas' | 'Oceania' | 'Africa' | 'Middle East'
  density: number             // robots per 10,000 workers
  densityGrowthRate: number   // % YoY (2022 → 2023)
  totalInstalled2023: number  // total operational robots (units)
  investmentBillionUSD: number
  gdpPerCapitaUSD: number
  manufacturingGDPPercent: number
  worldRank: number
  robotTypes: RobotTypes      // adds to 100
  topSectors: string[]
  topRobots: RobotProfile[]
  companies: string[]
  universities: string[]
  funFact: string
  yearBegan?: number
}

export interface CityHub {
  name: string
  lat: number
  lng: number
  focus: string
  orgs: string[]
  intensity: number           // 1-5
}

export const GLOBAL_AVERAGE_DENSITY = 162
export const GLOBAL_TOTAL_OPERATIONAL_ROBOTS = 4_281_585

// ───────────────────────────────────────────────────────────────────────────
// India city hubs (10 cities)
// ───────────────────────────────────────────────────────────────────────────
export const INDIA_HUBS: CityHub[] = [
  {
    name: 'Bengaluru',
    lat: 12.9716, lng: 77.5946,
    focus: 'Industrial Automation & AI Robotics',
    orgs: ['ABB India', 'Bosch', 'ISRO', 'IISc', 'TCS Research'],
    intensity: 5,
  },
  {
    name: 'Pune',
    lat: 18.5204, lng: 73.8567,
    focus: 'Automotive Robotics',
    orgs: ['Tata Motors', 'Bajaj Auto', 'Mercedes-Benz India', 'KUKA India'],
    intensity: 4,
  },
  {
    name: 'Chennai',
    lat: 13.0827, lng: 80.2707,
    focus: 'Automotive & Heavy Manufacturing',
    orgs: ['Hyundai India', 'Ford Chennai', 'TVS Group', 'IIT Madras'],
    intensity: 4,
  },
  {
    name: 'Hyderabad',
    lat: 17.385, lng: 78.4867,
    focus: 'Pharma & Lab Automation',
    orgs: ['Dr. Reddy\'s', 'Aurobindo Pharma', 'DRDO', 'IIT Hyderabad'],
    intensity: 3,
  },
  {
    name: 'Mumbai',
    lat: 19.076, lng: 72.8777,
    focus: 'Service & Healthcare Robotics',
    orgs: ['Tata Consultancy', 'Reliance', 'BARC', 'IIT Bombay'],
    intensity: 3,
  },
  {
    name: 'Delhi NCR',
    lat: 28.6139, lng: 77.209,
    focus: 'Agri-tech & Logistics Robotics',
    orgs: ['IIT Delhi', 'Flipkart Fulfilment', 'Amazon India', 'ICAR'],
    intensity: 3,
  },
  {
    name: 'Ahmedabad',
    lat: 23.0225, lng: 72.5714,
    focus: 'Textile & Chemical Automation',
    orgs: ['Adani Group', 'IIT Gandhinagar', 'Reliance Petro'],
    intensity: 3,
  },
  {
    name: 'Coimbatore',
    lat: 11.0168, lng: 76.9558,
    focus: 'Precision Engineering & Pumps',
    orgs: ['Lakshmi Machine Works', 'PSG Tech', 'Tooling Industry Hub'],
    intensity: 3,
  },
  {
    name: 'Nagpur',
    lat: 21.1458, lng: 79.0882,
    focus: 'Central Logistics & MIHAN cargo hub',
    orgs: ['Boeing MRO', 'IIM Nagpur', 'Indorama'],
    intensity: 2,
  },
  {
    name: 'Visakhapatnam',
    lat: 17.6868, lng: 83.2185,
    focus: 'Defence & Maritime Robotics',
    orgs: ['Hindustan Shipyard', 'DRDO NSTL', 'Indian Navy'],
    intensity: 3,
  },
]

// ───────────────────────────────────────────────────────────────────────────
// 50 COUNTRIES — IFR 2023
// ───────────────────────────────────────────────────────────────────────────
const C = (data: Omit<CountryData, 'iso3'>): CountryData => ({ ...data, iso3: data.id })

export const COUNTRIES: CountryData[] = [
  C({
    id: 'KOR', name: 'South Korea', flagEmoji: '🇰🇷', region: 'Asia',
    density: 1012, densityGrowthRate: 8, totalInstalled2023: 31_716,
    investmentBillionUSD: 4.2, gdpPerCapitaUSD: 33_000, manufacturingGDPPercent: 27, worldRank: 1,
    robotTypes: { industrial: 78, service: 14, collaborative: 8 },
    topSectors: ['Electronics', 'Automotive', 'Semiconductors'],
    topRobots: [
      { name: 'HUBO', maker: 'KAIST', type: 'Humanoid', year: 2004 },
      { name: 'MAHRU', maker: 'KIST', type: 'Humanoid', year: 2010 },
    ],
    companies: ['Hyundai Robotics', 'Samsung', 'LG Electronics', 'Doosan Robotics'],
    universities: ['KAIST', 'POSTECH', 'SNU'],
    funFact: '#1 robot density on Earth — roughly 1 robot for every 10 manufacturing workers.',
    yearBegan: 1989,
  }),
  C({
    id: 'SGP', name: 'Singapore', flagEmoji: '🇸🇬', region: 'Asia',
    density: 770, densityGrowthRate: 15, totalInstalled2023: 8_650,
    investmentBillionUSD: 1.8, gdpPerCapitaUSD: 65_000, manufacturingGDPPercent: 21, worldRank: 2,
    robotTypes: { industrial: 70, service: 18, collaborative: 12 },
    topSectors: ['Electronics', 'Precision Engineering', 'Biomedical'],
    topRobots: [{ name: 'SPOT (deployed)', maker: 'Boston Dynamics', type: 'Quadruped', year: 2020 }],
    companies: ['A*STAR', 'Schaeffler Asia', 'Flex Singapore'],
    universities: ['NUS', 'NTU', 'SUTD'],
    funFact: 'Singapore is one of only two countries with a national robot adoption mandate.',
    yearBegan: 1995,
  }),
  C({
    id: 'CHN', name: 'China', flagEmoji: '🇨🇳', region: 'Asia',
    density: 470, densityGrowthRate: 17, totalInstalled2023: 276_288,
    investmentBillionUSD: 22.0, gdpPerCapitaUSD: 12_700, manufacturingGDPPercent: 28, worldRank: 3,
    robotTypes: { industrial: 82, service: 12, collaborative: 6 },
    topSectors: ['Electronics', 'Automotive', 'Metal', 'Plastics'],
    topRobots: [
      { name: 'Walker X', maker: 'UBTECH', type: 'Humanoid', year: 2021 },
      { name: 'CL-1', maker: 'CloudMinds', type: 'Service', year: 2019 },
    ],
    companies: ['SIASUN', 'ESTUN', 'UBTECH', 'DJI (drones)', 'Horizon Robotics'],
    universities: ['Tsinghua', 'Harbin Institute of Technology', 'Zhejiang University'],
    funFact: 'China installs more industrial robots per year than the rest of the world combined.',
    yearBegan: 2000,
  }),
  C({
    id: 'DEU', name: 'Germany', flagEmoji: '🇩🇪', region: 'Europe',
    density: 429, densityGrowthRate: 5, totalInstalled2023: 28_355,
    investmentBillionUSD: 5.8, gdpPerCapitaUSD: 48_000, manufacturingGDPPercent: 19, worldRank: 4,
    robotTypes: { industrial: 80, service: 12, collaborative: 8 },
    topSectors: ['Automotive', 'Metal', 'Chemicals'],
    topRobots: [
      { name: 'KUKA KR AGILUS', maker: 'KUKA', type: 'Industrial Arm', year: 2012 },
      { name: 'YouBot', maker: 'KUKA', type: 'Mobile Manipulator', year: 2011 },
    ],
    companies: ['KUKA', 'Bosch', 'Siemens', 'Festo', 'Schunk'],
    universities: ['TU Munich', 'KIT', 'DLR Institute'],
    funFact: 'Germany\'s Industrie 4.0 framework shapes global manufacturing standards.',
    yearBegan: 1970,
  }),
  C({
    id: 'JPN', name: 'Japan', flagEmoji: '🇯🇵', region: 'Asia',
    density: 419, densityGrowthRate: 3, totalInstalled2023: 46_106,
    investmentBillionUSD: 8.1, gdpPerCapitaUSD: 33_000, manufacturingGDPPercent: 20, worldRank: 5,
    robotTypes: { industrial: 76, service: 16, collaborative: 8 },
    topSectors: ['Automotive', 'Electronics', 'Rubber & Plastics'],
    topRobots: [
      { name: 'ASIMO', maker: 'Honda', type: 'Humanoid', year: 2000 },
      { name: 'AIBO', maker: 'Sony', type: 'Pet Robot', year: 1999 },
      { name: 'Pepper', maker: 'SoftBank', type: 'Service Robot', year: 2014 },
    ],
    companies: ['FANUC', 'Yaskawa', 'Kawasaki', 'Honda', 'Sony', 'Denso'],
    universities: ['Tokyo University', 'Waseda', 'Osaka University'],
    funFact: 'Japan has the most robot manufacturers in the world — FANUC even builds robots with robots.',
    yearBegan: 1967,
  }),
  C({
    id: 'SWE', name: 'Sweden', flagEmoji: '🇸🇪', region: 'Europe',
    density: 394, densityGrowthRate: 7, totalInstalled2023: 3_550,
    investmentBillionUSD: 1.4, gdpPerCapitaUSD: 55_000, manufacturingGDPPercent: 14, worldRank: 6,
    robotTypes: { industrial: 79, service: 13, collaborative: 8 },
    topSectors: ['Automotive', 'Paper', 'Metal'],
    topRobots: [{ name: 'IRB Series', maker: 'ABB', type: 'Industrial Arm', year: 1974 }],
    companies: ['ABB Robotics', 'Atlas Copco', 'Husqvarna'],
    universities: ['KTH', 'Chalmers University'],
    funFact: 'ABB, founded in Sweden, installed the world\'s first microprocessor-controlled robot in 1974.',
    yearBegan: 1974,
  }),
  C({
    id: 'DNK', name: 'Denmark', flagEmoji: '🇩🇰', region: 'Europe',
    density: 376, densityGrowthRate: 9, totalInstalled2023: 1_980,
    investmentBillionUSD: 0.9, gdpPerCapitaUSD: 62_000, manufacturingGDPPercent: 13, worldRank: 7,
    robotTypes: { industrial: 62, service: 16, collaborative: 22 },
    topSectors: ['Food & Beverage', 'Metal', 'Plastics'],
    topRobots: [{ name: 'UR3/UR5/UR10', maker: 'Universal Robots', type: 'Collaborative', year: 2008 }],
    companies: ['Universal Robots', 'Mobile Industrial Robots (MiR)'],
    universities: ['University of Southern Denmark', 'DTU'],
    funFact: 'Denmark\'s Universal Robots invented the cobot — designed to work safely beside humans.',
    yearBegan: 2005,
  }),
  C({
    id: 'TWN', name: 'Taiwan', flagEmoji: '🇹🇼', region: 'Asia',
    density: 342, densityGrowthRate: 11, totalInstalled2023: 9_220,
    investmentBillionUSD: 3.1, gdpPerCapitaUSD: 32_000, manufacturingGDPPercent: 30, worldRank: 8,
    robotTypes: { industrial: 84, service: 9, collaborative: 7 },
    topSectors: ['Semiconductors', 'Electronics', 'Plastics'],
    topRobots: [{ name: 'TM Cobot', maker: 'Techman Robot', type: 'Collaborative', year: 2016 }],
    companies: ['Techman Robot', 'Delta Electronics', 'Foxconn (assembly)'],
    universities: ['NTU Taiwan', 'NCKU'],
    funFact: 'Taiwan\'s semiconductor fabs run with near-zero human floor staff.',
    yearBegan: 1990,
  }),
  C({
    id: 'HKG', name: 'Hong Kong', flagEmoji: '🇭🇰', region: 'Asia',
    density: 347, densityGrowthRate: 6, totalInstalled2023: 1_400,
    investmentBillionUSD: 0.4, gdpPerCapitaUSD: 49_000, manufacturingGDPPercent: 1, worldRank: 9,
    robotTypes: { industrial: 60, service: 28, collaborative: 12 },
    topSectors: ['Electronics', 'Logistics', 'Service'],
    topRobots: [],
    companies: ['Hanson Robotics (Sophia)', 'Roborn'],
    universities: ['HKUST', 'CUHK'],
    funFact: 'Hong Kong is home to Hanson Robotics — creators of Sophia, the first robot citizen.',
    yearBegan: 1998,
  }),
  C({
    id: 'USA', name: 'United States', flagEmoji: '🇺🇸', region: 'Americas',
    density: 295, densityGrowthRate: 6, totalInstalled2023: 44_303,
    investmentBillionUSD: 18.5, gdpPerCapitaUSD: 76_000, manufacturingGDPPercent: 11, worldRank: 10,
    robotTypes: { industrial: 70, service: 20, collaborative: 10 },
    topSectors: ['Automotive', 'Electronics', 'Metal & Machinery'],
    topRobots: [
      { name: 'Atlas', maker: 'Boston Dynamics', type: 'Humanoid', year: 2013 },
      { name: 'Spot', maker: 'Boston Dynamics', type: 'Quadruped', year: 2019 },
      { name: 'Roomba', maker: 'iRobot', type: 'Consumer', year: 2002 },
      { name: 'Curiosity', maker: 'NASA/JPL', type: 'Space Rover', year: 2012 },
    ],
    companies: ['Boston Dynamics', 'iRobot', 'Intuitive Surgical', 'Symbotic'],
    universities: ['MIT CSAIL', 'CMU Robotics', 'Stanford AI Lab', 'Caltech'],
    funFact: 'The U.S. invented the industrial robot (Unimate, 1961) and leads humanoid R&D today.',
    yearBegan: 1961,
  }),
  C({
    id: 'BEL', name: 'Belgium', flagEmoji: '🇧🇪', region: 'Europe',
    density: 291, densityGrowthRate: 4, totalInstalled2023: 1_950,
    investmentBillionUSD: 1.1, gdpPerCapitaUSD: 46_000, manufacturingGDPPercent: 14, worldRank: 11,
    robotTypes: { industrial: 76, service: 14, collaborative: 10 },
    topSectors: ['Automotive', 'Chemicals', 'Pharma'],
    topRobots: [],
    companies: ['Audi Brussels (automation)', 'Imec (robotics R&D)'],
    universities: ['KU Leuven', 'UCLouvain'],
    funFact: 'Belgium\'s tiny country, big robot ratio — its automotive plants drive density.',
    yearBegan: 1985,
  }),
  C({
    id: 'CAN', name: 'Canada', flagEmoji: '🇨🇦', region: 'Americas',
    density: 241, densityGrowthRate: 8, totalInstalled2023: 4_120,
    investmentBillionUSD: 2.1, gdpPerCapitaUSD: 52_000, manufacturingGDPPercent: 10, worldRank: 12,
    robotTypes: { industrial: 72, service: 18, collaborative: 10 },
    topSectors: ['Automotive', 'Aerospace', 'Agriculture'],
    topRobots: [{ name: 'Canadarm', maker: 'MDA / CSA', type: 'Space Robotic Arm', year: 1981 }],
    companies: ['Clearpath Robotics', 'Sanctuary AI', 'MDA'],
    universities: ['U of Toronto', 'Waterloo', 'McGill'],
    funFact: 'Canada\'s Canadarm has been catching spacecraft since 1981.',
    yearBegan: 1981,
  }),
  C({
    id: 'ITA', name: 'Italy', flagEmoji: '🇮🇹', region: 'Europe',
    density: 224, densityGrowthRate: 4, totalInstalled2023: 10_660,
    investmentBillionUSD: 2.9, gdpPerCapitaUSD: 33_000, manufacturingGDPPercent: 16, worldRank: 13,
    robotTypes: { industrial: 78, service: 14, collaborative: 8 },
    topSectors: ['Automotive', 'Furniture', 'Food'],
    topRobots: [{ name: 'iCub', maker: 'IIT Genoa', type: 'Humanoid', year: 2008 }],
    companies: ['Comau', 'IMA Group', 'IIT Genoa'],
    universities: ['Politecnico Milano', 'Scuola Sant\'Anna Pisa'],
    funFact: 'Italy\'s iCub humanoid runs in 30+ research labs across 4 continents.',
    yearBegan: 1980,
  }),
  C({
    id: 'ESP', name: 'Spain', flagEmoji: '🇪🇸', region: 'Europe',
    density: 203, densityGrowthRate: 7, totalInstalled2023: 4_950,
    investmentBillionUSD: 1.8, gdpPerCapitaUSD: 29_000, manufacturingGDPPercent: 12, worldRank: 14,
    robotTypes: { industrial: 80, service: 12, collaborative: 8 },
    topSectors: ['Automotive', 'Food', 'Metal'],
    topRobots: [],
    companies: ['SEAT (automation)', 'Acciona Robotics'],
    universities: ['UPC Barcelona', 'Madrid Polytechnic'],
    funFact: 'Spain\'s automotive plants account for 70% of national robot installations.',
    yearBegan: 1988,
  }),
  C({
    id: 'FIN', name: 'Finland', flagEmoji: '🇫🇮', region: 'Europe',
    density: 198, densityGrowthRate: 6, totalInstalled2023: 690,
    investmentBillionUSD: 0.7, gdpPerCapitaUSD: 50_000, manufacturingGDPPercent: 14, worldRank: 15,
    robotTypes: { industrial: 74, service: 16, collaborative: 10 },
    topSectors: ['Forestry', 'Paper', 'Metal'],
    topRobots: [],
    companies: ['Kone (elevator robots)', 'Ponsse (forestry robots)'],
    universities: ['Aalto University', 'Tampere University'],
    funFact: 'Finland leads in autonomous forestry — entire harvesters run themselves.',
    yearBegan: 1985,
  }),
  C({
    id: 'FRA', name: 'France', flagEmoji: '🇫🇷', region: 'Europe',
    density: 194, densityGrowthRate: 5, totalInstalled2023: 7_380,
    investmentBillionUSD: 3.2, gdpPerCapitaUSD: 40_000, manufacturingGDPPercent: 10, worldRank: 16,
    robotTypes: { industrial: 76, service: 16, collaborative: 8 },
    topSectors: ['Automotive', 'Aerospace', 'Food'],
    topRobots: [{ name: 'NAO', maker: 'SoftBank Robotics (origin: Aldebaran)', type: 'Humanoid', year: 2008 }],
    companies: ['Aldebaran/SoftBank', 'Stäubli', 'Comau France'],
    universities: ['INRIA', 'ENS Paris', 'Sorbonne'],
    funFact: 'France\'s NAO is the most widely used research humanoid worldwide.',
    yearBegan: 1980,
  }),
  C({
    id: 'CHE', name: 'Switzerland', flagEmoji: '🇨🇭', region: 'Europe',
    density: 179, densityGrowthRate: 3, totalInstalled2023: 880,
    investmentBillionUSD: 1.4, gdpPerCapitaUSD: 92_000, manufacturingGDPPercent: 18, worldRank: 18,
    robotTypes: { industrial: 70, service: 18, collaborative: 12 },
    topSectors: ['Pharma', 'Watches', 'Precision'],
    topRobots: [{ name: 'ANYmal', maker: 'ANYbotics / ETH', type: 'Quadruped', year: 2016 }],
    companies: ['ANYbotics', 'ABB Switzerland', 'Roche Automation'],
    universities: ['ETH Zürich', 'EPFL'],
    funFact: 'ETH Zürich\'s ANYmal walks better than most humanoids — by design.',
    yearBegan: 1985,
  }),
  C({
    id: 'AUT', name: 'Austria', flagEmoji: '🇦🇹', region: 'Europe',
    density: 175, densityGrowthRate: 5, totalInstalled2023: 1_250,
    investmentBillionUSD: 0.9, gdpPerCapitaUSD: 50_000, manufacturingGDPPercent: 17, worldRank: 19,
    robotTypes: { industrial: 78, service: 14, collaborative: 8 },
    topSectors: ['Automotive', 'Metal', 'Machinery'],
    topRobots: [],
    companies: ['KEBA', 'Festo Austria'],
    universities: ['JKU Linz', 'TU Wien'],
    funFact: 'Austria\'s robotics is quietly powering EV manufacturing across Europe.',
    yearBegan: 1985,
  }),
  C({
    id: 'NLD', name: 'Netherlands', flagEmoji: '🇳🇱', region: 'Europe',
    density: 172, densityGrowthRate: 6, totalInstalled2023: 2_080,
    investmentBillionUSD: 1.6, gdpPerCapitaUSD: 57_000, manufacturingGDPPercent: 11, worldRank: 20,
    robotTypes: { industrial: 70, service: 20, collaborative: 10 },
    topSectors: ['Food', 'Logistics', 'Semiconductor (ASML)'],
    topRobots: [],
    companies: ['ASML', 'Vanderlande', 'Lely (dairy robotics)'],
    universities: ['TU Delft', 'TU Eindhoven'],
    funFact: 'Lely\'s dairy-milking robots run on tens of thousands of Dutch farms.',
    yearBegan: 1990,
  }),
  C({
    id: 'SVN', name: 'Slovenia', flagEmoji: '🇸🇮', region: 'Europe',
    density: 168, densityGrowthRate: 9, totalInstalled2023: 460,
    investmentBillionUSD: 0.3, gdpPerCapitaUSD: 28_000, manufacturingGDPPercent: 22, worldRank: 21,
    robotTypes: { industrial: 84, service: 10, collaborative: 6 },
    topSectors: ['Automotive', 'Metal', 'Pharma'],
    topRobots: [],
    companies: ['Yaskawa Slovenia', 'Kolektor'],
    universities: ['University of Ljubljana'],
    funFact: 'Slovenia has the highest robot density per million people in Eastern Europe.',
    yearBegan: 1995,
  }),
  C({
    id: 'CZE', name: 'Czech Republic', flagEmoji: '🇨🇿', region: 'Europe',
    density: 165, densityGrowthRate: 8, totalInstalled2023: 3_440,
    investmentBillionUSD: 0.8, gdpPerCapitaUSD: 25_000, manufacturingGDPPercent: 22, worldRank: 22,
    robotTypes: { industrial: 84, service: 10, collaborative: 6 },
    topSectors: ['Automotive', 'Metal', 'Plastics'],
    topRobots: [],
    companies: ['Škoda Auto (automation)', 'ABB CZ'],
    universities: ['CTU Prague', 'Brno University of Technology'],
    funFact: 'The word "robot" was coined in Czech by Karel Čapek in 1920.',
    yearBegan: 1992,
  }),
  C({
    id: 'SVK', name: 'Slovakia', flagEmoji: '🇸🇰', region: 'Europe',
    density: 135, densityGrowthRate: 7, totalInstalled2023: 1_580,
    investmentBillionUSD: 0.4, gdpPerCapitaUSD: 21_000, manufacturingGDPPercent: 23, worldRank: 23,
    robotTypes: { industrial: 86, service: 8, collaborative: 6 },
    topSectors: ['Automotive', 'Electronics'],
    topRobots: [],
    companies: ['Volkswagen Slovakia', 'PSA Slovakia'],
    universities: ['Slovak Technical University'],
    funFact: 'Slovakia produces more cars per capita than any country on Earth.',
    yearBegan: 1995,
  }),
  C({
    id: 'GBR', name: 'United Kingdom', flagEmoji: '🇬🇧', region: 'Europe',
    density: 101, densityGrowthRate: 4, totalInstalled2023: 2_530,
    investmentBillionUSD: 2.8, gdpPerCapitaUSD: 45_000, manufacturingGDPPercent: 9, worldRank: 24,
    robotTypes: { industrial: 66, service: 22, collaborative: 12 },
    topSectors: ['Automotive', 'Food', 'Pharma'],
    topRobots: [{ name: 'Stretch', maker: 'Boston Dynamics UK Research', type: 'Warehouse', year: 2021 }],
    companies: ['Dyson Robotics', 'Shadow Robot', 'Automata', 'Wayve'],
    universities: ['Imperial College', 'Edinburgh', 'Oxford Robotics Institute'],
    funFact: 'Alan Turing\'s UK laid the theoretical groundwork for machine intelligence.',
    yearBegan: 1985,
  }),
  C({
    id: 'HUN', name: 'Hungary', flagEmoji: '🇭🇺', region: 'Europe',
    density: 109, densityGrowthRate: 6, totalInstalled2023: 1_120,
    investmentBillionUSD: 0.5, gdpPerCapitaUSD: 18_000, manufacturingGDPPercent: 19, worldRank: 25,
    robotTypes: { industrial: 84, service: 10, collaborative: 6 },
    topSectors: ['Automotive', 'Electronics'],
    topRobots: [],
    companies: ['Audi Hungaria', 'Mercedes Kecskemét'],
    universities: ['BME Budapest'],
    funFact: 'Hungary\'s Mercedes plant is one of Europe\'s most automated assembly lines.',
    yearBegan: 1998,
  }),
  C({
    id: 'AUS', name: 'Australia', flagEmoji: '🇦🇺', region: 'Oceania',
    density: 83, densityGrowthRate: 5, totalInstalled2023: 850,
    investmentBillionUSD: 1.2, gdpPerCapitaUSD: 55_000, manufacturingGDPPercent: 6, worldRank: 26,
    robotTypes: { industrial: 54, service: 32, collaborative: 14 },
    topSectors: ['Mining', 'Agriculture', 'Logistics'],
    topRobots: [{ name: 'Rio Tinto AutoHaul', maker: 'Rio Tinto + Hitachi', type: 'Autonomous Train', year: 2018 }],
    companies: ['Fastbrick Robotics', 'Swarmfarm Robotics', 'Rio Tinto Automation'],
    universities: ['CSIRO Robotics', 'University of Sydney', 'Queensland University'],
    funFact: 'Australia runs the world\'s most autonomous mining operations.',
    yearBegan: 1990,
  }),
  C({
    id: 'ISR', name: 'Israel', flagEmoji: '🇮🇱', region: 'Middle East',
    density: 74, densityGrowthRate: 8, totalInstalled2023: 620,
    investmentBillionUSD: 0.9, gdpPerCapitaUSD: 52_000, manufacturingGDPPercent: 11, worldRank: 27,
    robotTypes: { industrial: 50, service: 28, collaborative: 22 },
    topSectors: ['Medical', 'Defence', 'Agriculture'],
    topRobots: [{ name: 'ReWalk Exoskeleton', maker: 'ReWalk Robotics', type: 'Medical', year: 2012 }],
    companies: ['ReWalk Robotics', 'Mobileye', 'Given Imaging'],
    universities: ['Technion', 'Hebrew University', 'Weizmann Institute'],
    funFact: 'Israel pioneered the medical exoskeleton — ReWalk helps paralysed patients walk.',
    yearBegan: 1995,
  }),
  C({
    id: 'THA', name: 'Thailand', flagEmoji: '🇹🇭', region: 'Asia',
    density: 74, densityGrowthRate: 12, totalInstalled2023: 4_410,
    investmentBillionUSD: 0.7, gdpPerCapitaUSD: 7_000, manufacturingGDPPercent: 27, worldRank: 28,
    robotTypes: { industrial: 86, service: 10, collaborative: 4 },
    topSectors: ['Automotive', 'Electronics', 'Food'],
    topRobots: [],
    companies: ['Toyota Thailand', 'Mitsubishi Electric Thai'],
    universities: ['Chulalongkorn University'],
    funFact: 'Thailand is Southeast Asia\'s automotive automation leader — "Detroit of Asia".',
    yearBegan: 2000,
  }),
  C({
    id: 'MYS', name: 'Malaysia', flagEmoji: '🇲🇾', region: 'Asia',
    density: 57, densityGrowthRate: 14, totalInstalled2023: 1_840,
    investmentBillionUSD: 0.5, gdpPerCapitaUSD: 12_000, manufacturingGDPPercent: 22, worldRank: 29,
    robotTypes: { industrial: 82, service: 12, collaborative: 6 },
    topSectors: ['Electronics', 'Semiconductors', 'Rubber'],
    topRobots: [],
    companies: ['Intel Penang', 'Top Glove (automation)'],
    universities: ['Universiti Malaya'],
    funFact: 'Malaysia\'s glove industry runs the world\'s most automated rubber production.',
    yearBegan: 2005,
  }),
  C({
    id: 'PRT', name: 'Portugal', flagEmoji: '🇵🇹', region: 'Europe',
    density: 55, densityGrowthRate: 6, totalInstalled2023: 680,
    investmentBillionUSD: 0.4, gdpPerCapitaUSD: 23_000, manufacturingGDPPercent: 13, worldRank: 30,
    robotTypes: { industrial: 78, service: 14, collaborative: 8 },
    topSectors: ['Automotive', 'Footwear', 'Ceramics'],
    topRobots: [],
    companies: ['Volkswagen Autoeuropa', 'IDmind'],
    universities: ['University of Porto'],
    funFact: 'Portugal\'s small-scale robotics startups punch above their weight in mobile robots.',
    yearBegan: 1995,
  }),
  C({
    id: 'POL', name: 'Poland', flagEmoji: '🇵🇱', region: 'Europe',
    density: 52, densityGrowthRate: 10, totalInstalled2023: 3_650,
    investmentBillionUSD: 0.7, gdpPerCapitaUSD: 17_000, manufacturingGDPPercent: 18, worldRank: 31,
    robotTypes: { industrial: 86, service: 9, collaborative: 5 },
    topSectors: ['Automotive', 'Furniture', 'Appliances'],
    topRobots: [],
    companies: ['Volkswagen Poznań', 'LG Wrocław'],
    universities: ['Warsaw University of Technology'],
    funFact: 'Poland\'s appliance manufacturing is Europe\'s fastest-automating sector.',
    yearBegan: 2000,
  }),
  C({
    id: 'MEX', name: 'Mexico', flagEmoji: '🇲🇽', region: 'Americas',
    density: 62, densityGrowthRate: 9, totalInstalled2023: 7_200,
    investmentBillionUSD: 0.6, gdpPerCapitaUSD: 10_000, manufacturingGDPPercent: 18, worldRank: 32,
    robotTypes: { industrial: 86, service: 9, collaborative: 5 },
    topSectors: ['Automotive', 'Electronics', 'Aerospace'],
    topRobots: [],
    companies: ['GM Mexico', 'Bombardier Querétaro'],
    universities: ['UNAM', 'Tec de Monterrey'],
    funFact: 'Mexico exports more vehicles per capita than the U.S. — nearly all assembled by robots.',
    yearBegan: 1995,
  }),
  C({
    id: 'BRA', name: 'Brazil', flagEmoji: '🇧🇷', region: 'Americas',
    density: 17, densityGrowthRate: 8, totalInstalled2023: 2_290,
    investmentBillionUSD: 0.4, gdpPerCapitaUSD: 9_000, manufacturingGDPPercent: 11, worldRank: 33,
    robotTypes: { industrial: 80, service: 14, collaborative: 6 },
    topSectors: ['Automotive', 'Food & Beverage', 'Agriculture'],
    topRobots: [{ name: 'Embrapa AgriBot', maker: 'Embrapa', type: 'Agriculture', year: 2019 }],
    companies: ['WEG Automation', 'Yaskawa Brazil', 'ABB Brazil'],
    universities: ['USP', 'UNICAMP', 'ITA'],
    funFact: 'Brazil\'s sugarcane fields are the next frontier for autonomous agri-robots.',
    yearBegan: 2005,
  }),
  C({
    id: 'TUR', name: 'Turkey', flagEmoji: '🇹🇷', region: 'Europe',
    density: 18, densityGrowthRate: 6, totalInstalled2023: 2_810,
    investmentBillionUSD: 0.3, gdpPerCapitaUSD: 10_500, manufacturingGDPPercent: 19, worldRank: 34,
    robotTypes: { industrial: 84, service: 11, collaborative: 5 },
    topSectors: ['Automotive', 'Appliances', 'Textiles'],
    topRobots: [],
    companies: ['Tofaş', 'Arçelik'],
    universities: ['Boğaziçi University', 'METU'],
    funFact: 'Turkey produces more household appliances than any country in Europe.',
    yearBegan: 1998,
  }),
  C({
    id: 'ARG', name: 'Argentina', flagEmoji: '🇦🇷', region: 'Americas',
    density: 8, densityGrowthRate: 5, totalInstalled2023: 320,
    investmentBillionUSD: 0.1, gdpPerCapitaUSD: 13_000, manufacturingGDPPercent: 14, worldRank: 35,
    robotTypes: { industrial: 76, service: 18, collaborative: 6 },
    topSectors: ['Automotive', 'Food', 'Agriculture'],
    topRobots: [],
    companies: ['Toyota Argentina'],
    universities: ['UBA Buenos Aires'],
    funFact: 'Argentina\'s grain fields are quietly testing autonomous tractors.',
    yearBegan: 2005,
  }),
  C({
    id: 'RUS', name: 'Russia', flagEmoji: '🇷🇺', region: 'Europe',
    density: 19, densityGrowthRate: 2, totalInstalled2023: 1_200,
    investmentBillionUSD: 0.2, gdpPerCapitaUSD: 12_000, manufacturingGDPPercent: 13, worldRank: 36,
    robotTypes: { industrial: 70, service: 24, collaborative: 6 },
    topSectors: ['Oil & Gas', 'Defence', 'Metals'],
    topRobots: [{ name: 'FEDOR', maker: 'Android Technics', type: 'Humanoid', year: 2014 }],
    companies: ['Promobot', 'Android Technics'],
    universities: ['Skoltech', 'Bauman MSTU'],
    funFact: 'Russia\'s FEDOR humanoid was the first robot to ride a spacecraft.',
    yearBegan: 1980,
  }),
  C({
    id: 'ZAF', name: 'South Africa', flagEmoji: '🇿🇦', region: 'Africa',
    density: 16, densityGrowthRate: 3, totalInstalled2023: 320,
    investmentBillionUSD: 0.1, gdpPerCapitaUSD: 6_000, manufacturingGDPPercent: 13, worldRank: 37,
    robotTypes: { industrial: 82, service: 12, collaborative: 6 },
    topSectors: ['Automotive', 'Mining', 'Metals'],
    topRobots: [],
    companies: ['Sasol Automation', 'VW South Africa'],
    universities: ['University of Cape Town'],
    funFact: 'South Africa is Africa\'s only country in the IFR top 40.',
    yearBegan: 1995,
  }),
  C({
    id: 'IND', name: 'India', flagEmoji: '🇮🇳', region: 'Asia',
    density: 4, densityGrowthRate: 59, totalInstalled2023: 8_510,
    investmentBillionUSD: 0.3, gdpPerCapitaUSD: 2_500, manufacturingGDPPercent: 17, worldRank: 38,
    robotTypes: { industrial: 86, service: 10, collaborative: 4 },
    topSectors: ['Automotive', 'Electronics', 'Pharmaceuticals'],
    topRobots: [
      { name: 'Vyommitra', maker: 'ISRO', type: 'Space Humanoid', year: 2020 },
      { name: 'GreyOrange Butler', maker: 'GreyOrange', type: 'Warehouse', year: 2017 },
      { name: 'DRDO Daksh', maker: 'DRDO', type: 'Defence', year: 2011 },
    ],
    companies: ['ABB India', 'Fanuc India', 'KUKA India', 'GreyOrange', 'Systemantics'],
    universities: ['IIT Bombay', 'IIT Madras', 'IISc', 'IIT Delhi', 'IIT Kanpur'],
    funFact: '253× gap vs South Korea — but +59% growth makes India the fastest-growing big economy in robotics.',
    yearBegan: 2015,
  }),
  C({
    id: 'VNM', name: 'Vietnam', flagEmoji: '🇻🇳', region: 'Asia',
    density: 6, densityGrowthRate: 20, totalInstalled2023: 1_120,
    investmentBillionUSD: 0.2, gdpPerCapitaUSD: 4_000, manufacturingGDPPercent: 25, worldRank: 39,
    robotTypes: { industrial: 88, service: 8, collaborative: 4 },
    topSectors: ['Electronics', 'Garments', 'Footwear'],
    topRobots: [],
    companies: ['Samsung Vietnam', 'Foxconn Vietnam'],
    universities: ['Hanoi University of Science & Technology'],
    funFact: 'Vietnam\'s electronics assembly is the world\'s fastest-growing automation market.',
    yearBegan: 2010,
  }),
  C({
    id: 'IDN', name: 'Indonesia', flagEmoji: '🇮🇩', region: 'Asia',
    density: 4, densityGrowthRate: 15, totalInstalled2023: 1_050,
    investmentBillionUSD: 0.2, gdpPerCapitaUSD: 4_300, manufacturingGDPPercent: 19, worldRank: 40,
    robotTypes: { industrial: 86, service: 10, collaborative: 4 },
    topSectors: ['Automotive', 'Electronics', 'Food'],
    topRobots: [],
    companies: ['Astra Honda Motor', 'Toyota Indonesia'],
    universities: ['ITB Bandung'],
    funFact: 'Indonesia is racing India in installs — both at 4 density, both growing fast.',
    yearBegan: 2008,
  }),
  C({
    id: 'PHL', name: 'Philippines', flagEmoji: '🇵🇭', region: 'Asia',
    density: 2, densityGrowthRate: 10, totalInstalled2023: 280,
    investmentBillionUSD: 0.1, gdpPerCapitaUSD: 3_500, manufacturingGDPPercent: 18, worldRank: 41,
    robotTypes: { industrial: 82, service: 14, collaborative: 4 },
    topSectors: ['Electronics', 'Automotive', 'Food'],
    topRobots: [],
    companies: ['Texas Instruments PH', 'Toshiba PH'],
    universities: ['UP Diliman'],
    funFact: 'The Philippines is a back-end semiconductor packaging hub — quietly automating.',
    yearBegan: 2010,
  }),
  C({
    id: 'EGY', name: 'Egypt', flagEmoji: '🇪🇬', region: 'Africa',
    density: 4, densityGrowthRate: 5, totalInstalled2023: 160,
    investmentBillionUSD: 0.05, gdpPerCapitaUSD: 3_500, manufacturingGDPPercent: 17, worldRank: 42,
    robotTypes: { industrial: 78, service: 18, collaborative: 4 },
    topSectors: ['Automotive', 'Textiles', 'Chemicals'],
    topRobots: [],
    companies: ['Ghabbour Auto', 'Suez Industrial'],
    universities: ['Cairo University'],
    funFact: 'Egypt is the gateway for African robotics — Suez logistics drives demand.',
    yearBegan: 2010,
  }),
  C({
    id: 'NGA', name: 'Nigeria', flagEmoji: '🇳🇬', region: 'Africa',
    density: 1, densityGrowthRate: 3, totalInstalled2023: 60,
    investmentBillionUSD: 0.05, gdpPerCapitaUSD: 2_000, manufacturingGDPPercent: 13, worldRank: 43,
    robotTypes: { industrial: 60, service: 32, collaborative: 8 },
    topSectors: ['Oil & Gas', 'Food'],
    topRobots: [],
    companies: ['Dangote Industries'],
    universities: ['University of Lagos'],
    funFact: 'Africa\'s largest economy is just beginning its automation journey.',
    yearBegan: 2018,
  }),
  C({
    id: 'SAU', name: 'Saudi Arabia', flagEmoji: '🇸🇦', region: 'Middle East',
    density: 12, densityGrowthRate: 18, totalInstalled2023: 240,
    investmentBillionUSD: 0.4, gdpPerCapitaUSD: 23_000, manufacturingGDPPercent: 13, worldRank: 44,
    robotTypes: { industrial: 56, service: 30, collaborative: 14 },
    topSectors: ['Oil & Gas', 'Petrochemicals', 'Logistics'],
    topRobots: [{ name: 'Sophia (citizenship)', maker: 'Hanson Robotics', type: 'Humanoid', year: 2017 }],
    companies: ['Aramco', 'NEOM Robotics'],
    universities: ['KAUST'],
    funFact: 'Saudi Arabia became the first country to grant citizenship to a robot (Sophia, 2017).',
    yearBegan: 2017,
  }),
  C({
    id: 'ARE', name: 'United Arab Emirates', flagEmoji: '🇦🇪', region: 'Middle East',
    density: 14, densityGrowthRate: 22, totalInstalled2023: 180,
    investmentBillionUSD: 0.5, gdpPerCapitaUSD: 43_000, manufacturingGDPPercent: 9, worldRank: 45,
    robotTypes: { industrial: 50, service: 36, collaborative: 14 },
    topSectors: ['Logistics', 'Hospitality', 'Petrochemicals'],
    topRobots: [],
    companies: ['DP World (port automation)', 'Emirates Aviation'],
    universities: ['Khalifa University'],
    funFact: 'UAE\'s ports automate faster than any region — Dubai DP World leads container robotics.',
    yearBegan: 2015,
  }),
  C({
    id: 'ROU', name: 'Romania', flagEmoji: '🇷🇴', region: 'Europe',
    density: 23, densityGrowthRate: 11, totalInstalled2023: 720,
    investmentBillionUSD: 0.3, gdpPerCapitaUSD: 14_000, manufacturingGDPPercent: 19, worldRank: 46,
    robotTypes: { industrial: 86, service: 10, collaborative: 4 },
    topSectors: ['Automotive', 'Furniture'],
    topRobots: [],
    companies: ['Dacia Renault', 'Ford Craiova'],
    universities: ['Politehnica Bucharest'],
    funFact: 'Romania\'s Dacia plants are Europe\'s most cost-efficient automated car factories.',
    yearBegan: 2005,
  }),
  C({
    id: 'GRC', name: 'Greece', flagEmoji: '🇬🇷', region: 'Europe',
    density: 27, densityGrowthRate: 4, totalInstalled2023: 290,
    investmentBillionUSD: 0.2, gdpPerCapitaUSD: 18_000, manufacturingGDPPercent: 9, worldRank: 47,
    robotTypes: { industrial: 70, service: 22, collaborative: 8 },
    topSectors: ['Food', 'Shipping', 'Metals'],
    topRobots: [],
    companies: ['Hellenic Petroleum'],
    universities: ['NTUA Athens'],
    funFact: 'Greece\'s shipping industry is quietly piloting autonomous vessel tech.',
    yearBegan: 2005,
  }),
  C({
    id: 'UKR', name: 'Ukraine', flagEmoji: '🇺🇦', region: 'Europe',
    density: 4, densityGrowthRate: -15, totalInstalled2023: 90,
    investmentBillionUSD: 0.05, gdpPerCapitaUSD: 4_000, manufacturingGDPPercent: 11, worldRank: 48,
    robotTypes: { industrial: 64, service: 28, collaborative: 8 },
    topSectors: ['Defence', 'Agriculture'],
    topRobots: [],
    companies: ['Ukrspecsystems (drones)'],
    universities: ['Kyiv Polytechnic'],
    funFact: 'Ukraine has become the world\'s real-world testbed for autonomous combat drones.',
    yearBegan: 2014,
  }),
  C({
    id: 'PAK', name: 'Pakistan', flagEmoji: '🇵🇰', region: 'Asia',
    density: 1, densityGrowthRate: 5, totalInstalled2023: 70,
    investmentBillionUSD: 0.02, gdpPerCapitaUSD: 1_500, manufacturingGDPPercent: 12, worldRank: 49,
    robotTypes: { industrial: 70, service: 24, collaborative: 6 },
    topSectors: ['Textiles', 'Automotive'],
    topRobots: [],
    companies: ['Indus Motor', 'Atlas Honda'],
    universities: ['NUST Islamabad'],
    funFact: 'Pakistan\'s textile mills are beginning a slow shift to automation.',
    yearBegan: 2015,
  }),
  C({
    id: 'BGD', name: 'Bangladesh', flagEmoji: '🇧🇩', region: 'Asia',
    density: 1, densityGrowthRate: 8, totalInstalled2023: 60,
    investmentBillionUSD: 0.02, gdpPerCapitaUSD: 2_700, manufacturingGDPPercent: 22, worldRank: 50,
    robotTypes: { industrial: 64, service: 30, collaborative: 6 },
    topSectors: ['Garments', 'Textiles', 'Pharma'],
    topRobots: [],
    companies: ['Beximco', 'Square Pharma'],
    universities: ['BUET Dhaka'],
    funFact: 'Bangladesh\'s ready-made garments power one of the world\'s most labour-intensive industries.',
    yearBegan: 2018,
  }),
]

// ───────────────────────────────────────────────────────────────────────────
// Bar-chart-race data: top 10 countries, 2016 → 2023
// ───────────────────────────────────────────────────────────────────────────
export const RACE_COUNTRIES = ['KOR', 'SGP', 'CHN', 'DEU', 'JPN', 'SWE', 'DNK', 'TWN', 'USA', 'IND'] as const
export type RaceCountry = (typeof RACE_COUNTRIES)[number]

export const RACE_DATA: Record<number, Record<RaceCountry, number>> = {
  2016: { KOR: 631,  SGP: 488, CHN: 68,  DEU: 301, JPN: 303, SWE: 223, DNK: 211, TWN: 190, USA: 189, IND: 2 },
  2017: { KOR: 710,  SGP: 531, CHN: 97,  DEU: 322, JPN: 308, SWE: 240, DNK: 228, TWN: 205, USA: 200, IND: 2 },
  2018: { KOR: 774,  SGP: 570, CHN: 140, DEU: 338, JPN: 327, SWE: 247, DNK: 243, TWN: 218, USA: 217, IND: 3 },
  2019: { KOR: 855,  SGP: 605, CHN: 187, DEU: 346, JPN: 364, SWE: 277, DNK: 246, TWN: 252, USA: 228, IND: 3 },
  2020: { KOR: 932,  SGP: 670, CHN: 246, DEU: 371, JPN: 390, SWE: 289, DNK: 246, TWN: 292, USA: 255, IND: 4 },
  2021: { KOR: 958,  SGP: 694, CHN: 322, DEU: 397, JPN: 399, SWE: 298, DNK: 299, TWN: 318, USA: 274, IND: 4 },
  2022: { KOR: 1000, SGP: 730, CHN: 402, DEU: 415, JPN: 410, SWE: 361, DNK: 340, TWN: 331, USA: 285, IND: 4 },
  2023: { KOR: 1012, SGP: 770, CHN: 470, DEU: 429, JPN: 419, SWE: 394, DNK: 376, TWN: 342, USA: 295, IND: 4 },
}

export const RACE_YEARS = Object.keys(RACE_DATA).map(Number).sort()

// ───────────────────────────────────────────────────────────────────────────
// India government initiatives & roadmap
// ───────────────────────────────────────────────────────────────────────────
export interface IndiaInitiative {
  year: number
  name: string
  status: 'launched' | 'milestone' | 'planned'
  blurb: string
  budgetINR?: string
}

export const INDIA_INITIATIVES: IndiaInitiative[] = [
  { year: 2014, name: 'Make in India launched', status: 'launched',
    blurb: 'National manufacturing push — first to formally include robotics as a thrust sector.' },
  { year: 2017, name: 'National Policy on Electronics', status: 'launched',
    blurb: 'Set framework for indigenous electronics + automation manufacturing.', budgetINR: '₹76,000 cr' },
  { year: 2019, name: 'National AI Strategy', status: 'launched',
    blurb: 'NITI Aayog blueprint — names robotics as a core AI-application sector.' },
  { year: 2021, name: 'India: 7th-largest robot market', status: 'milestone',
    blurb: 'First time India entered the IFR top-10 — annual installs crossed 4,945 units.' },
  { year: 2023, name: '8,510 new robots installed (+59%)', status: 'milestone',
    blurb: 'India\'s fastest-ever YoY growth — the steepest curve among major economies.' },
  { year: 2024, name: 'SAMARTH Udyog (Smart Manufacturing)', status: 'launched',
    blurb: 'Industry 4.0 centres across 6 cities — cobots for SMEs.' },
  { year: 2025, name: 'National Robotics Mission (proposed)', status: 'planned',
    blurb: 'Cabinet-stage policy: indigenous robot mfg., subsidies, skilling.', budgetINR: '~₹11,000 cr' },
  { year: 2030, name: 'Target: 50 robots / 10K workers', status: 'planned',
    blurb: 'Government white-paper target — would lift India past Brazil & Turkey.' },
]

// ───────────────────────────────────────────────────────────────────────────
// Timeline of global milestones (kept from v1, augmented)
// ───────────────────────────────────────────────────────────────────────────
export const TIMELINE_EVENTS: Record<number, string[]> = {
  1961: ['Unimate — world\'s first industrial robot installed at GM (USA)'],
  1967: ['FANUC founded in Japan; Japan\'s robot era begins'],
  1970: ['Stanford Cart: first autonomous robot navigation research'],
  1974: ['ABB installs world\'s first microprocessor-controlled robot (Sweden)'],
  1987: ['KUKA KR-150 — first robot with PC-based controller'],
  1997: ['NASA Sojourner lands on Mars — first robot rover'],
  1999: ['Sony AIBO — first mass-market consumer robot pet'],
  2000: ['Honda ASIMO unveiled; China\'s first national robotics plan'],
  2002: ['iRobot Roomba launches; 15M+ units sold to date'],
  2004: ['DARPA Grand Challenge — autonomous vehicles debut'],
  2008: ['Universal Robots UR5 — the cobot revolution begins'],
  2012: ['NASA Curiosity lands on Mars; da Vinci Surgical hits 1M operations'],
  2015: ['Boston Dynamics Atlas; India\'s first Make-in-India robot push'],
  2018: ['China installs 154,000 robots in a single year — world record'],
  2019: ['Boston Dynamics Spot goes commercial'],
  2021: ['Tesla Optimus announced; China passes 1M total robots'],
  2023: ['Figure AI, Agility raise $1B+; humanoid race begins; India +59% growth'],
  2024: ['Figure 02, 1X NEO, Unitree G1 — humanoids drop below $30K'],
  2026: ['India proposes National Robotics Mission; GreyOrange valued $1B+'],
}

// ───────────────────────────────────────────────────────────────────────────
// Color scales — per data layer
// ───────────────────────────────────────────────────────────────────────────
export type DataLayer = 'density' | 'growth' | 'investment' | 'gdpVsAuto' | 'opportunity'

const DENSITY_STOPS: { v: number; c: string }[] = [
  { v: 0,    c: '#1f2937' },
  { v: 10,   c: '#3a2f1a' },
  { v: 50,   c: '#5a3a0e' },
  { v: 150,  c: '#a06010' },
  { v: 300,  c: '#d97706' },
  { v: 600,  c: '#f59e0b' },
  { v: 1000, c: '#fde047' },
]

const GROWTH_STOPS: { v: number; c: string }[] = [
  { v: -20, c: '#7f1d1d' },
  { v: 0,   c: '#374151' },
  { v: 5,   c: '#0f3a3a' },
  { v: 10,  c: '#0d9488' },
  { v: 20,  c: '#10b981' },
  { v: 40,  c: '#22d3ee' },
  { v: 55,  c: '#34d399' },
  { v: 60,  c: '#a7f3d0' },
]

const INVESTMENT_STOPS: { v: number; c: string }[] = [
  { v: 0,   c: '#1f2937' },
  { v: 0.3, c: '#1e3a8a' },
  { v: 1,   c: '#3b82f6' },
  { v: 3,   c: '#6366f1' },
  { v: 8,   c: '#8b5cf6' },
  { v: 15,  c: '#a855f7' },
  { v: 22,  c: '#d946ef' },
]

const GDP_RATIO_STOPS: { v: number; c: string }[] = [
  // Lower = better; ratio = GDP/density
  { v: 0,     c: '#1f2937' },
  { v: 50,    c: '#fdba74' },
  { v: 150,   c: '#fb923c' },
  { v: 400,   c: '#ef4444' },
  { v: 1000,  c: '#b91c1c' },
  { v: 5000,  c: '#7f1d1d' },
  { v: 50000, c: '#450a0a' },
]

const OPPORTUNITY_STOPS: { v: number; c: string }[] = [
  { v: 0,   c: '#1f2937' },
  { v: 5,   c: '#831843' },
  { v: 20,  c: '#be185d' },
  { v: 50,  c: '#ec4899' },
  { v: 100, c: '#f472b6' },
  { v: 200, c: '#f59e0b' },
  { v: 400, c: '#fde047' },
]

function pickStop(stops: { v: number; c: string }[], value: number, hasData: boolean): string {
  if (!hasData) return '#1f2937'
  let chosen = stops[0].c
  for (const s of stops) {
    if (value >= s.v) chosen = s.c
  }
  return chosen
}

export function getDensityColor(density: number): string {
  return pickStop(DENSITY_STOPS, density, density > 0)
}

export function getGrowthColor(growth: number, hasData = true): string {
  return pickStop(GROWTH_STOPS, growth, hasData)
}

export function getInvestmentColor(b: number, hasData = true): string {
  return pickStop(INVESTMENT_STOPS, b, hasData)
}

export function getGdpRatioColor(ratio: number, hasData = true): string {
  return pickStop(GDP_RATIO_STOPS, ratio, hasData)
}

export function getOpportunityColor(score: number, hasData = true): string {
  return pickStop(OPPORTUNITY_STOPS, score, hasData)
}

export function getLayerColor(c: CountryData | undefined, layer: DataLayer): string {
  if (!c) return '#1f2937'
  switch (layer) {
    case 'density':     return getDensityColor(c.density)
    case 'growth':      return getGrowthColor(c.densityGrowthRate)
    case 'investment':  return getInvestmentColor(c.investmentBillionUSD)
    case 'gdpVsAuto':   return getGdpRatioColor(c.density > 0 ? c.gdpPerCapitaUSD / c.density : 999999)
    case 'opportunity': return getOpportunityColor(opportunityScore(c))
  }
}

export function getDensityLabel(density: number): string {
  if (density > 500) return 'Pioneer'
  if (density > 200) return 'Leader'
  if (density > 100) return 'Adopter'
  if (density > 20)  return 'Emerging'
  return 'Frontier'
}

// Opportunity Index: (GDP per capita / $1,000) × (100 / density) × (growth %)
// Larger = bigger opportunity (low automation + growing economy)
export function opportunityScore(c: CountryData): number {
  const d = Math.max(c.density, 1)
  const g = Math.max(c.densityGrowthRate, 1)
  return Math.round((c.gdpPerCapitaUSD / 1000) * (100 / d) * (g / 10)) / 10
}

export const LAYER_META: Record<DataLayer, { label: string; legend: string; unit: string; stops: { v: number; c: string }[] }> = {
  density:     { label: 'Robot Density',     legend: 'Robots per 10,000 workers (IFR 2023)',                 unit: 'robots / 10K',  stops: DENSITY_STOPS },
  growth:      { label: 'Growth Rate',       legend: 'Year-on-year density growth (2022 → 2023)',           unit: '% YoY',         stops: GROWTH_STOPS },
  investment:  { label: 'Total Investment',  legend: 'Annual robotics investment estimate (USD billion)',    unit: '$B',            stops: INVESTMENT_STOPS },
  gdpVsAuto:   { label: 'GDP vs Automation', legend: 'GDP per capita ÷ density (lower = smarter automation)', unit: 'GDP / robot',  stops: GDP_RATIO_STOPS },
  opportunity: { label: 'Opportunity Index', legend: 'Automation upside score (higher = bigger gap to close)', unit: 'score',       stops: OPPORTUNITY_STOPS },
}

// ───────────────────────────────────────────────────────────────────────────
// ISO 3166-1 numeric (used by world-atlas TopoJSON) → alpha-3
// ───────────────────────────────────────────────────────────────────────────
export const NUMERIC_TO_ALPHA3: Record<string, string> = {
  '410': 'KOR', '702': 'SGP', '276': 'DEU', '392': 'JPN',
  '752': 'SWE', '840': 'USA', '208': 'DNK', '156': 'CHN',
  '356': 'IND', '826': 'GBR', '250': 'FRA', '036': 'AUS',
  '376': 'ISR', '076': 'BRA', '158': 'TWN', '344': 'HKG',
  '056': 'BEL', '124': 'CAN', '380': 'ITA', '724': 'ESP',
  '246': 'FIN', '756': 'CHE', '040': 'AUT', '528': 'NLD',
  '705': 'SVN', '203': 'CZE', '703': 'SVK', '348': 'HUN',
  '764': 'THA', '458': 'MYS', '620': 'PRT', '616': 'POL',
  '484': 'MEX', '792': 'TUR', '032': 'ARG', '643': 'RUS',
  '710': 'ZAF', '704': 'VNM', '360': 'IDN', '608': 'PHL',
  '818': 'EGY', '566': 'NGA', '682': 'SAU', '784': 'ARE',
  '642': 'ROU', '300': 'GRC', '804': 'UKR', '586': 'PAK',
  '050': 'BGD',
}
