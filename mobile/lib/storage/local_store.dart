import 'package:shared_preferences/shared_preferences.dart';

class LocalStore {
  static const _kStudentId = 'studentId';
  static final RegExp _idRe = RegExp(r'^[A-Za-z0-9]{4,12}$');

  Future<String?> readStudentId() async {
    final prefs = await SharedPreferences.getInstance();
    final value = prefs.getString(_kStudentId);
    if (value == null || !_idRe.hasMatch(value)) return null;
    return value;
  }

  Future<void> writeStudentId(String studentId) async {
    if (!_idRe.hasMatch(studentId)) {
      throw ArgumentError.value(studentId, 'studentId', 'invalid format');
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kStudentId, studentId);
  }

  Future<void> clearStudentId() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kStudentId);
  }
}
