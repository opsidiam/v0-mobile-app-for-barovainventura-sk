# React Native App Setup Guide

## Inštalácia

1. Vytvorte nový Expo projekt:
\`\`\`bash
npx create-expo-app@latest barova-inventura --template blank-typescript
cd barova-inventura
\`\`\`

2. Skopírujte tieto súbory do projektu:
   - `App.tsx` -> koreň projektu
   - `src/` -> celý priečinok do koreňa

3. Nainštalujte závislosti:
\`\`\`bash
npx expo install expo-camera expo-secure-store @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context @expo/vector-icons
\`\`\`

4. Pre iOS:
\`\`\`bash
cd ios && pod install && cd ..
\`\`\`

## Spustenie

### Android
\`\`\`bash
npx expo run:android
\`\`\`

### iOS
\`\`\`bash
npx expo run:ios
\`\`\`

## Štruktúra projektu

\`\`\`
/
├── App.tsx                    # Hlavný vstupný bod s navigáciou
├── src/
│   ├── lib/
│   │   ├── api.ts            # API klient
│   │   └── auth-context.tsx  # Autentifikácia context
│   └── screens/
│       ├── LoginScreen.tsx        # Prihlasovacia obrazovka
│       ├── HomeScreen.tsx         # Domovská obrazovka
│       ├── ScannerScreen.tsx      # Skenovanie EAN kódov
│       ├── InventoryListScreen.tsx    # Prehľad inventúry
│       └── MissingProductsScreen.tsx  # Nenaskenované produkty
\`\`\`

## Funkcie

- **Live skenovanie EAN** - Automatické skenovanie s dvojitým overením
- **Manuálne zadanie EAN** - Možnosť zadať EAN ručne
- **Bezpečné uloženie tokenu** - Pomocou expo-secure-store
- **Auto-refresh** - Nenaskenované produkty sa aktualizujú každých 5 sekúnd
- **Pull-to-refresh** - Na všetkých zoznamoch
