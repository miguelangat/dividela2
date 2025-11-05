# Using Claude Code with Dividela

This guide explains how to set up and use Claude Code effectively for building Dividela.

---

## 📁 Configuration Files

I've created two key configuration files for you:

### 1. `.clinerules` - Claude Code Instructions
This file tells Claude Code everything about your project:
- Project structure and architecture
- Design system and coding patterns
- Firebase data models
- Common code templates
- Best practices and standards

### 2. `dividela.code-workspace` - VS Code Workspace Settings
This file configures VS Code for optimal React Native development:
- Auto-formatting on save
- Recommended extensions
- Debugging configurations
- Useful tasks (Start Expo, Clear Cache, etc.)

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Copy `.clinerules` to Your Project Root

```bash
# Navigate to your project
cd dividela

# Copy the .clinerules file
# On Mac/Linux:
cp /path/to/.clinerules .

# On Windows:
copy C:\path\to\.clinerules .
```

The file should be at the root of your project:
```
dividela/
├── .clinerules          ← Here!
├── src/
├── assets/
├── App.js
└── package.json
```

### Step 2: Open the Workspace File

1. Copy `dividela.code-workspace` to your project root
2. In VS Code: **File → Open Workspace from File**
3. Select `dividela.code-workspace`
4. VS Code will reload with all the correct settings

**OR** simply rename it to `.vscode/settings.json` if you prefer folder-based settings.

### Step 3: Install Recommended Extensions

When you open the workspace, VS Code will prompt you to install recommended extensions. Click **"Install All"**.

Manual installation:
1. Press `Cmd/Ctrl + Shift + X` to open Extensions
2. Search for and install:
   - **ES7+ React/Redux/React-Native snippets**
   - **React Native Tools**
   - **Prettier - Code formatter**
   - **ESLint**
   - **GitLens**
   - **Path IntelliSense**

---

## 🤖 How to Use Claude Code Effectively

### Opening Claude Code

1. **In VS Code:** Press `Cmd/Ctrl + Shift + P`
2. Type: **"Claude Code"** or **"Cline"**
3. Select **"Cline: Open New Chat"**
4. Or click the Claude icon in the sidebar

### Starting a New Task

Claude Code will automatically read the `.clinerules` file. Here's how to give it tasks:

#### ✅ Good Task Examples:

**Example 1: Building a Screen**
```
Build the WelcomeScreen.js following the .clinerules. 
It should:
- Show the Dividela logo/icon
- Have a "Get Started" button
- Have a "Sign In" link at the bottom
- Use the design system from theme.js
- Match the wireframe in wireframes.html
```

**Example 2: Implementing a Feature**
```
Implement the invite code generation system:
- Create InviteScreen.js in src/screens/auth/
- Generate a random 6-character code
- Save it to Firestore using the inviteCodes model from .clinerules
- Add copy and share functionality
- Follow the patterns in the rules file
```

**Example 3: Fixing a Bug**
```
The balance calculation is showing negative when it should be positive.
Check calculateBalance in utils/calculations.js and fix the logic.
User1 is the current user, user2 is the partner.
```

**Example 4: Adding Validation**
```
Add form validation to SignUpScreen:
- Validate email, password, and name
- Use validators from utils/validators.js
- Show inline error messages
- Disable submit button when invalid
```

#### ❌ Avoid Vague Requests:

❌ "Build the app"
❌ "Make it work"
❌ "Fix the errors"
❌ "Create the UI"

#### ✅ Be Specific:

✅ "Build WelcomeScreen.js"
✅ "Fix the email validation in SignUpScreen"
✅ "Add loading state to the sign up button"
✅ "Create the ExpenseItem component"

---

## 💡 Claude Code Best Practices

### 1. **Reference the Documentation**

Tell Claude Code to check the docs:
```
Build the AddExpenseScreen. 
Reference wireframes.html for the layout and 
technical-spec.md for the data structure.
```

### 2. **Work Incrementally**

Build features one at a time:
```
First: Create the basic screen layout for AddExpenseScreen
Then: Add the amount input field
Then: Add category selection
Then: Add the paid by selector
Then: Add form validation
Finally: Connect to Firebase
```

### 3. **Ask for Explanations**

```
Explain how the calculateBalance function works in calculations.js
```

### 4. **Request Specific Patterns**

```
Create BalanceCard component using the card pattern from .clinerules
```

### 5. **Test as You Go**

```
I've built the SignUpScreen. Now help me test it:
1. Check if validation works
2. Test Firebase integration
3. Verify navigation to next screen
```

---

## 📋 Common Claude Code Commands

### For Building Screens:
```
Create [ScreenName] in src/screens/[auth|main]/
Use the screen template from .clinerules
Reference wireframe screen [number] from wireframes.html
```

### For Components:
```
Create [ComponentName] in src/components/
Make it reusable with props: [list props]
Use the design system from theme.js
```

### For Services:
```
Create expenseService.js in src/services/
Implement CRUD operations for expenses
Use the Firestore patterns from .clinerules
```

### For Bug Fixes:
```
The [feature] isn't working correctly.
Error: [paste error message]
File: [filename]
Expected: [what should happen]
Actual: [what is happening]
```

### For Refactoring:
```
Refactor [ComponentName] to:
- Extract [logic] into a custom hook
- Use memoization for [expensive calculation]
- Follow the component patterns in .clinerules
```

---

## 🎯 Feature Implementation Workflow

Follow this workflow for each feature:

