import 'package:flutter/material.dart';

import '../../api/api_client.dart';

class CatalogScreen extends StatelessWidget {
  const CatalogScreen({super.key});

  // TODO: câbler la récupération réelle des produits, ex. :
  // final result = await ApiClient.products.productsControllerFindAll();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: Text('Catalogue')),
    );
  }
}
