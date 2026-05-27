# Construire l’EXE (Windows) et l’APK (Android)

## EXE (Windows – portable)

En ligne de commande, à la racine du projet :

```bash
npm run build:desktop
```

L’exécutable sera généré dans le dossier **`release/`** :
- `JeuTestRPG-0.0.0-portable.exe` (ou version en cours)

Tu peux copier ce fichier .exe et l’utiliser sans installation.

### EXE Windows standard (installateur)

Si tu veux un installateur Windows classique au lieu d’un EXE portable, utilise :

```bash
npm run build:desktop:release
```

Cela crée un setup Windows standard avec installation, raccourci et désinstallation possible.

---

## APK (Android)

### Prérequis

- **Node.js** (déjà utilisé pour le projet)
- **Android Studio** (ou Android SDK + Java 17) pour compiler l’APK

### Étapes

1. **Build web + sync Android** (à faire après chaque changement de code si tu veux mettre à jour l’APK) :

   ```bash
   npm run build:android
   ```

   Cela fait `npm run build` puis copie le build dans le projet Android.

2. **Générer l’APK avec Android Studio** (étape par étape)

   Une fois le dossier **`android`** ouvert dans Android Studio :

   - **Attendre la synchronisation Gradle**  
     En bas de la fenêtre, une barre de progression indique « Syncing… » ou « Gradle sync ». Attends que ça se termine (parfois 1 à 2 minutes la première fois). Si une alerte demande d’installer un SDK ou des composants, accepte.

   - **Ouvrir le menu Build**  
     Dans la barre de menu en haut : clique sur **Build**.

   - **Choisir Build APK**  
     Dans le menu déroulant : **Build Bundle(s) / APK(s)** → **Build APK(s)**.

   - **Attendre la fin de la compilation**  
     En bas à droite, un message du type « APK(s) generated successfully » apparaît. Tu peux cliquer sur **locate** dans la notification pour ouvrir le dossier où se trouve l’APK.

   - **Récupérer l’APK**  
     Le fichier peut être ici :  
     - `android\app\build\intermediates\apk\debug\app-debug.apk`  
     - ou `android\app\build\outputs\apk\debug\app-debug.apk`  
     (selon la version de Gradle). Tu peux le copier sur ton téléphone et l’installer (autoriser l’installation depuis « sources inconnues » si Android le demande).

   **Si l’installation échoue (« package non valide »)** : ne tente pas d’installer un APK release non signé. Pour tester sur ton téléphone, utilise plutôt le build debug :
   - Dans Android Studio : **Build** → **Select Build Variant** → dans la colonne "Build Variant" pour `app`, choisis **debug**.
   - Puis **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**.
   - L’APK debug est dans `android\app\build\intermediates\apk\debug\app-debug.apk` (ou sous `outputs\apk\debug\`).
   - Si tu veux absolument un APK release, il faut le **signer** avec une clé avant de l’installer.
   - Le message `INSTALL_PARSE_FAILED_NO_CERTIFICATES` signifie précisément que l’APK n’a pas de signature valide.

### Signer proprement un release Android

1. Génère une clé release (une seule fois) :

```bash
cd android/app
keytool -genkeypair -v -keystore release-key.jks -alias jeu-test-key -keyalg RSA -keysize 2048 -validity 10000
```

2. Crée un fichier `android/app/keystore.properties` avec ces valeurs :

```properties
storeFile=release-key.jks
storePassword=TonMotDePasseDeKeystore
keyAlias=jeu-test-key
keyPassword=TonMotDePasseDeClé
```

3. Build le release signé :

```bash
cd android
.\gradlew assembleRelease
```

4. Récupère l’APK signé :

`android/app/build/outputs/apk/release/app-release.apk`

5. Si tu veux publier plus tard, garde le `release-key.jks` et `keystore.properties` dans un endroit sûr.

   **Option B – En ligne de commande** (si Android SDK est installé et `ANDROID_HOME` est défini)

   ```bash
   cd android
   .\gradlew assembleDebug
   ```

   L’APK se trouve dans `android/app/build/intermediates/apk/debug/app-debug.apk` (ou parfois `outputs/apk/debug/`).

### Résumé des commandes

| Objectif              | Commande                |
|-----------------------|-------------------------|
| Exe Windows portable  | `npm run build:desktop` |
| Préparer l’APK        | `npm run build:android` |
| Ouvrir le projet Android | `npx cap open android` |

---

## Dépannage : l’APK ne s’installe pas sur le téléphone

- **Désinstaller toute version déjà installée** (Paramètres → Applications → ton jeu → Désinstaller). Une ancienne installation peut bloquer.
- **Autoriser les « sources inconnues »** pour l’app qui ouvre l’APK : Paramètres → Applications → [Fichiers ou Chrome…] → Autoriser l’installation d’applications inconnues.
- **Voir l’erreur exacte** : connecte le téléphone en USB, active le **débogage USB** (Paramètres → Options développeur), puis sur le PC dans un terminal :
  ```bash
  cd C:\Vue\jeu-test\android\app\build\intermediates\apk\release
  adb install -r app-release.apk
  ```
  (ou `apk\debug\app-debug.apk` si tu testes en debug). Le message affiché indique pourquoi l’installation échoue (signature, espace, version Android, etc.).  - Si tu construis une APK `release`, Android exige qu’elle soit signée. Pour tester rapidement, utilise plutôt le `debug` APK.
  - Si tu préfères la ligne de commande, tu peux générer un debug APK valide avec :
  ```bash
  cd android
  .\\gradlew assembleDebug
  ```