import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Animated, Easing, Dimensions, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScrollView as RNScrollView } from 'react-native';
import * as Speech from 'expo-speech';

const { width } = Dimensions.get('window');

// --- CROP DATA (ENHANCED) ---
const CROP_DATA = {
  sugarcane: {
    name: 'Sugarcane',
    icon: 'barley',
    plantingDate: '2024-10-15',
    totalDuration: '12-18 Months',
    stages: [
      { id: 1, title: 'Land Preparation', durationWeeks: 4, icon: 'shovel', color: '#a1662f', tasks: ['Deep ploughing', 'Apply FYM', 'Create furrows'], needs: 'Well-drained, loamy soil.', threats: 'Soil-borne pathogens.' },
      { id: 2, title: 'Planting', durationWeeks: 2, icon: 'seed-outline', color: '#8f9a62', tasks: ['Select healthy setts', 'Treat with fungicide', 'Plant in furrows'], needs: 'Optimal moisture.', threats: 'Poor sett quality.' },
      { id: 3, title: 'Germination', durationWeeks: 6, icon: 'sprout-outline', color: '#99bb6d', tasks: ['Light irrigation', 'Gap filling', 'First weeding'], needs: 'Warm temperature (28-32°C).', threats: 'Shoot borer insects.' },
      { id: 4, title: 'Tillering', durationWeeks: 16, icon: 'dots-grid', color: '#6a994e', tasks: ['First top dressing (N)', 'Earthing up', 'Regular weeding'], needs: 'Sunlight and nutrients.', threats: 'Weed competition.' },
      { id: 5, title: 'Grand Growth', durationWeeks: 28, icon: 'arrow-up-bold-box-outline', color: '#386641', tasks: ['Second top dressing (N & K)', 'Tying and propping', 'Manage water logging'], needs: 'High water/nutrient demand.', threats: 'Top borer, rust disease.' },
      { id: 6, title: 'Maturity', durationWeeks: 16, icon: 'beehive-outline', color: '#fca311', tasks: ['Stop irrigation', 'Monitor brix reading', 'Detrashing'], needs: 'Cool, dry weather.', threats: 'Rodents.' },
      { id: 7, title: 'Harvesting', durationWeeks: 8, icon: 'content-cut', color: '#bc4749', tasks: ['Harvest close to ground', 'Remove tops', 'Transport to mill quickly'], needs: 'Dry field conditions.', threats: 'Sugar inversion.' },
    ],
    subsidies: [
      { id: 'sub1', title: 'Pradhan Mantri Krishi Sinchayee Yojana (PMKSY)', description: 'Provides subsidies on micro-irrigation systems like drip and sprinklers, crucial for sugarcane.' },
      { id: 'sub2', title: 'National Food Security Mission (NFSM)', description: 'Offers assistance for purchasing new farm machinery and high-yielding seed varieties.' }
    ],
    analysis: {
        trends: {
            labels: ['4w ago', '3w ago', '2w ago', 'Last week'],
            datasets: [
                { name: 'Soil Moisture', color: '#3498db', data: [70, 65, 75, 60] },
                { name: 'Rainfall (mm)', color: '#9b59b6', data: [10, 5, 25, 2] },
            ]
        },
        aiInsights: 'The graph shows a significant drop in both rainfall and soil moisture last week. While the recent irrigation event 2 weeks ago helped, the current moisture level (60%) is approaching the stress threshold for the Grand Growth phase. Recommend immediate supplementary irrigation to prevent yield loss.'
    },
    suggestions: [
        { id: 'sug1', type: 'alert', title: 'Pest Alert: Top Borer', description: 'Minor infestation detected in the north-west corner of the field. Recommend spraying with a targeted pesticide.', icon: 'alert-octagon' },
        { id: 'sug2', type: 'recommendation', title: 'Nutrient Boost Recommended', description: 'Apply a potassium-rich fertilizer within the next 7 days to enhance sugar accumulation during the upcoming maturity phase.', icon: 'flask-outline' },
    ]
  },
  tomato: {
    name: 'Tomato',
    icon: 'food-apple-outline',
    plantingDate: '2025-06-01',
    totalDuration: '3-4 Months',
    stages: [
        { id: 1, title: 'Nursery Raising', durationWeeks: 4, icon: 'spa-outline', color: '#8f9a62', tasks: ['Sow seeds in trays', 'Maintain moisture', 'Harden seedlings'], needs: 'Controlled environment.', threats: 'Damping-off disease.' },
        { id: 2, title: 'Transplanting', durationWeeks: 1, icon: 'plant-outline', color: '#99bb6d', tasks: ['Prepare beds', 'Transplant seedlings in evening', 'Light irrigation'], needs: 'Well-prepared field.', threats: 'Transplant shock.' },
        { id: 3, title: 'Vegetative Growth', durationWeeks: 4, icon: 'arrow-up-bold-box-outline', color: '#6a994e', tasks: ['Staking/trellising', 'First fertilizer application', 'Weeding'], needs: 'Support, nutrients.', threats: 'Aphids, whiteflies.' },
        { id: 4, title: 'Flowering & Fruiting', durationWeeks: 6, icon: 'flower-tulip-outline', color: '#fca311', tasks: ['Regular irrigation', 'Apply K-rich fertilizer', 'Monitor for pests'], needs: 'Consistent moisture.', threats: 'Fruit borer, blossom end rot.' },
        { id: 5, title: 'Harvesting', durationWeeks: 4, icon: 'content-cut', color: '#bc4749', tasks: ['Pick mature fruits', 'Sort by grade', 'Proper storage'], needs: 'Careful handling.', threats: 'Post-harvest losses.' },
    ],
    subsidies: [
      { id: 'sub1', title: 'Mission for Integrated Development of Horticulture (MIDH)', description: 'Provides support for high-quality seeds, integrated pest management, and post-harvest infrastructure.' },
    ],
    analysis: {
        trends: {
            labels: ['4w ago', '3w ago', '2w ago', 'Last week'],
            datasets: [
                { name: 'Fruit Set Rate', color: '#2ecc71', data: [40, 60, 85, 90] },
                { name: 'Pest Activity', color: '#e74c3c', data: [5, 8, 12, 15] },
            ]
        },
        aiInsights: 'The fruit set rate is excellent and trending upwards. However, pest activity has been steadily increasing over the past month. While still at a manageable level, proactive pest control measures are advised to protect the developing fruit.'
    },
    suggestions: [
        { id: 'sug1', type: 'recommendation', title: 'Increase Potassium', description: 'Apply a foliar spray of potassium nitrate to improve fruit size and quality.', icon: 'flask-outline' },
    ]
  },
};

