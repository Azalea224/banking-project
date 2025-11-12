// Preload all app icons at startup for better performance
// Note: Images loaded via require() are already bundled and cached by React Native
// This utility ensures all images are accessed at app startup to warm up the cache
const preloadImages = () => {
  try {
    // Access all image sources to trigger loading into memory
    // React Native automatically caches require() images, but accessing them
    // here ensures they're ready when components render
    const images = [
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

    // Simply accessing the require() calls ensures they're loaded
    // React Native handles caching automatically for bundled assets
    // This is a no-op that ensures all images are "touched" at startup
    void images;
  } catch (error) {
    // Silently fail - images will load on demand if preloading fails
    console.warn("Image preloading warning:", error);
  }
};

export default preloadImages;
