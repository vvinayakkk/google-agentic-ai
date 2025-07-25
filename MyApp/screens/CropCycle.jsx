import React, { useState, useEffect, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  TextInput,
  LayoutAnimation,
  UIManager,
  Platform,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

// --- MOCK DATABASE & CONFIG ---
// This detailed object simulates a backend database feeding the AI.
const MOCK_DB = {
    CROP_DATA: [
      { id: 'sugarcane', name: 'Sugarcane', image: 'https://placehold.co/200x200/2ECC71/FFFFFF?text=Sugarcane', baseRevenue: 85000, baseCost: 32000, waterRequirement: 'High', season: 'Kharif', duration: '12-16 months' },
      { id: 'cotton', name: 'Cotton', image: 'https://placehold.co/200x200/ECF0F1/000000?text=Cotton', baseRevenue: 60000, baseCost: 25000, waterRequirement: 'Medium', season: 'Kharif', duration: '5-6 months' },
      { id: 'wheat', name: 'Wheat', image: 'https://placehold.co/200x200/F39C12/FFFFFF?text=Wheat', baseRevenue: 55000, baseCost: 22000, waterRequirement: 'Medium', season: 'Rabi', duration: '4-5 months' },
      { id: 'soybean', name: 'Soybean', image: 'https://placehold.co/200x200/8E44AD/FFFFFF?text=Soybean', baseRevenue: 50000, baseCost: 20000, waterRequirement: 'Medium', season: 'Kharif', duration: '3-4 months' },
      { id: 'maize', name: 'Maize', image: 'https://placehold.co/200x200/E67E22/FFFFFF?text=Maize', baseRevenue: 48000, baseCost: 18000, waterRequirement: 'Low-Medium', season: 'Both', duration: '3-4 months' },
      { id: 'rice', name: 'Rice', image: 'https://placehold.co/200x200/3498DB/FFFFFF?text=Rice', baseRevenue: 52000, baseCost: 24000, waterRequirement: 'Very High', season: 'Kharif', duration: '4-5 months' },
    ],
    DASHBOARD_TILES: [
      { id: 'planner', title: 'AI Crop Analysis', icon: '🧮', description: 'Advanced crop selection & profit optimization' },
      { id: 'market', title: 'Market Intelligence', icon: '📈', description: 'Real-time prices & selling strategy' },
      { id: 'credit', title: 'Smart Financing', icon: '💰', description: 'Loan comparison & eligibility analysis' },
      { id: 'schemes', title: 'Government Benefits', icon: '🏛️', description: 'Subsidies & scheme recommendations' },
      { id: 'insurance', title: 'Risk Protection', icon: '🛡️', description: 'Crop insurance & risk assessment' },
      { id: 'rentals', title: 'Resource Optimizer', icon: '🚜', description: 'Equipment & labor cost analysis' },
      { id: 'weather', title: 'Weather Analytics', icon: '🌦️', description: 'Climate patterns & farming calendar' },
      { id: 'soil', title: 'Soil Health', icon: '🌱', description: 'Nutrient analysis & fertilizer planning' },
      { id: 'masterPlan', title: 'Master Execution Plan', icon: '📋', description: 'Complete farming roadmap & timeline' },
    ],
    MARKET_ANALYSIS: {
        sugarcane: { 
            msp: '₹3,400 / quintal', 
            currentPrice: '₹3,550 / quintal',
            trend: 'Upward (+4.2%)', 
            forecast: 'Very Positive', 
            recommendation: 'Hold & Sell in Feb 2026', 
            reason: 'Post-harvest demand from mills is expected to peak in February, potentially increasing prices by 5-8%. Sugar industry reports indicate strong export demand.',
            marketFactors: [
                'Export demand increased by 12% this quarter',
                'Government announced additional ethanol blending targets',
                'Reduced production in neighboring states due to drought',
                'Industrial sugar demand up 8% year-over-year'
            ],
            priceHistory: [3200, 3280, 3350, 3420, 3550],
            volatilityRisk: 'Low',
            liquidityScore: 9.2
        },
        cotton: { 
            msp: '₹7,020 / quintal', 
            currentPrice: '₹7,350 / quintal',
            trend: 'Upward (+6.8%)', 
            forecast: 'Excellent', 
            recommendation: 'Sell immediately post-harvest', 
            reason: 'Global export demand is currently very high. Textile industry recovery post-pandemic has created unprecedented demand. Prices are unlikely to be better later in the season.',
            marketFactors: [
                'Global cotton deficit of 2.1 million bales predicted',
                'China increasing imports by 25%',
                'Textile exports from India up 18%',
                'Weather concerns in major cotton-producing regions'
            ],
            priceHistory: [6800, 6950, 7100, 7250, 7350],
            volatilityRisk: 'Medium',
            liquidityScore: 8.7
        },
        wheat: { 
            msp: '₹2,275 / quintal', 
            currentPrice: '₹2,310 / quintal',
            trend: 'Stable (+1.5%)', 
            forecast: 'Neutral', 
            recommendation: 'Sell in staggered lots', 
            reason: 'Record production expected nationally. Government procurement will provide price support, but private market may see pressure. Selling in lots mitigates price risk.',
            marketFactors: [
                'Record harvest expected - 112 million tonnes',
                'Government procurement target: 44.4 million tonnes',
                'Export restrictions may be eased',
                'Storage capacity constraints in some regions'
            ],
            priceHistory: [2250, 2265, 2280, 2295, 2310],
            volatilityRisk: 'Low',
            liquidityScore: 9.5
        },
    },
    CREDIT_OPTIONS: [
        { 
            id: 'kcc', 
            name: 'Kisan Credit Card (KCC)', 
            interest: '7% (3% rebate)', 
            maxLoanPerAcre: 60000, 
            collateral: 'Land Papers', 
            bestFor: 'Overall financing', 
            recommendation: true,
            processingTime: '7-15 days',
            features: ['Flexible repayment', 'Multi-year validity', 'Crop insurance linkage', 'ATM facility'],
            eligibility: 'Land ownership documents required',
            pros: ['Lowest interest rate', 'Government support', 'Flexible terms', 'Insurance benefits'],
            cons: ['Documentation intensive', 'Land collateral required']
        },
        { 
            id: 'gold', 
            name: 'Agri Gold Loan', 
            interest: '9.5% - 11%', 
            maxLoanPerAcre: 40000, 
            collateral: 'Gold Ornaments', 
            bestFor: 'Quick, short-term needs', 
            recommendation: false,
            processingTime: 'Same day',
            features: ['Quick approval', 'No income proof', 'Gold remains safe', 'Part payment allowed'],
            eligibility: 'Gold ornaments (18k+)',
            pros: ['Fast processing', 'Minimal documentation', 'No income proof needed'],
            cons: ['Higher interest', 'Gold risk', 'Lower loan amount']
        },
        { 
            id: 'cooperative', 
            name: 'Cooperative Society Loan', 
            interest: '8% - 10%', 
            maxLoanPerAcre: 45000, 
            collateral: 'Group Guarantee', 
            bestFor: 'Community-based financing', 
            recommendation: true,
            processingTime: '10-20 days',
            features: ['Group support', 'Lower interest', 'Local understanding', 'Flexible terms'],
            eligibility: 'Society membership required',
            pros: ['Community support', 'Reasonable rates', 'Local presence'],
            cons: ['Limited availability', 'Group liability', 'Membership required']
        }
    ],
    GOVT_SCHEMES: [
        { 
            id: 'pmfby', 
            name: 'PM Fasal Bima Yojana', 
            category: 'Insurance', 
            details: 'Comprehensive crop insurance covering weather risks, pests, and diseases. Premium is heavily subsidized by government.', 
            eligibility: true,
            benefit: 'Up to ₹70,000 per acre coverage',
            deadline: 'July 31, 2025',
            subsidy: '85% of premium',
            applicationProcess: 'Through bank or CSC'
        },
        { 
            id: 'pmk', 
            name: 'PM-KUSUM', 
            category: 'Energy', 
            details: 'Solar pump subsidies and grid-connected solar power generation. Reduce electricity costs and generate income.', 
            eligibility: true,
            benefit: 'Up to 90% subsidy on solar pumps',
            deadline: 'Open throughout year',
            subsidy: '60% Central + 30% State',
            applicationProcess: 'Through MNRE portal'
        },
        { 
            id: 'shc', 
            name: 'Soil Health Card', 
            category: 'Productivity', 
            details: 'Free soil testing every 2 years. Provides crop-wise fertilizer recommendations to optimize yield and reduce costs.', 
            eligibility: true,
            benefit: 'Free soil testing worth ₹2,000',
            deadline: 'Ongoing',
            subsidy: '100% free',
            applicationProcess: 'Through village extension officer'
        },
        { 
            id: 'kisan', 
            name: 'PM Kisan Samman Nidhi', 
            category: 'Income Support', 
            details: 'Direct income support of ₹6,000 per year in three installments. No conditions attached.', 
            eligibility: true,
            benefit: '₹6,000 per year',
            deadline: 'Ongoing registration',
            subsidy: '100% benefit',
            applicationProcess: 'Through PM Kisan portal'
        }
    ],
    WEATHER_DATA: {
        forecast: {
            rainfall: 'Above normal (115% of LPA)',
            temperature: 'Normal range',
            humidity: 'Favorable for crops',
            windPattern: 'Moderate, beneficial'
        },
        seasonalOutlook: {
            monsoon: 'Strong and timely',
            postMonsoon: 'Extended favorable period',
            winter: 'Mild winter expected',
            risks: ['Possible flooding in low areas', 'Late season pest pressure']
        },
        recommendations: [
            'Ideal conditions for Kharif crops',
            'Consider drought-resistant varieties in marginal areas',
            'Plan drainage in flood-prone fields',
            'Monitor for pest outbreaks post-monsoon'
        ]
    },
    SOIL_ANALYSIS: {
        defaultProfile: {
            ph: 6.8,
            nitrogen: 'Medium',
            phosphorus: 'Low',
            potassium: 'High',
            organicMatter: 'Medium',
            recommendations: [
                'Apply phosphatic fertilizers (DAP/SSP)',
                'Maintain organic matter through compost',
                'Monitor pH levels quarterly',
                'Consider lime application if pH drops'
            ]
        }
    },
    AI_INSIGHTS: [
        "Based on weather patterns, this is an optimal year for water-intensive crops like sugarcane and rice",
        "Market analysis suggests cotton will outperform other crops by 15-20% this season",
        "Government schemes alignment: Your crop choice qualifies for 4 major subsidy programs",
        "Risk assessment: Medium pest pressure expected, ensure insurance coverage",
        "Resource optimization: Shared machinery can reduce costs by 25%"
    ]
};

// --- HELPER COMPONENTS ---
import Icon from '../components/Icon';
import MetricCard from '../components/MetricCard';
import DetailCard from '../components/DetailCard';
import AnalysisCard from '../components/AnalysisCard';
import ReasonCard from '../components/ReasonCard';
import TimelineNode from '../components/TimelineNode';
import LoadingState from '../components/LoadingState';
import LoanComparisonRow from '../components/LoanComparisonRow';

const ProgressBar = ({ progress, color = '#58D68D' }) => (
  <View style={styles.progressBarContainer}>
    <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: color }]} />
  </View>
);