// --- Helper to calculate current stage ---
const getCurrentStageInfo = (crop) => {
    const plantingDate = new Date(crop.plantingDate);
    const today = new Date('2025-07-20');
    const weeksSincePlanting = Math.floor((today - plantingDate) / (1000 * 60 * 60 * 24 * 7));
    
    let cumulativeWeeks = 0;
    let stageStartWeek = 0;
    for (let i = 0; i < crop.stages.length; i++) {
        cumulativeWeeks += crop.stages[i].durationWeeks;
        if (weeksSincePlanting < cumulativeWeeks) {
            const weeksIntoStage = weeksSincePlanting - stageStartWeek;
            const progress = Math.min(100, Math.floor((weeksIntoStage / crop.stages[i].durationWeeks) * 100));
            return { index: i, progress };
        }
        stageStartWeek = cumulativeWeeks;
    }
    return { index: crop.stages.length - 1, progress: 100 };
};

// Add this helper at the top, after imports
const cropIconMap = {
  wheat: 'barley',
  onion: 'food-variant',
  tomato: 'food-apple-outline',
  chickpea: 'sprout',
};
function getValidCropIcon(icon) {
  if (!icon) return 'leaf';
  return cropIconMap[icon.toLowerCase()] || icon;
}

// --- Components ---

const CropWallboard = ({ onSelectCrop, CROP_DATA }) => {
    const animValues = useRef(Object.keys(CROP_DATA).map(() => new Animated.Value(0))).current;

    useEffect(() => {
        const animations = animValues.map(val => Animated.timing(val, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }));
        Animated.stagger(100, animations).start();
    }, [CROP_DATA]);

    return (
        <ScrollView contentContainerStyle={styles.wallboardContainer}>
            {Object.keys(CROP_DATA).map((key, index) => {
                const crop = CROP_DATA[key];
                const currentStageIndex = getCurrentStageInfo(crop).index;
                const currentStage = crop.stages[currentStageIndex];
                const translateY = animValues[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                });
                return (
                    <Animated.View key={key} style={{ opacity: animValues[index], transform: [{ translateY }] }}>
                        <TouchableOpacity style={styles.wallboardCard} onPress={() => onSelectCrop(key)}>
                            <View style={styles.wallboardHeader}>
                                <MaterialCommunityIcons name={getValidCropIcon(crop.icon)} size={40} color="white" />
                                <View>
                                    <Text style={styles.wallboardTitle}>{crop.name}</Text>
                                    <Text style={styles.wallboardDuration}>{crop.totalDuration}</Text>
                                </View>
                            </View>
                            <View style={styles.wallboardStatus}>
                                <Text style={styles.wallboardStatusLabel}>Current Stage:</Text>
                                <Text style={[styles.wallboardStatusValue, { color: currentStage.color }]}>{currentStage.title}</Text>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                );
            })}
        </ScrollView>
    );
};

