# Guide de Build - Jeu-test (Android)

Ce document récapitule les étapes nécessaires pour générer l'APK signé de l'application.

## 1. Prérequis
- **Java :** Le projet nécessite Java 17 ou supérieur. Utilisez le JDK d'Android Studio (JBR).
- **Fichier de signature :** Assurez-vous que `android/app/keystore.properties` contient les bons mots de passe (`Santi197346825`).

## 2. Procédure de Build (Étapes à suivre)

Lancez ces commandes depuis la racine du projet (`C:\Vue\jeu-test`) :

### Étape A : Compiler la partie Web (Vue/Vite)
Cette étape génère les fichiers dans le dossier `dist/`.
```powershell
npm run build
```

### Étape B : Synchroniser avec Capacitor
Cette étape copie les fichiers web dans le projet Android et met à jour les plugins.
```powershell
npx cap sync android
```

### Étape C : Générer l'APK (Gradle)
Basculez dans le dossier android et lancez la compilation.
```powershell
cd android
# Configurer Java pour la session (si non fait globalement)
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
# Lancer le build
./gradlew assembleRelease
```

---

## 3. Emplacement de l'APK
Une fois terminé, l'APK se trouve ici :
`C:\Vue\jeu-test\android\app\build\outputs\apk\release\app-release.apk`

---

## 4. En cas d'erreur (Dépannage)

### Erreur de verrouillage de fichier (Lock / Immutable location)
Si Gradle échoue à déplacer des fichiers temporaires :
```powershell
./gradlew --stop
./gradlew clean
```

### Erreur de version Java
Si Gradle indique qu'il utilise Java 8 :
Vérifiez que `$env:JAVA_HOME` pointe bien vers le dossier `jbr` d'Android Studio avant de lancer `./gradlew`.

### Modification du code Web
N'oubliez pas que chaque modification dans votre code Vue/JS nécessite de refaire `npm run build` ET `npx cap sync android` avant de recompiler l'APK, sinon vos changements n'apparaîtront pas.
