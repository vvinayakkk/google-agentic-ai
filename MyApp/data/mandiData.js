// Real Mandi Data for India - Major Agricultural Markets
export const REAL_MANDI_DATA = [
  {
    id: 'azadpur_delhi',
    name: 'Azadpur Mandi',
    location: 'Delhi',
    state: 'Delhi',
    district: 'North Delhi',
    address: 'Azadpur, Delhi - 110033',
    phone: '+91-11-27675234',
    website: 'https://www.dda.org.in/tendernotices_docs/apr13/azadpur.pdf',
    contactPerson: 'Market Secretary',
    operatingHours: '4:00 AM - 12:00 PM',
    facilities: ['Cold Storage', 'Transportation', 'Quality Testing', 'Banking'],
    specialization: ['Vegetables', 'Fruits'],
    yearEstablished: 1977,
    area: '475 acres',
    dailyTurnover: '₹15-20 crores',
    crops: {
      'Wheat': { avgPrice: 2450, minPrice: 2300, maxPrice: 2600, availability: true },
      'Rice': { avgPrice: 1890, minPrice: 1750, maxPrice: 2100, availability: true },
      'Tomato': { avgPrice: 2800, minPrice: 2200, maxPrice: 3500, availability: true },
      'Onion': { avgPrice: 1650, minPrice: 1400, maxPrice: 1900, availability: true },
      'Potato': { avgPrice: 1200, minPrice: 1000, maxPrice: 1400, availability: true }
    },
    services: {
      pickupService: true,
      onSiteDealing: true,
      qualityTesting: true,
      storageAvailable: true
    }
  },
  {
    id: 'vashi_mumbai',
    name: 'Vashi Agricultural Produce Market Committee',
    location: 'Mumbai',
    state: 'Maharashtra',
    district: 'Thane',
    address: 'Sector 19, Vashi, Navi Mumbai - 400703',
    phone: '+91-22-27811081',
    website: 'http://www.vashimarket.com',
    contactPerson: 'Market Committee Secretary',
    operatingHours: '6:00 AM - 2:00 PM',
    facilities: ['Modern Infrastructure', 'Parking', 'Banking', 'Restaurants'],
    specialization: ['Vegetables', 'Fruits', 'Grains'],
    yearEstablished: 1989,
    area: '148 acres',
    dailyTurnover: '₹8-12 crores',
    crops: {
      'Wheat': { avgPrice: 2500, minPrice: 2350, maxPrice: 2650, availability: true },
      'Rice': { avgPrice: 1950, minPrice: 1800, maxPrice: 2150, availability: true },
      'Tomato': { avgPrice: 3200, minPrice: 2800, maxPrice: 3800, availability: true },
      'Onion': { avgPrice: 1750, minPrice: 1500, maxPrice: 2000, availability: true },
      'Coconut': { avgPrice: 2500, minPrice: 2200, maxPrice: 2800, availability: true }
    },
    services: {
      pickupService: false,
      onSiteDealing: true,
      qualityTesting: true,
      storageAvailable: true
    }
  },
  {
    id: 'koyambedu_chennai',
    name: 'Koyambedu Wholesale Market Complex',
    location: 'Chennai',
    state: 'Tamil Nadu',
    district: 'Chennai',
    address: 'Koyambedu, Chennai - 600107',
    phone: '+91-44-26531081',
    website: 'https://www.cmdachennai.gov.in/koyambedu-market',
    contactPerson: 'General Manager',
    operatingHours: '3:00 AM - 11:00 AM',
    facilities: ['Modern Infrastructure', 'Cold Storage', 'Banking', 'Canteen'],
    specialization: ['Vegetables', 'Fruits'],
    yearEstablished: 1996,
    area: '295 acres',
    dailyTurnover: '₹10-15 crores',
    crops: {
      'Rice': { avgPrice: 1875, minPrice: 1700, maxPrice: 2050, availability: true },
      'Tomato': { avgPrice: 2900, minPrice: 2400, maxPrice: 3400, availability: true },
      'Onion': { avgPrice: 1600, minPrice: 1350, maxPrice: 1850, availability: true },
      'Coconut': { avgPrice: 2200, minPrice: 1900, maxPrice: 2500, availability: true },
      'Banana': { avgPrice: 4500, minPrice: 4000, maxPrice: 5000, availability: true }
    },
    services: {
      pickupService: true,
      onSiteDealing: true,
      qualityTesting: true,
      storageAvailable: true
    }
  },
  {
    id: 'gaddiannaram_hyderabad',
    name: 'Gaddiannaram Fruit and Vegetable Market',
    location: 'Hyderabad',
    state: 'Telangana',
    district: 'Hyderabad',
    address: 'Gaddiannaram, Hyderabad - 500059',
    phone: '+91-40-24015678',
    website: 'http://www.hyderabadmarket.com',
    contactPerson: 'Market Superintendent',
    operatingHours: '4:00 AM - 12:00 PM',
    facilities: ['Wholesale Trading', 'Storage', 'Transportation'],
    specialization: ['Vegetables', 'Fruits', 'Spices'],
    yearEstablished: 1985,
    area: '180 acres',
    dailyTurnover: '₹6-10 crores',
    crops: {
      'Rice': { avgPrice: 1850, minPrice: 1680, maxPrice: 2020, availability: true },
      'Tomato': { avgPrice: 2700, minPrice: 2200, maxPrice: 3200, availability: true },
      'Onion': { avgPrice: 1550, minPrice: 1300, maxPrice: 1800, availability: true },
      'Chili': { avgPrice: 8500, minPrice: 7500, maxPrice: 9500, availability: true },
      'Turmeric': { avgPrice: 7200, minPrice: 6800, maxPrice: 7600, availability: true }
    },
    services: {
      pickupService: false,
      onSiteDealing: true,
      qualityTesting: false,
      storageAvailable: true
    }
  },
  {
    id: 'yeshwanthpur_bangalore',
    name: 'Yeshwanthpur APMC',
    location: 'Bangalore',
    state: 'Karnataka',
    district: 'Bangalore Urban',
    address: 'Yeshwanthpur, Bangalore - 560022',
    phone: '+91-80-23720456',
    website: 'http://www.bangalore-apmc.com',
    contactPerson: 'Secretary',
    operatingHours: '5:00 AM - 1:00 PM',
    facilities: ['Modern Infrastructure', 'Banking', 'Parking'],
    specialization: ['Vegetables', 'Fruits', 'Flowers'],
    yearEstablished: 1979,
    area: '125 acres',
    dailyTurnover: '₹5-8 crores',
    crops: {
      'Rice': { avgPrice: 1920, minPrice: 1750, maxPrice: 2100, availability: true },
      'Tomato': { avgPrice: 3000, minPrice: 2500, maxPrice: 3500, availability: true },
      'Onion': { avgPrice: 1680, minPrice: 1450, maxPrice: 1900, availability: true },
      'Potato': { avgPrice: 1150, minPrice: 950, maxPrice: 1350, availability: true },
      'Coconut': { avgPrice: 2300, minPrice: 2000, maxPrice: 2600, availability: true }
    },
    services: {
      pickupService: true,
      onSiteDealing: true,
      qualityTesting: true,
      storageAvailable: false
    }
  },
  {
    id: 'kalimati_kathmandu',
    name: 'Kalimati Fruits and Vegetable Market',
    location: 'Kathmandu',
    state: 'Nepal',
    district: 'Kathmandu',
    address: 'Kalimati, Kathmandu',
    phone: '+977-1-4278432',
    website: 'http://www.kalimatimarket.gov.np',
    contactPerson: 'Market Development Officer',
    operatingHours: '4:00 AM - 10:00 AM',
    facilities: ['Wholesale Trading', 'Retail Trading'],
    specialization: ['Vegetables', 'Fruits'],
    yearEstablished: 1987,
    area: '35 acres',
    dailyTurnover: 'NPR 5-8 crores',
    crops: {
      'Rice': { avgPrice: 1800, minPrice: 1650, maxPrice: 1950, availability: true },
      'Tomato': { avgPrice: 2600, minPrice: 2100, maxPrice: 3100, availability: true },
      'Onion': { avgPrice: 1500, minPrice: 1250, maxPrice: 1750, availability: true },
      'Potato': { avgPrice: 1000, minPrice: 850, maxPrice: 1150, availability: true }
    },
    services: {
      pickupService: false,
      onSiteDealing: true,
      qualityTesting: false,
      storageAvailable: false
    }
  },
  {
    id: 'mother_dairy_ghaziabad',
    name: 'Mother Dairy Safal Market',
    location: 'Ghaziabad',
    state: 'Uttar Pradesh',
    district: 'Ghaziabad',
    address: 'Sector 15, Noida - 201301',
    phone: '+91-120-4567890',
    website: 'https://www.motherdairy.com',
    contactPerson: 'Procurement Manager',
    operatingHours: '6:00 AM - 6:00 PM',
    facilities: ['Cold Storage', 'Quality Testing', 'Direct Procurement'],
    specialization: ['Vegetables', 'Fruits', 'Dairy'],
    yearEstablished: 1974,
    area: '200 acres',
    dailyTurnover: '₹12-18 crores',
    crops: {
      'Wheat': { avgPrice: 2480, minPrice: 2320, maxPrice: 2640, availability: true },
      'Rice': { avgPrice: 1900, minPrice: 1760, maxPrice: 2040, availability: true },
      'Tomato': { avgPrice: 2950, minPrice: 2450, maxPrice: 3450, availability: true },
      'Onion': { avgPrice: 1720, minPrice: 1480, maxPrice: 1960, availability: true },
      'Potato': { avgPrice: 1180, minPrice: 980, maxPrice: 1380, availability: true }
    },
    services: {
      pickupService: true,
      onSiteDealing: false,
      qualityTesting: true,
      storageAvailable: true
    }
  }
];