const CropDetailView = ({ crop, onBack, hideHeader }) => {
    const [activeView, setActiveView] = useState('menu'); // menu, timeline, subsidies, analysis, suggestions
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const insets = useSafeAreaInsets();

    useEffect(() => {
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }, [activeView, crop]);

    // --- Add back handler for subviews ---
    const handleBack = () => {
        if (activeView !== 'menu') {
            setActiveView('menu');
        } else {
            onBack();
        }
    };

    const renderContent = () => {
        switch (activeView) {
            case 'timeline':
                return <TimelineView crop={crop} />;
            case 'subsidies':
                return <SubsidyInfo crop={crop} />;
            case 'analysis':
                return <AnalysisView crop={crop} />;
            case 'suggestions':
                return <SuggestionsView crop={crop} />;
            case 'menu':
            default:
                return <MenuView onSelect={setActiveView} />;
        }
    };

    return (
        <View style={{ flex: 1 }}>
            {/* Top bar for crop detail views */}
            {!hideHeader && (
                <View style={[styles.topBar, { paddingTop: insets.top }]}> {/* Add safe area top padding */}
                    <TouchableOpacity onPress={handleBack}>
                        <Ionicons name="arrow-back" size={28} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.topBarTitle}>{crop.name}</Text>
                    <View style={{ width: 28 }} />
                </View>
            )}
            <Animated.View style={{ flex: 1, opacity: fadeAnim, paddingTop: 0 }}>
                {renderContent()}
            </Animated.View>
        </View>
    );
};

const MenuView = ({ onSelect }) => {
    const menuItems = [
        { key: 'timeline', title: 'Crop Timeline', icon: 'chart-timeline-variant', color: '#3498db' },
        { key: 'analysis', title: 'Growth Analysis', icon: 'chart-bar', color: '#2ecc71' },
        { key: 'suggestions', title: 'AI Suggestions', icon: 'lightbulb-on-outline', color: '#f1c40f' },
        { key: 'subsidies', title: 'Subsidies & Schemes', icon: 'bank-outline', color: '#9b59b6' },
    ];
    const animValues = useRef(menuItems.map(() => new Animated.Value(0))).current;

    useEffect(() => {
        const animations = animValues.map(val => Animated.timing(val, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }));
        Animated.stagger(100, animations).start();
    }, []);

    return (
        <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>What do you want to see?</Text>
            {menuItems.map((item, index) => {
                 const translateY = animValues[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                });
                return(
                <Animated.View key={item.key} style={{ opacity: animValues[index], transform: [{ translateY }] }}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => onSelect(item.key)}>
                        <MaterialCommunityIcons name={item.icon} size={30} color={item.color} />
                        <Text style={styles.menuItemText}>{item.title}</Text>
                        <Ionicons name="chevron-forward" size={24} color="gray" />
                    </TouchableOpacity>
                </Animated.View>
            )})}
        </View>
    );
};

const TimelineView = ({ crop }) => {
    const { index: currentStageIndex, progress: currentStageProgress } = getCurrentStageInfo(crop);
    return (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            {crop.stages.map((stage, index) => (
                <TimelineStage 
                    key={stage.id} 
                    stage={stage} 
                    isLast={index === crop.stages.length - 1} 
                    isCurrent={index === currentStageIndex}
                    progress={index === currentStageIndex ? currentStageProgress : (index < currentStageIndex ? 100 : 0)}
                />
            ))}
        </ScrollView>
    );
};

