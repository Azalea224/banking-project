# Banking Project (Demo Application)

> ⚠️ **IMPORTANT DISCLAIMER**: This is a **DEMONSTRATION/EDUCATIONAL** application only. This is **NOT** a real banking application and should **NEVER** be used with real money or real financial data. This project is intended for learning purposes, portfolio demonstration, and educational use only.

A modern, cross-platform banking **demo** application built with React Native and Expo. This app demonstrates banking-like features including user authentication, transaction management, and profile features for educational and portfolio purposes.

## 🚀 Features

> **Note**: All features are simulated for demonstration purposes. No real financial transactions occur.

### Authentication
- **User Registration** - Create a demo account with username, password, and profile image
- **User Login** - Simulated authentication with JWT tokens
- **Session Management** - Persistent login with AsyncStorage
- **Profile Image Upload** - Upload and update profile pictures

### Banking Operations (Simulated)
- **Deposit** - Simulate adding funds to your demo account
- **Withdraw** - Simulate removing funds from your demo account (with balance validation)
- **Transfer** - Simulate sending money to other demo users
- **Payment Links** - Generate shareable payment links for receiving simulated payments

### Transaction Management (Demo)
- **Transaction History** - View all your simulated transactions with filtering options
- **Transaction Details** - Detailed view of individual demo transactions
- **Transaction Filtering** - Filter by type (Deposit, Withdraw, Transfer, All)
- **Real-time Updates** - Automatic refresh after simulated transactions

### User Interface
- **Dashboard** - Overview of demo balance, account number, and recent transactions
- **Profile Management** - View and update profile information
- **User Directory** - Browse and search for other demo users
- **Responsive Design** - Works seamlessly on web, iOS, and Android
- **Loading States** - Skeleton loaders for better UX
- **Error Handling** - Comprehensive error messages and retry mechanisms

## 🛠️ Tech Stack

### Core Technologies
- **React Native** (0.81.5) - Cross-platform mobile framework
- **Expo** (~54.0.23) - Development platform and tooling
- **TypeScript** (~5.9.2) - Type-safe JavaScript
- **React** (^19.2.0) - UI library

### Key Libraries
- **Expo Router** (^6.0.14) - File-based routing
- **React Query** (@tanstack/react-query ^5.90.7) - Data fetching and caching
- **Formik** (^2.4.9) - Form management
- **Yup** (^1.7.1) - Schema validation
- **Axios** (^1.13.2) - HTTP client
- **AsyncStorage** (@react-native-async-storage/async-storage ^2.2.0) - Local storage
- **Expo Image Picker** (~17.0.8) - Image selection and upload

### Platform Support
- ✅ **Web** - Full functionality in web browsers
- ✅ **iOS** - Native iOS app support
- ✅ **Android** - Native Android app support

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher recommended)
- **npm** or **yarn** package manager
- **Expo CLI** (installed globally or via npx)
- **Git** for version control

For mobile development:
- **iOS**: Xcode (for iOS simulator) - macOS only
- **Android**: Android Studio (for Android emulator)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd banking-project
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the development server**
   ```bash
   npm start
   # or
   yarn start
   ```

## 🎯 Running the Application

### Web
```bash
npm run web
# or
yarn web
```
Opens in your default browser at `http://localhost:8081`

### iOS Simulator
```bash
npm run ios
# or
yarn ios
```
Requires Xcode and iOS Simulator (macOS only)

### Android Emulator
```bash
npm run android
# or
yarn android
```
Requires Android Studio and an Android emulator

### Development Server
```bash
npm start
# or
yarn start
```
Opens Expo DevTools where you can:
- Scan QR code with Expo Go app (iOS/Android)
- Press `w` to open in web browser
- Press `i` to open iOS simulator
- Press `a` to open Android emulator

## 📁 Project Structure

```
banking-project/
├── api/                    # API integration layer
│   ├── auth.ts            # Authentication endpoints
│   ├── index.ts           # Axios configuration
│   └── transactions.ts    # Transaction endpoints
├── app/                    # Application screens (Expo Router)
│   ├── _layout.tsx        # Root layout
│   ├── index.tsx          # Home/Dashboard screen
│   ├── login.tsx          # Login screen
│   ├── register.tsx       # Registration screen
│   ├── profile.tsx        # Profile management
│   ├── deposit.tsx        # Deposit funds
│   ├── withdraw.tsx       # Withdraw funds
│   ├── transfer.tsx       # Transfer money
│   ├── generate-link.tsx  # Generate payment link
│   ├── deposit-link.tsx   # Deposit via payment link
│   ├── transaction-detail.tsx  # Transaction details
│   └── users.tsx          # User directory
├── assets/                 # Static assets
│   ├── icon.png
│   ├── favicon.png
│   └── splash-icon.png
├── components/             # Reusable components
│   └── Skeleton.tsx      # Loading skeleton components
├── contexts/              # React contexts
│   └── AuthContext.tsx   # Authentication context
├── hooks/                 # Custom React hooks
│   ├── useLogin.ts
│   └── useRegister.ts
├── app.json               # Expo configuration
├── package.json           # Dependencies and scripts
└── tsconfig.json          # TypeScript configuration
```

