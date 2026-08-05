import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import 'api/api_client.dart';

/// Registers the FCM device token with the API after login (when `ENABLE_FCM=true`).
Future<void> registerPushTokenIfEnabled({
  required bool enableFcm,
  required ApiClient api,
}) async {
  if (!enableFcm) return;
  if (kIsWeb) return;

  try {
    if (Firebase.apps.isEmpty) {
      await Firebase.initializeApp();
    }
    final messaging = FirebaseMessaging.instance;
    await messaging.requestPermission(alert: true, badge: true, sound: true);
    final token = await messaging.getToken();
    if (token == null || token.length < 32) return;

    final platform = Platform.isIOS
        ? 'ios'
        : Platform.isAndroid
            ? 'android'
            : 'web';
    await api.post(
      '/v1/me/device-tokens',
      auth: true,
      body: {'token': token, 'platform': platform},
    );

    messaging.onTokenRefresh.listen((newToken) async {
      if (newToken.length < 32) return;
      try {
        await api.post(
          '/v1/me/device-tokens',
          auth: true,
          body: {'token': newToken, 'platform': platform},
        );
      } on ApiException catch (e) {
        debugPrint('FCM token refresh register failed: ${e.message}');
      }
    });
  } catch (e) {
    debugPrint('FCM registration skipped: $e');
  }
}

Future<void> revokePushTokenIfEnabled({
  required bool enableFcm,
  required ApiClient api,
}) async {
  if (!enableFcm) return;
  if (kIsWeb) return;
  try {
    if (Firebase.apps.isEmpty) return;
    final token = await FirebaseMessaging.instance.getToken();
    if (token == null || token.length < 32) return;
    await api.post(
      '/v1/me/device-tokens/revoke',
      auth: true,
      body: {'token': token},
    );
  } catch (e) {
    debugPrint('FCM revoke skipped: $e');
  }
}