const AnalysisView = ({ crop }) => (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.analysisContainer}>
            <Text style={styles.sectionTitle}>4-Week Growth Trends</Text>
            <View style={styles.graphContainer}>
                {/* Graph */}
                <View style={styles.graph}>
                    {/* Y-Axis Labels */}
                    <View style={styles.yAxis}>
                        <Text style={styles.yAxisLabel}>100%</Text>
                        <Text style={styles.yAxisLabel}>50%</Text>
                        <Text style={styles.yAxisLabel}>0%</Text>
                    </View>
                    {/* Lines and Points */}
                    <View style={styles.plotArea}>
                        {crop.analysis.trends.datasets.map(dataset => (
                            <View key={dataset.name} style={StyleSheet.absoluteFill}>
                                {dataset.data.map((point, index) => {
                                    if (index === 0) return null;
                                    const prevPoint = dataset.data[index - 1];
                                    const x1 = (width * 0.7 / 3) * (index - 1);
                                    const y1 = 150 - (prevPoint / 100 * 150);
                                    const x2 = (width * 0.7 / 3) * index;
                                    const y2 = 150 - (point / 100 * 150);
                                    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
                                    const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                                    return (
                                        <View key={index} style={[styles.line, {
                                            backgroundColor: dataset.color,
                                            width: length,
                                            left: x1,
                                            top: y1,
                                            transform: [{ rotate: `${angle}deg` }, {translateX: length / 2 - length/2}, {translateY: -1}]
                                        }]} />
                                    );
                                })}
                                {dataset.data.map((point, index) => (
                                    <View key={index} style={[styles.point, {
                                        backgroundColor: dataset.color,
                                        left: (width * 0.7 / 3) * index - 4,
                                        top: 150 - (point / 100 * 150) - 4,
                                    }]} />
                                ))}
                            </View>
                        ))}
                    </View>
                </View>
                 {/* X-Axis Labels */}
                <View style={styles.xAxis}>
                    {crop.analysis.trends.labels.map(label => <Text key={label} style={styles.xAxisLabel}>{label}</Text>)}
                </View>
                {/* Legend */}
                <View style={styles.legend}>
                    {crop.analysis.trends.datasets.map(dataset => (
                        <View key={dataset.name} style={styles.legendItem}>
                            <View style={[styles.legendColor, { backgroundColor: dataset.color }]} />
                            <Text style={styles.legendText}>{dataset.name}</Text>
                        </View>
                    ))}
                </View>
            </View>
            <View style={styles.aiInsightsCard}>
                <MaterialCommunityIcons name="brain" size={24} color="#2ecc71" />
                <View style={styles.aiInsightsContent}>
                    <Text style={styles.summaryTitle}>AI Insights</Text>
                    <Text style={styles.summaryText}>{crop.analysis.aiInsights}</Text>
                </View>
            </View>
        </View>
    </ScrollView>
);

const SuggestionsView = ({ crop }) => {
    const animValues = useRef(crop.suggestions.map(() => new Animated.Value(0))).current;

    useEffect(() => {
        const animations = animValues.map(val => Animated.timing(val, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }));
        Animated.stagger(150, animations).start();
    }, [crop]);

    return (
     <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.suggestionContainer}>
             <Text style={styles.sectionTitle}>AI Suggestions & Alerts</Text>
             {crop.suggestions.map((sug, index) => {
                 const isAlert = sug.type === 'alert';
                 const translateY = animValues[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                });
                 return (
                    <Animated.View key={sug.id} style={{opacity: animValues[index], transform: [{translateY}]}}>
                        <View style={[styles.suggestionCard, {borderColor: isAlert ? '#e74c3c' : '#f1c40f'}]}>
                            {isAlert && <View style={styles.alertGlow} />}
                            <MaterialCommunityIcons name={sug.icon} size={30} color={isAlert ? '#e74c3c' : '#f1c40f'} />
                            <View style={styles.suggestionContent}>
                                <Text style={styles.suggestionTitle}>{sug.title}</Text>
                                <Text style={styles.suggestionDesc}>{sug.description}</Text>
                            </View>
                        </View>
                    </Animated.View>
                 )
             })}
        </View>
    </ScrollView>
    );
};

const TimelineStage = ({ stage, isLast, isCurrent, progress }) => {
  const scaleAnim = useRef(new Animated.Value(isCurrent ? 1.1 : 1)).current;

  useEffect(() => {
      if(isCurrent) {
        Animated.loop(
            Animated.sequence([
                Animated.timing(scaleAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
                Animated.timing(scaleAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
            ])
        ).start();
      } else {
          scaleAnim.setValue(1);
      }
  }, [isCurrent, scaleAnim]);

  return (
    <View style={styles.stageContainer}>
      <View style={styles.timelineLineContainer}>
        <Animated.View style={[styles.timelineDot, { backgroundColor: stage.color, transform: [{ scale: scaleAnim }] }, isCurrent && styles.currentDotGlow]} />
        {!isLast && <View style={styles.timelineLine} />}
      </View>
      <View style={[styles.stageContent, isCurrent && { borderColor: stage.color }]}>
        <View style={styles.stageHeader}>
          <MaterialCommunityIcons name={getValidCropIcon(stage.icon)} size={24} color={stage.color} />
          <Text style={[styles.stageTitle, { color: stage.color }]}>{stage.title}</Text>
          {isCurrent && <Text style={styles.youAreHere}>You are here</Text>}
        </View>
        <View style={styles.stageDetails}>
          <Text style={styles.detailTitle}>Tasks:</Text>
          <Text style={styles.detailText}>{stage.tasks.join(', ')}.</Text>
        </View>
        <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: stage.color }]} />
        </View>
      </View>
    </View>
  );
};

const SubsidyInfo = ({ crop }) => (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.sectionTitle}>Subsidies & Schemes</Text>
        {crop.subsidies.map(sub => (
            <View key={sub.id} style={styles.subsidyItem}>
                <View style={styles.subsidyHeader}>
                    <MaterialCommunityIcons name="bank-outline" size={24} color="#4CAF50" />
                    <Text style={styles.subsidyItemTitle}>{sub.title}</Text>
                </View>
                <Text style={styles.subsidyItemDesc}>{sub.description}</Text>
            </View>
        ))}
    </ScrollView>
);

