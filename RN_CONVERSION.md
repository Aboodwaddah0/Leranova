# Learnova → React Native Conversion Guide
> Focused on **Student** and **Parent** roles only.
> Backend API stays the same (Express 5 on port 5000).

---

## 1. Tech Stack Mapping

| Web (Current) | React Native Replacement |
|---|---|
| React Router v6 | React Navigation v6 (Stack + Tab + Drawer) |
| Tailwind CSS | NativeWind v4 **or** `StyleSheet.create()` |
| Framer Motion | `react-native-reanimated` v3 |
| localStorage | `@react-native-async-storage/async-storage` |
| Redux Toolkit | Same (works in RN out of the box) |
| Socket.io-client | Same (works in RN) |
| Lucide-react icons | `lucide-react-native` |
| `<video>` element | `expo-av` (`Video` component) |
| Cloudinary URLs | Same URLs — load with `<Image>` |
| ThemeContext (isDark) | Same context pattern + `useColorScheme()` hook |
| CSS perspective flip | `react-native-reanimated` + `interpolate` for card flip |
| SVG MindMap | `react-native-svg` |
| File download | `expo-file-system` + `expo-sharing` |
| `fetch()` service calls | Same — works in RN |
| Joi validation | `yup` or `zod` |
| CSS backdrop-blur | `@react-native-blur/blur` or skip |

---

## 2. Project Architecture (Keep As-Is)

```
src/
├── contexts/
│   ├── ThemeContext.jsx          ← keep, add useColorScheme()
│   └── AuthContext (Redux)       ← keep
├── services/student/             ← keep ALL service files unchanged
├── services/parent/              ← keep ALL service files unchanged
├── components/student/           ← convert JSX → RN components
├── components/parent/            ← convert JSX → RN components
└── pages/ → screens/             ← rename folder, convert each page
```

API base URL: `http://<server-ip>:5000/api`  
Change in your axios/fetch config — the same `Authorization: Bearer <token>` header applies.

---

## 3. Navigation Structure

### Student Navigation

```
RootStack
├── AuthStack
│   ├── LoginScreen
│   └── RegisterScreen (if applicable)
│
└── StudentStack (requires JWT)
    ├── StudentBottomTabs
    │   ├── Tab: Dashboard       → StudentDashboardScreen
    │   ├── Tab: Courses         → StudentCoursesScreen
    │   ├── Tab: Chat            → StudentChatScreen
    │   ├── Tab: Social          → StudentSocialScreen
    │   └── Tab: Profile         → StudentProfileScreen
    │
    ├── StudentCourseDetailsScreen    (params: courseId)
    ├── StudentSubjectScreen          (params: courseId, subjectId)
    │   └── [Inner tabs: Attachments, Comments, Flashcards, MindMap, Quiz]
    ├── StudentSchoolSubjectsScreen   (SCHOOL mode only)
    ├── StudentSchoolMarksScreen      (SCHOOL mode only)
    ├── StudentTeachersScreen
    └── StudentTeacherProfileScreen   (params: teacherId)
```

### Parent Navigation

```
RootStack
└── ParentStack (requires JWT)
    ├── ParentBottomTabs
    │   ├── Tab: Dashboard       → ParentDashboardScreen
    │   ├── Tab: Marks           → ParentMarksScreen
    │   └── Tab: Settings        → ParentSettingsScreen
```

### ACADEMY vs SCHOOL Mode

Fetch mode on login/app-start via `fetchStudentContext()`.  
Store result in Redux or Context:
```js
// studentSlice.js
mode: 'ACADEMY' | 'SCHOOL'
```
- **ACADEMY**: Show Courses tab, hide School Subjects & Marks tabs  
- **SCHOOL**: Show School Subjects + Marks tabs, hide Courses tab  
Check `mode` in tab navigator to conditionally render tabs.

---

## 4. Student Screens

### 4.1 StudentDashboardScreen
- **Web file**: `src/pages/student/StudentDashboardPage.jsx`
- **API call**: `fetchStudentContext()` → returns `{ mode, organization, student, stats }`
- **RN notes**: Use `<ScrollView>`, hero header as a plain `<View>` with gradient (`expo-linear-gradient`), stats grid with `flexWrap: 'wrap'`

---

