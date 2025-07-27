import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Modal, ActivityIndicator, Dimensions, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { NetworkConfig } from '../utils/NetworkConfig';
import { useTranslation } from 'react-i18next';

const { width, height } = Dimensions.get('window');

const theme = {
  background: '#0a0a0a',
  surface: '#1a1a1a',
  surfaceLight: '#2a2a2a',
  primary: '#10b981', // match VoiceChatInputScreen
  primaryDark: '#0e9e6e', // a slightly darker shade of #10b981
  white: '#ffffff',
  gray: '#8a8a8a',
  lightGray: '#c4c4c4',
  error: '#ff4444',
  success: '#10b981',
  border: '#333333',
  activeBorder: '#10b981',
};

const FARMER_ID = 'f001';
const API_BASE = NetworkConfig.API_BASE;
const OTP_LENGTH = 6;

const LoginScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState('phone'); // 'phone', 'otp', 'done'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [showAutofillPopup, setShowAutofillPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpAutofillIndex, setOtpAutofillIndex] = useState(0);
  const [canProceed, setCanProceed] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [countdownActive, setCountdownActive] = useState(false);
  
  // Animations
  const fadeAnim = new Animated.Value(1);
  const slideAnim = new Animated.Value(0);

  useEffect(() => {
    // Reset and animate when step changes
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [step]);

  useEffect(() => {
    let timer;
    if (countdownActive && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdownActive && countdown === 0) {
      setCountdownActive(false);
      setResendDisabled(false);
      // Now generate OTP
      setOtp('');
      setOtpAutofillIndex(0);
      setCanProceed(false);
      setOtpLoading(true);
      let i = 0;
      const fakeOtp = '123456';
      const fillNext = () => {
        if (i < OTP_LENGTH) {
          setOtp((prev) => prev.slice(0, i) + fakeOtp[i] + prev.slice(i + 1));
          setOtpAutofillIndex(i + 1);
          i++;
          setTimeout(fillNext, 300);
        } else {
          setOtpLoading(false);
          setCanProceed(true);
        }
      };
      fillNext();
    }
    return () => clearTimeout(timer);
  }, [countdownActive, countdown]);

  const handleSendOtp = () => {
    if (!/^\d{10}$/.test(phone)) {
      alert(t('login.invalid_phone'));
      return;
    }
    setStep('otp');
    setShowAutofillPopup(true);
    setOtp('');
    setOtpAutofillIndex(0);
    setCanProceed(false);
    
    setTimeout(() => {
      setShowAutofillPopup(false);
      setOtpLoading(true);
      // Animate autofill one digit at a time
      let i = 0;
      const fakeOtp = '123456';
      const fillNext = () => {
        if (i < OTP_LENGTH) {
          setOtp((prev) => prev.slice(0, i) + fakeOtp[i] + prev.slice(i + 1));
          setOtpAutofillIndex(i + 1);
          i++;
          setTimeout(fillNext, 300);
        } else {
          setOtpLoading(false);
          setCanProceed(true);
        }
      };
      fillNext();
    }, 2000);
  };

  const handleSendAgain = () => {
    setResendDisabled(true);
    setCountdown(14);
    setCountdownActive(true);
  };

  const handleNext = async () => {
    setLoading(true);
    navigation.reset({ index: 0, routes: [{ name: 'FetchingLocationScreen' }] });
    // Run the profile update in the background
    (async () => {
      try {
        const profileRes = await axios.get(`${API_BASE}/farmer/${FARMER_ID}/profile`);
        const updatedProfile = { ...profileRes.data, phoneNumber: phone };
        await axios.put(`${API_BASE}/farmer/${FARMER_ID}/profile`, updatedProfile);
      } catch (e) {
        console.error('Profile update failed:', e);
      }
      setLoading(false);
    })();
  };

  const renderOtpBoxes = () => {
    const digits = otp.padEnd(OTP_LENGTH, '');
    return (
      <View style={styles.otpContainer}>
        {Array.from({ length: OTP_LENGTH }).map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.otpBox,
              otpAutofillIndex === i && otpLoading && styles.otpBoxActive,
              digits[i] && styles.otpBoxFilled,
              {
                transform: [{
                  scale: otpAutofillIndex === i && otpLoading ? 1.1 : 1
                }]
              }
            ]}
          >
            <Text style={[styles.otpDigit, digits[i] && styles.otpDigitFilled]}>
              {digits[i] || ''}
            </Text>
          </Animated.View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header with gradient effect */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Ionicons name="leaf" size={32} color={theme.primary} />
            </View>
          </View>
          
          <View style={styles.titleContainer}>
            {step === 'phone' ? (
              <>
                <Text style={styles.mainTitle}>{t('login.title')}</Text>
                <Text style={styles.subtitle}>{t('login.subtitle')}</Text>
              </>
            ) : (
              <>
                <Text style={styles.mainTitle}>{t('login.verify_title')}</Text>
                <Text style={styles.subtitle}>{t('login.verify_subtitle')}</Text>
                <Text style={styles.phoneNumber}>+91 {phone}</Text>
              </>
            )}
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {step === 'phone' && (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t('login.phone_label')}</Text>
                <View style={styles.phoneInputWrapper}>
                  <View style={styles.countryCodeContainer}>
                    <Text style={styles.countryCode}>{t('login.country_code')}</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder={t('login.phone_placeholder')}
                    placeholderTextColor={theme.gray}
                    autoFocus
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.primaryButton, !phone.match(/^\d{10}$/) && styles.buttonDisabled]} 
                onPress={handleSendOtp}
                disabled={!phone.match(/^\d{10}$/)}
              >
                <Text style={styles.primaryButtonText}>{t('login.send_code')}</Text>
                <Ionicons name="arrow-forward" size={20} color={theme.background} style={styles.buttonIcon} />
              </TouchableOpacity>
            </>
          )}

          {step === 'otp' && (
            <>
              {otpLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={theme.primary} size="large" />
                  <Text style={styles.loadingText}>{t('login.receiving_code')}</Text>
                </View>
              ) : (
                renderOtpBoxes()
              )}

              {countdownActive && countdown > 0 ? (
                <Text style={{ color: theme.gray, textAlign: 'center', marginBottom: 8 }}>
                  {t('login.resend_available', { countdown })}
                </Text>
              ) : null}

              <View style={styles.otpActions}>
                <TouchableOpacity 
                  style={[styles.secondaryButton, resendDisabled && styles.buttonDisabled]} 
                  onPress={handleSendAgain} 
                  disabled={resendDisabled || otpLoading}
                >
                  <Ionicons name="refresh" size={16} color={theme.primary} />
                  <Text style={styles.secondaryButtonText}>{t('login.resend_code')}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.primaryButton, (!canProceed || loading) && styles.buttonDisabled]} 
                  onPress={handleNext} 
                  disabled={!canProceed || loading}
                >
                  {loading ? (
                    <ActivityIndicator color={theme.background} size="small" />
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>{t('login.continue')}</Text>
                      <Ionicons name="checkmark" size={20} color={theme.background} style={styles.buttonIcon} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* SMS Permission Modal */}
        <Modal visible={showAutofillPopup} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <Animated.View style={styles.modalContent}>
              <View style={styles.modalIcon}>
                <Ionicons name="mail-open" size={28} color={theme.primary} />
              </View>
              <Text style={styles.modalTitle}>{t('login.auto_fill_title')}</Text>
              <Text style={styles.modalText}>
                {t('login.auto_fill_message')}
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.modalButtonSecondary]} 
                  onPress={() => setShowAutofillPopup(false)}
                >
                  <Text style={styles.modalButtonTextSecondary}>{t('login.not_now')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.modalButtonPrimary]} 
                  onPress={() => setShowAutofillPopup(false)}
                >
                  <Text style={styles.modalButtonTextPrimary}>{t('login.allow')}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  titleContainer: {
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: theme.gray,
    textAlign: 'center',
    lineHeight: 22,
  },
  phoneNumber: {
    fontSize: 18,
    color: theme.primary,
    fontWeight: '600',
    marginTop: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  inputContainer: {
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 14,
    color: theme.lightGray,
    marginBottom: 8,
    fontWeight: '500',
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  countryCodeContainer: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: theme.surfaceLight,
    borderRightWidth: 1,
    borderRightColor: theme.border,
  },
  countryCode: {
    fontSize: 16,
    color: theme.white,
    fontWeight: '500',
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: theme.white,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  primaryButton: {
    backgroundColor: theme.primary,
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.background,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  // OTP Styles
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: theme.gray,
    marginTop: 16,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 32,
    gap: 12,
  },
  otpBox: {
    width: 50,
    height: 60,
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderWidth: 2,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: {
    borderColor: theme.primary,
    backgroundColor: theme.surfaceLight,
  },
  otpBoxFilled: {
    borderColor: theme.primary,
    backgroundColor: theme.surfaceLight,
  },
  otpDigit: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.gray,
  },
  otpDigitFilled: {
    color: theme.white,
  },
  otpActions: {
    gap: 16,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  secondaryButtonText: {
    fontSize: 16,
    color: theme.primary,
    fontWeight: '500',
    marginLeft: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.white,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 15,
    color: theme.gray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.border,
  },
  modalButtonPrimary: {
    backgroundColor: theme.primary,
  },
  modalButtonTextSecondary: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.lightGray,
  },
  modalButtonTextPrimary: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.background,
  },
});

export default LoginScreen;