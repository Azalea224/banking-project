import { Image } from "react-native";

// Preload all app icons at startup for better performance
// Uses Image.resolveAssetSource to ensure images are loaded into memory
const preloadImages = async () => {
  try {
    const imageSources = [
      // Navigation icons
      require("../assets/home.png"),
      require("../assets/Progress.png"),
      require("../assets/Transactions.png"),
      require("../assets/Friends.png"),
      require("../assets/Profile.png"),
      
      // Achievement icons
      require("../assets/Getting Started.png"),
      require("../assets/Social Butterfly.png"),
      require("../assets/Power User.png"),
      require("../assets/Transaction Master.png"),
      require("../assets/Money Maker.png"),
      require("../assets/Saver.png"),
      require("../assets/Sharing is Caring.png"),
      require("../assets/Centurion.png"),
      require("../assets/Thousandaire.png"),
      require("../assets/High Roller.png"),
      
      // UI icons
      require("../assets/Total Points.png"),
      require("../assets/Experience.png"),
      require("../assets/Next Level Target.png"),
      require("../assets/Max Level.png"),
      require("../assets/Lock.png"),
      require("../assets/Unlocked Badge.png"),
      require("../assets/Close.png"),
      require("../assets/Checkmark.png"),
      require("../assets/Empty State (Unlocked).png"),
      require("../assets/Empty State (Locked).png"),
      require("../assets/Search.png"),
      require("../assets/Camera.png"),
      require("../assets/Income Transaction.png"),
      require("../assets/Expense Transaction.png"),
      require("../assets/Send.png"),
      require("../assets/Receive.png"),
      require("../assets/Deposit.png"),
      require("../assets/Withdraw.png"),
    ];

    // Resolve all asset sources to ensure they're loaded into memory
    // This preloads the images so they're ready when components render
    imageSources.forEach((source) => {
      try {
        Image.resolveAssetSource(source);
      } catch (err) {
        // Silently continue if one fails
      }
    });
  } catch (error) {
    // Silently fail - images will load on demand if preloading fails
    console.warn("Image preloading warning:", error);
  }
};

export default preloadImages;