### 4.2 StudentCoursesScreen
- **Web file**: `src/pages/student/StudentCoursesPage.jsx`
- **API calls**:
  - `fetchStudentCourseCatalog()` — list all available courses
  - `fetchAcademyTracks()` — if ACADEMY mode
  - `fetchAcademyTrackSubjects(trackId)` — subjects per track
  - `fetchAcademySubscriptions()` — user's subscribed materials
  - `subscribeAcademyMaterial(materialId)` — subscribe action
- **RN notes**: `FlatList` for course grid, 2-column with `numColumns={2}`

---

### 4.3 StudentCourseDetailsScreen
- **Web file**: `src/pages/student/StudentCourseDetailsPage.jsx`
- **Params**: `courseId`
- **API calls**: `fetchCourseSubjects(courseId)`
- **RN notes**: `SectionList` or `FlatList` for subjects list, navigate on press to SubjectScreen

---

### 4.4 StudentSubjectScreen ⭐ (Most Complex)
- **Web file**: `src/pages/student/StudentSubjectPage.jsx`
- **Params**: `courseId`, `subjectId`
- **API calls**:
  - `fetchSubjectLessons(subjectId)` — lesson list
  - `fetchLessonDetails(lessonId)` — current lesson data
  - `fetchLessonComments(lessonId)` — comments
  - `createLessonComment(lessonId, body)` — post comment
  - `updateStudentLessonProgress(lessonId, data)` — mark watched
  - `fetchLessonAiContent(lessonId)` — flashcards + mindmap
  - `fetchStudentLessonQuiz(lessonId)` — quiz questions
  - `submitStudentQuizAttempt(lessonId, answers)` — submit quiz
  - `askStudentTutor(lessonId, message)` — AI chatbot

**Sub-components to convert:**

#### Video Player
```js
// Web: <video> tag + HLS
// RN: expo-av Video component
import { Video } from 'expo-av';
<Video
  source={{ uri: lesson.videoUrl }}
  useNativeControls
  resizeMode="contain"
  style={{ width: '100%', height: 220 }}
/>
```

#### Inner Tabs (Attachments / Comments / Flashcards / MindMap / Quiz)
```js
// Use a custom horizontal ScrollView tab bar (NOT React Navigation tabs)
// State: const [activeTab, setActiveTab] = useState('attachments')
// Conditionally render content below based on activeTab
```

#### Flashcards (Flip Animation)
```js
// Web: CSS rotateY + backfaceVisibility
// RN: react-native-reanimated
import Animated, { useSharedValue, withTiming, interpolate } from 'react-native-reanimated';

const rotateY = useSharedValue(0);
const frontStyle = useAnimatedStyle(() => ({
  transform: [{ rotateY: `${interpolate(rotateY.value, [0,1], [0, 180])}deg` }],
  backfaceVisibility: 'hidden',
}));
const backStyle = useAnimatedStyle(() => ({
  transform: [{ rotateY: `${interpolate(rotateY.value, [0,1], [180, 360])}deg` }],
  backfaceVisibility: 'hidden',
}));
// Wrap both in <Animated.View> with position absolute inside a container
```

#### MindMap
```js
// Web: absolute divs on 1120x960 canvas + SVG lines
// RN: react-native-svg
import Svg, { Line } from 'react-native-svg';
import { ScrollView } from 'react-native';

// Wrap in ScrollView (horizontal + vertical) with contentContainerStyle={{ width: 1120, height: 960 }}
// Use absolute <View> nodes and <Svg> overlay for lines
// Drag via PanResponder or react-native-gesture-handler
```

#### Quiz
```js
// 3 phases: start → in-progress → result
// Question types: MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER
// SHORT_ANSWER: <TextInput multiline> instead of <textarea>
// Submit: submitStudentQuizAttempt(lessonId, answers)
// Result shows score + per-question feedback
```

#### AI Assistant Sidebar → AI Assistant Modal
```js
// Web: fixed right-side drawer panel
// RN: <Modal animationType="slide"> from react-native
// Chat history: AsyncStorage.getItem(`ai_chat_${lessonId}`)
// API: askStudentTutor(lessonId, message) → { answer: string }
```

#### Attachments
```js
// Download: expo-file-system FileSystem.downloadAsync()
// Share after download: expo-sharing Sharing.shareAsync()
// Open in browser fallback: Linking.openURL(attachmentUrl)
```

---

### 4.5 StudentSchoolSubjectsScreen (SCHOOL mode only)
- **Web file**: `src/pages/student/StudentSchoolSubjectsPage.jsx`
- **Condition**: Render only when `mode === 'SCHOOL'`
- **RN notes**: `FlatList` of subject cards