### 1. Plan
```
I want to implement [feature].
Can you outline the steps needed based on .clinerules?
```

### 2. Build
```
Step 1: Create [filename]
Use the [pattern] from .clinerules
```

### 3. Test
```
I've implemented [feature].
What should I test to make sure it works?
```

### 4. Polish
```
The [feature] works but needs polish:
- Add loading states
- Improve error handling
- Add animations
```

---

## 🔧 Using VS Code Tasks

The workspace file includes helpful tasks. Access them with `Cmd/Ctrl + Shift + P`:

- **Tasks: Run Task → Start Expo**
- **Tasks: Run Task → Start Expo (Clear Cache)**
- **Tasks: Run Task → Run on Android**
- **Tasks: Run Task → Run on iOS**
- **Tasks: Run Task → Install Dependencies**
- **Tasks: Run Task → Expo Doctor**

---

## 📚 Key Files to Reference

Tell Claude Code to check these files when needed:

**For Design:**
- `wireframes.html` - Visual reference
- `src/constants/theme.js` - Design system

**For Data:**
- `technical-spec.md` - Data models and API design
- `ONBOARDING-GUIDE.md` - Invite code system details

**For Implementation:**
- `.clinerules` - All coding patterns
- `IMPLEMENTATION-ROADMAP.md` - Step-by-step plan

**For Testing:**
- `prototype.html` - Working demo of expected behavior

---

## 💬 Example Conversation with Claude Code

**You:**
```
I'm ready to start building. Let's create the WelcomeScreen first.
Check the .clinerules for the screen template and wireframes.html 
for the design. The screen should have:
- Dividela title
- Tagline
- Get Started button
- Sign In link
```

**Claude Code:**
```
I'll create the WelcomeScreen.js file in src/screens/auth/ following 
the patterns in .clinerules. I can see the design in wireframe 0a.

[Creates the file]

I've created WelcomeScreen.js with:
- Proper imports from theme.js
- Welcome message and branding
- Primary button for "Get Started"
- Secondary link for "Sign In"
- Navigation props ready

Would you like me to:
1. Add the navigation logic?
2. Create the next screen (SignUpScreen)?
3. Add any animations?
```

**You:**
```
Looks good! Now create the SignUpScreen.
```

---

## 🐛 Troubleshooting

### Claude Code Isn't Following .clinerules

**Solution:**
1. Make sure `.clinerules` is in project root
2. Restart Claude Code
3. Explicitly mention: "Check the .clinerules file for patterns"

### Claude Code Can't Find Files

**Solution:**
1. Use absolute paths from project root: `src/screens/auth/WelcomeScreen.js`
2. Make sure files exist before referencing them
3. Use `view` command to show Claude Code the file structure

### Code Doesn't Match Design System

**Solution:**
```
This code doesn't follow the design system in theme.js.
Please update it to use:
- COLORS instead of hardcoded colors
- SPACING instead of hardcoded numbers
- COMMON_STYLES where applicable
```

### Import Errors

**Solution:**
```
Fix the import paths. All imports should use relative paths:
- For constants: '../constants/theme'
- For utils: '../utils/validators'
- For contexts: '../contexts/AuthContext'
```

---

## 📖 Quick Reference Card

Save this for quick access:

```
# Start Claude Code
Cmd/Ctrl + Shift + P → "Cline: Open New Chat"

# Common Requests
"Create [ScreenName] following .clinerules"
"Reference wireframe [number] for the design"
"Use the [pattern] pattern from .clinerules"
"Check technical-spec.md for the data model"
"Fix [bug] in [filename]"

# Testing
"How can I test this feature?"
"What edge cases should I handle?"

# Debugging
"The error is: [paste error]"
"Expected: [x], Actual: [y]"

# Refactoring
"Extract this logic into a custom hook"
"Optimize this component's performance"
```

---

## 🎓 Pro Tips

1. **Be conversational but specific**
   - Good: "Build the sign up screen with email validation"
   - Not: "signup page"

2. **Reference the .clinerules patterns**
   - "Use the Firebase pattern for reading data"
   - "Follow the form validation pattern"

3. **Build incrementally**
   - Don't ask for the entire app at once
   - Build one screen, test it, then move to the next

4. **Ask for explanations**
   - "Explain how this works"
   - "Why did you structure it this way?"

5. **Request tests**
   - "What should I test?"
   - "Create test cases for this feature"

6. **Get code reviews**
   - "Review this code for improvements"
   - "Check if this follows best practices"

---

## ✅ Checklist: Setup Complete When...

- [ ] `.clinerules` file in project root
- [ ] `dividela.code-workspace` opened in VS Code
- [ ] Recommended extensions installed
- [ ] Can open Claude Code without errors
- [ ] Claude Code responds to "Check .clinerules"
- [ ] Auto-formatting works (save a file)
- [ ] Can run tasks from Command Palette

---

## 🚀 You're Ready!

Your Claude Code is now configured to be an expert Dividela developer. It knows:
- ✅ Your project structure
- ✅ Your design system
- ✅ Your coding patterns
- ✅ Your Firebase models
- ✅ Your implementation plan

**Start building with confidence!**

Example first task:
```
I've completed the setup. Let's start building Dividela!

First task: Create the WelcomeScreen.js in src/screens/auth/
- Follow the screen template from .clinerules
- Use the design from wireframe 0a in wireframes.html
- Use colors and spacing from theme.js
- Should have "Get Started" button and "Sign In" link
```

Good luck! 🎉