// --- MAIN APP COMPONENT ---
export default function App() {
  const [screen, setScreen] = useState('loading');
  const [activeAnalysis, setActiveAnalysis] = useState(null);
  const [selectedCrops, setSelectedCrops] = useState([]);
  const [masterPlanCrop, setMasterPlanCrop] = useState(null);
  const [farmerName] = useState('Ramesh');
  const [farmResources, setFarmResources] = useState({ 
    landSize: '5', 
    irrigation: true, 
    machinery: [], 
    electricity: true,
    location: 'Nashik, Maharashtra',
    soilType: 'Black Cotton Soil',
    experience: '10+ years'
  });
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const primaryCrop = useMemo(() => MOCK_DB.CROP_DATA.find(c => c.id === selectedCrops[0]), [selectedCrops]);

  useEffect(() => {
    const timer = setTimeout(() => { 
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); 
      setScreen('cropSelection'); 
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleNavigate = (targetScreen, analysisId = null) => { 
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); 
    setActiveAnalysis(analysisId); 
    setScreen(targetScreen);
    
    // Simulate analysis progress
    if (targetScreen === 'analysis' && analysisId) {
      setAnalysisProgress(0);
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 20;
        });
      }, 300);
    }
  };
  
  const handleCropToggle = (cropId) => { 
    setSelectedCrops(prev => prev.includes(cropId) ? prev.filter(id => id !== cropId) : [cropId]); 
  };

  const handleMachineryToggle = (machinery) => {
    setFarmResources(prev => ({
      ...prev,
      machinery: prev.machinery.includes(machinery) 
        ? prev.machinery.filter(m => m !== machinery)
        : [...prev.machinery, machinery]
    }));
  };

  const renderScreen = () => {
    switch (screen) {
      case 'loading': return <LoadingState text="Initializing AI Farm Advisor..." progress={0} />;
      case 'cropSelection': return <CropSelectionScreen onContinue={() => handleNavigate('resources')} onCropToggle={handleCropToggle} selectedCrops={selectedCrops} farmerName={farmerName} />;
      case 'resources': return <ResourceScreen onBack={() => handleNavigate('cropSelection')} onContinue={() => handleNavigate('dashboard')} farmResources={farmResources} setFarmResources={setFarmResources} onMachineryToggle={handleMachineryToggle} />;
      case 'dashboard': return <DashboardScreen onNavigate={handleNavigate} farmerName={farmerName} primaryCrop={primaryCrop} farmResources={farmResources} />;
      case 'analysis': return <AnalysisScreen analysisId={activeAnalysis} onBack={() => handleNavigate('dashboard')} onGeneratePlan={() => handleNavigate('masterPlan')} farmResources={farmResources} primaryCrop={primaryCrop} progress={analysisProgress} />;
      case 'masterPlan': return <MasterPlanScreen onBack={() => handleNavigate('dashboard')} farmResources={farmResources} primaryCrop={masterPlanCrop || primaryCrop} onCropSelect={setMasterPlanCrop} />;
      case 'cropPlanSelection': return <CropPlanSelectionScreen onBack={() => handleNavigate('dashboard')} onCropSelect={(crop) => { setMasterPlanCrop(crop); handleNavigate('masterPlan'); }} farmResources={farmResources} />;
      default: return <Text>Error</Text>;
    }
  };
  return renderScreen();
}

// --- SCREEN COMPONENTS ---
const CropSelectionScreen = ({ onContinue, onCropToggle, selectedCrops, farmerName }) => (
    <SafeAreaView style={styles.container}>
        <View style={styles.header}>
            <Text style={styles.title}>Welcome, {farmerName} ji</Text>
            <Text style={styles.subtitle}>Select your primary crop for AI-powered analysis</Text>
            <View style={styles.aiIndicator}>
                <Icon name="🤖" style={{fontSize: 16}} />
                <Text style={styles.aiIndicatorText}>AI analyzing 50+ factors for your success</Text>
            </View>
        </View>
        <ScrollView contentContainerStyle={styles.cropGrid}>
            {MOCK_DB.CROP_DATA.map((crop, index) => {
                const isSelected = selectedCrops.includes(crop.id);
                return (
                    <View key={crop.id}>
                        <TouchableOpacity 
                            style={[styles.cropCard, isSelected && styles.cropCardSelected]} 
                            onPress={() => onCropToggle(crop.id)}
                        >
                            <Image source={{ uri: crop.image }} style={styles.cropImage} />
                            <Text style={styles.cropName}>{crop.name}</Text>
                            <View style={styles.cropDetails}>
                                <Text style={styles.cropDetail}>💧 {crop.waterRequirement}</Text>
                                <Text style={styles.cropDetail}>📅 {crop.duration}</Text>
                                <Text style={styles.cropDetail}>🌾 {crop.season}</Text>
                            </View>
                            {isSelected && <View style={styles.checkIcon}><Text style={{color: '#1A1A1A'}}>✓</Text></View>}
                        </TouchableOpacity>
                    </View>
                );
            })}
        </ScrollView>
        <TouchableOpacity 
            style={[styles.button, selectedCrops.length === 0 && styles.buttonDisabled]} 
            onPress={onContinue} 
            disabled={selectedCrops.length === 0}
        >
            <Text style={styles.buttonText}>Continue to Farm Analysis</Text>
        </TouchableOpacity>
    </SafeAreaView>
);

