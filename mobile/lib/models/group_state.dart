import 'ranked_block.dart';

class GroupState {
  GroupState({
    required this.code,
    required this.members,
    required this.found,
    required this.missing,
    required this.blocks,
    required this.expiresAt,
  });

  final String code;
  final List<String> members;
  final List<String> found;
  final List<String> missing;
  final List<RankedBlock> blocks;
  final DateTime? expiresAt;

  factory GroupState.fromJson(Map<String, dynamic> json) {
    return GroupState(
      code: json['code'] as String,
      members: List<String>.from(json['members'] as List? ?? const []),
      found: List<String>.from(json['found'] as List? ?? const []),
      missing: List<String>.from(json['missing'] as List? ?? const []),
      blocks: ((json['blocks'] as List?) ?? const [])
          .map((e) => RankedBlock.fromJson(e as Map<String, dynamic>))
          .toList(),
      expiresAt: json['expiresAt'] is String
          ? DateTime.tryParse(json['expiresAt'] as String)
          : null,
    );
  }
}
