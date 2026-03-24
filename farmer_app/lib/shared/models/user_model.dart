class UserModel {
  final String uid;
  final String phone;
  final String role;
  final String? name;
  final String? email;
  final String? preferredLanguage;
  final DateTime? createdAt;

  const UserModel({
    required this.uid,
    required this.phone,
    this.role = 'farmer',
    this.name,
    this.email,
    this.preferredLanguage,
    this.createdAt,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) => UserModel(
        uid: json['uid'] as String? ?? json['user_id'] as String? ?? '',
        phone: json['phone'] as String? ?? '',
        role: json['role'] as String? ?? 'farmer',
        name: json['name'] as String?,
        email: json['email'] as String?,
        preferredLanguage: json['preferred_language'] as String?,
        createdAt: json['created_at'] != null
            ? DateTime.tryParse(json['created_at'] as String)
            : null,
      );

  Map<String, dynamic> toJson() => {
        'uid': uid,
        'phone': phone,
        'role': role,
        if (name != null) 'name': name,
        if (email != null) 'email': email,
        if (preferredLanguage != null) 'preferred_language': preferredLanguage,
      };

  UserModel copyWith({
    String? uid,
    String? phone,
    String? role,
    String? name,
    String? email,
    String? preferredLanguage,
  }) =>
      UserModel(
        uid: uid ?? this.uid,
        phone: phone ?? this.phone,
        role: role ?? this.role,
        name: name ?? this.name,
        email: email ?? this.email,
        preferredLanguage: preferredLanguage ?? this.preferredLanguage,
      );
}

class AuthTokens {
  final String accessToken;
  final String? refreshToken;
  final String tokenType;

  const AuthTokens({
    required this.accessToken,
    this.refreshToken,
    this.tokenType = 'bearer',
  });

  factory AuthTokens.fromJson(Map<String, dynamic> json) => AuthTokens(
        accessToken: json['access_token'] as String? ?? '',
        refreshToken: json['refresh_token'] as String?,
        tokenType: json['token_type'] as String? ?? 'bearer',
      );
}
