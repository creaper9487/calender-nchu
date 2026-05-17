import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/group_state.dart';
import '../models/match_result.dart';

class ApiException implements Exception {
  ApiException(this.statusCode, this.message);
  final int statusCode;
  final String message;
  @override
  String toString() => 'ApiException($statusCode): $message';
}

class ApiClient {
  ApiClient({String? baseUrl})
      : baseUrl = (baseUrl ?? _defaultBaseUrl).replaceAll(RegExp(r'/+$'), '');

  static const String _defaultBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );

  final String baseUrl;
  final http.Client _http = http.Client();

  Uri _uri(String path) => Uri.parse('$baseUrl$path');

  Future<MatchResult> match(List<String> studentIds) async {
    final res = await _http.post(
      _uri('/api/match'),
      headers: const {'content-type': 'application/json'},
      body: jsonEncode({'studentIds': studentIds}),
    );
    final body = _decode(res);
    return MatchResult.fromJson(body);
  }

  Future<String> createGroup({String? studentId}) async {
    final res = await _http.post(
      _uri('/api/groups'),
      headers: const {'content-type': 'application/json'},
      body: jsonEncode({if (studentId != null) 'studentId': studentId}),
    );
    final body = _decode(res);
    return body['code'] as String;
  }

  Future<GroupState> getGroup(String code) async {
    final res = await _http.get(_uri('/api/groups/$code'));
    final body = _decode(res);
    return GroupState.fromJson(body);
  }

  Future<void> joinGroup(String code, String studentId) async {
    final res = await _http.post(
      _uri('/api/groups/$code/join'),
      headers: const {'content-type': 'application/json'},
      body: jsonEncode({'studentId': studentId}),
    );
    _decode(res);
  }

  Future<bool> hasSchedule(String studentId) async {
    final res = await _http.get(_uri('/api/schedules?studentId=$studentId'));
    return res.statusCode == 200;
  }

  Map<String, dynamic> _decode(http.Response res) {
    final dynamic body =
        res.body.isEmpty ? <String, dynamic>{} : jsonDecode(res.body);
    if (body is! Map<String, dynamic>) {
      throw ApiException(res.statusCode, 'Unexpected response shape');
    }
    if (res.statusCode >= 400 || body['ok'] == false) {
      throw ApiException(
        res.statusCode,
        (body['error'] as String?) ?? 'HTTP ${res.statusCode}',
      );
    }
    return body;
  }

  void close() => _http.close();
}