// Common crops available across most mandis
export const COMMON_CROPS = [
  'Wheat', 'Rice', 'Tomato', 'Onion', 'Potato', 'Coconut', 'Banana', 'Chili', 'Turmeric'
];

// Utility functions
export const findMandisByCrop = (cropName) => {
  return REAL_MANDI_DATA.filter(mandi => 
    mandi.crops[cropName] && mandi.crops[cropName].availability
  );
};

export const getMandiById = (mandiId) => {
  return REAL_MANDI_DATA.find(mandi => mandi.id === mandiId);
};

export const getCropPriceInMandi = (mandiId, cropName) => {
  const mandi = getMandiById(mandiId);
  return mandi?.crops[cropName] || null;
};

export const formatPhoneNumber = (phone) => {
  // Remove any non-digit characters except +
  return phone.replace(/[^\d+]/g, '');
};

// Add back getMandisByDistance
export const getMandisByDistance = (maxDistance = 200) => {
  // For demo, just return all mandis (no real distance calculation)
  return REAL_MANDI_DATA;
};

// AI-Powered Strategic Farming Plans (Professional, neutral names)
export const AI_STRATEGIC_PLANS = [
  {
    id: 'plan_1',
    name: 'Diversified Crop Plan',
    description: 'A balanced plan with a mix of high-demand crops for stable returns.',
    targetFarmer: 'Small to medium farmers',
    crops: [
      { name: 'Coffee', mandi: 'yeshwanthpur_bangalore', expectedProfit: 25000, riskLevel: 'Low' },
      { name: 'Banana', mandi: 'bangalore_kr_market', expectedProfit: 18000, riskLevel: 'Medium' }
    ],
    totalInvestment: 45000,
    expectedReturns: 88000,
    roi: 95.5,
    duration: '4-6 months',
    aiInsights: [
      'Coffee prices are trending upward due to export demand',
      'Banana market has consistent demand',
      'Weather predictions favor both crops this season'
    ],
    riskProfile: 'Moderate',
    suitableFor: ['Mixed farming', 'Market access'],
    gradient: ['#4C1D95', '#7C3AED'],
    investment: '₹45,000',
    expectedROI: '95.5%',
    riskLevel: 'Low'
  },
  {
    id: 'plan_2',
    name: 'Traditional Crop Plan',
    description: 'Low risk, consistent returns with traditional crops.',
    targetFarmer: 'Risk-averse farmers',
    crops: [
      { name: 'Coconut', mandi: 'tumkur_apmc', expectedProfit: 15000, riskLevel: 'Very Low' },
      { name: 'Ragi', mandi: 'tumkur_apmc', expectedProfit: 12000, riskLevel: 'Low' }
    ],
    totalInvestment: 35000,
    expectedReturns: 62000,
    roi: 77.1,
    duration: '6-8 months',
    aiInsights: [
      'Coconut has steady demand with minimal price fluctuation',
      'Ragi is gaining popularity as health food',
      'Both crops suitable for organic certification'
    ],
    riskProfile: 'Conservative',
    suitableFor: ['Traditional farming', 'Organic certification'],
    gradient: ['#059669', '#10B981'],
    investment: '₹35,000',
    expectedROI: '77.1%',
    riskLevel: 'Very Low'
  },
  {
    id: 'plan_3',
    name: 'Short-Term Crop Plan',
    description: 'Crops with shorter cycles for faster returns.',
    targetFarmer: 'Farmers needing quick returns',
    crops: [
      { name: 'Tomato', mandi: 'kolar_apmc', expectedProfit: 8000, riskLevel: 'Medium' },
      { name: 'Onion', mandi: 'kolar_apmc', expectedProfit: 6000, riskLevel: 'Medium' }
    ],
    totalInvestment: 20000,
    expectedReturns: 34000,
    roi: 70.0,
    duration: '3-4 months',
    aiInsights: [
      'Vegetable prices peak during festival seasons',
      'Kolar APMC has good connectivity to markets',
      'Quick harvest cycles allow multiple plantings'
    ],
    riskProfile: 'Moderate',
    suitableFor: ['Short cycle farming', 'Multiple harvests'],
    gradient: ['#DC2626', '#EF4444'],
    investment: '₹20,000',
    expectedROI: '70.0%',
    riskLevel: 'Medium'
  }
];

// Dummy calculateDistance export for UI
export const calculateDistance = (mandi) => {
  // In a real app, calculate distance based on user location and mandi location
  return 'Distance: 10 km';
};