const ResourceScreen = ({ onBack, onContinue, farmResources, setFarmResources, onMachineryToggle }) => {
    const machineryOptions = ['Tractor', 'Thresher', 'Sprayer', 'Harvester', 'Cultivator'];
    
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Your Farm Profile</Text>
                <Text style={styles.subtitle}>Help AI understand your resources for personalized recommendations</Text>
            </View>
            <ScrollView style={styles.formContainer}>
                <View style={styles.formSection}>
                    <Text style={styles.sectionHeader}>📍 Location & Land</Text>
                    <Text style={styles.label}>Total Land Size</Text>
                    <TextInput 
                        style={styles.textInput} 
                        placeholder="e.g., 5 acres" 
                        keyboardType="numeric" 
                        value={farmResources.landSize} 
                        onChangeText={text => setFarmResources(prev => ({ ...prev, landSize: text }))} 
                    />
                    
                    <Text style={styles.label}>Location</Text>
                    <TextInput 
                        style={styles.textInput} 
                        placeholder="City, State" 
                        value={farmResources.location} 
                        onChangeText={text => setFarmResources(prev => ({ ...prev, location: text }))} 
                    />
                </View>

                <View style={styles.formSection}>
                    <Text style={styles.sectionHeader}>💧 Water & Infrastructure</Text>
                    <Text style={styles.label}>Irrigation Source</Text>
                    <View style={styles.optionContainer}>
                        <TouchableOpacity 
                            style={[styles.optionButton, farmResources.irrigation === true && styles.optionButtonSelected]} 
                            onPress={() => setFarmResources(prev => ({ ...prev, irrigation: true }))}
                        >
                            <Text style={[styles.optionButtonText, farmResources.irrigation === true && styles.optionButtonTextSelected]}>Available</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.optionButton, farmResources.irrigation === false && styles.optionButtonSelected]} 
                            onPress={() => setFarmResources(prev => ({ ...prev, irrigation: false }))}
                        >
                            <Text style={[styles.optionButtonText, farmResources.irrigation === false && styles.optionButtonTextSelected]}>Rain-fed</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>Electricity Access</Text>
                    <View style={styles.optionContainer}>
                        <TouchableOpacity 
                            style={[styles.optionButton, farmResources.electricity === true && styles.optionButtonSelected]} 
                            onPress={() => setFarmResources(prev => ({ ...prev, electricity: true }))}
                        >
                            <Text style={[styles.optionButtonText, farmResources.electricity === true && styles.optionButtonTextSelected]}>Reliable</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.optionButton, farmResources.electricity === false && styles.optionButtonSelected]} 
                            onPress={() => setFarmResources(prev => ({ ...prev, electricity: false }))}
                        >
                            <Text style={[styles.optionButtonText, farmResources.electricity === false && styles.optionButtonTextSelected]}>Intermittent</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.formSection}>
                    <Text style={styles.sectionHeader}>🚜 Machinery Owned</Text>
                    <View style={styles.machineryGrid}>
                        {machineryOptions.map((machinery) => (
                            <TouchableOpacity 
                                key={machinery}
                                style={[
                                    styles.machineryOption, 
                                    farmResources.machinery.includes(machinery) && styles.machineryOptionSelected
                                ]} 
                                onPress={() => onMachineryToggle(machinery)}
                            >
                                <Text style={[
                                    styles.machineryText, 
                                    farmResources.machinery.includes(machinery) && styles.machineryTextSelected
                                ]}>{machinery}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>
            <TouchableOpacity style={styles.button} onPress={onContinue}>
                <Text style={styles.buttonText}>Generate AI Dashboard</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const DashboardScreen = ({ onNavigate, farmerName, primaryCrop, farmResources }) => {
    const [showTiles, setShowTiles] = useState(true);
    const [currentInsight, setCurrentInsight] = useState(0);
    
    useEffect(() => { 
        // Simple AI insights rotation - no animations
        const insightInterval = setInterval(() => {
            setCurrentInsight(prev => (prev + 1) % MOCK_DB.AI_INSIGHTS.length);
        }, 4000);
        
        return () => {
            clearInterval(insightInterval);
        };
    }, []);
    
    // Quick Action feedback
    const handleQuickAction = (action) => {
        Alert.alert('Coming Soon', `${action} feature will be available in a future update!`);
    };
    
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.title}>AI Farm Advisor</Text>
                        <Text style={styles.subtitle}>Hello {farmerName} ji, your intelligent farming companion</Text>
                    </View>
                    <TouchableOpacity style={styles.profileButton}>
                        <Icon name="👤" style={{fontSize: 24}} />
                    </TouchableOpacity>
                </View>
            </View>
            <ScrollView style={styles.dashboardContent}>
                {/* Current Crop Status */}
                <View>
                    <View style={[styles.currentCropCard, {marginBottom: 20}]}> {/* extra margin for smoothness */}
                        <View style={styles.cropStatusHeader}>
                            <Text style={styles.cropStatusTitle}>Current Focus: {primaryCrop?.name}</Text>
                            <View style={styles.statusBadge}>
                                <Text style={styles.statusText}>Optimal</Text>
                            </View>
                        </View>
                        <View style={styles.cropMetrics}>
                            <MetricCard 
                                icon="📈" 
                                title="Profit Potential" 
                                value="High" 
                                subtitle={`₹${((primaryCrop?.baseRevenue - primaryCrop?.baseCost) * parseFloat(farmResources.landSize || 0)).toLocaleString('en-IN')}`}
                                trend="+12.5%"
                            />
                            <MetricCard 
                                icon="🌦️" 
                                title="Weather Score" 
                                value="9.2/10" 
                                subtitle="Excellent conditions"
                                color="#3498DB"
                            />
                        </View>
                    </View>
                </View>

                {/* Divider */}
                <View style={{height: 10}} />

                {/* AI Insights Carousel */}
                <View>
                    <View style={styles.aiInsightCard}>
                        <View style={styles.aiInsightHeader}>
                            <Icon name="🤖" style={{fontSize: 24, color: '#58D68D'}}/>
                            <Text style={styles.aiInsightTitle}>AI Insight #{currentInsight + 1}</Text>
                        </View>
                        <Text style={styles.aiInsightText}>{MOCK_DB.AI_INSIGHTS[currentInsight]}</Text>
                        <View style={styles.insightDots}>
                            {MOCK_DB.AI_INSIGHTS.map((_, index) => (
                                <View 
                                    key={index} 
                                    style={[styles.dot, index === currentInsight && styles.activeDot]} 
                                />
                            ))}
                        </View>
                    </View>
                </View>

                {/* Divider */}
                <View style={{height: 10}} />

                {/* Quick Actions */}
                <View>
                    <View style={[styles.quickActions, {backgroundColor: '#232323', borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8}]}> 
                        <Text style={styles.sectionTitle}>Quick Actions</Text>
                        <View style={styles.quickActionGrid}>
                            <TouchableOpacity style={styles.quickActionButton} onPress={() => handleQuickAction('Call Expert')}>
                                <Icon name="📱" style={{fontSize: 20}} />
                                <Text style={styles.quickActionText}>Call Expert</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.quickActionButton} onPress={() => handleQuickAction('Track Expenses')}>
                                <Icon name="📋" style={{fontSize: 20}} />
                                <Text style={styles.quickActionText}>Track Expenses</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.quickActionButton} onPress={() => handleQuickAction('Weather Alert')}>
                                <Icon name="🌡️" style={{fontSize: 20}} />
                                <Text style={styles.quickActionText}>Weather Alert</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.quickActionButton} onPress={() => handleQuickAction('Market Prices')}>
                                <Icon name="📊" style={{fontSize: 20}} />
                                <Text style={styles.quickActionText}>Market Prices</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Divider */}
                <View style={{height: 10}} />

                {/* Analysis Modules */}
                <View>
                    <Text style={styles.sectionTitle}>Comprehensive Analysis</Text>
                    <View style={styles.dashboardGrid}>
                        {MOCK_DB.DASHBOARD_TILES.map((tile, index) => (
                            <TouchableOpacity 
                                key={tile.id} 
                                style={styles.dashboardCard}
                                onPress={() => {
                                    if (tile.id === 'masterPlan') {
                                        onNavigate('cropPlanSelection');
                                    } else {
                                        onNavigate('analysis', tile.id);
                                    }
                                }}
                            >
                                <View style={styles.cardHeader}>
                                    <Text style={{fontSize: 36}}>{tile.icon}</Text>
                                    <View style={styles.cardBadge}>
                                        <Text style={styles.cardBadgeText}>AI</Text>
                                    </View>
                                </View>
                                <Text style={styles.dashboardCardTitle} numberOfLines={2} ellipsizeMode="tail">{tile.title}</Text>
                                <Text style={styles.dashboardCardDesc} numberOfLines={2} ellipsizeMode="tail">{tile.description}</Text>
                                <View style={styles.cardFooter}>
                                    <Text style={styles.cardAction}>Analyze →</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
                <View style={{height: 30}} />
            </ScrollView>
        </SafeAreaView>
    );
};

const AnalysisScreen = ({ analysisId, onBack, onGeneratePlan, farmResources, primaryCrop, progress }) => {
    const [loading, setLoading] = useState(true);
    const [currentPhase, setCurrentPhase] = useState('');
    const landSize = parseFloat(farmResources.landSize) || 0;
    const currentTile = MOCK_DB.DASHBOARD_TILES.find(t => t.id === analysisId);

    useEffect(() => {
        const phases = [
            'Gathering market data...',
            'Analyzing weather patterns...',
            'Processing government schemes...',
            'Calculating profit projections...',
            'Generating recommendations...'
        ];
        
        let phaseIndex = 0;
        const phaseInterval = setInterval(() => {
            if (phaseIndex < phases.length) {
                setCurrentPhase(phases[phaseIndex]);
                phaseIndex++;
            } else {
                clearInterval(phaseInterval);
                setLoading(false);
            }
        }, 800);
        
        return () => clearInterval(phaseInterval);
    }, [analysisId]);

    const renderAnalysisContent = () => {
        if (loading) return <LoadingState text={currentPhase} progress={progress} />;
        
        switch (analysisId) {
            case 'planner':
                const revenue = landSize * (primaryCrop?.baseRevenue || 0);
                const costs = landSize * (primaryCrop?.baseCost || 0);
                const profit = revenue - costs;
                const profitMargin = ((profit / revenue) * 100).toFixed(1);
                
                return (
                    <>
                        <AnalysisCard 
                            icon="🎯" 
                            title="AI Recommendation" 
                            value={`${primaryCrop?.name} is OPTIMAL`}
                            details="Our advanced ML model analyzed 127 factors including weather, market, soil, and government policies to confirm this is your best choice for maximum profitability."
                            metrics={[
                                { label: 'Confidence Score', value: '94.7%', color: '#58D68D' },
                                { label: 'Market Rank', value: '#1 of 6', color: '#58D68D' },
                                { label: 'Risk Level', value: 'Low', color: '#58D68D' }
                            ]}
                        />

                        <Text style={styles.sectionTitle}>Detailed Reasoning</Text>
                        
                        <ReasonCard 
                            title="Weather Compatibility Analysis" 
                            confidence={96}
                            impact="High"
                        >
                            IMD's seasonal forecast shows 115% of Long Period Average (LPA) rainfall for your region. {primaryCrop?.name} requires {primaryCrop?.waterRequirement.toLowerCase()} water, making this season ideal. Temperature patterns (24-32°C) align perfectly with {primaryCrop?.name}'s growth requirements during {primaryCrop?.season} season.
                        </ReasonCard>
                        
                        <ReasonCard 
                            title="Market Demand Projections" 
                            confidence={92}
                            impact="Very High"
                        >
                            Global demand for {primaryCrop?.name} has increased by 8.3% year-over-year. Export opportunities have expanded with new trade agreements. Industrial consumption is up 12% due to ethanol blending mandates and textile recovery post-pandemic.
                        </ReasonCard>
                        
                        <ReasonCard 
                            title="Government Policy Alignment" 
                            confidence={89}
                            impact="High"
                        >
                            Your crop choice qualifies for 4 major government schemes: PM-KUSUM (solar pumps), PMFBY (crop insurance), Soil Health Card, and PM-Kisan (₹6,000 annual support). Total potential government benefits: ₹{(landSize * 8000).toLocaleString('en-IN')}.
                        </ReasonCard>

                        <ReasonCard 
                            title="Resource Optimization" 
                            confidence={91}
                            impact="Medium"
                        >
                            With your irrigation setup and {farmResources.machinery.length} machinery, input costs can be optimized by 15-20%. Your {farmResources.irrigation ? 'reliable irrigation' : 'rain-fed approach'} suits {primaryCrop?.name}'s water requirements perfectly.
                        </ReasonCard>

                        <Text style={styles.sectionTitle}>Financial Projections</Text>
                        <DetailCard title="Complete Cost-Benefit Analysis" color="#F39C12">
                            <View style={styles.financialBreakdown}>
                                <View style={styles.profitCard}>
                                    <Text style={styles.profitTitle}>Analysis for {landSize} Acres of {primaryCrop?.name}</Text>
                                    
                                    <View style={styles.profitSection}>
                                        <Text style={styles.profitSectionTitle}>Revenue Streams</Text>
                                        <View style={styles.profitRow}>
                                            <Text style={styles.profitLabel}>Primary Crop Sale:</Text>
                                            <Text style={styles.profitValue}>₹{revenue.toLocaleString('en-IN')}</Text>
                                        </View>
                                        <View style={styles.profitRow}>
                                            <Text style={styles.profitLabel}>By-products:</Text>
                                            <Text style={styles.profitValue}>₹{(revenue * 0.1).toLocaleString('en-IN')}</Text>
                                        </View>
                                        <View style={styles.profitRow}>
                                            <Text style={styles.profitLabel}>Government Support:</Text>
                                            <Text style={styles.profitValue}>₹{(landSize * 6000).toLocaleString('en-IN')}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.profitSection}>
                                        <Text style={styles.profitSectionTitle}>Cost Structure</Text>
                                        <View style={styles.profitRow}>
                                            <Text style={styles.profitLabel}>Seeds & Fertilizers:</Text>
                                            <Text style={[styles.profitValue, {color: '#E74C3C'}]}>- ₹{(costs * 0.4).toLocaleString('en-IN')}</Text>
                                        </View>
                                        <View style={styles.profitRow}>
                                            <Text style={styles.profitLabel}>Labor & Machinery:</Text>
                                            <Text style={[styles.profitValue, {color: '#E74C3C'}]}>- ₹{(costs * 0.35).toLocaleString('en-IN')}</Text>
                                        </View>
                                        <View style={styles.profitRow}>
                                            <Text style={styles.profitLabel}>Other Expenses:</Text>
                                            <Text style={[styles.profitValue, {color: '#E74C3C'}]}>- ₹{(costs * 0.25).toLocaleString('en-IN')}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.profitDivider} />
                                    <View style={styles.profitRow}>
                                        <Text style={styles.profitNetLabel}>Net Profit:</Text>
                                        <Text style={[styles.profitValue, {color: '#58D68D', fontSize: 22}]}>₹{(profit + revenue * 0.1 + landSize * 6000).toLocaleString('en-IN')}</Text>
                                    </View>
                                    <View style={styles.profitRow}>
                                        <Text style={styles.profitLabel}>Profit Margin:</Text>
                                        <Text style={[styles.profitValue, {color: '#58D68D'}]}>{profitMargin}%</Text>
                                    </View>
                                </View>
                            </View>
                        </DetailCard>

                        <TouchableOpacity style={styles.button} onPress={onGeneratePlan}>
                            <Text style={styles.buttonText}>Generate Master Execution Plan</Text>
                        </TouchableOpacity>
                    </>
                );

            case 'market':
                const marketData = MOCK_DB.MARKET_ANALYSIS[primaryCrop?.id || 'sugarcane'] || MOCK_DB.MARKET_ANALYSIS.sugarcane;
                return (
                    <>
                        <AnalysisCard 
                            icon="📊" 
                            title="Market Intelligence Summary" 
                            value={marketData?.recommendation || 'Analysis pending'}
                            details={marketData?.reason || 'Market analysis data is being updated.'}
                            color="#F39C12"
                            metrics={[
                                { label: 'Current Price', value: marketData?.currentPrice || 'N/A', color: '#F39C12' },
                                { label: 'Trend', value: marketData?.trend || 'N/A', color: '#58D68D' },
                                { label: 'Volatility', value: marketData?.volatilityRisk || 'N/A', color: '#3498DB' },
                                { label: 'Liquidity', value: `${marketData?.liquidityScore || 0}/10`, color: '#58D68D' }
                            ]}
                        />

                        <Text style={styles.sectionTitle}>Market Analysis Deep Dive</Text>
                        
                        <ReasonCard 
                            title="Price Trend Analysis" 
                            confidence={94}
                            impact="Very High"
                        >
                            Historical data shows {primaryCrop?.name} prices have {marketData.trend.includes('+') ? 'increased' : 'decreased'} by {marketData.trend.match(/[\d.]+/)?.[0]}% in the last quarter. Current price of {marketData.currentPrice} is {((parseFloat(marketData.currentPrice.replace(/[^\d.]/g, '')) / parseFloat(marketData.msp.replace(/[^\d.]/g, ''))) * 100 - 100).toFixed(1)}% above MSP.
                        </ReasonCard>

                        <ReasonCard 
                            title="Demand-Supply Dynamics" 
                            confidence={91}
                            impact="High"
                        >
                            {marketData.marketFactors.map((factor, index) => (
                                <Text key={index} style={styles.factorText}>• {factor}</Text>
                            ))}
                        </ReasonCard>

                        <DetailCard title="Price History & Forecast" color="#3498DB">
                            <View style={styles.priceChart}>
                                <Text style={styles.chartTitle}>Last 5 Months Price Movement</Text>
                                <View style={styles.priceHistory}>
                                    {marketData.priceHistory.map((price, index) => (
                                        <View key={index} style={styles.priceBar}>
                                            <View style={[styles.priceBarFill, { 
                                                height: `${(price / Math.max(...marketData.priceHistory)) * 100}%` 
                                            }]} />
                                            <Text style={styles.priceLabel}>₹{price}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </DetailCard>

                        <ReasonCard 
                            title="Strategic Selling Recommendation" 
                            confidence={88}
                            impact="Very High"
                        >
                            Based on seasonal patterns and market intelligence, the optimal selling window is identified. Storage costs vs. price appreciation analysis suggests {marketData?.recommendation?.toLowerCase() || 'immediate selling'}. Expected price realization: ₹{(parseFloat((marketData?.currentPrice || '0').replace(/[^\d.]/g, '')) * 1.05).toFixed(0)} per quintal.
                        </ReasonCard>
                    </>
                );

            case 'credit':
                const kcc = MOCK_DB.CREDIT_OPTIONS[0];
                const gold = MOCK_DB.CREDIT_OPTIONS[1]; 
                const cooperative = MOCK_DB.CREDIT_OPTIONS[2];
                const kccEligibility = landSize * kcc.maxLoanPerAcre;
                
                return (
                    <>
                        <AnalysisCard 
                            icon="💰" 
                            title="Optimal Financing Strategy" 
                            value={`${kcc.name} + ${cooperative.name}`}
                            details="AI recommends a dual approach: Primary financing through KCC for lowest interest, supplemented by cooperative loan for additional working capital needs."
                            metrics={[
                                { label: 'Total Eligibility', value: `₹${(kccEligibility * 1.2).toLocaleString('en-IN')}`, color: '#58D68D' },
                                { label: 'Interest Savings', value: '₹' + (kccEligibility * 0.03).toLocaleString('en-IN'), color: '#58D68D' },
                                { label: 'Processing Time', value: '10-15 days', color: '#F39C12' }
                            ]}
                        />

                        <Text style={styles.sectionTitle}>Comprehensive Loan Comparison</Text>
                        
                        <DetailCard title="Feature-by-Feature Analysis" color="#3498DB">
                            <View style={styles.loanTable}>
                                <View style={styles.loanHeaderRow}>
                                    <Text style={styles.loanHeaderLabel}>Feature</Text>
                                    <Text style={[styles.loanHeaderLabel, styles.loanValueRecommended]}>{kcc.name}</Text>
                                    <Text style={styles.loanHeaderLabel}>{gold.name}</Text>
                                    <Text style={[styles.loanHeaderLabel, styles.loanValueRecommended]}>{cooperative.name}</Text>
                                </View>
                                <LoanComparisonRow 
                                    label="Interest Rate" 
                                    kcc={kcc.interest} 
                                    gold={gold.interest} 
                                    cooperative={cooperative.interest}
                                />
                                <LoanComparisonRow 
                                    label="Max Eligibility" 
                                    kcc={`₹${kccEligibility.toLocaleString('en-IN')}`} 
                                    gold={`₹${(landSize * gold.maxLoanPerAcre).toLocaleString('en-IN')}`}
                                    cooperative={`₹${(landSize * cooperative.maxLoanPerAcre).toLocaleString('en-IN')}`}
                                />
                                <LoanComparisonRow 
                                    label="Processing Time" 
                                    kcc={kcc.processingTime} 
                                    gold={gold.processingTime}
                                    cooperative={cooperative.processingTime}
                                />
                                <LoanComparisonRow 
                                    label="Collateral" 
                                    kcc={kcc.collateral} 
                                    gold={gold.collateral}
                                    cooperative={cooperative.collateral}
                                />
                            </View>
                        </DetailCard>

                        {[kcc, cooperative, gold].map((option, index) => (
                            <ReasonCard 
                                key={option.id}
                                title={`${option.name} Analysis`} 
                                confidence={option.recommendation ? 95 : 70}
                                impact={option.recommendation ? "High" : "Medium"}
                            >
                                <Text style={styles.loanDescription}>{option.bestFor}</Text>
                                <View style={styles.prosConsContainer}>
                                    <View style={styles.prosColumn}>
                                        <Text style={styles.prosConsTitle}>Advantages:</Text>
                                        {option.pros.map((pro, i) => (
                                            <Text key={i} style={styles.prosText}>• {pro}</Text>
                                        ))}
                                    </View>
                                    <View style={styles.consColumn}>
                                        <Text style={styles.prosConsTitle}>Considerations:</Text>
                                        {option.cons.map((con, i) => (
                                            <Text key={i} style={styles.consText}>• {con}</Text>
                                        ))}
                                    </View>
                                </View>
                            </ReasonCard>
                        ))}
                    </>
                );

            case 'schemes':
                return (
                    <>
                        <AnalysisCard 
                            icon="🏛️" 
                            title="Government Benefits Portfolio" 
                            value="4 Schemes Applicable"
                            details={`Total potential benefits: ₹${(landSize * 15000 + 6000).toLocaleString('en-IN')} per year. Our AI has verified your eligibility and identified optimal application timing.`}
                            metrics={[
                                { label: 'Direct Benefits', value: '₹' + (landSize * 8000 + 6000).toLocaleString('en-IN'), color: '#58D68D' },
                                { label: 'Subsidy Value', value: '₹' + (landSize * 7000).toLocaleString('en-IN'), color: '#58D68D' },
                                { label: 'Application Time', value: '2-3 weeks', color: '#F39C12' }
                            ]}
                        />

                        <Text style={styles.sectionTitle}>Scheme-wise Detailed Analysis</Text>
                        
                        {MOCK_DB.GOVT_SCHEMES.map((scheme, index) => (
                            <ReasonCard 
                                key={scheme.id}
                                title={`${scheme.name} (${scheme.category})`}
                                confidence={95}
                                impact="High"
                            >
                                <Text style={styles.schemeDescription}>{scheme.details}</Text>
                                <View style={styles.schemeDetails}>
                                    <View style={styles.schemeDetailRow}>
                                        <Text style={styles.schemeDetailLabel}>Benefit:</Text>
                                        <Text style={styles.schemeDetailValue}>{scheme.benefit}</Text>
                                    </View>
                                    <View style={styles.schemeDetailRow}>
                                        <Text style={styles.schemeDetailLabel}>Deadline:</Text>
                                        <Text style={[styles.schemeDetailValue, { 
                                            color: scheme.deadline.includes('July') ? '#E74C3C' : '#58D68D' 
                                        }]}>{scheme.deadline}</Text>
                                    </View>
                                    <View style={styles.schemeDetailRow}>
                                        <Text style={styles.schemeDetailLabel}>Subsidy:</Text>
                                        <Text style={styles.schemeDetailValue}>{scheme.subsidy}</Text>
                                    </View>
                                    <View style={styles.schemeDetailRow}>
                                        <Text style={styles.schemeDetailLabel}>Apply via:</Text>
                                        <Text style={styles.schemeDetailValue}>{scheme.applicationProcess}</Text>
                                    </View>
                                </View>
                            </ReasonCard>
                        ))}
                    </>
                );

            case 'weather':
                const weather = MOCK_DB.WEATHER_DATA;
                return (
                    <>
                        <AnalysisCard 
                            icon="🌦️" 
                            title="Weather Intelligence Summary" 
                            value="Excellent Season Ahead"
                            details="IMD forecasts indicate optimal conditions for your crop selection. Advanced weather modeling suggests 92% probability of favorable growing conditions."
                            metrics={[
                                { label: 'Rainfall Forecast', value: weather.forecast.rainfall, color: '#3498DB' },
                                { label: 'Temperature', value: weather.forecast.temperature, color: '#E67E22' },
                                { label: 'Risk Level', value: 'Low', color: '#58D68D' }
                            ]}
                        />

                        <Text style={styles.sectionTitle}>Detailed Weather Analysis</Text>
                        
                        <ReasonCard 
                            title="Monsoon Outlook" 
                            confidence={96}
                            impact="Very High"
                        >
                            {weather.seasonalOutlook.monsoon} with rainfall expected to be {weather.forecast.rainfall}. This aligns perfectly with {primaryCrop?.name}'s water requirements during the critical growing phase. Soil moisture levels will be optimal for root development and nutrient uptake.
                        </ReasonCard>
                        
                        <ReasonCard 
                            title="Temperature & Humidity Patterns" 
                            confidence={89}
                            impact="High"
                        >
                            Expected temperature range of 24-32°C during growing season is ideal for {primaryCrop?.name}. {weather.forecast.humidity} humidity levels will reduce pest pressure and disease incidence. {weather.forecast.windPattern} wind patterns will aid in natural pollination.
                        </ReasonCard>

                        <DetailCard title="Risk Assessment & Mitigation" color="#E74C3C">
                            <View style={styles.riskContainer}>
                                {weather.seasonalOutlook.risks.map((risk, index) => (
                                    <View key={index} style={styles.riskItem}>
                                        <Icon name="⚠️" style={styles.riskIcon} />
                                        <Text style={styles.riskText}>{risk}</Text>
                                    </View>
                                ))}
                            </View>
                        </DetailCard>

                        <ReasonCard 
                            title="AI Recommendations" 
                            confidence={94}
                            impact="High"
                        >
                            {(weather?.recommendations || []).map((rec, index) => (
                                <Text key={index} style={styles.recommendationText}>• {rec}</Text>
                            ))}
                        </ReasonCard>
                    </>
                );

            case 'soil':
                const soil = MOCK_DB.SOIL_ANALYSIS?.defaultProfile || {};
                return (
                    <>
                        <AnalysisCard 
                            icon="🌱" 
                            title="Soil Health Assessment" 
                            value="Good with Improvements Needed"
                            details="Your soil analysis shows good overall health with specific areas for optimization. Targeted interventions can increase yield by 15-20%."
                            metrics={[
                                { label: 'pH Level', value: (soil.ph || 7.0).toString(), color: '#58D68D' },
                                { label: 'Nitrogen', value: soil.nitrogen || 'Medium', color: '#F39C12' },
                                { label: 'Phosphorus', value: soil.phosphorus || 'Medium', color: '#E74C3C' },
                                { label: 'Potassium', value: soil.potassium || 'Medium', color: '#58D68D' }
                            ]}
                        />

                        <Text style={styles.sectionTitle}>Nutrient Analysis & Recommendations</Text>
                        
                        <ReasonCard 
                            title="Macronutrient Status" 
                            confidence={92}
                            impact="High"
                        >
                            pH level of {soil.ph || 7.0} is optimal for {primaryCrop?.name || 'your crop'}. Nitrogen levels are {(soil.nitrogen || 'medium').toLowerCase()}, requiring balanced fertilization. Phosphorus deficiency needs immediate attention through DAP application. High potassium levels provide good root development support.
                        </ReasonCard>

                        <DetailCard title="Fertilizer Recommendation Plan" color="#2ECC71">
                            <View style={styles.fertilizerPlan}>
                                {(soil.recommendations || ['Balanced NPK fertilizer - 50 kg/acre']).map((rec, index) => (
                                    <View key={index} style={styles.fertilizerItem}>
                                        <Icon name="🧪" style={styles.fertilizerIcon} />
                                        <Text style={styles.fertilizerText}>{rec || 'Fertilizer recommendation'}</Text>
                                    </View>
                                ))}
                            </View>
                        </DetailCard>
                    </>
                );

            case 'insurance':
                const premium = landSize * 70000 * 0.02;
                return (
                    <>
                        <AnalysisCard 
                            icon="🛡️" 
                            title="Risk Protection Strategy" 
                            value={`Enroll in PMFBY by July 31, 2025`}
                            details="Comprehensive crop insurance is critical for protecting your investment. Our risk analysis shows optimal coverage strategies for your farm profile."
                            metrics={[
                                { label: 'Premium Cost', value: `₹${premium.toLocaleString('en-IN')}`, color: '#F39C12' },
                                { label: 'Coverage Amount', value: `₹${(landSize * 70000).toLocaleString('en-IN')}`, color: '#58D68D' },
                                { label: 'Govt Subsidy', value: '85%', color: '#58D68D' },
                                { label: 'Risk Level', value: 'Medium', color: '#F39C12' }
                            ]}
                        />

                        <Text style={styles.sectionTitle}>Risk Analysis & Coverage Strategy</Text>
                        
                        <ReasonCard 
                            title="Weather Risk Assessment" 
                            confidence={91}
                            impact="High"
                        >
                            Based on 10-year weather data analysis, your region has a 15% probability of adverse weather events. Flood risk is low but drought risk exists during late monsoon. Insurance provides crucial financial protection against these uncertainties.
                        </ReasonCard>

                        <ReasonCard 
                            title="Pest & Disease Risk" 
                            confidence={87}
                            impact="Medium"
                        >
                            {primaryCrop?.name} in your region shows medium pest pressure, particularly for bollworm (cotton) or sugarcane borer attacks. Early detection and insurance coverage together provide comprehensive protection strategy.
                        </ReasonCard>

                        <DetailCard title="Insurance Cost-Benefit Analysis" color="#3498DB">
                            <View style={styles.insuranceBreakdown}>
                                <View style={styles.profitRow}>
                                    <Text style={styles.profitLabel}>Your Premium (15%):</Text>
                                    <Text style={styles.profitValue}>₹{premium.toLocaleString('en-IN')}</Text>
                                </View>
                                <View style={styles.profitRow}>
                                    <Text style={styles.profitLabel}>Government Subsidy (85%):</Text>
                                    <Text style={[styles.profitValue, {color: '#58D68D'}]}>₹{(premium * 5.67).toLocaleString('en-IN')}</Text>
                                </View>
                                <View style={styles.profitRow}>
                                    <Text style={styles.profitLabel}>Total Coverage:</Text>
                                    <Text style={[styles.profitValue, {color: '#58D68D'}]}>₹{(landSize * 70000).toLocaleString('en-IN')}</Text>
                                </View>
                                <View style={styles.profitRow}>
                                    <Text style={styles.profitLabel}>Return Ratio:</Text>
                                    <Text style={[styles.profitValue, {color: '#58D68D'}]}>1:{Math.round(70000/premium * landSize)}</Text>
                                </View>
                            </View>
                        </DetailCard>
                    </>
                );

            case 'rentals':
                return (
                    <>
                        <AnalysisCard 
                            icon="🚜" 
                            title="Resource Optimization Strategy" 
                            value="Save 15-25% on Operations"
                            details="Smart resource management through technology and community partnerships can significantly reduce your operational costs while improving efficiency."
                            metrics={[
                                { label: 'Potential Savings', value: `₹${(landSize * 8000).toLocaleString('en-IN')}`, color: '#58D68D' },
                                { label: 'Machinery Efficiency', value: '+20%', color: '#58D68D' },
                                { label: 'Labor Optimization', value: '10 days saved', color: '#F39C12' }
                            ]}
                        />

                        <Text style={styles.sectionTitle}>Cost Optimization Analysis</Text>
                        
                        <ReasonCard 
                            title="Machinery Cost Analysis" 
                            confidence={93}
                            impact="High"
                        >
                            Current tractor rental rates: ₹800-1000/hour. Using Custom Hiring Centers (CHC) can reduce costs by 15%. Your owned machinery: {farmResources.machinery.length > 0 ? farmResources.machinery.join(', ') : 'None listed'}. Recommend shared machinery for {primaryCrop?.name} harvesting operations.
                        </ReasonCard>

                        <ReasonCard 
                            title="Labor Management Strategy" 
                            confidence={89}
                            impact="Medium"
                        >
                            Peak season labor rates: ₹500-650/day. Early booking reduces costs by 10-15%. Community labor sharing for {primaryCrop?.name} can optimize workforce utilization. Mechanization where possible reduces dependency on manual labor.
                        </ReasonCard>

                        <DetailCard title="Resource Sharing Opportunities" color="#2ECC71">
                            <View style={styles.resourceSharing}>
                                <Text style={styles.resourceTitle}>Recommended Sharing Strategy:</Text>
                                <Text style={styles.resourceItem}>• Form 3-4 farmer group for bulk machinery hiring</Text>
                                <Text style={styles.resourceItem}>• Coordinate planting schedules to share equipment</Text>
                                <Text style={styles.resourceItem}>• Joint procurement of seeds and fertilizers (8-12% savings)</Text>
                                <Text style={styles.resourceItem}>• Shared storage facilities for post-harvest management</Text>
                                <Text style={styles.resourceItem}>• Group insurance for better premium rates</Text>
                            </View>
                        </DetailCard>
                    </>
                );

            default: 
                return <Text style={{color: 'white'}}>Analysis for {currentTile?.title} not found.</Text>;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Dashboard</Text>
                </TouchableOpacity>
                <Text style={styles.title}>{currentTile?.title || 'Analysis'}</Text>
                <Text style={styles.subtitle}>AI-powered insights for {primaryCrop?.name}</Text>
            </View>
            <ScrollView contentContainerStyle={styles.analysisContainer}>
                {renderAnalysisContent()}
            </ScrollView>
        </SafeAreaView>
    );
};

const MasterPlanScreen = ({ onBack, farmResources, primaryCrop }) => {
    const landSize = parseFloat(farmResources.landSize) || 0;
    const kccEligibility = (landSize * MOCK_DB.CREDIT_OPTIONS[0].maxLoanPerAcre).toLocaleString('en-IN');
    const insurancePremium = (landSize * 70000 * 0.02).toLocaleString('en-IN');
    const totalInvestment = (landSize * (primaryCrop?.baseCost || 20000)).toLocaleString('en-IN');
    const expectedProfit = (landSize * ((primaryCrop?.baseRevenue || 50000) - (primaryCrop?.baseCost || 20000))).toLocaleString('en-IN');
    const [activePhase, setActivePhase] = useState(0);
    const [activeTab, setActiveTab] = useState('timeline');

    const phases = [
        'Pre-Season', 'Sowing', 'Early Growth', 'Mid Growth', 'Pre-Harvest', 'Harvest', 'Post-Harvest', 'Market & Planning'
    ];

    const tabs = [
        { id: 'timeline', label: 'Timeline', icon: '📅' },
        { id: 'financial', label: 'Financial', icon: '💰' },
        { id: 'resources', label: 'Resources', icon: '🔧' },
        { id: 'risks', label: 'Risk Management', icon: '🛡️' },
        { id: 'sustainability', label: 'Sustainability', icon: '🌱' }
    ];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back to Analysis</Text>
                </TouchableOpacity>
                <Text style={styles.title}>🎯 AI Master Execution Plan</Text>
                <Text style={styles.subtitle}>Complete roadmap for {primaryCrop?.name} cultivation success</Text>
            </View>
            
            <ScrollView contentContainerStyle={styles.analysisContainer}>
                {/* Enhanced Executive Summary */}
                <AnimatedCard>
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryHeader}>
                            <Text style={styles.summaryIcon}>🚀</Text>
                            <View style={styles.summaryHeaderText}>
                                <Text style={styles.summaryTitle}>AI-Powered Executive Summary</Text>
                                <Text style={styles.summarySubtitle}>Data-driven strategic roadmap</Text>
                            </View>
                        </View>
                        
                        <Text style={styles.summaryText}>
                            This comprehensive 360° plan integrates insights from 8 AI analysis modules with real-time market data. 
                            Strategic approach: cultivate <Text style={styles.highlight}>{primaryCrop?.name}</Text> on <Text style={styles.highlight}>{landSize} acres</Text>, 
                            leverage <Text style={styles.highlight}>KCC financing (₹{kccEligibility})</Text>, secure with 
                            <Text style={styles.highlight}> PMFBY insurance (₹{insurancePremium} premium)</Text>, and execute 
                            <Text style={styles.highlight}>precision market strategy</Text> for optimal ROI.
                        </Text>
                        
                        <View style={styles.kpiGrid}>
                            <View style={styles.kpiCard}>
                                <Text style={styles.kpiValue}>₹{expectedProfit}</Text>
                                <Text style={styles.kpiLabel}>Expected Profit</Text>
                                <Text style={styles.kpiChange}>+23% vs avg</Text>
                            </View>
                            <View style={styles.kpiCard}>
                                <Text style={styles.kpiValue}>96.2%</Text>
                                <Text style={styles.kpiLabel}>AI Confidence</Text>
                                <Text style={styles.kpiChange}>Very High</Text>
                            </View>
                            <View style={styles.kpiCard}>
                                <Text style={styles.kpiValue}>18-24</Text>
                                <Text style={styles.kpiLabel}>ROI %</Text>
                                <Text style={styles.kpiChange}>months</Text>
                            </View>
                            <View style={styles.kpiCard}>
                                <Text style={styles.kpiValue}>Low</Text>
                                <Text style={styles.kpiLabel}>Risk Level</Text>
                                <Text style={styles.kpiChange}>Mitigated</Text>
                            </View>
                        </View>
                    </View>
                </AnimatedCard>

                {/* Tab Navigation */}
                <View style={styles.tabContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {tabs.map((tab) => (
                            <TouchableOpacity
                                key={tab.id}
                                style={[styles.tabButton, activeTab === tab.id && styles.activeTabButton]}
                                onPress={() => setActiveTab(tab.id)}
                            >
                                <Text style={styles.tabIcon}>{tab.icon}</Text>
                                <Text style={[styles.tabLabel, activeTab === tab.id && styles.activeTabLabel]}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Timeline Tab */}
                {activeTab === 'timeline' && (
                    <>
                        {/* Phase Navigation */}
                        <View style={styles.phaseNavigation}>
                            <Text style={styles.sectionTitle}>📊 Execution Timeline (8 Phases)</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={styles.phaseButtons}>
                                    {phases.map((phase, index) => (
                                        <TouchableOpacity 
                                            key={index}
                                            style={[styles.phaseButton, activePhase === index && styles.phaseButtonActive]}
                                            onPress={() => setActivePhase(index)}
                                        >
                                            <Text style={[styles.phaseButtonText, activePhase === index && styles.phaseButtonTextActive]}>
                                                {phase}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>

                {/* Phase 1: Pre-Season Foundation */}
                {activePhase === 0 && (
                    <AnimatedCard>
                        <DetailCard title="Phase 1: Pre-Season Foundation (July 25 - Aug 31, 2025)" color="#E74C3C">
                            <Text style={styles.phaseDescription}>
                                Critical preparation phase focusing on financial arrangements, insurance, and infrastructure setup. 
                                This phase determines 70% of your season's success.
                            </Text>
                            
                            <TimelineNode 
                                isFirst 
                                title="Secure Primary Financing (URGENT)" 
                                date="Priority 1: Complete by Aug 5" 
                                details={`Apply for Kisan Credit Card immediately. Required documents: Land records, Aadhaar, PAN, bank statements. Your estimated eligibility: ₹${kccEligibility}. Visit your nearest bank branch or use online portal. This financing covers 80% of your input costs.`}
                                priority="high"
                            />
                            
                            <TimelineNode 
                                title="Crop Insurance Enrollment (DEADLINE CRITICAL)" 
                                date="Deadline: July 31, 2025" 
                                details={`Enroll in PM Fasal Bima Yojana through your bank or nearest CSC. Premium: ₹${insurancePremium} for ₹${(landSize * 70000).toLocaleString('en-IN')} coverage. This protects against weather risks, pests, and diseases. Cannot be done after deadline.`}
                                priority="high"
                            />
                            
                            <TimelineNode 
                                title="Soil Health Assessment" 
                                date="Aug 1-10, 2025" 
                                details={`Request Soil Health Card from village extension officer. Free service providing detailed nutrient analysis. Results guide fertilizer recommendations, potentially saving ₹${(landSize * 2000).toLocaleString('en-IN')} on unnecessary inputs.`}
                            />
                            
                            <TimelineNode 
                                title="Quality Input Procurement" 
                                date="Aug 10-20, 2025" 
                                details={`Purchase certified ${primaryCrop?.name} seeds (requirement: ${landSize * 2} kg), DAP fertilizer (${landSize * 50} kg), Urea (${landSize * 40} kg). Source from authorized dealers for quality assurance. Budget: ₹${(landSize * 8000).toLocaleString('en-IN')} from KCC funds.`}
                            />
                            
                            <TimelineNode 
                                title="Equipment & Labor Arrangement" 
                                date="Aug 15-25, 2025" 
                                details={`Book tractor for land preparation through CHC app (15% cost saving vs. direct hire). Arrange labor contracts for sowing season. Current rates: Tractor ₹900/hour, Labor ₹550/day. Pre-booking ensures availability during peak season.`}
                            />
                            
                            <TimelineNode 
                                isLast
                                title="Land Preparation & Infrastructure" 
                                date="Aug 20-31, 2025" 
                                details={`Complete ploughing (2 passes), harrowing, and field leveling. Install/repair irrigation infrastructure if needed. Check drainage systems for excess water management. This phase completion sets foundation for optimal germination.`}
                            />
                        </DetailCard>
                    </AnimatedCard>
                )}

                {/* Phase 2: Growing Season */}
                {activePhase === 1 && (
                    <AnimatedCard>
                        <DetailCard title="Phase 2: Growth & Management (Sep 1 - Dec 31, 2025)" color="#2ECC71">
                            <Text style={styles.phaseDescription}>
                                Active crop management phase requiring precise timing and monitoring. Weather-responsive 
                                decisions and nutrient management are critical during this 4-month period.
                            </Text>
                            
                            <TimelineNode 
                                isFirst
                                title="Optimal Sowing Window" 
                                date="Sep 1-15, 2025" 
                                details={`Complete sowing within this window for maximum monsoon benefit. Sowing depth: 3-4 cm, spacing: 45 cm between rows. Use seed treatment with fungicide before planting. Monitor weather for 7-day dry spell post-sowing for optimal germination.`}
                            />
                            
                            <TimelineNode 
                                title="First Irrigation & Fertilization" 
                                date="Sep 20-30, 2025" 
                                details={`Apply first irrigation if rainfall is insufficient (< 25mm in week). First fertilizer dose: 50% of recommended DAP at planting. Monitor soil moisture at 6-inch depth. Proper water management ensures 90%+ germination rate.`}
                            />
                            
                            <TimelineNode 
                                title="Government Scheme Applications" 
                                date="Oct 1-15, 2025" 
                                details={`Apply for PM-KUSUM solar pump subsidy if applicable. Submit Soil Health Card request if not done earlier. Register for PM-Kisan benefits (₹2,000 installment due). Complete MGNREGA linkage for additional labor support during peak season.`}
                            />
                            
                            <TimelineNode 
                                title="First Weeding & Plant Protection" 
                                date="Oct 15-30, 2025" 
                                details={`Manual weeding or mechanical cultivation to remove competition. Apply preventive pesticide spray based on weather conditions and pest monitoring. Focus on early pest detection - costs ₹500/acre vs ₹2,000/acre for curative treatment.`}
                            />
                            
                            <TimelineNode 
                                title="Mid-Season Fertilization" 
                                date="Nov 1-15, 2025" 
                                details={`Apply remaining 50% fertilizer dose based on plant growth and soil test results. Consider organic manure addition (2-3 tons/acre) for improved soil health. Monitor for nutrient deficiency symptoms - yellowing indicates nitrogen need.`}
                            />
                            
                            <TimelineNode 
                                title="Advanced Pest & Disease Management" 
                                date="Nov 20 - Dec 10, 2025" 
                                details={`Implement IPM strategies. Monitor for specific ${primaryCrop?.name} pests using pheromone traps. Weather-based spray decisions reduce chemical costs by 30%. Consider biocontrol agents for sustainable pest management.`}
                            />
                            
                            <TimelineNode 
                                isLast
                                title="Pre-Harvest Preparations" 
                                date="Dec 15-31, 2025" 
                                details={`Arrange harvesting equipment booking. Contact buyers or APMC for price updates. Stop irrigation 15 days before harvest for proper crop maturation. Plan post-harvest storage if opting for delayed sales strategy.`}
                            />
                        </DetailCard>
                    </AnimatedCard>
                )}

                {/* Phase 3: Harvest */}
                {activePhase === 2 && (
                    <AnimatedCard>
                        <DetailCard title="Phase 3: Harvest Operations (Jan 1 - Feb 15, 2026)" color="#F39C12">
                            <Text style={styles.phaseDescription}>
                                Critical harvest window requiring efficient operations and quality preservation. 
                                Timing and handling directly impact final profit realization.
                            </Text>
                            
                            <TimelineNode 
                                isFirst
                                title="Harvest Readiness Assessment" 
                                date="Jan 1-10, 2026" 
                                details={`Monitor crop maturity indicators specific to ${primaryCrop?.name}. Moisture content testing for optimal harvest timing. Weather forecast analysis for 10-day dry spell requirement. Early harvest reduces quality, delayed harvest increases field losses.`}
                            />
                            
                            <TimelineNode 
                                title="Harvesting Operations" 
                                date="Jan 10 - Feb 5, 2026" 
                                details={`Execute harvesting using pre-booked machinery or manual labor. Current rates: Combined harvester ₹1,200/hour, Manual harvesting ₹600/day per worker. Maintain quality during cutting, collection, and initial handling to maximize market price.`}
                            />
                            
                            <TimelineNode 
                                title="Post-Harvest Processing" 
                                date="Jan 15 - Feb 10, 2026" 
                                details={`Proper drying to optimal moisture content (12-14% for grains). Cleaning and grading to improve market price by 8-12%. Arrange transportation to market or storage facility. Quality processing adds ₹200-300 per quintal to selling price.`}
                            />
                            
                            <TimelineNode 
                                isLast
                                title="Quality Assessment & Documentation" 
                                date="Feb 1-15, 2026" 
                                details={`Conduct yield assessment and quality analysis. Document total production, grade-wise classification, and cost calculations. Prepare for market analysis to determine optimal selling strategy based on current prices vs storage costs.`}
                            />
                        </DetailCard>
                    </AnimatedCard>
                )}

                {/* Phase 4: Post-Harvest */}
                {activePhase === 3 && (
                    <AnimatedCard>
                        <DetailCard title="Phase 4: Market Strategy & Profit Realization (Feb 16 - May 31, 2026)" color="#9B59B6">
                            <Text style={styles.phaseDescription}>
                                Strategic market engagement phase focused on profit maximization. Data-driven selling 
                                decisions and financial planning for next season.
                            </Text>
                            
                            <TimelineNode 
                                isFirst
                                title="Market Analysis & Price Monitoring" 
                                date="Feb 16-28, 2026" 
                                details={`Implement AI-recommended market strategy: ${MOCK_DB.MARKET_ANALYSIS[primaryCrop?.id]?.recommendation}. Monitor daily prices across multiple markets. Consider storage costs (₹50/quintal/month) vs expected price appreciation. Decision window is critical.`}
                            />
                            
                            <TimelineNode 
                                title="Strategic Sales Execution" 
                                date="Mar 1-31, 2026" 
                                details={`Execute sales in planned tranches to average market prices. Target selling price: ₹${MOCK_DB.MARKET_ANALYSIS[primaryCrop?.id]?.currentPrice} or higher. Maintain quality during storage period. Consider forward contracts for price security.`}
                            />
                            
                            <TimelineNode 
                                title="Financial Settlement & Analysis" 
                                date="Apr 1-30, 2026" 
                                details={`Complete loan repayments to maintain credit score for next season. Calculate actual vs projected profits. Document lessons learned and successful practices. Plan investment in farm infrastructure using profits for next season enhancement.`}
                            />
                            
                            <TimelineNode 
                                isLast
                                title="Next Season Planning" 
                                date="May 1-31, 2026" 
                                details={`Use AI analysis for next season crop selection based on market trends, climate forecasts, and personal financial goals. Reinvest 30% of profits in farm improvement. Update farm resource inventory and plan capacity expansion if profitable.`}
                            />
                        </DetailCard>
                    </AnimatedCard>
                )}

                {/* Financial Summary */}
                <AnimatedCard delay={400}>
                    <DetailCard title="Comprehensive Financial Projection" color="#34495E">
                        <View style={styles.financialSummary}>
                            <View style={styles.financialSection}>
                                <Text style={styles.financialSectionTitle}>Investment Breakdown</Text>
                                <View style={styles.financialRow}>
                                    <Text style={styles.financialLabel}>Total Investment Required:</Text>
                                    <Text style={styles.financialValue}>₹{totalInvestment}</Text>
                                </View>
                                <View style={styles.financialRow}>
                                    <Text style={styles.financialSubLabel}>- Seeds & Fertilizers (40%):</Text>
                                    <Text style={styles.financialSubValue}>₹{(landSize * (primaryCrop?.baseCost || 20000) * 0.4).toLocaleString('en-IN')}</Text>
                                </View>
                                <View style={styles.financialRow}>
                                    <Text style={styles.financialSubLabel}>- Labor & Machinery (35%):</Text>
                                    <Text style={styles.financialSubValue}>₹{(landSize * (primaryCrop?.baseCost || 20000) * 0.35).toLocaleString('en-IN')}</Text>
                                </View>
                                <View style={styles.financialRow}>
                                    <Text style={styles.financialSubLabel}>- Other Expenses (25%):</Text>
                                    <Text style={styles.financialSubValue}>₹{(landSize * (primaryCrop?.baseCost || 20000) * 0.25).toLocaleString('en-IN')}</Text>
                                </View>
                            </View>

                            <View style={styles.financialSection}>
                                <Text style={styles.financialSectionTitle}>Revenue Streams</Text>
                                <View style={styles.financialRow}>
                                    <Text style={styles.financialLabel}>Primary Crop Sales:</Text>
                                    <Text style={[styles.financialValue, {color: '#58D68D'}]}>₹{(landSize * (primaryCrop?.baseRevenue || 50000)).toLocaleString('en-IN')}</Text>
                                </View>
                                <View style={styles.financialRow}>
                                    <Text style={styles.financialSubLabel}>- By-product Sales:</Text>
                                    <Text style={styles.financialSubValue}>₹{(landSize * (primaryCrop?.baseRevenue || 50000) * 0.1).toLocaleString('en-IN')}</Text>
                                </View>
                                <View style={styles.financialRow}>
                                    <Text style={styles.financialSubLabel}>- Government Support:</Text>
                                    <Text style={styles.financialSubValue}>₹{(landSize * 6000).toLocaleString('en-IN')}</Text>
                                </View>
                            </View>

                            <View style={styles.financialDivider} />
                            <View style={styles.financialRow}>
                                <Text style={styles.financialNetLabel}>Net Profit Projection:</Text>
                                <Text style={[styles.financialValue, {color: '#58D68D', fontSize: 24, fontWeight: 'bold'}]}>
                                    ₹{(landSize * ((primaryCrop?.baseRevenue || 50000) - (primaryCrop?.baseCost || 20000)) + landSize * (primaryCrop?.baseRevenue || 50000) * 0.1 + landSize * 6000).toLocaleString('en-IN')}
                                </Text>
                            </View>
                            <View style={styles.financialRow}>
                                <Text style={styles.financialLabel}>Return on Investment:</Text>
                                <Text style={[styles.financialValue, {color: '#58D68D'}]}>
                                    {((((landSize * ((primaryCrop?.baseRevenue || 50000) - (primaryCrop?.baseCost || 20000))) / (landSize * (primaryCrop?.baseCost || 20000))) * 100).toFixed(1))}%
                                </Text>
                            </View>
                        </View>
                    </DetailCard>
                </AnimatedCard>

                {/* Risk Management Summary */}
                <AnimatedCard delay={600}>
                    <DetailCard title="Risk Management & Contingency Planning" color="#E74C3C">
                        <View style={styles.riskManagement}>
                            <Text style={styles.riskTitle}>Identified Risks & Mitigation Strategies</Text>
                            
                            <View style={styles.riskItem}>
                                <View style={styles.riskHeader}>
                                    <Icon name="🌧️" style={styles.riskIcon} />
                                    <Text style={styles.riskName}>Weather Risk (Low Probability)</Text>
                                </View>
                                <Text style={styles.riskMitigation}>Mitigation: PMFBY insurance coverage, diversified planting schedule, drainage infrastructure</Text>
                            </View>
                            
                            <View style={styles.riskItem}>
                                <View style={styles.riskHeader}>
                                    <Icon name="🐛" style={styles.riskIcon} />
                                    <Text style={styles.riskName}>Pest/Disease Risk (Medium Probability)</Text>
                                </View>
                                <Text style={styles.riskMitigation}>Mitigation: IPM practices, regular monitoring, weather-based spray decisions, resistant varieties</Text>
                            </View>
                            
                            <View style={styles.riskItem}>
                                <View style={styles.riskHeader}>
                                    <Icon name="📉" style={styles.riskIcon} />
                                    <Text style={styles.riskName}>Market Price Risk (Low Probability)</Text>
                                </View>
                                <Text style={styles.riskMitigation}>Mitigation: MSP support, strategic storage, diversified selling approach, forward contracts</Text>
                            </View>
                            
                            <View style={styles.riskItem}>
                                <View style={styles.riskHeader}>
                                    <Icon name="💰" style={styles.riskIcon} />
                                    <Text style={styles.riskName}>Cash Flow Risk (Low Probability)</Text>
                                </View>
                                <Text style={styles.riskMitigation}>Mitigation: KCC credit line, staggered input purchases, emergency fund (10% of investment)</Text>
                            </View>
                        </View>
                    </DetailCard>
                </AnimatedCard>

                {/* Success Metrics */}
                <AnimatedCard delay={800}>
                    <View style={styles.successMetrics}>
                        <Text style={styles.successTitle}>Success Indicators & Monitoring</Text>
                        <View style={styles.successGrid}>
                            <View style={styles.successItem}>
                                <Text style={styles.successMetric}>95%+</Text>
                                <Text style={styles.successLabel}>Germination Rate</Text>
                            </View>
                            <View style={styles.successItem}>
                                <Text style={styles.successMetric}>₹{MOCK_DB.MARKET_ANALYSIS[primaryCrop?.id]?.currentPrice || '3,500'}</Text>
                                <Text style={styles.successLabel}>Target Price/Quintal</Text>
                            </View>
                            <View style={styles.successItem}>
                                <Text style={styles.successMetric}>40+</Text>
                                <Text style={styles.successLabel}>Quintals/Acre</Text>
                            </View>
                            <View style={styles.successItem}>
                                <Text style={styles.successMetric}>65%+</Text>
                                <Text style={styles.successLabel}>Profit Margin</Text>
                            </View>
                        </View>
                    </View>
                </AnimatedCard>
                </>
                )}

                {/* Other tabs content would go here */}

            </ScrollView>
        </SafeAreaView>
    );
};

// Crop Plan Selection Screen for Master Plans
const CropPlanSelectionScreen = ({ onBack, onCropSelect }) => {
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [planDetails, setPlanDetails] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const crops = Object.values(MOCK_DB.crops);

  const analyzeCropCompatibility = (crop) => {
    setAnalyzing(true);
    setSelectedCrop(crop);
    
    // Simulate AI analysis
    setTimeout(() => {
      const compatibility = {
        score: Math.floor(70 + Math.random() * 30),
        profitProjection: Math.floor(50000 + Math.random() * 100000),
        riskLevel: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
        roiPercentage: Math.floor(15 + Math.random() * 25),
        seasonalAdvantage: Math.random() > 0.5
      };
      
      setPlanDetails(compatibility);
      setAnalyzing(false);
    }, 2000);
  };

  const generateMasterPlan = () => {
    if (selectedCrop) {
      onCropSelect(selectedCrop);
    }
  };

  return (
    <View style={styles.container}>
      <CustomHeader title="Select Crop for Master Plan" onBack={onBack} />
      
      <ScrollView contentContainerStyle={styles.analysisContainer}>
        {/* AI Crop Recommendation Header */}
        <AnimatedCard>
          <View style={styles.aiRecommendationHeader}>
            <Text style={styles.aiTitle}>🤖 AI Crop Selection Assistant</Text>
            <Text style={styles.aiSubtitle}>
              Select a crop to generate a comprehensive master plan with detailed analysis
            </Text>
          </View>
        </AnimatedCard>

        {/* Crop Selection Grid */}
        <View style={styles.cropGrid}>
          {crops.map((crop, index) => (
            <TouchableOpacity
              key={crop.name}
              style={[
                styles.cropSelectionCard,
                selectedCrop?.name === crop.name && styles.selectedCropCard
              ]}
              onPress={() => analyzeCropCompatibility(crop)}
            >
              <Text style={styles.cropEmoji}>{crop.emoji}</Text>
              <Text style={styles.cropName}>{crop.name}</Text>
              <Text style={styles.cropSeason}>Season: {crop.season}</Text>
              <Text style={styles.cropMarketPrice}>₹{crop.marketPrice}/kg</Text>
              
              {selectedCrop?.name === crop.name && (
                <View style={styles.selectedIndicator}>
                  <Text style={styles.selectedText}>✓ Selected</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Analysis Results */}
        {analyzing && selectedCrop && (
          <AnimatedCard>
            <View style={styles.analyzingContainer}>
              <Text style={styles.analyzingTitle}>🔍 Analyzing {selectedCrop.name}...</Text>
              <View style={styles.loadingDots}>
                <Text style={styles.loadingDot}>●</Text>
                <Text style={styles.loadingDot}>●</Text>
                <Text style={styles.loadingDot}>●</Text>
              </View>
              <Text style={styles.analyzingSubtext}>
                Evaluating soil compatibility, market trends, seasonal factors...
              </Text>
            </View>
          </AnimatedCard>
        )}

        {/* Compatibility Analysis */}
        {planDetails && selectedCrop && !analyzing && (
          <AnimatedCard>
            <View style={styles.compatibilityCard}>
              <Text style={styles.compatibilityTitle}>
                📊 {selectedCrop.name} Analysis Results
              </Text>
              
              <View style={styles.compatibilityGrid}>
                <View style={styles.compatibilityItem}>
                  <Text style={styles.compatibilityLabel}>Compatibility Score</Text>
                  <Text style={[
                    styles.compatibilityValue,
                    { color: planDetails.score > 85 ? '#58D68D' : planDetails.score > 70 ? '#F39C12' : '#E74C3C' }
                  ]}>
                    {planDetails.score}%
                  </Text>
                </View>
                
                <View style={styles.compatibilityItem}>
                  <Text style={styles.compatibilityLabel}>Profit Projection</Text>
                  <Text style={styles.compatibilityValue}>₹{planDetails.profitProjection.toLocaleString()}</Text>
                </View>
                
                <View style={styles.compatibilityItem}>
                  <Text style={styles.compatibilityLabel}>Risk Level</Text>
                  <Text style={[
                    styles.compatibilityValue,
                    { color: planDetails.riskLevel === 'Low' ? '#58D68D' : 
                             planDetails.riskLevel === 'Medium' ? '#F39C12' : '#E74C3C' }
                  ]}>
                    {planDetails.riskLevel}
                  </Text>
                </View>
                
                <View style={styles.compatibilityItem}>
                  <Text style={styles.compatibilityLabel}>Expected ROI</Text>
                  <Text style={styles.compatibilityValue}>{planDetails.roiPercentage}%</Text>
                </View>
              </View>

              {planDetails.seasonalAdvantage && (
                <View style={styles.advantageBadge}>
                  <Text style={styles.advantageText}>🌟 Seasonal Advantage Available</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.generatePlanButton}
                onPress={generateMasterPlan}
              >
                <Text style={styles.generatePlanText}>Generate Master Plan for {selectedCrop.name}</Text>
              </TouchableOpacity>
            </View>
          </AnimatedCard>
        )}

        {/* Quick Insights */}
        <AnimatedCard>
          <View style={styles.quickInsights}>
            <Text style={styles.insightsTitle}>💡 Quick Insights</Text>
            <View style={styles.insightsList}>
              <Text style={styles.insightItem}>• Weather conditions favor {crops[0].name} and {crops[1].name}</Text>
              <Text style={styles.insightItem}>• Market demand is high for {crops[2].name}</Text>
              <Text style={styles.insightItem}>• Government subsidies available for {crops[3].name}</Text>
              <Text style={styles.insightItem}>• Soil analysis suggests optimal conditions for most crops</Text>
            </View>
          </View>
        </AnimatedCard>
      </ScrollView>
    </View>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A1A' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A1A1A' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 15 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  formContainer: { padding: 20 },
  cropGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', padding: 10 },
  dashboardGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', padding: 10 },
  dashboardContent: { flex: 1 },
  analysisContainer: { padding: 20, paddingBottom: 40 },
  
  // Typography
  title: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF' },
  subtitle: { fontSize: 18, color: '#A9A9A9', marginTop: 4 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF', marginTop: 25, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#333333', paddingBottom: 10 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#58D68D', marginTop: 20, marginBottom: 10 },
  
  // Loading & Progress
  loadingContainer: { alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 15, fontSize: 16, color: '#A9A9A9', textAlign: 'center' },
  progressBarContainer: { width: 200, height: 4, backgroundColor: '#2C2C2C', borderRadius: 2, marginTop: 10 },
  progressBar: { height: '100%', borderRadius: 2 },
  
  // Buttons
  backButton: { marginBottom: 15 },
  backButtonText: { fontSize: 18, color: '#58D68D', fontWeight: '600' },
  button: { backgroundColor: '#58D68D', padding: 16, margin: 20, borderRadius: 12, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#4A4A4A' },
  buttonText: { color: '#1A1A1A', fontSize: 18, fontWeight: 'bold' },
  
  // Profile & Navigation
  profileButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#2C2C2C', justifyContent: 'center', alignItems: 'center' },
  
  // AI Indicators
  aiIndicator: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: 'rgba(88, 214, 141, 0.1)', padding: 8, borderRadius: 8 },
  aiIndicatorText: { fontSize: 14, color: '#58D68D', marginLeft: 8 },
  
  // Form Elements
  formSection: { marginBottom: 20 },
  label: { fontSize: 16, color: '#A9A9A9', marginBottom: 10, fontWeight: '600' },
  textInput: { height: 50, backgroundColor: '#2C2C2C', borderRadius: 10, paddingHorizontal: 15, fontSize: 16, color: '#FFFFFF', borderWidth: 1, borderColor: '#4A4A4A', marginBottom: 15 },
  optionContainer: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  optionButton: { flex: 1, padding: 15, backgroundColor: '#2C2C2C', borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#4A4A4A' },
  optionButtonSelected: { backgroundColor: '#58D68D', borderColor: '#58D68D' },
  optionButtonText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' },
  optionButtonTextSelected: { color: '#1A1A1A' },
  
  // Machinery Selection
  machineryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  machineryOption: { paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#2C2C2C', borderRadius: 8, borderWidth: 1, borderColor: '#4A4A4A' },
  machineryOptionSelected: { backgroundColor: '#58D68D', borderColor: '#58D68D' },
  machineryText: { fontSize: 14, color: '#FFFFFF' },
  machineryTextSelected: { color: '#1A1A1A' },
  
  // Crop Cards
  cropCard: { width: '45%', aspectRatio: 0.9, margin: '2.5%', backgroundColor: '#2C2C2C', borderRadius: 16, padding: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  cropCardSelected: { borderColor: '#58D68D' },
  cropImage: { width: '80%', height: '50%', borderRadius: 12 },
  cropName: { marginTop: 8, fontSize: 16, fontWeight: '600', textAlign: 'center', color: '#FFFFFF' },
  cropDetails: { marginTop: 8, alignItems: 'center' },
  cropDetail: { fontSize: 12, color: '#A9A9A9', marginVertical: 2 },
  checkIcon: { position: 'absolute', top: 10, right: 10, backgroundColor: '#58D68D', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  
  // Dashboard Cards
  dashboardCard: { width: '48%', minHeight: 180, aspectRatio: 0.95, backgroundColor: '#2C2C2C', borderRadius: 20, margin: '1%', alignItems: 'center', justifyContent: 'space-between', padding: 15 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' },
  cardBadge: { backgroundColor: '#58D68D', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  cardBadgeText: { fontSize: 10, color: '#1A1A1A', fontWeight: 'bold' },
  dashboardCardTitle: { fontSize: 15, fontWeight: '600', textAlign: 'center', color: '#FFFFFF', marginTop: 8 },
  dashboardCardDesc: { fontSize: 12, color: '#A9A9A9', textAlign: 'center', marginTop: 4, flex: 1 },
  cardFooter: { marginTop: 'auto' },
  cardAction: { fontSize: 14, color: '#58D68D', fontWeight: '600' },
  icon: { fontSize: 36 },
  
  // Current Crop Status
  currentCropCard: { backgroundColor: '#2C2C2C', borderRadius: 12, padding: 20, marginBottom: 15 },
  cropStatusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cropStatusTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  statusBadge: { backgroundColor: '#58D68D', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, color: '#1A1A1A', fontWeight: 'bold' },
  cropMetrics: { flexDirection: 'row', gap: 15 },
  
  // Metric Cards
  metricCard: { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 10, padding: 12 },
  metricHeader: { flexDirection: 'row', alignItems: 'center' },
  metricIcon: { fontSize: 20, marginRight: 8 },
  metricContent: { flex: 1 },
  metricTitle: { fontSize: 12, color: '#A9A9A9', marginBottom: 2 },
  metricValue: { fontSize: 16, fontWeight: 'bold' },
  metricSubtitle: { fontSize: 10, color: '#A9A9A9', marginTop: 2 },
  metricTrend: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  
  // AI Insights
  aiInsightCard: { backgroundColor: '#2C2C2C', borderRadius: 12, padding: 20, marginBottom: 15 },
  aiInsightHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  aiInsightTitle: { fontSize: 16, fontWeight: 'bold', color: '#58D68D', marginLeft: 10 },
  aiInsightText: { fontSize: 15, color: '#E0E0E0', lineHeight: 22 },
  insightDots: { flexDirection: 'row', justifyContent: 'center', marginTop: 15, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4A4A4A' },
  activeDot: { backgroundColor: '#58D68D' },
  
  // Quick Actions
  quickActions: { marginBottom: 20 },
  quickActionGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  quickActionButton: { backgroundColor: '#2C2C2C', borderRadius: 12, padding: 15, alignItems: 'center', width: '22%' },
  quickActionText: { fontSize: 10, color: '#FFFFFF', marginTop: 8, textAlign: 'center' },
  
  // Analysis Cards
  analysisCard: { backgroundColor: '#2C2C2C', borderRadius: 12, padding: 20, marginBottom: 15 },
  analysisCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  analysisCardTitle: { fontSize: 16, fontWeight: '600', color: '#A9A9A9', marginLeft: 10 },
  analysisCardValue: { fontSize: 26, fontWeight: 'bold', marginBottom: 8 },
  analysisCardDetails: { fontSize: 14, color: '#A9A9A9', lineHeight: 20, marginBottom: 10 },
  metricsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, marginTop: 10 },
  metricItem: { flex: 1, minWidth: '45%' },
  metricLabel: { fontSize: 12, color: '#A9A9A9', marginBottom: 2 },
  metricText: { fontSize: 14, fontWeight: '600' },
  
  // Detail Cards
  detailCard: { backgroundColor: '#2C2C2C', borderRadius: 12, padding: 20, marginBottom: 15 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  detailIndicator: { width: 4, height: 20, borderRadius: 2, marginRight: 12 },
  detailTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  detailContent: { flex: 1 },
  
  // Reason Cards
  reasonCard: { backgroundColor: 'rgba(88, 214, 141, 0.1)', borderRadius: 12, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(88, 214, 141, 0.2)' },
  reasonHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reasonCardTitle: { color: '#58D68D', fontSize: 16, fontWeight: 'bold' },
  reasonCardContent: { color: '#E0E0E0', fontSize: 14, lineHeight: 20 },
  confidenceBadge: { backgroundColor: 'rgba(88, 214, 141, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  confidenceText: { fontSize: 10, color: '#58D68D', fontWeight: 'bold' },
  impactIndicator: { marginTop: 8, alignSelf: 'flex-start' },
  impactText: { fontSize: 12, color: '#F39C12', fontWeight: '600' },
  
  // Financial Breakdown
  financialBreakdown: { marginTop: 10 },
  profitCard: { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 20 },
  profitTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 15 },
  profitSection: { marginBottom: 15 },
  profitSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#58D68D', marginBottom: 10 },
  profitRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  profitLabel: { fontSize: 14, color: '#A9A9A9', flex: 1 },
  profitSubLabel: { fontSize: 12, color: '#A9A9A9', marginLeft: 20, flex: 1 },
  profitValue: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  profitSubValue: { fontSize: 14, color: '#FFFFFF' },
  profitDivider: { height: 1, backgroundColor: '#4A4A4A', marginVertical: 15 },
  profitNetLabel: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  
  // Price Chart
  priceChart: { marginTop: 10 },
  chartTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 15, textAlign: 'center' },
  priceHistory: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100, marginBottom: 15 },
  priceBar: { flex: 1, alignItems: 'center', marginHorizontal: 2 },
  priceBarFill: { backgroundColor: '#3498DB', width: '80%', borderRadius: 2 },
  priceLabel: { fontSize: 10, color: '#A9A9A9', marginTop: 5, textAlign: 'center' },
  
  // Loan Comparison
  loanTable: { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 15, marginTop: 10 },
  loanHeaderRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#4A4A4A', paddingBottom: 10, marginBottom: 10 },
  loanRow: { flexDirection: 'row', paddingVertical: 8 },
  loanHeaderLabel: { flex: 1, color: '#A9A9A9', fontWeight: 'bold', textAlign: 'center', fontSize: 12 },
  loanLabel: { flex: 1, color: '#E0E0E0', textAlign: 'left', fontSize: 12 },
  loanValue: { flex: 1, color: '#E0E0E0', fontWeight: '600', textAlign: 'center', fontSize: 12 },
  loanValueRecommended: { color: '#58D68D' },
  loanDescription: { fontSize: 14, color: '#E0E0E0', marginBottom: 10 },
  prosConsContainer: { flexDirection: 'row', gap: 15 },
  prosColumn: { flex: 1 },
  consColumn: { flex: 1 },
  prosConsTitle: { fontSize: 14, fontWeight: 'bold', color: '#58D68D', marginBottom: 5 },
  prosText: { fontSize: 12, color: '#58D68D', marginBottom: 3 },
  consText: { fontSize: 12, color: '#F39C12', marginBottom: 3 },
  
  // Schemes
  schemeDescription: { fontSize: 14, color: '#E0E0E0', lineHeight: 20, marginBottom: 10 },
  schemeDetails: { backgroundColor: '#1A1A1A', borderRadius: 8, padding: 12 },
  schemeDetailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  schemeDetailLabel: { fontSize: 12, color: '#A9A9A9' },
  schemeDetailValue: { fontSize: 12, color: '#FFFFFF', fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 10 },
  
  // Factors & Recommendations
  factorText: { fontSize: 13, color: '#E0E0E0', marginBottom: 4, lineHeight: 18 },
  recommendationText: { fontSize: 13, color: '#E0E0E0', marginBottom: 4, lineHeight: 18 },
  
  // Risk Management
  riskContainer: { marginTop: 10 },
  riskItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, backgroundColor: '#1A1A1A', padding: 12, borderRadius: 8 },
  riskIcon: { fontSize: 16, marginRight: 10, marginTop: 2 },
  riskText: { flex: 1, fontSize: 14, color: '#E0E0E0', lineHeight: 18 },
  
  // Fertilizer Plan
  fertilizerPlan: { marginTop: 10 },
  fertilizerItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, backgroundColor: '#1A1A1A', padding: 10, borderRadius: 6 },
  fertilizerIcon: { fontSize: 14, marginRight: 8, marginTop: 2 },
  fertilizerText: { flex: 1, fontSize: 13, color: '#E0E0E0', lineHeight: 18 },
  
  // Timeline
  timelineNode: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  timelineIconContainer: { alignItems: 'center', marginRight: 15 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#4A4A4A' },
  timelineCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#2C2C2C', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#4A4A4A', marginVertical: 5 },
  timelineTextContainer: { flex: 1, paddingBottom: 15 },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  timelineTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', flex: 1 },
  timelineDate: { fontSize: 12, color: '#58D68D', marginBottom: 8, fontWeight: '600' },
  timelineDetails: { fontSize: 14, color: '#A9A9A9', lineHeight: 20 },
  priorityBadge: { backgroundColor: '#E74C3C', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 10 },
  priorityText: { fontSize: 10, color: '#FFFFFF', fontWeight: 'bold' },
  
  // Master Plan Specific
  summaryCard: { backgroundColor: '#2C2C2C', borderRadius: 12, padding: 20, marginBottom: 20 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  summaryTitle: { fontSize: 18, fontWeight: 'bold', color: '#58D68D', marginLeft: 10 },
  summaryText: { fontSize: 16, color: '#E0E0E0', lineHeight: 24, marginBottom: 20 },
  highlight: { color: '#FFFFFF', fontWeight: 'bold' },
  summaryMetrics: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryMetric: { alignItems: 'center' },
  metricNumber: { fontSize: 18, fontWeight: 'bold', color: '#58D68D' },
  metricLabel: { fontSize: 12, color: '#A9A9A9', marginTop: 4, textAlign: 'center' },
  
  // Phase Navigation
  phaseNavigation: { marginBottom: 20 },
  phaseButtons: { flexDirection: 'row', gap: 8 },
  phaseButton: { flex: 1, backgroundColor: '#2C2C2C', padding: 12, borderRadius: 8, alignItems: 'center' },
  phaseButtonActive: { backgroundColor: '#58D68D' },
  phaseButtonText: { fontSize: 14, color: '#FFFFFF', fontWeight: '600' },
  phaseButtonTextActive: { color: '#1A1A1A' },
  phaseDescription: { fontSize: 15, color: '#E0E0E0', lineHeight: 22, marginBottom: 20, fontStyle: 'italic' },
  
  // Financial Summary
  financialSummary: { marginTop: 10 },
  financialSection: { marginBottom: 20 },
  financialSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#58D68D', marginBottom: 10 },
  financialRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  financialLabel: { fontSize: 14, color: '#A9A9A9', flex: 1 },
  financialValue: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  financialSubLabel: { fontSize: 12, color: '#A9A9A9', marginLeft: 15, flex: 1 },
  financialSubValue: { fontSize: 14, color: '#FFFFFF' },
  financialDivider: { height: 1, backgroundColor: '#4A4A4A', marginVertical: 15 },
  financialNetLabel: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  
  // Risk Management
  riskManagement: { marginTop: 10 },
  riskTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 15 },
  riskHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  riskName: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF', marginLeft: 8 },
  riskMitigation: { fontSize: 13, color: '#E0E0E0', lineHeight: 18, marginLeft: 24 },
  
  // Success Metrics
  successMetrics: { backgroundColor: '#2C2C2C', borderRadius: 12, padding: 20 },
  successTitle: { fontSize: 18, fontWeight: 'bold', color: '#58D68D', marginBottom: 15, textAlign: 'center' },
  successGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  successItem: { width: '48%', alignItems: 'center', marginBottom: 15, backgroundColor: '#1A1A1A', padding: 15, borderRadius: 8 },
  successMetric: { fontSize: 20, fontWeight: 'bold', color: '#58D68D', marginBottom: 5 },
  successLabel: { fontSize: 12, color: '#A9A9A9', textAlign: 'center' },
  
  // Crop Plan Selection Screen Styles
  aiRecommendationHeader: { backgroundColor: '#2C2C2C', borderRadius: 12, padding: 20, marginBottom: 20 },
  aiTitle: { fontSize: 22, fontWeight: 'bold', color: '#58D68D', textAlign: 'center', marginBottom: 8 },
  aiSubtitle: { fontSize: 14, color: '#E0E0E0', textAlign: 'center', lineHeight: 20 },
  
  cropSelectionCard: { 
    backgroundColor: '#2C2C2C', 
    borderRadius: 12, 
    padding: 15, 
    margin: 5, 
    width: '45%', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent'
  },
  selectedCropCard: { 
    borderColor: '#58D68D', 
    backgroundColor: 'rgba(88, 214, 141, 0.1)' 
  },
  cropEmoji: { fontSize: 40, marginBottom: 8 },
  cropName: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', marginBottom: 4 },
  cropSeason: { fontSize: 12, color: '#A9A9A9', marginBottom: 2 },
  cropMarketPrice: { fontSize: 14, color: '#58D68D', fontWeight: '600' },
  selectedIndicator: { 
    backgroundColor: '#58D68D', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12, 
    marginTop: 8 
  },
  selectedText: { fontSize: 12, color: '#1A1A1A', fontWeight: 'bold' },
  
  analyzingContainer: { alignItems: 'center', padding: 20 },
  analyzingTitle: { fontSize: 18, fontWeight: 'bold', color: '#F39C12', marginBottom: 15 },
  loadingDots: { flexDirection: 'row', gap: 8, marginBottom: 15 },
  loadingDot: { fontSize: 20, color: '#58D68D' },
  analyzingSubtext: { fontSize: 14, color: '#A9A9A9', textAlign: 'center' },
  
  compatibilityCard: { backgroundColor: '#2C2C2C', borderRadius: 12, padding: 20 },
  compatibilityTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 20, textAlign: 'center' },
  compatibilityGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  compatibilityItem: { width: '48%', backgroundColor: '#1A1A1A', padding: 15, borderRadius: 8, marginBottom: 10 },
  compatibilityLabel: { fontSize: 12, color: '#A9A9A9', marginBottom: 5 },
  compatibilityValue: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  
  advantageBadge: { 
    backgroundColor: 'rgba(88, 214, 141, 0.2)', 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(88, 214, 141, 0.3)'
  },
  advantageText: { fontSize: 14, color: '#58D68D', textAlign: 'center', fontWeight: '600' },
  
  generatePlanButton: { 
    backgroundColor: '#58D68D', 
    padding: 15, 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  generatePlanText: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' },
  
  quickInsights: { backgroundColor: '#2C2C2C', borderRadius: 12, padding: 20 },
  insightsTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 15 },
  insightsList: { gap: 8 },
  insightItem: { fontSize: 14, color: '#E0E0E0', lineHeight: 20 },
  
  // Enhanced Master Plan Styles
  summaryIcon: { fontSize: 32, marginRight: 15 },
  summaryHeaderText: { flex: 1 },
  summarySubtitle: { fontSize: 12, color: '#A9A9A9', marginTop: 2 },
  
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 20 },
  kpiCard: { 
    width: '48%', 
    backgroundColor: '#1A1A1A', 
    padding: 15, 
    borderRadius: 12, 
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A3A'
  },
  kpiValue: { fontSize: 18, fontWeight: 'bold', color: '#58D68D', marginBottom: 4 },
  kpiLabel: { fontSize: 12, color: '#A9A9A9', marginBottom: 2 },
  kpiChange: { fontSize: 10, color: '#F39C12', fontWeight: '600' },
  
  tabContainer: { marginBottom: 20 },
  tabButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#2C2C2C', 
    paddingHorizontal: 15, 
    paddingVertical: 10, 
    borderRadius: 20, 
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  activeTabButton: { 
    backgroundColor: 'rgba(88, 214, 141, 0.2)', 
    borderColor: '#58D68D' 
  },
  tabIcon: { fontSize: 16, marginRight: 8 },
  tabLabel: { fontSize: 14, color: '#A9A9A9', fontWeight: '600' },
  activeTabLabel: { color: '#58D68D' },
  
  // Resource Management Styles
  resourceCategories: { gap: 20 },
  resourceCategory: { backgroundColor: '#2C2C2C', padding: 15, borderRadius: 12 },
  resourceTitle: { fontSize: 16, fontWeight: 'bold', color: '#58D68D', marginBottom: 10 },
  resourceItem: { fontSize: 14, color: '#E0E0E0', marginBottom: 5, lineHeight: 20 },
  
  // Risk Management Enhanced Styles
  riskCategory: { marginBottom: 20 },
  riskIcon: { fontSize: 20, marginRight: 10 },
  
  // Sustainability Styles
  sustainabilitySection: { backgroundColor: '#2C2C2C', padding: 15, borderRadius: 12, marginBottom: 15 },
  sustainabilityTitle: { fontSize: 16, fontWeight: 'bold', color: '#58D68D', marginBottom: 10 },
  sustainabilityItem: { fontSize: 14, color: '#E0E0E0', marginBottom: 5, lineHeight: 20 },
});
