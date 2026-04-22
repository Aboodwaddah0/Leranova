# Chat UI Fixes - Manual Testing Guide

## Test Environment
- **Frontend:** http://localhost:5174/
- **Backend:** http://localhost:5000/
- **Browser:** Chrome/Firefox (tested)

---

## 🧪 Test Suite 1: Emoji Picker Positioning & Behavior

### Test 1.1: Emoji Picker Appears Below Input
**Steps:**
1. Login to the app
2. Navigate to Chat section  
3. Select any chat room
4. Click the emoji button (😊 icon) in the message composer

**Expected Result:**
- ✅ Emoji picker appears **BELOW** the input field (not above, not overlapping)
- ✅ Emoji picker has proper spacing from input field
- ✅ Input field remains fully visible and usable
- ✅ Emoji picker doesn't cover any messages above

**What to Look For:**
- Emoji grid should be positioned below the textarea
- There should be ~8-10 pixels gap between input and picker
- All emojis should be fully visible

---

### Test 1.2: Emoji Picker Closes on Chat Switch
**Steps:**
1. Open emoji picker in Chat A
2. Click on Chat B in the chat list (without selecting an emoji)

**Expected Result:**
- ✅ Emoji picker closes automatically
- ✅ You're now viewing Chat B messages
- ✅ No emoji picker is visible

**What to Look For:**
- Clean transition between chats
- No lingering popups from previous chat

---

### Test 1.3: Emoji Selection Doesn't Auto-Close Picker
**Steps:**
1. Open emoji picker
2. Click first emoji
3. Picker is still open

**Expected Result:**
- ✅ Emoji is inserted into input field
- ✅ Emoji picker stays open (for multiple selections)
- ✅ You can select more emojis

**What to Look For:**
- Multiple emojis can be added without reopening picker
- Picker closes only when you click elsewhere or switch chats

---

## 🧪 Test Suite 2: Reactions Display (Horizontal Layout)

### Test 2.1: Reactions Show Horizontally
**Steps:**
1. Open a chat with messages that have reactions
2. Look at the reaction pills below messages

**Expected Result:**
- ✅ Reactions display in a **single horizontal row**
- ✅ If reactions overflow, they scroll horizontally (not wrap to new lines)
- ✅ Reactions are compact and aligned

**What to Look For:**
- No vertical stacking of reaction pills
- Smooth horizontal scrolling if many reactions exist
- Reactions don't push message layout down

---

### Test 2.2: Add Multiple Reactions
**Steps:**
1. Click the emoji button on a message (😊 icon next to 3-dot menu)
2. Click several different emoji reactions

**Expected Result:**
- ✅ Each reaction adds as a pill next to previous ones
- ✅ Reactions stay in horizontal layout
- ✅ Your reactions are highlighted in blue
- ✅ Reaction count updates in real-time

**What to Look For:**
- Horizontal layout maintained
- No vertical wrapping
- All reactions visible (with horizontal scroll if needed)

---

## 🧪 Test Suite 3: Message Menu (3-Dot Dropdown)

### Test 3.1: Message Menu Opens & Closes
**Steps:**
1. Hover over your own message
2. Click the 3-dot menu button
3. Menu appears with Edit and Delete options
4. Click elsewhere on the page

**Expected Result:**
- ✅ Menu opens showing 2 options (Edit, Delete)
- ✅ Menu closes when clicking elsewhere
- ✅ Menu closes when switching chats

**What to Look For:**
- Menu has proper dropdown styling
- Options are readable and clickable
- Menu doesn't stay open when it shouldn't

---

