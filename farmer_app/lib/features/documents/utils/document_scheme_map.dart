import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';

class BuildableDocumentDefinition {
  final String documentType;
  final String title;
  final String portalUrl;
  final List<String> requiredDocs;
  final List<String> unlocksSchemes;

  const BuildableDocumentDefinition({
    required this.documentType,
    required this.title,
    required this.portalUrl,
    required this.requiredDocs,
    required this.unlocksSchemes,
  });
}

const List<BuildableDocumentDefinition>
kBuildableDocuments = <BuildableDocumentDefinition>[
  BuildableDocumentDefinition(
    documentType: 'aadhaar_linked_application',
    title: 'Aadhaar-linked Application Form',
    portalUrl: 'https://www.india.gov.in/',
    requiredDocs: <String>[
      'Aadhaar Card',
      'Bank Account Details',
      'Land Records',
    ],
    unlocksSchemes: <String>[
      'PM-KISAN',
      'PM-KMY',
      'PMFBY',
      'KCC',
      'SMAM',
      'PM-KUSUM',
      'eNAM',
      'PKVY',
    ],
  ),
  BuildableDocumentDefinition(
    documentType: 'kcc_application',
    title: 'KCC (Kisan Credit Card) Application',
    portalUrl:
        'https://sbi.co.in/web/agri-rural/agriculture-banking/crop-loan/kisan-credit-card-kcc',
    requiredDocs: <String>[
      'Aadhaar',
      'Land records',
      'PAN',
      '2 photos',
      'Bank passbook',
      'Land cultivation certificate',
    ],
    unlocksSchemes: <String>['KCC'],
  ),
  BuildableDocumentDefinition(
    documentType: 'pmfby_form',
    title: 'PMFBY Crop Insurance Form',
    portalUrl: 'https://pmfby.gov.in/farmerRegistrationForm',
    requiredDocs: <String>[
      'Aadhaar',
      'Land records',
      'Bank passbook',
      'Crop sowing certificate',
    ],
    unlocksSchemes: <String>['PMFBY'],
  ),
  BuildableDocumentDefinition(
    documentType: 'soil_health_card',
    title: 'Soil Health Card Application',
    portalUrl: 'https://soilhealth.dac.gov.in/',
    requiredDocs: <String>['Aadhaar', 'Land record', 'Mobile'],
    unlocksSchemes: <String>['SHC', 'Soil Health Card'],
  ),
  BuildableDocumentDefinition(
    documentType: 'pm_kisan_registration',
    title: 'PM-KISAN Registration Form',
    portalUrl: 'https://pmkisan.gov.in/RegistrationFormupdated.aspx',
    requiredDocs: <String>[
      'Aadhaar',
      'Land ownership',
      'Bank passbook with IFSC',
      'Mobile linked to Aadhaar',
    ],
    unlocksSchemes: <String>['PM-KISAN'],
  ),
  BuildableDocumentDefinition(
    documentType: 'smam_subsidy_application',
    title: 'SMAM Subsidy Application',
    portalUrl: 'https://agrimachinery.nic.in/Farmer/FarmerRegForm',
    requiredDocs: <String>[
      'Aadhaar',
      'Land records',
      'Bank passbook',
      'Caste certificate',
      'Identity proof',
    ],
    unlocksSchemes: <String>['SMAM'],
  ),
  BuildableDocumentDefinition(
    documentType: 'pkvy_organic_form',
    title: 'PKVY Organic Farming Form',
    portalUrl: 'https://pgsindia-ncof.gov.in/PKVY',
    requiredDocs: <String>[
      'Aadhaar',
      'Land records',
      'Bank details',
      'Group or cluster certificate',
    ],
    unlocksSchemes: <String>['PKVY'],
  ),
  BuildableDocumentDefinition(
    documentType: 'enam_registration',
    title: 'eNAM Farmer Registration',
    portalUrl: 'https://enam.gov.in/web/registration',
    requiredDocs: <String>['Aadhaar', 'Bank details', 'Land records', 'Photo'],
    unlocksSchemes: <String>['eNAM'],
  ),
  BuildableDocumentDefinition(
    documentType: 'pm_kusum_form',
    title: 'PM-KUSUM Solar Pump',
    portalUrl: 'https://pmkusum.mnre.gov.in/',
    requiredDocs: <String>[
      'Aadhaar',
      'Land records',
      'Bank passbook',
      'Electricity connection details',
    ],
    unlocksSchemes: <String>['PM-KUSUM'],
  ),
  BuildableDocumentDefinition(
    documentType: 'mahadbt_benefit_form',
    title: 'MahaDBT Agricultural Benefit',
    portalUrl: 'https://mahadbt.maharashtra.gov.in/',
    requiredDocs: <String>[
      'Aadhaar',
      '7/12 extract',
      'Caste certificate',
      'Bank passbook',
      'Maharashtra domicile',
    ],
    unlocksSchemes: <String>['MahaDBT'],
  ),
  BuildableDocumentDefinition(
    documentType: 'rythu_bandhu_form',
    title: 'Rythu Bandhu',
    portalUrl: 'https://dharani.telangana.gov.in/',
    requiredDocs: <String>['Aadhaar', 'Pattadar passbook', 'Bank details'],
    unlocksSchemes: <String>['Rythu Bandhu'],
  ),
  BuildableDocumentDefinition(
    documentType: 'farmer_self_declaration',
    title: 'General Self-Declaration / Farmer Certificate',
    portalUrl: 'https://www.india.gov.in/',
    requiredDocs: <String>[
      'Name',
      'Aadhaar',
      'Land area',
      'Bank details',
      'Crops grown',
      'Date',
      'Signature',
    ],
    unlocksSchemes: <String>[
      'PM-KISAN',
      'PMFBY',
      'KCC',
      'PKVY',
      'SMAM',
      'eNAM',
    ],
  ),
];

const List<String> kCoreReadinessDocs = <String>[
  'Aadhaar Card',
  'Land Records (7/12 / Khasra-Khatauni)',
  'Bank Passbook / Account Details',
  'Caste Certificate',
  'Passport Photo',
];

BuildableDocumentDefinition? findBuildableDocumentForText(String text) {
  final needle = text.toLowerCase();
  final looksLikeFormIntent =
      needle.contains('form') ||
      needle.contains('application') ||
      needle.contains('registration') ||
      needle.contains('enrol') ||
      needle.contains('enroll');

  if (!looksLikeFormIntent) {
    // Common supporting docs (Aadhaar, bank passbook, land records, etc.)
    // should not open synthetic build flows.
    return null;
  }

  for (final item in kBuildableDocuments) {
    final title = item.title.toLowerCase();
    if (title.contains(needle) || needle.contains(title)) {
      return item;
    }

    final schemeHit = item.unlocksSchemes.any((s) {
      final scheme = s.toLowerCase();
      return scheme.contains(needle) || needle.contains(scheme);
    });
    if (schemeHit) return item;
  }
  return null;
}

Color colorForSchemeCategory(String category) {
  final c = category.toLowerCase();
  if (c.contains('income')) return AppColors.primary;
  if (c.contains('insurance')) return AppColors.info;
  if (c.contains('credit')) return AppColors.warning;
  if (c.contains('mechan')) return AppColors.accent;
  if (c.contains('irrigation') || c.contains('water')) {
    return const Color(0xFF0D9488);
  }
  if (c.contains('organic') || c.contains('soil')) {
    return const Color(0xFF65A30D);
  }
  if (c.contains('state')) return AppColors.danger;
  if (c.contains('animal') || c.contains('fisher')) {
    return const Color(0xFF1D4ED8);
  }
  return AppColors.primaryDark;
}
