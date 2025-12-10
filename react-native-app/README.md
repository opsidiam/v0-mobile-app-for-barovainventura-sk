# Barová Inventúra - React Native

## Inštalácia

1. Nainštalujte závislosti:
\`\`\`bash
cd react-native-app
npm install
\`\`\`

2. Spustite aplikáciu:
\`\`\`bash
# Pre iOS
npx expo run:ios

# Pre Android
npx expo run:android

# Alebo s Expo Go
npx expo start
\`\`\`

## Štruktúra projektu

- `App.tsx` - Hlavný vstupný bod aplikácie
- `src/lib/api.ts` - API klient pre komunikáciu so serverom
- `src/lib/auth-context.tsx` - Autentifikačný kontext
- `src/screens/` - Obrazovky aplikácie
  - `LoginScreen.tsx` - Prihlásenie
  - `HomeScreen.tsx` - Hlavná obrazovka s navigáciou
  - `ScannerScreen.tsx` - Skener čiarových kódov
  - `InventoryListScreen.tsx` - Prehľad inventúry
  - `MissingProductsScreen.tsx` - Nenaskenované produkty

## Funkcie

- Live skenovanie EAN-8 a EAN-13 čiarových kódov
- Dvojité overenie naskenovaného kódu
- Manuálne zadávanie EAN kódov
- Prehľad inventúry
- Zoznam nenaskenovaných produktov (aktualizácia každých 5s)
- Autentifikácia s bezpečným uložením tokenu

## Konfigurácia

API endpoint je nastavený v `src/lib/api.ts`:
\`\`\`typescript
const API_BASE_URL = "https://barovainventura.sk/api";
\`\`\`