### Test 3.2: Menu Doesn't Close When Clicking Inside It
**Steps:**
1. Open the message menu (3-dot)
2. Try to hover over the options (don't click)

**Expected Result:**
- ✅ Menu stays open while hovering
- ✅ You can see both Edit and Delete options clearly
- ✅ Clicking an option works properly

---

## 🧪 Test Suite 4: Edit Mode Management

### Test 4.1: Edit Mode Closes on Chat Switch (With Unsaved Changes)
**Steps:**
1. Click Edit on one of your messages
2. Make some changes to the message text
3. Click on a different chat in the sidebar

**Expected Result:**
- ✅ A confirmation dialog appears asking about unsaved changes
- ✅ Dialog text appears in your language (Arabic or English)
- ✅ Two options: Save or Discard
- ✅ If you click "Discard": switches to new chat, edit mode closes
- ✅ If you click "Cancel": stays in current chat in edit mode

**What to Look For:**
- Dialog appears immediately when switching chats with unsaved edits
- Language matches your browser setting
- Action works as expected based on your choice

---

### Test 4.2: Edit Mode Closes on Chat Switch (No Changes)
**Steps:**
1. Click Edit on one of your messages
2. Don't make any changes
3. Click on a different chat

**Expected Result:**
- ✅ No confirmation dialog appears
- ✅ Switches to new chat immediately
- ✅ Edit mode closes silently

---

### Test 4.3: Reactions Show During Edit Mode
**Steps:**
1. Edit a message (click Edit button)
2. Look at the message reactions

**Expected Result:**
- ✅ Reactions are still visible below the message
- ✅ Reactions display horizontally
- ✅ You can still click reactions while editing

---

## 🧪 Test Suite 5: Reaction Picker Behavior

### Test 5.1: Reaction Picker Closes on Chat Switch
**Steps:**
1. Click the emoji button (😊) next to a message
2. Reaction picker opens showing emoji options
3. Click on a different chat

**Expected Result:**
- ✅ Reaction picker closes
- ✅ Switches to new chat
- ✅ No reaction picker visible in new chat

---

### Test 5.2: Multiple Reactions Can Be Added
**Steps:**
1. Click the emoji button on a message
2. Click one emoji reaction
3. The emoji picker stays open
4. Click another emoji reaction

**Expected Result:**
- ✅ First emoji reaction appears below message
- ✅ Picker stays open for second reaction
- ✅ Second emoji appears next to first (horizontally)
- ✅ Both reactions are visible

---

## 🧪 Test Suite 6: Overall UX Improvements

### Test 6.1: Click on Message Area to Close All Popups
**Steps:**
1. Open emoji picker
2. Open message menu (3-dot)
3. Open reaction picker
4. Click anywhere on the message background area

**Expected Result:**
- ✅ All popups close
- ✅ Message area is clean and readable
- ✅ No overlapping or lingering popups

---

### Test 6.2: Start Typing Closes All Popups
**Steps:**
1. Open emoji picker
2. Click in the message input field
3. Start typing

**Expected Result:**
- ✅ Emoji picker closes
- ✅ Focus moves to input field
- ✅ Can start composing message immediately

---

### Test 6.3: Send Button Works Correctly
**Steps:**
1. Type a message
2. Click Send button

**Expected Result:**
- ✅ Message sends
- ✅ Input field clears
- ✅ All popups close
- ✅ Message appears in chat

---

## ✅ Success Criteria

All of the following must be true:

1. ✅ Emoji picker appears **below** the input field (not above/overlapping)
2. ✅ Reactions display **horizontally** (not vertically/wrapping)
3. ✅ Edit mode shows confirmation dialog when switching chats with unsaved changes
4. ✅ All popups close when switching between chats
5. ✅ Popups close when clicking on the message area
6. ✅ Message menu (3-dot) works and closes properly
7. ✅ Reaction picker works and closes properly
8. ✅ No console errors when interacting with chat
9. ✅ All functionality works smoothly without glitches
10. ✅ Arabic/English text displays correctly

---

## 🐛 Troubleshooting

### Emoji picker appears above the input
- Check browser console for errors (F12)
- Refresh the page and try again
- Clear browser cache and reload

### Reactions still showing vertically
- Hard refresh browser (Ctrl+F5)
- Check if CSS compiled correctly

### Edit mode doesn't show confirmation
- Check if you made actual text changes
- Try again with more visible changes

### Popups not closing
- Try clicking further away from the popup
- Refresh the page
- Check browser console for JavaScript errors

---

## 📝 Test Results Template

```
Date: ___________
Browser: ___________
Tester: ___________

Test 1.1 Emoji Picker Below Input: ☐ PASS ☐ FAIL
Test 1.2 Emoji Picker Closes on Chat Switch: ☐ PASS ☐ FAIL
Test 1.3 Multiple Emoji Selection: ☐ PASS ☐ FAIL
Test 2.1 Reactions Horizontal: ☐ PASS ☐ FAIL
Test 2.2 Add Multiple Reactions: ☐ PASS ☐ FAIL
Test 3.1 Message Menu Works: ☐ PASS ☐ FAIL
Test 3.2 Menu Doesn't Close Inside: ☐ PASS ☐ FAIL
Test 4.1 Edit Mode Closes (With Changes): ☐ PASS ☐ FAIL
Test 4.2 Edit Mode Closes (No Changes): ☐ PASS ☐ FAIL
Test 4.3 Reactions Visible During Edit: ☐ PASS ☐ FAIL
Test 5.1 Reaction Picker Closes on Switch: ☐ PASS ☐ FAIL
Test 5.2 Multiple Reactions from Picker: ☐ PASS ☐ FAIL
Test 6.1 Click Area Closes All: ☐ PASS ☐ FAIL
Test 6.2 Typing Closes All: ☐ PASS ☐ FAIL
Test 6.3 Send Button Works: ☐ PASS ☐ FAIL

Overall Result: ☐ ALL PASS ☐ SOME FAILURES
Notes: ___________________________________________________________
```

---

## 🎯 Quick Checklist

Before considering this complete:
- [ ] Test all 6 test suites
- [ ] All tests pass (15/15)
- [ ] No console errors
- [ ] Arabic text displays correctly
- [ ] Smooth, no stuttering or glitches
- [ ] User can seamlessly switch between chats
- [ ] Chat history visible while editing
- [ ] Reactions sync across users in real-time

**Status: READY FOR TESTING** ✅
