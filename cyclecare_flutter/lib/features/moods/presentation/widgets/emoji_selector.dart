import 'package:flutter/material.dart';
class EmojiSelector extends StatelessWidget {
  const EmojiSelector({super.key});
  @override Widget build(BuildContext context) => Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: const [Text('😊', style: TextStyle(fontSize: 32)), Text('😢', style: TextStyle(fontSize: 32))]);
}