export default function CropCycleScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [selectedCropKey, setSelectedCropKey] = useState(null);
  const [crops, setCrops] = useState([]);
  const [CROP_DATA, setCROP_DATA] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [modalCrop, setModalCrop] = useState({ name: '', icon: '', plantingDate: '', totalDuration: '', stages: [] });
  const [modalLoading, setModalLoading] = useState(false);
  // Add state for new modal
  const [addOptionSheet, setAddOptionSheet] = useState(false);
  // Add state for mic animation modal
  const [micModal, setMicModal] = useState(false);
  const micAnim = useRef(new Animated.Value(1)).current;

  const API_BASE = 'http://10.123.4.245:8000';
  const FARMER_ID = 'f001';
  const STORAGE_KEY = 'crops-cache';

  function cropsArrayToObject(crops) {
    const obj = {};
    crops.forEach(crop => {
      obj[crop.name.toLowerCase()] = crop;
    });
    return obj;
  }

  // Load crops from cache, then fetch from backend
  const fetchCrops = async () => {
    setLoading(true);
    setError(null);
    // Try to load from cache first
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setCrops(parsed);
        setCROP_DATA(cropsArrayToObject(parsed));
        setLoading(false); // Show cached data immediately
      }
    } catch (e) {}
    // Always fetch from backend in background
    fetch(`${API_BASE}/farmer/${FARMER_ID}/crops`)
      .then(res => res.json())
      .then(data => {
        setCrops(data);
        setCROP_DATA(cropsArrayToObject(data));
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load crops');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCrops();
  }, []);

  useEffect(() => {
    let timer;
    if (micModal) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(micAnim, { toValue: 1.2, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(micAnim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
      timer = setTimeout(() => {
        setMicModal(false);
        setModalMode('add');
        setModalCrop({ name: 'Wheat', icon: 'wheat', plantingDate: '2025-07-01', totalDuration: '5 Months', stages: [{ id: 1, title: 'Sowing', durationWeeks: 2, icon: 'seed-outline', color: '#a1662f', tasks: ['Sow seeds'], needs: '', threats: '' }] });
        setModalVisible(true);
      }, 5000);
    } else {
      micAnim.setValue(1);
    }
    return () => clearTimeout(timer);
  }, [micModal]);

  const handleBackPress = () => {
    if (selectedCropKey) {
      setSelectedCropKey(null);
    } else {
      navigation.goBack();
    }
  };

  // --- Add/Edit/Delete Crop Logic ---
  const openAddModal = () => setAddOptionSheet(true);
  const handleManualAdd = () => {
    setAddOptionSheet(false);
    setModalMode('add');
    setModalCrop({ name: '', icon: '', plantingDate: '', totalDuration: '', stages: [] });
    setModalVisible(true);
  };
  const handleSpeakAdd = () => {
    setAddOptionSheet(false);
    setMicModal(true);
  };
  const openEditModal = (crop) => {
    setModalMode('edit');
    setModalCrop({ ...crop });
    setModalVisible(true);
  };
  const handleDeleteCrop = (crop) => {
    Alert.alert('Delete Crop', `Are you sure you want to delete "${crop.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setModalLoading(true);
        // Optimistically update cache/UI
        const newCrops = crops.filter(c => c.cropId !== crop.cropId);
        setCrops(newCrops);
        setCROP_DATA(cropsArrayToObject(newCrops));
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newCrops));
        setModalLoading(false);
        setSelectedCropKey(null);
        // Sync with backend
        fetch(`${API_BASE}/farmer/${FARMER_ID}/crops/${crop.cropId}`, { method: 'DELETE' })
          .catch(() => { Alert.alert('Error', 'Failed to delete crop on server.'); });
      }}
    ]);
  };
  const handleModalSave = async () => {
    if (!modalCrop.name || !modalCrop.icon || !modalCrop.plantingDate || !modalCrop.totalDuration) {
      Alert.alert('Missing Info', 'Please fill all required fields.');
      return;
    }
    setModalLoading(true);
    const method = modalMode === 'add' ? 'POST' : 'PUT';
    const url = modalMode === 'add'
      ? `${API_BASE}/farmer/${FARMER_ID}/crops`
      : `${API_BASE}/farmer/${FARMER_ID}/crops/${modalCrop.cropId}`;
    const newCrop = {
      ...modalCrop,
      cropId: modalCrop.cropId || `cr${Date.now()}`,
      stages: modalCrop.stages && modalCrop.stages.length > 0 ? modalCrop.stages : [
        { id: 1, title: 'Stage 1', durationWeeks: 2, icon: 'seed-outline', color: '#a1662f', tasks: ['Task 1'], needs: '', threats: '' }
      ]
    };
    // Optimistically update cache/UI
    let newCrops;
    if (modalMode === 'add') {
      newCrops = [newCrop, ...crops];
    } else {
      newCrops = crops.map(c => c.cropId === newCrop.cropId ? newCrop : c);
    }
    setCrops(newCrops);
    setCROP_DATA(cropsArrayToObject(newCrops));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newCrops));
    setModalLoading(false);
    setModalVisible(false);
    // Sync with backend
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCrop)
    })
      .catch(() => { Alert.alert('Error', 'Failed to save crop on server.'); });
  };

  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}><Text style={{ color: '#fff' }}>Loading...</Text></View>;
  }
  if (error) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}><Text style={{ color: 'red' }}>{error}</Text></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar with Add Crop button */}
      {!selectedCropKey && (
        <View style={[styles.topBar, { paddingTop: insets.top }]}> 
          <TouchableOpacity onPress={handleBackPress} style={{ position: 'absolute', left: 20, zIndex: 2,top:60 }}>
            <Ionicons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Crop Cycle Dashboard</Text>
        </View>
      )}
      {/* Add the floating + button at the bottom right, only when not in crop detail view */}
      {!selectedCropKey && (
        <View style={{ position: 'absolute', bottom: 32, right: 32, zIndex: 100 }}>
          <TouchableOpacity onPress={openAddModal} style={{ backgroundColor: '#10B981', borderRadius: 32, width: 64, height: 64, alignItems: 'center', justifyContent: 'center', shadowColor: '#10B981', shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }}>
            <Ionicons name="add" size={36} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
      {/* Crop Detail View with Edit/Delete */}
      {selectedCropKey ? (
        <View style={{ flex: 1 }}>
          {/* Single header bar for crop detail view */}
          <View style={[styles.topBar, { paddingTop: insets.top }]}> 
            <TouchableOpacity onPress={handleBackPress} style={{ position: 'absolute', left: 30, zIndex: 2,bottom:20 }}>
              <Ionicons name="arrow-back" size={28} color="white" />
            </TouchableOpacity>
            <Text style={styles.topBarTitle}>{CROP_DATA[selectedCropKey]?.name || ''}</Text>
            <View style={{ position: 'absolute', right: 20, flexDirection: 'row', zIndex: 2 ,top:60}}>
              <TouchableOpacity onPress={() => openEditModal(CROP_DATA[selectedCropKey])} style={{ backgroundColor: '#3B82F6', borderRadius: 20, padding: 8, marginRight: 8 }}>
                <Ionicons name="create-outline" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteCrop(CROP_DATA[selectedCropKey])} style={{ backgroundColor: '#EF4444', borderRadius: 20, padding: 8 }}>
                <Ionicons name="trash-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          {/* Only render the crop detail content, not another header */}
          <CropDetailView crop={CROP_DATA[selectedCropKey]} onBack={() => setSelectedCropKey(null)} hideHeader />
        </View>
      ) : (
        <CropWallboard onSelectCrop={setSelectedCropKey} CROP_DATA={CROP_DATA} />
      )}
      {/* Add/Edit Crop Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#18181b', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, maxHeight: '90%' }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>{modalMode === 'add' ? 'Add New Crop' : 'Edit Crop'}</Text>
            <RNScrollView style={{ maxHeight: 400 }}>
              <TextInput style={modalInputStyle} placeholder="Crop Name" placeholderTextColor="#64748B" value={modalCrop.name} onChangeText={v => setModalCrop({ ...modalCrop, name: v })} />
              <TextInput style={modalInputStyle} placeholder="Icon (e.g. tomato, wheat)" placeholderTextColor="#64748B" value={modalCrop.icon} onChangeText={v => setModalCrop({ ...modalCrop, icon: v })} />
              <TextInput style={modalInputStyle} placeholder="Planting Date (YYYY-MM-DD)" placeholderTextColor="#64748B" value={modalCrop.plantingDate} onChangeText={v => setModalCrop({ ...modalCrop, plantingDate: v })} />
              <TextInput style={modalInputStyle} placeholder="Total Duration (e.g. 5 Months)" placeholderTextColor="#64748B" value={modalCrop.totalDuration} onChangeText={v => setModalCrop({ ...modalCrop, totalDuration: v })} />
              <Text style={{ color: '#fff', marginTop: 12, marginBottom: 6, fontWeight: 'bold' }}>Stages</Text>
              {(modalCrop.stages || []).map((stage, idx) => (
                <View key={idx} style={{ backgroundColor: '#23232a', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold', flex: 1 }}>Stage {idx + 1}</Text>
                    <TouchableOpacity onPress={() => {
                      const newStages = [...modalCrop.stages];
                      newStages.splice(idx, 1);
                      setModalCrop({ ...modalCrop, stages: newStages });
                    }}>
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                  <TextInput style={modalInputStyle} placeholder="Title" placeholderTextColor="#64748B" value={stage.title || ''} onChangeText={v => {
                    const newStages = [...modalCrop.stages];
                    newStages[idx] = { ...newStages[idx], title: v };
                    setModalCrop({ ...modalCrop, stages: newStages });
                  }} />
                  <TextInput style={modalInputStyle} placeholder="Duration Weeks" placeholderTextColor="#64748B" value={stage.durationWeeks?.toString() || ''} onChangeText={v => {
                    const newStages = [...modalCrop.stages];
                    newStages[idx] = { ...newStages[idx], durationWeeks: parseInt(v) || 1 };
                    setModalCrop({ ...modalCrop, stages: newStages });
                  }} keyboardType="numeric" />
                  <TextInput style={modalInputStyle} placeholder="Icon" placeholderTextColor="#64748B" value={stage.icon || ''} onChangeText={v => {
                    const newStages = [...modalCrop.stages];
                    newStages[idx] = { ...newStages[idx], icon: v };
                    setModalCrop({ ...modalCrop, stages: newStages });
                  }} />
                  <TextInput style={modalInputStyle} placeholder="Color" placeholderTextColor="#64748B" value={stage.color || ''} onChangeText={v => {
                    const newStages = [...modalCrop.stages];
                    newStages[idx] = { ...newStages[idx], color: v };
                    setModalCrop({ ...modalCrop, stages: newStages });
                  }} />
                  <TextInput style={modalInputStyle} placeholder="Tasks (comma separated)" placeholderTextColor="#64748B" value={stage.tasks?.join(', ') || ''} onChangeText={v => {
                    const newStages = [...modalCrop.stages];
                    newStages[idx] = { ...newStages[idx], tasks: v.split(',').map(s => s.trim()) };
                    setModalCrop({ ...modalCrop, stages: newStages });
                  }} />
                  <TextInput style={modalInputStyle} placeholder="Needs" placeholderTextColor="#64748B" value={stage.needs || ''} onChangeText={v => {
                    const newStages = [...modalCrop.stages];
                    newStages[idx] = { ...newStages[idx], needs: v };
                    setModalCrop({ ...modalCrop, stages: newStages });
                  }} />
                  <TextInput style={modalInputStyle} placeholder="Threats" placeholderTextColor="#64748B" value={stage.threats || ''} onChangeText={v => {
                    const newStages = [...modalCrop.stages];
                    newStages[idx] = { ...newStages[idx], threats: v };
                    setModalCrop({ ...modalCrop, stages: newStages });
                  }} />
                </View>
              ))}
              <TouchableOpacity style={{ backgroundColor: '#10B981', borderRadius: 8, padding: 10, alignItems: 'center', marginBottom: 10 }} onPress={() => {
                setModalCrop({ ...modalCrop, stages: [...(modalCrop.stages || []), { id: (modalCrop.stages?.length || 0) + 1, title: '', durationWeeks: 1, icon: '', color: '', tasks: [], needs: '', threats: '' }] });
              }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>+ Add Stage</Text>
              </TouchableOpacity>
            </RNScrollView>
            <View style={{ flexDirection: 'row', marginTop: 24 }}>
              <TouchableOpacity style={{ flex: 1, alignItems: 'center', padding: 12, backgroundColor: '#27272a', borderRadius: 8, marginRight: 8 }} onPress={() => setModalVisible(false)}>
                <Text style={{ color: '#64748B' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, alignItems: 'center', padding: 12, backgroundColor: '#10B981', borderRadius: 8, marginLeft: 8 }} onPress={handleModalSave} disabled={modalLoading}>
                {modalLoading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff' }}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Add options bottom sheet */}
      <Modal visible={addOptionSheet} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#23232a', borderRadius: 16, padding: 24, width: 300 }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Add Crop</Text>
            <TouchableOpacity style={{ backgroundColor: '#10B981', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 12 }} onPress={handleManualAdd}>
              <Ionicons name="create-outline" size={22} color="#fff" style={{ marginBottom: 4 }} />
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Type Manually</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: '#3B82F6', borderRadius: 8, padding: 14, alignItems: 'center' }} onPress={handleSpeakAdd}>
              <Ionicons name="mic-outline" size={22} color="#fff" style={{ marginBottom: 4 }} />
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Speak (AI Extract)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 18, alignItems: 'center' }} onPress={() => setAddOptionSheet(false)}>
              <Text style={{ color: '#64748B' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Add this modal for mic animation after addOptionSheet modal */}
      <Modal visible={micModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
          <Animated.View style={{
            width: 120, height: 120, borderRadius: 60, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center',
            transform: [{ scale: micAnim }], marginBottom: 32
          }}>
            <Ionicons name="mic" size={56} color="#fff" />
          </Animated.View>
          <Text style={{ color: '#fff', fontSize: 18, marginBottom: 24 }}>Listening...</Text>
          <TouchableOpacity onPress={() => setMicModal(false)} style={{ backgroundColor: '#23232a', borderRadius: 8, padding: 14, alignItems: 'center', width: 120 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const modalInputStyle = {
  backgroundColor: '#27272a',
  borderRadius: 8,
  paddingHorizontal: 16,
  paddingVertical: 12,
  fontSize: 16,
  color: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#475569',
  marginTop: 10,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  topBarTitle: {
    color: 'white',
    fontSize: 25,
    fontWeight: 'bold',
  },
  wallboardContainer: {
      padding: 20,
  },
  wallboardCard: {
      backgroundColor: '#1e1e1e',
      borderRadius: 15,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: '#333',
  },
  wallboardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  wallboardTitle: {
      color: 'white',
      fontSize: 22,
      fontWeight: 'bold',
      marginLeft: 15,
  },
  wallboardDuration: {
      color: 'gray',
      marginLeft: 15,
  },
  wallboardStatus: {
      marginTop: 15,
      paddingTop: 15,
      borderTopWidth: 1,
      borderColor: '#333',
  },
  wallboardStatusLabel: {
      color: 'gray',
      fontSize: 14,
  },
  wallboardStatusValue: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
  },
  menuContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  menuTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
  },
  menuItemText: {
    color: 'white',
    fontSize: 18,
    marginLeft: 15,
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  analysisContainer: {},
  graphContainer: {
    backgroundColor: '#1e1e1e',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  graph: {
    height: 150,
    flexDirection: 'row',
  },
  yAxis: {
      height: '100%',
      justifyContent: 'space-between',
      paddingRight: 10,
  },
  yAxisLabel: {
      color: 'gray',
      fontSize: 12,
  },
  plotArea: {
      flex: 1,
      height: '100%',
  },
  line: {
      height: 2,
      position: 'absolute',
      transformOrigin: '0 0',
  },
  point: {
      width: 8,
      height: 8,
      borderRadius: 4,
      position: 'absolute',
      borderWidth: 1,
      borderColor: '#1e1e1e',
  },
  xAxis: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingLeft: 40, // align with plot area
      marginTop: 5,
  },
  xAxisLabel: {
      color: 'gray',
      fontSize: 12,
  },
  legend: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 20,
  },
  legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 15,
  },
  legendColor: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 5,
  },
  legendText: {
      color: 'white',
      fontSize: 12,
  },
  aiInsightsCard: {
      backgroundColor: '#1e1e1e',
      borderRadius: 15,
      padding: 20,
      flexDirection: 'row',
  },
  aiInsightsContent: {
      flex: 1,
      marginLeft: 15,
  },
  summaryTitle: {
      color: '#2ecc71',
      fontWeight: 'bold',
      fontSize: 16,
      marginBottom: 5,
  },
  summaryText: {
      color: 'white',
      fontSize: 14,
      lineHeight: 20,
  },
  suggestionContainer: {},
  suggestionCard: {
      flexDirection: 'row',
      backgroundColor: '#1e1e1e',
      borderRadius: 15,
      padding: 20,
      marginBottom: 15,
      borderLeftWidth: 4,
      overflow: 'hidden',
  },
  alertGlow: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#e74c3c',
      opacity: 0.1,
  },
  suggestionContent: {
      flex: 1,
      marginLeft: 15,
  },
  suggestionTitle: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
  },
  suggestionDesc: {
      color: '#ccc',
      marginTop: 5,
  },
  stageContainer: {
    flexDirection: 'row',
  },
  timelineLineContainer: {
    alignItems: 'center',
    marginRight: 15,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  currentDotGlow: {
      borderWidth: 3,
      borderColor: 'rgba(255,255,255,0.5)',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#333',
  },
  stageContent: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#333',
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  youAreHere: {
      backgroundColor: '#fff',
      color: '#000',
      fontSize: 10,
      fontWeight: 'bold',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 5,
      marginLeft: 'auto',
      overflow: 'hidden',
  },
  stageDetails: {
    paddingLeft: 34,
  },
  detailTitle: {
    color: 'gray',
    fontWeight: 'bold',
    marginTop: 5,
  },
  detailText: {
    color: 'white',
  },
  progressTrack: {
      height: 6,
      backgroundColor: '#333',
      borderRadius: 3,
      marginTop: 10,
      overflow: 'hidden',
  },
  progressBar: {
      height: '100%',
      borderRadius: 3,
  },
  subsidyItem: {
    backgroundColor: '#1e1e1e',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  subsidyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  subsidyItemTitle: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 16,
    flex: 1,
    marginLeft: 10,
  },
  subsidyItemDesc: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
});