## 🔐 API Configuration

> **Note**: This demo app connects to a demonstration backend API. All data and transactions are simulated.

The application connects to a demo backend API. The base URL is configured in:
- `api/index.ts` - Main API configuration
- Individual API files reference: `https://react-bank-project.eapi.joincoded.com/`

### Authentication Flow (Demo)
1. User registers/logs in to the demo system
2. JWT token is received and stored in AsyncStorage
3. Token is automatically attached to authenticated requests via Axios interceptors
4. Token is validated on each request

## 🎨 Key Features Explained

### Transaction Filtering
The home screen allows filtering transactions by type:
- **All** - Shows all transactions
- **Deposit** - Only deposit transactions
- **Withdraw** - Only withdrawal transactions
- **Transfer** - Only transfer transactions

### Balance Formatting
Large amounts are automatically formatted:
- Thousands: `1.500K KWD`
- Millions: `2.500M KWD`
- Billions: `1.200B KWD`
- Trillions: Full number with commas

### User Lookup
The app intelligently resolves user IDs to usernames:
- Fetches all users on app load
- Dynamically fetches missing users from transaction history
- Handles both numeric and alphanumeric user IDs
- Falls back gracefully when users cannot be found

### Image Handling
- Supports both local and remote images
- Handles base64 encoded images for web
- Automatic fallback to placeholder with user initial
- Error handling for failed image loads

## 🧪 Development

### Code Style
- TypeScript for type safety
- Functional components with hooks
- Custom hooks for reusable logic
- Context API for global state management

### Form Validation
- Formik for form state management
- Yup for schema validation
- Real-time validation feedback
- Error messages displayed inline

### State Management
- React Query for server state
- Context API for authentication state
- Local state with useState for UI state
- Automatic cache invalidation after mutations

## 🐛 Troubleshooting

### Common Issues

**Issue: Cannot input text on web**
- Solution: Ensure TextInput components don't have unsupported props like `inputMode` on web

**Issue: Images not loading**
- Solution: Check network connectivity and verify BASE_URL is correct
- Ensure image URLs are properly formatted

**Issue: Authentication token expired**
- Solution: Log out and log back in to refresh the token

**Issue: Transactions not updating**
- Solution: Check React Query cache invalidation is working
- Manually refresh by pulling down on the screen

## 📱 Platform-Specific Notes

### Web
- Uses `window.confirm` and `window.alert` for dialogs
- File input for image selection
- Responsive design with flexbox

### iOS
- Native Alert dialogs
- Image picker with permissions
- Safe area handling

### Android
- Native Alert dialogs
- Image picker with permissions
- Edge-to-edge support

## 🔒 Security Considerations

> **Important**: While this demo app implements security best practices for demonstration purposes, it is **NOT** production-ready and should **NOT** be used with real financial data or real money.

### Demo Security Features
- JWT tokens stored securely in AsyncStorage (for demo purposes)
- Automatic token attachment to authenticated requests
- Error handling for 401/403 responses
- Input validation on all forms
- Secure password handling (never logged)

### ⚠️ Security Disclaimer
This is a demonstration application. For production banking applications, additional security measures would be required including:
- End-to-end encryption
- PCI DSS compliance
- Multi-factor authentication
- Regulatory compliance (KYC, AML, etc.)
- Professional security audits
- And many other enterprise-level security requirements

## 🎓 Educational Purpose

This project is designed for:
- **Learning** - Understanding React Native, Expo, and mobile app development
- **Portfolio** - Demonstrating full-stack development skills
- **Education** - Teaching modern mobile app architecture and patterns
- **Practice** - Practicing authentication, state management, and API integration

**This is NOT intended for:**
- Real financial transactions
- Production banking services
- Handling real money or sensitive financial data
- Commercial banking operations

## 📝 License

This project is private and proprietary.

## 👥 Contributing

This is a private demo/educational project. For questions or issues, please contact the project maintainers.

## 🚧 Future Enhancements

Potential features for future development:
- Biometric authentication
- Push notifications for transactions
- Export transaction history
- Multi-currency support
- Transaction categories and tags
- Budgeting and analytics
- Recurring transactions

---

## ⚠️ Final Disclaimer

**This application is a DEMONSTRATION and EDUCATIONAL project only.**

- ❌ **DO NOT** use with real money
- ❌ **DO NOT** use for real financial transactions
- ❌ **DO NOT** use for production banking services
- ✅ **DO** use for learning and portfolio purposes
- ✅ **DO** use to understand mobile app development patterns
- ✅ **DO** use as a reference for educational projects

**The developers and maintainers are not responsible for any misuse of this application.**

---

Built with ❤️ using React Native and Expo

*For educational and demonstration purposes only*