---

### 4.6 StudentSchoolMarksScreen (SCHOOL mode only)
- **Web file**: `src/pages/student/StudentSchoolMarksPage.jsx`
- **Condition**: Render only when `mode === 'SCHOOL'`
- **RN notes**: `SectionList` grouped by subject

---

### 4.7 StudentTeachersScreen
- **Web file**: `src/pages/student/StudentTeachersPage.jsx`
- **API call**: `fetchStudentTeachers()` → list of teachers
- **RN notes**: `FlatList`, search via `TextInput` + `filter()`

---

### 4.8 StudentTeacherProfileScreen
- **Web file**: `src/pages/student/StudentTeacherProfilePage.jsx`
- **Params**: `teacherId`
- **API call**: `fetchStudentTeacherById(teacherId)`
- **RN notes**: `ScrollView` with profile image (`<Image>`), info rows

---

### 4.9 StudentChatScreen
- **Web file**: `src/pages/student/StudentChatPage.jsx`
- **API calls**:
  - `fetchStudentChats()` — list all chats (group + private)
  - `sendStudentChatMessage(chatId, body)` — send
  - `deleteStudentChatMessage(chatId, messageId)` — delete
  - `editStudentChatMessage(chatId, messageId, body)` — edit
  - `reactStudentChatMessage(chatId, messageId, emoji)` — react
- **Socket.io events**:
  ```
  emit: join_room(chatId)
  on: new_message → append to list
  on: message_deleted → remove
  on: message_edited → update
  on: user_typing → show indicator
  ```
- **RN notes**:
  - `FlatList inverted` for messages (newest at bottom)
  - `KeyboardAvoidingView` for input
  - Socket stays connected while screen is focused (`useFocusEffect`)
  - Long press on message → action sheet (edit/delete/react)

---

### 4.10 StudentSocialScreen
- **Web file**: `src/pages/student/StudentSocialPage.jsx`
- **API call**: `fetchGamificationStats()` → `{ xp, level, rank, leaderboard[] }`
- **RN notes**: Top section (XP bar + level badge), `FlatList` for leaderboard

---

### 4.11 StudentProfileScreen
- **Web file**: `src/pages/student/StudentProfilePage.jsx`
- **API calls**:
  - `fetchStudentProfile()` → profile data
  - `updateStudentProfile(data)` → update name/bio/avatar
  - `changeStudentPassword(data)` → change password
- **Sub-components**: ProfileHeader, QuickStats, OrganizationInfoCard, EditProfileModal, ChangePasswordModal
- **Avatar upload**: `expo-image-picker` → upload to Cloudinary → save URL
- **Modals**: Use `<Modal>` from react-native

---

## 5. Parent Screens

### 5.1 ParentDashboardScreen
- **Web file**: `src/pages/parent/ParentDashboardPage.jsx`
- **API calls**:
  - `fetchMyChildren()` → list of children with basic info
  - `fetchMyNotes()` → teacher notes for children
  - `markNoteRead(noteId)` → mark note as read
- **RN notes**: `ScrollView`, children cards as `FlatList horizontal`, notes `FlatList`

---

### 5.2 ParentMarksScreen
- **Web file**: `src/pages/parent/ParentMarksPage.jsx`
- **API call**: `fetchParentChildrenMarks()` → marks per child per subject
- **RN notes**: Child selector (tabs or picker), `SectionList` for marks by subject

---

### 5.3 ParentSettingsScreen
- **Web file**: `src/pages/parent/ParentSettingsPage.jsx`
- **API calls**:
  - `fetchMyParentProfile()` → profile data
  - `updateMyParentProfile(data)` → update profile
- **RN notes**: Form with `TextInput`, `KeyboardAvoidingView`, submit button

---

## 6. Service Files (No Change Needed)

All service files work in React Native without modification.  
File locations:

```
src/services/student/
├── studentCourseService.js      ← fetchStudentCourseCatalog, fetchCourseSubjects
├── studentSubjectService.js     ← fetchSubjectLessons, fetchLessonDetails, updateProgress
├── studentAiService.js          ← askStudentTutor, fetchLessonAiContent
├── studentQuizService.js        ← fetchStudentLessonQuiz, submitStudentQuizAttempt
├── studentChatService.js        ← fetchStudentChats, send/edit/delete/react message
├── studentTeacherService.js     ← fetchStudentTeachers, fetchStudentTeacherById
├── studentProfileService.js     ← fetchStudentProfile, updateStudentProfile, changePassword
├── studentGamificationService.js← fetchGamificationStats
└── studentContextService.js     ← fetchStudentContext (mode + org info)

src/services/parent/
├── parentDashboardService.js    ← fetchMyChildren, fetchMyNotes, markNoteRead
├── parentMarksService.js        ← fetchParentChildrenMarks
└── parentProfileService.js      ← fetchMyParentProfile, updateMyParentProfile
```

Only change: ensure `API_BASE_URL` points to your server IP (not `localhost`):
```js
// config.js
export const API_BASE_URL = 'http://192.168.x.x:5000/api'; // LAN IP
// or
export const API_BASE_URL = 'https://your-domain.com/api';  // production
```

---

## 7. Auth Flow

```
App start
  ↓
AsyncStorage.getItem('token')
  ↓ found              ↓ not found
dispatch(setUser)    → LoginScreen
  ↓
fetchStudentContext() or fetchMyParentProfile()
  ↓
route to StudentStack or ParentStack based on user.role
```

Redux slice stays the same — `state.auth.user` with `{ id, role, token, ... }`.

---

## 8. Dark Mode

```js
// ThemeContext.jsx — add this:
import { useColorScheme } from 'react-native';

// Option A: follow system
const systemScheme = useColorScheme(); // 'dark' | 'light'
const isDark = systemScheme === 'dark';

// Option B: user toggle (same as web — store in AsyncStorage)
const [isDark, setIsDark] = useState(false);
useEffect(() => {
  AsyncStorage.getItem('theme').then(v => v === 'dark' && setIsDark(true));
}, []);
```

All components already use `isDark` via context — no change needed in component logic.

---

## 9. Key Packages to Install

```bash
npx expo install \
  expo-av \
  expo-file-system \
  expo-sharing \
  expo-image-picker \
  expo-linear-gradient \
  expo-linking \
  @react-native-async-storage/async-storage \
  react-native-reanimated \
  react-native-gesture-handler \
  react-native-svg \
  react-native-safe-area-context \
  react-native-screens \
  @react-navigation/native \
  @react-navigation/native-stack \
  @react-navigation/bottom-tabs \
  socket.io-client \
  lucide-react-native \
  redux \
  @reduxjs/toolkit \
  react-redux
```

---

## 10. Common Conversion Patterns

### Tailwind class → StyleSheet
```js
// Web
<div className="flex flex-row items-center gap-3 p-4 rounded-2xl bg-white">

// RN
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, backgroundColor: '#ffffff' }}>
```

### onClick → onPress
```js
// Web
<button onClick={handlePress}>

// RN
<TouchableOpacity onPress={handlePress}>
  <Text>...</Text>
</TouchableOpacity>
// or
<Pressable onPress={handlePress}>
```

### input → TextInput
```js
// Web
<input type="text" placeholder="Search..." onChange={e => setQ(e.target.value)} />

// RN
<TextInput placeholder="Search..." onChangeText={setQ} />
```

### Scrollable list → FlatList
```js
// Web
<div>{items.map(item => <Card key={item.id} item={item} />)}</div>

// RN
<FlatList
  data={items}
  keyExtractor={item => item.id.toString()}
  renderItem={({ item }) => <Card item={item} />}
/>
```

### Gradient hero header
```js
import { LinearGradient } from 'expo-linear-gradient';
<LinearGradient
  colors={['#5b21b6', '#0f172a', '#312e81']}
  start={{ x: 0, y: 0.5 }}
  end={{ x: 1, y: 0.5 }}
  style={{ borderRadius: 24, padding: 20 }}
>
  {/* header content */}
</LinearGradient>
```

---

## 11. Screens Priority Order (Build Order)

1. Auth (Login)
2. Student Dashboard
3. Student Profile
4. Student Courses + Course Details
5. Student Subject (video + attachments + comments)
6. Flashcards
7. Quiz
8. MindMap
9. AI Assistant Modal
10. Student Chat (Socket.io)
11. Student Teachers + Teacher Profile
12. Student Social (Leaderboard)
13. School Subjects + Marks (SCHOOL mode)
14. Parent Dashboard
15. Parent Marks
16. Parent Settings

---

*Generated: 2026-05-29 | Learnova Dev Team*
