import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import ModalDropdown from 'react-native-modal-dropdown';

const indianLanguages = [
  { label: 'English', value: 'en' },
  { label: 'हिन्दी (Hindi)', value: 'hi' },
  { label: 'বাংলা (Bengali)', value: 'bn' },
  { label: 'తెలుగు (Telugu)', value: 'te' },
  { label: 'మరాఠీ (Marathi)', value: 'mr' },
  { label: 'தமிழ் (Tamil)', value: 'ta' },
  { label: 'ગુજરાતી (Gujarati)', value: 'gu' },
  { label: 'اردو (Urdu)', value: 'ur' },
  { label: 'ಕನ್ನಡ (Kannada)', value: 'kn' },
  { label: 'ଓଡ଼ିଆ (Odia)', value: 'or' },
  { label: 'മലയാളം (Malayalam)', value: 'ml' },
  { label: 'ਪੰਜਾਬੀ (Punjabi)', value: 'pa' },
  { label: 'অসমীয়া (Assamese)', value: 'as' },
  { label: 'संस्कृतम् (Sanskrit)', value: 'sa' },
  { label: 'मैथिली (Maithili)', value: 'mai' },
  { label: 'संथाली (Santali)', value: 'sat' },
  { label: 'Dogri', value: 'doi' },
  { label: 'Konkani', value: 'kok' },
  { label: 'Manipuri', value: 'mni' },
  { label: 'Bodo', value: 'brx' },
  { label: 'राजस्थानी (Rajasthani)', value: 'raj' },
  { label: 'भोजपुरी (Bhojpuri)', value: 'bho' },
  { label: 'छत्तीसगढ़ी (Chhattisgarhi)', value: 'hne' },
  { label: 'हरियाणवी (Haryanvi)', value: 'bgc' },
  { label: 'अवधी (Awadhi)', value: 'awa' },
  { label: 'मगही (Magahi)', value: 'mag' },
  { label: 'तुलु (Tulu)', value: 'tcy' },
  { label: 'मणिपुरी (Meitei)', value: 'mni' },
  { label: 'नागपुरी (Nagpuri)', value: 'nag' },
  { label: 'सिंधी (Sindhi)', value: 'sd' },
  { label: 'कश्मीरी (Kashmiri)', value: 'ks' },
  { label: 'लद्दाखी (Ladakhi)', value: 'lb' },
  { label: 'मिज़ो (Mizo)', value: 'lus' },
  { label: 'न्यासी (Nyishi)', value: 'njz' },
  { label: 'अरुणाचली (Arunachali)', value: 'arun' },
  { label: 'त्रिपुरी (Tripuri)', value: 'trp' },
  { label: 'गढ़वाली (Garhwali)', value: 'gbm' },
  { label: 'कुमाऊँनी (Kumaoni)', value: 'kfy' },
  { label: 'अंगिका (Angika)', value: 'anp' },
  { label: 'भिल्ल (Bhil)', value: 'bhil' },
  { label: 'गोंडी (Gondi)', value: 'gon' },
  { label: 'हो (Ho)', value: 'hoc' },
  { label: 'खासी (Khasi)', value: 'kha' },
  { label: 'लंबाडी (Lambadi)', value: 'lmn' },
  { label: 'मालवी (Malvi)', value: 'mup' },
  { label: 'मुण्डारी (Mundari)', value: 'unr' },
  { label: 'नागा (Naga)', value: 'nag' },
  { label: 'सद्दरी (Sadri)', value: 'sck' },
  { label: 'शेरपा (Sherpa)', value: 'xsr' },
  { label: 'सौराष्ट्र (Saurashtra)', value: 'saz' },
  { label: 'सिल्हटी (Sylheti)', value: 'syl' },
  { label: 'तोडा (Toda)', value: 'tcx' },
  { label: 'वर्ली (Varli)', value: 'vav' },
];

const LanguageSelectScreen = () => {
  const navigation = useNavigation();
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [search, setSearch] = useState('');
  // Find the index of the selected language, default to 0 if not found
  const selectedIndex = Math.max(0, indianLanguages.findIndex(l => l.value === selectedLanguage));
  // Filter languages based on search
  const filteredLanguages = indianLanguages.filter(l => l.label.toLowerCase().includes(search.toLowerCase()));

  const handleNext = () => {
    navigation.navigate('ChoiceScreen', {}, {
      animation: 'slide_from_right', // For crazy effect, will configure in stack
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.greeting}>Hello Farmer,</Text>
        <Text style={styles.subtext}>Please choose your language</Text>
        <TextInput
          style={styles.searchBar}
          placeholder="Search language..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
        />
        <ModalDropdown
          options={filteredLanguages.map(l => l.label)}
          defaultValue={filteredLanguages[selectedIndex]?.label || (filteredLanguages[0]?.label || 'Select Language')}
          onSelect={(index) => setSelectedLanguage(filteredLanguages[index].value)}
          style={styles.dropdown}
          textStyle={styles.dropdownText}
          dropdownStyle={styles.dropdownList}
          dropdownTextStyle={styles.dropdownOption}
          dropdownTextHighlightStyle={styles.dropdownOptionHighlight}
          animated={true}
          showsVerticalScrollIndicator={true}
          // Only open dropdown if search is not empty or user is changing language
          onDropdownWillShow={() => {
            // If search is empty and selected language is English, prevent opening
            if (!search && filteredLanguages[selectedIndex]?.value === 'en') {
              return false;
            }
            return true;
          }}
        />
        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>{'→'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#000',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#fff',
  },
  greeting: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtext: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 18,
    textAlign: 'center',
  },
  pickerContainer: {
    backgroundColor: '#181820',
    borderRadius: 12,
    width: '100%',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  picker: {
    color: '#fff',
    width: '100%',
    height: 48,
  },
  pickerItem: {
    color: '#fff',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    marginTop: 8,
    flexDirection: 'row',
  },
  buttonText: {
    color: '#000',
    fontSize: 22,
    fontWeight: 'bold',
  },
  dropdown: {
    width: '100%',
    backgroundColor: '#000',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 28,
    marginTop: 8,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  dropdownText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'left',
  },
  dropdownList: {
    backgroundColor: '#000',
    borderRadius: 16,
    width: '80%',
    alignSelf: 'center',
    maxHeight: 320,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#fff',
  },
  dropdownOption: {
    color: '#fff',
    fontSize: 18,
    paddingVertical: 12,
    paddingHorizontal: 18,
    textAlign: 'left',
    backgroundColor: '#000',
  },
  dropdownOptionHighlight: {
    color: '#000',
    backgroundColor: '#fff',
    fontWeight: 'bold',
  },
  searchBar: {
    width: '100%',
    backgroundColor: '#000',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fff',
    color: '#fff',
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
    marginTop: 4,
  },
});

export default LanguageSelectScreen; 